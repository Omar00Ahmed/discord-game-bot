const express = require('express')
const app = express()
const path = require('path');
const { json } = require('stream/consumers');
const port = 3000
const {ChannelType} = require("discord.js")
const announcementsChannelId = "1280643923093618702";

app.use(express.json())
app.use(express.urlencoded({ extended: true }));
const execute =  (client) => {
    console.log(`Bot is logged in as ${client.user.tag}`);
    client.lobbies = {};
    client.countdownIntervals = {};
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../../Dashboard/index.html'));

    })
    // get all channels id in specific guild
    app.get('/channelsId', (req, res) => {
        const guildId = "999450379152527431"; // replace with your guild id
        const channels = client.guilds.cache.get(guildId).channels.cache;
        res.json(channels.filter(c => c.type === ChannelType.GuildText).map(c => {
            return { id: c.id, name: c.name, type: c.type };
        }));
    });

    app.post('/submit', (req, res) => {
        const {input , channel} = req.body;
        console.log(req.body);
        
        res.send(JSON.stringify({
            success: true,
            message: 'Announcement submitted successfully!'
        }));
        client.channels.cache.get(channel).send(input);
    });

        
    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    })
}


module.exports = {
    execute,
    app
};



