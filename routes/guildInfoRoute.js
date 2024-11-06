const express = require('express');
const { decode } = require("next-auth/jwt");
const { PermissionFlagsBits } = require('discord.js');
const client = require('../config/discordClient');

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
            const guildInfo = {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                members: guild.memberCount,
                owner: owner.user.tag,
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
    }
});

module.exports = router;
