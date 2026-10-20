// Token utils of Sara.

// Import config
import {getMust} from "../config";

// Import modules
import jwt, {Jwt, JwtPayload} from "jsonwebtoken";

import {useCache} from "../init/cache";
import {usePublicKey} from "../init/keypair";

// Define Sara Token specs
const issuerIdentity = "Sara Hoshikawa"; // The code of Sara v3

// Define verifyOptions
const verifyOptions: jwt.VerifyOptions = {
    algorithms: ["ES256"],
    issuer: issuerIdentity,
    audience: getMust("SARA_AUDIENCE_URL"),
    complete: true,
};

/**
 * Check if token is activated
 * @param {string} tokenId The token id to check.
 * @return {Promise<boolean>} Whether the token is activated.
 */
export async function isActivated(tokenId: string): Promise<boolean> {
    const queryKey = ["sara_token", tokenId].join(":");

    const cache = useCache();
    if (cache.has(queryKey)) {
        return cache.get(queryKey) as boolean;
    }

    let isActivated = false;
    try {
        const baseURL = getMust("SARA_RECV_HOST");
        const response = await fetch(
            `${baseURL}/tokens/${tokenId}`,
            {method: "HEAD"},
        );
        isActivated = response.status === 200;
    } catch {
        isActivated = false;
    }

    cache.set(queryKey, isActivated, 300);
    return isActivated;
}

/**
 * Validate token
 * @param {string} token The token to valid.
 * @return {Promise<object>} The validation result.
 */
export async function validate(token: string) {
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
        const publicKey = usePublicKey();
        const decoded = jwt.verify(
            token, publicKey, verifyOptions,
        ) as Jwt;
        const payload = decoded.payload as JwtPayload;

        if (!await isActivated(payload.jti || "")) {
            throw new Error("sara_token is not activated");
        }

        result.userId = payload.sub || null;
        result.payload = {
            profile: (payload as any).user,
        };
    } catch (e) {
        result.isAborted = true;
        result.payload = e;
    }

    return result;
}
