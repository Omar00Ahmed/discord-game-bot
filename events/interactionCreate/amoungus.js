const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');


module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isButton()) return;

    const game = interaction.client.games.get(interaction.channelId);
    if (!game) return;

    const playerId = interaction.user.id;
    const player =   game.players.get(playerId);

    

    try {
      if (interaction.customId.startsWith('place_')) {
        // Place selection is handled in the game logic
        return;
      } else if (interaction.customId === 'task') {
        await interaction.deferReply({ ephemeral: true });
        const result = await game.handleTask(playerId);
        await interaction.deleteReply();
        await interaction.followUp({ content: result, ephemeral: true });
      } else if (interaction.customId === 'kill') {
        const killablePlayersButtons = new ActionRowBuilder().addComponents(
          ...Array.from(game.players.values())
            .filter(p => !p.isDead && p.id !== playerId && p.place === player.place)
            .map(p => 
              new ButtonBuilder()
                .setCustomId(`kill_${p.id}`)
                .setLabel(p.name)
                .setStyle(ButtonStyle.Danger)
            )
        );

        if (killablePlayersButtons.components.length > 0) {
          await interaction.reply({
            content: 'Select a player to kill:',
            components: [killablePlayersButtons],
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: 'No players available to kill in your location.',
            ephemeral: true
          });
        }
      } else if (interaction.customId.startsWith('kill_')) {
        const targetId = interaction.customId.split('_')[1];
        const result = await game.handleKill(playerId, targetId);
        await interaction.update({ content: result, components: [], ephemeral: true });
      } else if (interaction.customId === 'report') {
        const result = await game.handleReport(playerId);
        await interaction.reply({ content: result, ephemeral: true });
      } else if (interaction.customId.startsWith('vote_')) {
        // Voting is handled in the game logic
        return;
      }else if(interaction.customId.startsWith('report_sus')){
        const result = await game.handleReportSus(interaction.user.id);
      }else if(interaction.customId.startsWith("hint")){
        const result = await game.handleHint(interaction.user.id);
        // await interaction.reply({ content: result, ephemeral: true });
      }
    } catch (error) {
      try{
        console.error('Error handling interaction:', error);
      await interaction.reply({ content: 'An error occurred while processing your action.', ephemeral: true });
      }catch(err){
        console.error(`Error sending error message to user:`);
      }
    }
  },
};