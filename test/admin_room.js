"use strict";

const {
    USER_AGENT: userAgent,
} = require("./kernel/init");

const {
    print,
    urlGlue,
    toTest,
    getUserTestToken,
} = require("./kernel/utils");

const request = require("supertest");
const {step} = require("mocha-steps");

const {StatusCodes} = require("http-status-codes");

const {useApp} = require("../src/init/express");

// Initialize tests
const app = useApp();

require("../src/routes/index")();
const to = urlGlue("/admin-room");

// Define tests
describe("/", function() {
    // Define request function
    const doRequest = (roleName, expectedCode) => request(app).
        get(to("/")).
        set("user-agent", userAgent).
        set("accept", "application/json").
        set("authorization", getUserTestToken(roleName)).
        expect(expectedCode);

    step("admin", toTest(async function() {
        // Do request
        const response = await doRequest("admin", StatusCodes.OK);
        // Print response
        print(response.body);
    }));

    step("manager", toTest(async function() {
        // Do request
        const response = await doRequest("manager", StatusCodes.OK);
        // Print response
        print(response.body);
    }));

    step("guest", toTest(async function() {
        // Do request
        const response = await doRequest("guest", StatusCodes.FORBIDDEN);
        // Print response
        print(response.body);
    }));
});
