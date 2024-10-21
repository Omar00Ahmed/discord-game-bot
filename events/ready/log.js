const {ChannelType} = require("discord.js")
const announcementsChannelId = "1280643923093618702";


const execute =  (client) => {
    console.log(`Bot is logged in as ${client.user.tag}`);
    client.lobbies = {};
    client.countdownIntervals = {};
    
}


module.exports = {
    execute,
    
};



