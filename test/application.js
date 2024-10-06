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
const to = utils.urlGlue("/application");

// Define tests
describe("/application", function() {
    before(function(done) {
        // Reset collection "applications" before test
        database.connection.dropCollection("applications", () => {
            // Do create room, no matter if the room already exists
            request(app)
                .post("/room")
                .send({slug: "test-room", captcha: "dummy"})
                .type("form")
                .set("User-Agent", process.env.TEST_USER_AGENT)
                .set("Accept", "application/json")
                .set("Authorization", utils.getUserTestToken("admin"))
                .then(() => done())
                .catch(() => done());
        });
    });

    step("request", function(done) {
        request(app)
            .post(to("/"))
            .send({slug: "test-room", captcha: "dummy"})
            .type("form")
            .set("User-Agent", process.env.TEST_USER_AGENT)
            .set("Accept", "application/json")
            .expect(StatusCodes.CREATED)
            .then((res) => {
                utils.log(res.body);
                done();
            })
            .catch((e) => {
                console.error(e);
                done(e);
            });
    });

    describe("test", function() {
        let code;

        beforeEach(function(done) {
            // Reset collection "applications" before test
            database.connection.dropCollection("applications", () => {
                request(app)
                    .post(to("/"))
                    .send({slug: "test-room", captcha: "dummy"})
                    .type("form")
                    .set("User-Agent", process.env.TEST_USER_AGENT)
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
        });

        step("get", function(done) {
            request(app)
                .get(to("/"))
                .query({code})
                .set("User-Agent", process.env.TEST_USER_AGENT)
                .set("Accept", "application/json")
                .set("Authorization", utils.getUserTestToken("manager"))
                .expect(StatusCodes.OK)
                .then((res) => {
                    utils.log(res.body);
                    done();
                })
                .catch((e) => {
                    console.error(e);
                    done(e);
                });
        });

        step("approval", function(done) {
            request(app)
                .patch(to("/"))
                .query({code})
                .set("User-Agent", process.env.TEST_USER_AGENT)
                .set("Accept", "application/json")
                .set("Authorization", utils.getUserTestToken("manager"))
                .expect(StatusCodes.NO_CONTENT)
                .then((res) => {
                    utils.log(res.body);
                    done();
                })
                .catch((e) => {
                    console.error(e);
                    done(e);
                });
        });

        step("reject", function(done) {
            request(app)
                .delete(to("/"))
                .query({code})
                .set("User-Agent", process.env.TEST_USER_AGENT)
                .set("Accept", "application/json")
                .set("Authorization", utils.getUserTestToken("manager"))
                .expect(StatusCodes.NO_CONTENT)
                .then((res) => {
                    utils.log(res.body);
                    done();
                })
                .catch((e) => {
                    console.error(e);
                    done(e);
                });
        });
    });
});
