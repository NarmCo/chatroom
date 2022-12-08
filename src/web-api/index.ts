import cors from 'cors';
import express from 'express';
import fileUpload from 'express-fileupload';
import chat from './features/ChatRoutes';
import file from './features/FileRoutes';
import message from './features/MessageRoutes';
import thread from './features/ThreadRoutes';
import token from './features/TokenRoutes';
import user from './features/UserRoutes';

const port = Number(process.env.PORT);
if (Number.isNaN(port)) {
    throw 'please set PORT variable in .env';
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    useTempFiles: true,
    tempFileDir: '/tmp/'
}));

app.use(chat);
app.use(file);
app.use(message);
app.use(thread);
app.use(token);
app.use(user);

app.listen(port, () => console.log(`chatroom listening on ${port}`));
