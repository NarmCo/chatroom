import { Connection } from '../../utils/connection';
import { Thread, ThreadModel } from './schema';
import { err, ok, Result } from 'never-catch';
import Error from './error';
import { U } from '@mrnafisia/type-query';

const checkThreadExistence = async (
    { client, userID }: Connection,
    id: ThreadModel['id']
): Promise<Result<undefined, Error>> => {
    const checkThreadExistenceResult = await Thread.select(
        ['id'] as const,
        context =>
            U.andOp(
                context.colCmp('id', '=', id),
                context.colsOr({
                    threadOwnerID: ['=', userID],
                    chatOwnerID: ['=', userID]
                })
            )
    ).exec(client, ['get', 'one']);
    if (!checkThreadExistenceResult.ok) {
        return err(
            checkThreadExistenceResult.error === false ? [302] : [401, checkThreadExistenceResult.error]
        );
    }

    return ok(undefined);
};

export { checkThreadExistence }