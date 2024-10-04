const { LobbyComponent, updateLobby, checkGameStart } = require("../../components/LobbyEmbed");
const { startGame } = require("../../utils/gameFightsLogic");
const execute = async (interaction, client) => {
    if (!interaction.isButton()) return;

    const [action, lobbyId] = interaction.customId.split('_');
    let lobby = client.lobbies[lobbyId] || { team1: [], team2: [], playersCount: '5v5' };
    const userId = interaction.user.id;

    if (['joinTeam1', 'joinTeam2', 'leaveLobby'].includes(action)) {
        const prevLobby = { ...lobby };
        lobby = updateLobby(lobby, userId, action);
        client.lobbies[lobbyId] = lobby;

        const updatedLobbyMessage = LobbyComponent(lobby, lobbyId);
        await interaction.update({ embeds: [updatedLobbyMessage.embed], components: updatedLobbyMessage.components });

        // Check if countdown should be cancelled
        if (action === 'leaveLobby' && prevLobby.countdownStartTime && !lobby.countdownStartTime) {
            if (client.countdownIntervals[lobbyId]) {
                clearInterval(client.countdownIntervals[lobbyId]);
                delete client.countdownIntervals[lobbyId];
            }
        }

        // Check if the game should start
        if (checkGameStart(lobby)) {
            await startGame(interaction, lobby, client);
        } else if (lobby.countdownStartTime && !client?.countdownIntervals?.lobbyId) {
            // If countdown is active and not already running, start the interval
            client.countdownIntervals[lobbyId] = setInterval(async () => {
                const currentLobby = client.lobbies[lobbyId];
                console.log("here 1 !")
                if (checkGameStart(currentLobby)) {
                    clearInterval(client?.countdownIntervals[lobbyId]);
                    delete client.countdownIntervals[lobbyId];
                    console.log("here !");
                    await startGame(interaction, currentLobby, client);
                } else if (!currentLobby.countdownStartTime) {
                    clearInterval(client?.countdownIntervals[lobbyId]);
                    delete client.countdownIntervals[lobbyId];
                    await interaction.channel.send("Countdown canceled.");
                } else {
                    const updatedMessage = LobbyComponent(currentLobby, lobbyId);
                    await interaction.message.edit({ embeds: [updatedMessage.embed], components: updatedMessage.components });
                }
            }, 1000);
        }
    }
};

// async function startGame(interaction, lobby, client) {
//     await interaction.channel.send("Starting the game!");
//     // Implement your game start logic here
//     delete client.lobbies[interaction.message.id];
//     if (client.countdownIntervals[interaction.message.id]) {
//         clearInterval(client.countdownIntervals[interaction.message.id]);
//         delete client.countdownIntervals[interaction.message.id];
//     }
// }

module.exports = {
    execute
};