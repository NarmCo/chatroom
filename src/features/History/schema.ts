import { createEntity, createModelUtils, Model } from '@mrnafisia/type-query';

const HistoryTable = {
    schema: 'general',
    title: 'history',
    columns: {
        id: {
            type: 'bigint',
            default: 'auto-increment',
            nullable: false,
            primary: true
        },
        logID: {
            type: 'bigint',
            default: false,
            nullable: false,
            title: 'log_id'
        },
        userID: {
            type: 'smallint',
            default: false,
            nullable: false,
            title: 'user_id'
        },
        feature: {
            type: 'character varying',
            default: false,
            nullable: false,
            minLength: 2,
            maxLength: 60
        },
        table: {
            type: 'character varying',
            default: false,
            nullable: false,
            minLength: 2,
            maxLength: 60
        },
        row: {
            type: 'bigint',
            default: false,
            nullable: false
        },
        operations: {
            type: 'jsonb',
            default: false,
            nullable: false
        },
        data: {
            type: 'jsonb',
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
const History = createEntity(HistoryTable);
type HistoryModel<R extends readonly (keyof typeof HistoryTable['columns'])[] = [
    'id',
    'logID',
    'userID',
    'feature',
    'table',
    'row',
    'operations',
    'data',
    'createdAt'
],
    O extends readonly (keyof typeof HistoryTable['columns'])[] = []> = Model<typeof HistoryTable['columns'], R, O>;
const HistoryModel = createModelUtils(History.table.columns);

export { History, HistoryModel };