module.exports = (sequelize, DataTypes) => {
    const Message = sequelize.define('Message', {
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
        text: DataTypes.TEXT
    }, {
        tableName: 'messages',
        underscored: true
    });
    return Message;
};
