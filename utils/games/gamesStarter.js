const AmongUsGame = require('./amoungs');

module.exports = {
  name: 'start_game',
  async execute(message, args) {
    if (message.channel.type !== 'GUILD_TEXT') {
      return message.reply('This command can only be used in a server text channel.');
    }

    const existingGame = message.client.games.get(message.channelId);
    if (existingGame) {
      return message.reply('A game is already in progress in this channel.');
    }

    const game = new AmongUsGame(message.channel);
    message.client.games.set(message.channelId, game);
    await game.startLobby();
    await message.reply('A new Among Us game is starting! Join the lobby.');
  },
};