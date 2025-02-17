const Database = require('better-sqlite3');
const path = require('path');

// For storing all level data
const levelDb = new Database(path.resolve(__dirname, "data", "level.db"), { verbose: console.log });
levelDb.pragma('journal_mode = WAL');
// For storing all account data
const accountDb = new Database(path.resolve(__dirname, "data", "account.db"), { verbose: console.log });
accountDb.pragma('journal_mode = WAL');

// Database initialization, called before server launch
const initDatabases = () => {
    levelDb.exec(`
    CREATE TABLE IF NOT EXISTS levelTable (
        levelId TEXT PRIMARY KEY,
        levelName TEXT NOT NULL,
        author TEXT NOT NULL,
        lastUpdatedTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        levelType INTEGER NOT NULL
    )
    `);
    console.log("Level database initialized");
}

// Load the pre-made levels into the database
// This is a one-time operation, and should be manually called
const loadPremadeLevels = () => {
    const premade = require('./data/premade.json');
    // console.log(premade);
    for (let level of premade) {
        insertLevel(level.levelId, level.levelName, level.author, 0);
    }
}

// Find a level by its ID and retrieve it
const getLevel = (levelId) => {
    const stmt = levelDb.prepare('SELECT * FROM levelTable WHERE levelId = ?');
    return stmt.get(levelId);
}

// Check if a level exists in the database
const levelExists = (levelId) => {
    const stmt = levelDb.prepare('SELECT * FROM levelTable WHERE levelId = ?');
    return stmt.get(levelId) != undefined;
}

// Insert a level into the database, if it doesn't already exist
const insertLevel = (levelId, levelName, author, levelType, useSafeguard = true) => {
    // First check if the level already exists
    if (useSafeguard && levelExists(levelId)) {
        console.warn(`Level with levelId = ${levelId} already exists`);
        return;
    }
    const stmt = levelDb.prepare('INSERT INTO levelTable VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)');
    stmt.run(levelId, levelName, author, levelType);
}

module.exports = {
    initDatabases,
    loadPremadeLevels,
    getLevel
}