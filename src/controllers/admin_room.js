"use strict";

// Import modules
const middleware = {
    access: require("../middlewares/access"),
};

// Export routes mapper (function)
module.exports = (ctx, r) => {
    r.get("/admin-room", middleware.access("openchat"), (req, res) => {
        const url = process.env.OPENCHAT_ADMIN_ROOM_URL;
        const password = process.env.OPENCHAT_ADMIN_ROOM_PASSWORD;
        res.send({url, password});
    });
};
