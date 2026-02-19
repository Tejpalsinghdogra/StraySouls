const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'straysouls_secret_key_123';

module.exports = function (req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token') || req.header('Authorization')?.split(' ')[1];

    // Check if not token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('JWT Verification Error:', err.message);
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
