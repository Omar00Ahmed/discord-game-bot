
const db = require("./SqliteDb");

function upsertPlayerPoints(discordId, guildId, points) {
    return new Promise((resolve, reject) => {
        const query = ` INSERT INTO players_points (discord_id, guild_id, points) 
                        VALUES (?, ?, ?)
                        ON CONFLICT(discord_id, guild_id) 
                        DO UPDATE SET points = ?
                        RETURNING points`;
        db.get(query, [discordId, guildId, points, points], function(err, row) {
            if (err) {
                reject(err);
            } else {
                resolve(row.points);
            }
        });
    });
}

function addPlayerPoints(discordId, guildId, pointsToAdd) {
    return new Promise((resolve, reject) => {
        const query = ` INSERT INTO players_points (discord_id, guild_id, points)
                        VALUES (?, ?, ?)
                        ON CONFLICT(discord_id, guild_id)
                        DO UPDATE SET points = points + ?
                        RETURNING points`;
        db.get(query, [discordId, guildId, pointsToAdd, pointsToAdd], function(err, row) {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.points : null);
            }
        });
    });
}

function getPlayerPoints(discordId, guildId) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT points FROM players_points WHERE discord_id = ? AND guild_id = ?';
        db.get(query, [discordId, guildId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.points : 0);
            }
        });
    });
}

function deletePlayerPoints(discordId, guildId) {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM players_points WHERE discord_id = ? AND guild_id = ?';
        db.run(query, [discordId, guildId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes);
            }
        });
    });
}

function resetAllPlayersPoints(guildId) {
    return new Promise((resolve, reject) => {
        const topPlayersQuery = 'SELECT discord_id, points FROM players_points WHERE guild_id = ? ORDER BY points DESC LIMIT 3';
        const resetQuery = 'UPDATE players_points SET points = 0, kill_points = 0, task_points = 0 WHERE guild_id = ?';        
        db.all(topPlayersQuery, [guildId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                db.run(resetQuery, [guildId], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            changedRows: this.changes,
                            topPlayers: rows
                        });
                    }
                });
            }
        });
    });
}

function getTopPlayers(guildId, n) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT discord_id, points FROM players_points WHERE guild_id = ? ORDER BY points DESC LIMIT ?';
        db.all(query, [guildId, n], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    changedRows: this.changes,
                    topPlayers: rows
                });
            }
        });
    });
}

function resetPlayerPoints(discordId, guildId) {
    return new Promise((resolve, reject) => {
        const query = 'UPDATE players_points SET points = 0, kill_points = 0, task_points = 0 WHERE discord_id = ? AND guild_id = ?';  
        db.run(query, [discordId, guildId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes);
            }
        });
    });
}

function addKillPoint(discordId, guildId, points = 1){
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO players_points (discord_id, guild_id, kill_points)
                        VALUES (?, ?, ?)
                        ON CONFLICT (discord_id, guild_id)
                        DO UPDATE SET kill_points = COALESCE(players_points.kill_points, 0) + ?
                        RETURNING kill_points`;
        db.get(query, [points, discordId, guildId], function(err, row) {
            if (err) {
                reject(err);
            } else {
                resolve(row? row.kills : null);
            }
        });
    });
}
function addTaskPoint(discordId, guildId, points = 1){
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO players_points (discord_id, guild_id, task_points)
                        VALUES (?, ?, ?)
                        ON CONFLICT (discord_id, guild_id)
                        DO UPDATE SET task_points = COALESCE(players_points.task_points, 0) + ?
                        RETURNING task_points`;
        db.get(query, [points, discordId, guildId], function(err, row) {
            if (err) {
                reject(err);
            } else {
                resolve(row? row.task_points : null);
            }
        });
    });
}
function getKillPoints(discordId, guildId){
    return new Promise((resolve, reject) => {
        const query = `SELECT kill_points FROM players_points WHERE discord_id = ? AND guild_id = ?`;
        db.get(query, [discordId, guildId], function(err, row) {
            if (err) {
                reject(err);
            } else {
                resolve(row? row.kill_points : null);
            }
        });
    });
}

function getTaskPoints(discordId, guildId){
    return new Promise((resolve, reject) => {
        const query = `SELECT task_points FROM players_points WHERE discord_id =? AND guild_id =?`;
        db.get(query, [discordId, guildId], function(err, row) {
            if (err) {
                reject(err);
            } else {
                resolve(row? row.task_points : null);
            }
        });
    });
}

function getKillAndTasksAnalytics(guildId){
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                (SELECT GROUP_CONCAT(discord_id || ':' || kill_points) 
                    FROM (SELECT discord_id, kill_points 
                        FROM players_points 
                        WHERE guild_id = ? 
                        ORDER BY kill_points DESC LIMIT 5)) as top_kills,
                (SELECT GROUP_CONCAT(discord_id || ':' || task_points) 
                    FROM (SELECT discord_id, task_points 
                        FROM players_points 
                        WHERE guild_id = ? 
                        ORDER BY task_points DESC LIMIT 5)) as top_tasks`;
        db.get(query, [guildId, guildId], function(err, row) {
            if (err) {
                reject(err);
            } else {
                if (!row) {
                    resolve(null);
                } else {
                    const result = {
                        topKills: row.top_kills ? row.top_kills.split(',').map(item => {
                            const [id, points] = item.split(':');
                            return {discordId: id, points: parseInt(points)};
                        }) : [],
                        topTasks: row.top_tasks ? row.top_tasks.split(',').map(item => {
                            const [id, points] = item.split(':');
                            return {discordId: id, points: parseInt(points)};
                        }) : []
                    };
                    resolve(result);
                }
            }
        });
});
}

function addTototalGames(discordId, guildId){
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO players_points (discord_id, guild_id, total_games)
                        VALUES (?, ?, ?)
                        ON CONFLICT (discord_id, guild_id)
                        DO UPDATE SET total_games = COALESCE(players_points.total_games, 0) + 1
                        RETURNING total_games`;
        db.get(query, [discordId, guildId], function(err, row) {
            if (err) {
                reject(err);
            } else {
                resolve(row? row.total_games : null);
            }
        });
    });
}

function addTotalAmoungUsGames(discordId, guildId){
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO players_points (discord_id, guild_id, total_amoungus_games)
                        VALUES (?, ?, ?)
                        ON CONFLICT (discord_id, guild_id)
                        DO UPDATE SET total_amoungus_games = COALESCE(players_points.total_amoungus_games, 0) + 1
                        RETURNING total_amoungus_games`;
        db.get(query, [discordId, guildId], function(err, row) {
            if (err) {
                reject(err);
            } else {
                resolve(row? row.total_amoungus_games : null);
            }
        });
    });
}






module.exports = {
    upsertPlayerPoints,
    getPlayerPoints,
    deletePlayerPoints,
    addPlayerPoints,
    resetAllPlayersPoints,
    getTopPlayers,
    resetPlayerPoints,
    addKillPoint,
    addTaskPoint,
    getKillPoints,
    getTaskPoints,
    getKillAndTasksAnalytics,
    addTototalGames,
    addTotalAmoungUsGames,
};