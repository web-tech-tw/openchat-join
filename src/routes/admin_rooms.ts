import {Elysia} from "elysia";
import {authPlugin, accessGuard} from "../plugins/auth";
import {getMust} from "../config";

/**
 * Admin room configuration routes
 */
export const adminRoomsRoutes = new Elysia({prefix: "/admin-rooms"})
    .use(authPlugin)
    /**
     * Get the admin room entrypoint
     */
    .get("/", () => {
        // Extract environment variables
        const url = getMust("OPENCHAT_ADMIN_ROOM_URL");
        const password = getMust("OPENCHAT_ADMIN_ROOM_PASSWORD");

        // Send response
        return {
            url,
            password,
        };
    }, {
        ...accessGuard("openchat"),
    });
