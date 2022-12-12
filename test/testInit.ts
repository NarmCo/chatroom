import 'dotenv/config';
import '../src/utils/dateJsonStringify';
import '../src/utils/bigIntJsonStringify';
import { addHook, createPool, Pool } from '@mrnafisia/type-query';

const connectionUrl = process.env.CHATROOM_TEST_DB_CONNECTION_STRING;
if (connectionUrl === undefined) {
    throw 'please set CHATROOM_TEST_DB_CONNECTION_STRING variable in .env';
}

let testPool: Pool;
beforeEach(() => {
    testPool = createPool(connectionUrl);
});
afterEach(async () => {
    await testPool.$.end();
});

addHook({
    event: 'on-send-query',
    // hook: (_, __) => {
    hook: (query, params) => {
        console.log('\x1b[36m' + `Query: ${query}`);
        console.log(`Parameters: ${JSON.stringify(params)}` + '\x1b[0m' + '\n');
    }
});

export { testPool };
