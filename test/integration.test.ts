import {describe, expect, it, beforeAll} from "bun:test";

// ============================================================
// Integration Tests: /rooms, /admin-rooms & /applications API
// Requires: MongoDB running at MONGODB_URI in .env
// ============================================================

process.env.NODE_ENV = "testing";

// Shared state across test steps
const state: {
    code: string | null;
} = {
    code: null,
};

const userAgent = "Opera/9.80 (Windows NT 6.0) Presto/2.12.388 " +
    "Version/12.14";

const fakeUsers: Record<string, any> = {
    admin: {
        _id: "671dc03ae17ad949a20ffbda",
        nickname: "OpenChat Admin",
        email: "openchat-admin@web-tech.tw",
        roles: ["admin", "openchat"],
    },
    manager: {
        _id: "671dc03ae17ad949a20ffbdb",
        nickname: "OpenChat Manager",
        email: "openchat-manager@web-tech.tw",
        roles: ["openchat"],
    },
    guest: {
        _id: "671dc03ae17ad949a20ffbdc",
        nickname: "OpenChat Guest",
        email: "openchat-guest@web-tech.tw",
        roles: [],
    },
};

// ============================================================
// Setup
// ============================================================

let app: any;
let database: any;

/**
 * Get the TEST authorization header of the fake user.
 * @param {string} roleName The name of role.
 * @return {Promise<string>} The authorization header.
 */
async function authHeaderOf(roleName: string): Promise<string> {
    const testToken = await import("../src/utils/test_token");
    return `TEST ${testToken.issue(fakeUsers[roleName])}`;
}

/**
 * Send a request to the application.
 * @param {string} path The request path.
 * @param {RequestInit} [init] The request init.
 * @return {Promise<Response>} The response.
 */
async function doRequest(path: string, init?: RequestInit) {
    return app.handle(new Request(`http://localhost${path}`, init));
}

/**
 * Reset the "applications" collection and create new
 * applications with the given zebra codes.
 * @param {string[]} zebraCodes The zebra codes to create.
 * @return {Promise<string[]>} The created application codes.
 */
async function resetApplications(zebraCodes: string[]): Promise<string[]> {
    await database.connection.dropCollection("applications");
    const codes: string[] = [];
    for (const zebra of zebraCodes) {
        const response = await doRequest("/applications/", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "user-agent": userAgent,
                "x-zebra-code": zebra,
            },
            body: JSON.stringify({
                slug: "test-room",
                captcha: "dummy",
            }),
        });
        expect(response.status).toBe(201);
        codes.push((await response.json()).code);
    }
    return codes;
}

beforeAll(async () => {
    // Dynamic import to ensure env is loaded first
    const {app: _app} = await import("../src/index");
    const {
        prepare: prepareDatabase,
        useDatabase,
    } = await import("../src/init/database");

    await prepareDatabase();

    app = _app;
    database = useDatabase();
});

// ============================================================
// /rooms - Create flow
// ============================================================

describe("/rooms - create", () => {
    beforeAll(async () => {
        // Reset collection "rooms" before test
        await database.connection.dropCollection("rooms");
    });

    it("Step 1: admin should create a room (201)", async () => {
        const response = await doRequest("/rooms/", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "user-agent": userAgent,
                "authorization": await authHeaderOf("admin"),
            },
            body: JSON.stringify({
                label: "Test Room admin",
                slug: "test-room-admin",
            }),
        });

        expect(response.status).toBe(201);
    });

    it("Step 2: manager should be forbidden (403)", async () => {
        const response = await doRequest("/rooms/", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "user-agent": userAgent,
                "authorization": await authHeaderOf("manager"),
            },
            body: JSON.stringify({
                label: "Test Room manager",
                slug: "test-room-manager",
            }),
        });

        expect(response.status).toBe(403);
    });

    it("Step 3: guest should be forbidden (403)", async () => {
        const response = await doRequest("/rooms/", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "user-agent": userAgent,
                "authorization": await authHeaderOf("guest"),
            },
            body: JSON.stringify({
                label: "Test Room guest",
                slug: "test-room-guest",
            }),
        });

        expect(response.status).toBe(403);
    });
});

