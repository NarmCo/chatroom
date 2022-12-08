import { Express } from 'express';
import client_verify_log_histories_message from '../middlewares/client_verify_log_histories_message';
import { ChatModel } from '../../features/Chat/schema';
import { err, ok } from 'never-catch';
import { FEATURES } from '../../utils/features';
import { UserModel } from '../../features/User/schema';
import add from '../../features/Chat/actions/add';
import edit from '../../features/Chat/actions/edit';
import remove from '../../features/Chat/actions/remove';
import get from '../../features/Chat/actions/get';

const ChatRoute = '/chat';

const chat = (app: Express) => {
    app.post(
        ChatRoute,
        client_verify_log_histories_message(
            ChatRoute + ':add',
            async (req, _res, connection) => {
                const title = ChatModel.title.Parse(req.body.title);
                if (title === undefined) {
                    return err({
                        feature: FEATURES.Chat,
                        code: 101
                    });
                }

                const userIDs: UserModel['id'][] = [];
                const bodyUserIDs = req.body.userIDs;
                for (const userID of bodyUserIDs) {
                    const parsed = UserModel.id.Parse(userID);
                    if (parsed === undefined) {
                        return err({
                            feature: FEATURES.Chat,
                            code: 102
                        });
                    }
                    userIDs.push(parsed);
                }

                const isGroup = ChatModel.isGroup.Parse(req.body.isGroup);
                if (isGroup === undefined) {
                    return err({
                        feature: FEATURES.Chat,
                        code: 103
                    });
                }

                // action
                const actionResult = await add(
                    connection,
                    title,
                    userIDs,
                    isGroup
                );
                if (!actionResult.ok) {
                    const [code, data] = actionResult.error;
                    return err({
                        feature: FEATURES.Chat,
                        code,
                        data
                    });
                }

                return ok({
                    feature: FEATURES.Chat,
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
        ChatRoute,
        client_verify_log_histories_message(
            ChatRoute + ':edit',
            async (req, _res, connection) => {
                const id = ChatModel.id.Parse(req.body.id);
                if (id === undefined) {
                    return err({
                        feature: FEATURES.Chat,
                        code: 104
                    });
                }

                let title: string | undefined = undefined;
                if (req.body.title !== undefined) {
                    title = req.body.title;
                    if (!isString(title)) {
                        return err({
                            feature: FEATURES.Chat,
                            code: 101
                        });
                    }
                }

                let addUserIDs: UserModel['id'][] | undefined = undefined;
                if (req.body.addUserIDs !== undefined) {
                    const bodyAddUserIDs = req.body.addUserIDs;
                    addUserIDs = [];
                    for (const bodyAddUserID of bodyAddUserIDs) {
                        const parsed = UserModel.id.Parse(bodyAddUserID);
                        if (parsed === undefined) {
                            return err({
                                feature: FEATURES.Chat,
                                code: 102
                            });
                        }
                        addUserIDs.push(parsed);
                    }
                }

                let removeUserIDs: UserModel['id'][] | undefined = undefined;
                if (req.body.removeUserIDs !== undefined) {
                    const bodyRemoveUserIDs = req.body.removeUserIDs;
                    removeUserIDs = [];
                    for (const bodyRemoveUserID of bodyRemoveUserIDs) {
                        const parsed = UserModel.id.Parse(bodyRemoveUserID);
                        if (parsed === undefined) {
                            return err({
                                feature: FEATURES.Chat,
                                code: 102
                            });
                        }
                        removeUserIDs.push(parsed);
                    }
                }

                // action
                const actionResult = await edit(
                    connection,
                    id,
                    title,
                    addUserIDs,
                    removeUserIDs
                );
                if (!actionResult.ok) {
                    const [code, data] = actionResult.error;
                    return err({
                        feature: FEATURES.Chat,
                        code,
                        data
                    });
                }

                return ok({
                    feature: FEATURES.Chat,
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
        ChatRoute,
        client_verify_log_histories_message(
            ChatRoute + ':remove',
            async (req, _res, connection) => {
                const id = ChatModel.id.Parse(req.body.id);
                if (id === undefined) {
                    return err({
                        feature: FEATURES.Chat,
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
                        feature: FEATURES.Chat,
                        code,
                        data
                    });
                }

                return ok({
                    feature: FEATURES.Chat,
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
        ChatRoute,
        client_verify_log_histories_message(
            ChatRoute + ':get',
            async (req, _res, connection) => {
                const start = req.query.start;
                if (!isBigInt(start)) {
                    return err({
                        feature: FEATURES.Chat,
                        code: 105
                    });
                }

                const step = req.query.step;
                if (!isNumber(step)) {
                    return err({
                        feature: FEATURES.Chat,
                        code: 106
                    });
                }

                // action
                const actionResult = await get(
                    connection,
                    start,
                    step
                );
                if (!actionResult.ok) {
                    const [code, data] = actionResult.error;
                    return err({
                        feature: FEATURES.Chat,
                        code,
                        data
                    });
                }

                return ok({
                    feature: FEATURES.Chat,
                    code: 7898,
                    histories: [],
                    data: {
                        chats: actionResult.value.result,
                        length: actionResult.value.length
                    }
                });
            }
        )
    );
};

const isString = (value: any): value is string => {
    return typeof value === 'string';
};
const isNumber = (value: any): value is number => {
    return typeof value === 'number';
};
const isBigInt = (value: any): value is bigint => {
    return typeof value === 'bigint';
};

export default chat;