"use strict";

const {StatusCodes} = require("http-status-codes");
const {Router: expressRouter} = require("express");

// Import modules
const util = {
    hash: require("../utils/hash"),
    code: require("../utils/code"),
    ip_address: require("../utils/ip_address"),
};
const schema = {
    application: require("../schemas/application"),
};
const middleware = {
    access: require("../middlewares/access"),
    inspector: require("../middlewares/inspector"),
    validator: require("express-validator"),
};

// Export routes mapper (function)
module.exports = (ctx, r) => {
    const router = expressRouter();

    router.get(
        "/",
        middleware.access("openchat"),
        middleware.validator.query("code").isString().notEmpty(),
        middleware.inspector,
        async (req, res) => {
            const Application = ctx.database.model(
                "Application", schema.application,
            );
            const application = await Application
                .findOne({code: req.query.code})
                .exec();
            if (application) {
                res.send(application);
            } else {
                res.sendStatus(StatusCodes.NOT_FOUND);
            }
        },
    );

    router.post(
        "/",
        middleware.validator.body("slug").isString().notEmpty(),
        middleware.inspector,
        async (req, res) => {
            const Room = ctx.database.model("Room", schema.room);
            const roomId = util.hash(ctx, req.body.slug, 24);
            if (!await Room.findOne({_id: roomId}).exec()) {
                res.sendStatus(StatusCodes.NOT_FOUND);
                return;
            }
            const Application = ctx.database.model(
                "Application", schema.application,
            );
            const userAgent = req.header("User-Agent") || "Unknown";
            const ipAddress = util.ip_address(req);
            const codeData = `${roomId}_${ipAddress}|${userAgent}`;
            const applicationId = util.hash(ctx, codeData, 24);
            const existApplication = await Application.findOne({
                _id: applicationId,
            }).exec();
            if (existApplication) {
                res.status(StatusCodes.CONFLICT).send(existApplication);
                return;
            }
            const code = util.code.generateCode(ctx, codeData);
            const metadata = {
                _id: applicationId,
                room_id: roomId,
                user_agent: userAgent,
                created_at: ctx.now(),
                ip_address: ipAddress,
                code,
            };
            const application = await (new Application(metadata)).save();
            res.status(StatusCodes.CREATED).send(application);
        },
    );

    router.patch(
        "/",
        middleware.access("openchat"),
        middleware.validator.query("code").isString().notEmpty(),
        middleware.inspector,
        async (req, res) => {
            const Application = ctx.database.model(
                "Application", schema.application,
            );
            const metadata = {
                approval_by: req.auth.id,
                approval_at: ctx.now(),
            };
            if (await Application.findOneAndUpdate(
                {code: req.query.code}, metadata,
            ).exec()) {
                res.sendStatus(StatusCodes.CREATED);
            } else {
                res.sendStatus(StatusCodes.NOT_FOUND);
            }
        },
    );

    router.delete(
        "/",
        middleware.access("openchat"),
        middleware.validator.query("code").isString().notEmpty(),
        middleware.inspector,
        async (req, res) => {
            const Application = ctx.database.model(
                "Application", schema.application,
            );
            if (await Application.findOneAndDelete({
                code: req.query.code
            }).exec()) {
                res.sendStatus(StatusCodes.OK);
            } else {
                res.sendStatus(StatusCodes.NOT_FOUND);
            }
        },
    );

    r.use("/application", router);
};
