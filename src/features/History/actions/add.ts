import Error from '../error';
import { err, ok, Result } from 'never-catch';
import { History, HistoryModel } from '../schema';
import { Connection } from '../../../utils/connection';
import { UserModel } from '../../User/schema';

const addHistories = async (
    { client }: Omit<Connection, 'userID'>,
    userID: UserModel['id'] | undefined,
    constInfo: HistoryModel<['logID'], ['createdAt']>,
    histories: HistoryModel<['yearCompanyID', 'feature', 'table', 'row', 'operations', 'data']>[]
): Promise<Result<{ ids: HistoryModel['id'][] }, Error>> =>
    History.insert(
        histories.map(history => ({ ...history, ...constInfo, userID })),
        ['id'] as const,
        { nullableDefaultColumns: ['yearCompanyID'] as const }
    )
        .exec(client, ['get', histories.length])
        .then(result =>
            result.ok
                ? ok({ ids: result.value.map(({ id }) => id) })
                : err([401, result.error])
        );

export default addHistories;
