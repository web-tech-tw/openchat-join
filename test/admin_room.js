"use strict";

// Import supertest
const request = require("supertest");

// Import StatusCodes
const {StatusCodes} = require("http-status-codes");

// Initialize tests
const {app, getUserTestToken} = require("./init");
const testing = require("../src/utils/testing");
const to = testing.urlGlue("/admin-room");

// Define tests
describe("/", function() {
    const method = (who, expectCode, done) => request(app)
        .get(to("/"))
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
        method("admin", StatusCodes.OK, done);
    });

    it("manager", function(done) {
        method("manager", StatusCodes.OK, done);
    });

    it("guest", function(done) {
        method("guest", StatusCodes.FORBIDDEN, done);
    });
});
