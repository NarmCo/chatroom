import Error from '../error';
import Operation from '../operation';
import { hasPermission } from '../util';
import { User, UserModel } from '../schema';
import { err, ok, Result } from 'never-catch';
import { FEATURES } from '../../../utils/features';
import { Connection } from '../../../utils/connection';
import { HistoryRow } from '../../../utils/historyRow';

const remove = async (
    connection: Connection,
    id: UserModel['id']
): Promise<Result<{ id: UserModel['id']; histories: HistoryRow[] }, Error>> => {
    const histories: HistoryRow[] = [];

    // validation
    const checkValidationResult = checkValidation(id);
    if (!checkValidationResult.ok) {
        return checkValidationResult;
    }

    // permission
    const hasPermissionResult = await hasPermission(connection);
    if (!hasPermissionResult.ok) {
        return hasPermissionResult;
    }

    // remove user
    const removeUserResult = await removeUser(connection, id);
    if (!removeUserResult.ok) {
        return removeUserResult;
    }
    histories.push(...removeUserResult.value.histories);

    return ok({ histories, id });
};

const checkValidation = (id: UserModel['id']): Result<undefined, Error> => {
    if (!UserModel.id.Validate(id)) {
        return err([201]);
    }
    return ok(undefined);
};

const removeUser = async (
    { client }: Omit<Connection, 'userID'>,
    id: UserModel['id']
): Promise<Result<{ histories: HistoryRow[] }, Error>> => {
    const removeResult = await User.delete(
        context => context.colCmp('id', '=', id),
        ['id'] as const
    ).exec(client, ['get', 'one']);
    if (!removeResult.ok) {
        return err(
            removeResult.error === false ? [306] : [401, removeResult.error]
        );
    }

    return ok({
        histories: [
            {
                yearCompanyID: null,
                feature: FEATURES.User,
                table: User.table.title,
                row: BigInt(id),
                operations: [Operation.REMOVE],
                data: {}
            }
        ]
    });
};

export default remove;
export {checkValidation, removeUser};
