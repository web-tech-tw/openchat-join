"use strict";

const routes = [
    require("./admin_room"),
    require("./application"),
    require("./room"),
];

module.exports = (ctx, app) => {
    routes.forEach((c) => c(ctx, app));
};
