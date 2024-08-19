"use strict";

// Import useApp, express
const {useApp, express} = require("../init/express");
const {StatusCodes} = require("http-status-codes");

const {useDatabase} = require("../init/database");

const utilVisitor = require("../utils/visitor");
const utilNative = require("../utils/native");
const utilCode = require("../utils/code");

const schemaApplication = require("../schemas/application");
const schemaRoom = require("../schemas/room");

const middlewareAccess = require("../middleware/access");
const middlewareInspector = require("../middleware/inspector");
const middlewareValidator = require("express-validator");

const ipGeoQuery = require("geoip-lite");

// Create router
const {Router: newRouter} = express;
const router = newRouter();

router.use(express.urlencoded({extended: true}));

const database = useDatabase();

router.get(
    "/",
    middlewareAccess("openchat"),
    middlewareValidator.query("code").notEmpty(),
    middlewareInspector,
    async (req, res) => {
        const Application = database.model(
            "Application", schemaApplication,
        );

        const application = await Application.
            findOne({code: req.query.code}).exec();
        if (!application) {
            res.sendStatus(StatusCodes.NOT_FOUND);
            return;
        }

        if (!application.ip_geolocation) {
            const {ip_address: ipAddress} = application;
            const ipGeolocation = ipGeoQuery.lookup(ipAddress);
            application.ip_geolocation = ipGeolocation;
            application.save();
        }

        res.send(application);
    },
);

router.post(
    "/",
    middlewareValidator.body("slug").notEmpty(),
    middlewareInspector,
    async (req, res) => {
        const Room = database.model("Room", schemaRoom);
        const roomId = utilCode.computeHash(req.body.slug, 24);
        if (!await Room.findById(roomId).exec()) {
            res.sendStatus(StatusCodes.NOT_FOUND);
            return;
        }

        const userAgent = utilVisitor.getUserAgent(req);
        const ipAddress = utilVisitor.getIPAddress(req);
        const ipGeolocation = ipGeoQuery.lookup(ipAddress);
        const codeData = `${roomId}_${ipAddress}|${userAgent}`;
        const applicationId = utilCode.computeHash(codeData, 24);

        const Application = database.model(
            "Application", schemaApplication,
        );
        const existApplication =
            await Application.findById(applicationId).exec();
        if (existApplication) {
            res.status(StatusCodes.CONFLICT).send(existApplication);
            return;
        }

        const code = utilCode.generateCode(codeData);
        const application = new Application({
            _id: applicationId,
            room_id: roomId,
            user_agent: userAgent,
            created_at: utilNative.getPosixTimestamp(),
            ip_address: ipAddress,
            ip_geolocation: ipGeolocation,
            code,
        });

        res.
            status(StatusCodes.CREATED).
            send(await application.save());
    },
);

router.patch(
    "/",
    middlewareAccess("openchat"),
    middlewareValidator.query("code").notEmpty(),
    middlewareInspector,
    async (req, res) => {
        const Application = database.model(
            "Application", schemaApplication,
        );
        const metadata = {
            approval_by: req.auth.id,
            approval_at: utilNative.getPosixTimestamp(),
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
    middlewareValidator.query("code").notEmpty(),
    middlewareInspector,
    async (req, res) => {
        const Application = database.model(
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

// Export routes mapper (function)
module.exports = () => {
    // Use application
    const app = useApp();

    // Mount the router
    app.use("/application", router);
};
