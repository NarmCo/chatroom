import Error from '../error';
import { err, ok, Result } from 'never-catch';
import { Message, MessageModel } from '../schema';
import { Context, U } from '@mrnafisia/type-query';
import { User, UserModel } from '../../User/schema';
import { Chat, ChatModel } from '../../Chat/schema';
import { Connection } from '../../../utils/connection';
import { Thread, ThreadModel } from '../../Thread/schema';

const searchMessage = async (
    connection: Connection,
    search: string,
    start: bigint,
    step: number,
    chatID?: ChatModel['id'],
    threadID?: ThreadModel['id']
): Promise<Result<{
    results: {
        id: MessageModel['id'],
        chatID: MessageModel['chatID'],
        threadID: MessageModel['threadID'],
        content: MessageModel['content'],
        userID: MessageModel['userID'],
        createdAt: MessageModel['createdAt'],
        fileName: MessageModel['fileName'],
        chatTitle: ChatModel['title'],
        chatIsGroup: ChatModel['isGroup'],
        chatFileID: ChatModel['fileID']
    }[],
    length: number
}, Error>> => {
    let chats: ChatModel<['id', 'title', 'isGroup', 'ownerID', 'userIDs', 'fileID']>[] | undefined = undefined;
    let users: UserModel<['id', 'name', 'fileID']>[] | undefined = undefined;
    if (!MessageModel.content.Validate(search) && !MessageModel.fileName.Validate(search)) {
        return err([212]);
    }
    if (chatID !== undefined && threadID !== undefined) {
        return err([213]);
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
        if (!checkThreadExistenceResult.ok) {
            return checkThreadExistenceResult;
        }
    } else {
        const checkUserChatsResult = await getUserChats(
            connection
        );
        if (!checkUserChatsResult.ok) {
            return checkUserChatsResult;
        }
        chats = checkUserChatsResult.value.chats;
        const userIDs = checkUserChatsResult.value.userIDs;

        if (userIDs.length !== 0) {
            const getUsersResult = await getUsers(
                connection,
                userIDs
            );
            if (!getUsersResult.ok) {
                return getUsersResult;
            }
            users = getUsersResult.value;
        }
    }

    const getMessagesResult = await getMessages(
        connection,
        search,
        start,
        step,
        chatID,
        threadID,
        chats?.map(e => e.id)
    );
    if (!getMessagesResult.ok) {
        return getMessagesResult;
    }
    const { messages, length } = getMessagesResult.value;

    if (chats !== undefined) {
        const threadIDs = messages.filter(e => e.threadID !== null).map(e => e.threadID);
        const threads: ThreadModel<['id', 'title']>[] = [];
        if (threadIDs.length !== 0){
            const getThreadsResult = await getThreads(
                connection,
                threadIDs as bigint[]
            );
            if (!getThreadsResult.ok){
                return getThreadsResult;
            }
            threads.push(...getThreadsResult.value);
        }

        for (let i = 0; i < messages.length; i++) {
            const messageChat = chats.find(e => e.id === messages[i].chatID);
            if (messageChat === undefined) {
                return err([401, 'messageChat is unexpectedly null']);
            }
            if (messageChat.isGroup) {
                messages[i].chatTitle = messageChat.title;
                messages[i].chatIsGroup = messageChat.isGroup;
                messages[i].chatFileID = messageChat.fileID;
            } else {
                const otherUser = users?.find(e => e.id === Number((messageChat.userIDs as string[])[0]));
                if (otherUser === undefined) {
                    return err([401, 'other user is unexpectedly null']);
                }
                messages[i].chatTitle = otherUser.name;
                messages[i].chatIsGroup = messageChat.isGroup;
                messages[i].chatFileID = otherUser.fileID;
            }
            if (messages[i].threadID !== null){
                const thread = threads.find(e => e.id === messages[i].threadID);
                messages[i].chatTitle += ` # ${thread?.title}`;
            }
        }
    }

    return ok({
        results: messages,
        length
    });
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
): Promise<Result<{ chats: ChatModel<['id', 'title', 'isGroup', 'userIDs', 'ownerID', 'fileID']>[], userIDs: UserModel['id'][] }, Error>> => {
    const userIDs: UserModel['id'][] = [];
    const getUserChatsResult = await Chat.select(
        ['id', 'title', 'isGroup', 'userIDs', 'ownerID', 'fileID'] as const,
        context =>
            context.colsOr({
                ownerID: ['=', userID],
                userIDs: ['?', userID.toString()]
            })
    ).exec(client, []);
    if (!getUserChatsResult.ok) {
        return err([401, getUserChatsResult.error]);
    }
    const chats = getUserChatsResult.value;
    const privateChats = chats.filter(e => e.isGroup === false);
    for (let i = 0; i < privateChats.length; ++i) {
        if (privateChats[i].ownerID === userID) {
            userIDs.push(Number((privateChats[i].userIDs as string[])[0]));
        } else {
            userIDs.push(privateChats[i].ownerID);
            privateChats[i].userIDs = [privateChats[i].ownerID];
            privateChats[i].ownerID = userID;
        }
    }

    return ok(
        {
            chats: getUserChatsResult.value,
            userIDs
        }
    );
};

