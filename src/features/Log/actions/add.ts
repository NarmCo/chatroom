import Error from '../error';
import { Log, LogModel } from '../schema';
import { err, Result } from 'never-catch';
import { Connection } from '../../../utils/connection';

const addLog = (
    { client }: Omit<Connection, 'userID'>,
    log: LogModel<['api', 'headers', 'body', 'response'], ['id', 'createdAt']>
): Promise<Result<{ id: LogModel['id'] }, Error>> =>
    Log.insert([log], ['id'] as const)
        .exec(client, ['get', 'one'])
        .then(result => (result.ok ? result : err([401, result.error])));

export default addLog;
