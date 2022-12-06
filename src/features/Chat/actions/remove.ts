import Error from '../error';
import Operation from '../operation';
import { Chat, ChatModel } from '../schema';
import { checkChatExistence } from '../util';
import { err, ok, Result } from 'never-catch';
import { FEATURES } from '../../../utils/features';
import { Connection } from '../../../utils/connection';
import { HistoryRow } from '../../../utils/historyRow';

const remove = async (
    connection: Connection,
    id: ChatModel['id']
): Promise<Result<{ id: ChatModel['id']; histories: HistoryRow[] }, Error>> => {
    // validation
    if (!ChatModel.id.Validate(id)) {
        return err([204]);
    }

    // check chat existence
    const checkChatExistenceResult = await checkChatExistence(
        connection,
        id
    );
    if (!checkChatExistenceResult.ok) {
        return checkChatExistenceResult;
    }

    // remove chat
    return await removeChat(
        connection,
        id
    );
};

const removeChat = async (
    { client }: Omit<Connection, 'userID'>,
    id: ChatModel['id']
): Promise<Result<{ id: ChatModel['id']; histories: HistoryRow[] }, Error>> => {
    const removeChatResult = await Chat.delete(
        context => context.colCmp('id', '=', id),
        ['id'] as const
    ).exec(client, ['get', 'one']);
    if (!removeChatResult.ok) {
        return err([401, removeChatResult.error]);
    }

    return ok({
        id: removeChatResult.value.id,
        histories: [
            {
                feature: FEATURES.Chat,
                table: Chat.table.title,
                row: BigInt(removeChatResult.value.id),
                operations: [Operation.REMOVE],
                data: {
                    id: removeChatResult.value.id
                }
            }
        ]
    });
};

export default remove;