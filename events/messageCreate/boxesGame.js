const { Message, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { prefix } = require("../../utils/MessagePrefix");
const { addPlayerPoints } = require("../../db/playersScore");

const GAME_DURATION = 60000; // 1 minute in milliseconds
const GRID_SIZE = 4;
const TOTAL_BUTTONS = GRID_SIZE * GRID_SIZE;

const allowedChannels = [
  "1292642149493510184",
  "1277694414935953564",
  "1290377082123194428"
];

function createButtonGrid() {
  const buttons = [];
  const specialButtons = new Set();

  // Add 3 coins to one random button
  const coinButton = Math.floor(Math.random() * TOTAL_BUTTONS);
  specialButtons.add(coinButton);

  // 2% chance to add 30 points to one random button
  let pointButton = null;
  if (Math.random() < 0.04) {
    do {
      pointButton = Math.floor(Math.random() * TOTAL_BUTTONS);
    } while (specialButtons.has(pointButton));
    specialButtons.add(pointButton);
  }

  for (let i = 0; i < TOTAL_BUTTONS; i++) {
    let label = ' ` ';
    let style = ButtonStyle.Secondary;
    let customId = `button_${i}`;

    if (specialButtons.has(i)) {
      if (i === coinButton) {
        customId = `coin_${i}`;
      } else if (i === pointButton) {
        customId = `point_${i}`;
      }
    }

    buttons.push(
      new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(style)
    );
  }

  const rows = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i * GRID_SIZE, (i + 1) * GRID_SIZE)));
  }

  return { rows, totalPrizes: specialButtons.size };
}

module.exports = {
  name: 'صناديق',
  /**
   * @param {Message} message The message object
   */
  async execute(message, client) {
    if (message.author.bot) return; // Ignore bot messages
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'صناديق') {
      if (Array.from(client?.gamesStarted.values()).some(game => game) || !allowedChannels.includes(message.channelId)) {
        return message.react("❌");
      }

      client.gamesStarted.set("buttonGrid", true);
      const players = new Map();
      let remainingButtons = TOTAL_BUTTONS;
      let gameEnded = false;

      try {
        const { rows: buttonRows, totalPrizes } = createButtonGrid();
        let collectedPrizes = 0;

        const initialMessage = await message.reply({
          content: '# لعبة الصناديق بدأت! اضغط على جميع الصناديق قبل انتهاء الوقت!',
          components: buttonRows
        });

        const collector = initialMessage.createMessageComponentCollector({
          filter: i => !i.user.bot,
          time: GAME_DURATION
        });

        collector.on('collect', async (interaction) => {
          if (gameEnded) return;

          const playerId = interaction.user.id;
          if (!players.has(playerId)) {
            players.set(playerId, { points: 0, coins: 0 });
          }

          const playerData = players.get(playerId);
          const buttonId = interaction.customId;

          let content = '';
          if (buttonId.startsWith('coin_')) {
            playerData.coins += 3;
            content = `🪙 <@${playerId}> حصلت على 3 عملات!`;
            collectedPrizes++;
          } else if (buttonId.startsWith('point_')) {
            playerData.points += 30;
            content = `💎 <@${playerId}> حصلت على 30 نقطة!`;
            collectedPrizes++;
          } else {
            content = `<@${playerId}> فتح صندوق فارغ!`;
          }

          remainingButtons--;
          const buttonIndex = parseInt(buttonId.split('_')[1]);
          const rowIndex = Math.floor(buttonIndex / GRID_SIZE);
          const columnIndex = buttonIndex % GRID_SIZE;

          interaction.message.components[rowIndex].components[columnIndex] = ButtonBuilder.from(
            interaction.message.components[rowIndex].components[columnIndex]
          ).setDisabled(true).setLabel(buttonId.startsWith('coin_') ? '🎁' : buttonId.startsWith('point_') ? '💎' : '❌');

          await interaction.update({ components: interaction.message.components });
        //   await interaction.followUp({ content, ephemeral: true });

          if (collectedPrizes === totalPrizes) {
            endGame('allPrizesCollected');
          } else if (remainingButtons === 0) {
            endGame('allButtonsClicked');
          }
        });

        const timeoutId = setTimeout(() => {
          if (!gameEnded) {
            endGame('timeout');
          }
        }, GAME_DURATION);

        async function endGame(reason) {
          if (gameEnded) return; // Prevent multiple endGame calls
          gameEnded = true;
          collector.stop();
          clearTimeout(timeoutId);
          client.gamesStarted.set("buttonGrid", false);

          let winnerMessage = '';
          for (const [playerId, playerData] of players) {
            const totalPoints = playerData.points + playerData.coins;
            if (totalPoints > 0) {
              const newPoints = await addPlayerPoints(playerId, totalPoints);
              winnerMessage += `<@${playerId}>: ${totalPoints} نقطة (${playerData.coins} عملات)\n`;
            }
          }

          let endMessage = '';
          if (reason === 'allPrizesCollected') {
            endMessage = '🏆 انتهت اللعبة! تم جمع كل الجوائز.';
          } else if (reason === 'allButtonsClicked') {
            endMessage = '🏆 انتهت اللعبة! تم فتح جميع الصناديق.';
          } else if (reason === 'timeout') {
            endMessage = '⏰ انتهى الوقت! لم يتم فتح جميع الصناديق.';
          }

          await message.channel.send(`${endMessage}\n${winnerMessage}`);

          // Disable all remaining buttons
          const disabledRows = initialMessage.components.map(row => {
            const newRow = new ActionRowBuilder();
            row.components.forEach(button => {
              newRow.addComponents(ButtonBuilder.from(button).setDisabled(true));
            });
            return newRow;
          });

          await initialMessage.edit({ components: disabledRows });
        }

      } catch (error) {
        console.error('Error in the button grid game:', error);
        await message.reply('حدث خطأ أثناء اللعبة. حاول مرة أخرى لاحقًا.').catch(console.error);
        client.gamesStarted.set("buttonGrid", false);
      }
    }
  },
};