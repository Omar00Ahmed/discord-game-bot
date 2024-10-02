const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const LobbyComponent = (lobby,lobbyId) => {
    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Game Lobby')
        .setDescription('Join a team, leave, or switch teams');

    const team1 = lobby.team1 || [];
    const team2 = lobby.team2 || [];
    const maxPlayers = lobby.playersCount ? parseInt(lobby.playersCount.split('v')[0]) : 5; // Default to 5v5 if not set
    const isFull = team1.length === maxPlayers && team2.length === maxPlayers;

    embed.addFields(
        { name: `Team 1 (${maxPlayers} / ${team1.length})`, value: team1.length > 0 ? team1.map(player =>{
            return `- <@${player}>`;
        }).join('\n') : 'Empty', inline: true },
        { name: `Team 2 (${maxPlayers} / ${team2.length})`, value: team2.length > 0 ? team2.map(player =>{
            return `- <@${player}>`;
        }).join('\n') : 'Empty', inline: true }
    );

    

    if (isFull && lobby.countdownStartTime) {
        const timeLeft = Math.max(0, 5 - Math.floor((Date.now() - lobby.countdownStartTime) / 1000));
        embed.setFooter({ text: `Game starting in ${timeLeft} seconds...` });
    }

    const joinTeam1Button = new ButtonBuilder()
        .setCustomId(`joinTeam1_${lobbyId}`)
        .setLabel('Join Team 1')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(team1.length >= maxPlayers || isFull);

    const joinTeam2Button = new ButtonBuilder()
        .setCustomId(`joinTeam2_${lobbyId}`)
        .setLabel('Join Team 2')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(team2.length >= maxPlayers || isFull);

    const leaveButton = new ButtonBuilder()
        .setCustomId(`leaveLobby_${lobbyId}`)
        .setLabel('Leave Lobby')
        .setStyle(ButtonStyle.Danger);

    const components = [
        new ActionRowBuilder().addComponents(joinTeam1Button, joinTeam2Button, leaveButton)
    ];
    
    return { embed, components };
};

const updateLobby = (lobby, userId, action) => {
    const maxPlayers = lobby.playersCount ? parseInt(lobby.playersCount.split('v')[0]) : 5;

    
    switch (action) {
        case 'joinTeam1':
            if (lobby.team1.length < maxPlayers && !lobby.team1.includes(userId) && !lobby.team2.includes(userId)) {
                lobby.team1.push(userId);
                
            }
            break;
        case 'joinTeam2':
            if (lobby.team2.length < maxPlayers && !lobby.team1.includes(userId) && !lobby.team2.includes(userId)) {
                lobby.team2.push(userId);
            }
            break;
        case 'leaveLobby':
            lobby.team1 = lobby.team1.filter(id => id !== userId);
            lobby.team2 = lobby.team2.filter(id => id !== userId);
            if(lobby.countdownStartTime){
                lobby.countDownCanceled = true;
                delete lobby.countdownStartTime;
            }
            break;
    }

    const isFull = lobby.team1.length === maxPlayers && lobby.team2.length === maxPlayers;

    if (isFull && !lobby.countdownStartTime) {
        lobby.countdownStartTime = Date.now();
        lobby.countDownCanceled = false;
    } else if (!isFull && lobby.countdownStartTime) {
        delete lobby.countdownStartTime;
    }

    return lobby;
};

const checkGameStart = (lobby) => {
    if (lobby.countdownStartTime) {
        const timeElapsed = (Date.now() - lobby.countdownStartTime) / 1000;
        if (timeElapsed >= 5) {
            return true;
        }
    }
    return false;
};

module.exports = {
    LobbyComponent,
    updateLobby,
    checkGameStart
};