const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        console.log('Verifying token with secret:', process.env.SECRETKEY ? 'Secret exists' : 'No secret found');
        
        const decoded = jwt.verify(token, process.env.SECRETKEY);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

const ownerOnly = (req, res, next) => {
    if (req.user && req.user.userRole === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Admin only.' });
    }
};

module.exports = {
    authMiddleware,
    ownerOnly
};