const getMessages = async (
    { client }: Omit<Connection, 'userID'>,
    search: string,
    start: bigint,
    step: number,
    chatID?: ChatModel['id'],
    threadID?: ThreadModel['id'],
    chatIDs?: ChatModel['id'][]
): Promise<Result<{
    messages: {
        id: MessageModel['id'],
        chatID: MessageModel['chatID'],
        threadID: MessageModel['threadID'],
        content: MessageModel['content'],
        userID: MessageModel['userID'],
        createdAt: MessageModel['createdAt'],
        fileName: MessageModel['fileName'],
        chatTitle: ChatModel['title'],
        chatIsGroup: ChatModel['isGroup'],
        chatFileID: ChatModel['fileID']
    }[],
    length: number
}, Error>> => {
    const results: {
        id: MessageModel['id'],
        chatID: MessageModel['chatID'],
        threadID: MessageModel['threadID'],
        content: MessageModel['content'],
        userID: MessageModel['userID'],
        createdAt: MessageModel['createdAt'],
        fileName: MessageModel['fileName'],
        chatTitle: ChatModel['title'],
        chatIsGroup: ChatModel['isGroup'],
        chatFileID: ChatModel['fileID']
    }[] = [];
    const where = (context: Context<typeof Message.table['columns']>) =>
        U.andAllOp(
            [
                U.orOp(
                    context.colLike('content', 'like', `%${search}%`),
                    context.colLike('fileName', 'like', `%${search}%`)
                ),
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
        );
    const getMessagesResult = await Message.select(
        ['id', 'chatID', 'threadID', 'content', 'userID', 'createdAt', 'fileName'] as const,
        where,
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
    if (!getMessagesResult.ok) {
        return err([401, getMessagesResult.error]);
    }

    const getLength = await Message.select(
        context =>
            [
                {
                    exp: U.fun<number>(
                        'Count',
                        [context.col('id')],
                        '::INTEGER'
                    ),
                    as: 'len'
                }
            ] as const,
        where,
        { ignoreInWhere: true }
    ).exec(client, ['get', 'one']);
    if (!getLength.ok) {
        return err([401, getLength.error]);
    }

    for (const message of getMessagesResult.value) {
        results.push({
            ...message,
            chatFileID: null,
            chatIsGroup: false,
            chatTitle: null
        });
    }

    return ok({
        messages: results,
        length: getLength.value.len
    });
};

const getUsers = async (
    { client }: Omit<Connection, 'userID'>,
    userIDs: UserModel['id'][]
): Promise<Result<UserModel<['id', 'name', 'fileID']>[], Error>> => {
    const getUsersResult = await User.select(
        ['id', 'name', 'fileID'] as const,
        context => context.colList('id', 'in', userIDs)
    ).exec(client, ['get', userIDs.length]);
    if (!getUsersResult.ok) {
        return err([401, getUsersResult.error]);
    }

    return ok(getUsersResult.value);
};

const getThreads = async (
    { client }: Omit<Connection, 'userID'>,
    threadIDs: ThreadModel['id'][]
): Promise<Result<ThreadModel<['id', 'title']>[], Error>> => {
    const getThreadsResult = await Thread.select(
        ['id', 'title'] as const,
        context =>
            context.colList('id', 'in', threadIDs)
    ).exec(client, ['get', threadIDs.length]);
    if (!getThreadsResult.ok){
        return err(
            getThreadsResult.error === false ? [302] : [401, getThreadsResult.error]
        )
    }

    return ok(getThreadsResult.value);
}

export default searchMessage;