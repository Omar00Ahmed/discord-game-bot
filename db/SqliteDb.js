const sqlite3 = require('sqlite3').verbose();

// Create a new SQLite database file
const db = new sqlite3.Database('sanalikus.db',sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to the SQLite database.');
    }
});



// const createPlayersPointsTable = `
// CREATE TABLE IF NOT EXISTS players_points (
//     discord_id TEXT PRIMARY KEY,
//     points INTEGER DEFAULT 0
// );`;

// db.run(createPlayersPointsTable, (err) => {
//     if (err) {
//         console.error('Error creating players_points table:', err);
//     } else {
//         console.log('players_points table created successfully.');
//     }
// });



db.run(`DROP TABLE IF EXISTS players_points_temp`);

db.run(`CREATE TABLE players_points_temp (
    discord_id TEXT,
    guild_id TEXT default '999450379152527431',
    points INTEGER DEFAULT 0,
    kill_points INTEGER DEFAULT 0,
    task_points INTEGER DEFAULT 0,
    total_games INTEGER DEFAULT 0,
    total_amoungus_games INTEGER DEFAULT 0,
    PRIMARY KEY (discord_id, guild_id)
)`);

db.run(`CREATE INDEX idx_points ON players_points_temp(points)`);
db.run(`CREATE INDEX idx_kill_points ON players_points_temp(kill_points)`);
db.run(`CREATE INDEX idx_task_points ON players_points_temp(task_points)`);
db.run(`CREATE INDEX idx_total_games ON players_points_temp(total_games)`);
db.run(`CREATE INDEX idx_total_amoungus_games ON players_points_temp(total_amoungus_games)`);

db.run(`INSERT INTO players_points_temp (discord_id, guild_id, points, kill_points, task_points)
        SELECT discord_id, '999450379152527431', points, kill_points, task_points 
        FROM players_points`);

db.run(`DROP TABLE players_points`);

db.run(`ALTER TABLE players_points_temp RENAME TO players_points`);

// db.run(`ALTER TABLE muted_users ADD COLUMN unmuted INTEGER DEFAULT 0`);


// db.run(`DROP TABLE IF EXISTS muted_users`, (err) => {
//     if (err) {
//         console.error('Error dropping muted_users table:', err);
//     } else {
//         console.log('muted_users table dropped successfully.');
//     }
// });


// const createUsersMuteTable = `
// CREATE TABLE IF NOT EXISTS muted_users (
//     user_id TEXT,
//     guild_id TEXT,
//     mute_start INTEGER,  -- Store the start time of the mute
//     mute_end INTEGER,    -- Store the end time of the mute
//     unmuted INTEGER DEFAULT 0,  -- 0 = still muted, 1 = unmuted
//     PRIMARY KEY (user_id, mute_end)  -- Composite Primary Key
// );`;

// db.run(createUsersMuteTable, (err)=>{
//     if(err){
//         console.error('Error creating muted_users table:', err);
//     } else {
//         console.log('muted_users table created successfully.');
//     }
// });




module.exports = db;
