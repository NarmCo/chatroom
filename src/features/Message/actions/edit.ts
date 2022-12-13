import Error from '../error';
import { err, ok, Result } from 'never-catch';
import { Message, MessageModel } from '../schema';
import { Connection } from '../../../utils/connection';
import { HistoryRow } from '../../../utils/historyRow';
import { FEATURES } from '../../../utils/features';
import Operation from '../operation';

const edit = async (
    connection: Connection,
    id: MessageModel['id'],
    content: MessageModel['content']
): Promise<Result<{
    id: MessageModel['id'],
    histories: HistoryRow[]
}, Error>> => {
    // validation
    const checkValidationResult = checkValidation(
        id,
        content
    );
    if (!checkValidationResult.ok) {
        return checkValidationResult;
    }

    // check message existence
    const checkMessageExistenceResult = await checkMessageExistence(
        connection,
        id
    );
    if (!checkMessageExistenceResult.ok) {
        return checkMessageExistenceResult;
    }

    // edit message
    return await editMessage(
        connection,
        id,
        content
    );
};

const checkValidation = (
    id: MessageModel['id'],
    content: MessageModel['content']
): Result<undefined, Error> => {
    if (!MessageModel.id.Validate(id)) {
        return err([208]);
    }
    if (!MessageModel.content.Validate(content)) {
        return err([201]);
    }

    return ok(undefined);
};

const checkMessageExistence = async (
    { client, userID }: Connection,
    id: MessageModel['id']
): Promise<Result<undefined, Error>> => {
    const checkMessageExistenceResult = await Message.select(
        ['id'] as const,
        context =>
            context.colsAnd({
                id: ['=', id],
                userID: ['=', userID],
                isDeleted: ['= false'],
                forward: ['= null']
            })
    ).exec(client, ['get', 'one']);
    if (!checkMessageExistenceResult.ok) {
        return err(
            checkMessageExistenceResult.error === false ? [303] : [401, checkMessageExistenceResult.error]
        );
    }

    return ok(undefined);
};

const editMessage = async (
    { client }: Omit<Connection, 'userID'>,
    id: MessageModel['id'],
    content: MessageModel['content']
): Promise<Result<{ id: MessageModel['id']; histories: HistoryRow[] }, Error>> => {
    const editMessageResult = await Message.update({
            content,
            isEdited: true
        },
        context => context.colCmp('id', '=', id),
        ['id'] as const
    ).exec(client, ['get', 'one']);
    if (!editMessageResult.ok) {
        return err([401, editMessageResult.error]);
    }

    return ok({
        id: editMessageResult.value.id,
        histories: [
            {
                feature: FEATURES.Message,
                table: Message.table.title,
                row: BigInt(editMessageResult.value.id),
                operations: [Operation.EDIT_MESSAGE_CONTENT, Operation.EDIT_MESSAGE_IS_EDITED],
                data: {
                    id,
                    content
                }
            }
        ]
    });
};

export default edit;