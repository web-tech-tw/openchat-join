"use strict";

const {StatusCodes} = require("http-status-codes");
const {Router: expressRouter} = require("express");

// Import modules
const util = {
    hash: require("../utils/hash"),
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

    router.post(
        "/",
        middleware.access("admin"),
        middleware.validator.body("slug").isString().notEmpty(),
        middleware.inspector,
        async (req, res) => {
            const Room = ctx.database.model("Room", schema.room);
            const roomId = util.hash(ctx, req.body.slug, 24);
            if (await Room.findOne({_id: roomId}).exec()) {
                res.sendStatus(StatusCodes.CONFLICT);
                return;
            }
            const metadata = {_id: roomId, slug: req.body.slug};
            const room = await (new Room(metadata)).save();
            res.status(StatusCodes.CREATED).send(room);
        },
    );

    r.use("/room", router);
};
