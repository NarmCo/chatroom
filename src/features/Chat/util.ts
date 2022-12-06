import { Connection } from '../../utils/connection';
import { Chat, ChatModel } from './schema';
import { err, ok, Result } from 'never-catch';
import Error from './error';

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

export { checkChatExistence };