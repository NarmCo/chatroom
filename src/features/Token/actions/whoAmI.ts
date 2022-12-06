import Error from '../error';
import { err, ok, Result } from 'never-catch';
import { Token, TokenModel } from '../schema';
import { User, UserModel } from '../../User/schema';
import { Connection } from '../../../utils/connection';

const whoAmI = async (
    { client }: Omit<Connection, 'userID'>,
    secret: TokenModel['secret']
): Promise<
    Result<
        {
            user: UserModel<
                ['id', 'username', 'name', 'phone', 'isAdmin']
            >;
            token: TokenModel<
                ['id', 'userID', 'secret', 'createdAt', 'expireAt']
            >;
        },
        Error
    >
> => {
    // validation
    if (!TokenModel.secret.Validate(secret)) {
        return err([203]);
    }

    // get info
    const infoResult = await Token.join(
        't',
        'inner',
        User.table,
        'u',
        ({ t, u }) => t.colCmp('userID', '=', u.col('id'))
    )
        .select(
            [
                'u_id',
                'u_username',
                'u_name',
                'u_phone',
                'u_isAdmin',
                't_id',
                't_userID',
                't_secret',
                't_createdAt',
                't_expireAt'
            ] as const,
            ({ t }) => t.colCmp('secret', '=', secret)
        )
        .exec(client, ['get', 'one']);
    if (!infoResult.ok) {
        return err(
            infoResult.error === false ? [306] : [401, infoResult.error]
        );
    }

    // check secret
    const now = new Date();
    if (infoResult.value.t_expireAt.getTime() < now.getTime()) {
        return err([308]);
    }

    return ok({
        user: {
            id: infoResult.value.u_id,
            username: infoResult.value.u_username,
            name: infoResult.value.u_name,
            phone: infoResult.value.u_phone,
            isAdmin: infoResult.value.u_isAdmin
        },
        token: {
            id: infoResult.value.t_id,
            userID: infoResult.value.t_userID,
            secret: infoResult.value.t_secret,
            createdAt: infoResult.value.t_createdAt,
            expireAt: infoResult.value.t_expireAt
        }
    });
};

export default whoAmI;
