
const db = require("./SqliteDb");

// Create or update player points
function upsertPlayerPoints(discordId, points) {
    return new Promise((resolve, reject) => {
        const query = ` INSERT INTO players_points (discord_id, points) 
                        VALUES (?, ?)
                        ON CONFLICT(discord_id) 
                        DO UPDATE SET points = points + ?
                        RETURNING points`;
        db.get(query, [discordId, points, points], function(err, row) {
            if (err) {
                reject(err);
            } else {
                resolve(row.points);
            }
        });
    });
}

function addPlayerPoints(discordId, pointsToAdd) {
    return new Promise((resolve, reject) => {
        const query = ` INSERT INTO players_points (discord_id, points)
                        VALUES (?, ?)
                        ON CONFLICT(discord_id)
                        DO UPDATE SET points = points + ?
                        RETURNING points`;
        db.get(query, [discordId, pointsToAdd, pointsToAdd], function(err, row) {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.points : null);
            }
        });
    });
}


// Read player points
function getPlayerPoints(discordId) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT points FROM players_points WHERE discord_id = ?';
        db.get(query, [discordId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.points : 0);
            }
        });
    });
}

// Delete player points
function deletePlayerPoints(discordId) {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM players_points WHERE discord_id = ?';
        db.run(query, [discordId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes);
            }
        });
    });
}


// Reset all players points and get top 3 players
function resetAllPlayersPoints() {
    return new Promise((resolve, reject) => {
        const topPlayersQuery = 'SELECT discord_id, points FROM players_points ORDER BY points DESC LIMIT 3';
        const resetQuery = 'UPDATE players_points SET points = 0';
        
        db.all(topPlayersQuery, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                db.run(resetQuery, function(err) {
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


module.exports = {
    upsertPlayerPoints,
    getPlayerPoints,
    deletePlayerPoints,
    addPlayerPoints,
    resetAllPlayersPoints
};