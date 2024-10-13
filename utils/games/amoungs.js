const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection,StringSelectMenuBuilder } = require('discord.js');
const {Sleep} = require("../../utils/createDelay");
const {checkIfCanMute} = require("../../utils/WhoCanMute")
const path = require("path")

const {client} = require("../../index")

class AmongUsGame {
  constructor(channel,theClient) {
    this.channel = channel;
    // this.client = theClient;
    this.players = new Map();
    this.places = [
      'staduim', 'cafeteria', 'gym', 'house1', 'house2',
      'library', 'market', 'pool', 'stairs'
    ];
    this.tasks = new Map();
    this.imposters = new Set();
    this.gameState = 'lobby';
    this.roundNumber = 0;
    this.deadBodies = new Map();
    this.votes = new Collection();
    this.playerInteractions = new Map();
    this.completedTasks = new Set();
    this.reportedThisRound = false;
    this.deadPlayers = new Set();
    this.lastHintRound = 0;

    // Timer values as class members
    this.lobbyWaitTime =  30000; // 1 minute
    this.choosePlaceTime = 30000; // 30 seconds
    this.actionTime = 30000; // 30 seconds
    this.votingTime = 60000; // 1 minute
  }

  async startLobby() {
    const embed = this.createLobbyEmbed();

    const joinButton = new ButtonBuilder()
      .setCustomId('join_game')
      .setLabel('Join Game')
      .setStyle(ButtonStyle.Primary);

    const startButton = new ButtonBuilder()
      .setCustomId('start_game')
      .setLabel('Start Game')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(joinButton, startButton);

    const lobbyMessage = await this.channel.send({ embeds: [embed], components: [row] });

    const filter = i => ['join_game', 'start_game'].includes(i.customId);
    const collector = lobbyMessage.createMessageComponentCollector({ filter, time: this.lobbyWaitTime });

    collector.on('collect', async i => {
      try {
        if (i.customId === 'join_game') {
          if (!this.players.has(i.user.id)) {
            this.players.set(i.user.id, { id: i.user.id, name: i.user.displayName, place: null, isDead: false });
            this.playerInteractions.set(i.user.id, i);
            await i.reply({ content: 'You have joined the game!', ephemeral: true });
          } else {
            await i.reply({ content: 'You have already joined the game!', ephemeral: true });
          }
        } else if (i.customId === 'start_game') {
          const member = await i.guild.members.fetch(i.user.id);
          if (!this.checkIfCanMute(member, "startGame")) return;
          if (this.players.size >= 4) {
            this.gameState = 'waiting';
            collector.stop();
            this.startGame();
          } else {
            await i.reply({ content: 'Not enough players to start the game!', ephemeral: true });
          }
        }
    
        await lobbyMessage.edit({ embeds: [this.createLobbyEmbed()] });
      } catch (error) {
        console.error('Error handling interaction:', error);
      }
    });

    collector.on('end', collected => {
      if (this.gameState === "lobby") {
        this.channel.send('Not enough players joined. Game cancelled.');
        client.games.delete(this.channel.id);
        lobbyMessage.edit({ embeds: [this.createLobbyEmbed()], components: [] });
      }
    });
  }



  createLobbyEmbed() {
    return new EmbedBuilder()
      .setTitle('Among Us Game Lobby')
      .setDescription('Join the game! (4-10 players)')
      .addFields({ name: 'Players', value: this.getPlayerList() })
      .setColor('#00ff00');
  }

  getPlayerList() {
    return this.players.size > 0 
      ? Array.from(this.players.values()).map(p => `<@${p.id}>`).join('\n')
      : 'No players yet';
  }

  async startGame() {
    this.gameState = 'playing';
    this.assignRoles();
    this.initializeTasks();
    await this.sendGameStartMessage();
    await Sleep(5000);
    this.startRound();
  }

  assignRoles() {
    const playerIds = Array.from(this.players.keys());
    const playerCount = playerIds.length;
    const imposterCount = playerCount === 4 ? 1 : Math.floor(playerCount / 5); // 1 imposter for 4 players, otherwise 1 for every 5 players
    this.imposters = new Set();
  
    while (this.imposters.size < imposterCount) {
      const randomIndex = Math.floor(Math.random() * playerIds.length);
      const selectedId = playerIds[randomIndex];
      this.imposters.add(selectedId);
    }
  }
  

