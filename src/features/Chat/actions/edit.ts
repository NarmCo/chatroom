import { Connection } from '../../../utils/connection';
import { Chat, ChatModel } from '../schema';
import { UserModel } from '../../User/schema';
import { err, ok, Result } from 'never-catch';
import { HistoryRow } from '../../../utils/historyRow';
import Error from '../error';
import { FEATURES } from '../../../utils/features';
import Operation from '../operation';

const edit = async (
    connection: Connection,
    id: ChatModel['id'],
    title?: ChatModel['title'] & string,
    addUserIDs?: UserModel['id'][],
    removeUserIDs?: UserModel['id'][]
): Promise<Result<{ id: ChatModel['id']; histories: HistoryRow[] }, Error>> => {
    // validation
    const checkValidationResult = checkValidation(
        id,
        title,
        addUserIDs,
        removeUserIDs
    );
    if (!checkValidationResult.ok) {
        return checkValidationResult;
    }

    // check chat existence
    const checkChatExistenceResult = await checkChatExistence(
        connection,
        id
    );
    if (!checkChatExistenceResult.ok) {
        return checkChatExistenceResult;
    }
    const userIDs = checkChatExistenceResult.value;

    if (removeUserIDs !== undefined) {
        for (const removeUserID of removeUserIDs) {
            if (!userIDs.includes(removeUserID.toString())) {
                return err([304]);
            }
            userIDs.splice(
                userIDs.indexOf(removeUserID.toString()), 1
            );
        }
    }

    if (addUserIDs !== undefined) {
        for (const addUserID of addUserIDs) {
            if (userIDs.includes(addUserID.toString())) {
                return err([303]);
            }
            userIDs.push(addUserID.toString());
        }
    }

    return await editChat(
        connection,
        id,
        title,
        userIDs
    );
};

const checkValidation = (
    id: ChatModel['id'],
    title?: ChatModel['title'] & string,
    addUserIDs?: UserModel['id'][],
    removeUserIDs?: UserModel['id'][]
): Result<undefined, Error> => {
    if (!ChatModel.id.Validate(id)) {
        return err([204]);
    }

    if (title !== undefined) {
        if (title.length < 1) {
            return err([201]);
        }
    }

    if (addUserIDs !== undefined) {
        if (addUserIDs.length === 0) {
            return err([202]);
        }
        for (const userID of addUserIDs) {
            if (!UserModel.id.Validate(userID)) {
                return err([202]);
            }
        }
    }

    if (removeUserIDs !== undefined) {
        if (removeUserIDs.length === 0) {
            return err([202]);
        }
        for (const userID of removeUserIDs) {
            if (!UserModel.id.Validate(userID)) {
                return err([202]);
            }
        }
    }

    return ok(undefined);
};

const checkChatExistence = async (
    { userID, client }: Connection,
    id: ChatModel['id']
): Promise<Result<string[], Error>> => {
    const checkChatExistenceResult = await Chat.select(
        ['userIDs'] as const,
        context =>
            context.colsAnd({
                id: ['=', id],
                ownerID: ['=', userID],
                isGroup: ['= false']
            })
    ).exec(client, ['get', 'one']);
    if (!checkChatExistenceResult.ok) {
        return err(
            checkChatExistenceResult.error === false ? [301] : [401, checkChatExistenceResult.error]
        );
    }

    return ok(checkChatExistenceResult.value.userIDs as string[]);
};

const editChat = async (
    { client }: Omit<Connection, 'userID'>,
    id: ChatModel['id'],
    title?: ChatModel['title'] & string,
    userIDs?: string[]
): Promise<Result<{ id: ChatModel['id']; histories: HistoryRow[] }, Error>> => {
    const editChatResult = await Chat.update(
        {
            title,
            userIDs
        },
        context =>
            context.colCmp('id', '=', id),
        ['id'] as const,
        {
            ignoreInSets: true
        }
    ).exec(client, ['get', 'one']);
    if (!editChatResult.ok) {
        return err([401, editChatResult.error]);
    }

    return ok({
        id: editChatResult.value.id,
        histories: [
            {
                feature: FEATURES.Chat,
                table: Chat.table.title,
                row: BigInt(editChatResult.value.id),
                operations: [
                    ...(title === undefined ? [] : [Operation.EDIT_TITLE]),
                    ...(userIDs === undefined ? [] : [Operation.EDIT_USER_IDS])
                ],
                data: {
                    ...(title === undefined ? {} : { title }),
                    ...(userIDs === undefined ? {} : { userIDs })
                }
            }
        ]
    });
};

export default edit;