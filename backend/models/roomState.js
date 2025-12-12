module.exports = (sequelize, DataTypes) => {
    const RoomState = sequelize.define('RoomState', {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true
        },
        room_id: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true
        },
        is_screen_sharing: {
            type: DataTypes.TINYINT(1),
            defaultValue: 0
        },
        screen_sharer_peer_id: DataTypes.STRING(128),
        media: DataTypes.JSON,
        playback: DataTypes.JSON
    }, {
        tableName: 'room_state',
        underscored: true
    });
    return RoomState;
};
