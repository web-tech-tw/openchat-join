"use strict";

const {
    USER_AGENT: userAgent,
} = require("./kernel/init");

const {
    print,
    urlGlue,
    toTest,
    toPrepare,
    getUserTestToken,
} = require("./kernel/utils");

const request = require("supertest");
const {step} = require("mocha-steps");

const {StatusCodes} = require("http-status-codes");

const {useApp} = require("../src/init/express");
const {useDatabase} = require("../src/init/database");

// Initialize tests
const app = useApp();
const database = useDatabase();

require("../src/routes/index")();
const to = urlGlue("/room");

// Define tests
describe("/room", function() {
    before(toPrepare(
        // Reset collection "rooms" before test
        () => database.connection.dropCollection("rooms"),
    ));

    describe("create", function() {
        const doRequest = (roleName, expectedCode) => request(app).
            post(to("/")).
            send({slug: `test-room-${roleName}`}).
            type("form").
            set("user-agent", userAgent).
            set("accept", "application/json").
            set("authorization", getUserTestToken(roleName)).
            expect(expectedCode);

        step("admin", toTest(async function() {
            // Do request
            const response = await doRequest("admin", StatusCodes.CREATED);
            // Print response
            print(response.body);
        }));

        step("manager", toTest(async function() {
            // Do request
            const response = await doRequest("manager", StatusCodes.FORBIDDEN);
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
});
