"use strict";

const {sha256} = require("js-sha256");

/**
 * Hash data.
 * @param {object} ctx - The context variable from app.js.
 * @param {string} data - The data to mixin with jwt_secret.
 * @param {number} [sub] - Length of result to extract.
 * @return {string}
 */
function hash(ctx, data, sub = 0) {
    const metadata = `${ctx.jwt_secret}_${data}`;
    const hashHex = sha256(metadata);
    return sub ? hashHex.substring(0, sub) : hashHex;
}

module.exports = hash;
