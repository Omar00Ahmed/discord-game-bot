const {PermissionsBitField} = require("discord.js");
const execute = async (message) => {
    
    if (!message.content.startsWith('-')) return;

    const args = message.content.slice('-'.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();    console.log(command);
    
    if (command === 'فوضى') {
        if(!(message.author.bot || message.member.permissions.has(PermissionsBitField.Flags.Administrator))) return;
        const startGameCommand = require('../../utils/games/gamesStarter');
        await startGameCommand.execute(message, args);
    }
}

module.exports = {
    execute
};