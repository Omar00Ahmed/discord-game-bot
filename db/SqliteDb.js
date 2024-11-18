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



async function  execute (){
    await new Promise((resolve, reject) => {
        db.run(`DROP TABLE IF EXISTS players_points_temp`, (err) => {
            if (err) {
                console.error('Error dropping players_points_temp table:', err);
                reject(err);
            }
            resolve();
        });
    });
    
    await new Promise((resolve, reject) => {
        db.run(`CREATE TABLE players_points_temp (
            discord_id TEXT,
            guild_id TEXT default '999450379152527431',
            points INTEGER DEFAULT 0,
            kill_points INTEGER DEFAULT 0,
            task_points INTEGER DEFAULT 0,
            total_games INTEGER DEFAULT 0,
            total_amoungus_games INTEGER DEFAULT 0,
            PRIMARY KEY (discord_id, guild_id)
        )`, (err) => {
            if (err) {
                console.error('Error creating players_points_temp table:', err);
                reject(err);
            }
            resolve();
        });
    });
    
    await new Promise((resolve, reject) => {
        db.run(`CREATE INDEX idx_points ON players_points_temp(points)`, (err) => {
            if (err) {
                console.error('Error creating idx_points index:', err);
                reject(err);
            }
            resolve();
        });
    });
    
    await new Promise((resolve, reject) => {
        db.run(`CREATE INDEX idx_kill_points ON players_points_temp(kill_points)`, (err) => {
            if (err) {
                console.error('Error creating idx_kill_points index:', err);
                reject(err);
            }
            resolve();
        });
    });
    
    await new Promise((resolve, reject) => {
        db.run(`CREATE INDEX idx_task_points ON players_points_temp(task_points)`, (err) => {
            if (err) {
                console.error('Error creating idx_task_points index:', err);
                reject(err);
            }
            resolve();
        });
    });
    
    await new Promise((resolve, reject) => {
        db.run(`CREATE INDEX idx_total_games ON players_points_temp(total_games)`, (err) => {
            if (err) {
                console.error('Error creating idx_total_games index:', err);
                reject(err);
            }
            resolve();
        });
    });
    
    await new Promise((resolve, reject) => {
        db.run(`CREATE INDEX idx_total_amoungus_games ON players_points_temp(total_amoungus_games)`, (err) => {
            if (err) {
                console.error('Error creating idx_total_amoungus_games index:', err);
                reject(err);
            }
            resolve();
        });
    });
    
    await new Promise((resolve, reject) => {
        db.run(`INSERT INTO players_points_temp (discord_id, guild_id, points, kill_points, task_points)
                SELECT discord_id, '999450379152527431', points, kill_points, task_points 
                FROM players_points`, (err) => {
            if (err) {
                console.error('Error inserting data into players_points_temp:', err);
                reject(err);
            }
            resolve();
        });
    });
    
    await new Promise((resolve, reject) => {
        db.run(`DROP TABLE players_points`, (err) => {
            if (err) {
                console.error('Error dropping players_points table:', err);
                reject(err);
            }
            resolve();
        });
    });
    
    await new Promise((resolve, reject) => {
        db.run(`ALTER TABLE players_points_temp RENAME TO players_points`, (err) => {
            if (err) {
                console.error('Error renaming players_points_temp table:', err);
                reject(err);
            }
            resolve();
        });
    });}

// execute();


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
