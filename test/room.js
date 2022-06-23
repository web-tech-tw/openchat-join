"use strict";

// Import supertest
const request = require("supertest");

// Import StatusCodes
const {StatusCodes} = require("http-status-codes");

// Initialize tests
const {app, ctx, getUserTestToken} = require("./init");
const testing = require("../src/utils/testing");
const to = testing.urlGlue("/room");

// Define tests
describe("/room", function() {
    before(function(done) {
        // Reset collection "rooms" before test
        ctx.database.connection.dropCollection("rooms", () => done());
    });

    describe("create", function() {
        const method = (who, expectCode, done) => request(app)
            .post(to("/"))
            .send({slug: `test-room-${who}`})
            .type("form")
            .set("Accept", "application/json")
            .set("Authorization", getUserTestToken(who))
            .expect(expectCode)
            .then((res) => {
                testing.log(res.body);
                done();
            })
            .catch((e) => {
                console.error(e);
                done(e);
            });

        it("admin", function(done) {
            method("admin", StatusCodes.CREATED, done);
        });

        it("manager", function(done) {
            method("manager", StatusCodes.FORBIDDEN, done);
        });

        it("guest", function(done) {
            method("guest", StatusCodes.FORBIDDEN, done);
        });
    });
});
