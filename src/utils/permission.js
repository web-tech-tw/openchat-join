const http_status = require('http-status-codes');

module.exports = (req, res, next) => {
    if (!req?.authenticated?.user?.roles) {
        res.sendStatus(http_status.UNAUTHORIZED);
        return;
    }
    next();
};
