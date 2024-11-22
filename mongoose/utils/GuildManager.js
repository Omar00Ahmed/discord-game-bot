const Guild = require("../Schema/Guild"); // Adjust the path to where your schema file is saved
const {getGuildPrefix} = require("../../utils/MessagePrefix");

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
        return {...guildSettings,test:"hello"};
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

async function updateGuildSettings(guildID, newSettings) {
    try {
        // Find the guild settings by guildID and update them
        const updatedSettings = await Guild.findOneAndUpdate(
            { guildID },
            { $set: newSettings },
            { new: true } // Return the updated document
        );
        return updatedSettings;
    } catch (error) {
        console.error("Error updating guild settings:", error);
        throw error;
    }
}

const cachedGames = new Map();

async function updateGuildGamesSettings(guildID, newGames) {
    try {
        const updates = {};
        for (const [key, value] of Object.entries(newGames)) {
            for (const [nestedKey, nestedValue] of Object.entries(value)) {
                updates[`games.${key}.${nestedKey}`] = nestedValue;
            }
            // Update cache if exists
            const cacheKey = `${guildID}-${key}`;
            if (cachedGames.has(cacheKey)) {
                const cachedGame = cachedGames.get(cacheKey);
                cachedGames.set(cacheKey, { ...cachedGame, ...value });
            }
        }

        const updatedSettings = await Guild.findOneAndUpdate(
            { guildID },
            { $set: updates },
            { new: true }
        );
        console.log(updates)
        return updatedSettings.games;
    } catch (error) {
        console.error("Error updating guild games settings:", error);
        throw error;
    }
}



async function getGuildGameSettings(guildID, gameName) {
    try {
        // Check cache first
        const cacheKey = `${guildID}-${gameName}`;
        if (cachedGames.has(cacheKey)) {
            console.log("Cached prefix found for guildID:", guildID);
            return cachedGames.get(cacheKey);
        }

        // If not in cache, fetch from database
        const guildSettings = await Guild.findOne(
            { guildID },
            { globalMessagePrefix: 1, [`games.${gameName}`]: 1 }
        );
    
        const result = {
            prefix: guildSettings?.globalMessagePrefix,
            ...guildSettings?.games?.[gameName]
        };

        // Store in cache
        cachedGames.set(cacheKey, result);

        return result;
    } catch (error) {
        console.error("Error fetching guild game settings:", error);
        throw error;
    }
}
async function isCorrectPrefix(guildID, prefix) {
    try {
        // Find the guild settings by guildID
        const guildSettings = await Guild.findOne(
            { guildID },
            { globalMessagePrefix: 1 }
        );
        return guildSettings?.globalMessagePrefix === prefix;
    } catch (error) {
        console.error("Error fetching guild settings:", error);
        throw error;
    }
}

module.exports = { 
    createNewGuild,
    getGuildSettings,
    getGuildGamesSettings,
    updateGuildSettings,
    updateGuildGamesSettings,
    getGuildGameSettings
};