// ============================================================
// /admin-rooms - Entrypoint flow
// ============================================================

describe("/admin-rooms", () => {
    it("Step 1: admin should get the entrypoint (200)", async () => {
        const response = await doRequest("/admin-rooms/", {
            headers: {
                "user-agent": userAgent,
                "authorization": await authHeaderOf("admin"),
            },
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.url).toBeTruthy();
        expect(body.password).toBeTruthy();
    });

    it("Step 2: manager should get the entrypoint (200)", async () => {
        const response = await doRequest("/admin-rooms/", {
            headers: {
                "user-agent": userAgent,
                "authorization": await authHeaderOf("manager"),
            },
        });

        expect(response.status).toBe(200);
    });

    it("Step 3: guest should be forbidden (403)", async () => {
        const response = await doRequest("/admin-rooms/", {
            headers: {
                "user-agent": userAgent,
                "authorization": await authHeaderOf("guest"),
            },
        });

        expect(response.status).toBe(403);
    });
});

// ============================================================
// /applications - Request flow
// ============================================================

describe("/applications - request", () => {
    beforeAll(async () => {
        // Reset collection "applications" before test
        await database.connection.dropCollection("applications");
        // Do create room, no matter if the room already exists
        await doRequest("/rooms/", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "user-agent": userAgent,
                "authorization": await authHeaderOf("admin"),
            },
            body: JSON.stringify({
                label: "Test Room",
                slug: "test-room",
            }),
        });
    });

    it("Step 1: POST /applications/ → should return 201", async () => {
        const response = await doRequest("/applications/", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "user-agent": userAgent,
                "x-zebra-code": "dummy",
            },
            body: JSON.stringify({
                slug: "test-room",
                captcha: "dummy",
            }),
        });

        expect(response.status).toBe(201);
        const body = await response.json();
        expect(body.code).toBeTruthy();
        state.code = body.code;

        console.log("[request] code:", state.code);
    });
});

// ============================================================
// /applications - Commit states flow
// ============================================================

describe("/applications - test", () => {
    it("Step 1: GET /applications/ → should return 200", async () => {
        const [code] = await resetApplications(["dummy"]);

        const response = await doRequest(
            `/applications/?code=${encodeURIComponent(code)}`,
            {
                headers: {
                    "user-agent": userAgent,
                    "authorization": await authHeaderOf("manager"),
                },
            },
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.code).toBe(code);
        expect(body.roomLabel).toBe("Test Room");
    });

    it("Step 2: PATCH approval → should return 204", async () => {
        const [code] = await resetApplications(["dummy"]);

        const response = await doRequest(
            `/applications/?code=${encodeURIComponent(code)}` +
            "&state=true",
            {
                method: "PATCH",
                headers: {
                    "user-agent": userAgent,
                    "authorization": await authHeaderOf("manager"),
                },
            },
        );

        expect(response.status).toBe(204);
    });

    it("Step 3: PATCH reject → should return 204", async () => {
        const [code] = await resetApplications(["dummy"]);

        const response = await doRequest(
            `/applications/?code=${encodeURIComponent(code)}` +
            "&state=false",
            {
                method: "PATCH",
                headers: {
                    "user-agent": userAgent,
                    "authorization": await authHeaderOf("manager"),
                },
            },
        );

        expect(response.status).toBe(204);
    });
});

// ============================================================
// /applications - Dashboard flow
// ============================================================

