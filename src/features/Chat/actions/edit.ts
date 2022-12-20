import Error from '../error';
import Operation from '../operation';
import { Chat, ChatModel } from '../schema';
import { FileModel } from '../../File/schema';
import { UserModel } from '../../User/schema';
import { err, ok, Result } from 'never-catch';
import { FEATURES } from '../../../utils/features';
import { Connection } from '../../../utils/connection';
import { HistoryRow } from '../../../utils/historyRow';
import { checkChatExistence, checkFileExistence } from '../util';

const edit = async (
    connection: Connection,
    id: ChatModel['id'],
    title?: ChatModel['title'] & string,
    addUserIDs?: UserModel['id'][],
    removeUserIDs?: UserModel['id'][],
    fileID?: FileModel['id']
): Promise<Result<{ id: ChatModel['id']; histories: HistoryRow[] }, Error>> => {
    // validation
    const checkValidationResult = checkValidation(
        id,
        title,
        addUserIDs,
        removeUserIDs,
        fileID
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

    if (fileID !== undefined) {
        const checkFileExistenceResult = await checkFileExistence(
            connection,
            fileID
        );
        if (!checkFileExistenceResult.ok) {
            return checkFileExistenceResult;
        }
    }

    return await editChat(
        connection,
        id,
        title,
        userIDs,
        fileID
    );
};

const checkValidation = (
    id: ChatModel['id'],
    title?: ChatModel['title'] & string,
    addUserIDs?: UserModel['id'][],
    removeUserIDs?: UserModel['id'][],
    fileID?: FileModel['id']
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

    if (fileID !== undefined && FileModel.id.Validate(fileID)) {
        return err([208]);
    }

    return ok(undefined);
};

const editChat = async (
    { client }: Omit<Connection, 'userID'>,
    id: ChatModel['id'],
    title?: ChatModel['title'] & string,
    userIDs?: string[],
    fileID?: FileModel['id']
): Promise<Result<{ id: ChatModel['id']; histories: HistoryRow[] }, Error>> => {
    const editChatResult = await Chat.update(
        {
            title,
            userIDs,
            fileID
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
                    ...(userIDs === undefined ? [] : [Operation.EDIT_USER_IDS]),
                    ...(fileID === undefined ? [] : [Operation.EDIT_FILE_ID])
                ],
                data: {
                    ...(title === undefined ? {} : { title }),
                    ...(userIDs === undefined ? {} : { userIDs }),
                    ...(fileID === undefined ? {} : { fileID })
                }
            }
        ]
    });
};

export default edit;