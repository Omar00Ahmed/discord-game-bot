const { decode } = require("next-auth/jwt");

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header is missing.' });
    }

    try {
        const token = await decode({
            token: authHeader.split(' ')[1],
            secret: "hgfhlgfm",
        });

        if (!token) {
            return res.status(401).json({ error: 'Invalid token.' });
        }

        if (token.exp && Date.now() >= token.exp * 1000) {
            return res.status(401).json({ error: 'Token expired.' });
        }

        req.user = token;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Authentication failed.' });
    }
};

module.exports = authMiddleware;
