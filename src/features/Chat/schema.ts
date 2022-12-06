import { createEntity, createModelUtils, Model } from '@mrnafisia/type-query';


const ChatTable = {
    schema: 'general',
    title: 'chat',
    columns: {
        id: {
            type: 'bigint',
            default: 'auto-increment',
            nullable: false,
            primary: true
        },
        title: {
            type: 'character varying',
            default: false,
            nullable: true,
            minLength: 2
        },
        userIDs: {
            type: 'jsonb',
            default: false,
            nullable: false,
            title: 'user_ids'
        },
        threadIDs: {
            type: 'jsonb',
            default: false,
            nullable: false,
            title: 'thread_ids'
        }
    }
} as const;
const Chat = createEntity(ChatTable);
type ChatModel<R extends readonly (keyof typeof ChatTable['columns'])[] = [
    'id',
    'title',
    'userIDs'
],
    O extends readonly (keyof typeof ChatTable['columns'])[] = [
        'threadIDs'
    ]> = Model<typeof ChatTable['columns'], R, O>;
const ChatModel = createModelUtils(Chat.table.columns);

export { Chat, ChatModel };