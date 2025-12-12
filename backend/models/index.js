const Sequelize = require('sequelize');
const config = require('../config/config.json'); // Standardize if needed, or use env

// Load config based on environment (default to development)
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

let sequelize;
if (dbConfig.use_env_variable) {
    sequelize = new Sequelize(process.env[dbConfig.use_env_variable], dbConfig);
} else {
    sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
        host: dbConfig.host,
        dialect: dbConfig.dialect,
        logging: false
    });
}

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./user')(sequelize, Sequelize);
db.Room = require('./room')(sequelize, Sequelize);
db.RoomState = require('./roomState')(sequelize, Sequelize);
db.RoomMember = require('./roomMember')(sequelize, Sequelize);
db.Message = require('./message')(sequelize, Sequelize);

// Associations
// Room has many RoomMembers
db.Room.hasMany(db.RoomMember, { foreignKey: 'room_id', sourceKey: 'room_id' });
db.RoomMember.belongsTo(db.Room, { foreignKey: 'room_id', targetKey: 'room_id' });

// Room has one RoomState
db.Room.hasOne(db.RoomState, { foreignKey: 'room_id', sourceKey: 'room_id' });
db.RoomState.belongsTo(db.Room, { foreignKey: 'room_id', targetKey: 'room_id' });

module.exports = db;
