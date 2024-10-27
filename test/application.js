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
const to = urlGlue("/application");

// Define tests
describe("/application", function() {
    before(toPrepare(
        // Reset collection "applications" before test
        () => database.connection.dropCollection("applications"),
        // Do create room, no matter if the room already exists
        () => request(app).
            post("/room").
            set("user-agent", userAgent).
            set("accept", "application/json").
            set("authorization", getUserTestToken("admin")).
            type("form").
            send({slug: "test-room"}),
    ));

    step("request", toTest(async function() {
        // Do request
        const response = await request(app).
            post(to("/")).
            set("user-agent", userAgent).
            set("accept", "application/json").
            set("x-zebra-code", "dummy").
            type("form").
            send({slug: "test-room", captcha: "dummy"}).
            expect(StatusCodes.CREATED);

        // Print response
        print(response.body);
    }));

    describe("test", function() {
        let code;

        beforeEach(toPrepare(
            // Reset collection "applications" before test
            () => database.connection.dropCollection("applications"),
            // Do create application
            async () => {
                // Do request
                const response = await request(app).
                    post(to("/")).
                    set("user-agent", userAgent).
                    set("accept", "application/json").
                    set("x-zebra-code", "dummy").
                    type("form").
                    send({slug: "test-room", captcha: "dummy"});

                // Assign code
                code = response.body.code;
            },
        ));

        step("get", toTest(async function() {
            // Do request
            const response = await request(app).
                get(to("/")).
                query({code}).
                set("user-agent", userAgent).
                set("accept", "application/json").
                set("authorization", getUserTestToken("manager")).
                expect(StatusCodes.OK);

            // Print response
            print(response.body);
        }));

        step("approval", toTest(async function() {
            // Do request
            const response = await request(app).
                patch(to("/")).
                query({code, state: "true"}).
                set("user-agent", userAgent).
                set("accept", "application/json").
                set("authorization", getUserTestToken("manager")).
                expect(StatusCodes.NO_CONTENT);

            // Print response
            print(response.body);
        }));

        step("reject", toTest(async function() {
            // Do request
            const response = await request(app).
                patch(to("/")).
                query({code, state: "false"}).
                set("user-agent", userAgent).
                set("accept", "application/json").
                set("authorization", getUserTestToken("manager")).
                expect(StatusCodes.NO_CONTENT);

            // Print response
            print(response.body);
        }));
    });
});