  initializeTasks() {
    this.places.forEach(place => {
      this.tasks.set(place, 4); // 2 tasks per place
    });
  }

  async sendGameStartMessage() {
    const embed = new EmbedBuilder()
      .setTitle('Among Us Game Started')
      .setDescription('The game has begun! Check your role in your private message.')
      .setColor('#ff0000');

    await this.channel.send({ embeds: [embed] });

    const messagePromises = [];

    for (const [playerId, playerData] of this.players) {
      const isImposter = this.imposters.has(playerId);
      const roleMessage = isImposter ? 
        'You are an Imposter! Sabotage and eliminate the crew.' :
        `You are an Imposter! Sabotage and eliminate the crew. Other imposters: ${Array.from(this.imposters).filter(id => id !== playerId).map(id => `<@${id}>`).join(', ') || 'None'}`;
      
      const interaction = this.playerInteractions.get(playerId);
      if (interaction) {
        const roleGif = isImposter ? 'imposter.gif' : 'crewmate.gif';
        const imagePath = this.getImagePath(roleGif);
        messagePromises.push(interaction.followUp({ 
          content: roleMessage, 
          files: [{ attachment: imagePath, name: roleGif }],
          ephemeral: true 
        }));
      }
    }

    await Promise.all(messagePromises);
  }

  getImagePath(imageName){
    const imagePath = path.join(__dirname, '..', '..', 'public', 'images', 'amoungus', imageName);
    return imagePath;
  }

  async startRound() {
    this.roundNumber++;
    this.reportedThisRound = false;
    await this.choosePlaces();
    await this.performActions();
  }


  async choosePlaces() {
    const embed = new EmbedBuilder()
      .setTitle(`Round ${this.roundNumber} - Choose Your Location`)
      .setDescription('Select a place to go to:')
      .setColor('#0099ff');

    const placeButtons = this.createPlaceButtons();

    const message = await this.channel.send({ 
      embeds: [embed], 
      components: placeButtons,
      files: [{ attachment: this.getImagePath("places-main.png"), name: "places-main.png" }]
    });

    const filter = i => this.players.has(i.user.id) && !this.players.get(i.user.id).isDead;
    const collector = message.createMessageComponentCollector({ filter, time: this.choosePlaceTime });

    collector.on('collect', async i => {
      if (i.customId.startsWith('place_')) {
        const player = this.players.get(i.user.id);
        player.place = i.customId.split('_')[1];
        this.playerInteractions.set(i.user.id, i);
        await i.reply({ content: `You have chosen to go to ${player.place}.`, ephemeral: true });
      }
    });

    collector.on('end', collected => {
      // Assign random places to players who didn't choose
      for (const [playerId, playerData] of this.players) {
        if (!playerData.place && !playerData.isDead) {
          playerData.place = this.places[Math.floor(Math.random() * this.places.length)];
        }
      }
      message.edit({ components: [] }); // Disable buttons after time is up
    });

    // Wait for the full time before moving to the next phase
    await new Promise(resolve => setTimeout(resolve, this.choosePlaceTime));
  }

