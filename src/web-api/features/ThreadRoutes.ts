import { Express } from 'express';
import { err, ok } from 'never-catch';
import { FEATURES } from '../../utils/features';
import add from '../../features/Thread/actions/add';
import edit from '../../features/Thread/actions/edit';
import {  ThreadModel } from '../../features/Thread/schema';
import client_verify_log_histories_message from '../middlewares/client_verify_log_histories_message';
import remove from '../../features/Thread/actions/remove';
import get from '../../features/Thread/actions/get';

const ThreadRoute = '/thread';

const thread = (app: Express) => {
    app.post(
        ThreadRoute,
        client_verify_log_histories_message(
            ThreadRoute + ':add',
            async (req, _res, connection) => {
                const chatID = ThreadModel.chatID.Parse(req.body.chatID);
                if (chatID === undefined) {
                    return err({
                        feature: FEATURES.Thread,
                        code: 101
                    });
                }

                const title = ThreadModel.title.Parse(req.body.title);
                if (title === undefined) {
                    return err({
                        feature: FEATURES.Thread,
                        code: 102
                    });
                }

                // action
                const actionResult = await add(
                    connection,
                    {
                        chatID,
                        title
                    }
                );
                if (!actionResult.ok) {
                    const [code, data] = actionResult.error;
                    return err({
                        feature: FEATURES.Thread,
                        code,
                        data
                    });
                }

                return ok({
                    feature: FEATURES.Thread,
                    code: 7898,
                    histories: actionResult.value.histories,
                    data: {
                        id: actionResult.value.id
                    }
                });
            }
        )
    );
    app.patch(
        ThreadRoute,
        client_verify_log_histories_message(
            ThreadRoute + ':edit',
            async (req, _res, connection) => {
                const id = ThreadModel.id.Parse(req.body.id);
                if (id === undefined) {
                    return err({
                        feature: FEATURES.Thread,
                        code: 103
                    });
                }

                const title = ThreadModel.title.Parse(req.body.title);
                if (title === undefined) {
                    return err({
                        feature: FEATURES.Thread,
                        code: 102
                    });
                }

                // action
                const actionResult = await edit(
                    connection,
                    id,
                    title
                );
                if (!actionResult.ok) {
                    const [code, data] = actionResult.error;
                    return err({
                        feature: FEATURES.Thread,
                        code,
                        data
                    });
                }

                return ok({
                    feature: FEATURES.Thread,
                    code: 7898,
                    histories: actionResult.value.histories,
                    data: {
                        id: actionResult.value.id
                    }
                });
            }
        )
    );
    app.delete(
        ThreadRoute,
        client_verify_log_histories_message(
            ThreadRoute + ':remove',
            async (req, _res, connection) => {
                const id = ThreadModel.id.Parse(req.body.id);
                if (id === undefined) {
                    return err({
                        feature: FEATURES.Thread,
                        code: 103
                    });
                }

                // action
                const actionResult = await remove(
                    connection,
                    id
                );
                if (!actionResult.ok) {
                    const [code, data] = actionResult.error;
                    return err({
                        feature: FEATURES.Thread,
                        code,
                        data
                    });
                }

                return ok({
                    feature: FEATURES.Thread,
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
        ThreadRoute,
        client_verify_log_histories_message(
            ThreadRoute + ':get',
            async (req, _res, connection) => {
                const start = req.query.start;
                if (!isBigInt(start)) {
                    return err({
                        feature: FEATURES.Thread,
                        code: 104
                    });
                }

                const step = req.query.step;
                if (!isNumber(step)) {
                    return err({
                        feature: FEATURES.Thread,
                        code: 105
                    });
                }

                const chatID = ThreadModel.chatID.Parse(req.query.chatID);
                if (chatID === undefined) {
                    return err({
                        feature: FEATURES.Thread,
                        code: 101
                    });
                }

                // action
                const actionResult = await get(
                    connection,
                    chatID,
                    start,
                    step
                );
                if (!actionResult.ok) {
                    const [code, data] = actionResult.error;
                    return err({
                        feature: FEATURES.Thread,
                        code,
                        data
                    });
                }

                return ok({
                    feature: FEATURES.Thread,
                    code: 7898,
                    histories: [],
                    data: {
                        threads: actionResult.value.result,
                        length: actionResult.value.length
                    }
                });
            }
        )
    );
};

const isNumber = (value: any): value is number => {
    return value as number !== undefined;
};
const isBigInt = (value: any): value is bigint => {
    return value as bigint !== undefined;
};

export default thread;