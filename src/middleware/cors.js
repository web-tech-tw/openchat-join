"use strict";
// Cross-Origin Resource Sharing

// Import config
const {getMust} = require("../config");

// Import cors
const cors = require("cors");

// Read config
const corsOrigin = getMust("CORS_ORIGIN");

// Export (function)
module.exports = cors({
    origin: corsOrigin,
});
