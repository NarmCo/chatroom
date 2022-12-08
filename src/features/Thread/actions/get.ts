import Error from '../../Chat/error';
import { err, ok, Result } from 'never-catch';
import { ChatModel } from '../../Chat/schema';
import { Thread, ThreadModel } from '../schema';
import { MessageModel } from '../../Message/schema';
import { Context, U } from '@mrnafisia/type-query';
import { Connection } from '../../../utils/connection';

const get = async (
    connection: Connection,
    chatID: ChatModel['id'],
    start: bigint,
    step: number
): Promise<Result<{
    result: {
        id: ThreadModel['id'],
        title: ThreadModel['title'],
        firstUnseenMessageID: MessageModel['id'] | null,
        lastMessageID: MessageModel['id'],
        lastMessageContent: MessageModel['content'],
        lastMessageCreatedAt: MessageModel['createdAt'],
        lastMessageUserID: MessageModel['userID']
    }[],
    length: number
}, Error>> => {

    // find user chats using connection.userID
    const getThreadsResult = await getThreads(
        connection,
        chatID,
        start,
        step
    );
    if (!getThreadsResult.ok) {
        return getThreadsResult;
    }

    // find last message details
    const getLastMessagesResult = await getLastMessages(
        connection,
        getThreadsResult.value.result
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
        length: getThreadsResult.value.length
    });
};

const getThreads = async (
    { client }: Omit<Connection, 'userID'>,
    chatID: ChatModel['id'],
    start: bigint,
    step: number
): Promise<Result<{ result: ThreadModel<['id', 'title']>[]; length: number }, Error>> => {
    const where = (context: Context<typeof Thread.table['columns']>) => context.colCmp('chatID', '=', chatID);
    const getThreadsResult = await Thread.select(
        ['id', 'title'] as const,
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
    if (!getThreadsResult.ok) {
        return err([401, getThreadsResult.error]);
    }

    const getLengthResult = await Thread.select(
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
        result: getThreadsResult.value,
        length: getLengthResult.value.len
    });
};

const getLastMessages = async (
    { client }: Omit<Connection, 'userID'>,
    threads: ThreadModel<['id', 'title']>[]
): Promise<Result<{
    id: ThreadModel['id'],
    title: ThreadModel['title'],
    lastMessageID: MessageModel['id'],
    lastMessageContent: MessageModel['content'],
    lastMessageCreatedAt: MessageModel['createdAt'],
    lastMessageUserID: MessageModel['userID']
}[], Error>> => {
    const result: {
        id: ThreadModel['id'],
        title: ThreadModel['title'],
        lastMessageID: MessageModel['id'],
        lastMessageContent: MessageModel['content'],
        lastMessageCreatedAt: MessageModel['createdAt'],
        lastMessageUserID: MessageModel['userID']
    }[] = [];
    const getLastMessages = await client.query(
        'SELECT m1.id, m1.thread, m1.content, m1.user, m1.created_at' +
        ' FROM message as m1' +
        ' inner join' +
        ' (SELECT thread, max(created_at) as created_at FROM message WHERE' +
        ' thread in ' + '\'[' + threads.map(e => e.id).join(', ') + ']\'' +
        'group by thread) as m2' +
        ' on m1.chat = m2.chat and m1.created_at = m2.created_at'
    )
        .then((res) => res)
        .catch((error) => [401, error]);
    if (Array.isArray(getLastMessages)) {
        // TODO improve
        return err([401, getLastMessages[1]]);
    }

    for (const thread of threads) {
        const row = getLastMessages.rows.find(e => e.thread === thread.id);
        if (row === undefined) {
            return err([401, null]);
        }

        result.push(
            {
                id: thread.id,
                title: thread.title,
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
    threadsWithLastMessageDetail: {
        id: ThreadModel['id'],
        title: ThreadModel['title'],
        lastMessageID: MessageModel['id'],
        lastMessageContent: MessageModel['content'],
        lastMessageCreatedAt: MessageModel['createdAt'],
        lastMessageUserID: MessageModel['userID']
    }[]
): Promise<Result<{
    id: ThreadModel['id'],
    title: ThreadModel['title'],
    firstUnseenMessageID: MessageModel['id'] | null
    lastMessageID: MessageModel['id'],
    lastMessageContent: MessageModel['content'],
    lastMessageCreatedAt: MessageModel['createdAt'],
    lastMessageUserID: MessageModel['userID']
}[], Error>> => {
    const result: {
        id: ThreadModel['id'],
        title: ThreadModel['title'],
        firstUnseenMessageID: MessageModel['id'] | null
        lastMessageID: MessageModel['id'],
        lastMessageContent: MessageModel['content'],
        lastMessageCreatedAt: MessageModel['createdAt'],
        lastMessageUserID: MessageModel['userID']
    }[] = [];

    const getFirstUnseenMessageResult = await client.query(
        'SELECT m1.id, m1.thread FROM message AS m1' +
        'INNER JOIN' +
        '(SELECT thread, min(id) as id FROM message' +
        'WHERE NOT seen_by ? ' + userID +
        ' AND thread in \'[' + threadsWithLastMessageDetail.map(e => e.id).join(', ') + ']\' ' +
        'GROUP BY chat) AS m2 ' +
        'ON m1.chat = m2.chat AND m1.id = m2.id'
    ).then((res) => res)
        .catch((error) => [401, error]);
    if (Array.isArray(getFirstUnseenMessageResult)) {
        return err([401, getFirstUnseenMessageResult[1]]);
    }

    for (const threadWithLastMessageDetail of threadsWithLastMessageDetail) {
        let firstUnseenMessageID = null;
        const mainChatLastUnseenMessage = getFirstUnseenMessageResult.rows
            .find(e => e.chat === threadWithLastMessageDetail.id);
        if (mainChatLastUnseenMessage !== undefined) {
            firstUnseenMessageID = mainChatLastUnseenMessage.id;
        }

        result.push({
            ...threadWithLastMessageDetail,
            firstUnseenMessageID
        });
    }

    return ok(result);
};

export default get;