const db = require("./SqliteDb");

async function muteUser(guild, user, muteTime) {
    const muteRole = guild.roles.cache.find(role => role.name === 'Muted');
    muteTime *= 1000
    if (!muteRole) return console.log('Mute role not found');
    
    const member = await guild.members.fetch(user.id);
    await member.roles.add(muteRole);
    const currentDate = Date.now()
    const muteEnd = currentDate + (muteTime);

    
    // Store mute details in SQLite
    db.run(`INSERT OR REPLACE INTO muted_users (user_id, guild_id,mute_Start ,mute_end) VALUES (?, ?, ?, ?)`,
        [user.id, guild.id,currentDate ,muteEnd]);

    // Set a timeout to unmute the user
    setTimeout(() => unmuteUser(guild, user.id), muteTime);
}

function unmuteUser(guild, userId) {
    const muteRole = guild.roles.cache.find(role => role.name === 'Muted');
    if (!muteRole) return console.log('Mute role not found');

    guild.members.fetch(userId).then(member => {
        member.roles.remove(muteRole).then(() => {
            console.log(`${userId} has been unmuted.`);
            
            // Update the database to mark the user as unmuted
            db.run(`UPDATE muted_users SET unmuted = 1 WHERE user_id = ?`, [userId], function(err) {
                if (err) {
                    console.error('Failed to update unmute status:', err);
                } else {
                    console.log(`User ${userId} marked as unmuted in the database.`);
                }
            });
        });
    });
}


async function getAllMutedUsers(){
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM muted_users WHERE unmuted == 0", [], (err, rows) => {
            if (err) {
                return reject(err); 
            }
            resolve(rows); 
        });
    });

}

async function getAllUsers(){
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM muted_users", [], (err, rows) => {
            if (err) {
                return reject(err); 
            }
            resolve(rows); 
        });
    });
}


module.exports = {
    muteUser,
    unmuteUser,
    getAllMutedUsers,
    getAllUsers
}

