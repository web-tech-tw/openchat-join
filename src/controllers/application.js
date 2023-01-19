"use strict";

const {StatusCodes} = require("http-status-codes");
const {Router: expressRouter} = require("express");

// Import modules

const utilHash = require("../utils/hash");
const utilCode = require("../utils/code");
const utilIpAddress = require("../utils/ip_address");
const {getPosixTimestamp} = require("../utils/native");

const schemaApplication = require("../schemas/application");
const schemaRoom = require("../schemas/room");

const middlewareAccess = require("../middleware/access");
const middlewareInspector = require("../middleware/inspector");
const middlewareValidator = require("express-validator");

// Export routes mapper (function)
module.exports = (ctx, r) => {
    const router = expressRouter();

    router.get(
        "/",
        middlewareAccess("openchat"),
        middlewareValidator.query("code").isString().notEmpty(),
        middlewareInspector,
        async (req, res) => {
            const Application = ctx.database.model(
                "Application", schemaApplication,
            );
            const application = await Application.
                findOne({code: req.query.code}).exec();
            if (application) {
                res.send(application);
            } else {
                res.sendStatus(StatusCodes.NOT_FOUND);
            }
        },
    );

    router.post(
        "/",
        middlewareValidator.body("slug").isString().notEmpty(),
        middlewareInspector,
        async (req, res) => {
            const Room = ctx.database.model("Room", schemaRoom);
            const roomId = utilHash(ctx, req.body.slug, 24);
            if (!await Room.findOne({_id: roomId}).exec()) {
                res.sendStatus(StatusCodes.NOT_FOUND);
                return;
            }
            const Application = ctx.database.model(
                "Application", schemaApplication,
            );
            const userAgent = req.header("User-Agent") || "Unknown";
            const ipAddress = utilIpAddress(req);
            const codeData = `${roomId}_${ipAddress}|${userAgent}`;
            const applicationId = utilHash(ctx, codeData, 24);
            const existApplication = await Application.findOne({
                _id: applicationId,
            }).exec();
            if (existApplication) {
                res.status(StatusCodes.CONFLICT).send(existApplication);
                return;
            }
            const code = utilCode.generateCode(ctx, codeData);
            const metadata = {
                _id: applicationId,
                room_id: roomId,
                user_agent: userAgent,
                created_at: getPosixTimestamp(),
                ip_address: ipAddress,
                code,
            };
            const application = await (new Application(metadata)).save();
            res.status(StatusCodes.CREATED).send(application);
        },
    );

    router.patch(
        "/",
        middlewareAccess("openchat"),
        middlewareValidator.query("code").isString().notEmpty(),
        middlewareInspector,
        async (req, res) => {
            const Application = ctx.database.model(
                "Application", schemaApplication,
            );
            const metadata = {
                approval_by: req.auth.id,
                approval_at: getPosixTimestamp(),
            };
            if (await Application.findOneAndUpdate(
                {code: req.query.code}, metadata,
            ).exec()) {
                res.sendStatus(StatusCodes.NO_CONTENT);
            } else {
                res.sendStatus(StatusCodes.NOT_FOUND);
            }
        },
    );

    router.delete(
        "/",
        middlewareAccess("openchat"),
        middlewareValidator.query("code").isString().notEmpty(),
        middlewareInspector,
        async (req, res) => {
            const Application = ctx.database.model(
                "Application", schemaApplication,
            );
            if (await Application.findOneAndDelete({
                code: req.query.code,
            }).exec()) {
                res.sendStatus(StatusCodes.NO_CONTENT);
            } else {
                res.sendStatus(StatusCodes.NOT_FOUND);
            }
        },
    );

    r.use("/application", router);
};
