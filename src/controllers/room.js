"use strict";

const {StatusCodes} = require("http-status-codes");
const {Router: expressRouter} = require("express");

// Import modules
const utilHash = require("../utils/hash");

const schemaRoom = require("../schemas/room");

const middlewareAccess = require("../middleware/access");
const middlewareInspector = require("../middleware/inspector");
const middlewareValidator = require("express-validator");

// Export routes mapper (function)
module.exports = (ctx, r) => {
    const router = expressRouter();

    router.post(
        "/",
        middlewareAccess("admin"),
        middlewareValidator.body("slug").isString().notEmpty(),
        middlewareInspector,
        async (req, res) => {
            const Room = ctx.database.model("Room", schemaRoom);
            const roomId = utilHash(ctx, req.body.slug, 24);
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
