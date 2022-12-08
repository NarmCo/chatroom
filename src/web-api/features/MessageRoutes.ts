import { Express } from 'express';
import client_verify_log_histories_message from '../middlewares/client_verify_log_histories_message';
import { MessageModel } from '../../features/Message/schema';
import { err, ok } from 'never-catch';
import { FEATURES } from '../../utils/features';
import { ThreadModel } from '../../features/Thread/schema';
import { FileModel } from '../../features/File/schema';
import add from '../../features/Message/actions/add';
import edit from '../../features/Message/actions/edit';
import remove from '../../features/Message/actions/remove';
import get from '../../features/Message/actions/get';

const MessageRoute = '/message';

const message = (app: Express) => {
    app.post(
        MessageRoute,
        client_verify_log_histories_message(
            MessageRoute + ':add',
            async (req, _res, connection) => {
                const chatID = MessageModel.chatID.Parse(req.body.chatID);
                if (chatID === undefined) {
                    return err({
                        feature: FEATURES.Message,
                        code: 101
                    });
                }

                let content: MessageModel['content'] | undefined = undefined;
                if (req.body.content !== undefined) {
                    content = MessageModel.content.Parse(req.body.content);
                    if (content === undefined) {
                        return err({
                            feature: FEATURES.Message,
                            code: 102
                        });
                    }
                }

                let threadID: ThreadModel['id'] | undefined = undefined;
                if (req.body.threadID !== undefined) {
                    threadID = ThreadModel.id.Parse(req.body.threadID);
                    if (threadID === undefined) {
                        return err({
                            feature: FEATURES.Message,
                            code: 103
                        });
                    }
                }

                let messageID: MessageModel['id'] | undefined = undefined;
                if (req.body.messageID !== undefined) {
                    messageID = MessageModel.id.Parse(req.body.messageID);
                    if (messageID === undefined) {
                        return err({
                            feature: FEATURES.Message,
                            code: 104
                        });
                    }
                }

                let forwardID: MessageModel['id'] | undefined = undefined;
                if (req.body.forwardID !== undefined) {
                    forwardID = MessageModel.id.Parse(req.body.forwardID);
                    if (forwardID === undefined) {
                        return err({
                            feature: FEATURES.Message,
                            code: 105
                        });
                    }
                }

                let fileID: FileModel['id'] | undefined = undefined;
                if (req.body.fileID !== undefined) {
                    fileID = FileModel.id.Parse(req.body.fileID);
                    if (fileID === undefined) {
                        return err({
                            feature: FEATURES.Message,
                            code: 106
                        });
                    }
                }


                // action
                const actionResult = await add(
                    connection,
                    chatID,
                    content,
                    threadID,
                    messageID,
                    forwardID,
                    fileID
                );
                if (!actionResult.ok) {
                    const [code, data] = actionResult.error;
                    return err({
                        feature: FEATURES.Message,
                        code,
                        data
                    });
                }

                return ok({
                    feature: FEATURES.Message,
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
        MessageRoute,
        client_verify_log_histories_message(
            MessageRoute + ':edit',
            async (req, _res, connection) => {
                const id = MessageModel.id.Parse(req.body.id);
                if (id === undefined) {
                    return err({
                        feature: FEATURES.Message,
                        code: 104
                    });
                }

                const content = MessageModel.content.Parse(req.body.content);
                if (content === undefined) {
                    return err({
                        feature: FEATURES.Message,
                        code: 102
                    });
                }

                // action
                const actionResult = await edit(
                    connection,
                    id,
                    content
                );
                if (!actionResult.ok) {
                    const [code, data] = actionResult.error;
                    return err({
                        feature: FEATURES.Message,
                        code,
                        data
                    });
                }

                return ok({
                    feature: FEATURES.Message,
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
        MessageRoute,
        client_verify_log_histories_message(
            MessageRoute + ':remove',
            async (req, _res, connection) => {
                const id = MessageModel.id.Parse(req.body.id);
                if (id === undefined) {
                    return err({
                        feature: FEATURES.Message,
                        code: 104
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
                        feature: FEATURES.Message,
                        code,
                        data
                    });
                }

                return ok({
                    feature: FEATURES.Message,
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
        MessageRoute,
        client_verify_log_histories_message(
            MessageRoute + 'get',
            async (req, _res, connection) => {
                const id = MessageModel.id.Parse(req.query.id);
                if (id === undefined){
                    return err({
                        feature: FEATURES.Message,
                        code: 104
                    })
                }

                const step = req.query.step;
                if (!isNumber(step)) {
                    return err({
                        feature: FEATURES.Chat,
                        code: 108
                    });
                }

                const orderDirection = req.query.orderDirection;
                if (!isOrderDirection(orderDirection)){
                    return err({
                        feature: FEATURES.Message,
                        code: 109
                    })
                }

                // action
                const actionResult = await get(
                    connection,
                    id,
                    orderDirection,
                    step
                );
                if (!actionResult.ok){
                    const [code, data] = actionResult.error;
                    return err({
                        feature: FEATURES.Message,
                        code,
                        data
                    });
                }


                return ok({
                    feature: FEATURES.Message,
                    code: 7898,
                    histories: [],
                    data: {
                        messages: actionResult.value
                    }
                })

            }
        )
    )
};


const isOrderDirection = (value: any): value is string => {
    return value === 'asc' || value === 'desc' || value === 'middle';
};
const isNumber = (value: any): value is number => {
    return typeof value === 'number';
};

export default message;