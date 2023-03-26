"use strict";

require("./kernel/init");

const utils = require("./kernel/utils");

const request = require("supertest");
const {step} = require("mocha-steps");

const {StatusCodes} = require("http-status-codes");

const {useApp} = require("../src/init/express");

// Initialize tests
const app = useApp();

require("../src/routes/index")();
const to = utils.urlGlue("/admin-room");

// Define tests
describe("/", function() {
    const method = (roleName, expectedCode, done) => request(app)
        .get(to("/"))
        .set("Accept", "application/json")
        .set("Authorization", utils.getUserTestToken(roleName))
        .expect(expectedCode)
        .then((res) => {
            utils.log(res.body);
            done();
        })
        .catch((e) => {
            console.error(e);
            done(e);
        });

    step("admin", function(done) {
        method("admin", StatusCodes.OK, done);
    });

    step("manager", function(done) {
        method("manager", StatusCodes.OK, done);
    });

    step("guest", function(done) {
        method("guest", StatusCodes.FORBIDDEN, done);
    });
});
