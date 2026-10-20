import {writeFileSync} from "node:fs";
import {
    randomInt,
    randomBytes,
} from "node:crypto";

// Import constant
import {SECRET_FILENAME} from "./src/init/const";

// Import utils
import {sha256hex} from "./src/utils/native";

// Define variables
const length = randomInt(2048, 1000000);
const bytes = randomBytes(length);
const secret = Buffer.from(bytes).toString("base64");

// Write the secret file
try {
    console.info(`Secret Hash (sha256): ${sha256hex(secret)}`);
    writeFileSync(SECRET_FILENAME, secret);
    console.info(`The secret has been saved into "${SECRET_FILENAME}".`);
} catch (error) {
    console.error(error);
}
