const { Message, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { prefix } = require("../../utils/MessagePrefix");

// const sayLogChannelId = "1279470539437637683";
const recieverChannel = "1292188787128008714";

/**
 * @param {Message} message The message object
 */
const execute = async (message,client) => {
    if (message.author.bot) return;
    
    const receiverChannel = message.guild.channels.cache.get(recieverChannel);
    
    if(message.channel.id != receiverChannel) return

    if(message.content.startsWith(`${prefix}setwnsa`)){
        const channel = message.mentions.channels.first();
        
        if(!channel){
            return message.reply('Please provide a valid channel!');
        }
        client.SayChannels[`${message.guild.id}_${message.channel.id}`] = channel;
        message.channel.send(`setted <#${channel.id}> to send messages`);
    }else{
        const channel = client.SayChannels[`${message.guild.id}_${message.channel.id}`];
        if(!channel){
            return message.reply('No channel set for this server! please set it via -set #channel-name');
        }
        const messageToSend = message.content;

        channel.send(`# ${messageToSend}`);
        message.reply(`sent message to $${channel} successfuly`)
    }
    
    
};

module.exports = { execute };
