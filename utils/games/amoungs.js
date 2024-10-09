const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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
    this.roundInterval = null;
    this.playerMoves = new Map();
    this.playerInteractions = new Map();
  }

  async startLobby() {
    const embed = this.createLobbyEmbed();

    const joinButton = new ButtonBuilder()
      .setCustomId('join_game')
      .setLabel('Join Game')
      .setStyle(ButtonStyle.Primary);

    const leaveButton = new ButtonBuilder()
      .setCustomId('leave_game')
      .setLabel('Leave Game')
      .setStyle(ButtonStyle.Secondary);

    const startButton = new ButtonBuilder()
      .setCustomId('start_game')
      .setLabel('Start Game')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(joinButton, leaveButton, startButton);

    const lobbyMessage = await this.channel.send({ embeds: [embed], components: [row] });

    const filter = i => ['join_game', 'leave_game', 'start_game'].includes(i.customId);
    const collector = lobbyMessage.createMessageComponentCollector({ filter, time: 300000 }); // 5 minutes

    collector.on('collect', async i => {
      if (i.customId === 'join_game') {
        if (!this.players.has(i.user.id)) {
          this.players.set(i.user.id, { id: i.user.id, name: i.user.username, place: null, isDead: false });
          this.playerInteractions.set(i.user.id, i);
          await i.reply({ content: 'You have joined the game!', ephemeral: true });
          
          if (this.players.size >= 15) {
            collector.stop();
            this.startGame();
          }
        } else {
          await i.reply({ content: 'You have already joined the game!', ephemeral: true });
        }
      } else if (i.customId === 'leave_game') {
        if (this.players.has(i.user.id)) {
          this.players.delete(i.user.id);
          this.playerInteractions.delete(i.user.id);
          await i.reply({ content: 'You have left the game.', ephemeral: true });
        } else {
          await i.reply({ content: 'You are not in the game.', ephemeral: true });
        }
      } else if (i.customId === 'start_game') {
        if (this.players.size >= 3) {
          collector.stop();
          this.startGame();
        } else {
          await i.reply({ content: 'Not enough players to start the game!', ephemeral: true });
        }
      }
      
      await lobbyMessage.edit({ embeds: [this.createLobbyEmbed()] });
    });

    collector.on('end', collected => {
      if (this.players.size < 3) {
        this.channel.send('Not enough players joined. Game cancelled.');
      }
    });
  }

  createLobbyEmbed() {
    return new EmbedBuilder()
      .setTitle('Among Us Game Lobby')
      .setDescription('Join the game! (3-15 players)')
      .addFields({ name: 'Players', value: this.getPlayerList() })
      .setColor('#00ff00');
  }

  getPlayerList() {
    return this.players.size > 0 
      ? Array.from(this.players.values()).map(p => p.name).join('\n')
      : 'No players yet';
  }

  startGame() {
    this.gameState = 'playing';
    this.assignRoles();
    this.initializeTasks();
    this.assignInitialLocations();
    this.sendGameStartMessage();
    this.startRoundInterval();
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

  assignInitialLocations() {
    for (const player of this.players.values()) {
      player.place = this.places[Math.floor(Math.random() * this.places.length)];
    }
  }

    async sendGameStartMessage() {
        const embed = new EmbedBuilder()
        .setTitle('Among Us Game Started')
        .setDescription('The game has begun! Check your role in the next message.')
        .setColor('#ff0000');

        await this.channel.send({ embeds: [embed] });

        for (const [playerId, playerData] of this.players) {
        const isImposter = playerId === this.imposter;
        const roleMessage = isImposter ? 
            'You are the Imposter! Sabotage and eliminate the crew.' :
            'You are a Crewmate! Complete tasks and find the imposter.';
        
        const interaction = this.playerInteractions.get(playerId);
        if (interaction) {
            if (!interaction.replied) {
            await interaction.reply({ content: `${roleMessage}\nYour starting location is: ${playerData.place}`, ephemeral: true });
            } else {
            await interaction.followUp({ content: `${roleMessage}\nYour starting location is: ${playerData.place}`, ephemeral: true });
            }
        }
        }
  }

  startRoundInterval() {
    this.roundInterval = setInterval(() => this.playRound(), 20000); // 20 seconds per round
  }

  async playRound() {
    if (this.gameState !== 'playing') return;

    // Move players to their new locations
    for (const [playerId, newPlace] of this.playerMoves) {
      const player = this.players.get(playerId);
      if (player && !player.isDead) {
        player.place = newPlace;
      }
    }
    this.playerMoves.clear();

    await this.sendRoundUpdate();
    this.checkGameEnd();
  }

    async sendRoundUpdate() {
        const embed = new EmbedBuilder()
        .setTitle('Round Update')
        .setDescription('A new round has started!')
        .setColor('#0099ff');

        await this.channel.send({ embeds: [embed] });

        for (const [playerId, playerData] of this.players) {
        if (playerData.isDead) continue;

        const playerEmbed = new EmbedBuilder()
            .setTitle('Your Status')
            .setDescription(`You are in: ${playerData.place}`)
            .addFields(
            { name: 'Players in your location', value: this.getPlayersInLocation(playerData.place) },
            { name: 'Tasks Remaining', value: `${this.tasks.get(playerData.place)}` }
            )
            .setColor('#0099ff');

        const moveButtons = this.createMoveButtons(playerData.place);
        const actionButtons = this.createActionButtons();

        const interaction = this.playerInteractions.get(playerId);
        if (interaction) {
            if (!interaction.replied) {
            await interaction.reply({
                embeds: [playerEmbed],
                components: [...moveButtons, actionButtons],
                ephemeral: true
            });
            } else {
            await interaction.editReply({
                embeds: [playerEmbed],
                components: [...moveButtons, actionButtons]
            });
            }
        }
        }
    }

  getPlayersInLocation(place) {
    const playersHere = Array.from(this.players.values())
      .filter(p => p.place === place && !p.isDead)
      .map(p => p.name)
      .join('\n');
    return playersHere || 'No one else is here';
  }

  createMoveButtons(currentPlace) {
    const moveButtons = this.places
      .filter(place => place !== currentPlace)
      .map(place => 
        new ButtonBuilder()
          .setCustomId(`move_${place}`)
          .setLabel(place)
          .setStyle(ButtonStyle.Primary)
      );

    const rows = [];
    for (let i = 0; i < moveButtons.length; i += 5) {
      const row = new ActionRowBuilder().addComponents(moveButtons.slice(i, i + 5));
      rows.push(row);
    }

    return rows;
  }

  createActionButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('task')
        .setLabel('Do Task')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('kill')
        .setLabel('Kill')
        .setStyle(ButtonStyle.Danger)
    );
  }

  checkGameEnd() {
    const aliveCrew = Array.from(this.players.values()).filter(p => !p.isDead && p.id !== this.imposter);
    const allTasksCompleted = Array.from(this.tasks.values()).every(t => t === 0);

    if (aliveCrew.length <= 1) {
      this.endGame('imposter');
    } else if (allTasksCompleted) {
      this.endGame('crew');
    }
  }

  async endGame(winner) {
    clearInterval(this.roundInterval);
    this.gameState = 'ended';

    const embed = new EmbedBuilder()
      .setTitle('Game Over')
      .setDescription(`The ${winner === 'imposter' ? 'Imposter' : 'Crew'} wins!`)
      .setColor(winner === 'imposter' ? '#ff0000' : '#00ff00');

    await this.channel.send({ embeds: [embed] });
    // Additional end game logic (e.g., revealing roles, showing stats)
  }

  async handleMove(playerId, newPlace) {
    const player = this.players.get(playerId);
    if (!player || player.isDead) return "You can't move!";

    this.playerMoves.set(playerId, newPlace);
    return `You will move to ${newPlace} in the next round.`;
  }

  async handleTask(playerId) {
    const player = this.players.get(playerId);
    if (!player || player.isDead || player.id === this.imposter) return "You can't do tasks!";

    const tasksRemaining = this.tasks.get(player.place);
    if (tasksRemaining <= 0) {
      return `There are no tasks left in ${player.place}!`;
    }

    const taskNumber = Math.floor(Math.random() * 100) + 1;
    this.tasks.set(player.place, tasksRemaining - 1);
    return `Your task number is: ${taskNumber}\nTask completed in ${player.place}!`;
  }

  async handleKill(killerId, targetId) {
    if (killerId !== this.imposter) return "You are not the imposter!";

    const killer = this.players.get(killerId);
    const target = this.players.get(targetId);

    if (!killer || !target || killer.isDead || target.isDead || killer.place !== target.place) {
      return "Invalid kill attempt!";
    }

    target.isDead = true;
    this.checkGameEnd();
    return `You have killed ${target.name}!`;
  }
}

module.exports = AmongUsGame;