const Guild = require("../mongoose/Schema/Guild");
const prefix = "$-$";


const getGuildPrefix = async (guildID) => {
    const guild = await Guild.findOne({ guildID });
    return guild ? guild.globalMessagePrefix : prefix;
};

module.exports = {
    prefix,
    getGuildPrefix,
}