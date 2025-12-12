const mysql = require('mysql2/promise');

async function testConnection() {
    const config = {
        host: '127.0.0.1',
        user: 'root',
        password: 'Root@2715',
    };

    console.log('1. Testing connection WITHOUT database...');
    try {
        const connection = await mysql.createConnection(config);
        console.log('✅ Connection successful!');

        console.log('2. CHecking if "w2g" database exists...');
        const [rows] = await connection.query('SHOW DATABASES LIKE "w2g"');
        if (rows.length === 0) {
            console.log('⚠️ Database "w2g" does NOT exist.');
            console.log('3. Creating database "w2g"...');
            await connection.query('CREATE DATABASE w2g');
            console.log('✅ Database "w2g" created!');
        } else {
            console.log('✅ Database "w2g" exists.');
        }
        await connection.end();
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        console.error('Error Code:', err.code);
    }
}

testConnection();
