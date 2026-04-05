// Middleware to scope queries by user role
// Attaches req.routeScope based on user role - used to filter routedTo queries
const scopeByRole = (req, res, next) => {
    if (!req.user) {
        req.routeScope = null; // unauthenticated - no filtering
        return next();
    }

    if (req.user.role === 'volunteer') {
        req.routeScope = 'volunteers';
    } else if (req.user.role === 'shelter' || req.user.role.toLowerCase() === 'ngo') {
        req.routeScope = 'shelters';
    } else {
        req.routeScope = null; // admin sees all
    }
    next();
};

module.exports = scopeByRole;
