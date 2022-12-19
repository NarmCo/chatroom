import Error from '../error';
import Constant from '../constant';
import { err, ok, Result } from 'never-catch';
import { Message, MessageModel } from '../schema';
import { Connection } from '../../../utils/connection';
import { Chat, ChatModel } from '../../Chat/schema';
import { U } from '@mrnafisia/type-query';

const get = async (
    connection: Connection,
    id: MessageModel['id'],
    orderDirection: string,
    step: number
): Promise<Result<MessageModel<['id', 'content', 'reply',
    'createdAt', 'userID', 'seenBy', 'forward', 'fileID',
    'isEdited', 'isDeleted']>[], Error>> => {
    // validation
    if (!MessageModel.id.Validate(id)) {
        return err([208]);
    }
    if (!['asc', 'desc', 'middle'].includes(orderDirection)) {
        return err([209]);
    }
    if (step < 1 || step > 50) {
        return err([210]);
    }

    // check message existence
    const checkMessageExistenceResult = await checkMessageExistence(
        connection,
        id
    );
    if (!checkMessageExistenceResult.ok) {
        return checkMessageExistenceResult;
    }
    const message = checkMessageExistenceResult.value;

    // permission
    const hasPermissionResult = await hasPermission(connection, message.chatID);
    if (!hasPermissionResult.ok){
        return hasPermissionResult;
    }

    // get messages
    if (orderDirection === 'middle') {
        return await getMessagesMiddle(
            connection,
            id,
            message.chatID,
            message.threadID,
            step
        );
    }

    return await getOrderedMessages(
        connection,
        id,
        message.chatID,
        message.threadID,
        orderDirection,
        step
    );
};

const checkMessageExistence = async (
    { client }: Omit<Connection, 'userID'>,
    id: MessageModel['id']
): Promise<Result<MessageModel<['chatID', 'threadID']>, Error>> => {
    const checkMessageExistenceResult = await Message.select(
        [
            'threadID',
            'chatID'
        ] as const,
        context =>
            context.colCmp('id', '=', id)
    ).exec(client, ['get', 'one']);
    if (!checkMessageExistenceResult.ok) {
        return err(
            checkMessageExistenceResult.error === false ? [303] : [401, checkMessageExistenceResult.error]
        );
    }

    return ok(checkMessageExistenceResult.value);
};

const getMessagesMiddle = async (
    { client }: Omit<Connection, 'userID'>,
    id: MessageModel['id'],
    chatID: MessageModel['id'],
    threadID: MessageModel['threadID'],
    step: number
): Promise<Result<MessageModel<['id', 'content', 'reply',
    'createdAt', 'userID', 'seenBy', 'forward', 'fileID',
    'isEdited', 'isDeleted', 'fileName', 'fileSize']>[], Error>> => {

    const selectColumns = 'SELECT id, content, reply as "reply", created_at as "createdAt", message.user as "userID" ,' +
        ' seen_by as "seenBy" , forward, file as "fileID", is_edited as "isEdited", is_deleted as "isDeleted", file_name as "fileName", file_size as "fileSize"' +
        ' FROM general.message WHERE ' +
        'chat = ' + chatID + ' AND thread ' + (threadID === null ? ' is null ' : ' = ' + threadID) + ' AND id ';

    const getMessagesResult = await client.query(
        '(' + selectColumns + ' >= ' + id + ' LIMIT ' + step + ')' +
        ' UNION ' +
        '(' + selectColumns + ' < ' + id + ' ORDER BY id desc LIMIT ' + step + ')'
    ).then((res) => res)
        .catch((error) => [401, error]);
    if (Array.isArray(getMessagesResult)) {
        return err([401, getMessagesResult[1]]);
    }

    const result: MessageModel<['id', 'content', 'reply',
        'createdAt', 'userID', 'seenBy', 'forward', 'fileID',
        'isEdited', 'isDeleted', 'fileName', 'fileSize']>[] = [];

    for (const row of getMessagesResult.rows) {
        result.push(
            {
                ...row,
                id: BigInt(row.id),
                seenBy: (row.seenBy as string[]).map(e => Number(e)),
                content: row.isDelete ? Constant.DELETED_MESSAGE_CONTENT : row.content
            }
        );
    }

    result.sort((a, b) => {
        if (a.id > b.id) {
            return -1;
        } else {
            return 1;
        }
    });

    return ok(result);
};

const getOrderedMessages = async (
    { client }: Omit<Connection, 'userID'>,
    id: MessageModel['id'],
    chatID: MessageModel['chatID'],
    threadID: MessageModel['threadID'],
    orderDirection: string,
    step: number
): Promise<Result<MessageModel<['id', 'content', 'reply',
    'createdAt', 'userID', 'seenBy', 'forward', 'fileID',
    'isEdited', 'isDeleted', 'fileName', 'fileSize']>[], Error>> => {
    const getOrderedMessagesResult = await Message.select(
        ['id', 'content', 'reply',
            'createdAt', 'userID', 'seenBy', 'forward', 'fileID',
            'isEdited', 'isDeleted', 'fileName', 'fileSize'] as const,
        context => context.colsAnd({
            chatID: ['=', chatID],
            threadID: threadID === null ? ['= null'] : ['=', threadID],
            id: [orderDirection === 'asc' ? '>=' : '<=', id]
        }),
        {
            orders: orderDirection === 'desc' ?
                [
                    {
                        by: 'id',
                        direction: 'desc'
                    }
                ] : undefined,
            step
        }
    ).exec(client, []);
    if (!getOrderedMessagesResult.ok) {
        return err([401, getOrderedMessagesResult.error]);
    }
    const result: MessageModel<['id', 'content', 'reply',
        'createdAt', 'userID', 'seenBy', 'forward', 'fileID',
        'isEdited', 'isDeleted', 'fileName', 'fileSize']>[] = [];
    for (const orderedMessage of getOrderedMessagesResult.value) {
        result.push({
            ...orderedMessage,
            seenBy: (orderedMessage.seenBy as string[]).map(e => Number(e)),
            content: orderedMessage.isDeleted ? Constant.DELETED_MESSAGE_CONTENT : orderedMessage.content
        });
    }
    result.sort((a, b) => {
        if (a.id > b.id) {
            return -1;
        } else {
            return 1;
        }
    });
    return ok(result);
};

const hasPermission = async (
    { client, userID }: Connection,
    chatID: ChatModel['id']
): Promise<Result<undefined, Error>> => {
    const hasPermissionResult = await Chat.select(
        ['id'] as const,
        context =>
            U.andOp(
                context.colCmp('id', '=', chatID),
                context.colsOr({
                    ownerID: ['=', userID],
                    userIDs: ['?', userID.toString()]
                })
            )
    ).exec(client, ['get', 'one']);
    if (!hasPermissionResult.ok){
        return err(
            hasPermissionResult.error === false ? [307] : [401, hasPermissionResult.error]
        )
    }

    return ok(undefined);
}

export default get;