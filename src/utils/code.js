"use strict";

const hash = require("./hash");

/**
 * Generate a code with data and datetime.
 * @param {object} ctx - The context variable from app.js
 * @param {string} data the data to mixin
 * @return {string}
 */
function generateCode(ctx, data) {
    const datetime = new Date();
    const dateString = datetime.toLocaleDateString();
    return hash(ctx, `${dateString}_${data}`, 6);
}

module.exports = {generateCode};
