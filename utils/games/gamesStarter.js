const { client } = require('../..');
const AmongUsGame = require('./amoungs');
const {ChannelType} = require("discord.js")
const { joinVoiceChannel, createAudioPlayer,createAudioResource } = require('@discordjs/voice');
const path = require("path");
const player = createAudioPlayer();

const gameVoiceChanelId = "1295171888561258506";
const allowedChannels = ["1300852265258586212"];

module.exports = {
  name: 'start_game',
  async execute(message) {
    if (message.channel.type !== ChannelType.GuildText) {
      return message.reply('This command can only be used in a server text channel.');
    }

    const existingGame = client.games.get(message.channelId);
    if (existingGame || Array.from(client?.gamesStarted.values()).some(game => game.channelId === message.channelId)) {
      return message.reply('A game is already in progress in this channel.');
    }
    if (!allowedChannels.includes(message.channelId)) {
      return message.reply(`\nلا يمكن بدأ اللعبة في هذه القناة , يمكنك البدأ في ${allowedChannels.map(channel => `<#${channel}>`).join('\n')}`);
    }
    const voiceChannel = message.guild.channels.cache.get(gameVoiceChanelId);
    if (!voiceChannel) {
      return message.reply('Could not find the voice channel for the game.');
    }
    
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    })


    const game = new AmongUsGame(message.channel,connection,player);
    message.client.games.set(message.channelId, game);
    await game.startLobby();
    await message.reply('لعبة امونج اص جديدة على وشك البدء! انضموا إلى اللوبي 🚀🕹️');
    soundFile = path.join(__dirname, '../../public/sounds', 'amogus.mp3');
    const resource = createAudioResource(soundFile);
    player.play(resource);
    connection.subscribe(player);
    
  },
};

//games