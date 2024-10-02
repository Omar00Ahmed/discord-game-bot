const sqlite3 = require('sqlite3').verbose();

// Create a new SQLite database file
const db = new sqlite3.Database('sanalikus.db',sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to the SQLite database.');
    }
});


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
