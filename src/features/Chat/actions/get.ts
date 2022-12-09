import Error from '../error';
import { QueryResult } from 'pg';
import { Chat, ChatModel } from '../schema';
import { err, ok, Result } from 'never-catch';
import { Context, U } from '@mrnafisia/type-query';
import { MessageModel } from '../../Message/schema';
import { Connection } from '../../../utils/connection';
import { User, UserModel } from '../../User/schema';

const get = async (
    connection: Connection,
    start: bigint,
    step: number
): Promise<Result<{
    result: {
        id: ChatModel['id'],
        title: ChatModel['title'],
        isGroup: ChatModel['isGroup'],
        firstUnseenMessageID: MessageModel['id'] | null,
        isFirstUnseenFromThread: boolean,
        lastMessageID: MessageModel['id'],
        lastMessageContent: MessageModel['content'],
        lastMessageCreatedAt: MessageModel['createdAt'],
        lastMessageUserID: MessageModel['userID']
    }[],
    length: number
}, Error>> => {

    // find user chats using connection.userID
    const getChatsResult = await getChats(
        connection,
        start,
        step
    );
    if (!getChatsResult.ok) {
        return getChatsResult;
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
    step: number
): Promise<Result<{ result: ChatModel<['id', 'title', 'isGroup']>[]; length: number }, Error>> => {
    const where = (context: Context<typeof Chat.table['columns']>) =>
        context.colsOr({
            ownerID: ['=', userID],
            userIDs: ['?', userID.toString()]
        });
    const getChatsResult = await Chat.select(
        ['id', 'title', 'isGroup', 'userIDs', 'ownerID'] as const,
        where,
        {
            start,
            step,
            orders: [
                {
                    by: 'lastMessageSentAt',
                    direction: 'desc'
                }
            ]
        }
    ).exec(client, []);
    if (!getChatsResult.ok) {
        return err([401, getChatsResult.error]);
    }

    const chatsWithoutTitle = getChatsResult.value.filter(e => e.title === null);
    if (chatsWithoutTitle.length !== 0){
        const ids: UserModel['id'][] = [];
        for (const chatWithoutTitle of chatsWithoutTitle){
            if (!ids.includes(Number((chatWithoutTitle.userIDs as string[])[0]))){
                ids.push(Number((chatWithoutTitle.userIDs as string[])[0]));
            }
            if (!ids.includes(chatWithoutTitle.ownerID)){
                ids.push(chatWithoutTitle.ownerID);
            }
        }
        const getUsersResult = await User.select(
            ['id', 'name'] as const,
            context => context.colList('id', 'in', ids)
        ).exec(client, []);
        if (!getUsersResult.ok){
            return err([401, getUsersResult.error])
        }
        for(let i = 0; i < getChatsResult.value.length; ++i){
            if (getChatsResult.value[i].title === null){
                if(userID === getChatsResult.value[i].ownerID){
                    getChatsResult.value[i].title = getUsersResult.value.find(e => e.id === Number((getChatsResult.value[i].userIDs as string[])[0]))?.name as string
                }else{
                    getChatsResult.value[i].title = getUsersResult.value.find(e => e.id === getChatsResult.value[i].ownerID)?.name as string
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
        where
    ).exec(client, ['get', 'one']);
    if (!getLengthResult.ok) {
        return err([401, getLengthResult.error]);
    }


    return ok({
        result: getChatsResult.value,
        length: getLengthResult.value.len
    });
};

const getLastMessages = async (
    { client }: Omit<Connection, 'userID'>,
    chats: ChatModel<['id', 'title', 'isGroup']>[]
): Promise<Result<{
    id: ChatModel['id'],
    title: ChatModel['title'],
    isGroup: ChatModel['isGroup'],
    lastMessageID: MessageModel['id'],
    lastMessageContent: MessageModel['content'],
    lastMessageCreatedAt: MessageModel['createdAt'],
    lastMessageUserID: MessageModel['userID']
}[], Error>> => {
    const result: {
        id: ChatModel['id'],
        title: ChatModel['title'],
        isGroup: ChatModel['isGroup'],
        lastMessageID: MessageModel['id'],
        lastMessageContent: MessageModel['content'],
        lastMessageCreatedAt: MessageModel['createdAt'],
        lastMessageUserID: MessageModel['userID']
    }[] = [];
    const getLastMessages = await client.query(
        'SELECT m1.id, m1.chat, m1.content, m1.user, m1.created_at' +
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
        const row = getLastMessages.rows.find(e => BigInt(e.chat) === chat.id);
        if (row === undefined) {
            return err([401, null]);
        }

        result.push(
            {
                id: chat.id,
                title: chat.title,
                isGroup: chat.isGroup,
                lastMessageID: row.id,
                lastMessageContent: row.content,
                lastMessageCreatedAt: row.created_at,
                lastMessageUserID: row.user
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
        lastMessageID: MessageModel['id'],
        lastMessageContent: MessageModel['content'],
        lastMessageCreatedAt: MessageModel['createdAt'],
        lastMessageUserID: MessageModel['userID']
    }[]
): Promise<Result<{
    id: ChatModel['id'],
    title: ChatModel['title'],
    isGroup: ChatModel['isGroup'],
    firstUnseenMessageID: MessageModel['id'] | null,
    isFirstUnseenFromThread: boolean,
    lastMessageID: MessageModel['id'],
    lastMessageContent: MessageModel['content'],
    lastMessageCreatedAt: MessageModel['createdAt'],
    lastMessageUserID: MessageModel['userID']
}[], Error>> => {
    const result: {
        id: ChatModel['id'],
        title: ChatModel['title'],
        isGroup: ChatModel['isGroup'],
        firstUnseenMessageID: MessageModel['id'] | null,
        isFirstUnseenFromThread: boolean,
        lastMessageID: MessageModel['id'],
        lastMessageContent: MessageModel['content'],
        lastMessageCreatedAt: MessageModel['createdAt'],
        lastMessageUserID: MessageModel['userID']
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
        }else{
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