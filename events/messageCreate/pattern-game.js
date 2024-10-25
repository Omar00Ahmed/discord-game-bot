const { Message, AttachmentBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { prefix } = require("../../utils/MessagePrefix");
const { addPlayerPoints, getPlayerPoints } = require("../../db/playersScore");
const { createCanvas } = require("canvas");
const {createPatternImage,getRandomPattern} = require("../../utils/patternGameHelpers")
const GAME_DURATION = 20000; // 20 seconds in milliseconds
const MIN_DIFFICULTY = 4;
const MAX_DIFFICULTY = 7;
const DEFAULT_DIFFICULTY = 5;

const allowedChannels = [
  "1292642149493510184",
  "1277694414935953564",
  "1290377082123194428",
  "1294731828950732924"
];



module.exports = {
  name: 'نمط',
  /**
   * @param {Message} message The message object
   */
  async execute(message, client) {
    if (message.author.bot) return; // Ignore bot messages
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'نمط') {
      if (Array.from(client?.gamesStarted.values()).some(game => game) || !allowedChannels.includes(message.channelId)) {
        return message.react("❌");
      }

      let difficulty = DEFAULT_DIFFICULTY;
      if (args.length > 0) {
        const requestedDifficulty = parseInt(args[0]);
        if (requestedDifficulty >= MIN_DIFFICULTY && requestedDifficulty <= MAX_DIFFICULTY) {
          difficulty = requestedDifficulty;
        }
      }

      client.gamesStarted.set("patternGame", true);
      const players = new Map();
      let gameEnded = false;

      try {
        const pattern = getRandomPattern(difficulty);
        const patternImage = createPatternImage(pattern);
        const attachment = new AttachmentBuilder(patternImage, { name: 'pattern.png' });

        const initialMessage = await message.reply({
          content: `# لعبة النمط بدأت! انتبه للنمط وكرره بسرعة!\nالصعوبة: ${difficulty}`,
          files: [attachment]
        });

        // Wait for 5 seconds before deleting the pattern image and starting the game
        setTimeout(async () => {
          await initialMessage.delete().catch(console.error);
          
          const buttons = [];
          for (let i = 1; i <= 9; i++) {
            buttons.push(
              new ButtonBuilder()
                .setCustomId(`button_${i}`)
                .setLabel(`${i}`)
                .setStyle(ButtonStyle.Secondary)
            );
          }

          const rows = [
            new ActionRowBuilder().addComponents(buttons.slice(0, 3)),
            new ActionRowBuilder().addComponents(buttons.slice(3, 6)),
            new ActionRowBuilder().addComponents(buttons.slice(6, 9))
          ];

          let remainingTime = GAME_DURATION / 1000;
          const gameMessage = await message.channel.send({
            content: `الآن قم بتكرار النمط الذي رأيته! اضغط على الأزرار بالترتيب الصحيح.\nالوقت المتبقي: ${remainingTime} ثانية`,
            components: rows
          });

          const timer = setInterval(() => {
            remainingTime--;
            if (remainingTime > 0 && !gameEnded) {
              gameMessage.edit({
                content: `الآن قم بتكرار النمط الذي رأيته! اضغط على الأزرار بالترتيب الصحيح.\nالوقت المتبقي: ${remainingTime} ثانية`,
                components: rows
              });
            } else {
              clearInterval(timer);
            }
          }, 1000);

          const collector = gameMessage.createMessageComponentCollector({
            filter: i => !i.user.bot,
            time: GAME_DURATION
          });

          collector.on('collect', async (interaction) => {
            if (gameEnded) return;

            const playerId = interaction.user.id;
            if (!players.has(playerId)) {
              players.set(playerId, { pattern: [], attempts: 0 });
            }

            const playerData = players.get(playerId);
            const buttonNumber = parseInt(interaction.customId.split('_')[1]);

            if (buttonNumber !== pattern[playerData.pattern.length]) {
              // Wrong move
              playerData.pattern = [];
              playerData.attempts++;
              await interaction.reply({ content: 'خطأ! ابدأ من جديد.', ephemeral: true });
            } else {
              // Correct move
              playerData.pattern.push(buttonNumber);
              await interaction.deferUpdate();

              if (playerData.pattern.length === pattern.length) {
                // Player completed the pattern
                endGame('winner', playerId);
              }
            }


          });

          const timeoutId = setTimeout(() => {
            if (!gameEnded) {
              endGame('timeout');
            }
          }, GAME_DURATION);

          async function endGame(reason, winnerId = null) {
            if (gameEnded) return;
            gameEnded = true;
            collector.stop();
            clearTimeout(timeoutId);
            client.gamesStarted.set("patternGame", false);

            const correctPatternImage = createPatternImage(pattern);
            const correctAttachment = new AttachmentBuilder(correctPatternImage, { name: 'correct_pattern.png' });
            await message.channel.send({
                content: `النمط الصحيح كان:`,
                files: [correctAttachment]
            });
            if (reason === 'winner') {
              const pointsEarned = Math.floor((difficulty / 2) + 1);
              const newPoints = await addPlayerPoints(winnerId, pointsEarned);
              const pointsButton = new ButtonBuilder()
                .setCustomId('points')
                .setLabel(`النقاط : ${newPoints} (+ ${pointsEarned})`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("💎")
                .setDisabled(true);
                const row = new ActionRowBuilder().addComponents(pointsButton);
                await message.channel.send({
                    content: `🏆 <@${winnerId}> فاز بالجولة`,
                    components: [row],
                });
            } else if (reason === 'timeout') {
                const endMessage = `انتهى الوقت ولم يحل احد اللغز`;
                await message.channel.send(endMessage);
                
            }


            // Disable all buttons
            rows.forEach(row => row.components.forEach(button => button.setDisabled(true)));
            await gameMessage.edit({ components: rows });
          }
        }, 5000);

      } catch (error) {
        console.error('Error in the pattern game:', error);
        await message.reply('حدث خطأ أثناء اللعبة. حاول مرة أخرى لاحقًا.').catch(console.error);
        client.gamesStarted.set("patternGame", false);
      }
    }
  },
};