import Error from '../error';
import Operation from '../operation';
import { U } from '@mrnafisia/type-query';
import { Chat, ChatModel } from '../schema';
import { err, ok, Result } from 'never-catch';
import { UserModel } from '../../User/schema';
import Constant from '../../Message/constant';
import { FEATURES } from '../../../utils/features';
import { HistoryRow } from '../../../utils/historyRow';
import { Connection } from '../../../utils/connection';
import { FileModel } from '../../File/schema';
import { checkFileExistence } from '../util';

const add = async (
    connection: Connection,
    userIDs: UserModel['id'][],
    isGroup: ChatModel['isGroup'],
    title?: string,
    fileID?: FileModel['id']
): Promise<Result<{ id: ChatModel['id']; histories: HistoryRow[] }, Error>> => {
    // validation
    const checkValidationResult = checkValidation(
        connection.userID,
        userIDs,
        isGroup,
        title,
        fileID
    );
    if (!checkValidationResult.ok) {
        return checkValidationResult;
    }

    // is user adding an existing private chat ?
    if (!isGroup) {
        const checkChatExistenceResult = await checkChatExistence(
            connection,
            userIDs[0]
        );
        if (!checkChatExistenceResult.ok) {
            return checkChatExistenceResult;
        }
        if (checkChatExistenceResult.value !== undefined) {
            // private chat already exists
            return ok({
                id: checkChatExistenceResult.value,
                histories: []
            });
        }
    }

    if (fileID !== undefined){
        const checkFileExistenceResult = await checkFileExistence(
            connection,
            fileID
        );
        if (!checkFileExistenceResult.ok){
            return checkFileExistenceResult;
        }
    }

    // add chat
    return await addChat(
        connection,
        {
            title: title !== undefined ? title : null,
            userIDs: userIDs.map(e => e.toString()),
            ownerID: connection.userID,
            isGroup,
            lastMessageSentAt: new Date(),
            fileID: isGroup ?
                fileID === undefined ?
                    Constant.DEFAULT_FILE_ID : fileID
                : null
        }
    );
};

const checkValidation = (
    userID: ChatModel['ownerID'],
    userIDs: UserModel['id'][],
    isGroup: ChatModel['isGroup'],
    title?: string,
    fileID?: FileModel['id']
): Result<undefined, Error> => {
    if (title !== undefined && !ChatModel.title.Validate(title)) {
        return err([201]);
    }

    if (userIDs.length < 1) {
        return err([202]);
    }

    for (const userID of userIDs) {
        if (!UserModel.id.Validate(userID)) {
            return err([202]);
        }
    }

    if (!ChatModel.isGroup.Validate(isGroup)) {
        return err([203]);
    }

    if (!isGroup && userIDs.length !== 1) {
        return err([205]);
    }

    if(!isGroup && fileID !== undefined){
        return err([207]);
    }

    if (fileID !== undefined && FileModel.id.Validate(fileID)){
        return err([208])
    }

    if (userIDs.includes(userID)) {
        return err([206]);
    }

    return ok(undefined);
};

const checkChatExistence = async (
    connection: Connection,
    userID: UserModel['id']
): Promise<Result<ChatModel['id'] | undefined, Error>> => {
    const checkChatExistenceResult = await Chat.select(
        ['id'] as const,
        context =>
            U.andOp(
                U.orOp(
                    context.colsAnd({
                        ownerID: ['=', connection.userID],
                        userIDs: ['<@', [userID.toString()]]
                    }),
                    context.colsAnd({
                        ownerID: ['=', userID],
                        userIDs: ['<@', [connection.userID.toString()]]
                    })
                ),
                context.colBool('isGroup', '= false')
            )
    ).exec(connection.client, []);
    if (!checkChatExistenceResult.ok) {
        return err([401, checkChatExistenceResult.error]);
    }
    if (checkChatExistenceResult.value.length === 0) {
        return ok(undefined);
    }

    return ok(checkChatExistenceResult.value[0].id);
};

const addChat = async (
    { client }: Omit<Connection, 'userID'>,
    chat: ChatModel<[
        'title',
        'userIDs',
        'ownerID',
        'isGroup',
        'lastMessageSentAt',
        'fileID'
    ]>
): Promise<Result<{ id: ChatModel['id']; histories: HistoryRow[] }, Error>> => {
    const addChatResult = await Chat.insert(
        [chat],
        ['id'] as const,
        {
            nullableDefaultColumns: ['title', 'fileID']
        }
    ).exec(client, ['get', 'one']);
    if (!addChatResult.ok) {
        return err([401, addChatResult.error]);
    }
    return ok({
        id: addChatResult.value.id,
        histories: [
            {
                feature: FEATURES.Chat,
                table: Chat.table.title,
                row: BigInt(addChatResult.value.id),
                operations: [Operation.ADD],
                data: {
                    id: addChatResult.value.id,
                    title: chat.title,
                    userIDs: chat.userIDs,
                    ownerID: chat.ownerID,
                    isGroup: chat.isGroup,
                    lastMessageSentAt: chat.lastMessageSentAt
                }
            }
        ]
    });
};

export { checkValidation, checkChatExistence, addChat };

export default add;