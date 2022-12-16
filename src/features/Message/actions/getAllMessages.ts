import { Connection } from '../../../utils/connection';
import { Chat, ChatModel } from '../../Chat/schema';
import { Thread, ThreadModel } from '../../Thread/schema';
import { err, ok, Result } from 'never-catch';
import { Message, MessageModel } from '../schema';
import Error from '../error';
import Constant from '../constant';
import { U } from '@mrnafisia/type-query';

const getAllMessages = async (
    connection: Connection,
    chatID?: ChatModel['id'],
    threadID?: ThreadModel['id']
): Promise<Result<MessageModel<['id', 'content', 'reply',
    'createdAt', 'userID', 'seenBy', 'forward', 'fileID',
    'isEdited', 'isDeleted']>[], Error>> => {
    // validation
    const checkValidationResult = checkValidation(
        chatID,
        threadID
    );
    if (!checkValidationResult.ok) {
        return checkValidationResult;
    }

    // check chat existence
    if (chatID !== undefined) {
        const checkChatExistenceResult = await checkChatExistence(
            connection,
            chatID
        );
        if (!checkChatExistenceResult.ok) {
            return checkChatExistenceResult;
        }
    }

    // chat thread existence
    if (threadID !== undefined) {
        const checkThreadExistenceResult = await checkThreadExistence(
            connection,
            threadID
        );
        if (!checkThreadExistenceResult) {
            return checkThreadExistenceResult;
        }
    }

    return await getMessages(connection, chatID, threadID);
};

const checkValidation = (
    chatID?: ChatModel['id'],
    threadID?: ThreadModel['id']
): Result<undefined, Error> => {
    if (chatID !== undefined && !ChatModel.id.Validate(chatID)) {
        return err([202]);
    }

    if (threadID !== undefined && !ThreadModel.id.Validate(threadID)) {
        return err([203]);
    }

    if (chatID === undefined && threadID === undefined) {
        return err([211]);
    }

    return ok(undefined);
};

export default getAllMessages;

const checkChatExistence = async (
    { client }: Omit<Connection, 'userID'>,
    chatID: ChatModel['id']
): Promise<Result<undefined, Error>> => {
    const checkChatExistenceResult = await Chat.select(
        ['id'] as const,
        context => context.colCmp('id', '=', chatID)
    ).exec(client, ['get', 'one']);
    if (!checkChatExistenceResult.ok) {
        return err(
            checkChatExistenceResult.error === false ? [301] : [401, checkChatExistenceResult.error]
        );
    }

    return ok(undefined);
};

const checkThreadExistence = async (
    { client }: Omit<Connection, 'userID'>,
    threadID: ThreadModel['id']
): Promise<Result<undefined, Error>> => {
    const checkThreadExistenceResult = await Thread.select(
        ['id'] as const,
        context => context.colCmp('id', '=', threadID)
    ).exec(client, ['get', 'one']);
    if (!checkThreadExistenceResult.ok) {
        return err(
            checkThreadExistenceResult.error === false ? [302] : [401, checkThreadExistenceResult.error]
        );
    }

    return ok(undefined);
};

const getMessages = async (
    { client }: Omit<Connection, 'userID'>,
    chatID?: ChatModel['id'],
    threadID?: ThreadModel['id']
): Promise<Result<MessageModel<['id', 'content', 'reply',
    'createdAt', 'userID', 'seenBy', 'forward', 'fileID',
    'isEdited', 'isDeleted']>[], Error>> => {
    const getMessagesResult = await Message.select(
        ['id', 'content', 'reply',
            'createdAt', 'userID', 'seenBy', 'forward', 'fileID',
            'isEdited', 'isDeleted'] as const,
        context =>
            U.andAllOp([
                context.colCmp('chatID', '=', chatID),
                context.colCmp('threadID', '=', threadID),
                context.colNull('threadID', chatID === undefined ? '!= null' : '= null')
            ]),
        {
            ignoreInWhere: true
        }
    ).exec(client, []);
    if (!getMessagesResult.ok) {
        return err([401, getMessagesResult.error]);
    }
    const messages = getMessagesResult.value;

    for (let i = 0; i < messages.length; ++i) {
        if (messages[i].isDeleted === true) {
            messages[i].content = Constant.DELETED_MESSAGE_CONTENT;
        }
        messages[i].seenBy = (messages[i].seenBy as string[]).map(e => Number(e));
    }

    messages.sort((a, b) => {
        if (a.createdAt > b.createdAt) {
            return 1;
        } else if (a.createdAt < b.createdAt) {
            return -1;
        } else {
            return 0;
        }
    });

    return ok(messages);
};