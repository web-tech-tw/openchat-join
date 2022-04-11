"use strict";

require('dotenv').config();

const http_status = require('http-status-codes');

const
    constant = require('./src/init/const'),
    ctx = {
        now: () => Math.floor(new Date().getTime() / 1000),
        cache: require('./src/init/cache'),
        database: require('./src/init/database'),
        hash_secret: require('./src/init/hash_secret')
    },
    util = {
        hash: require('./src/utils/hash'),
        code: require('./src/utils/code'),
        access: require('./src/utils/access'),
        permission: require('./src/utils/permission'),
        ip_address: require('./src/utils/ip_address')
    },
    schema = {
        application: require("./src/schemas/application"),
        room: require("./src/schemas/room")
    };

const app = require('./src/init/express')(ctx);

app.get('/', (req, res) => {
    res.redirect(http_status.MOVED_PERMANENTLY, process.env.WEBSITE_URL);
});

app.post('/room', util.access, async (req, res) => {
    if (!(req?.body?.display_name)) {
        res.sendStatus(http_status.BAD_REQUEST);
        return;
    }
    const Room = ctx.database.model('Room', schema.room);
    const room_id = util.hash(ctx, req.body.display_name, 24);
    if (await Room.findOne({_id: room_id})) {
        res.sendStatus(http_status.CONFLICT);
        return;
    }
    const metadata = {_id: room_id, display_name: req.body.display_name};
    const room = await (new Room(metadata)).save();
    res.status(http_status.CREATED).send(room);
});

app.post('/application', async (req, res) => {
    if (!(req?.body?.display_name)) {
        res.sendStatus(http_status.BAD_REQUEST);
        return;
    }
    const Room = ctx.database.model('Room', schema.room);
    const room_id = util.hash(ctx, req.body.display_name, 24);
    if (!await Room.findOne({_id: room_id})) {
        res.sendStatus(http_status.NOT_FOUND);
        return;
    }
    const Application = ctx.database.model('Application', schema.application);
    const user_agent = req.header('User-Agent') || 'Unknown';
    const ip_address = util.ip_address(req);
    const code_data = `${room_id}_${ip_address}|${user_agent}`;
    const application_id = util.hash(ctx, code_data, 24);
    const code = util.code.generateCode(ctx, util, code_data);
    if (await Application.findOne({_id: application_id})) {
        res.sendStatus(http_status.CONFLICT);
        return;
    }
    const metadata = {_id: application_id, room_id, code, user_agent, ip_address, created_at: ctx.now()};
    const application = await (new Application(metadata)).save();
    res.status(http_status.CREATED).send(application);
});

app.listen(process.env.HTTP_PORT, process.env.HTTP_HOSTNAME, () => {
    console.log(constant.APP_NAME)
    console.log('====')
    console.log('Application is listening at')
    console.log(`http://localhost:${process.env.HTTP_PORT}`)
});
