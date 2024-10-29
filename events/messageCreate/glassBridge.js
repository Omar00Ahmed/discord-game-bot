const { Message, ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { prefix } = require("../../utils/MessagePrefix");
const { addPlayerPoints } = require("../../db/playersScore");

const GAME_DURATION = 300000; // 5 minutes in milliseconds
const LOBBY_DURATION = 30000; // 30 seconds for lobby
const ROWS_PER_MESSAGE = 5; // Number of rows per message
const TOTAL_ROWS = 10; // Total number of rows in the game

const allowedChannels = [
  "1292642149493510184",
  "1277694414935953564",
  "1290377082123194428",
  "1287498380762677328"
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

        const initialMessage = await message.reply({
          content: '# لعبة جسر الزجاج بدأت! انقر على زر الانضمام للمشاركة. اللعبة ستبدأ خلال 30 ثانية.',
          components: [lobbyRow]
        });

        const lobbyCollector = initialMessage.createMessageComponentCollector({
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
          await initialMessage.edit({
            content: `# لعبة جسر الزجاج\nاللاعبون: ${playerList || 'لا يوجد لاعبون حتى الآن'}\nانقر على زر الانضمام للمشاركة. اللعبة ستبدأ خلال ${Math.ceil((LOBBY_DURATION - (Date.now() - initialMessage.createdTimestamp)) / 1000)} ثانية.`,
            components: [lobbyRow]
          });
        }

        lobbyCollector.on('end', async (collected, reason) => {
          if (players.size === 0) {
            await message.channel.send('لم ينضم أي لاعب. تم إلغاء اللعبة.');
            client.gamesStarted.set("glassBridge", false);
            return;
          }

          if (reason === 'gameStart' || reason === 'time') {
            await message.channel.send(`بدأت اللعبة مع ${players.size} لاعبين! استعدوا لدوركم!`);
            await playTurn();
          }
        });

        async function playTurn() {
          if (gameEnded) return;

          const playerArray = Array.from(players);
          const currentPlayer = playerArray[currentPlayerIndex];
          const buttonsMessage = await createButtonsMessage();
          
          const filter = i => i.user.id === currentPlayer && ['left', 'right'].includes(i.customId);
          try {
            const response = await buttonsMessage.awaitMessageComponent({ filter, time: 30000 });
            const choice = response.customId === 'left' ? 0 : 1;

            if (glassPath[currentRow] === (choice === 0)) {
              currentRow++;
              await response.update({ content: `✅ <@${currentPlayer}> اجتاز بنجاح!`, components: [] });

              if (currentRow === TOTAL_ROWS) {
                await endGame('win', currentPlayer);
              } else {
                currentPlayerIndex = (currentPlayerIndex + 1) % playerArray.length;
                await playTurn();
              }
            } else {
              await response.update({ content: `💥 أوه لا! <@${currentPlayer}> سقط من الجسر!`, components: [] });
              players.delete(currentPlayer);
              if (players.size === 0) {
                await endGame('allFailed');
              } else {
                currentPlayerIndex = currentPlayerIndex % players.size;
                await playTurn();
              }
            }
          } catch (error) {
            await message.channel.send(`<@${currentPlayer}> لم يستجب في الوقت المحدد وسقط من الجسر!`);
            players.delete(currentPlayer);
            if (players.size === 0) {
              await endGame('allFailed');
            } else {
              currentPlayerIndex = currentPlayerIndex % players.size;
              await playTurn();
            }
          }
        }

        async function createButtonsMessage() {
          const rows = [];
          const startRow = Math.floor(currentRow / ROWS_PER_MESSAGE) * ROWS_PER_MESSAGE;
          const endRow = Math.min(startRow + ROWS_PER_MESSAGE, TOTAL_ROWS);

          for (let i = startRow; i < endRow; i++) {
            const leftButton = new ButtonBuilder()
              .setCustomId(`left`)
              .setLabel('يسار')
              .setStyle(i < currentRow ? (glassPath[i] ? ButtonStyle.Success : ButtonStyle.Danger) : ButtonStyle.Primary)
              .setDisabled(i !== currentRow);

            const rightButton = new ButtonBuilder()
              .setCustomId(`right`)
              .setLabel('يمين')
              .setStyle(i < currentRow ? (!glassPath[i] ? ButtonStyle.Success : ButtonStyle.Danger) : ButtonStyle.Primary)
              .setDisabled(i !== currentRow);

            rows.push(new ActionRowBuilder().addComponents(leftButton, rightButton));
          }

          const playerArray = Array.from(players);
          const content = `دور <@${playerArray[currentPlayerIndex]}>! اختر يسار أو يمين للخطوة ${currentRow + 1}:`;
          return message.channel.send({ content, components: rows });
        }

        async function endGame(reason, winner = null) {
          if (gameEnded) return;
          gameEnded = true;
          client.gamesStarted.set("glassBridge", false);

          if (reason === 'win') {
            const pointsEarned = 10; // You can adjust this as needed
            const newPoints = await addPlayerPoints(winner, pointsEarned);

            const pointsButton = new ButtonBuilder()
              .setCustomId('points')
              .setLabel(`النقاط : ${newPoints}`)
              .setStyle(ButtonStyle.Secondary)
              .setEmoji("💎")
              .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(pointsButton);

            await message.channel.send({
              content: `🏆 <@${winner}> فاز باللعبة وحصل على ${pointsEarned} نقاط!`,
              components: [row],
            });
          } else if (reason === 'allFailed') {
            await message.channel.send('انتهت اللعبة! جميع اللاعبين سقطوا من الجسر.');
          } else if (reason === 'timeout') {
            await message.channel.send('انتهى وقت اللعبة! لم يتمكن أي لاعب من عبور الجسر بالكامل.');
          }
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