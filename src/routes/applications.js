"use strict";

const {getMust} = require("../config");

// Import useApp, withAwait, express
const {useApp, withAwait, express} = require("../init/express");
const {StatusCodes} = require("http-status-codes");

const utilVisitor = require("../utils/visitor");
const utilCode = require("../utils/code");
const utilTurnstile = require("../utils/turnstile");

const Application = require("../models/application");
const Room = require("../models/room");

const middlewareAccess = require("../middleware/access");
const middlewareInspector = require("../middleware/inspector");
const middlewareValidator = require("express-validator");

const ipGeoQuery = require("geoip-lite");

// Create router
const {Router: newRouter} = express;
const router = newRouter();

router.use(express.urlencoded({extended: true}));

router.get(
    "/",
    middlewareAccess("openchat"),
    middlewareValidator.query("code").notEmpty(),
    middlewareInspector,
    withAwait(async (req, res) => {
        // Extract query
        const {
            code,
        } = req.query;

        // Find application
        const application = await Application.findOne({code}).exec();
        if (!application) {
            res.sendStatus(StatusCodes.NOT_FOUND);
            return;
        }

        // Prepare data
        const appData = {
            ...application.toObject(),
            roomLabel: null,
        };

        // Fetch room label
        const {roomSlug} = application;
        const room = await Room.findOne({slug: roomSlug}).exec();
        appData.roomLabel = room?.label ?? "Unknown";

        // Send response
        res.send(appData);
    }),
);

router.post(
    "/",
    middlewareValidator.body("slug").notEmpty(),
    middlewareValidator.body("captcha").notEmpty(),
    middlewareValidator.header("x-zebra-code").notEmpty(),
    middlewareInspector,
    withAwait(async (req, res) => {
        // Extract request body
        const {
            slug: roomSlug,
            captcha: turnstileToken,
        } = req.body;

        // Extract request header
        const {
            "x-zebra-code": zebraCode,
        } = req.headers;

        // Check room exists
        if (!await Room.findOne({slug: roomSlug}).exec()) {
            res.sendStatus(StatusCodes.NOT_FOUND);
            return;
        }

        // Fetch visitor information
        const userAgent = utilVisitor.getUserAgent(req);
        const ipAddress = utilVisitor.getIPAddress(req);
        const ipGeolocation = ipGeoQuery.lookup(ipAddress);

        // Validate CloudFlare Turnstile
        const turnstileSecret = getMust("TURNSTILE_SECRET_KEY");
        const turnstileResult = await utilTurnstile.validResponse({
            turnstileToken,
            turnstileSecret,
            ipAddress,
        });
        if (!turnstileResult.success) {
            res.sendStatus(StatusCodes.FORBIDDEN);
            return;
        }

        // Generate code
        const data = [roomSlug, userAgent, ipAddress, zebraCode];
        const code = utilCode.generateCode(data.join("&"));

        // Check application is conflict or not
        if (await Application.findOne({code}).exec()) {
            // Send response
            res.
                status(StatusCodes.CONFLICT).
                send({code});
            return;
        }

        // Create application
        const application = new Application({
            code, zebraCode, roomSlug, userAgent, ipAddress, ipGeolocation,
        });

        // Save application
        await application.save();

        // Send response
        res.
            status(StatusCodes.CREATED).
            send({code});
    }),
);

router.patch(
    "/",
    middlewareAccess("openchat"),
    middlewareValidator.query("code").notEmpty(),
    middlewareValidator.query("state").isBoolean().notEmpty(),
    middlewareInspector,
    withAwait(async (req, res) => {
        // Extract query
        const {
            code: applicationCode,
            state: applicationState,
        } = req.query;

        // Update application
        const application = await Application.
            findOne({code: applicationCode}).exec();
        if (!application) {
            res.sendStatus(StatusCodes.NOT_FOUND);
            return;
        }

        // Check commit is conflict or not
        if (application.commitState) {
            res.sendStatus(StatusCodes.CONFLICT);
            return;
        }

        // Fetch commit data
        const commitBy = req.auth.id;
        const commitAt = Date.now();
        const commitState = applicationState === "true";

        // Update application
        application.commitBy = commitBy;
        application.commitAt = commitAt;
        application.commitState = commitState;

        // Save application
        await application.save();

        // Send response
        res.sendStatus(StatusCodes.NO_CONTENT);
    }),
);

// Export routes mapper (function)
module.exports = () => {
    // Use application
    const app = useApp();

    // Mount the router
    app.use("/applications", router);
};
