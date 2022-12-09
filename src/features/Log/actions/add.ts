import Error from '../error';
import { Log, LogModel } from '../schema';
import { err, ok, Result } from 'never-catch';
import { Connection } from '../../../utils/connection';

const addLog = async (
    { client }: Omit<Connection, 'userID'>,
    log: LogModel<['api', 'headers', 'body', 'response'], ['id', 'createdAt']>
): Promise<Result<{ id: LogModel['id'] }, Error>> => {
    const addLogResult = await Log.insert(
        [log],
        ['id'] as const
    ).exec(client, ['get', 'one']);
    if (!addLogResult.ok){
        return err([401, addLogResult]);
    }

    return ok(addLogResult.value);
}



export default addLog;
