const jwt = require('jsonwebtoken');

module.exports.authUser = (req, res, next) => {
    const token = req.headers.token;

    if (!token) {
        return res.status(401).json({ title: 'No token provided' });
    }

    jwt.verify(token, process.env.SECRETKEY, (err, decoded) => {
        if (err) {
            // Check if the error was due to token expiration
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ title: 'Token has expired' });
            }
            return res.status(401).json({ title: 'Unauthorized' });
        }
        next();
    });
}
