"use strict";

const {isProduction} = require("../../src/config");

const utilTestToken = require("../../src/utils/test_token");

/**
 * Print message with testing notification.
 * @param {any} messages
 */
function print(...messages) {
    if (isProduction()) return;
    const timestamp = new Date().toString();
    console.info(
        "---\n",
        "[!] *Test Message*\n",
        `[!] ${timestamp}\n`,
        ...messages,
    );
}

/**
 * Create a helper to merge base URL and path.
 * @param {string} baseUrl - The base URL
 * @return {function(string)}
 */
function urlGlue(baseUrl) {
    return (path) => baseUrl + path;
}

/**
 * Return a function to run a task with arguments.
 * @param {function} task
 * @return {any}
 */
function toTest(task, ...args) {
    return async function() {
        try {
            await task(...args);
        } catch (error) {
            console.error(error);
            throw error;
        }
    };
}

/**
 * Run prepare handlers.
 * @param {function[]} handlers
 * @return {function}
 */
function toPrepare(...handlers) {
    return async function() {
        try {
            const promises = handlers.map((c) => c());
            await Promise.all(promises);
        } catch (error) {
            console.error(error);
            throw error;
        }
    };
}

const fakeUsers = {
    admin: {
        _id: "671dc03ae17ad949a20ffbda",
        nickname: "OpenChat Admin",
        email: "openchat-admin@web-tech.tw",
        roles: ["admin", "openchat"],
    },
    manager: {
        _id: "671dc03ae17ad949a20ffbdb",
        nickname: "OpenChat Manager",
        email: "openchat-manager@web-tech.tw",
        roles: ["openchat"],
    },
    guest: {
        _id: "671dc03ae17ad949a20ffbdc",
        nickname: "OpenChat Guest",
        email: "openchat-guest@web-tech.tw",
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

module.exports = {
    print,
    urlGlue,
    toTest,
    toPrepare,
    getUserTestToken,
};
