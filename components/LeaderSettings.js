const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const questions = require("../public/data/questions.json")

const availablePlayerOptions = [
    { label: "1 ضد 1", value: "1v1" },
    { label: "2 ضد 2", value: "2v2" },
    { label: "3 ضد 3", value: "3v3" },
    { label: "4 ضد 4", value: "4v4" },
    { label: "5 ضد 5", value: "5v5" },
    { label: "15 ضد 15", value: "15v15" },
];

const questionCategories = Object.keys(questions).map(key => ({
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: key
}))

const winningPointsOptions = [
    { label: "5 نقاط", value: "5" },
    { label: "10 نقاط", value: "10" },
    { label: "15 نقطة", value: "15" },
    { label: "20 نقطة", value: "20" },
];

const LeaderSettings = (lobby, userId) => {
    const embed = new EmbedBuilder()
        .setColor(0x0099ff);

    let components = [];

    switch (lobby.step) {
        case 'players':
            embed.setTitle('اختر عدد اللاعبين')
                .setDescription('اختر عدد اللاعبين لبدء اللعبة');
            
            const playerSelect = new StringSelectMenuBuilder()
                .setCustomId(`isleaderSettings_playerSelect_${userId}`)
                .setPlaceholder('اختر عدد اللاعبين')
                .addOptions(availablePlayerOptions);
            
            components.push(new ActionRowBuilder().addComponents(playerSelect));
            break;

        case 'category':
            embed.setTitle('اختر فئات الأسئلة')
                .setDescription('اختر فئة واحدة أو أكثر للأسئلة (الحد الأقصى 3)');
            
            const categorySelect = new StringSelectMenuBuilder()
                .setCustomId(`isleaderSettings_categorySelect_${userId}`)
                .setPlaceholder('اختر الفئات')
                .setMinValues(1)
                .setMaxValues(3)
                .addOptions(questionCategories);
            
            components.push(new ActionRowBuilder().addComponents(categorySelect));
            break;

        case 'kickAllowed':
            embed.setTitle('السماح بطرد اللاعبين؟')
                .setDescription('اختر ما إذا كان يمكن طرد اللاعبين');
            
            const kickAllowedButtons = [
                new ButtonBuilder()
                .setCustomId(`isleaderSettings_kickAllowed_${userId}_true`)
                .setLabel('نعم')
                .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                .setCustomId(`isleaderSettings_kickAllowed_${userId}_false`)
                .setLabel('لا')
                .setStyle(ButtonStyle.Primary),
            ];
            
            components.push(new ActionRowBuilder().addComponents(kickAllowedButtons));
            break;

        case 'kickRounds':
            embed.setTitle('تعيين جولات الطرد')
                .setDescription('اختر بعد كم جولة يمكن طرد اللاعب');
            
            const kickRoundsButtons = [1, 2, 3, 4, 5].map(num => 
                new ButtonBuilder()
                .setCustomId(`isleaderSettings_kickRounds_${userId}_${num}`)
                .setLabel(num.toString())
                .setStyle(ButtonStyle.Primary)
            );
            
            components.push(new ActionRowBuilder().addComponents(kickRoundsButtons));
            break;

        case 'winningPoints':
            embed.setTitle('تعيين نقاط الفوز')
                .setDescription('اختر عدد النقاط المطلوبة للفوز باللعبة');
            
            const winningPointsSelect = new StringSelectMenuBuilder()
                .setCustomId(`isleaderSettings_winningPointsSelect_${userId}`)
                .setPlaceholder('اختر نقاط الفوز')
                .addOptions(winningPointsOptions);
            
            components.push(new ActionRowBuilder().addComponents(winningPointsSelect));
            break;

        case 'complete':
            embed.setTitle('اكتملت الإعدادات')
                .setDescription('تم تكوين جميع الإعدادات')
                .addFields(
                { name: 'اللاعبون', value: lobby.playersCount || 'لم يتم التعيين' },
                { name: 'الفئة', value: lobby.categories.join(', ') || 'لم يتم التعيين' },
                { name: 'السماح بالطرد', value: lobby.kickAllowed ? 'نعم' : 'لا' },
                { name: 'جولات الطرد', value: lobby.kickRounds?.toString() || 'لم يتم التعيين' },
                { name: 'نقاط الفوز', value: lobby.winningPoints?.toString() || 'لم يتم التعيين' }
                );
        break;
    }

    const controlButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
        .setCustomId(`isleaderSettings_next_${userId}`)
        .setLabel('ابدأ')
        .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
        .setCustomId(`isleaderSettings_cancelbutton_${userId}`)
        .setLabel('إلغاء الغرفة')
        .setStyle(ButtonStyle.Danger)
    );

    if(lobby.step === "complete"){
        components.push(controlButtons);
    }

    return { embed, components };
};

const NewMessage = (lobby) => {
    return lobby.players.map(player => `- ${player}`).join('\n');
};

module.exports = {
    LeaderSettings,
    NewMessage
};