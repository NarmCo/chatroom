import { Log } from '../src/features/Log/schema';
import { User } from '../src/features/User/schema';
import { Token } from '../src/features/Token/schema';
import { History } from '../src/features/History/schema';
import { Chat } from '../src/features/Chat/schema';
import { Thread } from '../src/features/Thread/schema';
import { Message } from '../src/features/Message/schema';
import { File } from '../src/features/File/schema';
import { createPool, createTables } from '@mrnafisia/type-query';

const connectionUrl = 'postgres://mohammad:12345678@localhost:5432/chatroom';
const pool = createPool(connectionUrl);

(async () => {
    const client = await pool.$.connect();
    const result = await createTables(client, [
        Log.table,
        User.table,
        Token.table,
        History.table,
        Chat.table,
        Thread.table,
        Message.table,
        File.table,
    ]);
    console.log(result);
    client.release();
    await pool.$.end();
})();