import { addHook, createPool } from '@mrnafisia/type-query';

const connectionString = process.env.CHATROOM_DB_CONNECTION_STRING;
if (connectionString === undefined) {
    throw 'please set CHATROOM_DB_CONNECTION_STRING variable in .env';
}

const pool = createPool(connectionString);

if (process.env.NODE_ENV === 'development') {
    addHook({
        event: 'on-send-query',
        hook: (query, params) => {
            console.log('\x1b[36m' + `Query: ${query}`);
            console.log(
                `Parameters: ${JSON.stringify(params)}` + '\x1b[0m' + '\n'
            );
        }
    });
}

export { pool };
