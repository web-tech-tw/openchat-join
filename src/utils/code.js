"use strict";

// Import createHash
const {createHmac} = require("node:crypto");

// Import useSecret
const {useSecret} = require("../init/secret");

// Define hmac function - SHA256
const hmac256hex = (data, key) =>
    createHmac("sha256", key).update(data).digest("hex");

/**
 * Hash data.
 * @param {string} data - The data to mixin with secret.
 * @param {number} [sub] - Length of result to extract.
 * @return {string}
 */
function computeHash(data, sub = 0) {
    const secret = useSecret();
    const hashHex = hmac256hex(data, secret);
    return hashHex.substring(0, sub);
}

/**
 * Generate a code with data and datetime.
 * @param {string} data the data to mixin.
 * @return {string}
 */
function generateCode(data) {
    const datetime = new Date();
    const dateString = datetime.toLocaleDateString();
    return computeHash(`${dateString}_${data}`, 8);
}

module.exports = {
    computeHash,
    generateCode,
};
