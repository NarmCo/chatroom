import { createEntity, createModelUtils, Model } from '@mrnafisia/type-query';

const UserTable = {
    schema: 'general',
    title: 'user',
    columns: {
        id: {
            type: 'smallint',
            default: 'auto-increment',
            nullable: false,
            primary: true
        },
        username: {
            type: 'character varying',
            default: false,
            nullable: false,
            minLength: 2,
            maxLength: 16
        },
        password: {
            type: 'character varying',
            default: false,
            nullable: false,
            minLength: 6,
            maxLength: 16
        },
        name: {
            type: 'character varying',
            default: false,
            nullable: false,
            minLength: 2,
            maxLength: 60
        },
        phone: {
            type: 'character varying',
            default: false,
            nullable: false,
            minLength: 10,
            maxLength: 14
        },
        isAdmin: {
            type: 'boolean',
            default: false,
            nullable: false,
            title: 'is_admin'
        },
        fileID: {
            type: 'bigint',
            default: false,
            nullable: false,
            title: 'file'
        }
    }
} as const;
const User = createEntity(UserTable);
type UserModel<R extends readonly (keyof typeof UserTable['columns'])[] = [
    'id',
    'username',
    'password',
    'name',
    'phone',
    'isAdmin',
    'fileID'
],
    O extends readonly (keyof typeof UserTable['columns'])[] = []> = Model<typeof UserTable['columns'], R, O>;
const UserModel = createModelUtils(User.table.columns);

export { User, UserModel };