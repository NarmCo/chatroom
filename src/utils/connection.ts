import { ClientBase } from '@mrnafisia/type-query';
import { UserModel } from '../features/User/schema';

type Connection = {
    client: ClientBase;
    userID: UserModel['id'];
};

export type { Connection };
