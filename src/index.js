const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());

app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// Serve static files from 'public' directory (Deployment Ready)
app.use(express.static(path.join(__dirname, '../public')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use(express.json()); // Enable JSON body parsing

// Room state storage (In-memory for MVP)
const rooms = {};

io.on('connection', (socket) => {
    // console.log('User connected:', socket.id);

    socket.on('join_room', (roomId) => {
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
                }
            };
        }

        // Send current state to user
        socket.emit('room_state', rooms[roomId]);
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

    socket.on('chat_message', ({ roomId, text, user }) => {
        io.to(roomId).emit('chat_message', { text, user, createdAt: new Date().toISOString() });
    });

    socket.on('disconnect', () => {
        // console.log('User disconnected:', socket.id);
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
