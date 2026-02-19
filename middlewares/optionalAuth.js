const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'straysouls_secret_key_123';

module.exports = function (req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token') || req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        // Just proceed without user if token is invalid
        next();
    }
};
