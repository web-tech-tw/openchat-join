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
        const result = await axios.post(url, {
            response: turnstileToken,
            secret: turnstileSecret,
            remoteip: ipAddress,
        });
        return result.data;
    } catch (e) {
        return {
            success: false,
            ...e,
        };
    }
};