describe("/applications - dashboard", () => {
    it("Step 1: GET /applications/list → should list all", async () => {
        await resetApplications(["zebra-0", "zebra-1", "zebra-2"]);

        const response = await doRequest("/applications/list", {
            headers: {
                "user-agent": userAgent,
                "authorization": await authHeaderOf("manager"),
            },
        });

        expect(response.status).toBe(200);
        const {total, stats, hasMore, nextCursor, applications} =
            await response.json();
        expect(total).toBe(3);
        expect(stats.total).toBe(3);
        expect(stats.pending).toBe(3);
        expect(applications.length).toBe(3);
        expect(hasMore).toBe(false);
        expect(nextCursor).toBeNull();
        expect(applications[0].roomLabel).toBe("Test Room");
        expect(applications[0].device.browser).toBeTruthy();
    });

    it("Step 2: GET /applications/list with cursor paging", async () => {
        await resetApplications(["zebra-0", "zebra-1", "zebra-2"]);

        // Fetch the first page
        const firstResponse = await doRequest(
            "/applications/list?limit=2",
            {
                headers: {
                    "user-agent": userAgent,
                    "authorization": await authHeaderOf("manager"),
                },
            },
        );
        expect(firstResponse.status).toBe(200);

        // Check the first page
        const firstBody = await firstResponse.json();
        expect(firstBody.total).toBe(3);
        expect(firstBody.applications.length).toBe(2);
        expect(firstBody.hasMore).toBe(true);
        expect(firstBody.nextCursor).toBeTruthy();

        // Fetch the second page with the cursor
        const secondResponse = await doRequest(
            "/applications/list?limit=2&cursor=" +
            encodeURIComponent(firstBody.nextCursor),
            {
                headers: {
                    "user-agent": userAgent,
                    "authorization": await authHeaderOf("manager"),
                },
            },
        );
        expect(secondResponse.status).toBe(200);

        // Check the second page
        const secondBody = await secondResponse.json();
        expect(secondBody.applications.length).toBe(1);
        expect(secondBody.hasMore).toBe(false);
        expect(secondBody.nextCursor).toBeNull();
        expect(secondBody.applications[0].code).
            not.toBe(firstBody.applications[0].code);
    });

    it("Step 3: GET /applications/list with state filter", async () => {
        await resetApplications(["zebra-0", "zebra-1", "zebra-2"]);

        const response = await doRequest(
            "/applications/list?state=approved",
            {
                headers: {
                    "user-agent": userAgent,
                    "authorization": await authHeaderOf("manager"),
                },
            },
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.total).toBe(0);
        expect(body.applications.length).toBe(0);
    });

    it("Step 4: GET /applications/graph → should build the graph",
        async () => {
            await resetApplications(["zebra-0", "zebra-1", "zebra-2"]);

            const response = await doRequest("/applications/graph", {
                headers: {
                    "user-agent": userAgent,
                    "authorization": await authHeaderOf("manager"),
                },
            });

            expect(response.status).toBe(200);
            const {nodes, clusters, stats} = await response.json();
            expect(nodes.length).toBe(3);
            expect(clusters.length).toBe(1);
            expect(clusters[0].size).toBe(3);
            expect(stats.graphEdges).toBeGreaterThanOrEqual(1);
            expect(nodes.every((node: any) => node.clusterSize === 3)).
                toBe(true);
            expect(nodes.every((node: any) => node.riskScore > 0)).
                toBe(true);
        });

    it("Step 5: GET /applications/graph with room filter", async () => {
        await resetApplications(["zebra-0", "zebra-1", "zebra-2"]);

        const response = await doRequest(
            "/applications/graph?room=not-exists-room",
            {
                headers: {
                    "user-agent": userAgent,
                    "authorization": await authHeaderOf("manager"),
                },
            },
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.nodes.length).toBe(0);
        expect(body.stats.graphClusters).toBe(0);
    });

    it("Step 6: unauthorized requests → should return 401", async () => {
        // Do request without authorization
        const listResponse = await doRequest("/applications/list", {
            headers: {
                "user-agent": userAgent,
            },
        });
        expect(listResponse.status).toBe(401);

        // Do request without authorization
        const graphResponse = await doRequest("/applications/graph", {
            headers: {
                "user-agent": userAgent,
            },
        });
        expect(graphResponse.status).toBe(401);
    });
});
