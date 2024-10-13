const { client } = require('../..');
const AmongUsGame = require('./amoungs');
const {ChannelType} = require("discord.js")

module.exports = {
  name: 'start_game',
  async execute(message, client) {
    if (message.channel.type !== ChannelType.GuildText) {
      return message.reply('This command can only be used in a server text channel.');
    }

    const existingGame = client.games.get(message.channelId);
    if (existingGame) {
      return message.reply('A game is already in progress in this channel.');
    }

    const game = new AmongUsGame(message.channel,client);
    message.client.games.set(message.channelId, game);
    await game.startLobby();
    await message.reply('A new Among Us game is starting! Join the lobby.');
  },
};