"use strict";

// Import useApp, express
const {useApp, express} = require("../init/express");
const {StatusCodes} = require("http-status-codes");

const {useDatabase} = require("../init/database");

const utilCode = require("../utils/code");

const schemaRoom = require("../schemas/room");

const middlewareAccess = require("../middleware/access");
const middlewareInspector = require("../middleware/inspector");
const middlewareValidator = require("express-validator");

// Create router
const {Router: newRouter} = express;
const router = newRouter();

router.use(express.urlencoded({extended: true}));

const database = useDatabase();

router.post(
    "/",
    middlewareAccess("admin"),
    middlewareValidator.body("slug").isString().notEmpty(),
    middlewareInspector,
    async (req, res) => {
        const roomId = utilCode.computeHash(req.body.slug, 24);

        const Room = database.model("Room", schemaRoom);
        if (await Room.findOne({_id: roomId}).exec()) {
            res.sendStatus(StatusCodes.CONFLICT);
            return;
        }

        const metadata = {_id: roomId, slug: req.body.slug};
        const room = await (new Room(metadata)).save();

        res.status(StatusCodes.CREATED).send(room);
    },
);

// Export routes mapper (function)
module.exports = () => {
    // Use application
    const app = useApp();

    // Mount the router
    app.use("/room", router);
};
