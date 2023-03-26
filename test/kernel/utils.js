"use strict";

const {isProduction} = require("../../src/config");

const utilTestToken = require("../../src/utils/test_token");

const fakeUsers = {
    admin: {
        id: "admin",
        nickname: "OpenChat Admin",
        email: "openchat-admin@web-tech.github.io",
        roles: ["admin", "openchat"],
    },
    manager: {
        id: "manager",
        nickname: "OpenChat Manager",
        email: "openchat-manager@web-tech.github.io",
        roles: ["openchat"],
    },
    guest: {
        id: "guest",
        nickname: "OpenChat Guest",
        email: "openchat-guest@web-tech.github.io",
        roles: [],
    },
};

/**
 * Get test token of the fake user.
 * @param {string} roleName the name of role
 * @return {string}
 */
function getUserTestToken(roleName) {
    const userData = fakeUsers[roleName];
    const token = utilTestToken.issue(userData);
    return `TEST ${token}`;
}

/**
 * Print message with testing notification.
 * @param {any} messages
 */
function log(...messages) {
    if (isProduction()) return;
    console.info("[!] Test mode:", ...messages);
}

/**
 * Create a helper to merge base URL and path.
 * @param {string} baseUrl - The base URL
 * @return {function(string)}
 */
function urlGlue(baseUrl) {
    return (path) => baseUrl + path;
}

module.exports = {
    getUserTestToken,
    log,
    urlGlue,
};
