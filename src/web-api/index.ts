import cors from 'cors';
import express from 'express';

const port = Number(process.env.PORT);
if (Number.isNaN(port)) {
    throw 'please set PORT variable in .env';
}

const app = express();
app.use(cors());
app.use(express.json());

app.listen(port, () => console.log(`chatroom listening on ${port}`));
