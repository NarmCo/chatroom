import {Connection} from '../../../utils/connection';
import {UserModel} from '../../User/schema';
import {Chat, ChatModel} from '../schema';
import {err, ok, Result} from 'never-catch';
import {HistoryRow} from '../../../utils/historyRow';
import Error from '../error';
import {U} from '@mrnafisia/type-query';
import {FEATURES} from '../../../utils/features';
import Operation from '../operation';

const add = async (
    connection: Connection,
    title: ChatModel['title'],
    userIDs: UserModel['id'][],
    isGroup: ChatModel['isGroup']
): Promise<Result<{ id: ChatModel['id']; histories: HistoryRow[] }, Error>> => {
    // validation
    const checkValidationResult = checkValidation(
        connection.userID,
        title,
        userIDs,
        isGroup
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

    // add chat
    return await addChat(
        connection,
        {
            title,
            userIDs: userIDs.map(e => e.toString()),
            ownerID: connection.userID,
            isGroup,
            lastMessageSentAt: new Date()
        }
    );
};

const checkValidation = (
    userID: ChatModel['ownerID'],
    title: ChatModel['title'],
    userIDs: UserModel['id'][],
    isGroup: ChatModel['isGroup']
): Result<undefined, Error> => {
    if (!ChatModel.title.Validate(title)) {
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
            U.orOp(
                context.colsAnd({
                    ownerID: ['=', connection.userID],
                    userIDs: ['<@', [userID.toString()]]
                }),
                context.colsAnd({
                    ownerID: ['=', userID],
                    userIDs: ['<@', [connection.userID.toString()]]
                })
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
    {client}: Omit<Connection, 'userID'>,
    chat: ChatModel<[
        'title',
        'userIDs',
        'ownerID',
        'isGroup',
        'lastMessageSentAt'
    ]>
): Promise<Result<{ id: ChatModel['id']; histories: HistoryRow[] }, Error>> => {
    const addChatResult = await Chat.insert(
        [chat],
        ['id'] as const
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
                    isGroup: chat.isGroup
                }
            }
        ]
    });
};

export default add;