const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection,StringSelectMenuBuilder } = require('discord.js');
const {Sleep} = require("../../utils/createDelay");
const {checkIfCanMute} = require("../../utils/WhoCanMute")
const path = require("path")

const {  createAudioResource  } = require('@discordjs/voice');

const {client} = require("../../index")

class AmongUsGame {
  constructor(channel,connection,audioPlayer) {
    this.channel = channel;
    // this.client = theClient;
    this.players = new Map();
    this.places = new Map([
      ['school', { displayName: 'المدرسة', imageFile: 'school', taskCount: 3 }],
      ['electric', { displayName: 'محطة الكهرباء', imageFile: 'electric', taskCount: 3 }],
      ['cafeteria', { displayName: 'الكافيتريا', imageFile: 'cafeteria', taskCount: 3 }],
      ['hospital', { displayName: 'المستشفى', imageFile: 'hospital', taskCount: 3 }],
      ['hall', { displayName: 'القاعة', imageFile: 'hall', taskCount: 3 }],
      ['pool', { displayName: 'المسبح', imageFile: 'pool', taskCount: 3 }],
      ['staduim', { displayName: 'الملعب', imageFile: 'staduim', taskCount: 3 }],
      ['garage', { displayName: 'الجراج', imageFile: 'garage', taskCount: 3 }],
      ['garden', { displayName: 'الحديقة', imageFile: 'garden', taskCount: 3 }]
    ]);

    this.tasks = new Map();
    this.imposters = new Set();
    this.isRoundInProgress = false;
    this.gameState = 'lobby';
    this.roundNumber = 0;
    this.deadBodies = new Map();
    this.votes = new Collection();
    this.playerInteractions = new Map();
    this.completedTasks = new Set();
    this.reportedThisRound = false;
    this.deadPlayers = new Set();
    this.killsThisRound = new Map(); // New property to track kills per round
    // set for muted players
    this.mutedPlayers = new Set();
    this.lastHintRound = 0;
    this.isStartingRound = false;

    this.connection = connection;
    this.audioPlayer = audioPlayer;

    // Timer values as class members
    this.lobbyWaitTime =  3 * 60 * 1000; // 1 minute
    this.choosePlaceTime = 30000; // 30 seconds
    this.actionTime = 30000; // 30 seconds
    this.votingTime = 1000 * 60 * 2; // 1 minute
    this.taskQuestions = [
      { question: "What is 2 + 2?", answers: ["3", "4", "5", "6"], correctAnswer: "4" },
      { question: "What color is the sky?", answers: ["Red", "Green", "Blue", "Yellow"], correctAnswer: "Blue" },
      { question: "How many continents are there?", answers: ["5", "6", "7", "8"], correctAnswer: "7" },
      // Add more questions as needed
    ];

    this.impostersAbilites = new Map();
    this.gameEffects = new Map([
      ['isElectricOff', false],
      ['isOxygenOff', false],
      ['oxygenCutNextRound', false]  
    ]);

    this.oxygenTasksRequired = 0;  // Will be set when oxygen is cut
    this.oxygenTasksCompleted = 0;  // Counter for completed oxygen tasks
    this.oxygenTaskCompletionThreshold = 0.6;  // 60% of players need to complete the task
    this.oxygenCutUsed = new Set(); // Track which imposters have used the oxygen cut
  }

  async playAudio(audioName){
    try{
      const filePath = path.join(__dirname, "..", "..", "public", "sounds", audioName + ".mp3");
      const resource = createAudioResource(filePath);
      this.audioPlayer.play(resource);
      this.connection.subscribe(this.audioPlayer);
    }catch(err){
      console.error("Error playing audio:", err);
    }
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

    let timeLeft = 30; // 30 seconds countdown
    const countdownInterval = setInterval(async () => {
      timeLeft -= 2;
      if (timeLeft >= 0) {
        await lobbyMessage.edit({ 
          embeds: [this.createLobbyEmbed(this.players.size).setFooter({ text: `Starting in: ${timeLeft} seconds` })]
        });
      }
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        if (this.players.size >= 4) {
          this.gameState = 'waiting';
          collector.stop();
          this.startGame();
        } else {
          this.channel.send('لا يوجد عدد كافي من اللاعبين 🫤... اللعبة أُلغيت! 🎮🚫');
          this.connection.destroy();
          client.games.delete(this.channel.id);
          lobbyMessage.edit({ embeds: [this.createLobbyEmbed()], components: [] });
        }
      }
    }, 2000);

