"use strict";

// Import useApp, express
const {useApp, express} = require("../init/express");

const middlewareAccess = require("../middleware/access");

// Create router
const {Router: newRouter} = express;
const router = newRouter();

router.use(express.urlencoded({extended: true}));

router.get("/", middlewareAccess("openchat"), (_, res) => {
    const url = process.env.OPENCHAT_ADMIN_ROOM_URL;
    const password = process.env.OPENCHAT_ADMIN_ROOM_PASSWORD;
    res.send({url, password});
});

// Export routes mapper (function)
module.exports = () => {
    // Use application
    const app = useApp();

    // Mount the router
    app.use("/admin-room", router);
};
