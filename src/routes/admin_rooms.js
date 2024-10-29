"use strict";

// Import useApp, express
const {useApp, express} = require("../init/express");

const middlewareAccess = require("../middleware/access");

// Create router
const {Router: newRouter} = express;
const router = newRouter();

router.use(express.urlencoded({extended: true}));

router.get(
    "/",
    middlewareAccess("openchat"),
    (_, res) => {
    // Extract environment variables
        const {
            OPENCHAT_ADMIN_ROOM_URL: url,
            OPENCHAT_ADMIN_ROOM_PASSWORD: password,
        } = process.env;

        // Prepare data
        const data = {
            url,
            password,
        };

        // Send response
        res.send(data);
    },
);

// Export routes mapper (function)
module.exports = () => {
    // Use application
    const app = useApp();

    // Mount the router
    app.use("/admin-rooms", router);
};
