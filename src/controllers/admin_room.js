"use strict";

// Import modules
const middlewareAccess = require("../middleware/access");

// Export routes mapper (function)
module.exports = (_, r) => {
    r.get("/admin-room", middlewareAccess("openchat"), (_, res) => {
        const url = process.env.OPENCHAT_ADMIN_ROOM_URL;
        const password = process.env.OPENCHAT_ADMIN_ROOM_PASSWORD;
        res.send({url, password});
    });
};
