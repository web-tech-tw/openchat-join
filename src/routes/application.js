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

        // Send response
        res.send(application);
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
            res.sendStatus(StatusCodes.CONFLICT);
            return;
        }

        // Create application
        const application = new Application({
            code, zebraCode, roomSlug, userAgent, ipAddress, ipGeolocation,
        });

        // Save application
        const appData = (await application.save()).toObject();

        // Send response
        res.
            status(StatusCodes.CREATED).
            send(appData);
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

        // Fetch commit data
        const commitBy = req.auth.id;
        const commitAt = Date.now();
        const commitState = applicationState === "true";

        // Update application
        const application = await Application.findOneAndUpdate(
            {
                code: applicationCode,
            }, {
                commitBy,
                commitAt,
                commitState,
            },
        ).exec();
        if (!application) {
            res.sendStatus(StatusCodes.NOT_FOUND);
            return;
        }

        // Send response
        res.sendStatus(StatusCodes.NO_CONTENT);
    }),
);

// Export routes mapper (function)
module.exports = () => {
    // Use application
    const app = useApp();

    // Mount the router
    app.use("/application", router);
};
