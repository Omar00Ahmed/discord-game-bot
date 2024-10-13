const { Message, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { prefix } = require("../../utils/MessagePrefix");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus,VoiceConnectionStatus } = require('@discordjs/voice');
const path = require('path');
const { checkIfCanMute } = require("../../utils/WhoCanMute");

const player = createAudioPlayer();

/**
 * @param {Message} message The message object
 */
const execute = async (message, client) => {
    if (message.author.bot) return;
    const [command, thePlayer, soundName] = message.content.split(" ");

    const member = message.member;
    if(!checkIfCanMute(member,"develop"))return;

    if (message.content.startsWith(`${prefix}joinme`)) {
        console.log("Joining voice channel...");
        
        const voiceChannel = message.mentions.members.first().voice.channel;
        
        if (!voiceChannel) {
            return message.reply('You need to be in a voice channel for me to join!');
        }

        try {
            // Join the voice channel
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            let soundFile;
            // Play a specific sound when a message is sent
            switch(soundName){
                case "amongus":
                    soundFile = path.join(__dirname, '../../public/sounds', 'pop-39222.mp3');
                    break;
                case "amogus":
                    soundFile = path.join(__dirname, '../../public/sounds', 'amogus.mp3');
                    break;
                default:
                    soundFile = path.join(__dirname, '../../public/sounds', 'amogus.mp3');
                    break;
            }

            
            const resource = createAudioResource(soundFile);

            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Playing, () => {
                console.log('Playing sound...');
            });

            player.on('error', error => {
                console.error('Error playing audio:', error);
            });
            
            const replyMessage = await message.reply('Joined your voice channel and playing sound!');

            player.on(AudioPlayerStatus.Idle, async () => {
                console.log('Finished playing!');
                if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
                    connection.destroy();
                    await message.delete();
                    await replyMessage.delete();
                }
            });

            
        } catch (error) {
            console.error('Error joining voice channel:', error);
            message.reply('There was an error joining the voice channel. Please try again.');
        }
    }
};

module.exports = { execute };
