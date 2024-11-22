const { Message,ButtonBuilder,ActionRowBuilder,ButtonStyle } = require('discord.js');
const { prefix } = require("../../utils/MessagePrefix");
const { addPlayerPoints,addTototalGames } = require("../../db/playersScore");
const { getGuildGameSettings,getGuildPrefix } = require('../../mongoose/utils/GuildManager');

const GAME_DURATION = 60000; // 1 minute in milliseconds
const MAX_NUMBER = 35; // Maximum number to guess

const allowedChannels = [
    "1292642149493510184",
    "1277694414935953564",
    "1290377082123194428"
];

function calculatePoints(triesobject,tries) {
  return triesobject[tries] || triesobject["defaultPoints"] || 1;
  
}

module.exports = {
  name: 'تخمين',
  /**
   * @param {Message} message The message object
   */
  async execute(message, client) {
    if (message.author.bot) return; // Ignore bot messages
    const prefix = await getGuildPrefix(message.guild.id);
    if (!message.content.startsWith(prefix)) return;


    const {
      startCommand,
      gameDuration:GAME_DURATION,
      channels:allowedChannels,
      isDisabled,
      pointsPerEachTry,
      guessingRange

    } = await getGuildGameSettings(message.guild.id,"guessingGame");
    const [MIN_NUMBER,MAX_NUMBER] = guessingRange.split("-").map(Number);

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    if (startCommand.includes(command) && !isDisabled) {
      if (Array.from(client?.gamesStarted.values()).some(game => game.channelId === message.channelId) || !allowedChannels.includes(message.channelId)) {
        return message.react("❌");
      }
      const alreadyCounted = new Set();
      client.gamesStarted.set("numberGuess", {
        started:true,
        channelId: message.channelId,
      });
      const targetNumber = Math.floor(Math.random() * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER;
      console.log(targetNumber);
      const players = new Map();
      let gameEnded = false;

      try {
        const initialMessage = await message.reply(`# لعبة تخمين الأرقام بدأت! خمن الرقم بين ${MIN_NUMBER} و ${MAX_NUMBER}. لديك دقيقة واحدة. `);

        const collector = message.channel.createMessageCollector({
          filter: m => !m.author.bot && /^\d+$/.test(m.content),
          time: GAME_DURATION
        });

        collector.on('collect', async (m) => {
          if (gameEnded) return;

          const guess = parseInt(m.content);
          const playerId = m.author.id;
          if(!alreadyCounted.has(playerId)){
            addTototalGames(playerId,message.guild.id);
            alreadyCounted.add(playerId);
          }
          if (!players.has(playerId)) {
            players.set(playerId, { guesses: 0 });
          }

          const playerData = players.get(playerId);
          playerData.guesses++;

          if (guess === targetNumber) {
            m.react("✅");
            endGame('win', m.author, playerData.guesses);
          } else {
            await m.react(guess > targetNumber ? '⬇️' : '⬆️');
          }
        });

        const timeoutId = setTimeout(() => {
          if (!gameEnded) {
            endGame('timeout');
          }
        }, GAME_DURATION);

        async function endGame(reason, winner = null, tries = 0) {
          if (gameEnded) return; // Prevent multiple endGame calls
          gameEnded = true;
          collector.stop();
          clearTimeout(timeoutId);
          client.gamesStarted.set("numberGuess", false);

          if (reason === 'win') {
            const pointsEarned = calculatePoints(pointsPerEachTry,tries);
            const newPoints = await addPlayerPoints(winner.id, message.guild.id,pointsEarned);

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