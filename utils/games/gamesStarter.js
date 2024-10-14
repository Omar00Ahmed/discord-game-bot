const { client } = require('../..');
const AmongUsGame = require('./amoungs');
const {ChannelType} = require("discord.js")
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus,VoiceConnectionStatus } = require('@discordjs/voice');

const player = createAudioPlayer();

const gameVoiceChanelId = "1295171888561258506";

module.exports = {
  name: 'start_game',
  async execute(message) {
    if (message.channel.type !== ChannelType.GuildText) {
      return message.reply('This command can only be used in a server text channel.');
    }

    const existingGame = client.games.get(message.channelId);
    if (existingGame) {
      return message.reply('A game is already in progress in this channel.');
    }

    const voiceChannel = message.guild.channels.cache.get(gameVoiceChanelId);
    if (!voiceChannel) {
      return message.reply('Could not find the voice channel for the game.');
    }
    
    const connection = await joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    })


    const game = new AmongUsGame(message.channel,connection,player);
    message.client.games.set(message.channelId, game);
    await game.startLobby();
    await message.reply('A new Among Us game is starting! Join the lobby.');
    
  },
};