const { Message, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { prefix } = require("../../utils/MessagePrefix");
const {getKillAndTasksAnalytics} = require("../../db/playersScore")

/**
 * @param {Message} message The message object
 */
const execute = async (message, client) => {
    if (!message.content.toLowerCase().startsWith(prefix + "احصائيات")) return;
    
        try {
            const analytics = await getKillAndTasksAnalytics(message.guild.id);
            
            if (!analytics) {
                return message.reply("No analytics data available for this server.");
            }
    
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('احصائيات فوضى')
                .setDescription('افضل معدل قتل ومعدل مهام')
                .addFields(
                    {
                        name: '🔪 اعلى معدل قتل',
                        value: analytics.topKills.map((player, index) => 
                            `${index + 1}. <@${player.discordId}> - ${player.points} قتل 🎯`
                        ).join('\n') || 'لا يوجد',
                        inline: true
                    },
                    {
                        name: '📋 اعلى معدل مهام',
                        value: analytics.topTasks.map((player, index) => 
                            `${index + 1}. <@${player.discordId}> - ${player.points} مهمة ✅`
                        ).join('\n') || 'لا يوجد',
                        inline: true
                    }                )
                .setTimestamp();
    
            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('خطأ اثناء محاولة العثور على الاحصائيات:', error);
            await message.reply('حدث خطأ اثناء محاولة العثور على الاحصائيات.');
        }
    
};

module.exports = { execute };
