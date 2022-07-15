"use strict";

// Load configs from .env
require("dotenv").config();

// Import modules
const ctx = {
    testing: true,
    now: () => Math.floor(new Date().getTime() / 1000),
    cache: require("../src/init/cache"),
    database: require("../src/init/database"),
    jwt_secret: require("../src/init/jwt_secret"),
};
const util = {
    test_token: require("../src/utils/test_token"),
}

// Define fake users
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
const getUserTestToken = (who) => `TEST ${
    util.test_token.issueAuthToken(ctx, fakeUsers[who])
}`;

// Initialize application
const app = require("../src/init/express")(ctx);

// Map routes
require("../src/controllers/index")(ctx, app);

// Export (object)
module.exports = {app, ctx, fakeUsers, getUserTestToken};
