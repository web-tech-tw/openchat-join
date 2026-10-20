// The simple toolbox for fetch visitor information from HTTP request.

import {isProduction} from "../config";

/**
 * Get IP Address.
 * @param {Request} request The request object.
 * @param {any} server The server object.
 * @return {string} The IP address.
 */
export function getIPAddress(request: Request, server: any): string {
    if (!isProduction()) {
        return "8.8.8.8";
    }
    // Bun specific IP retrieval
    return server?.requestIP(request)?.address || "unknown";
}

/**
 * Get User-Agent.
 * @param {Headers} headers The headers object.
 * @return {string} The user agent.
 */
export function getUserAgent(headers: Headers): string {
    return headers.get("user-agent") || "Unknown";
}
