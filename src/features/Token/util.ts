import Crypto from 'crypto';
import Constants from './constants';
import { err, ok, Result } from 'never-catch';
import * as bcryptjs from 'bcryptjs';
import { Connection } from '../../utils/connection';
import { Token, TOKEN_SECRET_LENGTH, TokenModel } from './schema';
import Error from './error';
import { HistoryRow } from '../../utils/historyRow';
import { FEATURES } from '../../utils/features';
import Operation from './operation';
import { User, UserModel } from '../User/schema';

const generateUniqueSecret = async ({
                                        client
                                    }: Omit<Connection, 'userID'>): Promise<Result<TokenModel<['secret']>, Error>> => {
    const secret = (await Crypto.randomBytes(TOKEN_SECRET_LENGTH / 2)).toString('hex');
    const checkTokenResult = await Token.select(['id'] as const, context =>
        context.colCmp('secret', '=', secret)
    ).exec(client, ['count', 0]);
    if (!checkTokenResult.ok) {
        return generateUniqueSecret({ client });
    }
    return ok({ secret });
};

const generateToken = async ({
                                 client,
                                 userID
                             }: Connection): Promise<Result<TokenModel<['userID', 'secret', 'createdAt', 'expireAt']>, Error>> => {
    const uniqueSecretResult = await generateUniqueSecret({ client });
    if (!uniqueSecretResult.ok) {
        return uniqueSecretResult;
    }
    const secret = uniqueSecretResult.value.secret;
    const createdAt = new Date();

    return ok({
        userID,
        secret,
        createdAt,
        expireAt: new Date(createdAt.getTime() + Constants.TokenLife)
    });
};

const removeExpiredTokensAndCountTheRest = async ({
                                                      client,
                                                      userID
                                                  }: Connection): Promise<Result<{ histories: HistoryRow[]; number: number }, Error>> => {
    const histories: HistoryRow[] = [];

    const currentTokensResult = await Token.select(
        ['id', 'expireAt'] as const,
        context => context.colCmp('userID', '=', userID)
    ).exec(client, []);
    if (!currentTokensResult.ok) {
        return err([401, currentTokensResult.error]);
    }
    let number = 0;
    const now = new Date();
    const deletingIDs: TokenModel['id'][] = [];
    currentTokensResult.value.forEach(currentToken => {
        if (currentToken.expireAt.getTime() < now.getTime()) {
            deletingIDs.push(currentToken.id);
        } else {
            number++;
        }
    });
    if (deletingIDs.length > 0) {
        const removeResult = await Token.delete(
            context => context.colList('id', 'in', deletingIDs),
            ['id'] as const
        ).exec(client, ['get', deletingIDs.length]);
        if (!removeResult.ok) {
            return err([401, removeResult.error]);
        }
        removeResult.value.forEach(removedToken =>
            histories.push({
                feature: FEATURES.Token,
                table: Token.table.title,
                row: BigInt(removedToken.id),
                operations: [Operation.REMOVE],
                data: {}
            })
        );
    }

    return ok({ histories, number });
};
const checkCredentialAndGetUserID = async (
    { client }: Omit<Connection, 'userID'>,
    { username, password }: UserModel<['username', 'password']>
): Promise<Result<UserModel<['id']>, Error>> => {
    const userResult = await User.select(['id', 'password'] as const, context =>
        context.colCmp('username', '=', username)
    ).exec(client, ['get', 'one']);
    if (!userResult.ok) {
        return err(
            userResult.error === false ? [301] : [401, userResult.error]
        );
    }
    if (!bcryptjs.compareSync(password, userResult.value.password)) {
        return err([302]);
    }
    return ok({ id: userResult.value.id });
};

export { generateToken, removeExpiredTokensAndCountTheRest, checkCredentialAndGetUserID };