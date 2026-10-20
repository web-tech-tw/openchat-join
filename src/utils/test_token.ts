// Token utils for testing/debugging or developing.

// Import config
import {isProduction} from "../config";

const DEFAULT_FAKE_USER = {
    _id: "fake_user",
    nickname: "The Fake User",
    email: "the_fake_user@web-tech.tw",
    roles: [] as string[],
};

/**
 * Issue token
 * @param {any} userData The user to generate the token for.
 * @return {string} The issued token.
 */
export function issue(userData?: any): string {
    if (isProduction()) {
        throw new Error("test_token is not allowed in production");
    }

    const data = userData || DEFAULT_FAKE_USER;
    return Buffer.
        from(JSON.stringify(data), "utf-8").
        toString("base64");
}

/**
 * Validate token
 * @param {string} token The token to valid.
 * @return {object} The validation result.
 */
export function validate(token: string) {
    if (isProduction()) {
        throw new Error("test_token is not allowed in production");
    }

    const result: {
        userId: string | null;
        payload: any;
        isAborted: boolean;
    } = {
        userId: null,
        payload: null,
        isAborted: false,
    };

    try {
        const profile = JSON.parse(
            Buffer.
                from(token, "base64").
                toString("utf-8"),
        );

        result.userId = profile._id;
        result.payload = {
            profile,
        };
    } catch (e) {
        result.isAborted = true;
        result.payload = e;
    }

    return result;
}
