"use strict";

// Routes
const routes = [
    require("./admin_room"),
    require("./application"),
    require("./room"),
];

// Load routes
module.exports = () => {
    routes.forEach((c) => c());
};
