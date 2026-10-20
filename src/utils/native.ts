// The simple toolbox for Bun/Node.js

import {
    randomInt,
    createHash,
} from "node:crypto";

/**
 * Shortcut for hasOwnProperty with safe.
 * @param {object} srcObject The source object.
 * @param {string} propName The property name.
 * @return {boolean} Whether the property exists.
 */
export function isObjectPropExists(
    srcObject: Record<string, any>,
    propName: string,
): boolean {
    return Object.hasOwn(srcObject, propName);
}

/**
 * Generate random code with length.
 * @param {number} length Length of code.
 * @return {string} The random code.
 */
export function generateRandomCode(length: number): string {
    const maxValue = (10 ** length) - 1;
    return randomInt(0, maxValue).
        toString().
        padStart(length, "0");
}

/**
 * Hash string into sha256 hex.
 * @param {string} data The data to hash.
 * @return {string} The sha256 hex.
 */
export function sha256hex(data: string): string {
    return createHash("sha256").
        update(data).
        digest("hex");
}
