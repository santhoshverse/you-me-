const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./models');

const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Version Check Endpoint
app.get('/api/version', (req, res) => {
    res.json({ version: '2.0.0-Production', type: 'MySQL-Sequelize' });
});

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Lock this down in prod
        methods: ["GET", "POST"]
    }
});

// In-memory map for PeerID -> SocketID (for signaling)
// Production improvement: Use Redis
const peerToSocket = {};

const PORT = 4000; // As requested

io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // 1. Register Peer ID
    socket.on('register', ({ peerId }) => {
        peerToSocket[peerId] = socket.id;
        socket.peerId = peerId;
        console.log(`Registered Peer: ${peerId} -> Socket: ${socket.id}`);
    });

    // 2. Join Room
    socket.on('join-room', async ({ roomId, peerId, userId, displayName }) => {
        try {
            // Find or Create Room
            let [room] = await db.Room.findOrCreate({
                where: { room_id: roomId },
                defaults: { name: `Room ${roomId}` }
            });

            // Find or Create RoomState
            await db.RoomState.findOrCreate({
                where: { room_id: roomId }
            });

            // Record Member Join
            await db.RoomMember.create({
                room_id: roomId,
                peer_id: peerId,
                user_id: userId || null,
                role: 'guest'
            });

            socket.join(roomId);
            console.log(`${peerId} joined ${roomId}`);

            // Notify existing peers to connect to new peer
            socket.to(roomId).emit('new-peer', { peerId, displayName });

            // Check if there is an active screen sharer
            const state = await db.RoomState.findOne({ where: { room_id: roomId } });
            if (state && state.is_screen_sharing && state.screen_sharer_peer_id) {
                // Ask the sharer to offer to this new peer
                const sharerSocketId = peerToSocket[state.screen_sharer_peer_id];
                if (sharerSocketId) {
                    io.to(sharerSocketId).emit('request-offer-to-peer', { toPeerId: peerId });
                }
            }

        } catch (err) {
            console.error('Join Room Error:', err);
        }
    });

    // 3. Signaling: Offer
    socket.on('offer', ({ toPeerId, fromPeerId, sdp }) => {
        const targetSocketId = peerToSocket[toPeerId];
        if (targetSocketId) {
            io.to(targetSocketId).emit('offer', { fromPeerId, sdp });
        }
    });

    // 4. Signaling: Answer
    socket.on('answer', ({ toPeerId, fromPeerId, sdp }) => {
        const targetSocketId = peerToSocket[toPeerId];
        if (targetSocketId) {
            io.to(targetSocketId).emit('answer', { fromPeerId, sdp });
        }
    });

    // 5. Signaling: ICE Candidate
    socket.on('ice-candidate', ({ toPeerId, fromPeerId, candidate }) => {
        const targetSocketId = peerToSocket[toPeerId];
        if (targetSocketId) {
            io.to(targetSocketId).emit('ice-candidate', { fromPeerId, candidate });
        }
    });

    // 6. Screen Share Start
    socket.on('screen-started', async ({ roomId, peerId }) => {
        await db.RoomState.update(
            { is_screen_sharing: true, screen_sharer_peer_id: peerId },
            { where: { room_id: roomId } }
        );
        socket.to(roomId).emit('screen-started', { peerId });
    });

    // 7. Screen Share Stop
    socket.on('screen-stopped', async ({ roomId }) => {
        await db.RoomState.update(
            { is_screen_sharing: false, screen_sharer_peer_id: null },
            { where: { room_id: roomId } }
        );
        socket.to(roomId).emit('screen-stopped');
    });

    // Cleanup on Disconnect
    socket.on('disconnect', async () => {
        if (socket.peerId) {
            delete peerToSocket[socket.peerId];
            // Remove from DB members? Or just mark left?
            // For now, let's just notify peers
            // We need to know which room they were in... socket.rooms usually emptied by now
            // But we can track valid rooms they were in via DB query if critical
            // Or simple broadcast if we tracked roomId on socket object
            // For MVP: relying on frontend connection state or ICE failure handling
        }
    });
});

// Catch-all route for SPA (React Router)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Database Connection Status
let dbStatus = 'Connecting...';
let dbError = null;

// Start Server Immediately (Don't wait for DB)
server.listen(PORT, () => {
    console.log(`Signaling Server running on port ${PORT} (v2.8-Restored-Stable)`);
});

// Attempt DB Connection
db.sequelize.sync().then(() => {
    dbStatus = 'Connected';
    console.log('Database synced successfully');
}).catch(err => {
    dbStatus = 'Failed';
    dbError = err.message;
    console.error('Database sync failed:', err);
});

// Version Check Endpoint
app.get('/api/version', (req, res) => {
    res.json({
        version: 'v2.8-Restored-Stable',
        type: 'MySQL-Sequelize',
        dbStatus,
        dbError,
        env: process.env.NODE_ENV
    });
});
