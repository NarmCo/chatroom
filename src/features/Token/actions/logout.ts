import Error from '../error';
import Operation from '../operation';
import { err, ok, Result } from 'never-catch';
import { Token, TokenModel } from '../schema';
import { FEATURES } from '../../../utils/features';
import { HistoryRow } from '../../../utils/historyRow';
import { Connection } from '../../../utils/connection';

const logout = async (
    { client }: Omit<Connection, 'userID'>,
    secret: TokenModel['secret']
): Promise<
    Result<{ id: TokenModel['id']; userID: TokenModel['userID']; histories: HistoryRow[] }, Error>
> => {
    // validation
    if (!TokenModel.secret.Validate(secret)) {
        return err([203]);
    }

    // remove
    const removeToken = await Token.delete(
        context => context.colCmp('secret', '=', secret),
        ['id', 'userID'] as const
    ).exec(client, ['get', 'one']);
    if (!removeToken.ok) {
        return err(
            removeToken.error === false ? [306] : [401, removeToken.error]
        );
    }

    return ok({
        id: removeToken.value.id,
        userID: removeToken.value.userID,
        histories: [
            {
                yearCompanyID: null,
                feature: FEATURES.Token,
                table: Token.table.title,
                row: BigInt(removeToken.value.id),
                operations: [Operation.REMOVE],
                data: {}
            }
        ]
    });
};

export default logout;
