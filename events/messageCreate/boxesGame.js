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
  if (Math.random() < 0.02) {
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

    buttons.push({
      builder: new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(style),
      state: 'unopened'
    });
  }

  return { buttons, totalPrizes: specialButtons.size };
}

module.exports = {
  name: 'بحث',
  /**
   * @param {Message} message The message object
   */
  async execute(message, client) {
    if (message.author.bot) return; // Ignore bot messages
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'بحث') {
      if (Array.from(client?.gamesStarted.values()).some(game => game) || !allowedChannels.includes(message.channelId)) {
        return message.react("❌");
      }

      client.gamesStarted.set("buttonGrid", true);
      const players = new Map();
      let remainingButtons = TOTAL_BUTTONS;
      let gameEnded = false;

      try {
        const { buttons, totalPrizes } = createButtonGrid();
        let collectedPrizes = 0;

        const buttonRows = [];
        for (let i = 0; i < GRID_SIZE; i++) {
          buttonRows.push(new ActionRowBuilder().addComponents(
            buttons.slice(i * GRID_SIZE, (i + 1) * GRID_SIZE).map(b => b.builder)
          ));
        }

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

          const buttonId = interaction.customId;
          const buttonIndex = parseInt(buttonId.split('_')[1]);

          // Check if the button has already been opened
          if (buttons[buttonIndex].state !== 'unopened') {
            await interaction.reply({ content: 'هذا الصندوق تم فتحه بالفعل!', ephemeral: true });
            return;
          }

          const playerId = interaction.user.id;
          if (!players.has(playerId)) {
            players.set(playerId, { points: 0, coins: 0 });
          }

          const playerData = players.get(playerId);

          let content = '';
          if (buttonId.startsWith('coin_')) {
            playerData.coins += 3;
            buttons[buttonIndex].state = 'coin';
            const newPoints = await addPlayerPoints(playerId, 3);
            const pointsButton = new ButtonBuilder()
                .setCustomId('points')
                .setLabel(`النقاط : ${newPoints}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("💎")
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(pointsButton);
            await interaction.channel.send({content:`🎁 <@${playerId}> حصلت على 3 عملات!`, components: [row] });
            collectedPrizes++;
          } else if (buttonId.startsWith('point_')) {
            playerData.points += 30;
            buttons[buttonIndex].state = 'point';
            const newPoints = await addPlayerPoints(playerId, 30);
            const pointsButton = new ButtonBuilder()
                .setCustomId('points')
                .setLabel(`النقـاط : ${newPoints}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("💎")
                .setDisabled(true);
            const row = new ActionRowBuilder().addComponents(pointsButton);
            await interaction.channel.send({content:`🏆 <@${playerId}> حصلت على 30 نقطة!`, components: [row] });
            collectedPrizes++;
          } else {
            buttons[buttonIndex].state = 'empty';
          }

          remainingButtons--;

          // Update the button's appearance
          buttons[buttonIndex].builder.setDisabled(true)
            .setLabel(buttons[buttonIndex].state === 'coin' ? '🎁' : buttons[buttonIndex].state === 'point' ? '💎' : '❌');

          // Reconstruct the button rows with the updated button
          const updatedButtonRows = [];
          for (let i = 0; i < GRID_SIZE; i++) {
            updatedButtonRows.push(new ActionRowBuilder().addComponents(
              buttons.slice(i * GRID_SIZE, (i + 1) * GRID_SIZE).map(b => b.builder)
            ));
          }

          await initialMessage.edit({ components: updatedButtonRows });
          await interaction.deferUpdate();

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
          const disabledRows = updatedButtonRows.map(row => {
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