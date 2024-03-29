import Error from '../error';
import { QueryResult } from 'pg';
import { Chat, ChatModel } from '../schema';
import { err, ok, Result } from 'never-catch';
import { Context, U } from '@mrnafisia/type-query';
import { MessageModel } from '../../Message/schema';
import { Connection } from '../../../utils/connection';
import { User, UserModel } from '../../User/schema';
import Constant from '../../Message/constant';

const get = async (
    connection: Connection,
    start: bigint,
    step: number,
    chatID?: ChatModel['id']
): Promise<Result<{
    result: {
        id: ChatModel['id'],
        title: ChatModel['title'],
        isGroup: ChatModel['isGroup'],
        userIDs: UserModel['id'][],
        ownerID: ChatModel['ownerID'],
        fileID: ChatModel['fileID'],
        firstUnseenMessageID: MessageModel['id'] | null,
        isFirstUnseenFromThread: boolean,
        lastMessageID: MessageModel['id'] | null,
        lastMessageContent: MessageModel['content'] | null,
        lastMessageCreatedAt: MessageModel['createdAt'] | null,
        lastMessageUserID: MessageModel['userID'] | null,
        lastMessageFileName: MessageModel['fileName']
    }[],
    length: number
}, Error>> => {
    if (chatID !== undefined && !ChatModel.id.Validate(chatID)){
        return err([204])
    }

    // find user chats using connection.userID
    const getChatsResult = await getChats(
        connection,
        start,
        step,
        chatID
    );
    if (!getChatsResult.ok) {
        return getChatsResult;
    }
    if (getChatsResult.value.length === 0) {
        return ok({
            result: [],
            length: 0
        });
    }

    // find last message details
    const getLastMessagesResult = await getLastMessages(
        connection,
        getChatsResult.value.result
    );
    if (!getLastMessagesResult.ok) {
        return getLastMessagesResult;
    }

    // find last unseen message id
    const getFirstUnseenMessageResult = await getFirstUnseenMessage(
        connection,
        getLastMessagesResult.value
    );
    if (!getFirstUnseenMessageResult.ok) {
        return getFirstUnseenMessageResult;
    }

    return ok({
        result: getFirstUnseenMessageResult.value,
        length: getChatsResult.value.length
    });
};

const getChats = async (
    { client, userID }: Connection,
    start: bigint,
    step: number,
    chatID?: ChatModel['id']
): Promise<Result<{
    result: ChatModel<['id', 'title', 'isGroup', 'userIDs', 'ownerID', 'fileID']>[]
        & { userIDs: UserModel['id'][] }[]; length: number
}, Error>> => {
    const where = (context: Context<typeof Chat.table['columns']>) =>
        U.andOp(
            context.colCmp('id', '=', chatID),
            context.colsOr({
                ownerID: ['=', userID],
                userIDs: ['?', userID.toString()]
            })
        );
    const getChatsResult = await Chat.select(
        ['id', 'title', 'isGroup', 'userIDs', 'ownerID', 'lastMessageSentAt', 'fileID'] as const,
        where,
        {
            start,
            step: Number(step) === -1 ? undefined : step,
            ignoreInWhere: true
        }
    ).exec(client, []);
    if (!getChatsResult.ok) {
        return err([401, getChatsResult.error]);
    }
    const chats = getChatsResult.value;

    for (let i = 0; i < chats.length; ++i) {
        chats[i].userIDs = (chats[i].userIDs as string[]).map(e => Number(e));
    }

    const privateChats = chats.filter(e => e.isGroup === false);
    if (privateChats.length !== 0) {
        const ids: UserModel['id'][] = [];
        for (const privateChat of privateChats) {
            if (!ids.includes((privateChat.userIDs as number[])[0])) {
                ids.push((privateChat.userIDs as number[])[0]);
            }
            if (!ids.includes(privateChat.ownerID)) {
                ids.push(privateChat.ownerID);
            }
        }
        const getUsersResult = await User.select(
            ['id', 'name'] as const,
            context => context.colList('id', 'in', ids)
        ).exec(client, []);
        if (!getUsersResult.ok) {
            return err([401, getUsersResult.error]);
        }
        const users = getUsersResult.value;

        for (let i = 0; i < chats.length; ++i) {
            if (!chats[i].isGroup) {
                if (chats[i].ownerID !== userID) {
                    chats[i].userIDs = [chats[i].ownerID];
                    chats[i].ownerID = userID;
                }
                if (userID === chats[i].ownerID) {
                    chats[i].title = users.find(e => e.id === (chats[i].userIDs as number[])[0])?.name as string;
                } else {
                    // TODO useless if ?
                    chats[i].title = users.find(e => e.id === chats[i].ownerID)?.name as string;
                }
            }
        }
    }

    const getLengthResult = await Chat.select(
        context =>
            [
                {
                    exp: U.fun<number>(
                        'Count',
                        [context.col('id')],
                        '::INTEGER'
                    ),
                    as: 'len'
                }
            ] as const,
        where,
        {
            ignoreInWhere: true
        }
    ).exec(client, ['get', 'one']);
    if (!getLengthResult.ok) {
        return err([401, getLengthResult.error]);
    }

    chats.sort((a, b) => {
        if (a.lastMessageSentAt > b.lastMessageSentAt) {
            return -1;
        } else if (a.lastMessageSentAt < b.lastMessageSentAt) {
            return 1;
        } else {
            return 0;
        }
    });

    return ok({
        result: chats as typeof chats & { userIDs: UserModel['id'][] }[],
        length: getLengthResult.value.len
    });
};

