import express from 'express';
import logger from 'morgan';
import { Server } from 'socket.io';
import { createServer } from 'node:http';
import dotenv from 'dotenv';
import {createClient} from '@libsql/client';

dotenv.config();

const port = process.env.PORT || 3000;

const app = express(); // create an express app
const server = createServer(app); // create a server instance
const io = new Server(server, {
    connectionStateRecovery: {
        maxDisconnectionDuration: 1000,
    }
}); // create a new instance of socket.io

const db = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.AUTH_TOKEN,
});

await db.execute(
    'CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, user TEXT);'
);

io.on('connection', async (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
    
    socket.on('chat message', async (msg) => {
        console.log('message: ' + msg);
        let result
        try{
            const user = socket.handshake.auth.user ?? 'anonymous';
            result = await db.execute({
                sql: 'INSERT INTO messages (content,user) VALUES (:content, :username);',
                args: { content: msg, username: user }
            });            
        } catch (error) {
            console.error('Error inserting message', error);
            return;
        }
        io.emit('chat message', msg, result.lastInsertRowid.toString());
    });

    console.log('socket.auth', socket.auth);
    console.log('socket.auth 2', socket.handshake.auth);

    if(!socket.recovered) {
        try{
            const result = await db.execute({
                sql: 'SELECT id,content,user FROM messages where id > ?;',
                args: [socket.handshake.auth.serverOffset]
                // args: [0]
            })

            result.rows.forEach(row => {
                console.log('row', row);
                socket.emit('chat message', row.content, row.id.toString(),row.user);
            });
        } catch (error) {
            console.error('Error selecting messages', error);
            return;
        }
    }
});

app.use(logger('dev'));

app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/client/index.html');
});

server.listen(port, () => {
        console.log(`Server running on url http://localhost:${port}`);
    }
);
