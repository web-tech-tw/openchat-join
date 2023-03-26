"use strict";

require("./kernel/init");

const utils = require("./kernel/utils");

const request = require("supertest");
const {step} = require("mocha-steps");

const {StatusCodes} = require("http-status-codes");

const {useApp} = require("../src/init/express");
const {useDatabase} = require("../src/init/database");

// Initialize tests
const app = useApp();
const database = useDatabase();

require("../src/routes/index")();
const to = utils.urlGlue("/room");

// Define tests
describe("/room", function() {
    before(function(done) {
        // Reset collection "rooms" before test
        database.connection.dropCollection("rooms", () => done());
    });

    describe("create", function() {
        const method = (roleName, expectedCode, done) => request(app)
            .post(to("/"))
            .send({slug: `test-room-${roleName}`})
            .type("form")
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
            method("admin", StatusCodes.CREATED, done);
        });

        step("manager", function(done) {
            method("manager", StatusCodes.FORBIDDEN, done);
        });

        step("guest", function(done) {
            method("guest", StatusCodes.FORBIDDEN, done);
        });
    });
});