    collector.on('collect', async i => {
      try {
        if (i.customId === 'join_game') {
          if (!this.players.has(i.user.id)) {
            this.players.set(i.user.id, { id: i.user.id, name: i.user.displayName, place: null, isDead: false });
            this.playerInteractions.set(i.user.id, i);
            await i.reply({ content: 'لقد انضممت إلى اللعبة! 🎉🕹️', ephemeral: true });
          } else {
            await i.reply({ content: 'لقد انضممت بالفعل إلى اللعبة! 🔄🎮', ephemeral: true });
          }
        } else if (i.customId === 'start_game') {
          const member = await i.guild.members.fetch(i.user.id);
          if (!checkIfCanMute(member, "startGame")) return;
          if (this.players.size >= 4) {
            clearInterval(countdownInterval);
            this.gameState = 'waiting';
            await i.reply({ content: 'بدأت اللعبة! 🎮✨', ephemeral: true });
            collector.stop();
            this.startGame();
          } else {
            await i.reply({ content: 'لا يوجد عدد كافي من اللاعبين 🫤... اللعبة أُلغيت! 🎮🚫', ephemeral: true });
          }
        }
    
        await lobbyMessage.edit({ 
          embeds: [this.createLobbyEmbed(this.players.size).setFooter({ text: `Starting in: ${timeLeft} seconds` })]
        });
      } catch (error) {
        console.error('Error handling interaction:', error);
      }
    });

