import {describe, expect, it} from "bun:test";

// ============================================================
// Unit Tests: Core utilities (no DB required)
// ============================================================

describe("native.ts - sha256hex", () => {
    it("should hash data into sha256 hex", async () => {
        const {sha256hex} = await import("../src/utils/native");
        expect(sha256hex("abc")).toBe(
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        );
    });

    it("should hash the empty string", async () => {
        const {sha256hex} = await import("../src/utils/native");
        expect(sha256hex("")).toBe(
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        );
    });

    it("should be deterministic for the same input", async () => {
        const {sha256hex} = await import("../src/utils/native");
        expect(sha256hex("hello")).toBe(sha256hex("hello"));
    });
});

describe("native.ts - generateRandomCode", () => {
    it("should produce a numeric code with the given length", async () => {
        const {generateRandomCode} = await import("../src/utils/native");
        expect(generateRandomCode(6)).toMatch(/^[0-9]{6}$/);
        expect(generateRandomCode(4)).toMatch(/^[0-9]{4}$/);
    });
});

describe("native.ts - isObjectPropExists", () => {
    it("should return true for existing own properties", async () => {
        const {isObjectPropExists} = await import("../src/utils/native");
        expect(isObjectPropExists({foo: 1}, "foo")).toBe(true);
    });

    it("should return false for missing properties", async () => {
        const {isObjectPropExists} = await import("../src/utils/native");
        expect(isObjectPropExists({foo: 1}, "bar")).toBe(false);
    });

    it("should return false for inherited properties", async () => {
        const {isObjectPropExists} = await import("../src/utils/native");
        const child = Object.create({inherited: true});
        expect(isObjectPropExists(child, "inherited")).toBe(false);
    });
});

// ============================================================
// Unit Tests: fingerprint.ts (User-Agent parsing)
// ============================================================

describe("fingerprint.ts - parseUserAgent", () => {
    it("should parse Windows Chrome", async () => {
        const {parseUserAgent} = await import("../src/utils/fingerprint");
        const result = parseUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/120.0.0.0 Safari/537.36",
        );
        expect(result.os).toBe("Windows");
        expect(result.osVersion).toBe("10");
        expect(result.browser).toBe("Chrome");
        expect(result.browserVersion).toBe("120");
    });

    it("should parse Edge before Chrome", async () => {
        const {parseUserAgent} = await import("../src/utils/fingerprint");
        const result = parseUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        );
        expect(result.browser).toBe("Edge");
        expect(result.browserVersion).toBe("120");
    });

    it("should parse Opera before Chrome", async () => {
        const {parseUserAgent} = await import("../src/utils/fingerprint");
        const result = parseUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0",
        );
        expect(result.browser).toBe("Opera");
        expect(result.browserVersion).toBe("106");
    });

    it("should parse macOS Safari", async () => {
        const {parseUserAgent} = await import("../src/utils/fingerprint");
        const result = parseUserAgent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
            "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
            "Version/16.6 Safari/605.1.15",
        );
        expect(result.os).toBe("macOS");
        expect(result.browser).toBe("Safari");
        expect(result.browserVersion).toBe("16");
    });

    it("should parse iPhone Safari", async () => {
        const {parseUserAgent} = await import("../src/utils/fingerprint");
        const result = parseUserAgent(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
            "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
            "Version/17.0 Mobile/15E148 Safari/604.1",
        );
        expect(result.os).toBe("iOS");
        expect(result.osVersion).toBe("17");
        expect(result.browser).toBe("Safari");
    });

    it("should parse Android Chrome", async () => {
        const {parseUserAgent} = await import("../src/utils/fingerprint");
        const result = parseUserAgent(
            "Mozilla/5.0 (Linux; Android 13; Pixel 7) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/120.0.0.0 Mobile Safari/537.36",
        );
        expect(result.os).toBe("Android");
        expect(result.osVersion).toBe("13");
        expect(result.browser).toBe("Chrome");
    });

    it("should report unknown versions for Linux", async () => {
        const {parseUserAgent} = await import("../src/utils/fingerprint");
        const result = parseUserAgent(
            "Mozilla/5.0 (X11; Linux x86_64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/119.0.0.0 Safari/537.36",
        );
        expect(result.os).toBe("Linux");
        expect(result.osVersion).toBe("unknown");
    });

    it("should report unknown for unmatched strings", async () => {
        const {parseUserAgent} = await import("../src/utils/fingerprint");
        const result = parseUserAgent("curl/8.0.1");
        expect(result.os).toBe("Unknown");
        expect(result.browser).toBe("Unknown");
    });
});

describe("fingerprint.ts - getDeviceFingerprint", () => {
    it("should join OS and browser into a fingerprint", async () => {
        const {getDeviceFingerprint} = await import("../src/utils/fingerprint");
        expect(getDeviceFingerprint(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/120.0.0.0 Safari/537.36",
        )).toBe("Windows 10 / Chrome 120");
    });

    it("should report unknown families for unmatched strings", async () => {
        const {getDeviceFingerprint} = await import("../src/utils/fingerprint");
        expect(getDeviceFingerprint("wget")).toBe(
            "Unknown unknown / Unknown unknown",
        );
    });
});

// ============================================================
// Unit Tests: visitor.ts
// ============================================================

describe("visitor.ts - getUserAgent", () => {
    it("should return the user-agent header", async () => {
        const {getUserAgent} = await import("../src/utils/visitor");
        expect(getUserAgent(new Headers({"user-agent": "UA/1.0"}))).
            toBe("UA/1.0");
    });

    it("should return Unknown when the header is missing", async () => {
        const {getUserAgent} = await import("../src/utils/visitor");
        expect(getUserAgent(new Headers())).toBe("Unknown");
    });
});

describe("visitor.ts - getIPAddress", () => {
    it("should return a fixed IP outside production", async () => {
        const {getIPAddress} = await import("../src/utils/visitor");
        expect(getIPAddress(new Request("http://localhost/"), null)).
            toBe("8.8.8.8");
    });
});

// ============================================================
// Unit Tests: test_token.ts
// ============================================================

describe("test_token.ts - issue / validate roundtrip", () => {
    it("should issue a base64 token and validate it back", async () => {
        const testToken = await import("../src/utils/test_token");
        const token = testToken.issue();
        expect(typeof token).toBe("string");

        const result = testToken.validate(token);
        expect(result.isAborted).toBe(false);
        expect(result.userId).toBe("fake_user");
        expect(result.payload.profile._id).toBe("fake_user");
    });

    it("should carry the given user in the token", async () => {
        const testToken = await import("../src/utils/test_token");
        const user = {
            _id: "unit_user",
            nickname: "Unit User",
            email: "unit_user@web-tech.tw",
            roles: [],
        };
        const result = testToken.validate(testToken.issue(user));
        expect(result.isAborted).toBe(false);
        expect(result.userId).toBe("unit_user");
    });

    it("should abort on an invalid/tampered token", async () => {
        const testToken = await import("../src/utils/test_token");
        const result = testToken.validate("!!!not_valid_base64!!!");
        expect(result.isAborted).toBe(true);
        expect(result.payload).toBeInstanceOf(Error);
    });

    it("should reject issue() and validate() in production", async () => {
        const testToken = await import("../src/utils/test_token");
        const savedEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";
        try {
            expect(() => testToken.issue()).toThrow(
                "test_token is not allowed in production",
            );
            expect(() => testToken.validate("whatever")).toThrow(
                "test_token is not allowed in production",
            );
        } finally {
            process.env.NODE_ENV = savedEnv;
        }
    });
});
