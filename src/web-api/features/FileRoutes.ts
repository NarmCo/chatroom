import { Express } from 'express';
import client_verify_log_histories_message from '../middlewares/client_verify_log_histories_message';
import { err, ok } from 'never-catch';
import { FEATURES } from '../../utils/features';
import upload from '../../features/File/actions/upload';
import { FileModel } from '../../features/File/schema';
import download from '../../features/File/actions/download';
import * as fs from 'fs';
import { pool } from '../../db';
import { TokenModel } from '../../features/Token/schema';
import verify from '../../features/Token/actions/verify';
import addLog from '../../features/Log/actions/add';
import addHistories from '../../features/History/actions/add';
import logError from '../utils/logError';
import { HistoryRow } from '../../utils/historyRow';

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
        async (req, res) => {
            const response = await pool
                .transaction(async client => {
                    // verify
                    const secret = TokenModel.secret.Parse(req.headers.secret);
                    if (secret === undefined) {
                        return err({
                            feature: FEATURES.Token,
                            code: 101,
                            data: undefined
                        });
                    }
                    const verifyResult = await verify({ client }, secret);
                    if (!verifyResult.ok) {
                        const [code, data] = verifyResult.error;
                        return err({
                            feature: FEATURES.Token,
                            code,
                            data
                        });
                    }
                    const userID = verifyResult.value.userID;

                    const id = FileModel.id.Parse(req.query.id);
                    if (id === undefined) {
                        return err({
                            feature: FEATURES.File,
                            code: 102
                        });
                    }

                    // action
                    const actionResult = await download(
                        { client, userID },
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
                    const feature = FEATURES.File;
                    const code = 7898;
                    const data = {};
                    const histories: HistoryRow[] = [];
                    const response = { feature, code, data };

                    const now = new Date();

                    const addLogResult = await addLog(
                        { client },
                        {
                            api: 'file:download',
                            createdAt: now,
                            headers: JSON.stringify(req.headers),
                            body: JSON.stringify(req.body),
                            response: JSON.stringify(response)
                        }
                    );
                    if (!addLogResult.ok) {
                        const [code, data] = addLogResult.error;
                        return err({
                            feature: FEATURES.Log,
                            code,
                            data
                        });
                    }
                    // histories
                    if (histories.length !== 0) {
                        const addHistoriesResult = await addHistories(
                            { client },
                            userID,
                            { logID: addLogResult.value.id, createdAt: now },
                            histories
                        );
                        if (!addHistoriesResult.ok) {
                            const [code, data] = addHistoriesResult.error;
                            return err({
                                feature: FEATURES.History,
                                code,
                                data
                            });
                        }
                    }

                    return actionResult.ok ? ok({ ...actionResult.value, id }) : err(response);
                }, 'serializable')
                .catch(e => {
                    console.log(e);
                    return err({ feature: null, code: 0, data: e });
                });

            if (!response.ok) {
                await logError({
                    headers: req.headers,
                    body: req.body,
                    response
                });
                const { feature, code } = response.error;
                res.send({ feature, code });
                res.end();
            } else {
                const { fileType, contentType, name, id } = response.value;
                const file = __dirname + '/' + 'files' + '/' + fileType + '/' + id;
                res.setHeader('Content-disposition', 'attachment; filename=' + name);
                res.setHeader('Content-type', contentType);

                const filestream = fs.createReadStream(file);
                filestream.pipe(res);
            }
        }
    );
};

export default file;
