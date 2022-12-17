import { Connection } from '../../../utils/connection';
import { File, FileModel } from '../schema';
import { err, ok, Result } from 'never-catch';
import Error from '../error';

const download = async (
    connection: Connection,
    id: FileModel['id']
): Promise<Result<FileModel<[
    'size',
    'name',
    'contentType']>, Error>> => {
    if (!FileModel.id.Validate(id)) {
        return err([202]);
    }

    // get file
    return await getFile(
        connection,
        id
    );
};

const getFile = async (
    { client }: Omit<Connection, 'userID'>,
    id: FileModel['id']
): Promise<Result<FileModel<[
    'size',
    'name',
    'contentType'
]>, Error>> => {
    const getFileResult = await File.select(
        ['size', 'name', 'contentType'] as const,
        context => context.colCmp('id', '=', id)
    ).exec(client, ['get', 'one']);
    if (!getFileResult.ok) {
        return err([401, getFileResult.error]);
    }

    return ok(getFileResult.value);
};

export default download;