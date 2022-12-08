import { createEntity, createModelUtils, Model } from '@mrnafisia/type-query';

const LogTable = {
    schema: 'general',
    title: 'log',
    columns: {
        id: {
            type: 'bigint',
            default: 'auto-increment',
            nullable: false,
            primary: true
        },
        api: {
            type: 'character varying',
            default: false,
            nullable: false,
            minLength: 2,
            maxLength: 60
        },
        headers: {
            type: 'character varying',
            default: false,
            nullable: false
        },
        body: {
            type: 'character varying',
            default: false,
            nullable: false
        },
        response: {
            type: 'character varying',
            default: false,
            nullable: false
        },
        createdAt: {
            type: 'timestamp with time zone',
            default: 'created-at',
            nullable: false,
            title: 'created_at'
        }
    }
} as const;
const Log = createEntity(LogTable);
type LogModel<
    R extends readonly (keyof typeof LogTable['columns'])[] = [
        'id',
        'api',
        'headers',
        'body',
        'response',
        'createdAt'
    ],
    O extends readonly (keyof typeof LogTable['columns'])[] = []
> = Model<typeof LogTable['columns'], R, O>;
const LogModel = createModelUtils(Log.table.columns);

export { Log, LogModel };
