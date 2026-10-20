"use strict";

const assert = require("node:assert/strict");

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
const to = urlGlue("/applications");

// Define tests
describe("/applications", function() {
    before(toPrepare(
        // Reset collection "applications" before test
        () => database.connection.dropCollection("applications"),
        // Do create room, no matter if the room already exists
        () => request(app).
            post("/rooms").
            set("user-agent", userAgent).
            set("accept", "application/json").
            set("authorization", getUserTestToken("admin")).
            type("form").
            send({
                label: "Test Room",
                slug: "test-room",
            }),
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
                query({code, state: true}).
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
                query({code, state: false}).
                set("user-agent", userAgent).
                set("accept", "application/json").
                set("authorization", getUserTestToken("manager")).
                expect(StatusCodes.NO_CONTENT);

            // Print response
            print(response.body);
        }));
    });

    describe("dashboard", function() {
        beforeEach(toPrepare(
            // Reset collection "applications" before test
            () => database.connection.dropCollection("applications"),
            // Do create applications with different zebra codes
            async () => {
                for (let index = 0; index < 3; index++) {
                    await request(app).
                        post(to("/")).
                        set("user-agent", userAgent).
                        set("accept", "application/json").
                        set("x-zebra-code", `zebra-${index}`).
                        type("form").
                        send({slug: "test-room", captcha: "dummy"});
                }
            },
        ));

        step("list", toTest(async function() {
            // Do request
            const response = await request(app).
                get(to("/list")).
                set("user-agent", userAgent).
                set("accept", "application/json").
                set("authorization", getUserTestToken("manager")).
                expect(StatusCodes.OK);

            // Check the response
            const {total, stats, hasMore, applications} = response.body;
            assert.strictEqual(total, 3);
            assert.strictEqual(stats.total, 3);
            assert.strictEqual(stats.pending, 3);
            assert.strictEqual(applications.length, 3);
            assert.strictEqual(hasMore, false);
            assert.strictEqual(response.body.nextCursor, null);
            assert.ok(applications[0].roomLabel);
            assert.ok(applications[0].device.browser);

            // Print response
            print(response.body);
        }));

        step("list with cursor paging", toTest(async function() {
            // Fetch the first page
            const firstResponse = await request(app).
                get(to("/list")).
                query({limit: 2}).
                set("user-agent", userAgent).
                set("accept", "application/json").
                set("authorization", getUserTestToken("manager")).
                expect(StatusCodes.OK);

            // Check the first page
            const {total, hasMore, nextCursor} = firstResponse.body;
            const {applications} = firstResponse.body;
            assert.strictEqual(total, 3);
            assert.strictEqual(applications.length, 2);
            assert.strictEqual(hasMore, true);
            assert.ok(nextCursor);

            // Fetch the second page with the cursor
            const secondResponse = await request(app).
                get(to("/list")).
                query({limit: 2, cursor: nextCursor}).
                set("user-agent", userAgent).
                set("accept", "application/json").
                set("authorization", getUserTestToken("manager")).
                expect(StatusCodes.OK);

            // Check the second page
            assert.strictEqual(secondResponse.body.applications.length, 1);
            assert.strictEqual(secondResponse.body.hasMore, false);
            assert.strictEqual(secondResponse.body.nextCursor, null);
            assert.notStrictEqual(
                secondResponse.body.applications[0].code,
                applications[0].code,
            );

            // Print response
            print(secondResponse.body);
        }));

        step("list with state filter", toTest(async function() {
            // Do request
            const response = await request(app).
                get(to("/list")).
                query({state: "approved"}).
                set("user-agent", userAgent).
                set("accept", "application/json").
                set("authorization", getUserTestToken("manager")).
                expect(StatusCodes.OK);

            // Check the response
            assert.strictEqual(response.body.total, 0);
            assert.strictEqual(response.body.applications.length, 0);

            // Print response
            print(response.body);
        }));

        step("list with codes filter", toTest(async function() {
            // Fetch one code from the list
            const listResponse = await request(app).
                get(to("/list")).
                set("user-agent", userAgent).
                set("accept", "application/json").
                set("authorization", getUserTestToken("manager")).
                expect(StatusCodes.OK);
            const code = listResponse.body.applications[0].code;

            // Do request
            const response = await request(app).
                get(to("/list")).
                query({codes: `${code},not-exists-code`}).
                set("user-agent", userAgent).
                set("accept", "application/json").
                set("authorization", getUserTestToken("manager")).
                expect(StatusCodes.OK);

            // Check the response
            assert.strictEqual(response.body.total, 1);
            assert.strictEqual(response.body.applications.length, 1);
            assert.strictEqual(response.body.applications[0].code, code);

            // Print response
            print(response.body);
        }));

        step("graph", toTest(async function() {
            // Do request
            const response = await request(app).
                get(to("/graph")).
                set("user-agent", userAgent).
                set("accept", "application/json").
                set("authorization", getUserTestToken("manager")).
                expect(StatusCodes.OK);

            // Check the response
            const {nodes, clusters, stats} = response.body;
            assert.strictEqual(nodes.length, 3);
            assert.strictEqual(clusters.length, 1);
            assert.strictEqual(clusters[0].size, 3);
            assert.ok(stats.graphEdges >= 1);
            assert.ok(nodes.every((node) => node.clusterSize === 3));
            assert.ok(nodes.every((node) => node.riskScore > 0));
            // The device relation only appears with a zebra or ip relation
            assert.ok(response.body.edges.every((edge) =>
                !edge.relations.includes("device") ||
                edge.relations.includes("zebra") ||
                edge.relations.includes("ip"),
            ));

            // Print response
            print(response.body);
        }));

        step("graph with room filter", toTest(async function() {
            // Do request
            const response = await request(app).
                get(to("/graph")).
                query({room: "not-exists-room"}).
                set("user-agent", userAgent).
                set("accept", "application/json").
                set("authorization", getUserTestToken("manager")).
                expect(StatusCodes.OK);

            // Check the response
            assert.strictEqual(response.body.nodes.length, 0);
            assert.strictEqual(response.body.stats.graphClusters, 0);

            // Print response
            print(response.body);
        }));

        step("unauthorized", toTest(async function() {
            // Do request without authorization
            await request(app).
                get(to("/list")).
                set("user-agent", userAgent).
                set("accept", "application/json").
                expect(StatusCodes.UNAUTHORIZED);

            // Do request without authorization
            await request(app).
                get(to("/graph")).
                set("user-agent", userAgent).
                set("accept", "application/json").
                expect(StatusCodes.UNAUTHORIZED);
        }));
    });
});
