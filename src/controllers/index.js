"use strict";

// Routes
const routes = [
    require("./admin_room"),
    require("./application"),
    require("./room"),
];

// Load routes
module.exports = (ctx, app) => {
    routes.forEach((c) => c(ctx, app));
};
