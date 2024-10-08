const execute = async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith('-')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'start_game') {
        const startGameCommand = require('../../utils/games/gamesStarter');
        await startGameCommand.execute(message, args);
    }
}