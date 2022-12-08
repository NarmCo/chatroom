import Error from '../error';
import * as bcryptjs from 'bcryptjs';
import Operation from '../operation';
import { User, UserModel } from "../schema";
import { err, ok, Result } from 'never-catch';
import { FEATURES } from '../../../utils/features';
import { Connection } from '../../../utils/connection';
import { HistoryRow } from '../../../utils/historyRow';
import Constant from '../../Message/constant';
import { hasPermission } from '../util';

const add = async (
    connection: Connection,
    user: UserModel<['username', 'password', 'name', 'phone'], ['fileID']>
): Promise<Result<{ id: UserModel['id']; histories: HistoryRow[] }, Error>> => {
    const histories: HistoryRow[] = [];

    // validation
    const checkValidationResult = checkValidation(user);
    if (!checkValidationResult.ok) {
        return checkValidationResult;
    }

    // permission
    const hasPermissionResult = await hasPermission(connection);
    if (!hasPermissionResult.ok){
        return hasPermissionResult;
    }

    // add user
    const addUserResult = await addUser(connection, {
        ...user,
        fileID: user.fileID === undefined ? Constant.DEFAULT_FILE_ID : user.fileID
    });
    if (!addUserResult.ok) {
        return addUserResult;
    }
    histories.push(...addUserResult.value.histories);

    return ok({ histories, id: addUserResult.value.id });
};

const checkValidation = (
    user: UserModel<['username', 'password', 'name', 'phone'], ['fileID']>
): Result<undefined, Error> => {
    const userValidation = UserModel.Validate(user);
    if (!userValidation.ok) {
        switch (userValidation.error) {
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

    return ok(undefined);
};

const addUser = async (
    { client }: Omit<Connection, 'userID'>,
    user: UserModel<['username', 'password', 'name', 'phone', 'fileID']>
): Promise<Result<{ id: UserModel['id']; histories: HistoryRow[] }, Error>> => {
    const _user = {
        username: user.username,
        name: user.name,
        fileID: user.fileID,
        phone: user.phone,
        isAdmin: false
    };
    const addResult = await User.insert(
        [
            {
                ..._user,
                password: bcryptjs.hashSync(user.password, 8),
            }
        ],
        ['id'] as const
    ).exec(client, ['get', 'one']);
    if (!addResult.ok) {
        return err([401, addResult.error]);
    }

    return ok({
        id: addResult.value.id,
        histories: [
            {
                yearCompanyID: null,
                feature: FEATURES.User,
                table: User.table.title,
                row: BigInt(addResult.value.id),
                operations: [Operation.ADD],
                data: _user
            }
        ]
    });
};

export default add;
export { checkValidation, addUser };
