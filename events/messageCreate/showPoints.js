const { Message, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { prefix } = require("../../utils/MessagePrefix");
const {generateBalancedLeaderboardImage} = require("../../utils/imagesCreating/generateLeaderboardImage")
const {
    getPlayerPoints,
    resetAllPlayersPoints,
    resetPlayerPoints,
    getTopPlayers,
    upsertPlayerPoints,
    addPlayerPoints
} = require("../../db/playersScore");
const { checkIfCanMute } = require("../../utils/WhoCanMute");

const allowedChannels = ["1291162640001007672"];

/**
 * @param {Message} message The message object
 * @param {Object} client The Discord client object
 */
const execute = async (message, client) => {
    if (message.author.bot) return; // Ignore bot messages
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // // Check if the command is issued in an allowed channel
    // if (!allowedChannels.includes(message.channelId)) {
    //     return message.reply(`يمكن كتابة هذا الامر فقط في <#${allowedChannels[0]}> | ❌`);
    // }

    // Switch case to handle commands
    switch (command) {
        case "نقاط":
            await handlePoints(message);
            break;
        case "تصفير":
            await handleResetPoints(message);
            
            break;
        case "الافضل":
            if (!["1293358588366028931"].includes(message.channelId)) {
                return message.reply(`يمكن كتابة هذا الامر فقط في <#${["1293358588366028931"][0]}> | ❌`);
            }
            await handleTopPlayers(message, client);
            break;
        case "اجعل":
            await handleSetPoints(message, args);
            break;
        case "اضافة":
            await handleAddPoints(message, args);
            break;
    }
};

// Handler functions for each command
async function handlePoints(message) {
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

    await message.channel.send({ embeds: [embed] });
}

async function announceChannel(message,channel){
   const repliedMessage =  await message.reply(`يمكن كتابة هذا الامر فقط في <#${channel || allowedChannels[0]}> | ❌`);
   setTimeout(async () => {
    await message.delete();
    await repliedMessage.delete();
   }, 5000);
}

async function handleResetPoints(message) {
    const member = message.member;

    if (checkIfCanUse(message)) {
        const mentionedUser = message.mentions.users.first();
        if (mentionedUser) {
            await resetPlayerPoints(mentionedUser.id);
            await message.reply(`تم تصفير نقاط اللاعب ${mentionedUser.username} بنجاح.`);
        } else {
            const { topPlayers } = await resetAllPlayersPoints();
            const topThreeEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('أفضل 3 لاعبين')
                .setDescription('هؤلاء هم أفضل 3 لاعبين قبل تصفير النقاط:')
                .addFields(
                    topPlayers.map((player, index) => ({
                        name: `${index + 1} المركز ال`,
                        value: `<@${player.discord_id}> النقاط: ${player.points} 💎`,
                    }))
                )
                .setTimestamp()
                .setFooter({ text: 'تم تصفير النقاط' });

            await message.channel.send({ embeds: [topThreeEmbed] });
            await message.reply('تم تصفير نقاط جميع اللاعبين بنجاح.');
        }
    }
}

async function handleTopPlayers(message, client) {
    
        const { topPlayers } = await getTopPlayers(10);
        const playersData = await Promise.all(topPlayers.map(async (player) => {
            const user = await client.users.fetch(player.discord_id);
            const imageUrl = user.displayAvatarURL({ extension:"png", size: 128 });
            const displayName = user.username;
            return { ...player, avatarURL:imageUrl, username:displayName };
        }));   
        const topImage = await generateBalancedLeaderboardImage(playersData);// update here
        

        await message.channel.send({
            files: [topImage]
        });
    
}

async function handleSetPoints(message, args) {
    if (checkIfCanUse(message)) {
        const mentionedUser = message.mentions.users.first();
        const pointsToSet = parseInt(args[1]);

        if (mentionedUser && !isNaN(pointsToSet) && pointsToSet >= 0) {
            await upsertPlayerPoints(mentionedUser.id, pointsToSet);
            await message.reply(`تم تعيين نقاط اللاعب <@${mentionedUser.id}> إلى ${pointsToSet} بنجاح.`);
        } else {
            await message.reply('الرجاء إدخال عدد صحيح وغير سالب.');
        }
    } else {
        await message.reply('ليس لديك صلاحية استخدام هذا الامر');
    }
}

async function handleAddPoints(message, args) {
    if (checkIfCanUse(message)) {
        const mentionedUser = message.mentions.users.first();
        const pointsToAdd = parseInt(args[1]);

        if (mentionedUser && !isNaN(pointsToAdd) && pointsToAdd >= 0) {
            await addPlayerPoints(mentionedUser.id, pointsToAdd);
            await message.reply(`تم اضافة نقاط اللاعب <@${mentionedUser.id}> إلى ${pointsToAdd} بنجاح.`);
        } else {
            await message.reply('الرجاء إدخال عدد صحيح وغير سالب.');
        }
    } else {
        await message.reply('ليس لديك صلاحية استخدام هذا الامر');
    }
}

// Helper function to check permissions
function checkIfCanUse(message) {
    return message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        checkIfCanMute(message.member, "develop");
}

module.exports = { 
    execute,
    
    handlePoints,
    handleResetPoints,
    handleTopPlayers,
    handleAddPoints,
    handleSetPoints
    
    
};
