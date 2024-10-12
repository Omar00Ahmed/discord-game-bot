const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } = require('discord.js');

class AmongUsGame {
  constructor(channel) {
    this.channel = channel;
    this.players = new Map();
    this.places = [
      'Cafeteria', 'Admin', 'Electrical', 'Storage', 'O2',
      'Navigation', 'Shields', 'Weapons', 'Medbay'
    ];
    this.tasks = new Map();
    this.imposter = null;
    this.gameState = 'lobby';
    this.roundNumber = 0;
    this.deadBodies = new Map();
    this.votes = new Collection();
    this.playerInteractions = new Map();
    this.completedTasks = new Set();
    this.reportedThisRound = false;
    this.startTime = 2 * 60  * 1000; // 30 seconds
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
    const collector = lobbyMessage.createMessageComponentCollector({ filter, time: this.startTime }); // 5 minutes

    collector.on('collect', async i => {
      try {
        if (i.customId === 'join_game') {
          if (!this.players.has(i.user.id)) {
            this.players.set(i.user.id, { id: i.user.id, name: i.user.username, place: null, isDead: false });
            this.playerInteractions.set(i.user.id, i);
            await i.reply({ content: 'You have joined the game!', ephemeral: true });
          } else {
            await i.reply({ content: 'You have already joined the game!', ephemeral: true });
          }
        } else if (i.customId === 'start_game') {
          if (this.players.size >= 4) {
            collector.stop();
            this.startGame();
          } else {
            await i.reply({ content: 'Not enough players to start the game!', ephemeral: true });
          }
        }
    
        await lobbyMessage.edit({ embeds: [this.createLobbyEmbed()] });
      } catch (error) {
        if (error.code === 10062) {
          console.error('Interaction expired:', error);
        } else {
          console.error('Error handling interaction:', error);
        }
      }
    });

    collector.on('end', collected => {
      if (this.players.size < 4) {
        this.channel.send('Not enough players joined. Game cancelled.');
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

  startGame() {
    this.gameState = 'playing';
    this.assignRoles();
    this.initializeTasks();
    this.sendGameStartMessage();
    this.startRound();
  }

  assignRoles() {
    const playerIds = Array.from(this.players.keys());
    const imposterIndex = Math.floor(Math.random() * playerIds.length);
    this.imposter = playerIds[imposterIndex];
  }

  initializeTasks() {
    this.places.forEach(place => {
      this.tasks.set(place, 2); // 2 tasks per place
    });
  }

  async sendGameStartMessage() {
    const embed = new EmbedBuilder()
      .setTitle('Among Us Game Started')
      .setDescription('The game has begun! Check your role in your private message.')
      .setColor('#ff0000');

    await this.channel.send({ embeds: [embed] });

    for (const [playerId, playerData] of this.players) {
      const isImposter = playerId === this.imposter;
      const roleMessage = isImposter ? 
        'You are the Imposter! Sabotage and eliminate the crew.' :
        'You are a Crewmate! Complete tasks and find the imposter.';
      
      const interaction = this.playerInteractions.get(playerId);
      if (interaction) {
        await interaction.followUp({ content: roleMessage, ephemeral: true });
      }
    }
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
      components: placeButtons
    });

    const filter = i => this.players.has(i.user.id) && !this.players.get(i.user.id).isDead;
    const collector = message.createMessageComponentCollector({ filter, time: 30000 }); // 30 seconds

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

    // Wait for the full 30 seconds before moving to the next phase
    await new Promise(resolve => setTimeout(resolve, 30000));
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

    for (const [playerId, playerData] of this.players) {
      if (playerData.isDead) continue;

      const isImposter = playerId === this.imposter;
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
          ephemeral: true
        });
      }
    }

    await new Promise(resolve => setTimeout(resolve, 30000));

    if (this.gameState === 'playing') {
      this.startRound();
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

    return [new ActionRowBuilder().addComponents(buttons)];
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
    if (!player || player.isDead || player.id === this.imposter) return "You can't do tasks!";

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
    if (killerId !== this.imposter) return "You are not the imposter!";

    const killer = this.players.get(killerId);
    const target = this.players.get(targetId);

    if (!killer || !target || killer.isDead || target.isDead || killer.place !== target.place) {
      return "Invalid kill attempt!";
    }

    target.isDead = true;
    this.deadBodies.set(targetId, target.place);
    
    if (this.checkImposterWin()) {
      this.endGame('imposter');
      return `You have killed ${target.name}! Imposter wins!`;
    }
    
    return `You have killed ${target.name}!`;
  }



  async handleReport(reporterId) {
    const reporter = this.players.get(reporterId);
    if (!reporter || reporter.isDead) return "You can't report!";

    if (!Array.from(this.deadBodies.values()).includes(reporter.place)) {
      return "There's no dead body here to report!";
    }

    if (this.reportedThisRound) {
      return "A body has already been reported this round!";
    }

    this.reportedThisRound = true;
    this.gameState = 'voting';
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
    const collector = message.createMessageComponentCollector({ filter, time: 60000 }); // 1 minute for voting

    collector.on('collect', async i => {
      const voterId = i.user.id;
      const votedId = i.customId.split('_')[1];
      this.votes.set(voterId, votedId);
      await i.reply({ content: `You have voted for ${this.players.get(votedId).name}.`, ephemeral: true });
      
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
        updatedRow.addComponents(
          ButtonBuilder.from(button)
            .setLabel(`${this.players.get(playerId).name} (${voteCount})`)
        );
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

    if (ejectedId) {
      const ejectedPlayer = this.players.get(ejectedId);
      ejectedPlayer.isDead = true;

      await this.channel.send(`${ejectedPlayer.name} has been ejected!`);

      if (ejectedId === this.imposter) {
        this.endGame('crewmate');
      } else if (this.checkImposterWin()) {
        this.endGame('imposter');
      } else {
        this.startRound();
      }
    } else {
      await this.channel.send('No one was ejected.');
      this.startRound();
    }

    this.votes.clear();
    this.gameState = 'playing';
    await message.edit({ components: [] }); // Disable voting buttons
  }



  checkCrewmateWin() {
    return Array.from(this.tasks.values()).every(t => t === 0);
  }

  checkImposterWin() {
    const aliveCrew = Array.from(this.players.values()).filter(p => !p.isDead && p.id !== this.imposter);
    return aliveCrew.length <= 1;
  }

  async endGame(winner) {
    this.gameState = 'ended';

    const embed = new EmbedBuilder()
      .setTitle('Game Over')
      .setDescription(`The ${winner === 'imposter' ? 'Imposter' : 'Crewmates'} win!`)
      .addFields(
        { name: 'Imposter', value: this.players.get(this.imposter).name },
        { name: 'Crewmates', value: Array.from(this.players.values()).filter(p => p.id !== this.imposter).map(p => p.name).join('\n') }
      )
      .setColor(winner === 'imposter' ? '#ff0000' : '#00ff00');

    await this.channel.send({ embeds: [embed] });
  }
}

module.exports = AmongUsGame;