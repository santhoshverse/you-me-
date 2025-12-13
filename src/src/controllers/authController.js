const { v4: uuidv4 } = require('uuid');
const { User } = require('../models');

exports.guestLogin = async (req, res) => {
    try {
        const { displayName } = req.body;

        // Create a new guest user
        // Using a random avatar for now
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${uuidv4()}`;

        const user = await User.create({
            username: `guest_${uuidv4().slice(0, 8)}`,
            display_name: displayName || 'Anonymous Wolf',
            avatar_url: avatarUrl
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                displayName: user.display_name,
                avatar: user.avatar_url,
                username: user.username
            }
        });
    } catch (err) {
        console.error('Guest Auth Error:', err);
        res.status(500).json({ success: false, error: 'Failed to create guest user' });
    }
};
