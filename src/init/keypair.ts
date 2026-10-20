// Reading curve keypair.
import {readFileSync} from "node:fs";
import * as constants from "./const";

export const usePublicKey = () =>
    readFileSync(constants.PUBLIC_KEY_FILENAME);
