import { Message, MessageModel } from '../schema';
import { Thread, ThreadModel } from '../../Thread/schema';
import { File, FileModel } from '../../File/schema';
import { err, ok, Result } from 'never-catch';
import { HistoryRow } from '../../../utils/historyRow';
import Error from '../error';
import { Connection } from '../../../utils/connection';
import { Chat, ChatModel } from '../../Chat/schema';
import { UserModel } from '../../User/schema';
import { U } from '@mrnafisia/type-query';
import { FEATURES } from '../../../utils/features';
import Operation from '../operation';

const add = async (
    connection: Connection,
    chatID: MessageModel['chatID'],
    content?: MessageModel['content'],
    threadID?: ThreadModel['id'],
    replyID?: MessageModel['id'],
    forwardID?: MessageModel['id'],
    fileID?: FileModel['id']
): Promise<Result<{ id: MessageModel['id']; histories: HistoryRow[] }, Error>> => {
    const histories: HistoryRow[] = [];
    // validation
    const checkValidationResult = checkValidation(
        chatID,
        content,
        threadID,
        replyID,
        forwardID,
        fileID
    );
    if (!checkValidationResult.ok) {
        return checkValidationResult;
    }

    // check chat existence
    const checkChatExistenceResult = await checkChatExistence(
        connection,
        chatID
    );
    if (!checkChatExistenceResult.ok) {
        return checkChatExistenceResult;
    }

    // check thread existence
    if (threadID !== undefined) {
        const checkThreadExistenceResult = await checkThreadExistence(
            connection,
            chatID,
            threadID
        );
        if (!checkThreadExistenceResult.ok) {
            return checkThreadExistenceResult;
        }
    }

    let reply: {
        messageID: MessageModel['id'],
        messageContent: MessageModel['content'],
        userID: MessageModel['userID']
    } | null = null;
    // check message existence
    if (replyID !== undefined) {
        const checkMessageExistenceResult = await checkMessageExistence(
            connection,
            replyID,
            chatID
        );
        if (!checkMessageExistenceResult.ok) {
            return checkMessageExistenceResult;
        }
        reply = checkMessageExistenceResult.value;
    }

    let fileName: MessageModel['fileName'] = null;
    let fileSize: MessageModel['fileSize'] = null;

    // check forwarding message existence
    let forward: {
        forwarded_from_message: MessageModel['id'],
        forwarded_from_chat: ChatModel['id'],
        is_forwarded_from_chat_group: ChatModel['isGroup'],
        forwarded_from_user: UserModel['id'],
        forwarded_from_thread: MessageModel['threadID'],
        forwarded_created_at: MessageModel['createdAt']
    } | null = null;
    if (forwardID !== undefined) {
        const checkForwardingMessageExistenceResult = await checkForwardingMessageExistence(
            connection,
            forwardID
        );
        if (!checkForwardingMessageExistenceResult.ok) {
            return checkForwardingMessageExistenceResult;
        }
        forward = {
            ...checkForwardingMessageExistenceResult.value.forward,
            forwarded_from_message: forwardID
        };
        content = checkForwardingMessageExistenceResult.value.content;
        fileID = checkForwardingMessageExistenceResult.value.fileID;
        fileName = checkForwardingMessageExistenceResult.value.fileName;
        fileSize = checkForwardingMessageExistenceResult.value.fileSize;
    }

    // file existence
    if (fileID !== undefined) {
        const checkFileExistenceResult = await checkFileExistence(
            connection,
            fileID
        );
        if (!checkFileExistenceResult.ok) {
            return checkFileExistenceResult;
        }
        fileName = checkFileExistenceResult.value.name;
        fileSize = checkFileExistenceResult.value.size;
    }

    const serverTime = new Date();

    // addMessage
    const addMessageResult = await addMessage(
        connection,
        {
            content: content as string,
            chatID,
            threadID: threadID === undefined ? null : threadID,
            reply,
            fileID: fileID === undefined ? null : fileID,
            userID: connection.userID,
            seenBy: [connection.userID.toString()],
            forward,
            createdAt: serverTime,
            isDeleted: false,
            isEdited: false,
            fileName,
            fileSize
        }
    );
    if (!addMessageResult.ok) {
        return addMessageResult;
    }
    histories.push(...addMessageResult.value.histories);

    // edit chat last message sent at
    const editChatLastMessageSentAtResult = await editChatLastMessageSentAt(
        connection,
        chatID,
        serverTime
    );
    if (!editChatLastMessageSentAtResult.ok) {
        return editChatLastMessageSentAtResult;
    }
    histories.push(...addMessageResult.value.histories);

    // edit thread last message sent at
    if (threadID !== undefined) {
        const editThreadLastMessageSentAtResult = await editThreadLastMessageSentAt(
            connection,
            threadID,
            serverTime
        );
        if (!editThreadLastMessageSentAtResult.ok) {
            return editThreadLastMessageSentAtResult;
        }
        histories.push(...editThreadLastMessageSentAtResult.value.histories);
    }

    return ok({
        id: addMessageResult.value.id,
        histories
    });
};

