import { createEntity, createModelUtils, Model } from '@mrnafisia/type-query';

const FileTable = {
    schema: 'general',
    title: 'file',
    columns: {
        id: {
            type: 'bigint',
            default: 'auto-increment',
            nullable: false,
            primary: true
        },
        size: {
            type: 'bigint',
            default: false,
            nullable: false
        },
        name: {
            type: 'character varying',
            default: false,
            nullable: false
        },
        contentType: {
            type: 'character varying',
            default: false,
            nullable: false,
            title: 'content_type'
        }
    }
} as const;
const File = createEntity(FileTable);
type FileModel<R extends readonly (keyof typeof FileTable['columns'])[] = [
    'id',
    'size',
    'name',
    'contentType'
], O extends readonly (keyof typeof FileTable['columns'])[] = []> = Model<typeof FileTable['columns'], R, O>;
const FileModel = createModelUtils(File.table.columns);

export { File, FileModel };