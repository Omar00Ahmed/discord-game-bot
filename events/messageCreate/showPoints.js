const { Message, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { prefix } = require("../../utils/MessagePrefix");
const {getPlayerPoints,resetAllPlayersPoints} = require("../../db/playersScore");
const { checkIfCanMute } = require("../../utils/WhoCanMute");
// const sayLogChannelId = "1279470539437637683";
const recieverChannel = "1292188787128008714";

/**
 * @param {Message} message The message object
 */
const execute = async (message,client) => {
    //show player points
    if (message.author.bot) return; // Ignore bot messages
    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    if (command === "نقاط") {
        const targetUser = message.mentions.users.first() || message.author;
        const playerPoints = await getPlayerPoints(targetUser.id);
        if (playerPoints === null) {
            return message.reply("لا يوجد لاعب بهذا الاسم");
        }
        const embed = new EmbedBuilder()
            .setTitle(`نقاط للاعب: ${targetUser.globalName || targetUser.displayName}`)
            .setDescription(`**النقاط : ** ${playerPoints}  💎`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setColor("#00AAFF");
        message.channel.send({ embeds: [embed] });
        // client.channels.cache.get(sayLogChannelId).send(`Player "${playerName}" has ${playerPoints} points.`);
        // client.channels.cache.get(recieverChannel).send(`
    }
    if(command === "تصفير_نقاط"){
        const member = message.member;
        
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator) || checkIfCanMute(member,"develop")) {
            const {topPlayers} =  await resetAllPlayersPoints();
            const topThreeEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('أفضل 3 لاعبين')
                .setDescription('هؤلاء هم أفضل 3 لاعبين قبل تصفير النقاط:')
                .addFields(
                    topPlayers.map((player, index) => ({
                        name: `${index+1} المركز ال`,
                        value: `<@${player.discord_id}> النقاط: ${player.points} 💎`,
                        
                    }))
                )
                .setTimestamp()
                .setFooter({ text: 'تم تصفير النقاط' });

            await message.channel.send({ embeds: [topThreeEmbed] });
            await message.reply('تم تصفير نقاط جميع اللاعبين بنجاح.');
            
        }
    }
};

module.exports = { execute };
