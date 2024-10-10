const { Message,ButtonBuilder,ActionRowBuilder,ButtonStyle } = require('discord.js');
const { prefix } = require("../../utils/MessagePrefix");
const { addPlayerPoints } = require("../../db/playersScore");

const GAME_DURATION = 60000; // 1 minute in milliseconds
const MAX_NUMBER = 40; // Maximum number to guess

const allowedChannels = [
  "1277694414935953564",
  "1290377082123194428"
];

function calculatePoints(tries) {
  if (tries === 1) return 5;
  if (tries === 2) return 4;
  if (tries === 3) return 3;
  if (tries <= 5) return 2;
  return 1;
}

module.exports = {
  name: 'تخمين',
  /**
   * @param {Message} message The message object
   */
  async execute(message, client) {
    if (message.author.bot) return; // Ignore bot messages
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'تخمين') {
      if (Array.from(client?.gamesStarted.values()).some(game => game) || !allowedChannels.includes(message.channelId)) {
        return message.react("❌");
      }

      client.gamesStarted.set("numberGuess", true);
      const targetNumber = Math.floor(Math.random() * MAX_NUMBER) + 1;
      const players = new Map();
      console.log(targetNumber);
      try {
        const initialMessage = await message.channel.send(`لعبة تخمين الأرقام بدأت! خمن الرقم بين 1 و ${MAX_NUMBER}. لديك دقيقة واحدة.`);

        const collector = message.channel.createMessageCollector({
          filter: m => !m.author.bot && /^\d+$/.test(m.content),
          time: GAME_DURATION
        });

        collector.on('collect', async (m) => {
          const guess = parseInt(m.content);
          const playerId = m.author.id;

          if (!players.has(playerId)) {
            players.set(playerId, { guesses: 0 });
          }

          const playerData = players.get(playerId);
          playerData.guesses++;

          if (guess === targetNumber) {
            await m.react("✅");
            endGame('win', m.author, playerData.guesses);
          } else {
            await m.react(guess > targetNumber ? '⬇️' : '⬆️');
          }
        });

        setTimeout(() => {
          if (client.gamesStarted.get("numberGuess")) {
            endGame('timeout');
          }
        }, GAME_DURATION);

        async function endGame(reason, winner = null, tries = 0) {
          collector.stop();
          client.gamesStarted.set("numberGuess", false);

          if (reason === 'win') {
            const pointsEarned = calculatePoints(tries);
            const newPoints = await addPlayerPoints(winner.id, pointsEarned);

            const pointsButton = new ButtonBuilder()
                .setCustomId('points')
                .setLabel(`النقاط : ${newPoints}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("💎")
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(pointsButton);
            console.log("won")
            await message.channel.send({
                content: `🏆 <@${winner.id}> فاز بالجولة وحصل على ${pointsEarned} نقاط! (إجمالي المحاولات: ${tries})`,
                components: [row],
            });
          } else if (reason === 'timeout') {
            await message.channel.send(`انتهى الوقت! الرقم الصحيح كان ${targetNumber}.`);
          }
        }

      } catch (error) {
        console.error('Error in the number guessing game:', error);
        await message.reply('حدث خطأ أثناء اللعبة. حاول مرة أخرى لاحقًا.').catch(console.error);
        client.gamesStarted.set("numberGuess", false);
      }
    }
  },
};