const getLastMessages = async (
    { client }: Omit<Connection, 'userID'>,
    chats: ChatModel<['id', 'title', 'isGroup', 'ownerID', 'userIDs', 'fileID']>[] & { userIDs: UserModel['id'][] }[]
): Promise<Result<{
    id: ChatModel['id'],
    title: ChatModel['title'],
    isGroup: ChatModel['isGroup'],
    userIDs: UserModel['id'][],
    ownerID: ChatModel['ownerID'],
    fileID: ChatModel['fileID'],
    lastMessageID: MessageModel['id'] | null,
    lastMessageContent: MessageModel['content'] | null,
    lastMessageCreatedAt: MessageModel['createdAt'] | null,
    lastMessageUserID: MessageModel['userID'] | null,
    lastMessageFileName: MessageModel['fileName']
}[], Error>> => {
    const result: {
        id: ChatModel['id'],
        title: ChatModel['title'],
        isGroup: ChatModel['isGroup'],
        userIDs: UserModel['id'][],
        ownerID: ChatModel['ownerID'],
        fileID: ChatModel['fileID'],
        lastMessageID: MessageModel['id'] | null,
        lastMessageContent: MessageModel['content'] | null,
        lastMessageCreatedAt: MessageModel['createdAt'] | null,
        lastMessageUserID: MessageModel['userID'] | null,
        lastMessageFileName: MessageModel['fileName']
    }[] = [];
    const getLastMessages = await client.query(
        'SELECT m1.id, m1.chat, m1.content, m1.user, m1.created_at, m1.is_deleted, m1.file_name' +
        ' FROM general.message as m1' +
        ' inner join' +
        ' (SELECT chat, max(created_at) as created_at FROM general.message ' +
        ' WHERE chat in ' + '(' + chats.map(e => e.id).join(', ') + ')' +
        ' AND thread IS NULL group by chat) as m2' +
        ' on m1.chat = m2.chat and m1.created_at = m2.created_at'
    )
        .then((res) => res)
        .catch((error) => [401, error]);
    if (Array.isArray(getLastMessages)) {
        // TODO improve
        return err([401, getLastMessages[1]]);
    }

    for (const chat of chats) {
        let lastMessageID: MessageModel['id'] | null = null;
        let lastMessageContent: MessageModel['content'] | null = null;
        let lastMessageCreatedAt: MessageModel['createdAt'] | null = null;
        let lastMessageUserID: MessageModel['userID'] | null = null;
        let lastMessageFileName: MessageModel['fileName'] = null;
        const row = getLastMessages.rows.find(e => BigInt(e.chat) === chat.id);
        if (row !== undefined) {
            lastMessageID = row.id;
            lastMessageContent = row.is_deleted ? Constant.DELETED_MESSAGE_CONTENT : row.content;
            lastMessageCreatedAt = row.created_at;
            lastMessageUserID = row.user;
            lastMessageFileName = row.file_name;
        }

        result.push(
            {
                id: chat.id,
                title: chat.title,
                isGroup: chat.isGroup,
                ownerID: chat.ownerID,
                userIDs: chat.userIDs,
                fileID: chat.fileID,
                lastMessageID,
                lastMessageContent,
                lastMessageCreatedAt,
                lastMessageUserID,
                lastMessageFileName
            }
        );
    }

    return ok(result);
};

