"use strict";
// JWT Security Check

const fs = require('fs');

const constant = require('./const');

let hash_secret;
try {
    hash_secret = fs.readFileSync(constant.SECRET_FILENAME).toString();
} catch (e) {
    if (e.code === 'ENOENT') {
        throw 'Hash secret is unset, please generate one with "npm run new-secret"'
    } else {
        console.log(e)
    }
}
if (hash_secret.length < 2048) {
    throw 'Hash secret IS NOT SAFE, please generate the new one with "npm run new-secret"';
}

module.exports = hash_secret;
