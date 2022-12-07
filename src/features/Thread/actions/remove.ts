import { Connection } from '../../../utils/connection';
import { Thread, ThreadModel } from '../schema';
import { err, ok, Result } from 'never-catch';
import { HistoryRow } from '../../../utils/historyRow';
import Error from '../error';
import { checkThreadExistence } from '../util';
import { FEATURES } from '../../../utils/features';
import Operation from '../operation';

const remove = async (
    connection: Connection,
    id: ThreadModel['id']
): Promise<Result<{ id: ThreadModel['id']; histories: HistoryRow[] }, Error>> => {
    // validation
    if (!ThreadModel.id.Validate(id)) {
        return err([203]);
    }

    // check thread existence
    const checkThreadExistenceResult = await checkThreadExistence(
        connection,
        id
    );
    if (!checkThreadExistenceResult.ok) {
        return checkThreadExistenceResult;
    }

    // remove thread
    return await removeThread(connection, id);

};

const removeThread = async (
    { client }: Omit<Connection, 'userID'>,
    id: ThreadModel['id']
): Promise<Result<{ id: ThreadModel['id']; histories: HistoryRow[] }, Error>> => {
    const removeThreadResult = await Thread.delete(
        context => context.colCmp('id', '=', id),
        ['id'] as const
    ).exec(client, ['get', 'one']);
    if (!removeThreadResult.ok) {
        return err([401, removeThreadResult.error]);
    }

    return ok({
        id: removeThreadResult.value.id,
        histories: [
            {
                feature: FEATURES.Thread,
                table: Thread.table.title,
                row: BigInt(removeThreadResult.value.id),
                operations: [Operation.REMOVE],
                data: {
                    id
                }
            }
        ]
    });
};

export default remove;