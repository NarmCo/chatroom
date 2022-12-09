import { Connection } from '../../../utils/connection';
import { Chat, ChatModel } from '../../Chat/schema';
import { Thread, ThreadModel } from '../../Thread/schema';
import { err, ok, Result } from 'never-catch';
import { Message, MessageModel } from '../schema';
import { HistoryRow } from '../../../utils/historyRow';
import Error from '../error';
import { U } from '@mrnafisia/type-query';
import { FEATURES } from '../../../utils/features';
import Operation from '../operation';

const seen = async (
    connection: Connection,
    chatID?: ChatModel['id'],
    threadID?: ThreadModel['id']
): Promise<Result<{ ids: MessageModel['id'][]; histories: HistoryRow[] }, Error>> => {
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

    // edit messages
    return await editMessages(
        connection,
        chatID,
        threadID
    );
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

const editMessages = async (
    { client, userID }: Connection,
    chatID?: ChatModel['id'],
    threadID?: ThreadModel['id']
): Promise<Result<{ ids: MessageModel['id'][]; histories: HistoryRow[] }, Error>> => {
    const histories: HistoryRow[] = [];
    const editMessagesResult = await Message.update(
        {
            seenBy: U.conOp(Message.context.col('seenBy'), [userID.toString()])
        },
        context =>
            U.andAllOp([
                context.colCmp('chatID', '=', chatID),
                context.colCmp('threadID', '=', threadID),
                U.notOp(context.colJson('seenBy', '?', userID.toString()))
            ]),
        ['id'] as const,
        {
            ignoreInWhere: true
        }
    ).exec(client, []);
    if (!editMessagesResult.ok) {
        return err([401, editMessagesResult.error]);
    }

    for (const editedMessage of editMessagesResult.value) {
        histories.push({
            feature: FEATURES.Message,
            table: Message.table.title,
            row: BigInt(editedMessage.id),
            operations: [Operation.SEEN],
            data: {
                id: editedMessage.id,
                userID
            }
        });
    }

    return ok({
        ids: editMessagesResult.value.map(e => e.id),
        histories
    });
};

export default seen;