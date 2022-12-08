import Error from '../error';
import Operation from '../operation';
import * as bcryptjs from 'bcryptjs';
import { User, UserModel } from '../schema';
import { err, ok, Result } from 'never-catch';
import { FEATURES } from '../../../utils/features';
import { Connection } from '../../../utils/connection';
import { HistoryRow } from '../../../utils/historyRow';
import { hasPermission } from '../util';

const edit = async (
    connection: Connection,
    user: UserModel<['id'], ['username', 'password', 'name', 'phone', 'fileID']>
): Promise<Result<{ id: UserModel['id']; histories: HistoryRow[] }, Error>> => {
    const histories: HistoryRow[] = [];

    // validation
    const checkValidationResult = checkValidation(user);
    if (!checkValidationResult.ok) {
        return checkValidationResult;
    }

    if (connection.userID !== user.id){
        const hasPermissionResult = await hasPermission(
            connection
        );
        if (!hasPermissionResult.ok){
            return hasPermissionResult;
        }
    }

    // edit user
    const editUserResult = await editUser(connection, user);
    if (!editUserResult.ok) {
        return editUserResult;
    }
    histories.push(...editUserResult.value.histories);

    // TODO delete previous file

    return ok({ histories, id: user.id });
};

const checkValidation = (
    user: UserModel<['id'], ['username', 'password', 'name', 'phone', 'fileID']>
): Result<undefined, Error> => {
    const userValidation = UserModel.Validate(user);
    if (!userValidation.ok) {
        switch (userValidation.error) {
            case 'id':
                return err([201]);
            case 'username':
                return err([202]);
            case 'password':
                return err([203]);
            case 'name':
                return err([204]);
            case 'fileID':
                return err([205]);
            case 'phone':
                return err([206]);
        }
    }
    if (Object.keys(user).length === 1) {
        return err([207]);
    }

    return ok(undefined);
};

const editUser = async (
    { client }: Omit<Connection, 'userID'>,
    {
        id,
        username,
        password,
        name,
        phone,
        fileID
    }: UserModel<['id'], ['username', 'password', 'name', 'phone', 'fileID']>
): Promise<Result<{ histories: HistoryRow[] }, Error>> => {
    const editResult = await User.update(
        {
            username,
            password:
                password !== undefined
                    ? bcryptjs.hashSync(password, 8)
                    : undefined,
            name,
            phone,
            fileID
        },
        context => context.colCmp('id', '=', id),
        ['id'] as const,
        { ignoreInSets: true }
    ).exec(client, ['get', 'one']);
    if (!editResult.ok) {
        return err(
            editResult.error === false ? [306] : [401, editResult.error]
        );
    }

    return ok({
        histories: [
            {
                yearCompanyID: null,
                feature: FEATURES.User,
                table: User.table.title,
                row: BigInt(id),
                operations: [
                    ...(username !== undefined
                        ? [Operation.EDIT_USERNAME]
                        : []),
                    ...(password !== undefined
                        ? [Operation.EDIT_PASSWORD]
                        : []),
                    ...(name !== undefined ? [Operation.EDIT_NAME] : []),
                    ...(fileID !== undefined ? [Operation.EDIT_NAME] : []),
                    ...(phone !== undefined ? [Operation.EDIT_PHONE] : [])
                ],
                data: {
                    ...(username !== undefined ? { username } : {}),
                    ...(name !== undefined ? { name } : {}),
                    ...(phone !== undefined ? { phone } : {})
                }
            }
        ]
    });
};

export default edit;
export {checkValidation, editUser};
