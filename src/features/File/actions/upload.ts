import Error from '../error';
import Operation from '../operation';
import { File, FileModel } from '../schema';
import { err, ok, Result } from 'never-catch';
import { UploadedFile } from 'express-fileupload';
import { FEATURES } from '../../../utils/features';
import { Connection } from '../../../utils/connection';
import { HistoryRow } from '../../../utils/historyRow';
import { getPath } from '../util';
import { FileTypes } from '../constant';

const upload = async (
    connection: Connection,
    file: UploadedFile
): Promise<Result<{ id: FileModel['id']; histories: HistoryRow[] }, Error>> => {
    const checkValidationResult = checkValidation(
        file.mimetype
    );
    if (!checkValidationResult.ok){
        return checkValidationResult
    }
    const fileType = checkValidationResult.value;

    // add file
    const addFileResult = await addFile(
        connection,
        {
            fileType,
            size: BigInt(file.size),
            name: file.name,
            contentType: file.mimetype,
        }
    )
    if (!addFileResult.ok){
        return addFileResult;
    }

    const { id, histories } = addFileResult.value;
    // move file
    await file.mv(getPath(fileType) + id);

    return ok({
        id,
        histories
    })
};

const checkValidation = (
    mimeType: string
): Result<FileModel['fileType'], Error> => {
    let fileType: FileModel['fileType'];
    if (['image/jpeg', 'image/png'].includes(mimeType)){
        fileType = 'image';
    } else if (FileTypes.includes(mimeType)){
        fileType = 'document'
    } else {
        return err([201])
    }

    return ok(fileType);
}

const addFile = async (
    { client }: Omit<Connection, 'userID'>,
    file: FileModel<['size', 'name', 'fileType', 'contentType']>
): Promise<Result<{ id: FileModel['id']; histories: HistoryRow[] }, Error>> => {
    const addFileResult = await File.insert(
        [file],
        ['id'] as const
    ).exec(client, ['get', 'one']);
    if (!addFileResult.ok) {
        return err([401, addFileResult.error]);
    }

    return ok({
        id: addFileResult.value.id,
        histories: [
            {
                feature: FEATURES.File,
                table: File.table.title,
                row: BigInt(addFileResult.value.id),
                operations: [Operation.ADD],
                data: {
                    ...file
                }
            }
        ]
    });
};

export default upload;