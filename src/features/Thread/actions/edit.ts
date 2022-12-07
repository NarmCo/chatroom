import Error from '../error';
import Operation from '../operation';
import { err, ok, Result } from 'never-catch';
import { Thread, ThreadModel } from '../schema';
import { FEATURES } from '../../../utils/features';
import { HistoryRow } from '../../../utils/historyRow';
import { Connection } from '../../../utils/connection';
import { checkThreadExistence } from '../util';

const edit = async (
    connection: Connection,
    id: ThreadModel['id'],
    title: ThreadModel['title']
): Promise<Result<{ id: ThreadModel['id']; histories: HistoryRow[] }, Error>> => {

    // validation
    const checkValidationResult = await checkValidation(
        id,
        title
    );
    if (!checkValidationResult.ok) {
        return checkValidationResult;
    }

    // check thread existence
    const checkThreadExistenceResult = await checkThreadExistence(
        connection,
        id
    );
    if (!checkThreadExistenceResult.ok) {
        return checkThreadExistenceResult;
    }

    return await editThread(
        connection,
        id,
        title
    );
};

const checkValidation = (
    id: ThreadModel['id'],
    title: ThreadModel['title']
): Result<undefined, Error> => {
    if (!ThreadModel.id.Validate(id)) {
        return err([203]);
    }

    if (!ThreadModel.title.Validate(title)) {
        return err([201]);
    }

    return ok(undefined);
};

const editThread = async (
    { client }: Omit<Connection, 'userID'>,
    id: ThreadModel['id'],
    title: ThreadModel['title']
): Promise<Result<{
    id: ThreadModel['id'],
    histories: HistoryRow[]
}, Error>> => {
    const editThreadResult = await Thread.update(
        {
            title
        },
        context => context.colCmp('id', '=', id),
        ['id'] as const
    ).exec(client, ['get', 'one']);
    if (!editThreadResult.ok) {
        return err([401, editThreadResult.error]);
    }

    return ok({
        id: editThreadResult.value.id,
        histories: [
            {
                feature: FEATURES.Thread,
                table: Thread.table.title,
                row: BigInt(editThreadResult.value.id),
                operations: [Operation.EDIT_TITLE],
                data: {
                    id,
                    title
                }
            }
        ]
    });
};

export default edit;