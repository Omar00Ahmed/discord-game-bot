const { Message, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { prefix } = require("../../utils/MessagePrefix");
const { addPlayerPoints } = require("../../db/playersScore");

const GAME_DURATION = 300000; // 5 minutes in milliseconds
const ROWS_PER_MESSAGE = 5; // Number of rows per message, can be changed as needed
const TOTAL_ROWS = 10; // Total number of rows in the game, can be changed as needed

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
      const players = [];
      let currentPlayerIndex = 0;
      let currentRow = 0;
      let gameEnded = false;

      try {
        const initialMessage = await message.reply('# لعبة جسر الزجاج بدأت! سجل للانضمام خلال 30 ثانية.');
        await initialMessage.react('🎮');

        const collector = initialMessage.createReactionCollector({ time: 30000 });

        collector.on('collect', (reaction, user) => {
          if (user.bot) return;
          if (!players.includes(user.id)) {
            players.push(user.id);
          }
        });

        collector.on('end', async () => {
          if (players.length === 0) {
            await message.channel.send('لم ينضم أي لاعب. تم إلغاء اللعبة.');
            client.gamesStarted.set("glassBridge", false);
            return;
          }

          await message.channel.send(`بدأت اللعبة مع ${players.length} لاعبين! استعدوا لدوركم!`);
          await playTurn();
        });

        async function playTurn() {
          if (gameEnded) return;

          const currentPlayer = players[currentPlayerIndex];
          const buttonsMessage = await createButtonsMessage();
          
          const filter = i => i.user.id === currentPlayer && ['left', 'right'].includes(i.customId);
          try {
            const response = await buttonsMessage.awaitMessageComponent({ filter, time: 30000 });
            const choice = response.customId === 'left' ? 0 : 1;

            if (glassPath[currentRow] === (choice === 0)) {
              currentRow++;
              await message.channel.send(`✅ <@${currentPlayer}> اجتاز بنجاح!`);

              if (currentRow === TOTAL_ROWS) {
                await endGame('win', currentPlayer);
              } else {
                currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
                await playTurn();
              }
            } else {
              await message.channel.send(`💥 أوه لا! <@${currentPlayer}> سقط من الجسر!`);
              players.splice(currentPlayerIndex, 1);
              if (players.length === 0) {
                await endGame('allFailed');
              } else {
                currentPlayerIndex = currentPlayerIndex % players.length;
                await playTurn();
              }
            }
          } catch (error) {
            await message.channel.send(`<@${currentPlayer}> لم يستجب في الوقت المحدد وسقط من الجسر!`);
            players.splice(currentPlayerIndex, 1);
            if (players.length === 0) {
              await endGame('allFailed');
            } else {
              currentPlayerIndex = currentPlayerIndex % players.length;
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

          const content = `دور <@${players[currentPlayerIndex]}>! اختر يسار أو يمين للخطوة ${currentRow + 1}:`;
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