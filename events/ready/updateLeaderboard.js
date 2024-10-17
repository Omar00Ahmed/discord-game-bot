
const leaderBoardChannel = "1296359748362567680";
const {getTopPlayers} = require("../../db/playersScore");
const { generateBalancedLeaderboardImage } = require("../../utils/imagesCreating/generateLeaderboardImage")

async function execute(client) {
    let leaderboardMessage = null;


    async function updateLeaderboard() {
        const { topPlayers } = await getTopPlayers(3);
        const playersData = await Promise.all(topPlayers.map(async (player) => {
            const user = await client.users.fetch(player.discord_id);
            const imageUrl = user.displayAvatarURL({ format: 'png', size: 128 });
            const displayName = user.displayName;
            return { ...player, avatarURL, username:displayName };
        }));        
            // const topPlayersString = topPlayers.map((player, index) => `${index + 1}. <@${player.discord_id}>: ${player.points} 💎`).join("\n");

        const leaderboardChannel = client.channels.cache.get(leaderBoardChannel);

        if (leaderboardChannel) {
            const image = await generateBalancedLeaderboardImage(playersData);
            if (leaderboardMessage) {
                await leaderboardMessage.edit({
                    files: [{ attachment: image, name: "leaderboard.png" }]
                });
            } else {
                const messages = await leaderboardChannel.messages.fetch({ limit: 1 });
                const lastMessage = messages.first();

                if (lastMessage && lastMessage.author.id === client.user.id) {
                    leaderboardMessage = lastMessage;
                    await leaderboardMessage.edit({
                        files: [{ attachment: image, name: "leaderboard.png" }]
                    });
                } else {
                    leaderboardMessage = await leaderboardChannel.send({
                        files: [{ attachment: image, name: "leaderboard.png" }]
                    });
                }
            }
        }
    }

    // Initial update
    updateLeaderboard();

    // Update every 3 minutes
    setInterval(updateLeaderboard, 2 * 60 * 1000);

}

module.exports = {
    name: "updateLeaderboard",
    execute,
};
