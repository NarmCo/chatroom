import Error from '../../Chat/error';
import {ChatModel} from '../../Chat/schema';
import {err, ok, Result} from 'never-catch';
import {Thread, ThreadModel} from '../schema';
import {MessageModel} from '../../Message/schema';
import {Context, U} from '@mrnafisia/type-query';
import {Connection} from '../../../utils/connection';

const get = async (
    connection: Connection,
    chatID: ChatModel['id'],
    start: bigint,
    step: number
): Promise<Result<{
    result: {
        id: ThreadModel['id'],
        title: ThreadModel['title'],
        ownerID: ThreadModel['threadOwnerID'],
        firstUnseenMessageID: MessageModel['id'] | null,
        lastMessageID: MessageModel['id'] | null,
        lastMessageContent: MessageModel['content'] | null,
        lastMessageCreatedAt: MessageModel['createdAt'] | null,
        lastMessageUserID: MessageModel['userID'] | null
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
    if(getThreadsResult.value.length === 0){
        return ok({
            result: [],
            length: 0
        })
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
    {client}: Omit<Connection, 'userID'>,
    chatID: ChatModel['id'],
    start: bigint,
    step: number
): Promise<Result<{ result: ThreadModel<['id', 'title', 'threadOwnerID']>[]; length: number }, Error>> => {
    const where = (context: Context<typeof Thread.table['columns']>) => context.colCmp('chatID', '=', chatID);
    const getThreadsResult = await Thread.select(
        ['id', 'title', 'threadOwnerID'] as const,
        where,
        {
            start,
            step: Number(step) === -1 ? undefined : step,
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
    {client}: Omit<Connection, 'userID'>,
    threads: ThreadModel<['id', 'title', 'threadOwnerID']>[]
): Promise<Result<{
    id: ThreadModel['id'],
    title: ThreadModel['title'],
    threadOwnerID: ThreadModel['threadOwnerID'],
    lastMessageID: MessageModel['id'] | null,
    lastMessageContent: MessageModel['content'] | null,
    lastMessageCreatedAt: MessageModel['createdAt'] | null,
    lastMessageUserID: MessageModel['userID'] | null
}[], Error>> => {
    const result: {
        id: ThreadModel['id'],
        title: ThreadModel['title'],
        threadOwnerID: ThreadModel['threadOwnerID'],
        lastMessageID: MessageModel['id'] | null,
        lastMessageContent: MessageModel['content'] | null,
        lastMessageCreatedAt: MessageModel['createdAt'] | null,
        lastMessageUserID: MessageModel['userID'] | null
    }[] = [];
    const getLastMessages = await client.query(
        'SELECT m1.id, m1.thread, m1.content, m1.user, m1.created_at' +
        ' FROM general.message as m1' +
        ' inner join' +
        ' (SELECT thread, max(created_at) as created_at FROM general.message WHERE' +
        ' thread in ' + '(' + threads.map(e => e.id).join(', ') + ')' +
        ' group by thread) as m2' +
        ' on m1.thread = m2.thread and m1.created_at = m2.created_at'
    )
        .then((res) => res)
        .catch((error) => [401, error]);
    if (Array.isArray(getLastMessages)) {
        // TODO improve
        return err([401, getLastMessages[1]]);
    }

    for (const thread of threads) {
        let lastMessageID = null;
        let lastMessageContent = null;
        let lastMessageCreatedAt = null;
        let lastMessageUserID = null;
        const row = getLastMessages.rows.find(e => BigInt(e.thread) === thread.id);
        if (row !== undefined) {
            lastMessageID = row.id;
            lastMessageContent = row.content;
            lastMessageCreatedAt = row.created_at;
            lastMessageUserID = row.user;
        }

        result.push(
            {
                id: thread.id,
                title: thread.title,
                threadOwnerID: thread.threadOwnerID,
                lastMessageID,
                lastMessageContent,
                lastMessageCreatedAt,
                lastMessageUserID
            }
        );
    }

    return ok(result);
};

const getFirstUnseenMessage = async (
    {client, userID}: Connection,
    threadsWithLastMessageDetail: {
        id: ThreadModel['id'],
        title: ThreadModel['title'],
        threadOwnerID: ThreadModel['threadOwnerID'],
        lastMessageID: MessageModel['id'] | null,
        lastMessageContent: MessageModel['content'] | null,
        lastMessageCreatedAt: MessageModel['createdAt'] | null,
        lastMessageUserID: MessageModel['userID'] | null
    }[]
): Promise<Result<{
    id: ThreadModel['id'],
    title: ThreadModel['title'],
    ownerID: ThreadModel['threadOwnerID'],
    firstUnseenMessageID: MessageModel['id'] | null
    lastMessageID: MessageModel['id'] | null,
    lastMessageContent: MessageModel['content'] | null,
    lastMessageCreatedAt: MessageModel['createdAt'] | null,
    lastMessageUserID: MessageModel['userID'] | null
}[], Error>> => {
    const result: {
        id: ThreadModel['id'],
        title: ThreadModel['title'],
        ownerID: ThreadModel['threadOwnerID'],
        firstUnseenMessageID: MessageModel['id'] | null
        lastMessageID: MessageModel['id'] | null,
        lastMessageContent: MessageModel['content'] | null,
        lastMessageCreatedAt: MessageModel['createdAt'] | null,
        lastMessageUserID: MessageModel['userID'] | null
    }[] = [];

    const getFirstUnseenMessageResult = await client.query(
        'SELECT m1.id, m1.thread FROM general.message AS m1' +
        ' INNER JOIN' +
        ' (SELECT thread, min(id) as id FROM general.message' +
        ' WHERE NOT seen_by ? \'' + userID +
        '\' AND thread in (' + threadsWithLastMessageDetail.map(e => e.id).join(', ') + ') ' +
        ' GROUP BY thread) AS m2 ' +
        ' ON m1.thread = m2.thread AND m1.id = m2.id'
    ).then((res) => res)
        .catch((error) => [401, error]);
    if (Array.isArray(getFirstUnseenMessageResult)) {
        return err([401, getFirstUnseenMessageResult[1]]);
    }

    for (const threadWithLastMessageDetail of threadsWithLastMessageDetail) {
        let firstUnseenMessageID = null;
        const mainChatLastUnseenMessage = getFirstUnseenMessageResult.rows
            .find(e => BigInt(e.thread) === threadWithLastMessageDetail.id);
        if (mainChatLastUnseenMessage !== undefined) {
            firstUnseenMessageID = mainChatLastUnseenMessage.id;
        }

        result.push({
            ...threadWithLastMessageDetail,
            firstUnseenMessageID,
            ownerID: threadWithLastMessageDetail.threadOwnerID
        });
    }

    return ok(result);
};

export default get;