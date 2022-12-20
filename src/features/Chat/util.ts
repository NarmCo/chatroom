import { Connection } from '../../utils/connection';
import { Chat, ChatModel } from './schema';
import { err, ok, Result } from 'never-catch';
import Error from './error';
import { File, FileModel } from '../File/schema';

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
                isGroup: ['= true']
            })
    ).exec(client, ['get', 'one']);
    if (!checkChatExistenceResult.ok) {
        return err(
            checkChatExistenceResult.error === false ? [301] : [401, checkChatExistenceResult.error]
        );
    }

    return ok(checkChatExistenceResult.value.userIDs as string[]);
};

const checkFileExistence = async (
    { client }: Omit<Connection, 'userID'>,
    id: FileModel['id']
): Promise<Result<undefined, Error>> => {
    const checkFileExistenceResult = await File.select(
        ['id'] as const,
        context => context.colCmp('id', '=', id)
    ).exec(client, ['get', 'one']);
    if (!checkFileExistenceResult.ok){
        return err(
            checkFileExistenceResult.error === false ? [305] : [401, checkFileExistenceResult.error]
        )
    }

    return ok(undefined)
}

export { checkChatExistence, checkFileExistence };