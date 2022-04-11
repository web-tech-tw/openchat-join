module.exports = (_) => function (req, res, next) {
    req.isAuthenticated = true;
    next();
};
