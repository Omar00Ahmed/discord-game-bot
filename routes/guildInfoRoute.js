const express = require('express');
const { decode } = require("next-auth/jwt");
const { PermissionFlagsBits } = require('discord.js');
const {client} = require('../config/discordClient');
const {getTopPlayers} = require("../db/playersScore");
const {getGuildGamesSettings} = require("../mongoose/utils/GuildManager")
const router = express.Router();

// Cache configuration
const CACHE_TTL = 2 * 60 * 1000; // 5 minutes
const guildInfoCache = new Map();

router.get('/:guildId', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header is missing.' });
    }

    const token = await decode({
        token: authHeader.split(' ')[1],
        secret: "hgfhlgfm",
    });
    if (!token) {
        return res.status(401).json({ error: 'Token is missing.' });
    }

    const guildId = req.params.guildId;
    const cacheKey = `${token.id}-${guildId}`;

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
            guild.members.fetch(token.id),
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
            
            const gameSettings = await getGuildGamesSettings("999450379152527431");
            const guildInfo = {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                members: guild.memberCount,
                owner: owner.user.tag,
                topPlayers: topPlayers,
                gameSettings: gameSettings.gameSettings || {}
            };

            // Update cache
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
        console.log(error)
    }
});

module.exports = router;
