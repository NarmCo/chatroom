import Error from '../error';
import Constant from '../constant';
import { err, ok, Result } from 'never-catch';
import { Message, MessageModel } from '../schema';
import { Connection } from '../../../utils/connection';

const get = async (
    connection: Connection,
    id: MessageModel['id'],
    orderDirection: string,
    step: number
): Promise<Result<MessageModel<['id', 'content', 'messageID',
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
): Promise<Result<MessageModel, Error>> => {
    const checkMessageExistenceResult = await Message.select(
        [
            'id',
            'content',
            'threadID',
            'chatID',
            'messageID',
            'createdAt',
            'userID',
            'seenBy',
            'forward',
            'fileID',
            'isEdited',
            'isDeleted'
        ] as const,
        context =>
            context.colCmp('id', '=', id)
    ).exec(client, ['get', 'one']);
    if (!checkMessageExistenceResult.ok) {
        return err(
            checkMessageExistenceResult.error === false ? [303] : [401, checkMessageExistenceResult.error]
        );
    }

    return ok({
        ...checkMessageExistenceResult.value,
        content: checkMessageExistenceResult.value.isDeleted ? Constant.DELETED_MESSAGE_CONTENT : checkMessageExistenceResult.value.content
    });
};

const getMessagesMiddle = async (
    { client }: Omit<Connection, 'userID'>,
    id: MessageModel['id'],
    chatID: MessageModel['id'],
    threadID: MessageModel['threadID'],
    step: number
): Promise<Result<MessageModel<['id', 'content', 'messageID',
    'createdAt', 'userID', 'seenBy', 'forward', 'fileID',
    'isEdited', 'isDeleted']>[], Error>> => {

    const selectColumns = 'SELECT id, content, message.message as messageID, created_at as createdAt, message.user as userID ,' +
        ' seen_by as seenBy , forward, file as fileID, is_edited as isEdited, is_deleted as isDeleted FROM general.message WHERE ' +
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


    const result: MessageModel<['id', 'content', 'messageID',
        'createdAt', 'userID', 'seenBy', 'forward', 'fileID',
        'isEdited', 'isDeleted']>[] = [];

    for (const row of getMessagesResult.rows) {
        result.push(
            {
                ...row,
                content: row.isDelete ? Constant.DELETED_MESSAGE_CONTENT : row.content
            }
        );
    }
    result.sort((a, b) => {
        if (a.id > b.id) {
            return 1;
        } else {
            return -1;
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
): Promise<Result<MessageModel<['id', 'content', 'messageID',
    'createdAt', 'userID', 'seenBy', 'forward', 'fileID',
    'isEdited', 'isDeleted']>[], Error>> => {
    const getOrderedMessagesResult = await Message.select(
        ['id', 'content', 'messageID',
            'createdAt', 'userID', 'seenBy', 'forward', 'fileID',
            'isEdited', 'isDeleted'] as const,
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
    const result: MessageModel<['id', 'content', 'messageID',
        'createdAt', 'userID', 'seenBy', 'forward', 'fileID',
        'isEdited', 'isDeleted']>[] = [];
    for (const orderedMessage of getOrderedMessagesResult.value) {
        result.push({
            ...orderedMessage,
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

export default get;