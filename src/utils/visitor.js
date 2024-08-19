"use strict";
// The simple toolbox for fetch visitor information from HTTP request.

// Import isProduction
const {isProduction} = require("../config");

/**
 * Get IP Address.
 * @module ip_address
 * @function
 * @param {object} req the request
 * @return {string} the IP Address
 */
function getIPAddress(req) {
    if (!isProduction()) {
        return "8.8.8.8";
    }
    return req?.clientIp || req.ip;
}

/**
 * Get User-Agent.
 * @module ip_address
 * @function
 * @param {object} req the request
 * @return {string} the User-Agent
 */
function getUserAgent(req) {
    return req.header("user-agent") || "Unknown";
}

// Export (object)
module.exports = {
    getIPAddress,
    getUserAgent,
};