    collector.on('end', collected => {
      clearInterval(countdownInterval);
      if (this.gameState === "lobby") {
        this.channel.send('لا يوجد عدد كافي من اللاعبين 🫤... اللعبة أُلغيت! 🎮🚫');
        this.connection.destroy();
        client.games.delete(this.channel.id);
        lobbyMessage.edit({ embeds: [this.createLobbyEmbed()], components: [] });
      }
    });
  }



  createLobbyEmbed(playerysCount) {
    return new EmbedBuilder()
      .setTitle('Among Us Game Lobby')
      .setDescription('انضم إلى اللعبة! (من 4 إلى 10 لاعبين) 🎮🚀')
      .addFields(
        { name: '-: اللاعبون', value: this.getPlayerList() },
        {name:"عدد اللاعبين",value:`(25/${playerysCount || 0})`}
      )
      .setColor('#00ff00');
  }
  getPlayerList() {
    return this.players.size > 0 
      ? Array.from(this.players.values()).map(p => `<@${p.id}>`).join('\n')
      : 'لا يوجد لاعبين حتى الآن. 🚫👥';
  }

  async startGame() {
    this.gameState = 'playing';
    this.closeChat();
    this.assignRoles();
    this.initializeTasks();
    this.playAudio("pop-39222"); // updated
    await this.sendGameStartMessage();
    await Sleep(5000);
    this.startRound(false);
  }
  async closeChat(){
    await this.channel.permissionOverwrites.edit(this.channel.guild.roles.everyone, {
      SendMessages: false
    });
  }
  async openChat(){
    await this.channel.permissionOverwrites.edit(this.channel.guild.roles.everyone, {
      SendMessages: true
    });
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
      this.impostersAbilites.set(selectedId,
        {
          cutoxygen:false,
          cutElectric:false
        }
      )
    }
  }
  

  initializeTasks() {
    for (const [placeId, placeData] of this.places) {
      this.tasks.set(placeId, placeData.taskCount);
    }
  }

  async sendGameStartMessage() {
    const embed = new EmbedBuilder()
      .setTitle('Among Us Game Started')
      .setDescription('بدأت اللعبة! تحقق من دورك في الرسالة الخاصة. 🎲📩')
      .setColor('#ff0000');

    await this.channel.send({ embeds: [embed] });

    const messagePromises = [];

    for (const [playerId, playerData] of this.players) {
      const isImposter = this.imposters.has(playerId);
      const roleMessage = isImposter ?
      `أنت سفاح ! قم بتخريب المهام والقضاء على المواطنين. السفاحين الآخرون! 🚀🔪: ${Array.from(this.imposters).filter(id => id !== playerId).map(id => `<@${id}>`).join(', ') || ''}`: 
        'أنت مواطن، قم بالذهاب الي المهام وإكمالها وحاول العثور علي السفاحين ! 🚀🛠️' ;
    
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

  async startRound(isPostVoting) {
    this.gameState = 'playing';
    if (!this || this.isStartingRound || this.gameState === "ended") {
      console.log("returned" + `${!this} || ${this.isStartingRound} || ${this.gameState === "ended"}`);
      return;
    }
    this.isStartingRound = true;
    try {
      
      if (isPostVoting) {
        await this.channel.send("# الجولة التالية ستبدأ الآن... 🎮🚀");
        await Sleep(3000); // Give players a moment to read the message
      }

      if (this.gameEffects.get("isElectricOff")) {
        this.gameEffects.set("isElectricOff", false);
        await this.channel.send("# عادت الكهرباء للعمل مرة أخرى! 💡✨");
      }

      if (this.gameEffects.get('isOxygenOff')) {
        if (this.oxygenTasksCompleted < this.oxygenTasksRequired) {
          const randomPlayer = this.getRandomAliveCrewmate();
          if (randomPlayer) {
            randomPlayer.isDead = true;
            this.deadPlayers.add(randomPlayer.id);
            await this.channel.send({
              content:`# انخفاض الأكسجين أودى بحياة ضحية! <@${randomPlayer.id}> قد توفي! 💀💨`,
              files: [{ attachment: this.getImagePath("breath-die.gif"), name: "death.gif" }]
            });
            // Remove the player's ability to send messages in the channel
            await this.channel.permissionOverwrites.edit(randomPlayer.id, { SendMessages: false });
            this.mutedPlayers.add(randomPlayer.id);
            this.playAudio("sounds-kill")
            if (this.checkImposterWin()) {
              this.endGame('imposter');
              return;
            }
          }
        }
        this.gameEffects.set('isOxygenOff', false);
        this.oxygenTasksCompleted = 0;
        this.oxygenTasksRequired = 0;
      }

      if (this.gameEffects.get('oxygenCutNextRound')) {
        this.gameEffects.set('isOxygenOff', true);
        this.gameEffects.set('oxygenCutNextRound', false);
        const alivePlayers = this.getAlivePlayersCount();
        this.oxygenTasksRequired = Math.ceil(alivePlayers * this.oxygenTaskCompletionThreshold);
        this.oxygenTasksCompleted = 0;
        await this.channel.send(`# مستويات الأكسجين منخفضة بشكل خطير! يجب أن يذهب ${this.oxygenTasksRequired} لاعبين على الأقل إلى المستشفى لاستعادة الأكسجين! 🚑💨`);
        this.playAudio("sounds-emergency")
      }
  
      
      this.roundNumber++;
      this.reportedThisRound = false;
      this.killsThisRound.clear();
      await this.choosePlaces();
      await this.performActions();
    } finally {
      console.log("Round started successfully");
      this.isStartingRound = false;
    }
  }

  getAlivePlayersCount() {
    return Array.from(this.players.values()).filter(p => !p.isDead).length;
  }

   choosedPlaceComponent(place,isImposter,userId){
    const message = `لقد اخترت الذهاب الي : ${this.places.get(place).displayName}.`;    
    const components = [];

    if (isImposter) {
      const imposterAbilities = this.impostersAbilites.get(userId);
      if (!imposterAbilities?.cutElectric) {
        const cutElectricButton = new ButtonBuilder()
          .setCustomId('cut_electric')
          .setLabel('Cut Electric')
          .setStyle(ButtonStyle.Danger);

        components.push(
          new ActionRowBuilder().addComponents(cutElectricButton)
        );
      }
    }

    return { content: message, components};


  }

  async handleElectricOff(i){
    const playerId = i.user.id;
    if(this.impostersAbilites.get(playerId).cutElectric){
      return i.reply({
        content: '# "لا يمكنك قطع الكهرباء مرة اخرى"',
        ephemeral: true
      })
    }
    this.impostersAbilites.get(playerId).cutElectric = true;
    this.gameEffects.set("isElectricOff",true)
    await i.reply({ content: '# لقد قمت بقطع الكهرباء! 🔌💡', ephemeral: true });
    await i.channel.send("# تم قطع الكهرباء، ولن يستطيع أي أحد رؤية الآخر لمدة جولة. 🔌🚫👀")
    this.playAudio("sounds-electric-off")
    
    

  }

  getRandomAliveCrewmate() {
    const aliveCrewmates = Array.from(this.players.values()).filter(p => !p.isDead && !this.imposters.has(p.id));
    return aliveCrewmates[Math.floor(Math.random() * aliveCrewmates.length)];
  }

  async handleCutOxygen(imposterPlayerId) {

    

    if (this.gameEffects.get('isOxygenOff') || this.gameEffects.get('oxygenCutNextRound')) {
      return "Oxygen cut is already scheduled or active!";
    }
    
    if (!this.imposters.has(imposterPlayerId)) {
      return "Only imposters can cut oxygen!";
    }
    
    // if (this.oxygenCutUsed.has(imposterPlayerId)) {
    //   return "You have already used your oxygen cut ability this game!";
    // }
    if (this.oxygenCutUsed.size > 0) {
      return "تم قطع الاكسجين بالفعل في هذه اللعبة من قبل";
    }
    
    this.gameEffects.set('oxygenCutNextRound', true);
    this.oxygenCutUsed.add(imposterPlayerId);
    await this.channel.send("# تحذير: ستتعطل أنظمة الأكسجين في الجولة القادمة! ⚠️💨");
    this.playAudio("sounds-electric-off")

    return "Oxygen cut scheduled for the next round!";
  }


  async choosePlaces() {
    if (this.gameState === "ended" || !this) return;
    const embed = new EmbedBuilder()
      .setTitle(`الجولة ${this.roundNumber} - اختر مكانا`)
      .setDescription('اختر مكانا لتذهب اليه ')
      .setColor('#0099ff');

    const placeButtons = this.createPlaceButtons();

    const message = await this.channel.send({ 
      embeds: [embed], 
      components: placeButtons,
      files: [{ attachment: this.getImagePath("places-main.png"), name: "places-main.png" }]
    });

    const filter = i => this.players.has(i.user.id) ;
    const collector = message.createMessageComponentCollector({ filter, time: this.choosePlaceTime });

    let votedPlayers = 0;
    const alivePlayers = Array.from(this.players.values()).filter(p => !p.isDead).length;

    collector.on('collect', async i => {
      if(this.players.get(i.user.id).isDead){
        await i.reply({ content: 'يا ميت 🤣🤣', ephemeral: true });
        return;
      }
      if (i.customId.startsWith('place_')) {
        const player = this.players.get(i.user.id);
        if (!player.place) {
          votedPlayers++;
        }
        player.place = i.customId.split('_')[1];
        
        const {content,components} =  this.choosedPlaceComponent(player.place,this.imposters.has(i.user.id),i.user.id);
        await i.reply({ content, components,ephemeral: true });
        this.playerInteractions.set(i.user.id, i);
        if (votedPlayers === alivePlayers) {
          collector.stop('allVoted');
        }
      }
    });

    collector.on('end', (collected, reason) => {
      // Assign random places to players who didn't choose
      for (const [playerId, playerData] of this.players) {
        if (!playerData.place && !playerData.isDead) {
          const placesArray = Array.from(this.places.keys());
          playerData.place = placesArray[Math.floor(Math.random() * placesArray.length)];
        }
      }
      message.edit({ components: [] }); // Disable buttons after voting ends
    });

    // Wait for the full time or until all players have voted
    await new Promise(resolve => {
      collector.on('end', (collected, reason) => {
        resolve();
      });
    });
  }



  createPlaceButtons() {
    const buttons = Array.from(this.places.entries()).map(([placeId, placeData]) => {
      const button = new ButtonBuilder()
        .setCustomId(`place_${placeId}`)
        .setLabel(`${placeData.displayName} (${this.tasks.get(placeId)} مهمة)`)
        .setStyle(ButtonStyle.Primary);
  
      if (placeId === 'hospital' && this.gameEffects.get('isOxygenOff')) {
        button.setStyle(ButtonStyle.Danger)
          .setLabel(`${placeData.displayName}, خطأ (${this.getAlivePlayersCount()})`);
      }
  
      return button;
    });
  
    const rows = [];
    for (let i = 0; i < buttons.length; i += 3) {
      const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 3));
      rows.push(row);
    }
  
    return rows;
  }

  async performActions() {
    if (this.gameState === "ended") return;
    
    this.completedTasks.clear();

    const actionPromises = [];

    for (const [playerId, playerData] of this.players) {
      if (playerData.isDead) continue;

      const isImposter = this.imposters.has(playerId);
      const hasKilled = this.killsThisRound.has(playerId);
      const actionButtons = this.createActionButtons(playerId, playerData.place, isImposter, hasKilled);

      const embed = new EmbedBuilder()
        .setTitle(`الجولة ${this.roundNumber} - موقعك الان`)
        .setDescription(`انت الان في: ${this.places.get(playerData.place).displayName}`)
        .addFields(
          { name: 'اللاعبون في موقعك 👥📍', value: this.getPlayersInLocation(playerData.place) }
        )
        .setColor(isImposter ? '#ff0000' : '#0099ff');

      const interaction = this.playerInteractions.get(playerId);
      if (interaction) {
        try {
          if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
          }
          await interaction.editReply({
            embeds: [embed],
            components: actionButtons,
            files: [{ 
              attachment: this.getImagePath(`places-${this.places.get(playerData.place).imageFile}.png`), 
              name: `places-${this.places.get(playerData.place).imageFile}.png`
            }]
          });
        } catch (error) {
          console.error(`Error sending interaction response for player ${playerId}:`, error);
        }
      }
    }

    // Wait for all action messages to be sent
    await Promise.all(actionPromises);

    // Set a timeout to disable buttons after the action time
    setTimeout(() => this.disableActionButtons(), this.actionTime);

    // Wait for the action time before starting the next round
    await new Promise(resolve => setTimeout(resolve, this.actionTime));

    if (this.gameState === 'playing' || this.gameState === 'playingIm') {
      if (this.reportedThisRound) {
        this.isRoundInProgress = true;
        this.gameState = "playingIm";
      } else {
        this.isRoundInProgress = false;
        this.isStartingRound = false;
        this.gameState = "playing";
      }
      this.startRound(false);
      if (this.reportedThisRound) {
        this.reportedThisRound = false;
      }
    }
  }


  async disableActionButtons() {
    for (const [playerId, interaction] of this.playerInteractions) {
      try {
        const message = await interaction.fetchReply();
        const disabledComponents = message.components.map(row => {
          const disabledRow = new ActionRowBuilder();
          row.components.forEach(component => {
            disabledRow.addComponents(
              ButtonBuilder.from(component).setDisabled(true)
            );
          });
          return disabledRow;
        });

        await interaction.editReply({ components: disabledComponents });
      } catch (error) {
        console.error(`Error disabling buttons for player ${playerId}:`, error);
      }
    }
  }



  createActionButtons(playerId,place, isImposter, hasKilled = false) {
    const isElectricOff = this.gameEffects.get('isElectricOff');
    const buttons = [];

    if (!isImposter) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`task_${this.roundNumber}`)
          .setLabel('انجز مهمة')
          .setStyle(ButtonStyle.Success)
      );
    } else if (!hasKilled) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('kill')
          .setLabel('Kill')
          .setStyle(ButtonStyle.Danger)
      );
    }

    if (isImposter && !this.gameEffects.get('isOxygenOff') && !this.gameEffects.get('oxygenCutNextRound') && !this.oxygenCutUsed.has(playerId)) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('cut_oxygen')
          .setLabel('Cut Oxygen')
          .setStyle(ButtonStyle.Danger)
      );
    }

    if (Array.from(this.deadBodies.values()).includes(place) && !this.reportedThisRound) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('report')
          .setLabel('ابلاغ عن جثة')
          .setStyle(ButtonStyle.Primary)
      );
    }

    if (place === 'hall') {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('report_sus')
          .setLabel('اجتماع طارئ')
          .setEmoji("⚠️")
          .setStyle(ButtonStyle.Primary)
      );
    }

    if (this.roundNumber - this.lastHintRound >= 3) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('hint')
          .setLabel('تلميح')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    return [new ActionRowBuilder().addComponents(buttons)];
  }


  async handleReportSus(reporterId) {
    const reporter = this.players.get(reporterId);
    if (!reporter || reporter.isDead || reporter.place !== 'hall' || this.gameState =="ended") {
      return "You can't report from here!";
    }
    

    if (this.reportedThisRound) {
      return "تم الإبلاغ عن جثة في هذه الجولة بالفعل! ⚠️👤";
    }


    if (this.gameEffects.get('isOxygenOff') && this.oxygenTasksRequired > this.oxygenTasksCompleted) {
      return "الأوكسجين متوقف! أكملوا مهام الأوكسجين أولًا!";
    }


    this.reportedThisRound = true;
    this.gameState = 'voting';
    


    const interaction = this.playerInteractions.get(reporterId);
    if (interaction) {
      await interaction.followUp({
        content: 'لقد دعوت إلى اجتماع طارئ! 🚨👥',
        ephemeral: true
      });
    }
    this.playAudio("sounds-emergency")

    await this.channel.send(`اجتماع طارئ! <@${reporter.id}> قد دعا إلى اجتماع طارئ! 🚨👥`);
    this.startVoting();  
  }




  getPlayersInLocation(place) {
    const isElectricOff = this.gameEffects.get('isElectricOff');
    // if (this.gameEffects.get('isElectricOff')) return "electric is off"
    const playersHere = Array.from(this.players.values())
      .filter(p => p.place === place)
      .map(p => {
        if (isElectricOff) {
          return p.isDead && this.deadBodies.get(p.id) === place ? '💀' : '👤';
        }
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
      .map(([placeId, count]) => `${this.places.get(placeId).displayName}: ${count}`)
      .join('\n');
  }

  async handleTask(playerId, roundNum) {
    const player = this.players.get(playerId);
    if (!player || player.isDead || this.imposters.has(player.id) || this.reportedThisRound || parseInt(roundNum) != this.roundNumber || this.gameState !== "playing") {
      return "You can't do tasks!";
    }

    

    if (this.gameEffects.get('isOxygenOff') && player.place === 'hospital') {
      if (this.completedTasks.has(playerId)) {
        return "لقد قمت بعمل مهمة بالفعل هذه الجولة !";
      }

      const taskQuestion = this.getRandomTaskQuestion();
      const result = await this.askTaskQuestion(playerId, taskQuestion);

      if (result && !this?.players?.get(playerId)?.isDead) {
        this.completedTasks.add(playerId);
        this.oxygenTasksCompleted++;
        
        await this.channel.send(`مهمة استعادة الأكسجين! (${this.oxygenTasksCompleted}/${this.oxygenTasksRequired}) 💪💨`);

        if (this.oxygenTasksCompleted >= this.oxygenTasksRequired && this.gameEffects.get("isOxygenOff")) {
          this.gameEffects.set('isOxygenOff', false);
          await this.channel.send("# تم استعادة مستويات الأكسجين! 💨✨");
          this.playAudio("sounds-oxygen-restored");
        }

        await this.updateActionButtons(playerId);
        return "تم إتمام مهمة الأكسجين! انتظر حتى يكمل الآخرون المهمة! ✅💨";
      } else {
        return "فشلت مهمة الأكسجين. حاول مرة أخرى! ❌💨";
      }
    }

    // Handle regular tasks
    const tasksRemaining = this.tasks.get(player.place);
    if (tasksRemaining <= 0) {
      return `لا توجد مهام متبقية في ${this.places.get(player.place).displayName}! 🚫🛠️`;
    }


    if (this.completedTasks.has(playerId)) {
      return "لقد أكملت مهمة بالفعل في هذه الجولة! ✅🔄";
    }

    const taskQuestion = this.getRandomTaskQuestion();
    const result = await this.askTaskQuestion(playerId, taskQuestion);

    if (result && !this?.players?.get(playerId)?.isDead) {
      if (this.tasks.get(player.place) > 0) {
        this.tasks.set(player.place, this.tasks.get(player.place) - 1);
      }
      this.completedTasks.add(playerId);
      
      if (this.checkCrewmateWin()) {
        this.endGame('crewmate');
        return "تم إتمام جميع المهمات! فازوا المواطنون! ✅🏆 ";
      }
      await this.updateActionButtons(playerId);
      return `تم إتمام المهمة في ${this.places.get(player.place).displayName}! ✅✨!`;
    } else {
      await this.updateActionButtons(playerId);
      return "فشلت المهمة. حاول مرة أخرى في الجولة القادمة! ❌🔄";
    }
  }

  getRandomTaskQuestion() {
    const randomIndex = Math.floor(Math.random() * this.taskQuestions.length);
    return this.taskQuestions[randomIndex];
  }

  async askTaskQuestion(playerId, taskQuestion) {
    
    const { question, answers, correctAnswer } = taskQuestion;

    const embed = new EmbedBuilder()
      .setTitle('سوال المهمة')
      .setDescription(question)
      .setColor('#00ff00');

    const answerButtons = answers.map(answer => 
      new ButtonBuilder()
        .setCustomId(`answer_${answer}`)
        .setLabel(answer)
        .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(answerButtons);

    const interaction = this.playerInteractions.get(playerId);
    if (!interaction) return false;

    let message;
    try {
      message = await interaction.followUp({
        embeds: [embed],
        components: [row],
        ephemeral: true,
        fetchReply: true
      });
    } catch (error) {
      console.error('Error sending task question:', error);
      return false;
    }
    const player = this.players.get(playerId);
    try {
      const filter = i => i.user.id === playerId && i.customId.startsWith('answer_');
      const response = await message.awaitMessageComponent({ filter, time: 30000 });
      if(this.gameState !== "playing"){
        return false;
      }
      const selectedAnswer = response.customId.split('_')[1];
      const isCorrect = selectedAnswer === correctAnswer;
      let replyOptions;
      if(player.isDead){
        replyOptions = { content: "لا يمكنك إتمام المهام (يا ميت). 💀🚫", components: [], ephemeral: true };
      }
      if(this.reportedThisRound){
        replyOptions = { content: "لا يمكنك إتمام المهام . 💀🚫", components: [], ephemeral: true };
        return false;
      }

      replyOptions = {
        content: isCorrect ? 'إجابة صحيحة! المهمة مكتملة اذهب الي مكان اخر واكمل باقي المهمات ! ✅🎉' : `إجابة خاطئة. الإجابة الصحيحة كانت ${correctAnswer}. ❌🔍`,
        components: [],
        ephemeral: true
      };

      try {
        await response.update(replyOptions);
      } catch (error) {
        console.error('Error updating response:', error);
        await interaction.followUp(replyOptions);
      }

      return isCorrect;
    } catch (error) {
      console.error('Error handling task response:', error);
      try {
        await interaction.followUp({ content: 'You did not answer in time. Task failed.', ephemeral: true });
      } catch (followUpError) {
        console.error('Error sending follow-up message:', followUpError);
      }
      return false;
    }
  }


  async handleKill(killerId, targetId,roundNum) {
    if (!this.imposters.has(killerId)) return "أنت لست من الامبوستر! ❌👾";

    const killer = this.players.get(killerId);
    const target = this.players.get(targetId);
    
    if (this.imposters.has(targetId)) {
      return "لا يمكنك قتل سفاح !";
    }

    if (!killer || !target || killer.isDead || target.isDead || killer.place !== target.place || parseInt(roundNum) != this.roundNumber || this.gameState == "ended") {
      return "محاولة قتل خاطئة";
    }

    // Check if there's a kill this round
    if (this.killsThisRound.size > (this.players.size > 9 ? 1 : 0)) {
      return "تم قتل شخص بالفعل هذه الجولة !";
    }
    

    if (this.reportedThisRound) {
      return "تم الابلاغ عن جثة هذه الجولة !";
    }

    if (this.killsThisRound.has(killerId)) {
      return "لقد قتلت شخص بالفعل هذه الجولة !";
    }

    target.isDead = true;
    this.deadPlayers.add(targetId);
    this.deadBodies.set(targetId, target.place);
    this.killsThisRound.set(killerId, targetId); // Record the kill for this round
    
    // Announce the kill to the channel
    await this.channel.send(`# ⚠️ تحذير: تم قتل شخص! ابحث عنه!`);
    this.playAudio("sounds-kill");

    // Notify the killed player
    const interaction = this.playerInteractions.get(targetId);
    if (interaction) {
      await interaction.followUp({ 
        content: `لقد تم قتلك! لا يمكنك المشاركة في اللعبة بعد الآن، لكن يمكنك المشاهدة بصمت. القاتل : <@${killerId}>. 💀👁️‍🗨️`, 
        ephemeral: true,
        files: [{ attachment: this.getImagePath(`kill.gif`), name: `kill.gif` }] 
      });
      
      // Remove the player's ability to send messages in the channel
      await this.channel.permissionOverwrites.edit(targetId, { SendMessages: false });
      this.mutedPlayers.add(targetId);
    }

    // Update the killer's action buttons
    await this.updateActionButtons(killerId);
    
    if (this.checkImposterWin()) {
      this.endGame('imposter');
      return `لقد قمت بقتل ${target.name}! الفائز هو الامبوستر! 💀🏆`;
    }
    
    return `لقد قمت بقتل ${target.name}! 💀🔪`;
  }

  async updateActionButtons(killerId) {
    const killer = this.players.get(killerId);
    // const updatedButtons = this.createActionButtons(killer.place, true, true);

    const interaction = this.playerInteractions.get(killerId);
    if (interaction) {
      try {
        await interaction.editReply({
          components: []
        });
      } catch (error) {
        console.error(`Error updating action buttons for player ${killerId}:`, error);
      }
    }
  }



  async handleHint(playerId) {
    if (this.roundNumber - this.lastHintRound < 3) {
      return "التلميح غير متاح بعد. انتظر ثلاث جولات بين التلميحات. ⏳🔍";
    }

    this.lastHintRound = this.roundNumber;

    const deadBodiesInfo = Array.from(this.deadBodies.entries())
      .map(([deadPlayerId, place]) => `${this.players.get(deadPlayerId).name} in ${this.places.get(place).displayName}`)
      .join(', ');

    const hintMessage = deadBodiesInfo
      ? `هناك جثث في: ${deadBodiesInfo} !💀`
      : "لا توجد جثث في الوقت الحالي. 🚫💀";

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
    if (!reporter || reporter.isDead || this.gameState =="ended") return "You can't report!";

    const reportedBody = Array.from(this.deadBodies.entries()).find(([_, place]) => place === reporter.place);
    if (!reportedBody) {
      return "لا توجد جثة هنا لتقديم بلاغ عنها! 🚫👻";
    }

    if (this.reportedThisRound) {
      return "تم الإبلاغ عن جثة في هذه الجولة بالفعل! 👤🚫";
    }

    if (this.gameEffects.get('isOxygenOff') && this.oxygenTasksRequired > this.oxygenTasksCompleted) {
      return "الأوكسجين متوقف! أكملوا مهام الأوكسجين أولًا!";
    }

    this.reportedThisRound = true;
    this.gameState = 'voting';
    

    // Announce the report to the channel
    const deadPlayer = this.players.get(reportedBody[0]);
    await this.channel.send({
      content: `# اجتماع طارئ! <@${reporter.id}> أبلغ عن جثة <@${deadPlayer.id}> في ${this.places.get(reporter.place).displayName}! 🚨👥`,
      files: [{ attachment: this.getImagePath(`someone-die.gif`), name: `someone-die.gif` }]
    });
    this.playAudio("sounds-emergency");

    this.startVoting();
    return "تم الإبلاغ عن جثة! تم استدعاء اجتماع طارئ! 🚨💬";
  }


  async startVoting() {
    this.votes.clear();
    const embed = new EmbedBuilder()
      .setTitle('اجتماع طارئ')
      .setDescription('تم الإبلاغ عن جثة! صوّتوا لطرد لاعب. 🗳️💨')
      .setColor('#ff0000');
    this.openChat();
    const voteButtons = this.createVoteButtons();

    const message = await this.channel.send({ embeds: [embed], components: voteButtons });
    const rememberMeesage =  setTimeout(() => {
      if(this && this?.gameState == "voting"){
        message.reply({ content: "يرجى التصويت على لاعب قبل انتهاء الوقت !!"});
      }
    }, this.votingTime - 20000);
    const filter = i => this.players.has(i.user.id) && !this.players.get(i.user.id).isDead;
    const collector = message.createMessageComponentCollector({ filter,time:this.votingTime });

    let votedPlayers = 0;
    const alivePlayers = Array.from(this.players.values()).filter(p => !p.isDead).length;

    collector.on('collect', async i => {
      const voterId = i.user.id;
      const votedId = i.customId.split('_')[1];
      
      const voter = this.players.get(voterId);
      if (!voter || voter.isDead) {
        await i.reply({ content: "لا يمكنك التصويت لأنك إما لست في اللعبة أو أنك ميت! 🚫👾💀", ephemeral: true });
        return;
      }

      if (!this.votes.has(voterId)) {
        votedPlayers++;
      }
      
      this.votes.set(voterId, votedId);
      await i.reply({ content: `لقد قمت باختيار ${this?.players?.get(votedId)?.name || 'تخطي'}.`, ephemeral: true });
      
      // Update vote counts
      await this.updateVoteCounts(message);
      
      if (votedPlayers === alivePlayers) {
        collector.stop();
      }
    });

    collector.on('end', async (collected, reason) => {
      clearTimeout(rememberMeesage);
      
      if (reason === 'time') {
        await message.edit({ content: "انتهى وقت التصويت! لم يتم تسجيل أي أصوات. ⏳🗳️" });
        await this.resolveVotes(message);
      }else{
        await this.resolveVotes(message);
      }

      // // Check game state and start next round if necessary
      // if (this.gameState === 'playing' || this.gameState === 'playingIm') {
        
      //   this.startRound(true);
      // }
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
              .setLabel(`تخطي (${voteCount})`)
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
        .setLabel('تخطي (0)')
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
    this.closeChat();
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
    this.isRoundInProgress = false;

    const alivePlayers = Array.from(this.players.values()).filter(p => !p.isDead).length;
    const requiredVotes = Math.floor(alivePlayers / 2) + 1;

    if (ejectedId && ejectedId !== 'skip' && maxVotes >= requiredVotes) {
      const ejectedPlayer = this.players.get(ejectedId);
      ejectedPlayer.isDead = true;
      this.deadPlayers.add(ejectedId);

      
      // Remove access to send messages for the ejected player
      await this.channel.permissionOverwrites.edit(ejectedId, { SendMessages: false });
      this.mutedPlayers.add(ejectedId);

      const isImposter =  this.imposters.has(ejectedId);
      await this.channel.send({
        content:`# لقد تم طرد <@${ejectedPlayer.id}> وقد كان  ${isImposter ? 'سفاح' : 'مواطن'}.`,
        files: [{ attachment: this.getImagePath(isImposter? 'imposter-dead.gif' : 'not-imposter-dead.gif'), name: `${isImposter? 'imposter-dead' : 'not-imposter-dead'}.gif` }]
      });
      this.playAudio("sounds-eject");

      if (this.checkAllTasksCompleted()) {
        this.endGame('crewmate');
      }
      else if (this.checkAllImpostersDead()) {
        this.endGame('crewmate');
      } 
      else if (this.checkImposterWin()) {
        this.endGame('imposter');
      } 
      else {
        console.log("from here condition")
        // this.isStartingRound = false;
        this.startRound(true);
        // this.startRound();
      }
    } else {
      console.log("SAME CASE");
      await this.channel.send('# لم يُطرد أحد. من اللعبة 🚀');
      // this.isStartingRound = false;
      this.startRound(true);
      
    }

    // Remove reported bodies after vote
    this.deadBodies.clear();
    this.votes.clear();
    await message.edit({ components: [] }); // Disable voting buttons
  }  

  checkAllTasksCompleted() {
    return Array.from(this.players.values())
      .filter(player => !this.imposters.has(player.id))
      .every(player => player.tasks === 0);
  }
  
  checkAllImpostersDead() {
    return Array.from(this.imposters).every(imposter => this.deadPlayers.has(imposter));
  }



  checkCrewmateWin() {
    return Array.from(this.tasks.values()).every(t => t === 0);
  }

  checkImposterWin() {
    const aliveCrew = Array.from(this.players.values()).filter(p => !p.isDead && !this.imposters.has(p.id));
    return aliveCrew.length <= this.imposters.size;
  }
  

  endGame(winner) {
    this.gameState = 'ended';

    const embed = new EmbedBuilder()
      .setTitle('انتهت اللعبة 🎮🚫')
      .setDescription(`فازو الـ ${winner === 'imposter' ? 'سفاحين' : 'مواطنين'}! 🎉🏆!`)
      .addFields(
        { name: 'السفاحين', value: this.getImpostersList() || "no body" },
        { name: 'المواطنين', value: this.getCrewmatesList() || "no body" }
      )
      .setColor(winner === 'imposter' ? '#ff0000' : '#00ff00');

    this.channel.send({ embeds: [embed] });

    this.playAudio(winner === "imposter" ? "sounds-imposter-win" : "sounds-crewmate-win");

    this.mutedPlayers.forEach(playerId => {
      this.channel.permissionOverwrites.delete(playerId);
    });
    this.openChat();
    setTimeout(() => {
      this.connection.destroy();
      client.games.delete(this.channel.id);
    }, 10000);
  }

  getImpostersList() {
    return Array.from(this.imposters)
      .map(id => `${this.players.get(id).name}${this.deadPlayers.has(id) ? ' 💀' : ''}`)
      .join('\n');
  }
  

  getCrewmatesList() {
    return Array.from(this.players.values())
      .filter(p => !this.imposters.has(p.id))
      .map(p => `${p.name}${this.deadPlayers.has(p.id) ? ' 💀' : ''}`)
      .join('\n');
  }
}

module.exports = AmongUsGame;

//game