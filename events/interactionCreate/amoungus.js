const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');


module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
      if (!interaction.isButton()) return;
  
      const game = interaction.client.games.get(interaction.channelId);
      if (!game) return;
  
      const playerId = interaction.user.id;
      const player = game.players.get(playerId);
  
    //   if (!player) {
    //     await interaction.reply({ content: "You're not in this game!", ephemeral: true });
    //     return;
    //   }
  
      // Store the interaction for future use
      game.playerInteractions.set(playerId, interaction);
  
      try {
        if (interaction.customId.startsWith('move_')) {
          const newPlace = interaction.customId.split('_')[1];
          const result = await game.handleMove(playerId, newPlace);
          if (!interaction.replied) {
            await interaction.reply({ content: result, ephemeral: true });
          } else {
            await interaction.followUp({ content: result, ephemeral: true });
          }
        } else if (interaction.customId === 'task') {
          const result = await game.handleTask(playerId);
          if (!interaction.replied) {
            await interaction.reply({ content: result, ephemeral: true });
          } else {
            await interaction.followUp({ content: result, ephemeral: true });
          }
        } else if (interaction.customId === 'kill') {
          if (game.imposter !== playerId) {
            await interaction.reply({ content: 'You are not the imposter!', ephemeral: true });
            return;
          }
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
            if (!interaction.replied) {
              await interaction.reply({
                content: 'Select a player to kill:',
                components: [killablePlayersButtons],
                ephemeral: true
              });
            } else {
              await interaction.followUp({
                content: 'Select a player to kill:',
                components: [killablePlayersButtons],
                ephemeral: true
              });
            }
          } else {
            if (!interaction.replied) {
              await interaction.reply({
                content: 'No players available to kill in your location.',
                ephemeral: true
              });
            } else {
              await interaction.followUp({
                content: 'No players available to kill in your location.',
                ephemeral: true
              });
            }
          }
        } else if (interaction.customId.startsWith('kill_')) {
          const targetId = interaction.customId.split('_')[1];
          const result = await game.handleKill(playerId, targetId);
          await interaction.update({ content: result, components: [], ephemeral: true });
        }
      } catch (error) {
        console.error('Error handling interaction:', error);
        if (!interaction.replied) {
          await interaction.reply({ content: 'An error occurred while processing your action.', ephemeral: true });
        } else {
          await interaction.followUp({ content: 'An error occurred while processing your action.', ephemeral: true });
        }
      }
    },
  };