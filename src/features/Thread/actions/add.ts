import { Connection } from '../../../utils/connection';
import { Thread, ThreadModel } from '../schema';
import { err, ok, Result } from 'never-catch';
import { HistoryRow } from '../../../utils/historyRow';
import Error from '../error';
import { Chat, ChatModel } from '../../Chat/schema';
import { U } from '@mrnafisia/type-query';
import { FEATURES } from '../../../utils/features';
import Operation from '../operation';
import { UserModel } from '../../User/schema';

const add = async (
    connection: Connection,
    thread: ThreadModel<['title', 'chatID']>
): Promise<Result<{ id: ThreadModel['id']; histories: HistoryRow[] }, Error>> => {
    // validation
    const checkValidationResult = checkValidation(thread);
    if (!checkValidationResult.ok) {
        return checkValidationResult;
    }

    // user most be a member to the chat
    const checkChatExistenceResult = await checkChatExistence(
        connection,
        thread.chatID
    );
    if (!checkChatExistenceResult.ok) {
        return checkChatExistenceResult;
    }
    const chatOwnerID = checkChatExistenceResult.value;

    // add thread
    return await addThread(
        connection,
        {
            ...thread,
            threadOwnerID: connection.userID,
            chatOwnerID
        }
    );

};

const checkValidation = (
    thread: ThreadModel<['title', 'chatID']>
): Result<undefined, Error> => {
    const threadValidationResult = ThreadModel.Validate(thread);
    if (!threadValidationResult.ok) {
        switch (threadValidationResult.error) {
            case 'title':
                return err([201]);
            case 'chatID':
                return err([202]);
        }
    }

    return ok(undefined);
};

const checkChatExistence = async (
    { userID, client }: Connection,
    chatID: ChatModel['id']
): Promise<Result<UserModel['id'], Error>> => {
    const checkChatExistenceResult = await Chat.select(
        ['ownerID'] as const,
        context =>
            U.andOp(
                context.colCmp('id', '=', chatID),
                context.colsOr({
                    ownerID: ['=', userID],
                    userIDs: ['?', userID.toString()]
                })
            )
    ).exec(client, ['get', 'one']);
    if (!checkChatExistenceResult.ok) {
        return err(
            checkChatExistenceResult.error === false ? [301] : [401, checkChatExistenceResult.error]
        );
    }

    return ok(checkChatExistenceResult.value.ownerID);
};

const addThread = async (
    { client }: Omit<Connection, 'userID'>,
    thread: ThreadModel<['title', 'chatID', 'threadOwnerID', 'chatOwnerID']>
): Promise<Result<{ id: ThreadModel['id']; histories: HistoryRow[] }, Error>> => {
    const addThreadResult = await Thread.insert(
        [thread],
        ['id'] as const
    ).exec(client, ['get', 'one']);
    if (!addThreadResult.ok) {
        return err([401, addThreadResult.error]);
    }

    return ok({
        id: addThreadResult.value.id,
        histories: [
            {
                feature: FEATURES.Thread,
                table: Thread.table.title,
                row: BigInt(addThreadResult.value.id),
                operations: [Operation.ADD],
                data: {
                    ...thread
                }
            }
        ]
    });
};

export default add;