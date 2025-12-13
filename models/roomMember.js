module.exports = (sequelize, DataTypes) => {
    const RoomMember = sequelize.define('RoomMember', {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true
        },
        room_id: {
            type: DataTypes.STRING(64),
            allowNull: false
        },
        user_id: DataTypes.BIGINT,
        peer_id: {
            type: DataTypes.STRING(128),
            allowNull: false
        },
        joined_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        role: {
            type: DataTypes.ENUM('host', 'moderator', 'guest'),
            defaultValue: 'guest'
        }
    }, {
        tableName: 'room_members',
        underscored: true,
        timestamps: false // managing joined_at manually or via default
    });
    return RoomMember;
};
