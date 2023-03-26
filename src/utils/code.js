"use strict";

const {getMust} = require("../config");
const {sha256} = require("js-sha256");

const hashMixin = getMust("OPENCHAT_HASH_MIXIN");

/**
 * Hash data.
 * @param {string} data - The data to mixin with jwt_secret.
 * @param {number} [sub] - Length of result to extract.
 * @return {string}
 */
function computeHash(data, sub = 0) {
    const metadata = `${hashMixin}_${data}`;
    const hashHex = sha256(metadata);
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