  createTaskButtons() {
    const taskButtons = [];
    let currentRow = new ActionRowBuilder();

    this.places.forEach((place, index) => {
      const tasksRemaining = this.tasks.get(place);
      const button = new ButtonBuilder()
        .setCustomId(`task_status_${place}`)
        .setLabel(`${place}: ${tasksRemaining}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      currentRow.addComponents(button);

      if ((index + 1) % 5 === 0 || index === this.places.length - 1) {
        taskButtons.push(currentRow);
        currentRow = new ActionRowBuilder();
      }
    });

    return taskButtons;
  }


  createPlaceButtons() {
    const buttons = this.places.map(place => 
      new ButtonBuilder()
        .setCustomId(`place_${place}`)
        .setLabel(`${place} (${this.tasks.get(place)} tasks)`)
        .setStyle(ButtonStyle.Primary)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
      rows.push(row);
    }

    return rows;
  }

  async performActions() {
    this.completedTasks.clear();

    const actionPromises = [];

    for (const [playerId, playerData] of this.players) {
      if (playerData.isDead) continue;

      const isImposter = this.imposters.has(playerId);
      const actionButtons = this.createActionButtons(playerData.place, isImposter);

      const embed = new EmbedBuilder()
        .setTitle(`Round ${this.roundNumber} - Your Turn`)
        .setDescription(`You are in: ${playerData.place}`)
        .addFields(
          { name: 'Players in your location', value: this.getPlayersInLocation(playerData.place) }
        )
        .setColor(isImposter ? '#ff0000' : '#0099ff');

      const interaction = this.playerInteractions.get(playerId);
      if (interaction) {
        await interaction.followUp({
          embeds: [embed],
          components: actionButtons,
          ephemeral: true,
          files: [{ attachment: this.getImagePath(`places-${playerData.place}.png`), name: `places-${playerData.place}.png`}]
        });
      }
    }

    // Wait for all action messages to be sent
    const sentMessages = await Promise.all(actionPromises);

    // Set a timeout to disable buttons after the action time
    setTimeout(() => this.disableActionButtons(sentMessages), this.actionTime);

    // Wait for the action time before starting the next round
    await new Promise(resolve => setTimeout(resolve, this.actionTime));

    if (this.gameState === 'playing') {
      this.startRound();
    }
  }


  async disableActionButtons(messages) {
    for (const message of messages) {
      const disabledComponents = message.components.map(row => {
        const disabledRow = new ActionRowBuilder();
        row.components.forEach(component => {
          disabledRow.addComponents(
            ButtonBuilder.from(component).setDisabled(true)
          );
        });
        return disabledRow;
      });

      await message.edit({ components: disabledComponents });
    }
  }



  createActionButtons(place, isImposter) {
    const buttons = [];

    if (!isImposter) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('task')
          .setLabel('Do Task')
          .setStyle(ButtonStyle.Success)
      );
    } else {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('kill')
          .setLabel('Kill')
          .setStyle(ButtonStyle.Danger)
      );
    }

    if (Array.from(this.deadBodies.values()).includes(place) && !this.reportedThisRound) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('report')
          .setLabel('Report Body')
          .setStyle(ButtonStyle.Primary)
      );
    }

    if (place === 'staduim') {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('report_sus')
          .setLabel('Report Suspicious Player')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    if (this.roundNumber - this.lastHintRound >= 3) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('hint')
          .setLabel('Ask for Hint')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    return [new ActionRowBuilder().addComponents(buttons)];
  }

  async handleReportSus(reporterId) {
    const reporter = this.players.get(reporterId);
    if (!reporter || reporter.isDead || reporter.place !== 'staduim') return "You can't report from here!";

    if (this.reportedThisRound) {
      return "A body has already been reported this round!";
    }

    this.reportedThisRound = true;
    this.gameState = 'voting';

    const suspiciousPlayers = Array.from(this.players.values())
      .filter(p => !p.isDead && p.id !== reporterId)
      .map(p => ({
        label: `${p.name}`,
        value: `${p.id}`
      }));

    const selectMenu = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select_sus')
          .setPlaceholder('Select a suspicious player')
          .addOptions(suspiciousPlayers)
      );

    const interaction = this.playerInteractions.get(reporterId);
    if (interaction) {
      await interaction.followUp({
        content: 'Select a player you find suspicious:',
        components: [selectMenu],
        ephemeral: true
      });
    }

    // Wait for the reporter to select a suspicious player
    const filter = i => i.customId === 'select_sus' && i.user.id === reporterId;
    try {
      const response = await interaction.channel.awaitMessageComponent({ filter, time: 30000 });
      const suspiciousPlayerId = response.values[0];
      const suspiciousPlayer = this.players.get(suspiciousPlayerId);

      await this.channel.send(`Emergency Meeting! ${reporter.name} has reported ${suspiciousPlayer.name} as suspicious!`);
      this.startVoting();
    } catch (error) {
      await interaction.followUp({ content: 'You did not select a player in time.', ephemeral: true });
    }
  }




  getPlayersInLocation(place) {
    const playersHere = Array.from(this.players.values())
      .filter(p => p.place === place)
      .map(p => {
        if (p.isDead && this.deadBodies.get(p.id) === place) {
          return `${p.name} 💀`;
        }
        return p.isDead ? '' : p.name;
      })
      .filter(name => name !== '')
      .join('\n');
    return playersHere || 'No one else is here';
  }

  getTasksStatus() {
    return Array.from(this.tasks.entries())
      .map(([place, count]) => `${place}: ${count}`)
      .join('\n');
  }

  async handleTask(playerId) {
    const player = this.players.get(playerId);
    if (!player || player.isDead || this.imposters.has(player.id)) return "You can't do tasks!";

    const tasksRemaining = this.tasks.get(player.place);
    if (tasksRemaining <= 0) {
      return `There are no tasks left in ${player.place}!`;
    }

    if (this.completedTasks.has(playerId)) {
      return "You've already completed a task this round!";
    }

    this.tasks.set(player.place, tasksRemaining - 1);
    this.completedTasks.add(playerId);
    
    if (this.checkCrewmateWin()) {
      this.endGame('crewmate');
      return "Task completed! Crewmates win!";
    }
    
    return `Task completed in ${player.place}!`;
  }


  async handleKill(killerId, targetId) {
    if (!this.imposters.has(killerId)) return "You are not an imposter!";

    const killer = this.players.get(killerId);
    const target = this.players.get(targetId);
    if (this.imposters.has(targetId)){
      return "You can't kill an imposter!";
    }

    if (!killer || !target || killer.isDead || target.isDead || killer.place !== target.place) {
      return "Invalid kill attempt!";
    }

    if(this.reportedThisRound){
      return "A body has already been reported this round!";
    }

    target.isDead = true;
    this.deadPlayers.add(targetId);
    this.deadBodies.set(targetId, target.place);
    
    // Announce the kill to the channel
    await this.channel.send(`# ⚠️ warning : someone got kiled search for him`);

    // Notify the killed player
    const interaction = this.playerInteractions.get(targetId);
    if (interaction) {
      await interaction.followUp({ 
        content: "You have been killed! You can no longer participate in the game, but you can watch silently.", 
        ephemeral: true,
        files: [{ attachment: this.getImagePath(`kill.gif`), name: `kill.gif` }] 

      });
      
      // Remove the player's ability to send messages in the channel
      await this.channel.permissionOverwrites.edit(targetId, { SendMessages: false });
      
    }
    
    if (this.checkImposterWin()) {
      this.endGame('imposter');
      return `You have killed ${target.name}! Imposter wins!`;
    }
    
    return `You have killed ${target.name}!`;
  }

  async handleHint(playerId) {
    if (this.roundNumber - this.lastHintRound < 3) {
      return "Hint is not available yet. Wait for 3 rounds between hints.";
    }

    this.lastHintRound = this.roundNumber;

    const deadBodiesInfo = Array.from(this.deadBodies.entries())
      .map(([deadPlayerId, place]) => `${this.players.get(deadPlayerId).name} in ${place}`)
      .join(', ');

    const hintMessage = deadBodiesInfo
      ? `There are dead bodies: ${deadBodiesInfo}`
      : "There are no dead bodies at the moment.";

    const interaction = this.playerInteractions.get(playerId);
    if (interaction) {
      await interaction.followUp({
        content: hintMessage,
        ephemeral: true
      });
    }

    return "Hint has been provided to you privately.";
  }




  async handleReport(reporterId) {
    const reporter = this.players.get(reporterId);
    if (!reporter || reporter.isDead) return "You can't report!";

    const reportedBody = Array.from(this.deadBodies.entries()).find(([_, place]) => place === reporter.place);
    if (!reportedBody) {
      return "There's no dead body here to report!";
    }

    if (this.reportedThisRound) {
      return "A body has already been reported this round!";
    }

    this.reportedThisRound = true;
    this.gameState = 'voting';

    // Announce the report to the channel
    const deadPlayer = this.players.get(reportedBody[0]);
    await this.channel.send(`Emergency Meeting! ${reporter.name} has reported ${deadPlayer.name}'s body in ${reporter.place}!`);

    this.startVoting();
    return "A body has been reported! Emergency meeting called!";
  }


  async startVoting() {
    this.votes.clear();
    const embed = new EmbedBuilder()
      .setTitle('Emergency Meeting')
      .setDescription('A body has been reported! Vote to eject a player.')
      .setColor('#ff0000');

    const voteButtons = this.createVoteButtons();

    const message = await this.channel.send({ embeds: [embed], components: voteButtons });

    const filter = i => this.players.has(i.user.id) && !this.players.get(i.user.id).isDead;
    const collector = message.createMessageComponentCollector({ filter, time: this.votingTime });

    collector.on('collect', async i => {
      const voterId = i.user.id;
      const votedId = i.customId.split('_')[1];
      this.votes.set(voterId, votedId);
      await i.reply({ content: `You have voted for ${this?.players?.get(votedId)?.name || this.votes.get(votedId)}.`, ephemeral: true });
      
      // Update vote counts
      await this.updateVoteCounts(message);
    });

    collector.on('end', collected => {
      this.resolveVotes(message);
    });
  }


  async updateVoteCounts(message) {
    const voteCounts = new Collection();
    this.votes.forEach((votedId) => {
      voteCounts.set(votedId, (voteCounts.get(votedId) || 0) + 1);
    });

    const updatedButtons = message.components.map(row => {
      const updatedRow = new ActionRowBuilder();
      row.components.forEach(button => {
        const playerId = button.customId.split('_')[1];
        const voteCount = voteCounts.get(playerId) || 0;
        if (button.customId.includes("skip")) {
          updatedRow.addComponents(
            ButtonBuilder.from(button)
              .setLabel(`Skip Vote (${voteCount})`)
          );
        } else {
          updatedRow.addComponents(
            ButtonBuilder.from(button)
              .setLabel(`${this.players.get(playerId).name} (${voteCount})`)
          );
        }
      });
      return updatedRow;
    });

    await message.edit({ components: updatedButtons });
  }




  createVoteButtons() {
    const buttons = Array.from(this.players.values())
      .filter(p => !p.isDead)
      .map(p => 
        new ButtonBuilder()
          .setCustomId(`vote_${p.id}`)
          .setLabel(`${p.name} (0)`)
          .setStyle(ButtonStyle.Primary)
      );

    // Add skip button
    buttons.push(
      new ButtonBuilder()
        .setCustomId('vote_skip')
        .setLabel('Skip Vote (0)')
        .setStyle(ButtonStyle.Secondary)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
      rows.push(row);
    }

    return rows;
  }


  async resolveVotes(message) {
    const voteCounts = new Collection();
    this.votes.forEach((votedId) => {
      voteCounts.set(votedId, (voteCounts.get(votedId) || 0) + 1);
    });

    let maxVotes = 0;
    let ejectedId = null;

    voteCounts.forEach((count, id) => {
      if (count > maxVotes) {
        maxVotes = count;
        ejectedId = id;
      }
    });

    if (ejectedId && ejectedId !== 'skip') {
      const ejectedPlayer = this.players.get(ejectedId);
      ejectedPlayer.isDead = true;
      this.deadPlayers.add(ejectedId);

      const isImposter =  this.imposters.has(ejectedId);
      await this.channel.send(`${ejectedPlayer.name} has been ejected! They were ${isImposter ? 'the Imposter' : 'a Crewmate'}.`);

      if (isImposter) {
        this.endGame('crewmate');
      } else if (this.checkImposterWin()) {
        this.endGame('imposter');
      } 
      else if (this.checkAllTasksCompleted()) {
        this.endGame('crewmate');
      }
      else {
        this.startRound();
      }
    } else {
      await this.channel.send('No one was ejected.');
      
      this.startRound();
    }

    // Remove reported bodies after vote
    this.deadBodies.clear();

    this.votes.clear();
    this.gameState = 'playing';
    await message.edit({ components: [] }); // Disable voting buttons
  }



  checkCrewmateWin() {
    return Array.from(this.tasks.values()).every(t => t === 0);
  }

  checkImposterWin() {
    const aliveCrew = Array.from(this.players.values()).filter(p => !p.isDead && !this.imposters.has(p.id));
    return aliveCrew.length <= this.imposters.size;
  }
  

  async endGame(winner) {
    this.gameState = 'ended';

    const embed = new EmbedBuilder()
      .setTitle('Game Over')
      .setDescription(`The ${winner === 'imposter' ? 'Imposter' : 'Crewmates'} win!`)
      .addFields(
        { name: 'Imposters', value: this.getImpostersList() },
        { name: 'Crewmates', value: this.getCrewmatesList() }
      )
      .setColor(winner === 'imposter' ? '#ff0000' : '#00ff00');

    await this.channel.send({ embeds: [embed] });
    client.games.delete(this.channel.id)
  }

  getImpostersList() {
    return Array.from(this.imposters)
      .map(id => `${this.players.get(id).name}${this.deadPlayers.has(id) ? ' 💀' : ''}`)
      .join('\n');
  }
  



  getCrewmatesList() {
    return Array.from(this.players.values())
      .filter(!this.imposters.has(p.id))
      .map(p => `${p.name}${this.deadPlayers.has(p.id) ? ' 💀' : ''}`)
      .join('\n');
  }
}

module.exports = AmongUsGame;