const checkValidation = (
    chatID: MessageModel['chatID'],
    content?: MessageModel['content'],
    threadID?: ThreadModel['id'],
    messageID?: MessageModel['id'],
    forwardID?: MessageModel['id'],
    fileID?: FileModel['id']
): Result<undefined, Error> => {
    if (!MessageModel.chatID.Validate(chatID)) {
        return err([202]);
    }
    if (content !== undefined && !MessageModel.content.Validate(content)) {
        return err([201]);
    }
    if (threadID !== undefined && !MessageModel.threadID.Validate(threadID)) {
        return err([203]);
    }
    if (messageID !== undefined && !MessageModel.id.Validate(messageID)) {
        return err([204]);
    }
    if (forwardID !== undefined && !MessageModel.id.Validate(forwardID)) {
        return err([205]);
    }
    if (fileID !== undefined && !MessageModel.fileID.Validate(fileID)) {
        return err([206]);
    }
    if ((forwardID !== undefined && content !== undefined) || (forwardID === undefined && content === undefined)) {
        return err([207]);
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

const checkThreadExistence = async (
    { client }: Omit<Connection, 'userID'>,
    chatID: ChatModel['id'],
    threadID: ThreadModel['id']
): Promise<Result<undefined, Error>> => {
    const checkThreadExistenceResult = await Thread.select(
        ['id'] as const,
        context => context.colsAnd({
            chatID: ['=', chatID],
            id: ['=', threadID]
        })
    ).exec(client, ['get', 'one']);
    if (!checkThreadExistenceResult.ok) {
        return err(
            checkThreadExistenceResult.error === false ? [302] : [401, checkThreadExistenceResult.error]
        );
    }

    return ok(undefined);
};

const checkMessageExistence = async (
    { client }: Omit<Connection, 'userID'>,
    messageID: MessageModel['id'],
    chatID: MessageModel['chatID']
): Promise<Result<{
    messageID: MessageModel['id'],
    messageContent: MessageModel['content'],
    userID: MessageModel['userID']
}, Error>> => {
    const checkMessageExistenceResult = await Message.select(
        ['id', 'content', 'userID'] as const,
        context =>
            context.colsAnd({
                id: ['=', messageID],
                chatID: ['=', chatID]
            })
    ).exec(client, ['get', 'one']);
    if (!checkMessageExistenceResult.ok) {
        return err(
            checkMessageExistenceResult.error === false ? [303] : [401, checkMessageExistenceResult.error]
        );
    }

    return ok({
        messageID: checkMessageExistenceResult.value.id,
        messageContent: checkMessageExistenceResult.value.content,
        userID: checkMessageExistenceResult.value.userID
    });
};

// forwarded_from_chat, is_forwarded_from_chat_group, forwarded_from_user,
// forwarded_from_thread
const checkForwardingMessageExistence = async (
    { client }: Omit<Connection, 'userID'>,
    id: MessageModel['id']
): Promise<Result<{
    forward: {
        forwarded_from_chat: ChatModel['id'],
        is_forwarded_from_chat_group: ChatModel['isGroup'],
        forwarded_from_user: UserModel['id'],
        forwarded_from_thread: MessageModel['threadID'],
        forwarded_created_at: MessageModel['createdAt']
    },
    content: MessageModel['content'],
    fileID?: FileModel['id'],
    fileName: MessageModel['fileName'],
    fileSize: MessageModel['fileSize']
}, Error>> => {
    const checkForwardingMessageExistenceResult = await Message.join(
        'message', 'full', Chat.table, 'chat',
        contexts =>
            contexts.message.colCmp('chatID', '=', contexts.chat.col('id'))
    ).select(
        ['chat_id', 'chat_isGroup', 'message_userID', 'message_threadID', 'message_content', 'message_createdAt', 'message_fileID', 'message_fileName', 'message_fileSize'] as const,
        contexts =>
            contexts.message.colCmp('id', '=', id)
    ).exec(client, ['get', 'one']);
    if (!checkForwardingMessageExistenceResult.ok) {
        return err(
            checkForwardingMessageExistenceResult.error === false ? [304] : [401, checkForwardingMessageExistenceResult.error]
        );
    }

    return ok({
        forward: {
            forwarded_from_chat: checkForwardingMessageExistenceResult.value.chat_id,
            forwarded_from_thread: checkForwardingMessageExistenceResult.value.message_threadID,
            is_forwarded_from_chat_group: checkForwardingMessageExistenceResult.value.chat_isGroup,
            forwarded_from_user: checkForwardingMessageExistenceResult.value.message_userID,
            forwarded_created_at: checkForwardingMessageExistenceResult.value.message_createdAt,
        },
        content: checkForwardingMessageExistenceResult.value.message_content,
        fileID: checkForwardingMessageExistenceResult.value.message_fileID === null ? undefined : checkForwardingMessageExistenceResult.value.message_fileID,
        fileName: checkForwardingMessageExistenceResult.value.message_fileName,
        fileSize: checkForwardingMessageExistenceResult.value.message_fileSize
    });
};

const checkFileExistence = async (
    { client }: Omit<Connection, 'userID'>,
    fileID: FileModel['id'],
): Promise<Result<FileModel<['name', 'size']>, Error>> => {
    const checkFileExistenceResult = await File.select(
        ['id', 'name', 'size'] as const,
        context => context.colCmp('id', '=', fileID)
    ).exec(client, ['get', 'one']);
    if (!checkFileExistenceResult.ok) {
        return err(
            checkFileExistenceResult.error === false ? [305] : [401, checkFileExistenceResult.error]
        );
    }

    return ok(checkFileExistenceResult.value);
};

const addMessage = async (
    { client }: Connection,
    message: MessageModel<['content', 'threadID', 'chatID', 'reply', 'createdAt',
        'userID', 'seenBy', 'forward', 'fileID', 'isEdited', 'isDeleted', 'fileName', 'fileSize']>
): Promise<Result<{ id: MessageModel['id']; histories: HistoryRow[] }, Error>> => {
    const addMessageResult = await Message.insert(
        [message],
        ['id'] as const,
        {
            nullableDefaultColumns: ['threadID', 'reply', 'forward', 'fileID', 'fileName', 'fileSize']
        }
    ).exec(client, ['get', 'one']);
    if (!addMessageResult.ok) {
        return err([401, addMessageResult.error]);
    }

    return ok({
        id: addMessageResult.value.id,
        histories: [
            {
                feature: FEATURES.Message,
                table: Message.table.title,
                row: BigInt(addMessageResult.value.id),
                operations: [Operation.ADD],
                data: {
                    ...message
                }
            }
        ]
    });
};

const editChatLastMessageSentAt = async (
    { client }: Omit<Connection, 'userID'>,
    chatID: ChatModel['id'],
    lastMessageSentAt: ChatModel['lastMessageSentAt']
): Promise<Result<{ id: ChatModel['id']; histories: HistoryRow[] }, Error>> => {
    const editChatLastMessageSentAtResult = await Chat.update(
        {
            lastMessageSentAt
        },
        context =>
            context.colCmp('id', '=', chatID),
        ['id'] as const
    ).exec(client, ['get', 'one']);
    if (!editChatLastMessageSentAtResult.ok) {
        return err([401, editChatLastMessageSentAtResult]);
    }

    return ok({
        id: editChatLastMessageSentAtResult.value.id,
        histories: [
            {
                feature: FEATURES.Message,
                table: Chat.table.title,
                row: BigInt(editChatLastMessageSentAtResult.value.id),
                operations: [Operation.EDIT_CHAT_LAST_MESSAGE_SENT_AT],
                data: {
                    chatID,
                    lastMessageSentAt
                }
            }
        ]
    });
};

const editThreadLastMessageSentAt = async (
    { client }: Omit<Connection, 'userID'>,
    threadID: ThreadModel['id'],
    lastMessageSentAt: ThreadModel['lastMessageSentAt']
): Promise<Result<{ id: ThreadModel['id']; histories: HistoryRow[] }, Error>> => {
    const editThreadLastMessageSentAtResult = await Thread.update({
            lastMessageSentAt
        },
        context => context.colCmp('id', '=', threadID),
        ['id'] as const
    ).exec(client, ['get', 'one']);
    if (!editThreadLastMessageSentAtResult.ok) {
        return err([401, editThreadLastMessageSentAtResult.error]);
    }

    return ok({
        id: editThreadLastMessageSentAtResult.value.id,
        histories: [
            {
                feature: FEATURES.Message,
                table: Thread.table.title,
                row: BigInt(editThreadLastMessageSentAtResult.value.id),
                operations: [Operation.EDIT_THREAD_LAST_MESSAGE_SENT_AT],
                data: {
                    threadID,
                    lastMessageSentAt
                }
            }
        ]
    });
};

export default add;