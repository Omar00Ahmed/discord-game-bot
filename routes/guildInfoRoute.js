const express = require('express');
const { PermissionFlagsBits } = require('discord.js');
const { client } = require('../config/discordClient');
const { getTopPlayers } = require("../db/playersScore");
const { getGuildGamesSettings, updateGuildGamesSettings } = require("../mongoose/utils/GuildManager");
const authMiddleware = require('../middlewares/auth');
const router = express.Router();

// Cache configuration
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const guildInfoCache = new Map();

router.use(authMiddleware);

router.get('/:guildId', async (req, res) => {
    const guildId = req.params.guildId;
    const cacheKey = `${req.user.id}-${guildId}`;

    // Check cache first
    if (guildInfoCache.has(cacheKey)) {
        const cached = guildInfoCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return res.json(cached.guildInfo);
        }
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        return res.status(404).json({ error: 'Guild not found.' });
    }

    try {
        const [member, owner] = await Promise.all([
            guild.members.fetch(req.user.id),
            guild.fetchOwner()
        ]);

        if (member && member.permissions.has(PermissionFlagsBits.Administrator)) {
            const topPlayersData = await getTopPlayers(10);
            
            const topPlayers = await Promise.all(topPlayersData.topPlayers.map(async player => {
                try {
                    const member = await guild.members.fetch(player.discord_id);
                    return {
                        ...player,
                        nickname: member.nickname || member.user.username,
                        icon: member.user.displayAvatarURL()
                    };
                } catch (error) {
                    return {
                        ...player,
                        nickname: 'Unknown User',
                        icon: null
                    };
                }
            }));
            
            const gameSettings = await getGuildGamesSettings(guildId);
            const guildInfo = {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                members: guild.memberCount,
                owner: owner.user.tag,
                topPlayers: topPlayers,
                gameSettings: gameSettings?.games || {}
            };

            guildInfoCache.set(cacheKey, {
                guildInfo,
                timestamp: Date.now()
            });
            
            res.json(guildInfo);
        } else {
            res.status(403).json({ error: 'User is not an administrator in this guild.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch guild information.' });
        console.log(error);
    }
});

router.put('/:guildId/games', async (req, res) => {
    const guildId = req.params.guildId;
    const newGameSettings = req.body;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        return res.status(404).json({ error: 'Guild not found.' });
    }

    try {
        const member = await guild.members.fetch(req.user.id);

        if (member && member.permissions.has(PermissionFlagsBits.Administrator)) {
            const updatedSettings = await updateGuildGamesSettings(guildId, newGameSettings);
            
            // Clear the cache for this guild since settings changed
            const cacheKey = `${req.user.id}-${guildId}`;
            guildInfoCache.delete(cacheKey);
            
            res.json(updatedSettings);
        } else {
            res.status(403).json({ error: 'User is not an administrator in this guild.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update game settings.' });
        console.log(error);
    }
});

module.exports = router;
