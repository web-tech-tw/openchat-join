// The simple toolbox to generate one-day codes.

// Import createHash
import {createHmac} from "node:crypto";

// Import useSecret
import {useSecret} from "../init/secret";

// Define hmac function - SHA256
const hmac256hex = (data: string, key: string) =>
    createHmac("sha256", key).update(data).digest("hex");

/**
 * Hash data.
 * @param {string} data The data to mixin with secret.
 * @param {number} [sub] Length of result to extract.
 * @return {string} The hash result.
 */
export function computeHash(data: string, sub: number = 0): string {
    const secret = useSecret();
    const hashHex = hmac256hex(data, secret);
    return hashHex.substring(0, sub);
}

/**
 * Generate a code with data and datetime.
 * @param {string} data The data to mixin.
 * @return {string} The generated code.
 */
export function generateCode(data: string): string {
    const datetime = new Date();
    const dateString = datetime.toLocaleDateString();
    return computeHash(`${dateString}_${data}`, 8);
}
