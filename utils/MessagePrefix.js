const Guild = require("../mongoose/Schema/Guild");
const prefix = "$-$";

const cachedPrefixes = new Map();

const getGuildPrefix = async (guildID) => {
    if (cachedPrefixes.has(guildID)) {
        console.log("Cached prefix found for guildID:", guildID);
        return cachedPrefixes.get(guildID);
    }

    const guild = await Guild.findOne({ guildID });
    const guildPrefix = guild ? guild.globalMessagePrefix : prefix;
    
    cachedPrefixes.set(guildID, guildPrefix);
    return guildPrefix;
};
module.exports = {
    prefix,
    getGuildPrefix,
}