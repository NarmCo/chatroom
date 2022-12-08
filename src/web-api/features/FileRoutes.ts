import { Express } from 'express';
import client_verify_log_histories_message from '../middlewares/client_verify_log_histories_message';
import { err, ok } from 'never-catch';
import { FEATURES } from '../../utils/features';
import upload from '../../features/File/actions/upload';
import { FileModel } from '../../features/File/schema';
import download from '../../features/File/actions/download';
import * as fs from 'fs';

const FileRoute = '/file';

const file = (app: Express) => {
    app.post(
        FileRoute,
        client_verify_log_histories_message(
            FileRoute + ':upload',
            async (req, _res, connection) => {
                if (req.files === undefined || req.files === null) {
                    return err({
                        feature: FEATURES.File,
                        code: 101
                    });
                }
                const file = req.files.file;
                if (Array.isArray(file)) {
                    return err({
                        feature: FEATURES.File,
                        code: 101
                    });
                }

                // action
                const actionResult = await upload(
                    connection,
                    file
                );
                if (!actionResult.ok) {
                    const [code, data] = actionResult.error;
                    return err({
                        feature: FEATURES.File,
                        code,
                        data
                    });
                }

                return ok({
                    feature: FEATURES.File,
                    code: 7898,
                    histories: actionResult.value.histories,
                    data: {
                        id: actionResult.value.id
                    }
                });
            }
        )
    );
    app.get(
        FileRoute,
        client_verify_log_histories_message(
            FileRoute + ':download',
            async (req, _res, connection) => {
                const id = FileModel.id.Parse(req.query.id);
                if (id === undefined) {
                    return err({
                        feature: FEATURES.File,
                        code: 102
                    });
                }

                // action
                const actionResult = await download(
                    connection,
                    id
                );
                if (!actionResult.ok) {
                    const [code, data] = actionResult.error;
                    return err({
                        feature: FEATURES.File,
                        code,
                        data
                    });
                }
                const { fileType, contentType, name } = actionResult.value;
                const file = __dirname + '/' + fileType + '/' + id;
                _res.setHeader('Content-disposition', 'attachment; filename=' + name);
                _res.setHeader('Content-type', contentType);

                const filestream = fs.createReadStream(file);
                filestream.pipe(_res);

                return ok({
                    feature: FEATURES.File,
                    code: 7898,
                    histories: [],
                    data: {}
                });
            }
        )
    );
};

export default file;
