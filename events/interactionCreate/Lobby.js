const { LeaderSettings } = require('../../components/LeaderSettings');
const {LobbyComponent} = require("../../components/LobbyEmbed")
const {checkCommand} = require("../../utils/checkCommands")

async function execute(interaction, client) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    const [leaderPrefix,action, userId, value] = interaction.customId.split("_");

    // Check if the interactor is the leader
    if (interaction.customId.includes("isleaderSettings")) {
        if(interaction.user.id !== userId){
            return interaction.reply({ content: "You are not the leader!", ephemeral: true });
        }
    }

    if(!checkCommand([
        'playerSelect',
        'categorySelect',
        'kickAllowed',
        'kickRounds',
        'winningPointsSelect',
        'next',
        'cancelbutton'
    ],action)) return

    console.log("test");
    

    let lobby = client.lobbies[userId] || { step: 'players' };

    switch (action) {
        case 'playerSelect':
            lobby.playersCount = interaction.values[0];
            lobby.step = 'category';
            break;
        case 'categorySelect':
            lobby.categories = interaction.values; // Store multiple selected categories
            lobby.step = 'kickAllowed';
            break;
        case 'kickAllowed':
            lobby.kickAllowed = value === 'true';
            lobby.step = lobby.kickAllowed ? 'kickRounds' : 'winningPoints';
            break;
        case 'kickRounds':
            lobby.kickRounds = parseInt(value);
            lobby.step = 'winningPoints';
            break;
        case 'winningPointsSelect':
            console.log(interaction.values);
            lobby.winningPoints = parseInt(interaction.values[0]);
            lobby.step = 'complete';
            break;

            case 'next':
                if (lobby.step === 'complete') {
                    console.log(lobby);
                    lobby.team1 = [lobby.owner];
                    lobby.team2 = [];
                    const { embed, components } = LobbyComponent(lobby, userId);
                    await interaction.channel.send({ embeds: [embed], components, content: "|| @everyone ||" });
                    return interaction.update({
                        content: 'Settings are complete. Starting the game...',
                        embeds: [
                            {
                                title: 'Game Settings',
                                fields: [
                                    { name: 'Players', value: lobby.playersCount || 'Not set' },
                                    { name: 'Categories', value: lobby.categories ? lobby.categories.join(', ') : 'Not set' },
                                    { name: 'Kick Allowed', value: lobby.kickAllowed ? 'Yes' : 'No' },
                                    { name: 'Kick Rounds', value: lobby.kickRounds?.toString() || 'Not set' },
                                    { name: 'Winning Points', value: lobby.winningPoints?.toString() || 'Not set' }
                                ]
                            }
                        ],
                        components: []
                    });
                }
                break;            
        case 'cancelbutton':
            if (client?.lobbies[userId]?.startTimeOut) {
                clearTimeout(client.lobbies[userId].startTimeOut);
            }
            await interaction.channel?.delete();
            delete client?.lobbies[userId];
            return;
    }

    client.lobbies[userId] = lobby;

    const { embed, components } = LeaderSettings(lobby, userId);
    await interaction.update({ embeds:[embed], components });
}

module.exports = {
    execute
};


