"use strict";
// Validate "Authorization" header, but it will not interrupt the request.

// To interrupt the request which without the request,
// please use "access.js" middleware.

// Import StatusCodes
const {StatusCodes} = require("http-status-codes");

// Import authMethods
const authMethods = {
    "SARA": async (ctx, req, _) =>
        require("../utils/sara_token").validateAuthToken(ctx, req.auth.secret),
    "TEST": async (ctx, req, _) => {
        if (!ctx.testing) return false;
        return {
            user: JSON.parse(
                Buffer
                    .from(req.auth.secret, "base64")
                    .toString("utf-8"),
            ),
        };
    },
};

// Export (function)
module.exports = (ctx) => function(req, res, next) {
    const authCode = req.header("Authorization");
    if (!authCode) {
        next();
        return;
    }
    const params = authCode.split(" ");
    if (params.length !== 2) {
        next();
        return;
    }
    req.auth = {
        id: null,
        metadata: null,
        method: params[0],
        secret: params[1],
    };
    if (!(req.auth.method in authMethods)) {
        next();
        return;
    }
    authMethods[req.auth.method](ctx, req, res)
        .then((result) => {
            if (!req.auth.metadata) {
                req.auth.metadata = result;
            }
            if (!req.auth.id) {
                req.auth.id =
                    result?.id ||
                    result?.sub ||
                    result?.user?.id ||
                    result?.data?.id ||
                    result?.user?._id ||
                    result?.data?._id ||
                    null;
            }
            next();
        })
        .catch((error) => {
            res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
            console.error(error);
        });
};
