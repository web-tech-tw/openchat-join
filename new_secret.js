"use strict";

const fs = require("node:fs");
const {
    randomInt,
    randomBytes,
} = require("node:crypto");

// Import constant
const constant = require("./src/init/const");

// Import utils
const utilNative = require("./src/utils/native");

// Define variables
const length = randomInt(2048, 1000000);
const bytes = randomBytes(length);
const secret = Buffer.from(bytes).toString("base64");

// Write the secret file
try {
    const {SECRET_FILENAME: filename} = constant;
    fs.writeFileSync(filename, secret);
    const secretHash = utilNative.sha256hex(secret);
    console.info(`Secret Hash (sha256): ${secretHash}`);
    console.info(`The secret has been saved into "${filename}".`);
} catch (error) {
    console.error(error);
}
