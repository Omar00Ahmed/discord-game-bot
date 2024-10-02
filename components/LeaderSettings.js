const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const questions = require("../public/data/questions.json")

const availablePlayerOptions = [
    { label: "1v1", value: "1v1" },
    { label: "2v2", value: "2v2" },
    { label: "3v3", value: "3v3" },
    { label: "4v4", value: "4v4" },
    { label: "5v5", value: "5v5" },
    { label: "15v15", value: "15v15" },
];

const questionCategories = Object.keys(questions).map(key => ({
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: key
}))

const winningPointsOptions = [
    { label: "5 points", value: "5" },
    { label: "10 points", value: "10" },
    { label: "15 points", value: "15" },
    { label: "20 points", value: "20" },
];

const LeaderSettings = (lobby, userId) => {
    const embed = new EmbedBuilder()
        .setColor(0x0099ff);

    let components = [];

    switch (lobby.step) {
        case 'players':
            embed.setTitle('Select number of players')
                .setDescription('Choose the number of players to start the game');
            
            const playerSelect = new StringSelectMenuBuilder()
                .setCustomId(`isleaderSettings_playerSelect_${userId}`)
                .setPlaceholder('Select player count')
                .addOptions(availablePlayerOptions);
            
            components.push(new ActionRowBuilder().addComponents(playerSelect));
            break;

        case 'category':
            embed.setTitle('Select question categories')
                .setDescription('Choose one or more categories for the questions (max 3)');
            
            const categorySelect = new StringSelectMenuBuilder()
                .setCustomId(`isleaderSettings_categorySelect_${userId}`)
                .setPlaceholder('Select categories')
                .setMinValues(1)
                .setMaxValues(3)
                .addOptions(questionCategories);
            
            components.push(new ActionRowBuilder().addComponents(categorySelect));
            break;

        case 'kickAllowed':
            embed.setTitle('Allow kicking players?')
                .setDescription('Choose whether players can be kicked');
            
            const kickAllowedButtons = [
                new ButtonBuilder()
                .setCustomId(`isleaderSettings_kickAllowed_${userId}_true`)
                .setLabel('Yes')
                .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                .setCustomId(`isleaderSettings_kickAllowed_${userId}_false`)
                .setLabel('No')
                .setStyle(ButtonStyle.Primary),
            ];
            
            components.push(new ActionRowBuilder().addComponents(kickAllowedButtons));
            break;

        case 'kickRounds':
            embed.setTitle('Set kick rounds')
                .setDescription('Choose after how many rounds a player can be kicked');
            
            const kickRoundsButtons = [1, 2, 3, 4, 5].map(num => 
                new ButtonBuilder()
                .setCustomId(`isleaderSettings_kickRounds_${userId}_${num}`)
                .setLabel(num.toString())
                .setStyle(ButtonStyle.Primary)
            );
            
            components.push(new ActionRowBuilder().addComponents(kickRoundsButtons));
            break;

        case 'winningPoints':
            embed.setTitle('Set winning points')
                .setDescription('Choose how many points are needed to win the game');
            
            const winningPointsSelect = new StringSelectMenuBuilder()
                .setCustomId(`isleaderSettings_winningPointsSelect_${userId}`)
                .setPlaceholder('Select winning points')
                .addOptions(winningPointsOptions);
            
            components.push(new ActionRowBuilder().addComponents(winningPointsSelect));
            break;

        case 'complete':
            embed.setTitle('Settings Complete')
                .setDescription('All settings have been configured')
                .addFields(
                { name: 'Players', value: lobby.playersCount || 'Not set' },
                { name: 'Category', value: lobby.categories.join(', ') || 'Not set' },
                { name: 'Kick Allowed', value: lobby.kickAllowed ? 'Yes' : 'No' },
                { name: 'Kick Rounds', value: lobby.kickRounds?.toString() || 'Not set' },
                { name: 'Winning Points', value: lobby.winningPoints?.toString()}
                );
        break;
    }

    const controlButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
        .setCustomId(`isleaderSettings_next_${userId}`)
        .setLabel('Start')
        .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
        .setCustomId(`isleaderSettings_cancelbutton_${userId}`)
        .setLabel('Cancel Room')
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