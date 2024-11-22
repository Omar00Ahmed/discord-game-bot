const { Message, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { prefix } = require("../../utils/MessagePrefix");
const { addPlayerPoints,addTototalGames } = require("../../db/playersScore");
const { getGuildGameSettings } = require('../../mongoose/utils/GuildManager');

const GAME_DURATION = 60000; // 1 minute in milliseconds
const GRID_SIZE = 4;
// const TOTAL_BUTTONS = GRID_SIZE * GRID_SIZE;
const greatPrizePossibility =0.02;
const startCommand = "بحث";
const pointsPerDefaultBox = 3;
const pointsPerSpecialBox = 30;
const isDisabled = false;
const allowedChannels = [
  "1292642149493510184",
  "1277694414935953564",
  "1290377082123194428"
];

function createButtonGrid(greatPrizePossibility) {
  const buttons = [];
  const specialButtons = new Set();

  // Add 3 coins to one random button
  const coinButton = Math.floor(Math.random() * TOTAL_BUTTONS);
  specialButtons.add(coinButton);

  // 2% chance to add 30 points to one random button
  let pointButton = null;
  if (Math.random() < greatPrizePossibility) {
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
    const {
      startCommand,
      gameDuration:GAME_DURATION,
      gridSize:GRID_SIZE,
      greatPrizePossibility,
      channels:allowedChannels,
      pointsPerDefaultBox:pointsPerDefaultBox,
      pointsPerSpecialBox:pointsPerSpecialBox,
      isDisabled,
      prefix

    } = await getGuildGameSettings(message.guild.id,"boxesGame");
    const TOTAL_BUTTONS = GRID_SIZE * GRID_SIZE;
    if(isDisabled)return;
    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (startCommand.includes(command)) {
      if (Array.from(client?.gamesStarted.values()).some(game => game.channelId === message.channelId) || !allowedChannels.includes(message.channelId)) {
        return message.react("❌");
      }
      const alreadyCounted = new Set();
      client.gamesStarted.set("buttonGrid", {
        started:true,
        channelId: message.channelId,
      });
      const players = new Map();
      let remainingButtons = TOTAL_BUTTONS;
      let gameEnded = false;

      try {
        const { buttons, totalPrizes } = createButtonGrid(greatPrizePossibility);
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
          
            // Check if the button has already been opened or locked
            if (buttons[buttonIndex].state !== 'unopened') {
              await interaction.reply({ content: 'عذراً، تم فتح هذا الصندوق من قبل!', ephemeral: true });
              return;
            }
          
            // Lock the button immediately to prevent other players from interacting with it
            buttons[buttonIndex].state = 'locked';
          
            // Acknowledge interaction quickly
            await interaction.deferUpdate();
          
            const playerId = interaction.user.id;
            if(!alreadyCounted.has(playerId)){
              addTototalGames(playerId,message.guild.id);
              alreadyCounted.add(playerId);
            }
            if (!players.has(playerId)) {
              players.set(playerId, { points: 0, coins: 0, attempts: 0 });
            }
          
            const playerData = players.get(playerId);
            playerData.attempts++;
          
            let content = '';
            let pointsEarned = 0;
            if (buttonId.startsWith('coin_')) {
              pointsEarned = playerData.attempts === 1 ? pointsPerDefaultBox * 2 : pointsPerDefaultBox; // Double points if first attempt
              playerData.coins += pointsEarned;
              buttons[buttonIndex].state = 'coin';
          
              // Asynchronously update player points, don't block interaction response
              addPlayerPoints(playerId, message.guild.id,pointsEarned).then(async (newPoints) => {
                const pointsButton = new ButtonBuilder()
                    .setCustomId('points')
                    .setLabel(`النقاط : ${newPoints}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("💎")
                    .setDisabled(true);
          
                const row = new ActionRowBuilder().addComponents(pointsButton);
                content = `🎁 <@${playerId}> حصلت على ${pointsEarned} عملات!`;
                if (playerData.attempts === 1) {
                  content += ' (مضاعفة للمحاولة الأولى!)';
                }
          
                // Send points update as a message
                await interaction.channel.send({ content: content, components: [row] });
              });
          
              collectedPrizes++;
            } else if (buttonId.startsWith('point_')) {
              pointsEarned = playerData.attempts === 1 ? pointsPerSpecialBox*2 : pointsPerSpecialBox; // Double points if first attempt
              playerData.points += pointsEarned;
              buttons[buttonIndex].state = 'point';
          
              // Asynchronously update player points
              addPlayerPoints(playerId,message.guild.id ,pointsEarned).then(async (newPoints) => {
                const pointsButton = new ButtonBuilder()
                    .setCustomId('points')
                    .setLabel(`النقـاط : ${newPoints}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("💎")
                    .setDisabled(true);
                const row = new ActionRowBuilder().addComponents(pointsButton);
                content = `🏆 <@${playerId}> حصلت على ${pointsEarned} نقطة!`;
                if (playerData.attempts === 1) {
                  content += ' (مضاعفة للمحاولة الأولى!)';
                }
          
                // Send points update as a message
                await interaction.channel.send({ content: content, components: [row] });
              });
          
              collectedPrizes++;
            }
          
            remainingButtons--;
          
            // Update the button's appearance to disabled
            buttons[buttonIndex].builder.setDisabled(true)
              .setLabel(buttons[buttonIndex].state === 'coin' ? '🎁' : buttons[buttonIndex].state === 'point' ? '💎' : '❌');
          
            // Reconstruct the button rows with the updated button
            const updatedButtonRows = [];
            for (let i = 0; i < GRID_SIZE; i++) {
              updatedButtonRows.push(new ActionRowBuilder().addComponents(
                buttons.slice(i * GRID_SIZE, (i + 1) * GRID_SIZE).map(b => b.builder)
              ));
            }
          
            // Edit the message with the updated buttons
            await initialMessage.edit({ components: updatedButtonRows });
          
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
    }
  },
};
;