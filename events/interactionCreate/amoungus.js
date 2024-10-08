module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
      if (!interaction.isButton()) return;
  
      const game = interaction.client.games.get(interaction.channelId);
      if (!game) return;
  
      switch (interaction.customId) {
        case 'task':
          await game.handleTask(interaction.user.id);
          break;
        case 'kill':
          // Open a modal or message to select the player to kill
          const killablePlayersButtons = new ActionRowBuilder().addComponents(
            ...Array.from(game.players.values())
              .filter(p => !p.isDead && p.id !== interaction.user.id && p.place === game.players.get(interaction.user.id).place)
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
          break;
        default:
          if (interaction.customId.startsWith('kill_')) {
            const targetId = interaction.customId.split('_')[1];
            await game.handleKill(interaction.user.id, targetId);
            await interaction.update({ content: 'Action completed.', components: [] });
          }
          break;
      }
    },
  };