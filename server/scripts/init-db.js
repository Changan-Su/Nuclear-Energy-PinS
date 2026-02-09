/**
 * Initialize database using schema.sql
 * Uses .env for connection (same as the main server).
 * Run from server directory: node scripts/init-db.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

async function init() {
  let conn;
  try {
    conn = await mysql.createConnection(config);
    
    // Execute schema.sql
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await conn.query(sql);
    console.log('✓ Database and tables created.');
    
    // Load material.json and insert it
    const materialPath = path.join(__dirname, '..', '..', 'material.json');
    const materialContent = fs.readFileSync(materialPath, 'utf8');
    const material = JSON.parse(materialContent);
    
    await conn.query('USE pins_cms');
    await conn.query(
      'INSERT INTO site_data (id, material) VALUES (1, ?) ON DUPLICATE KEY UPDATE material = ?',
      [JSON.stringify(material), JSON.stringify(material)]
    );
    console.log('✓ Initial material.json loaded into database.');
    
  } catch (err) {
    console.error('✗ Init failed:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

init();
