"use strict";

require('dotenv').config();

const http_status = require('http-status-codes');

const
    constant = require('./src/init/const'),
    ctx = {
        now: () => Math.floor(new Date().getTime() / 1000),
        cache: require('./src/init/cache'),
        database: require('./src/init/database'),
        jwt_secret: require('./src/init/jwt_secret')
    },
    util = {
        hash: require('./src/utils/hash'),
        code: require('./src/utils/code'),
        ip_address: require('./src/utils/ip_address')
    },
    schema = {
        application: require("./src/schemas/application"),
        room: require("./src/schemas/room")
    },
    middleware = {
        access: require('./src/middlewares/access'),
    };

const app = require('./src/init/express')(ctx);

app.get('/', (req, res) => {
    res.redirect(http_status.MOVED_PERMANENTLY, process.env.WEBSITE_URL);
});

app.post('/room', middleware.access('admin'), async (req, res) => {
    if (!(req?.body?.slug)) {
        res.sendStatus(http_status.BAD_REQUEST);
        return;
    }
    const Room = ctx.database.model('Room', schema.room);
    const room_id = util.hash(ctx, req.body.slug, 24);
    if (await Room.findOne({_id: room_id})) {
        res.sendStatus(http_status.CONFLICT);
        return;
    }
    const metadata = {_id: room_id, slug: req.body.slug};
    const room = await (new Room(metadata)).save();
    res.status(http_status.CREATED).send(room);
});

app.get('/applications', middleware.access('openchat'), async (req, res) => {
    const Application = ctx.database.model('Application', schema.application);
    res.send(await Application.find());
});

app.get('/application', middleware.access('openchat'), async (req, res) => {
    if (!(req?.query?.code)) {
        res.sendStatus(http_status.BAD_REQUEST);
        return;
    }
    const Application = ctx.database.model('Application', schema.application);
    const application = await Application.findOne({code: req.body.code}).exec();
    if (application) {
        res.send(application);
    } else {
        res.sendStatus(http_status.NOT_FOUND);
    }
});

app.post('/application', async (req, res) => {
    if (!(req?.body?.slug)) {
        res.sendStatus(http_status.BAD_REQUEST);
        return;
    }
    const Room = ctx.database.model('Room', schema.room);
    const room_id = util.hash(ctx, req.body.slug, 24);
    if (!await Room.findOne({_id: room_id})) {
        res.sendStatus(http_status.NOT_FOUND);
        return;
    }
    const Application = ctx.database.model('Application', schema.application);
    const user_agent = req.header('User-Agent') || 'Unknown';
    const ip_address = util.ip_address(req);
    const code_data = `${room_id}_${ip_address}|${user_agent}`;
    const application_id = util.hash(ctx, code_data, 24);
    const exist_application = await Application.findOne({_id: application_id}).exec();
    if (exist_application) {
        res.status(http_status.CONFLICT).send(exist_application);
        return;
    }
    const code = util.code.generateCode(ctx, util, code_data);
    const metadata = {_id: application_id, room_id, code, user_agent, ip_address, created_at: ctx.now()};
    const application = await (new Application(metadata)).save();
    res.status(http_status.CREATED).send(application);
});

app.patch('/application', middleware.access('openchat'), async (req, res) => {
    if (!(req?.body?.code)) {
        res.sendStatus(http_status.BAD_REQUEST);
        return;
    }
    const Application = ctx.database.model('Application', schema.application);
    const metadata = {approval_by: req.authenticated.sub, approval_at: ctx.now()};
    if (await Application.findOneAndUpdate({code: req.body.code}, metadata)) {
        res.sendStatus(http_status.CREATED);
    } else {
        res.sendStatus(http_status.NOT_FOUND);
    }
});

app.delete('/application', middleware.access('openchat'), async (req, res) => {
    if (!(req?.body?.code)) {
        res.sendStatus(http_status.BAD_REQUEST);
        return;
    }
    const Application = ctx.database.model('Application', schema.application);
    if (await Application.findOneAndDelete({code: req.body.code})) {
        res.sendStatus(http_status.OK);
    } else {
        res.sendStatus(http_status.NOT_FOUND);
    }
});

app.listen(process.env.HTTP_PORT, process.env.HTTP_HOSTNAME, () => {
    console.log(constant.APP_NAME)
    console.log('====')
    console.log('Application is listening at')
    console.log(`http://localhost:${process.env.HTTP_PORT}`)
});
