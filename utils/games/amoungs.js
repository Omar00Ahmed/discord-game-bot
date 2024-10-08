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
  }

  async startLobby() {
    const embed = new EmbedBuilder()
      .setTitle('Among Us Game Lobby')
      .setDescription('React to join the game! (3-15 players)')
      .setColor('#00ff00');

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
    const collector = lobbyMessage.createMessageComponentCollector({ filter, time: 300000 }); // 5 minutes

    collector.on('collect', async i => {
      if (i.customId === 'join_game') {
        if (!this.players.has(i.user.id)) {
          this.players.set(i.user.id, { id: i.user.id, name: i.user.username, place: null, isDead: false });
          await i.reply({ content: 'You have joined the game!', ephemeral: true });
          
          if (this.players.size >= 15) {
            collector.stop();
            this.startGame();
          }
        } else {
          await i.reply({ content: 'You have already joined the game!', ephemeral: true });
        }
      } else if (i.customId === 'start_game') {
        if (this.players.size >= 3) {
          collector.stop();
          this.startGame();
        } else {
          await i.reply({ content: 'Not enough players to start the game!', ephemeral: true });
        }
      }
    });

    collector.on('end', collected => {
      if (this.players.size < 3) {
        this.channel.send('Not enough players joined. Game cancelled.');
      }
    });
  }

  startGame() {
    this.gameState = 'playing';
    this.assignRoles();
    this.initializeTasks();
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
      this.tasks.set(place, 3); // 3 tasks per place for simplicity
    });
  }

  async sendGameStartMessage() {
    const embed = new EmbedBuilder()
      .setTitle('Among Us Game Started')
      .setDescription('The game has begun! Check your DMs for your role.')
      .setColor('#ff0000');

    await this.channel.send({ embeds: [embed] });

    for (const [playerId, playerData] of this.players) {
      const user = await this.channel.client.users.fetch(playerId);
      const isImposter = playerId === this.imposter;
      const roleMessage = isImposter ? 
        'You are the Imposter! Sabotage and eliminate the crew.' :
        'You are a Crewmate! Complete tasks and find the imposter.';
      
      await user.send(roleMessage);
    }
  }

  startRoundInterval() {
    this.roundInterval = setInterval(() => this.playRound(), 20000); // 20 seconds per round
  }

  async playRound() {
    if (this.gameState !== 'playing') return;

    // Move all players to random locations
    for (const player of this.players.values()) {
      if (!player.isDead) {
        player.place = this.places[Math.floor(Math.random() * this.places.length)];
      }
    }

    await this.sendRoundUpdate();
    this.checkGameEnd();
  }

  async sendRoundUpdate() {
    const embed = new EmbedBuilder()
      .setTitle('Round Update')
      .setDescription('Choose your next action:')
      .addFields(
        { name: 'Players', value: this.getPlayerStatusString() },
        { name: 'Tasks Remaining', value: this.getTasksRemainingString() }
      )
      .setColor('#0099ff');

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('task')
        .setLabel('Do Task')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('kill')
        .setLabel('Kill')
        .setStyle(ButtonStyle.Danger)
    );

    await this.channel.send({ embeds: [embed], components: [actionRow] });
  }

  getPlayerStatusString() {
    return Array.from(this.players.values())
      .map(p => `${p.name}: ${p.isDead ? '💀' : '😃'} - ${p.place || 'Not placed'}`)
      .join('\n');
  }

  getTasksRemainingString() {
    return Array.from(this.tasks.entries())
      .map(([place, tasks]) => `${place}: ${tasks}`)
      .join('\n');
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

  async handleTask(playerId) {
    const player = this.players.get(playerId);
    if (!player || player.isDead || player.id === this.imposter) return;

    const taskButtons = new ActionRowBuilder().addComponents(
      ...Array(5).fill().map((_, i) => 
        new ButtonBuilder()
          .setCustomId(`task_${i + 1}`)
          .setLabel(`${i + 1}`)
          .setStyle(ButtonStyle.Primary)
      )
    );

    const taskMessage = await this.channel.send({
      content: `${player.name}, complete the task by clicking the correct number:`,
      components: [taskButtons]
    });

    const correctNumber = Math.floor(Math.random() * 5) + 1;

    const filter = i => i.user.id === playerId && i.customId.startsWith('task_');
    const collector = taskMessage.createMessageComponentCollector({ filter, time: 10000 });

    collector.on('collect', async i => {
      const selectedNumber = parseInt(i.customId.split('_')[1]);
      if (selectedNumber === correctNumber) {
        const place = player.place;
        this.tasks.set(place, this.tasks.get(place) - 1);
        await i.reply({ content: 'Task completed successfully!', ephemeral: true });
      } else {
        await i.reply({ content: 'Incorrect. Task failed.', ephemeral: true });
      }
      collector.stop();
    });

    collector.on('end', () => {
      taskMessage.delete().catch(console.error);
    });
  }

  async handleKill(killerId, targetId) {
    if (killerId !== this.imposter) return;

    const killer = this.players.get(killerId);
    const target = this.players.get(targetId);

    if (!killer || !target || killer.isDead || target.isDead || killer.place !== target.place) return;

    target.isDead = true;
    await this.channel.send(`${target.name} was killed!`);
    this.checkGameEnd();
  }
}

module.exports = AmongUsGame;