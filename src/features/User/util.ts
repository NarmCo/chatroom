import Error from './error';
import { User } from './schema';
import { err, ok, Result } from 'never-catch';
import { Connection } from '../../utils/connection';

const hasPermission = async (
    { client, userID }: Connection
): Promise<Result<undefined, Error>> => {
    const getUserResult = await User.select(
        ['id'] as const,
        context => context.colsAnd(
            {
                id: ['=', userID],
                isAdmin: ['= true']
            }
        )
    ).exec(client, ['get', 'one']);
    if (!getUserResult.ok){
        return err(
            getUserResult.error === false ? [301] : [401, getUserResult.error]
        )
    }

    return ok(undefined);
};

export { hasPermission };
