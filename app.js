"use strict";

require('dotenv').config();

const http_status = require('http-status-codes');

const
    app = require('./src/init/express'),
    constant = require('./src/init/const'),
    ctx = {
        now: () => Math.floor(new Date().getTime() / 1000),
        cache: require('./src/init/cache'),
        database: require('./src/init/database'),
        jwt_secret: require('./src/init/security')
    },
    util = {},
    schema = {
        application: require("./src/schemas/application")
    };

app.get('/', (req, res) => {
    res.redirect(http_status.MOVED_PERMANENTLY, process.env.WEBSITE_URL);
});

app.get('/applications', (req, res) => {
    res.send(ctx.now())
});

app.post('/application', (req, res) => {
    res.send(ctx.now())
});

app.listen(process.env.HTTP_PORT, process.env.HTTP_HOSTNAME, () => {
    console.log(constant.APP_NAME)
    console.log('====')
    console.log('Application is listening at')
    console.log(`http://localhost:${process.env.HTTP_PORT}`)
});