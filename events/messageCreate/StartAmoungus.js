const execute = async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith('-%-')) return;

    const args = message.content.slice('-%-'.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();    console.log(command);
    
    if (command === 'فوضى') {
        const startGameCommand = require('../../utils/games/gamesStarter');
        await startGameCommand.execute(message, args);
    }
}

module.exports = {
    execute
};