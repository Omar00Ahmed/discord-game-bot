const Guild = require("../Schema/Guild"); // Adjust the path to where your schema file is saved

async function createNewGuild(guildID, globalMessagePrefix) {
  try {
        // Create a new guild instance
        const newGuild = new Guild({
            guildID: guildID || "defaultGuildID", // Use the provided guildID or fallback to default
            globalMessagePrefix: globalMessagePrefix || "-" // Use the provided prefix or fallback to default
        });
        // Save the guild to the database
        const savedGuild = await newGuild.save();
        console.log("New guild created:", savedGuild);
        return savedGuild;
    } catch (error) {
        console.error("Error creating guild:", error);
        throw error;
    }
}

async function getGuildSettings(guildID) {
    try {
        // Find the guild settings by guildID
        const guildSettings = await Guild.findOne({ guildID });
        return guildSettings;
    } catch (error) {
        console.error("Error fetching guild settings:", error);
        throw error;
    }
}

async function getGuildGamesSettings(guildID) {
    try {
        // Find the guild settings by guildID
        const guildSettings = await Guild.findOne({ guildID }).select('games');
        return guildSettings;
    } catch (error) {
        console.error("Error fetching guild settings:", error);
        throw error;
    }
}
module.exports = { createNewGuild };