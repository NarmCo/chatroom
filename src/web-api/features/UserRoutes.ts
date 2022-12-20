import { Express } from 'express';
import { err, ok } from 'never-catch';
import { Parser } from '@mrnafisia/type-query';
import { FEATURES } from '../../utils/features';
import add from '../../features/User/actions/add';
import get from '../../features/User/actions/get';
import edit from '../../features/User/actions/edit';
import { GetOptions } from '../../utils/getOptions';
import remove from '../../features/User/actions/remove';
import { User, UserModel } from '../../features/User/schema';
import client_verify_log_histories_message from '../middlewares/client_verify_log_histories_message';
import ParseGetOptions from '../utils/parseGetOptions';

const UserRoute = '/user';

const user = (app: Express) => {
    app.post(
        UserRoute,
        client_verify_log_histories_message(
            UserRoute + ':add',
            async (req, _res, connection) => {
                // parse
                const parsedUserResult = UserModel.Parse(
                    {
                        username: req.body.username,
                        password: req.body.password,
                        name: req.body.name,
                        email: req.body.email,
                        phone: req.body.phone
                    },
                    ['username', 'password', 'name', 'phone', 'fileID'] as const,
                    [] as const
                );
                if (!parsedUserResult.ok) {
                    let code;
                    switch (parsedUserResult.error) {
                        case 'username':
                            code = 101;
                            break;
                        case 'password':
                            code = 102;
                            break;
                        case 'name':
                            code = 103;
                            break;
                        case 'fileID':
                            code = 104;
                            break;
                        case 'phone':
                            code = 105;
                            break;
                    }
                    return err({
                        feature: FEATURES.User,
                        code
                    });
                }

                // action
                const actionResult = await add(
                    connection,
                    parsedUserResult.value
                );
                if (!actionResult.ok) {
                    const [code, data] = actionResult.error;
                    return err({ feature: FEATURES.User, code, data });
                }

                return ok({
                    feature: FEATURES.User,
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
        UserRoute,
        client_verify_log_histories_message(
            UserRoute + ':edit',
            async (req, _res, connection) => {
                // parse
                const parsedUserResult = UserModel.Parse(
                    {
                        id: req.body.id,
                        username: req.body.username,
                        password: req.body.password,
                        name: req.body.name,
                        fileID: req.body.fileID,
                        phone: req.body.phone
                    },
                    ['id'] as const,
                    ['username', 'password', 'name', 'fileID', 'phone'] as const
                );
                if (!parsedUserResult.ok) {
                    let code;
                    switch (parsedUserResult.error) {
                        case 'id':
                            code = 106;
                            break;
                        case 'username':
                            code = 101;
                            break;
                        case 'password':
                            code = 102;
                            break;
                        case 'name':
                            code = 103;
                            break;
                        case 'fileID':
                            code = 104;
                            break;
                        case 'phone':
                            code = 105;
                            break;
                    }

                    return err({ feature: FEATURES.User, code });
                }

                // action
                const actionResult = await edit(
                    connection,
                    parsedUserResult.value
                );
                if (!actionResult.ok) {
                    const [code, data] = actionResult.error;
                    return err({
                        feature: FEATURES.User,
                        code,
                        data
                    });
                }

                return ok({
                    feature: FEATURES.User,
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
        UserRoute,
        client_verify_log_histories_message(
            UserRoute + ':delete',
            async (req, _res, connection) => {
                // parse
                const parsedID = UserModel.id.Parse(req.body.id);
                if (parsedID === undefined) {
                    return err({ feature: FEATURES.User, code: 106 });
                }

                //action
                const actionResult = await remove(connection, parsedID);
                if (!actionResult.ok) {
                    const [code, data] = actionResult.error;
                    return err({
                        feature: FEATURES.User,
                        code,
                        data
                    });
                }

                return ok({
                    feature: FEATURES.User,
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
        UserRoute,
        client_verify_log_histories_message(
            UserRoute + ':get',
            async (req, _res, connection) => {
                // parse
                const options = ParseGetOptions(
                    User.table,
                    Parser.json(req.query.fields),
                    req.query.start,
                    req.query.step,
                    Parser.json(req.query.orders)
                );
                if (options === undefined) {
                    return err({
                        feature: FEATURES.User,
                        code: 107
                    });
                }
                if (
                    options.fields.includes('password') ||
                    options.orders?.some(({ by }) => by === 'password')
                ) {
                    return err({
                        feature: FEATURES.User,
                        code: 109
                    });
                }
                let ids: UserModel['id'][] | undefined = undefined;
                let usernames: UserModel['username'][] | undefined = undefined;
                let names: UserModel['name'][] | undefined = undefined;
                let phones: UserModel['phone'][] | undefined = undefined;
                let isAdmin: UserModel['isAdmin'] | undefined = undefined;
                if (req.query.ids !== undefined) {
                    const queryIDs = Parser.json(req.query.ids);
                    ids = [];
                    if (!Array.isArray(queryIDs)) {
                        return err({
                            feature: FEATURES.User,
                            code: 106
                        });
                    }
                    for (let i = 0; i < queryIDs.length; i++) {
                        const parsed = UserModel.id.Parse(queryIDs[i]);
                        if (parsed === undefined) {
                            return err({
                                feature: FEATURES.User,
                                code: 106
                            });
                        }
                        ids.push(parsed);
                    }
                }
                if (req.query.usernames !== undefined) {
                    const queryUsernames = Parser.json(req.query.usernames);
                    usernames = [];
                    if (!Array.isArray(queryUsernames)) {
                        return err({
                            feature: FEATURES.User,
                            code: 101
                        });
                    }
                    for (let i = 0; i < queryUsernames.length; i++) {
                        const parsed = UserModel.username.Parse(
                            queryUsernames[i]
                        );
                        if (parsed === undefined) {
                            return err({
                                feature: FEATURES.User,
                                code: 101
                            });
                        }
                        usernames.push(parsed);
                    }
                }
                if (req.query.names !== undefined) {
                    const queryNames = Parser.json(req.query.names);
                    names = [];
                    if (!Array.isArray(queryNames)) {
                        return err({
                            feature: FEATURES.User,
                            code: 103
                        });
                    }
                    for (let i = 0; i < queryNames.length; i++) {
                        const parsed = UserModel.name.Parse(queryNames[i]);
                        if (parsed === undefined) {
                            return err({
                                feature: FEATURES.User,
                                code: 103
                            });
                        }
                        names.push(parsed);
                    }
                }
                if (req.query.phones !== undefined) {
                    const queryPhones = Parser.json(req.query.phones);
                    phones = [];
                    if (!Array.isArray(queryPhones)) {
                        return err({
                            feature: FEATURES.User,
                            code: 105
                        });
                    }
                    for (let i = 0; i < queryPhones.length; i++) {
                        const parsed = UserModel.phone.Parse(queryPhones[i]);
                        if (parsed === undefined) {
                            return err({ feature: FEATURES.User, code: 105 });
                        }
                        phones.push(parsed);
                    }
                }
                if (req.query.isAdmin !== undefined) {
                    isAdmin = UserModel.isAdmin.Parse(req.query.isAdmin);
                    if (isAdmin === undefined) {
                        return err({ feature: FEATURES.User, code: 108 });
                    }
                }

                const actionResult = await get(
                    connection,
                    options as GetOptions<Omit<typeof User.table['columns'], 'password'>>,
                    { ids, usernames, names, phones, isAdmin }
                );
                if (!actionResult.ok) {
                    const [code, data] = actionResult.error;
                    return err({
                        feature: FEATURES.User,
                        code,
                        data
                    });
                }

                return ok({
                    feature: FEATURES.User,
                    code: 7898,
                    histories: [],
                    data: {
                        users: actionResult.value.result,
                        length: actionResult.value.length
                    }
                });
            }
        )
    );
};
export default user;
