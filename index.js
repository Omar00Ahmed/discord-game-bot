// server.js

const express = require('express');
const cors = require('cors');
const client = require('./config/discordClient'); // Import the client to ensure it's initialized

const app = express();
const port = 3005;

app.use(express.json());
app.use(cors());

// Import routes
const commonGuildsRoute = require('./routes/commonGuildsRoute');
const guildInfoRoute = require('./routes/guildInfoRoute');

// Middleware to check if client is ready
app.use((req, res, next) => {
    if (!client || !client.isReady()) {
        return res.status(503).json({ error: 'Bot client is not ready.' });
    }
    next();
});

// Use routes
app.use('/common-guilds', commonGuildsRoute);
app.use('/guild-info', guildInfoRoute);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
