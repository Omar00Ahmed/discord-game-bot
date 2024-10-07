const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,Message } = require('discord.js');
const { prefix } = require("../../utils/MessagePrefix");

const {upsertPlayerPoints,getPlayerPoints,deletePlayerPoints,addPlayerPoints} = require("../../db/playersScore")
const GAME_DURATION = 20000; // 1 minute in milliseconds
const WIRE_COLORS = ['🔴', '🟢', '🔵', '🟡']; // Emoji representations of colors

const allowedChnanels = [
  "1277694414935953564",
  "1290377082123194428"
]

// Shuffle array helper function
function shuffleArray(array) {
  const shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
}

module.exports = {
  name: 'توصيل',
  /**
 * @param {Message} message The message object
 */
  async execute(message,client) {
    if (message.author.bot) return; // Ignore bot messages

    if (!message.content.startsWith(prefix)) return;

    

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'توصيل') {
      const players = {}; // Player-specific sessions
      if(client?.gamesStarted.get("wires") || !allowedChnanels.includes(message.channelId) )return message.react("❌");
      console.log("ha");
      client.gamesStarted.set("wires",true);
      const createPlayerSession = () => {
        return {
          selectedWire: null,
          selectedSide: null,
          connectedPairs: 0,
          usedWires: { left: new Set(), right: new Set() }
        };
      };

      const gameEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('لعبة توصيل الأسلاك')
        .setDescription('قم بتوصيل الأسلاك المتطابقة اللون من كلا الجانبين!\nأول لاعب يقوم بتوصيل جميع الأسلاك الأربعة يفوز!\nلديك دقيقة واحدة لإكمال المهمة.')
        .addFields(
          { name: 'الوقت المتبقي', value: '60 ثانية', inline: true },
          { name: 'السلك المختار', value: 'لا يوجد', inline: true },
          { name: 'تقدم اللاعبين', value: 'لم ينضم أي لاعب بعد', inline: false }
        );

      // Generate two independent shuffles for left and right sides
      const leftWires = shuffleArray(WIRE_COLORS);
      const rightWires = shuffleArray(WIRE_COLORS);

      const generateButtons = () => {
        const rows = [];
        for (let i = 0; i < 4; i++) {
          const leftButton = new ButtonBuilder()
            .setCustomId(`left_${i}`)
            .setLabel(leftWires[i])
            .setStyle(ButtonStyle.Secondary);

          const rightButton = new ButtonBuilder()
            .setCustomId(`right_${i}`)
            .setLabel(rightWires[i])
            .setStyle(ButtonStyle.Secondary);

          const middleButtons = Array(2).fill().map((_, j) =>
            new ButtonBuilder()
              .setCustomId(`middle_${i}_${j}`)
              .setLabel(' ` ')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          );

          const row = new ActionRowBuilder().addComponents(leftButton, ...middleButtons, rightButton);
          rows.push(row);
        }
        return rows;
      };

      const updatePlayersProgress = () => {
        const playerProgress = Object.keys(players)
          .map(playerId => {
            const player = players[playerId];
            const playerName = message.client.users.cache.get(playerId).username;
            return `${playerName}: ${player.connectedPairs}/4`;
          })
          .join('\n');

        gameEmbed.data.fields[2].value = playerProgress || 'لم ينضم أي لاعب بعد';
      };

      try {
        const initialMessage = await message.channel.send({
          embeds: [gameEmbed],
          components: generateButtons(),
          fetchReply: true
        });

        const collector = initialMessage.createMessageComponentCollector({ time: GAME_DURATION });

        let timeLeft = GAME_DURATION / 1000;
        const timer = setInterval(() => {
          timeLeft--;
          gameEmbed.data.fields[0].value = `${timeLeft} ثانية`;
          initialMessage.edit({ embeds: [gameEmbed] }).catch(console.error);

          if (timeLeft <= 0) {
            clearInterval(timer);
            collector.stop('timeout');
          }
        }, 1000);

        collector.on('collect', async i => {
          if (!players[i.user.id]) {
            players[i.user.id] = createPlayerSession();
          }

          const playerState = players[i.user.id];

          try {
            const [side, index] = i.customId.split('_');
            const wireIndex = parseInt(index);
            const wireColor = side === 'left' ? leftWires[wireIndex] : rightWires[wireIndex];

            if (playerState.selectedWire === null) {
              // First wire selection
              playerState.selectedWire = wireIndex;
              playerState.selectedSide = side;
              gameEmbed.data.fields[1].value = `${wireColor} على جانب ${side === 'left' ? 'الأيسر' : 'الأيمن'} تم اختياره بواسطة ${i.user.username}`;
              await i.update({ embeds: [gameEmbed], components: generateButtons() });
              return;
            }

            // Handle the second selection (must be on the opposite side)
            if (playerState.selectedSide !== side) {
              const selectedColor = playerState.selectedSide === 'left' ? leftWires[playerState.selectedWire] : rightWires[playerState.selectedWire];

              if (playerState.usedWires[side].has(wireIndex)) {
                await i.reply({ content: 'لقد استخدمت هذا السلك بالفعل. اختر سلكًا آخر.', ephemeral: true });
                return;
              }

              if (selectedColor === wireColor) {
                // Correct connection
                playerState.connectedPairs++;
                playerState.usedWires[playerState.selectedSide].add(playerState.selectedWire);
                playerState.usedWires[side].add(wireIndex);

                gameEmbed.data.fields[1].value = `${i.user.username} قام بتوصيل أسلاك ${wireColor} بشكل صحيح!`;

                if (playerState.connectedPairs === 4) {
                  gameEmbed.setDescription(`${i.user.username} يفوز! لقد قام بتوصيل جميع الأسلاك الأربعة أولاً!`);
                  // const newPoints = await addPlayerPoints(i.user.id,1);
                  
                  // const pointsButton = new ButtonBuilder()
                  //   .setCustomId('points')
                  //   .setLabel(`النقاط : ${newPoints}`)
                  //   .setStyle(ButtonStyle.Secondary)
                  //   .setEmoji("💎")
                  //   .setDisabled(true);

                  // const row = new ActionRowBuilder()
                  //   .addComponents(pointsButton);
                  
                  // await initialMessage.channel.send({content:`<@${i.user.id}> قد ربح الجولة` , components: [row] });
                                    
                  
                  // initialMessage.channel.send({
                  //   content:`<@${i.user.id}> won the game`
                  // })
                  collector.stop('win');
                }
              } else {
                gameEmbed.data.fields[1].value = `${i.user.username} قام بتوصيل خاطئ للأسلاك!`;
              }

              playerState.selectedWire = null;
              playerState.selectedSide = null;

              updatePlayersProgress();
            } else {
              await i.deferUpdate();
              return;
            }

            await i.update({ embeds: [gameEmbed], components: generateButtons() });
          } catch (error) {
            console.error('Error handling button interaction:', error);
            await i.reply({ content: 'حدث خطأ أثناء معالجة حركتك. حاول مرة أخرى.', ephemeral: true }).catch(console.error);
          }
        });

        collector.on('end', async (collected, reason) => {
          clearInterval(timer);
          client.gamesStarted.set("wires", false);
        
          if (reason === 'win') {
            // Assuming the winner is the user who made the correct move last
            const winner = collected.last().user;
        
            // Award the winner points
            const newPoints = await addPlayerPoints(winner.id, 1);
        
            // Create a points button to display the winner's new points
            const pointsButton = new ButtonBuilder()
              .setCustomId('points')
              .setLabel(`النقاط : ${newPoints}`)
              .setStyle(ButtonStyle.Secondary)
              .setEmoji("💎")
              .setDisabled(true);
        
            const row = new ActionRowBuilder().addComponents(pointsButton);
        
            // Announce the winner in the channel
            await initialMessage.channel.send({
              content: `<@${winner.id}> قد ربح الجولة`,
              components: [row],
            });
          } else if (reason === 'timeout') {
            gameEmbed.setDescription('انتهى الوقت! انتهت اللعبة بدون فائز.');
          }
        
          gameEmbed.data.fields[0].value = '0 ثانية';
          gameEmbed.data.fields[1].value = 'اللعبة انتهت';
        
          await initialMessage.edit({ embeds: [gameEmbed], components: [] }).catch(console.error);
        });
      } catch (error) {
        console.error('Error starting the wire game:', error);
        await message.reply('حدث خطأ أثناء بدء اللعبة. حاول مرة أخرى لاحقًا.').catch(console.error);
        client.gamesStarted.set("wires",false)
      }
    }
  },
};
