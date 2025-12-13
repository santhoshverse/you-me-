module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true
        },
        username: {
            type: DataTypes.STRING(100),
            unique: true
        },
        display_name: DataTypes.STRING(150),
        avatar_url: DataTypes.STRING(500)
    }, {
        tableName: 'users',
        underscored: true
    });
    return User;
};
