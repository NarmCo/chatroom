import { createEntity, createModelUtils, Model } from '@mrnafisia/type-query';
import { Thread } from '../Thread/schema';
import { Chat } from '../Chat/schema';
import { User } from '../User/schema';

const MessageTable = {
    schema: 'general',
    title: 'message',
    columns: {
        id: {
            type: 'bigint',
            default: 'auto-increment',
            nullable: false,
            primary: true
        },
        content: {
            type: 'character varying',
            default: false,
            nullable: false,
            maxLength: 5000
        },
        threadID: {
            type: 'bigint',
            default: false,
            nullable: true,
            title: 'thread',
            reference: {
                table: Thread.table,
                column: 'id',
                onDelete: 'cascade'
            }
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
        reply: {
            type: 'jsonb',
            default: false,
            nullable: true
        },
        createdAt: {
            type: 'timestamp with time zone',
            default: false,
            nullable: false,
            title: 'created_at'
        },
        userID: {
            type: 'smallint',
            default: false,
            nullable: false,
            title: 'user',
            reference: {
                table: User.table,
                column: 'id',
                onDelete: 'cascade'
            }
        },
        seenBy: {
            type: 'jsonb',
            default: false,
            nullable: false,
            title: 'seen_by'
        },
        forward: {
            type: 'jsonb',
            default: false,
            nullable: true
        },
        fileID: {
            type: 'bigint',
            default: false,
            nullable: true,
            title: 'file'
        },
        fileName: {
            type: 'character varying',
            default: false,
            nullable: true,
            title: 'file_name'
        },
        fileSize: {
            type: 'bigint',
            default: false,
            nullable: true,
            title: 'file_size'
        },
        isEdited: {
            type: 'boolean',
            default: false,
            nullable: false,
            title: 'is_edited'
        },
        isDeleted: {
            type: 'boolean',
            default: false,
            nullable: false,
            title: 'is_deleted'
        }
    }
} as const;
const Message = createEntity(MessageTable);
type MessageModel<R extends readonly (keyof typeof MessageTable['columns'])[] = [
    'id',
    'content',
    'threadID',
    'chatID',
    'reply',
    'createdAt',
    'userID',
    'seenBy',
    'forward',
    'fileID',
    'fileName',
    'fileSize',
    'isEdited',
    'isDeleted'
],
    O extends readonly (keyof typeof MessageTable['columns'])[] = []> = Model<typeof MessageTable['columns'], R, O>;
const MessageModel = createModelUtils(Message.table.columns);

export { Message, MessageModel };