const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

const dbPath = path.join(app.getPath('userData'), 'organized_mind.db');
const db = new Database(dbPath);

// Initialize database tables
function initDatabase() {
    // Create users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            data_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME
        )
    `);
    
    // Create settings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Check if default user exists
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get('default');
    if (!user) {
        const defaultData = { fields: [] };
        db.prepare(`
            INSERT INTO users (username, data_json, created_at, updated_at)
            VALUES (?, ?, ?, ?)
        `).run('default', JSON.stringify(defaultData), new Date().toISOString(), new Date().toISOString());
    }
}

function getUserData() {
    const user = db.prepare('SELECT data_json FROM users WHERE username = ?').get('default');
    return user ? JSON.parse(user.data_json) : { fields: [] };
}

function saveUserData(data) {
    const result = db.prepare(`
        UPDATE users 
        SET data_json = ?, updated_at = ?
        WHERE username = ?
    `).run(JSON.stringify(data), new Date().toISOString(), 'default');
    
    return result.changes > 0;
}

function getSetting(key, defaultValue = null) {
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return setting ? JSON.parse(setting.value) : defaultValue;
}

function setSetting(key, value) {
    db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
    `).run(key, JSON.stringify(value), new Date().toISOString());
}

module.exports = {
    initDatabase,
    getUserData,
    saveUserData,
    getSetting,
    setSetting
};