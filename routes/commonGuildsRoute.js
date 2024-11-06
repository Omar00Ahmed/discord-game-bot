const express = require('express');
const { decode } = require("next-auth/jwt");
const { PermissionFlagsBits } = require('discord.js');
const client = require('../config/discordClient');

const router = express.Router();

// Cache configuration
const CACHE_TTL = 2 * 60 * 1000; // 5 minutes
const guildCache = new Map();

router.get('/', async (req, res) => {
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

    // Check cache first
    if (guildCache.has(token.id)) {
        const cached = guildCache.get(token.id);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return res.json(cached.guilds);
        }
    }

    const commonGuilds = [];
    const uncachedGuilds = [];

    // Handle cached guilds
    for (const guild of client.guilds.cache.values()) {
        const member = guild.members.cache.find(m => m.user.id === token.id);
        if (member && member.permissions.has(PermissionFlagsBits.Administrator)) {
            commonGuilds.push({
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
            });
        } else {
            uncachedGuilds.push(guild);
        }
    }

    // Handle uncached guilds in parallel
    if (uncachedGuilds.length > 0) {
        const fetchResults = await Promise.all(
            uncachedGuilds.map(guild =>
                guild.members.fetch({ user: token.id })
                    .then(member => {
                        if (member && member.permissions.has(PermissionFlagsBits.Administrator)) {
                            return {
                                id: guild.id,
                                name: guild.name,
                                icon: guild.iconURL(),
                            };
                        }
                        return null;
                    })
                    .catch(() => null)
            )
        );

        // Add valid results to commonGuilds
        commonGuilds.push(...fetchResults.filter(result => result !== null));
    }

    // Update cache
    guildCache.set(token.id, {
        guilds: commonGuilds,
        timestamp: Date.now()
    });

    res.json(commonGuilds);
});

module.exports = router;
