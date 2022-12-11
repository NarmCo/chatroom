import { Chat } from '../Chat/schema';
import { createEntity, createModelUtils, Model } from '@mrnafisia/type-query';

const ThreadTable = {
    schema: 'general',
    title: 'thread',
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
            nullable: false,
            minLength: 2
        },
        chatID: {
            type: 'bigint',
            default: false,
            nullable: false,
            title: 'chat',
            reference: {
                table: Chat.table,
                column: 'id',
                onDelete: 'cascade'
            }
        },
        threadOwnerID: {
            type: 'smallint',
            default: false,
            nullable: false,
            title: 'thread_owner'
        },
        chatOwnerID: {
            type: 'smallint',
            default: false,
            nullable: false,
            title: 'chat_owner'
        },
        lastMessageSentAt: {
            type: 'timestamp with time zone',
            default: false,
            nullable: false,
            title: 'last_message_sent_at'
        }
    }
} as const;
const Thread = createEntity(ThreadTable);
type ThreadModel<R extends readonly (keyof typeof ThreadTable['columns'])[] = [
    'id',
    'title',
    'chatID',
    'chatOwnerID',
    'threadOwnerID',
    'lastMessageSentAt'
], O extends readonly (keyof typeof ThreadTable['columns'])[] = []> = Model<typeof ThreadTable['columns'], R, O>;
const ThreadModel = createModelUtils(Thread.table.columns);

export { Thread, ThreadModel };