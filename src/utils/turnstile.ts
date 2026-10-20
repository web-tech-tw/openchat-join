// The simple toolbox for CloudFlare Turnstile.

// Import config
import {isProduction} from "../config";

interface TurnstileVerifyOptions {
    turnstileToken: string;
    turnstileSecret: string;
    ipAddress: string;
}

interface TurnstileVerifyResult {
    success: boolean;
    [key: string]: any;
}

/**
 * Validate the Turnstile response.
 * @param {TurnstileVerifyOptions} options The verify options.
 * @return {Promise<TurnstileVerifyResult>} The verify result.
 */
export const validResponse = async ({
    turnstileToken,
    turnstileSecret,
    ipAddress,
}: TurnstileVerifyOptions): Promise<TurnstileVerifyResult> => {
    if (!isProduction()) {
        return {
            success: true,
        };
    }

    const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                response: turnstileToken,
                secret: turnstileSecret,
                remoteip: ipAddress,
            }),
        });
        return await response.json() as TurnstileVerifyResult;
    } catch (e: any) {
        return {
            success: false,
            ...e,
        };
    }
};
