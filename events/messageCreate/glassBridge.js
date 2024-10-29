const { Message, ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const { prefix } = require("../../utils/MessagePrefix");
const { addPlayerPoints } = require("../../db/playersScore");

const GAME_DURATION = 300000; // 5 minutes in milliseconds
const LOBBY_DURATION = 30000; // 30 seconds for lobby
const TOTAL_ROWS = 10; // Total number of rows in the game

const allowedChannels = [
  "1292642149493510184",
  "1277694414935953564",
  "1290377082123194428"
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
    if (message.author.bot) return; // Ignore bot messages
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'glass_bridge') {
      if (Array.from(client?.gamesStarted.values()).some(game => game) || !allowedChannels.includes(message.channelId)) {
        return message.react("❌");
      }

      client.gamesStarted.set("glassBridge", true);
      const glassPath = createGlassPath(TOTAL_ROWS);
      const players = new Set();
      let currentPlayerIndex = 0;
      let currentRow = 0;
      let gameEnded = false;

      try {
        const joinButton = new ButtonBuilder()
          .setCustomId('join')
          .setLabel('انضم للعبة')
          .setStyle(ButtonStyle.Primary);

        const leaveButton = new ButtonBuilder()
          .setCustomId('leave')
          .setLabel('غادر اللعبة')
          .setStyle(ButtonStyle.Danger);

        const startButton = new ButtonBuilder()
          .setCustomId('start')
          .setLabel('ابدأ اللعبة')
          .setStyle(ButtonStyle.Success);

        const lobbyRow = new ActionRowBuilder().addComponents(joinButton, leaveButton, startButton);

        const lobbyEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('لعبة جسر الزجاج')
          .setDescription('انقر على زر الانضمام للمشاركة. اللعبة ستبدأ خلال 30 ثانية.')
          .addFields({ name: 'اللاعبون', value: 'لا يوجد لاعبون حتى الآن' });

        const gameMessage = await message.reply({
          embeds: [lobbyEmbed],
          components: [lobbyRow]
        });

        const lobbyCollector = gameMessage.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: LOBBY_DURATION
        });

        lobbyCollector.on('collect', async (interaction) => {
          if (interaction.customId === 'join') {
            players.add(interaction.user.id);
            await interaction.reply({ content: `${interaction.user} انضم إلى اللعبة!`, ephemeral: true });
          } else if (interaction.customId === 'leave') {
            players.delete(interaction.user.id);
            await interaction.reply({ content: `${interaction.user} غادر اللعبة!`, ephemeral: true });
          } else if (interaction.customId === 'start' && interaction.user.id === message.author.id) {
            lobbyCollector.stop('gameStart');
            await interaction.reply('جاري بدء اللعبة...');
          }

          await updateLobbyMessage();
        });

        async function updateLobbyMessage() {
          const playerList = Array.from(players).map(id => `<@${id}>`).join(', ');
          lobbyEmbed.setFields({ name: 'اللاعبون', value: playerList || 'لا يوجد لاعبون حتى الآن' })
            .setDescription(`انقر على زر الانضمام للمشاركة. اللعبة ستبدأ خلال ${Math.ceil((LOBBY_DURATION - (Date.now() - gameMessage.createdTimestamp)) / 1000)} ثانية.`);
          await gameMessage.edit({ embeds: [lobbyEmbed], components: [lobbyRow] });
        }

        lobbyCollector.on('end', async (collected, reason) => {
          if (players.size === 0) {
            await gameMessage.edit({ content: 'لم ينضم أي لاعب. تم إلغاء اللعبة.', embeds: [], components: [] });
            client.gamesStarted.set("glassBridge", false);
            return;
          }

          if (reason === 'gameStart' || reason === 'time') {
            await startGame();
          }
        });

        async function startGame() {
          const gameEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('لعبة جسر الزجاج')
            .setDescription(`بدأت اللعبة مع ${players.size} لاعبين! استعدوا لدوركم!`);

          const components = createGameButtons();
          await gameMessage.edit({ embeds: [gameEmbed], components });
          await playTurn();
        }

        function createGameButtons() {
          const rows = [];
          for (let i = 0; i < TOTAL_ROWS; i++) {
            const leftButton = new ButtonBuilder()
              .setCustomId(`left_${i}`)
              .setLabel('يسار')
              .setStyle(i < currentRow ? (glassPath[i] ? ButtonStyle.Success : ButtonStyle.Danger) : ButtonStyle.Primary)
              .setDisabled(i !== currentRow);

            const rightButton = new ButtonBuilder()
              .setCustomId(`right_${i}`)
              .setLabel('يمين')
              .setStyle(i < currentRow ? (!glassPath[i] ? ButtonStyle.Success : ButtonStyle.Danger) : ButtonStyle.Primary)
              .setDisabled(i !== currentRow);

            rows.push(new ActionRowBuilder().addComponents(leftButton, rightButton));
          }
          return rows;
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

          const components = createGameButtons();
          await gameMessage.edit({ embeds: [gameEmbed], components });
          
          const filter = i => i.user.id === currentPlayer && ['left', 'right'].includes(i.customId.split('_')[0]);
          try {
            const response = await gameMessage.awaitMessageComponent({ filter, time: 30000 });
            const [choice, rowIndex] = response.customId.split('_');

            if (glassPath[currentRow] === (choice === 'left')) {
              currentRow++;
              await response.update({ content: `✅ <@${currentPlayer}> اجتاز بنجاح!` });

              if (currentRow === TOTAL_ROWS) {
                await endGame('win', currentPlayer);
              } else {
                currentPlayerIndex = (currentPlayerIndex + 1) % playerArray.length;
                await playTurn();
              }
            } else {
              await response.update({ content: `💥 أوه لا! <@${currentPlayer}> سقط من الجسر!` });
              players.delete(currentPlayer);
              if (players.size === 0) {
                await endGame('allFailed');
              } else {
                currentPlayerIndex = currentPlayerIndex % players.size;
                await playTurn();
              }
            }
          } catch (error) {
            await gameMessage.edit({ content: `<@${currentPlayer}> لم يستجب في الوقت المحدد وسقط من الجسر!` });
            players.delete(currentPlayer);
            if (players.size === 0) {
              await endGame('allFailed');
            } else {
              currentPlayerIndex = currentPlayerIndex % players.size;
              await playTurn();
            }
          }
        }

        async function endGame(reason, winner = null) {
          if (gameEnded) return;
          gameEnded = true;
          client.gamesStarted.set("glassBridge", false);

          const endEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('نهاية لعبة جسر الزجاج');

          if (reason === 'win') {
            const pointsEarned = 10; // You can adjust this as needed
            const newPoints = await addPlayerPoints(winner, pointsEarned);

            endEmbed.setDescription(`🏆 <@${winner}> فاز باللعبة وحصل على ${pointsEarned} نقاط!`)
              .addFields({ name: 'النقاط الجديدة', value: `${newPoints}` });

          } else if (reason === 'allFailed') {
            endEmbed.setDescription('انتهت اللعبة! جميع اللاعبين سقطوا من الجسر.');
          } else if (reason === 'timeout') {
            endEmbed.setDescription('انتهى وقت اللعبة! لم يتمكن أي لاعب من عبور الجسر بالكامل.');
          }

          await gameMessage.edit({ embeds: [endEmbed], components: [] });
        }

        // Set a timeout for the entire game
        setTimeout(() => {
          if (!gameEnded) {
            endGame('timeout');
          }
        }, GAME_DURATION);

      } catch (error) {
        console.error('Error in the Glass Bridge game:', error);
        await message.reply('حدث خطأ أثناء اللعبة. حاول مرة أخرى لاحقًا.').catch(console.error);
        client.gamesStarted.set("glassBridge", false);
      }
    }
  },
};