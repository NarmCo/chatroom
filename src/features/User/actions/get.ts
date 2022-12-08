import Error from '../error';
import { User, UserModel } from '../schema';
import { err, ok, Result } from 'never-catch';
import { Context, U } from '@mrnafisia/type-query';
import { Connection } from '../../../utils/connection';
import { GetOptions } from '../../../utils/getOptions';
import { partialPhone } from '../validation';

const get = async (
    connection: Connection,
    getOptions: GetOptions<Omit<typeof User.table['columns'], 'password'>>,
    filters: {
        ids?: UserModel['id'][];
        usernames?: UserModel['username'][];
        names?: UserModel['name'][];
        phones?: UserModel['phone'][];
        isAdmin?: UserModel['isAdmin'];
    }
): Promise<
    Result<
        { result: UserModel<typeof getOptions.fields>[]; length: number },
        Error
    >
> => {
    // validation
    const checkValidationResult = checkValidation(filters);
    if (!checkValidationResult.ok) {
        return checkValidationResult;
    }

    // get users
    const getUsersResult = await getUsers(connection, getOptions, filters);
    if (!getUsersResult.ok) {
        return getUsersResult;
    }

    return getUsersResult;
};

const checkValidation = ({
    ids,
    usernames,
    names,
    phones
}: {
    ids?: UserModel['id'][];
    usernames?: UserModel['username'][];
    names?: UserModel['name'][];
    phones?: UserModel['phone'][];
}): Result<undefined, Error> => {
    if (ids !== undefined) {
        for (const id of ids) {
            if (!UserModel.id.Validate(id)) {
                return err([201]);
            }
        }
    }
    if (usernames !== undefined) {
        for (const username of usernames) {
            if (!UserModel.username.Validate(username)) {
                return err([202]);
            }
        }
    }
    if (names !== undefined) {
        for (const name of names) {
            if (!UserModel.name.Validate(name)) {
                return err([204]);
            }
        }
    }
    if (phones !== undefined) {
        for (const phone of phones) {
            if (!partialPhone(phone)) {
                return err([212]);
            }
        }
    }

    return ok(undefined);
};

const getUsers = async (
    { client }: Omit<Connection, 'userID'>,
    {
        start,
        step,
        orders,
        fields
    }: GetOptions<Omit<typeof User.table['columns'], 'password'>>,
    {
        ids,
        usernames,
        names,
        phones,
        isAdmin
    }: {
        ids?: UserModel['id'][];
        usernames?: UserModel['username'][];
        names?: UserModel['name'][];
        phones?: UserModel['phone'][];
        isAdmin?: UserModel['isAdmin'];
    }
): Promise<
    Result<{ result: UserModel<typeof fields>[]; length: number }, Error>
> => {
    const where = (context: Context<typeof User.table['columns']>) =>
      U.andAllOp([
        context.colList('id', 'in', ids),
        context.colLike('username', 'like all', usernames?.map(v => `%${v}%`)),
        context.colLike('name', 'like all', names?.map(v => `%${v}%`)),
        context.colLike('phone', 'like all', phones?.map(v => `%${v}%`)),
        isAdmin === undefined ? undefined : isAdmin ? context.colBool('isAdmin', '= true') : context.colBool('isAdmin', '= false')
      ]);

    const getResult = await User.select(fields, where, {
        ignoreInWhere: true,
        start,
        step,
        orders
    }).exec(client, []);
    if (!getResult.ok) {
        return err([401, getResult.error]);
    }

    const getLength = await User.select(
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

    return ok({ result: getResult.value, length: getLength.value.len });
};

export default get;
export { checkValidation, getUsers };
