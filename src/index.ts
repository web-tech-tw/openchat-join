import {Elysia} from "elysia";
import {cors} from "@elysiajs/cors";
import {
    runLoader,
    getMust,
    getFallback,
    getEnabled,
    getEnvironmentOverview,
} from "./config";
import {APP_NAME} from "./init/const";
import {prepare as prepareDatabase} from "./init/database";
import {adminRoomsRoutes} from "./routes/admin_rooms";
import {applicationsRoutes} from "./routes/applications";
import {roomsRoutes} from "./routes/rooms";

// Load config
runLoader();

// Initialize application
const base = new Elysia();
if (getEnabled("ENABLED_CORS")) {
    base.use(cors({origin: getMust("CORS_ORIGIN")}));
}

export const app = base
    .use(adminRoomsRoutes)
    .use(applicationsRoutes)
    .use(roomsRoutes)
    .get("/", ({set}) => {
        const redirectCode = getMust("INDEX_REDIRECT_TYPE") === "permanent" ?
            301 :
            302;
        const redirectUrl = getMust("INDEX_REDIRECT_URL");

        set.status = redirectCode;
        set.redirect = redirectUrl;
    })
    .get("/robots.txt", ({set}) => {
        set.headers["content-type"] = "text/plain";
        return "User-agent: *\nDisallow: /";
    });

// Start server
const start = async () => {
    try {
        // Initialize database
        await prepareDatabase();
        console.info("Database connected");

        const port = parseInt(getFallback("HTTP_PORT", "3000"));
        const hostname = getFallback("HTTP_HOSTNAME", "0.0.0.0");

        app.listen({port, hostname}, ({hostname: h, port: p}) => {
            const {node, runtime} = getEnvironmentOverview();
            console.info("====");
            console.info(
                `${APP_NAME} (environment: ${node}, ${runtime})`,
            );
            console.info(`Server is listening at http://${h}:${p}`);
            console.info("====");
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

if (import.meta.main) {
    start();
}
