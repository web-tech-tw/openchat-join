"use strict";

// Import createHash
const {createHash} = require("node:crypto");

// Import useSecret
const {useSecret} = require("../init/secret");

/**
 * Hash data.
 * @param {string} data - The data to mixin with secret.
 * @param {number} [sub] - Length of result to extract.
 * @return {string}
 */
function computeHash(data, sub = 0) {
    const secret = useSecret();
    const hashHex = createHash("sha256").
        update(`${secret}_${data}`).
        digest("hex");
    return sub ? hashHex.substring(0, sub) : hashHex;
}

/**
 * Generate a code with data and datetime.
 * @param {string} data the data to mixin.
 * @return {string}
 */
function generateCode(data) {
    const datetime = new Date();
    const dateString = datetime.toLocaleDateString();
    return computeHash(`${dateString}_${data}`, 6);
}

module.exports = {
    computeHash,
    generateCode,
};
