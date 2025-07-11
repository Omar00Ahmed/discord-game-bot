const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require("dotenv").config();







const client = new Client(
    { intents: 
        [GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessagePolls,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
        ],
        presence:{
            status: "online",
            activity: {
                name: "with your games",
                type: "LISTENING"
            },
            afk: false
        }
        
    }
);
client.SayChannels = {};
client.gamesStarted = new Map();
client.games = new Map();

// Function to dynamically load event functions from folders
const loadEvents = (client) => {
    const eventFolders = fs.readdirSync(path.join(__dirname, 'events'));
    
    for (const folder of eventFolders) {
        const eventFiles = fs.readdirSync(path.join(__dirname, `events/${folder}`)).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const eventFunction = require(`./events/${folder}/${file}`);
            client.on(folder, (...args) => eventFunction.execute(...args, client));
        }
    }
};

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Handle the error, e.g., log it or restart the bot
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Handle the error, e.g., log it or restart the bot
});

// client.on("shardDisconnect",(closeEvent,sharedId)=>{
//     const logChannelId = "1295016440184836157"
//     console.log(`Shard ${sharedId} disconnected! Reconnecting...`);
//     client.destroy();
//     client.login(process.env.DISCORD_TOKEN);
//     client.channels.cache.get(logChannelId).send(`Shard ${sharedId} disconnected! Reconnecting...`);
// })



loadEvents(client);

client.login(process.env.DISCORD_TOKEN);

module.exports = {
    client
}