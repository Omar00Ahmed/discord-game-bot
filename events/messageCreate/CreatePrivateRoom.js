const { Client, Intents, Permissions,ChannelType,PermissionsBitField,Message } = require('discord.js');
const {prefix} = require("../../utils/MessagePrefix")
const {LeaderSettings} = require("../../components/LeaderSettings");
const { client } = require('../..');
/**
 * @param {Message} message The date
 */
async function execute(message,client) {
    if (message.author.bot) return; // Ignore bot messages

    // Command to create a private channel
    if (message.content.startsWith(`${prefix}روم`)) {
        const channelName = `${message.author.username}-gameroom`; // Extract channel name
        
        if(client?.lobbies[message.author.id]){
            return message.reply("لقد قمت بإنشاء غرفة بالفعل من قبل , برجاء حذف الغرفة السابقة");
        }

        if (!channelName) {
            return message.reply('Please provide a channel name!');
        }
        

        try {
            // Create a new text channel with permissions
            const channel = await message.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent:"1283954816946667610",
                permissionOverwrites: [
                    {
                        id: message.guild.id, // Deny access to @everyone
                        deny: [PermissionsBitField.Flags.SendMessages],
                    },
                ],
            });
            
            client.lobbies[message.author.id] = {
                startTimeOut:null,
                owner:message.author.id
            };

            const lobby = {
                players: [],
                maxPlayers: 4,
                step:"players",
                team1: [],
                team2: []
            };

            const {embed,components} = LeaderSettings(lobby,message.author.id)

            // Send settings message 
            await channel.send({ embeds: [embed], components: components });

            message.reply(`قام اللاعب ${message.author} بإنشاء غرفة اضغط ${channel} للإنضمام`);
            // client.lobbies[message.author.id].startTimeOut =  setTimeout(() => {
            //     channel.send(`${client?.lobbies[message.author.id]?.playersCount}`)
            // }, 10000);
        } catch (error) {
            console.error('حدث خطأ اثناء انشاء الغرفة:', error);
            message.reply('حدث خطأ اثناء محاولة إنشاء الغرفة');
        }
    }
}

module.exports = {
    execute,
    
}