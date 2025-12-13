module.exports = (sequelize, DataTypes) => {
    const Room = sequelize.define('Room', {
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
        name: DataTypes.STRING(255),
        host_user_id: DataTypes.BIGINT,
        is_private: {
            type: DataTypes.TINYINT(1),
            defaultValue: 0
        },
        settings: DataTypes.JSON
    }, {
        tableName: 'rooms',
        underscored: true
    });
    return Room;
};