const getFirstUnseenMessage = async (
    { client, userID }: Connection,
    chatsWithLastMessageDetail: {
        id: ChatModel['id'],
        title: ChatModel['title'],
        isGroup: ChatModel['isGroup'],
        userIDs: UserModel['id'][],
        ownerID: ChatModel['ownerID'],
        fileID: ChatModel['fileID'],
        lastMessageID: MessageModel['id'] | null,
        lastMessageContent: MessageModel['content'] | null,
        lastMessageCreatedAt: MessageModel['createdAt'] | null,
        lastMessageUserID: MessageModel['userID'] | null,
        lastMessageFileName: MessageModel['fileName']
    }[]
): Promise<Result<{
    id: ChatModel['id'],
    title: ChatModel['title'],
    isGroup: ChatModel['isGroup'],
    userIDs: UserModel['id'][],
    ownerID: ChatModel['ownerID'],
    fileID: ChatModel['fileID'],
    firstUnseenMessageID: MessageModel['id'] | null,
    isFirstUnseenFromThread: boolean,
    lastMessageID: MessageModel['id'] | null,
    lastMessageContent: MessageModel['content'] | null,
    lastMessageCreatedAt: MessageModel['createdAt'] | null,
    lastMessageUserID: MessageModel['userID'] | null,
    lastMessageFileName: MessageModel['fileName']
}[], Error>> => {
    const result: {
        id: ChatModel['id'],
        title: ChatModel['title'],
        isGroup: ChatModel['isGroup'],
        userIDs: UserModel['id'][],
        ownerID: ChatModel['ownerID'],
        fileID: ChatModel['fileID'],
        firstUnseenMessageID: MessageModel['id'] | null,
        isFirstUnseenFromThread: boolean,
        lastMessageID: MessageModel['id'] | null,
        lastMessageContent: MessageModel['content'] | null,
        lastMessageCreatedAt: MessageModel['createdAt'] | null,
        lastMessageUserID: MessageModel['userID'] | null
        lastMessageFileName: MessageModel['fileName']
    }[] = [];

    const getFirstUnseenMessageResult = await client.query(
        'SELECT m1.id, m1.chat FROM general.message AS m1' +
        ' INNER JOIN' +
        '(SELECT chat, min(id) as id FROM general.message' +
        ' WHERE NOT seen_by ? \'' + userID + '\' AND thread IS null ' +
        ' AND chat in (' + chatsWithLastMessageDetail.map(e => e.id).join(', ') + ') ' +
        'GROUP BY chat) AS m2 ' +
        'ON m1.chat = m2.chat AND m1.id = m2.id'
    ).then((res) => res)
        .catch((error) => [401, error]);
    if (Array.isArray(getFirstUnseenMessageResult)) {
        return err([401, getFirstUnseenMessageResult[1]]);
    }

    const notFoundChatIDs = [];
    for (const chatWithLastMessageDetail of chatsWithLastMessageDetail) {
        const row = getFirstUnseenMessageResult.rows.find(e => e.chat === chatWithLastMessageDetail.id);
        if (row === undefined) {
            notFoundChatIDs.push(chatWithLastMessageDetail.id);
        }
    }

    let getFirstUnseenThreadMessageResult: undefined | (QueryResult<any> | any[]) = undefined;
    if (notFoundChatIDs.length !== 0) {
        getFirstUnseenThreadMessageResult = await client.query(
            'SELECT m1.id, m1.chat, m1.content, m1.created_at, m1.user FROM general.message AS m1' +
            ' INNER JOIN' +
            '(SELECT chat, min(id) as id FROM general.message' +
            ' WHERE NOT seen_by ? \'' + userID +
            '\' AND chat in (' + notFoundChatIDs.join(', ') + ') ' +
            'GROUP BY chat) AS m2 ' +
            'ON m1.chat = m2.chat AND m1.id = m2.id'
        ).then((res) => res)
            .catch((error) => [401, error]);
        if (Array.isArray(getFirstUnseenThreadMessageResult)) {
            return err([401, getFirstUnseenThreadMessageResult[1]]);
        }
    }

    for (const chatWithLastMessageDetail of chatsWithLastMessageDetail) {
        let firstUnseenMessageID = null;
        let isFirstUnseenFromThread = false;
        const mainChatFirstUnseenMessage = getFirstUnseenMessageResult.rows
            .find(e => BigInt(e.chat) === chatWithLastMessageDetail.id);
        if (mainChatFirstUnseenMessage !== undefined) {
            firstUnseenMessageID = mainChatFirstUnseenMessage.id;
        } else {
            const row = getFirstUnseenThreadMessageResult?.rows.find(e => BigInt(e.chat) === chatWithLastMessageDetail.id);
            if (row !== undefined) {
                isFirstUnseenFromThread = true;
            }
        }


        result.push({
            ...chatWithLastMessageDetail,
            firstUnseenMessageID,
            isFirstUnseenFromThread
        });
    }

    return ok(result);
};

export default get;