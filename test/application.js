"use strict";

// Import supertest
const request = require("supertest");

// Import mocha-steps
const {step} = require("mocha-steps");

// Import StatusCodes
const {StatusCodes} = require("http-status-codes");

// Initialize tests
const {app, getUserTestToken, ctx} = require("./init");
const testing = require("../src/utils/testing");
const to = testing.urlGlue("/application");

// Define tests
describe("/application", function() {
    let code;

    before(function(done) {
        // Reset collection "applications" before test
        ctx.database.connection.dropCollection("applications", () => {
            // Do create room, no matter if the room already exists
            request(app)
                .post("/room")
                .send({slug: `test-room`})
                .type("form")
                .set("Accept", "application/json")
                .set("Authorization", getUserTestToken("admin"))
                .then(() => done())
                .catch(() => done());
        });
    });

    step("request", function(done) {
        request(app)
            .post(to("/"))
            .send({slug: `test-room`})
            .type("form")
            .set("Accept", "application/json")
            .expect(StatusCodes.CREATED)
            .then((res) => {
                code = res.body.code;
                done();
            })
            .catch((e) => {
                console.error(e);
                done(e);
            });
    });

    step("get", function(done) {
        request(app)
            .get(to("/"))
            .query({code})
            .set("Accept", "application/json")
            .set("Authorization", getUserTestToken("manager"))
            .expect(StatusCodes.OK)
            .then((res) => {
                testing.log(res.body);
                done();
            })
            .catch((e) => {
                console.error(e);
                done(e);
            });
    });

    step("patch", function(done) {
        request(app)
            .patch(to("/"))
            .query({code})
            .set("Accept", "application/json")
            .set("Authorization", getUserTestToken("manager"))
            .expect(StatusCodes.CREATED)
            .then((res) => {
                testing.log(res.body);
                done();
            })
            .catch((e) => {
                console.error(e);
                done(e);
            });
    });
});
