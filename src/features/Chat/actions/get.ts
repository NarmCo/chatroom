import { Connection } from '../../../utils/connection';
import { err, ok, Result } from 'never-catch';
import { Chat, ChatModel } from '../schema';
import { MessageModel } from '../../Message/schema';
import Error from '../error';
import { Context, U } from '@mrnafisia/type-query';

const get = async (
    connection: Connection,
    start: bigint,
    step: number
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
    return await getFirstUnseenMessage(
        connection,
        getLastMessagesResult.value
    );
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
        ['id', 'title', 'isGroup'] as const,
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
        ' FROM message as m1' +
        ' inner join' +
        ' (SELECT chat, max(created_at) as created_at FROM message group by chat) as m2' +
        ' on m1.chat = m2.chat and m1.created_at = m2.created_at'
    )
        .then((res) => res)
        .catch((error) => [401, error]);
    if (Array.isArray(getLastMessages)) {
        // TODO improve
        return err([401, getLastMessages[1]]);
    }

    for (const chat of chats) {
        const row = getLastMessages.rows.find(e => e.chat === chat.id);
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

    const getLastUnseenMessageResult = await client.query(
        'SELECT m1.id, m1.chat FROM message AS m1' +
        'INNER JOIN' +
        '(SELECT chat, min(id) as id FROM message' +
        'WHERE NOT users ? ' + userID + ' AND thread = null ' +
        ' AND chat in \'[' + chatsWithLastMessageDetail.map(e => e.id).join(', ') + ']\' ' +
        'GROUP BY chat) AS m2 ' +
        'ON m1.chat = m2.chat AND m1.id = m2.id'
    ).then((res) => res)
        .catch((error) => [401, error]);
    if (Array.isArray(getLastUnseenMessageResult)) {
        return err([401, getLastUnseenMessageResult[1]]);
    }

    const notFoundChatIDs = [];
    for (const chatWithLastMessageDetail of chatsWithLastMessageDetail) {
        const row = getLastUnseenMessageResult.rows.find(e => e.chat === chatWithLastMessageDetail.id);
        if (row === undefined) {
            notFoundChatIDs.push(chatWithLastMessageDetail.id);
        }
    }

    const getLastUnseenThreadMessageResult = await client.query(
        'SELECT m1.id, m1.chat, m1.content, m1.created_at, m1.user FROM message AS m1' +
        'INNER JOIN' +
        '(SELECT chat, min(id) as id FROM message' +
        'WHERE NOT users ? ' + userID +
        ' AND chat in \'[' + notFoundChatIDs.join(', ') + ']\' ' +
        'GROUP BY chat) AS m2 ' +
        'ON m1.chat = m2.chat AND m1.id = m2.id'
    ).then((res) => res)
        .catch((error) => [401, error]);
    if (Array.isArray(getLastUnseenThreadMessageResult)) {
        return err([401, getLastUnseenThreadMessageResult[1]]);
    }

    for (const chatWithLastMessageDetail of chatsWithLastMessageDetail) {
        let firstUnseenMessageID = null;
        let isFirstUnseenFromThread = false;
        const mainChatLastUnseenMessage = getLastUnseenMessageResult.rows
            .find(e => e.chat === chatWithLastMessageDetail.id);
        if (mainChatLastUnseenMessage !== undefined) {
            firstUnseenMessageID = mainChatLastUnseenMessage.id;

            const row = getLastUnseenThreadMessageResult.rows.find(e => e.chat === chatWithLastMessageDetail.id);
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