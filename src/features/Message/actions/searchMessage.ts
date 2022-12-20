import { Connection } from '../../../utils/connection';
import { Chat, ChatModel } from '../../Chat/schema';
import { Thread, ThreadModel } from '../../Thread/schema';
import { err, ok, Result } from 'never-catch';
import { Message, MessageModel } from '../schema';
import Error from '../error';
import { U } from '@mrnafisia/type-query';

const searchMessage = async (
    connection: Connection,
    search: string,
    start: bigint,
    step: number,
    chatID?: ChatModel['id'],
    threadID?: ThreadModel['id']
): Promise<Result<{
    id: MessageModel['id'],
    chatID: MessageModel['chatID'],
    threadID: MessageModel['threadID'],
    content: MessageModel['content'],
    userID: MessageModel['userID'],
    createdAt: MessageModel['createdAt'],
    fileName: MessageModel['fileName'],
    seenBy: MessageModel['seenBy'],
    chatTitle: ChatModel['title'],
    chatIsGroup: ChatModel['isGroup']
}[], Error>> => {
    // MessageModel<['id', 'chatID', 'threadID', 'content', 'userID', 'createdAt', 'fileName', 'seenBy']>[]
    let chats: ChatModel<['id', 'title', 'isGroup', 'userIDs']>[] | undefined = undefined;
    if (!MessageModel.content.Validate(search) && !MessageModel.fileName.Validate(search)) {
        return err([]);
    }
    if (chatID !== undefined && threadID !== undefined){
        return err([]);
    }

    if (chatID !== undefined) {
        const checkChatExistenceResult = await checkChatExistence(
            connection,
            chatID
        );
        if (!checkChatExistenceResult.ok) {
            return checkChatExistenceResult;
        }
    } else if (threadID !== undefined) {
        const checkThreadExistenceResult = await checkThreadExistence(
            connection,
            threadID
        );
        if (!checkThreadExistenceResult.ok){
            return checkThreadExistenceResult;
        }
    }else{
        const checkUserChatsResult = await getUserChats(
            connection
        );
        if (!checkUserChatsResult.ok){
            return checkUserChatsResult;
        }
        chats = checkUserChatsResult.value;
    }

    const getMessagesResult = await getMessages(
        connection,
        start,
        step,
        chatID,
        threadID,
        chats?.map(e => e.id)
    );
    if (!getMessagesResult.ok){
        return getMessagesResult;
    }

    if (chats !== undefined){
        for (const message of getMessagesResult.value){
            let chatTitle: ChatModel['title'] = null;
            let chatIsGroup: ChatModel['isGroup'] | null = null;
            const messageChat = chats.find(e => e.id === message.chatID);
            if (!messageChat?.isGroup){

            }


        }
    }

};

const checkChatExistence = async (
    { client, userID }: Connection,
    chatID: ChatModel['id']
): Promise<Result<undefined, Error>> => {
    const checkChatExistenceResult = await Chat.select(
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
    if (!checkChatExistenceResult.ok) {
        return err(
            checkChatExistenceResult.error === false ? [307] : [401, checkChatExistenceResult.error]
        );
    }

    return ok(undefined);
};

const checkThreadExistence = async (
    { client, userID }: Connection,
    threadID: ThreadModel['id']
): Promise<Result<undefined, Error>> => {
    const checkThreadExistenceResult = await Thread.join(
        'thread',
        'full',
        Chat.table,
        'chat',
        contexts => contexts.thread.colCmp('chatID', '=', contexts.chat.col('id'))
    ).select(
        ['thread_id'],
        contexts =>
            U.andOp(
                contexts.thread.colCmp('id', '=', threadID),
                contexts.chat.colsOr({
                    ownerID: ['=', userID],
                    userIDs: ['?', userID.toString()]
                })
            )
    ).exec(client, ['get', 'one']);
    if (!checkThreadExistenceResult.ok) {
        return err(
            checkThreadExistenceResult.error === false ? [307] : [401, checkThreadExistenceResult.error]
        );
    }

    return ok(undefined);
};

const getUserChats = async (
    { client, userID }: Connection
): Promise<Result<ChatModel<['id', 'title', 'isGroup', 'userIDs']>[] & {userIDs: string[]}[], Error>> => {
    const getUserChatsResult = await Chat.select(
        ['id', 'title', 'isGroup', 'userIDs'] as const,
        context =>
            context.colsOr({
                ownerID: ['=', userID],
                userIDs: ['?', userID.toString()]
            })
    ).exec(client, []);
    if(!getUserChatsResult.ok){
        return err([401, getUserChatsResult.error]);
    }

    return ok(getUserChatsResult.value as typeof getUserChatsResult.value & {userIDs: string[]}[]);
}

const getMessages = async (
    { client }: Omit<Connection, 'userID'>,
    start: bigint,
    step: number,
    chatID?: ChatModel['id'],
    threadID?: ThreadModel['id'],
    chatIDs?: ChatModel['id'][]
): Promise<Result<MessageModel<['id', 'chatID', 'threadID', 'content', 'userID', 'createdAt', 'fileName', 'seenBy']>[], Error>> => {
    const getMessagesResult = await Message.select(
        ['id', 'chatID', 'threadID', 'content', 'userID', 'createdAt', 'fileName', 'seenBy'] as const,
        context =>
            U.andAllOp(
                [
                    chatID !== undefined ? context.colNull('threadID', '= null') : undefined,
                    U.orAllOp(
                        [
                            context.colCmp('chatID', '=', chatID),
                            context.colCmp('threadID', '=', threadID),
                            context.colList('chatID', 'in', chatIDs)
                        ]
                    ),
                    context.colBool('isDeleted', '= false')
                ]
            ),
        {
            orders: [
                {
                    by: 'id',
                    direction: 'desc'
                }
            ],
            start,
            step: step === -1 ? undefined : step,
            ignoreInWhere: true
        }
    ).exec(client, []);
    if(!getMessagesResult.ok){
        return err([401, getMessagesResult.error]);
    }

    return ok(getMessagesResult.value);
}