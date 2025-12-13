const { Room, RoomState, RoomMember } = require('../models');
const { v4: uuidv4 } = require('uuid');

exports.createRoom = async (req, res) => {
    try {
        const { hostUserId, name } = req.body;
        const roomId = uuidv4();

        // Create Room
        const room = await Room.create({
            room_id: roomId,
            name: name || `Room ${roomId.slice(0, 4)}`,
            host_user_id: hostUserId,
            is_private: false
        });

        // Initialize Room State
        await RoomState.create({
            room_id: roomId
        });

        res.json({ success: true, roomId, room });

    } catch (err) {
        console.error('Create Room Error:', err);
        res.status(500).json({ success: false, error: 'Failed to create room' });
    }
};

exports.getRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findOne({ where: { room_id: roomId } });

        if (!room) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        res.json({ success: true, room });

    } catch (err) {
        console.error('Get Room Error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch room' });
    }
};
