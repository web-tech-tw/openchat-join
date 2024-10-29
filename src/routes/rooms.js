"use strict";

// Import useApp, withAwait, express
const {useApp, withAwait, express} = require("../init/express");
const {StatusCodes} = require("http-status-codes");

const Room = require("../models/room");

const middlewareAccess = require("../middleware/access");
const middlewareInspector = require("../middleware/inspector");
const middlewareValidator = require("express-validator");

// Create router
const {Router: newRouter} = express;
const router = newRouter();

router.use(express.urlencoded({extended: true}));

router.post(
    "/",
    middlewareAccess("admin"),
    middlewareValidator.body("label").isString().notEmpty(),
    middlewareValidator.body("slug").isString().notEmpty(),
    middlewareInspector,
    withAwait(async (req, res) => {
        // Extract request body
        const {
            label: roomLabel,
            slug: roomSlug,
        } = req.body;

        // Check if the room already exists
        if (await Room.findOne({slug: roomSlug}).exec()) {
            res.sendStatus(StatusCodes.CONFLICT);
            return;
        }

        // Create a new room
        const room = new Room({
            label: roomLabel,
            slug: roomSlug,
        });
        await room.save();

        // Send response
        res.sendStatus(StatusCodes.CREATED);
    }),
);

// Export routes mapper (function)
module.exports = () => {
    // Use application
    const app = useApp();

    // Mount the router
    app.use("/rooms", router);
};
