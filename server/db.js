import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pins_cms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✓ MySQL database connected successfully');
    conn.release();
  })
  .catch(err => {
    console.warn('⚠️  MySQL connection failed:', err.message);
    console.warn('⚠️  Server will start but database-dependent features will not work');
    console.warn('⚠️  Please configure MySQL if you need database functionality\n');
  });

export default pool;
