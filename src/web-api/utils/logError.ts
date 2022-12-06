import fs from 'fs/promises';

const logDir = process.env.LOG_DIR;
if (logDir === undefined) {
    throw 'please set LOG_DIR variable in .env';
}

const logError = (content: unknown) => {
    const now = new Date().toISOString();
    return fs
        .appendFile(
            logDir + '/' + now.split('T')[0] + '.log',
            now + ': ' + JSON.stringify(content, null, 2) + '\r\n'
        )
        .catch(e => console.log(e));
};
export default logError;
