const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const { initializeDatabase } = require('./database');

let db;

(async () => {
    db = await initializeDatabase();
})();

const app = express();
app.use(cors());

app.use(express.json()); // Enable JSON body parsing
app.use(express.static(path.join(__dirname, '../public'))); // Serve static files

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 3001;


const SERVER_ID = Math.floor(Math.random() * 10000).toString();
console.log(`SERVER INSTANCE ID: ${SERVER_ID}`);

// Room state storage (In-memory for MVP)
const rooms = {};

io.on('connection', (socket) => {
    // console.log('User connected:', socket.id);

    socket.on('join_room', async (roomId) => {
        socket.join(roomId);
        // console.log(`User ${socket.id} joined room ${roomId}`);

        // Initialize room if not exists
        if (!rooms[roomId]) {
            rooms[roomId] = {
                playback: {
                    isPlaying: false,
                    currentTime: 0,
                    timestamp: Date.now()
                },
                currentMedia: {
                    url: null // No default video, waiting for user selection
                },
                activeStreamer: null, // Track who is screen sharing
                users: [] // Manual user tracking
            };
        }

        // Add user to manual list if not present
        if (!rooms[roomId].users.includes(socket.id)) {
            rooms[roomId].users.push(socket.id);
        }

        // Notify existing users if someone new joined (for Mesh WebRTC trigger)
        socket.to(roomId).emit('user_joined', { userId: socket.id });

        // UPDATE USER COUNT - Use Manual Array
        // Store room ID on socket for disconnect tracking
        socket.roomId = roomId;
        const userCount = rooms[roomId].users.length;
        io.to(roomId).emit('update_user_count', userCount);

        // Send current state to user (Include SERVER_ID)
        socket.emit('room_state', { ...rooms[roomId], serverId: SERVER_ID });

        // Load chat history
        if (db) {
            try {
                const messages = await db.all('SELECT * FROM messages WHERE room_id = ? ORDER BY created_at ASC', [roomId]);
                socket.emit('chat_history', messages);
            } catch (e) {
                console.error('Error fetching history:', e);
            }
        }
    });

    socket.on('play', ({ roomId, mediaTime }) => {
        if (rooms[roomId]) {
            rooms[roomId].playback.isPlaying = true;
            rooms[roomId].playback.currentTime = mediaTime;
            rooms[roomId].playback.timestamp = Date.now();

            // Broadcast to everyone in room including sender
            io.to(roomId).emit('play', { mediaTime, serverTime: Date.now() });
        }
    });

    socket.on('pause', ({ roomId, mediaTime }) => {
        if (rooms[roomId]) {
            rooms[roomId].playback.isPlaying = false;
            rooms[roomId].playback.currentTime = mediaTime;

            io.to(roomId).emit('pause', { mediaTime, serverTime: Date.now() });
        }
    });

    socket.on('seek', ({ roomId, mediaTime }) => {
        if (rooms[roomId]) {
            rooms[roomId].playback.currentTime = mediaTime;
            rooms[roomId].playback.timestamp = Date.now();

            io.to(roomId).emit('seek', { mediaTime, serverTime: Date.now() });
        }
    });

    socket.on('chat_message', async ({ roomId, text, user }) => {
        const timestamp = new Date().toISOString();

        // Save to DB
        if (db) {
            try {
                await db.run('INSERT INTO messages (room_id, username, content, created_at) VALUES (?, ?, ?, ?)', [roomId, user, text, timestamp]);
            } catch (e) {
                console.error('Error saving message:', e);
            }
        }

        io.to(roomId).emit('chat_message', { text, user, createdAt: timestamp });
    });

    // --- WebRTC Signaling ---

    socket.on('start_stream', ({ roomId }) => {
        if (rooms[roomId]) {
            rooms[roomId].activeStreamer = socket.id;
            // Broadcast to all clients in room to prepare for stream
            socket.to(roomId).emit('stream_started', { streamerId: socket.id });
        }
    });

    socket.on('stop_stream', ({ roomId }) => {
        if (rooms[roomId]) {
            rooms[roomId].activeStreamer = null;
            socket.to(roomId).emit('stream_stopped');
        }
    });

    // Relay signaling data (Offer, Answer, ICE Candidates)
    socket.on('signal', ({ to, from, signal }) => {
        io.to(to).emit('signal', { from, signal });
    });

    // Request Feed (Viewer asks Streamer for connection)
    socket.on('request_feed', ({ to, from }) => {
        io.to(to).emit('request_feed', { from });
    });

    socket.on('disconnect', () => {
        if (socket.roomId && rooms[socket.roomId]) {
            const roomId = socket.roomId;

            // Remove from manual list
            rooms[roomId].users = rooms[roomId].users.filter(id => id !== socket.id);

            const userCount = rooms[roomId].users.length;
            io.to(roomId).emit('update_user_count', userCount);

            // Allow DB cleanup or other logic if empty?
            // if (userCount === 0) delete rooms[roomId]; 
        }
    });
});

// Handle SPA routing - send everything else to room.html if it looks like a room URL, 
// or index.html otherwise.
app.get('/room/:roomId', (req, res) => {
    console.log(`Debug: Hit /room/${req.params.roomId}`);
    res.sendFile(path.join(__dirname, '../public/room.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
