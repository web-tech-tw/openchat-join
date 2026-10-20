import {Elysia, t} from "elysia";
import {authPlugin, accessGuard} from "../plugins/auth";
import Room from "../models/room";

/**
 * Room management routes
 */
export const roomsRoutes = new Elysia({prefix: "/rooms"})
    .use(authPlugin)
    /**
     * Create a room (admin only)
     */
    .post("/", async ({body, status}: any) => {
        // Extract request body
        const {
            label: roomLabel,
            slug: roomSlug,
        } = body;

        // Check if the room already exists
        if (await Room.findOne({slug: roomSlug}).exec()) {
            return status(409);
        }

        // Create a new room
        const room = new Room({
            label: roomLabel,
            slug: roomSlug,
        });
        await room.save();

        // Send response
        return status(201);
    }, {
        ...accessGuard("admin"),
        body: t.Object({
            label: t.String({minLength: 1}),
            slug: t.String({minLength: 1}),
        }),
    });
