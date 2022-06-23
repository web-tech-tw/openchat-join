"use strict";

// Import supertest
const request = require("supertest");

// Import StatusCodes
const {StatusCodes} = require("http-status-codes");

// Initialize tests
const {app, getUserTestToken, ctx} = require("./init");
const testing = require("../src/utils/testing");
const to = testing.urlGlue("/application");

// Define tests
describe("/application", function() {
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

    it("request", function(done) {
        request(app)
            .post(to("/"))
            .send({slug: `test-room`})
            .type("form")
            .set("Accept", "application/json")
            .expect(StatusCodes.CREATED)
            .then(() => done())
            .catch((e) => {
                console.error(e);
                done(e);
            });
    });

    describe("test", function() {
        let code;

        beforeEach(function(done) {
            // Do create application, no matter if the application already exists
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
                .catch(() => done());
        });

        it("get", function(done) {
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

        it("approval", function(done) {
            request(app)
                .patch(to("/"))
                .query({code})
                .set("Accept", "application/json")
                .set("Authorization", getUserTestToken("manager"))
                .expect(StatusCodes.NO_CONTENT)
                .then((res) => {
                    testing.log(res.body);
                    done();
                })
                .catch((e) => {
                    console.error(e);
                    done(e);
                });
        });

        it("reject", function(done) {
            request(app)
                .delete(to("/"))
                .query({code})
                .set("Accept", "application/json")
                .set("Authorization", getUserTestToken("manager"))
                .expect(StatusCodes.NO_CONTENT)
                .then((res) => {
                    testing.log(res.body);
                    done();
                })
                .catch((e) => {
                    console.error(e);
                    done(e);
                });
        });
    })
});
