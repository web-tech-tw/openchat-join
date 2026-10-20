// The simple toolbox to normalize the visitor fingerprint
// from a User-Agent string, without any external dependency.

/**
 * The known operating system patterns.
 */
const osPatterns: Array<{name: string, pattern: RegExp}> = [
    {name: "Windows", pattern: /Windows NT ([0-9.]+)/},
    {name: "macOS", pattern: /Mac OS X ([0-9_]+)/},
    {name: "Android", pattern: /Android ([0-9.]+)/},
    {name: "iOS", pattern: /(?:iPhone|iPad).*?OS ([0-9_]+)/},
    {name: "Linux", pattern: /Linux/},
    {name: "ChromeOS", pattern: /CrOS/},
];

/**
 * The known browser patterns.
 */
const browserPatterns: Array<{name: string, pattern: RegExp}> = [
    {name: "Edge", pattern: /Edg(?:e|A|iOS)?\/([0-9.]+)/},
    {name: "Opera", pattern: /(?:OPR|Opera)[ /]([0-9.]+)/},
    {name: "Samsung Internet", pattern: /SamsungBrowser\/([0-9.]+)/},
    {name: "Firefox", pattern: /(?:Firefox|FxiOS)\/([0-9.]+)/},
    {name: "Chrome", pattern: /(?:Chrome|CriOS)\/([0-9.]+)/},
    {name: "Safari", pattern: /Version\/([0-9.]+).*Safari/},
];

/**
 * Normalize a version string into major version only.
 * @param {string|null} version The raw version.
 * @return {string} The major version or "unknown".
 */
function majorVersion(version: string | null | undefined): string {
    if (!version) {
        return "unknown";
    }
    return version.split(/[._]/)[0];
}

/**
 * Extract the first matched pattern.
 * @param {string} userAgent The User-Agent.
 * @param {Array<{name: string, pattern: RegExp}>} patterns The patterns.
 * @return {{name: string, version: string}|null} The matched result.
 */
function firstMatch(
    userAgent: string,
    patterns: Array<{name: string, pattern: RegExp}>,
): {name: string, version: string} | null {
    for (const {name, pattern} of patterns) {
        const matched = userAgent.match(pattern);
        if (matched) {
            return {name, version: majorVersion(matched[1])};
        }
    }
    return null;
}

/**
 * Parse a User-Agent string into OS and browser families.
 * @param {string} userAgent The User-Agent.
 * @return {{os: string, osVersion: string, browser: string,
 *           browserVersion: string}} The parsed result.
 */
export function parseUserAgent(userAgent: string) {
    const target = userAgent || "";
    const os = firstMatch(target, osPatterns);
    const browser = firstMatch(target, browserPatterns);
    return {
        os: os?.name || "Unknown",
        osVersion: os?.version || "unknown",
        browser: browser?.name || "Unknown",
        browserVersion: browser?.version || "unknown",
    };
}

/**
 * Compute the coarse device fingerprint of a User-Agent,
 * which groups the applications sent from the same device family.
 * @param {string} userAgent The User-Agent.
 * @return {string} The device fingerprint.
 */
export function getDeviceFingerprint(userAgent: string): string {
    const {os, osVersion, browser, browserVersion} =
        parseUserAgent(userAgent);
    return `${os} ${osVersion} / ${browser} ${browserVersion}`;
}
