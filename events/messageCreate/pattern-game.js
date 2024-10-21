const { Message, AttachmentBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { prefix } = require("../../utils/MessagePrefix");
const { addPlayerPoints } = require("../../db/playersScore");
const { createCanvas } = require("canvas");

const GAME_DURATION = 60000; // 60 seconds in milliseconds
const PATTERN_LENGTH = 6;

const allowedChannels = [
  "1292642149493510184",
  "1277694414935953564",
  "1290377082123194428"
];

function getRandomPattern() {
  const availableNumbers = {
    1: [4, 5, 2],
    2: [1, 3, 4, 5, 6],
    3: [2, 5, 6],
    4: [1, 2, 5, 7, 8],
    5: [1, 2, 3, 4, 6, 7, 8, 9],
    6: [2, 3, 5, 8, 9],
    7: [4, 5, 8],
    8: [4, 5, 6, 7, 9],
    9: [5, 6, 8]
  };
  
  const pattern = [];
  while (pattern.length < PATTERN_LENGTH) {
    const lastNumber = pattern[pattern.length - 1];
    const availableJumps = lastNumber ? availableNumbers[lastNumber].filter(num => !pattern.includes(num)) : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    if (availableJumps.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableJumps.length);
      pattern.push(availableJumps[randomIndex]);
    } else if (pattern.length > 0) {
      pattern.pop(); // Backtrack
    }
  }
  return pattern;
}

function createPatternImage(pattern) {
  const canvas = createCanvas(300, 300);
  const ctx = canvas.getContext("2d");

  // Set background
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, 300, 300);

  // Draw grid
  ctx.strokeStyle = "#007bff";
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(i * 100, 0);
    ctx.lineTo(i * 100, 300);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * 100);
    ctx.lineTo(300, i * 100);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Add rounded corners to grid cells with gaps
  ctx.strokeStyle = "#007bff";
  ctx.lineWidth = 3;
  const radius = 20;
  const gap = 10;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const x = i * 100;
      const y = j * 100;
      ctx.beginPath();
      // Top-left corner
      ctx.moveTo(x + gap, y + radius);
      ctx.arcTo(x + gap, y + gap, x + radius, y + gap, radius);
      // Top-right corner
      ctx.moveTo(x + 100 - radius, y + gap);
      ctx.arcTo(x + 100 - gap, y + gap, x + 100 - gap, y + radius, radius);
      // Bottom-right corner
      ctx.moveTo(x + 100 - gap, y + 100 - radius);
      ctx.arcTo(x + 100 - gap, y + 100 - gap, x + 100 - radius, y + 100 - gap, radius);
      // Bottom-left corner
      ctx.moveTo(x + radius, y + 100 - gap);
      ctx.arcTo(x + gap, y + 100 - gap, x + gap, y + 100 - radius, radius);
      ctx.stroke();
    }
  }

  // Draw pattern
  ctx.strokeStyle = "#007bff";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < pattern.length; i++) {
    const x = ((pattern[i] - 1) % 3) * 100 + 50;
    const y = Math.floor((pattern[i] - 1) / 3) * 100 + 50;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Draw dots
  ctx.fillStyle = "#007bff";
  for (let i = 0; i < pattern.length; i++) {
    if(i === 0) {
        ctx.fillStyle = "#ff7b00";
    }else{
        ctx.fillStyle = "#007bff";
    }
    const x = ((pattern[i] - 1) % 3) * 100 + 50;
    const y = Math.floor((pattern[i] - 1) / 3) * 100 + 50;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toBuffer();
}

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

      client.gamesStarted.set("patternGame", true);
      const players = new Map();
      let gameEnded = false;

      try {
        const pattern = getRandomPattern();
        const patternImage = createPatternImage(pattern);
        const attachment = new AttachmentBuilder(patternImage, { name: 'pattern.png' });

        const initialMessage = await message.reply({
          content: '# لعبة النمط بدأت! انتبه للنمط وكرره بسرعة!',
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

          const gameMessage = await message.channel.send({
            content: 'الآن قم بتكرار النمط الذي رأيته! اضغط على الأزرار بالترتيب الصحيح.',
            components: rows
          });

          const collector = gameMessage.createMessageComponentCollector({
            filter: i => !i.user.bot,
            time: GAME_DURATION
          });

          collector.on('collect', async (interaction) => {
            if (gameEnded) return;

            const playerId = interaction.user.id;
            if (!players.has(playerId)) {
              players.set(playerId, { pattern: [] });
            }

            const playerData = players.get(playerId);
            const buttonNumber = parseInt(interaction.customId.split('_')[1]);

            if (buttonNumber !== pattern[playerData.pattern.length]) {
              // Wrong move
              playerData.pattern = [];
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

            let endMessage = '';
            if (reason === 'winner') {
              endMessage = `🏆 انتهت اللعبة! الفائز هو <@${winnerId}>`;
              await addPlayerPoints(winnerId, 10);
            } else if (reason === 'timeout') {
              endMessage = '⏰ انتهى الوقت! لم يتمكن أحد من إكمال النمط.';
            }

            const correctPatternImage = createPatternImage(pattern);
            const correctAttachment = new AttachmentBuilder(correctPatternImage, { name: 'correct_pattern.png' });

            await message.channel.send({
              content: `${endMessage}\nالنمط الصحيح كان:`,
              files: [correctAttachment]
            });

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