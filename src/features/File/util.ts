import { FileModel } from './schema';

const getPath = (
    fileType: FileModel['fileType']
): string => {
    return __dirname + '/../files/' + fileType + '/';
};

export { getPath };