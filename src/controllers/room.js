"use strict";

const {StatusCodes} = require("http-status-codes");
const {Router: expressRouter} = require("express");

// Import modules
const util = {
    sara_token: require("../utils/sara_token"),
    ip_address: require("../utils/ip_address"),
};
const schema = {
    room: require("../schemas/room"),
};
const middleware = {
    access: require("../middlewares/access"),
    inspector: require("../middlewares/inspector"),
    validator: require("express-validator"),
};

// Export routes mapper (function)
module.exports = (ctx, r) => {
    const router = expressRouter();

    router.post("/room", middleware.access("admin"), async (req, res) => {
        if (!(req?.body?.slug)) {
            res.sendStatus(StatusCodes.BAD_REQUEST);
            return;
        }
        const Room = ctx.database.model("Room", schema.room);
        const roomId = util.hash(ctx, req.body.slug, 24);
        if (await Room.findOne({_id: roomId})) {
            res.sendStatus(StatusCodes.CONFLICT);
            return;
        }
        const metadata = {_id: roomId, slug: req.body.slug};
        const room = await (new Room(metadata)).save();
        res.status(StatusCodes.CREATED).send(room);
    });

    r.use("/login", router);
};
