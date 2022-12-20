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
            title: 'users'
        },
        ownerID: {
            type: 'smallint',
            default: false,
            nullable: false,
            title: 'owner'
        },
        isGroup: {
            type: 'boolean',
            default: false,
            nullable: false,
            title: 'is_group'
        },
        lastMessageSentAt: {
            type: 'timestamp with time zone',
            default: false,
            nullable: false,
            title: 'last_message_sent_at'
        },
        fileID: {
            type: 'bigint',
            default: false,
            nullable: true,
            title: 'file'
        }
    }
} as const;
const Chat = createEntity(ChatTable);
type ChatModel<R extends readonly (keyof typeof ChatTable['columns'])[] = [
    'id',
    'title',
    'userIDs',
    'ownerID',
    'isGroup',
    'lastMessageSentAt',
    'fileID'
],
    O extends readonly (keyof typeof ChatTable['columns'])[] = []> = Model<typeof ChatTable['columns'], R, O>;
const ChatModel = createModelUtils(Chat.table.columns);

export { Chat, ChatModel };