"use strict";

// Routes
const routes = [
    require("./admin_rooms"),
    require("./applications"),
    require("./rooms"),
];

// Load routes
module.exports = () => {
    routes.forEach((c) => c());
};
