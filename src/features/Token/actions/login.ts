import Error from '../error';
import Operation from '../operation';
import { UserModel } from '../../User/schema';
import { err, ok, Result } from 'never-catch';
import { Token, TokenModel } from '../schema';
import { FEATURES } from '../../../utils/features';
import { Connection } from '../../../utils/connection';
import { HistoryRow } from '../../../utils/historyRow';
import {
    generateToken,
    checkCredentialAndGetUserID,
    removeExpiredTokensAndCountTheRest
} from '../util';
import Constants from '../constants';

const login = async (
    connection: Omit<Connection, 'userID'>,
    user: UserModel<['username', 'password']>
): Promise<
    Result<
        {
            token: TokenModel<
                ['id', 'userID', 'createdAt', 'expireAt', 'secret']
            >;
            histories: HistoryRow[];
        },
        Error
    >
> => {
    const histories: HistoryRow[] = [];

    // validation
    const checkValidationResult = checkValidation(user);
    if (!checkValidationResult.ok) {
        return checkValidationResult;
    }

    // credential
    const checkCredentialAndGetUserIDResult = await checkCredentialAndGetUserID(
        connection,
        user
    );
    if (!checkCredentialAndGetUserIDResult.ok) {
        return checkCredentialAndGetUserIDResult;
    }
    const userID = checkCredentialAndGetUserIDResult.value.id;

    // current tokens
    const removeExpiredTokensAndCountTheRestResult =
        await removeExpiredTokensAndCountTheRest({
            client: connection.client,
            userID
        });
    if (!removeExpiredTokensAndCountTheRestResult.ok) {
        return removeExpiredTokensAndCountTheRestResult;
    }
    histories.push(...removeExpiredTokensAndCountTheRestResult.value.histories);
    const remainTokenCount =
        removeExpiredTokensAndCountTheRestResult.value.number;
    if (remainTokenCount >= Constants.MaxSessionNumber) {
        return err([305]);
    }

    // add token
    const addTokenResult = await addToken({
        client: connection.client,
        userID
    });
    if (!addTokenResult.ok) {
        return addTokenResult;
    }
    histories.push(...addTokenResult.value.histories);

    return ok({ token: addTokenResult.value.token, histories });
};

const checkValidation = (
    user: UserModel<['username', 'password']>
): Result<undefined, Error> => {
    const userValidation = UserModel.Validate(user);
    if (!userValidation.ok) {
        switch (userValidation.error) {
            case 'username':
                return err([201]);
            case 'password':
                return err([202]);
        }
    }

    return ok(undefined);
};

const addToken = async ({
    client,
    userID
}: Connection): Promise<
    Result<
        {
            token: TokenModel<
                ['id', 'userID', 'secret', 'createdAt', 'expireAt']
            >;
            histories: HistoryRow[];
        },
        Error
    >
> => {
    const tokenResult = await generateToken({ client, userID });
    if (!tokenResult.ok) {
        return tokenResult;
    }

    const addTokenResult = await Token.insert(
        [tokenResult.value],
        ['id', 'userID', 'secret', 'createdAt', 'expireAt'] as const,
        { nullableDefaultColumns: ['createdAt'] as const }
    ).exec(client, ['get', 'one']);
    if (!addTokenResult.ok) {
        return err([401, addTokenResult.error]);
    }

    return ok({
        token: addTokenResult.value,
        histories: [
            {
                yearCompanyID: null,
                feature: FEATURES.Token,
                table: Token.table.title,
                row: BigInt(addTokenResult.value.id),
                operations: [Operation.ADD],
                data: tokenResult.value
            }
        ]
    });
};

export default login;
export { checkValidation, addToken };
