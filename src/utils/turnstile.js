"use strict";

const {
    isProduction,
} = require("../config");

const axios = require("axios");

exports.validResponse = async ({
    turnstileToken,
    turnstileSecret,
    ipAddress,
}) => {
    if (!isProduction()) {
        return {
            success: true,
        };
    }

    const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    try {
        return await axios.post(url, {
            response: turnstileToken,
            secret: turnstileSecret,
            remoteip: ipAddress,
        });
    } catch (e) {
        return {
            success: false,
            ...e,
        };
    }
};
