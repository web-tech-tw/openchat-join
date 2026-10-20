import {describe, expect, it, beforeAll} from "bun:test";

// ============================================================
// Smoke Test: Elysia application boot and basic routes
// ============================================================

process.env.NODE_ENV = "testing";

let app: any;

beforeAll(async () => {
    // Dynamic import to ensure env is loaded first
    ({app} = await import("../src/index"));
});

describe("OpenChat Join Elysia Smoke Test", () => {
    it("should return 200 for robots.txt", async () => {
        const response = await app.handle(
            new Request("http://localhost/robots.txt"),
        );
        expect(response.status).toBe(200);
        expect(await response.text()).toContain("User-agent: *");
    });

    it("should redirect for /", async () => {
        const response = await app.handle(
            new Request("http://localhost/"),
        );
        expect(response.status).toBeGreaterThanOrEqual(301);
        expect(response.status).toBeLessThanOrEqual(302);
    });
});
