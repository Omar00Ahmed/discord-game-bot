const { Message, ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType, EmbedBuilder,PermissionsBitField } = require('discord.js');
const { prefix } = require("../../utils/MessagePrefix");
const { addPlayerPoints,addTototalGames } = require("../../db/playersScore");

const GAME_DURATION = 300000; // 5 minutes in milliseconds
const LOBBY_DURATION = 30000; // 30 seconds for lobby
const TOTAL_ROWS = 10; // Total number of rows in the game
const ROWS_PER_MESSAGE = 5; // Number of rows per message (Discord limit)

const allowedChannels = [
  "1300852265258586212"
];

function createGlassPath(length) {
  return Array(length).fill().map(() => Math.random() < 0.5);
}

module.exports = {
  name: 'glass_bridge',
  /**
   * @param {Message} message The message object
   */
  async execute(message, client) {
  
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'الجسر') {
      if(message.author.bot || !message.member.permissions.has(PermissionsBitField.Flags.Administrator) && !checkIfCanMute(message.member,"moderate")) return;

      const existingGame = client.games.get(message.channelId);
      if (existingGame || Array.from(client?.gamesStarted.values()).some(game => game.channelId === message.channelId) || !allowedChannels.includes(message.channelId)) {
        return message.react("❌");
      }
      client.gamesStarted.set("glassBridge", {
        started:true,
        channelId: message.channelId,
      });
      const glassPath = createGlassPath(TOTAL_ROWS);
      console.log(glassPath);
      let players = new Set();
      let playersOriginalCount;
      let currentPlayerIndex = 0;
      let currentRow = 0;
      let gameEnded = false;
      let playersAttempts = new Map();

      try {
        const joinButton = new ButtonBuilder()
          .setCustomId('join')
          .setLabel('انضم للعبة')
          .setStyle(ButtonStyle.Primary);

        const leaveButton = new ButtonBuilder()
          .setCustomId('leave')
          .setLabel('غادر اللعبة')
          .setStyle(ButtonStyle.Danger);

        // const startButton = new ButtonBuilder()
        //   .setCustomId('start')
        //   .setLabel('ابدأ اللعبة')
        //   .setStyle(ButtonStyle.Success);

        const lobbyRow = new ActionRowBuilder().addComponents(joinButton, leaveButton);

        const lobbyEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('لعبة جسر الزجاج')
          .setDescription('انقر على زر الانضمام للمشاركة. اللعبة ستبدأ خلال 30 ثانية.')
          .addFields({ name: 'اللاعبون', value: 'لا يوجد لاعبون حتى الآن' });

        const lobbyMessage = await message.reply({
          content:`||@everyone||`,
          embeds: [lobbyEmbed],
          components: [lobbyRow]
        });

        const lobbyCollector = lobbyMessage.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: LOBBY_DURATION
        });

        lobbyCollector.on('collect', async (interaction) => {
          if (interaction.customId === 'join') {
            players.add(interaction.user.id);
            await interaction.update({ content: `||@everyone||`});
          } else if (interaction.customId === 'leave') {
            players.delete(interaction.user.id);
            await interaction.update({ content: ` `});
          } else if (interaction.customId === 'start' && interaction.user.id === message.author.id) {
            await interaction.reply('جاري بدء اللعبة...');
            lobbyCollector.stop('gameStart');
            return;
          }

          await updateLobbyMessage();
        });

        async function updateLobbyMessage() {
          const playerList = Array.from(players).map(id => `- <@${id}>`).join('\n');
          lobbyEmbed.setFields({ name: 'اللاعبون', value: playerList || 'لا يوجد لاعبون حتى الآن' })
            .setDescription(`انقر على زر الانضمام للمشاركة. اللعبة ستبدأ خلال ${Math.ceil((LOBBY_DURATION - (Date.now() - lobbyMessage.createdTimestamp)) / 1000)} ثانية.`);
          await lobbyMessage.edit({ embeds: [lobbyEmbed], components: [lobbyRow] });
        }

        lobbyCollector.on('end', async (collected, reason) => {
          if (players.size < 4) {
            await lobbyMessage.edit({ content: 'عدد لاعبين غير كافي ! يجب على الاقل وجود 4 لاعبين', embeds: [], components: [] });
            client.gamesStarted.delete("glassBridge")
            return;
          }

          if (reason === 'gameStart' || reason === 'time') {
            setTimeout(() => {
              if (!gameEnded) {
                endGame('timeout');
              }
            }, GAME_DURATION);
            lobbyMessage.edit({components:[]});
            await startGame();
          }
        });

        let gameMessage1, gameMessage2;

        async function startGame() {
          playersOriginalCount = players.size;
          players.forEach(playerId =>{
            addTototalGames(playerId,message.guild.id);
            
          })
          // Shuffle players array
          playersArray = Array.from(players);
          for (let i = playersArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playersArray[i], playersArray[j]] = [playersArray[j], playersArray[i]];
          }
          players = new Set(playersArray);
          
          const gameEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('لعبة جسر الزجاج')
            .setDescription(`بدأت اللعبة مع ${players.size} لاعبين! استعدوا لدوركم!`);

          const [components1, components2] = createGameButtons();
          gameMessage1 = await message.channel.send({ embeds: [gameEmbed], components: components1 });
          gameMessage2 = await message.channel.send({ components: components2 });
          await gameMessage2.react("⬅️");
          await gameMessage2.react("➡️")
          await playTurn();
        }

        function createGameButtons() {
          const rows1 = [], rows2 = [];
          const baseButton = {
            label: ' ` ',
            style: ButtonStyle.Primary
          };
          
          for (let i = 0; i < TOTAL_ROWS; i++) {
            const isCurrentRow = i === currentRow;
            const isPastRow = i < currentRow;
            
            const leftButton = new ButtonBuilder()
              .setCustomId(`left_${i}`)
              .setLabel(baseButton.label)
              .setStyle(isPastRow ? (glassPath[i] ? ButtonStyle.Success : ButtonStyle.Danger) : ButtonStyle.Primary)
              .setDisabled(!isCurrentRow);
        
            const rightButton = new ButtonBuilder()
              .setCustomId(`right_${i}`)
              .setLabel(baseButton.label)
              .setStyle(isPastRow ? (!glassPath[i] ? ButtonStyle.Success : ButtonStyle.Danger) : ButtonStyle.Primary)
              .setDisabled(!isCurrentRow);
        
            const row = new ActionRowBuilder().addComponents(
              leftButton,
              new ButtonBuilder()
                .setCustomId(`mid_${i}`)
                .setLabel('|')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              rightButton
            );
        
            (i < ROWS_PER_MESSAGE ? rows1 : rows2).push(row);
          }
          return [rows1, rows2];
        }
        

        async function updateGameMessages(embed = null, reason, content) {
          const [components1, components2] = createGameButtons();
          if(reason == "allFailed" || reason == "timeout") {
            await Promise.all([
              gameMessage2.delete(),
              gameMessage1.edit({embeds:[embed], components:[], content: null})
            ]);
            return;
          }
          
          // Combine content and embed updates into a single edit
          const updateOptions = {
            components: components1,
            content: content || null,
            embeds: embed ? [embed] : null
          };
          
          await Promise.all([
            gameMessage1.edit(updateOptions),
            gameMessage2.edit({components: components2})
          ]);
        }
        

        async function playTurn() {
          if (gameEnded) return;

          const playerArray = Array.from(players);
          const currentPlayer = playerArray[currentPlayerIndex];

          const gameEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('لعبة جسر الزجاج')
            .setDescription(`دور <@${currentPlayer}>! اختر يسار أو يمين للخطوة ${currentRow + 1}:`)
            .addFields({ name: 'اللاعبون المتبقون', value: playerArray.map(id => `<@${id}>`).join(', ') });

          await updateGameMessages(gameEmbed,"updateContent",`دور <@${currentPlayer}>! اختر يسار أو يمين للخطوة ${currentRow + 1}:`);
          
          const filter = i => i.user.id === currentPlayer && ['left', 'right'].includes(i.customId.split('_')[0]);
          try {
            const response = await Promise.race([
              gameMessage1.awaitMessageComponent({ filter, time: 10000 }),
              gameMessage2.awaitMessageComponent({ filter, time: 10000 })
            ]);
            const [choice, rowIndex] = response.customId.split('_');

            if (glassPath[currentRow] === (choice === 'left')) {
              currentRow++;
                if (response.message.id === gameMessage2.id) {
                    await response.update({ content: ` ` });
                    await gameMessage1.edit({ content: `✅ <@${currentPlayer}> اجتاز بنجاح!` });
                } else {
                    await response.update({ content: `✅ <@${currentPlayer}> اجتاز بنجاح!` });
                }
                if (currentRow === TOTAL_ROWS) {
                    await endGame('win', currentPlayer);
                } else {
                    await playTurn(); // Continue with the same player
                }
            } else {
                if(currentRow === 0)currentRow++;
                
                if (response.message.id === gameMessage2.id) {
                    await response.update({ content: ` ` });
                    await gameMessage1.edit({ content: `💥 أوه لا! <@${currentPlayer}> سقط من الجسر!` });
                } else {
                    await response.update({ content: `💥 أوه لا! <@${currentPlayer}> سقط من الجسر!` });
                }
                
                playersAttempts.set(currentPlayer, (playersAttempts.get(currentPlayer) || 0) + 1);
                if(playersAttempts.get(currentPlayer) >= (playersOriginalCount > 9 ? 0 : 2)) {
                    players.delete(currentPlayer);
                }

                if (players.size === 0) {
                    await endGame('allFailed');
                } else {
                    currentPlayerIndex = (currentPlayerIndex + 1) % players.size; // Move to the next player
                    // currentRow = 0; // Reset the row for the new player
                    await playTurn();
                }
            }
          } catch (error) {
            const timeoutEmbed = new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('لعبة جسر الزجاج')
              .setDescription(`<@${currentPlayer}> لم يستجب في الوقت المحدد وسقط من الجسر!`);
            await updateGameMessages(timeoutEmbed);
            players.delete(currentPlayer);
            if (players.size === 0) {
              await endGame('allFailed');
            } else {
              currentPlayerIndex = (currentPlayerIndex + 1) % players.size; // Move to the next player
              // currentRow = 0; // Reset the row for the new player
              await playTurn();
            }
          }
        }

        async function endGame(reason, winner = null) {
          if (gameEnded) return;
          gameEnded = true;
        
          client.gamesStarted.delete("glassBridge");

          const endEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('نهاية لعبة جسر الزجاج');

          if (reason === 'win') {
            const pointsEarned = 10; // You can adjust this as needed
            const newPoints = await addPlayerPoints(winner,message.guild.id ,pointsEarned);

            endEmbed.setDescription(`🏆 <@${winner}> فاز باللعبة وحصل على ${pointsEarned} نقاط!`)
              .addFields({ name: 'النقاط الجديدة', value: `${newPoints}` });
            
            const pointsButton = new ButtonBuilder()
            .setCustomId('points')
            .setLabel(`النقاط : ${newPoints}`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("💎")
            .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(pointsButton);
            console.log("won")
            await message.channel.send({
                content: `🏆 <@${winner}> فاز باللعبة وحصل على ${pointsEarned} نقاط `,
                components: [row],
            });

          }
          else if (reason === 'timeout') {
            endEmbed.setDescription('انتهى وقت اللعبة! لم يتمكن أي لاعب من عبور الجسر بالكامل.');
          }
          else if (reason === 'allFailed') {
            endEmbed.setDescription('انتهت اللعبة! جميع اللاعبين سقطوا من الجسر.');
          } 

          await updateGameMessages(endEmbed,reason);
        }

        // Set a timeout for the entire game
        

      } catch (error) {
        console.error('Error in the Glass Bridge game:', error);
        await message.reply('حدث خطأ أثناء اللعبة. حاول مرة أخرى لاحقًا.').catch(console.error);
        client.gamesStarted.delete("glassBridge")
      }
    }
  },
};