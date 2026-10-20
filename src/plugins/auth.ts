import {Elysia} from "elysia";
import * as saraTokenAuth from "../utils/sara_token";
import * as testTokenAuth from "../utils/test_token";
import {isProduction} from "../config";
import {isObjectPropExists} from "../utils/native";

const authMethods: Record<string, (token: string) => Promise<any>> = {
    "SARA": saraTokenAuth.validate,
    "TEST": (token: string) => Promise.resolve(testTokenAuth.validate(token)),
};

export interface AuthContext {
    id: string;
    metadata: any;
    method: string;
    secret: string;
}

export const authPlugin = new Elysia({name: "auth"})
    .derive({as: "global"}, async ({
        headers,
    }): Promise<{ auth: AuthContext | null }> => {
        const authHeader = headers["authorization"];
        if (!authHeader) return {auth: null};

        const params = authHeader.split(" ");
        if (params.length !== 2) return {auth: null};

        const [method, secret] = params;
        if (!isObjectPropExists(authMethods, method)) {
            return {auth: null};
        }

        const validateFn = authMethods[method];
        const result = await validateFn(secret);

        if (!isProduction()) {
            console.warn("An authentication detected:", method, result);
        }

        if (result.isAborted) {
            return {auth: null};
        }

        return {
            auth: {
                id: result.userId as string,
                metadata: result.payload as any,
                method,
                secret,
            },
        };
    });

/**
 * Create the access guard route option,
 * which checks the role for the request required,
 * and interrupts if the requirement is not satisfied.
 *
 * requiredRole can be string or null,
 * set as string, it will find the role whether satisfied,
 * set as null, will check the user whether login only.
 * @param {string|null} requiredRole The required role.
 * @return {object} The route option.
 */
export const accessGuard = (requiredRole: string | null) => ({
    beforeHandle: ({auth, status}: any) => {
        if (!isProduction()) {
            console.warn(
                "An access required request detected:",
                `role "${requiredRole}"`,
                auth,
            );
        }

        // Check auth exists
        if (!auth || !auth.id) {
            return status(401);
        }

        // Accept SARA or TEST only
        if (
            auth.method !== "SARA" &&
            !(auth.method === "TEST" && !isProduction())
        ) {
            return status(405);
        }

        // Read roles from metadata
        const userRoles = auth.metadata?.profile?.roles;
        const isUserRolesValid = Array.isArray(userRoles);

        // Check permission
        if (requiredRole &&
            (!isUserRolesValid || !userRoles.includes(requiredRole))) {
            if (!isProduction()) {
                const displayUserRoles = isUserRolesValid ?
                    userRoles.join(", ") :
                    userRoles;
                console.warn(
                    "An access required request forbidden:",
                    `actual "${displayUserRoles}"`,
                    `expected "${requiredRole}"`,
                );
            }
            return status(403);
        }
    },
});
