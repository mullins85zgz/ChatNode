import express from 'express';
import logger from 'morgan';
import { Server } from 'socket.io';
import { createServer } from 'node:http';

 const port = process.env.PORT || 3000;

const app = express(); // create an express app
const server = createServer(app); // create a server instance
const io = new Server(server); // create a new instance of socket.io

io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

app.use(logger('dev'));

app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/client/index.html');
});

server.listen(port, () => {
        console.log(`Server running on url http://localhost:${port}`);
    }
);
