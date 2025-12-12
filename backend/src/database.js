const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function initializeDatabase() {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    // Create Users Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create Messages Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id TEXT,
            username TEXT,
            content TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('Connected to SQLite database.');
    return db;
}

module.exports = { initializeDatabase };
