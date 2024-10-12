const { Message, ButtonBuilder, ActionRowBuilder, ButtonStyle, Collection } = require('discord.js');
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

  const coinButton = Math.floor(Math.random() * TOTAL_BUTTONS);
  specialButtons.add(coinButton);

  if (Math.random() < 0.02) {
    let pointButton;
    do {
      pointButton = Math.floor(Math.random() * TOTAL_BUTTONS);
    } while (specialButtons.has(pointButton));
    specialButtons.add(pointButton);
  }

  for (let i = 0; i < TOTAL_BUTTONS; i++) {
    let customId = `button_${i}`;
    if (specialButtons.has(i)) {
      customId = i === coinButton ? `coin_${i}` : `point_${i}`;
    }

    buttons.push({
      builder: new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(' ` ')
        .setStyle(ButtonStyle.Secondary),
      state: 'unopened'
    });
  }

  return { buttons, totalPrizes: specialButtons.size };
}

module.exports = {
  name: 'بحث',
  async execute(message, client) {
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command !== 'بحث') return;

    if (Array.from(client?.gamesStarted.values()).some(game => game) || !allowedChannels.includes(message.channelId)) {
      return message.react("❌");
    }

    client.gamesStarted.set("buttonGrid", true);
    const players = new Collection();
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

        await interaction.deferUpdate();

        const buttonId = interaction.customId;
        const buttonIndex = parseInt(buttonId.split('_')[1]);

        if (buttons[buttonIndex].state !== 'unopened') {
          await interaction.followUp({ content: 'هذا الصندوق تم فتحه بالفعل!', ephemeral: true });
          return;
        }

        const playerId = interaction.user.id;
        let playerData = players.get(playerId);
        if (!playerData) {
          playerData = { points: 0, coins: 0, attempts: 0 };
          players.set(playerId, playerData);
        }
        playerData.attempts++;

        let content = '';
        let pointsEarned = 0;
        if (buttonId.startsWith('coin_')) {
          pointsEarned = playerData.attempts === 1 ? 6 : 3;
          playerData.coins += pointsEarned;
          buttons[buttonIndex].state = 'coin';
          content = `🎁 <@${playerId}> حصلت على ${pointsEarned} عملات!${playerData.attempts === 1 ? ' (مضاعفة للمحاولة الأولى!)' : ''}`;
          collectedPrizes++;
        } else if (buttonId.startsWith('point_')) {
          pointsEarned = playerData.attempts === 1 ? 60 : 30;
          playerData.points += pointsEarned;
          buttons[buttonIndex].state = 'point';
          content = `🏆 <@${playerId}> حصلت على ${pointsEarned} نقطة!${playerData.attempts === 1 ? ' (مضاعفة للمحاولة الأولى!)' : ''}`;
          collectedPrizes++;
        } else {
          buttons[buttonIndex].state = 'empty';
          content = `<@${playerId}> فتح صندوق فارغ!`;
        }

        remainingButtons--;

        buttons[buttonIndex].builder.setDisabled(true)
          .setLabel(buttons[buttonIndex].state === 'coin' ? '🎁' : buttons[buttonIndex].state === 'point' ? '💎' : '❌');

        const updatedButtonRows = [];
        for (let i = 0; i < GRID_SIZE; i++) {
          updatedButtonRows.push(new ActionRowBuilder().addComponents(
            buttons.slice(i * GRID_SIZE, (i + 1) * GRID_SIZE).map(b => b.builder)
          ));
        }

        await initialMessage.edit({ components: updatedButtonRows });
        await interaction.followUp({ content, ephemeral: true });

        if (collectedPrizes === totalPrizes || remainingButtons === 0) {
          endGame(collectedPrizes === totalPrizes ? 'allPrizesCollected' : 'allButtonsClicked');
        }
      });

      const timeoutId = setTimeout(() => {
        if (!gameEnded) {
          endGame('timeout');
        }
      }, GAME_DURATION);

      async function endGame(reason) {
        if (gameEnded) return;
        gameEnded = true;
        collector.stop();
        clearTimeout(timeoutId);
        client.gamesStarted.set("buttonGrid", false);

        let winnerMessage = '';
        const pointsPromises = [];
        for (const [playerId, playerData] of players) {
          const totalPoints = playerData.points + playerData.coins;
          if (totalPoints > 0) {
            pointsPromises.push(addPlayerPoints(playerId, totalPoints));
            winnerMessage += `<@${playerId}>: ${totalPoints} نقطة (${playerData.coins} عملات)\n`;
          }
        }

        await Promise.all(pointsPromises);

        const endMessage = reason === 'allPrizesCollected' ? '🏆 انتهت اللعبة! تم جمع كل الجوائز.' :
                           reason === 'allButtonsClicked' ? '🏆 انتهت اللعبة! تم فتح جميع الصناديق.' :
                           '⏰ انتهى الوقت! لم يتم فتح جميع الصناديق.';

        await message.channel.send(`${endMessage}\n${winnerMessage}`);

        const disabledRows = buttonRows.map(row => {
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
  },
};