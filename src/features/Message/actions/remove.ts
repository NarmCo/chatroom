import { Connection } from '../../../utils/connection';
import { Message, MessageModel } from '../schema';
import { err, ok, Result } from 'never-catch';
import { HistoryRow } from '../../../utils/historyRow';
import Error from '../error';
import { Chat } from '../../Chat/schema';
import { U } from '@mrnafisia/type-query';
import { FEATURES } from '../../../utils/features';
import Operation from '../operation';

const remove = async (
    connection: Connection,
    id: MessageModel['id']
): Promise<Result<{ id: MessageModel['id']; histories: HistoryRow[] }, Error>> => {
    // validation
    if (!MessageModel.id.Validate(id)) {
        return err([208]);
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
        id
    );
};

const checkMessageExistence = async (
    { client, userID }: Connection,
    id: MessageModel['id']
): Promise<Result<undefined, Error>> => {
    const checkMessageExistenceResult = await Message.join(
        'message',
        'full',
        Chat.table,
        'chat',
        contexts => contexts.message.colCmp('chatID', '=', contexts.chat.col('id'))
    ).select(
        ['message_id', 'message_createdAt'] as const,
        contexts =>
            U.andAllOp(
                [
                    contexts.message.colCmp('id', '=', id),
                    U.orOp(
                        contexts.message.colCmp('userID', '=', userID),
                        contexts.chat.colCmp('ownerID', '=', userID)
                    ),
                    contexts.message.colBool('isDeleted', '= false')
                ]
            )
    ).exec(client, ['get', 'one']);
    if (!checkMessageExistenceResult.ok) {
        return err(
            checkMessageExistenceResult.error === false ?
                [303] : [401, checkMessageExistenceResult.error]
        );
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const messageAgeInMinutes = Math.floor(((new Date() - checkMessageExistenceResult.value.message_createdAt)/1000)/60);
    if (messageAgeInMinutes > 2){
        return err([306])
    }

    return ok(undefined);
};

const editMessage = async (
    { client }: Omit<Connection, 'userID'>,
    id: MessageModel['id']
): Promise<Result<{ id: MessageModel['id']; histories: HistoryRow[] }, Error>> => {
    const editMessageResult = await Message.update(
        {
            isDeleted: true
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
                operations: [Operation.EDIT_MESSAGE_IS_DELETED],
                data: {
                    id: editMessageResult.value.id
                }
            }
        ]
    });
};

export default remove;

// TODO if message are being deleted by other features they should insert histories