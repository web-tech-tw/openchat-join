import {Elysia, t} from "elysia";
import {authPlugin, accessGuard} from "../plugins/auth";
import {getMust} from "../config";

import * as utilVisitor from "../utils/visitor";
import * as utilCode from "../utils/code";
import * as utilTurnstile from "../utils/turnstile";
import * as utilFingerprint from "../utils/fingerprint";

import Application from "../models/application";
import Room from "../models/room";

import ipGeoQuery from "geoip-lite";

/**
 * Build the room slug to label mapper.
 * @param {Array<object>} applications The applications.
 * @return {Promise<function(string): string>} The mapper function.
 */
async function useRoomLabelMapper(applications: any[]) {
    const roomSlugs = [...new Set(
        applications.map((a) => a.roomSlug).filter(Boolean),
    )];
    const rooms = await Room.
        find({slug: {$in: roomSlugs}}).
        exec();
    const labelMap = new Map(rooms.map((room) => [room.slug, room.label]));
    return (slug: string) => labelMap.get(slug) ?? "Unknown";
}

/**
 * Build the commit state filter from the state query.
 * @param {string|undefined} state The state query.
 * @return {object} The mongoose filter of commitState.
 */
function useStateFilter(state: string | undefined) {
    if (state === "approved") {
        return {commitState: true};
    }
    if (state === "rejected") {
        return {commitState: false};
    }
    if (state === "pending") {
        return {commitState: null};
    }
    return {};
}

/**
 * Compute the subnet of an IP address,
 * the last part is dropped for IPv4, and
 * the last 4 groups are dropped for IPv6.
 * @param {string} ipAddress The IP address.
 * @return {string} The subnet.
 */
function getSubnet(ipAddress: string): string {
    if (/^[0-9.]+$/.test(ipAddress)) {
        return ipAddress.split(".").slice(0, 3).join(".");
    }
    if (/^[0-9a-fA-F:]+$/.test(ipAddress)) {
        return ipAddress.split(":").slice(0, 4).join(":");
    }
    return ipAddress;
}

/**
 * Fetch the application overview stats.
 * @return {Promise<object>} The stats.
 */
async function fetchStats() {
    const [total, pending, approved, rejected] = await Promise.all([
        Application.countDocuments({}).exec(),
        Application.countDocuments({commitState: null}).exec(),
        Application.countDocuments({commitState: true}).exec(),
        Application.countDocuments({commitState: false}).exec(),
    ]);
    return {total, pending, approved, rejected};
}

/**
 * Application management routes
 */
export const applicationsRoutes = new Elysia({prefix: "/applications"})
    .use(authPlugin)
    /**
     * Get an application by code (openchat only)
     */
    .get("/", async ({query, status}: any) => {
        // Extract query
        const {
            code,
        } = query;

        // Find application
        const application = await Application.findOne({code}).exec();
        if (!application) {
            return status(404);
        }

        // Prepare data
        const appData = {
            ...application.toObject(),
            roomLabel: null as string | null,
        };

        // Fetch room label
        const {roomSlug} = application;
        const room = await Room.findOne({slug: roomSlug}).exec();
        appData.roomLabel = room?.label ?? "Unknown";

        // Send response
        return appData;
    }, {
        ...accessGuard("openchat"),
        query: t.Object({
            code: t.String({minLength: 1}),
        }),
    })
    /**
     * List applications (openchat only)
     */
    .get("/list", async ({query, status}: any) => {
        // Extract query
        const {
            room,
            state,
            cursor,
        } = query;
        const limit = Number(query.limit) || 100;

        // Build filter
        const filter: any = {
            ...useStateFilter(state),
        };
        if (room) {
            filter.roomSlug = room;
        }

        // The cursor only narrows the page position,
        // the total counts the whole filtered set
        const pageFilter: any = {
            ...filter,
        };

        // Decode the cursor (base64url of {t: createdAt, i: _id})
        if (cursor) {
            try {
                const decoded = JSON.
                    parse(Buffer.from(cursor, "base64url").toString("utf8"));
                const cursorTime = new Date(decoded.t);
                const cursorId = String(decoded.i || "");
                if (isNaN(cursorTime.getTime()) || !cursorId) {
                    throw new Error("invalid cursor");
                }
                pageFilter.$or = [
                    {createdAt: {$lt: cursorTime}},
                    {createdAt: {$eq: cursorTime}, _id: {$lt: cursorId}},
                ];
            } catch {
                return status(400);
            }
        }

        // Fetch one extra item to detect the next page
        const [total, fetched, stats] = await Promise.all([
            Application.countDocuments(filter).exec(),
            Application.
                find(pageFilter).
                sort({createdAt: -1, _id: -1}).
                limit(limit + 1).
                exec(),
            fetchStats(),
        ]);

        // Slice the page and build the next cursor
        const hasMore = fetched.length > limit;
        const applications = hasMore ? fetched.slice(0, limit) : fetched;
        let nextCursor: string | null = null;
        if (hasMore) {
            const last = applications[applications.length - 1];
            nextCursor = Buffer.
                from(JSON.stringify({t: last.createdAt, i: last.id})).
                toString("base64url");
        }

        // Prepare data
        const roomLabelMapper = await useRoomLabelMapper(applications);
        const items = applications.map((application: any) => {
            const {userAgent} = application;
            return {
                ...application.toObject(),
                device: utilFingerprint.parseUserAgent(userAgent),
                roomLabel: roomLabelMapper(application.roomSlug),
            };
        });

        // Send response
        return {
            total,
            stats,
            limit,
            hasMore,
            nextCursor,
            applications: items,
        };
    }, {
        ...accessGuard("openchat"),
        query: t.Object({
            room: t.Optional(t.String({minLength: 1})),
            state: t.Optional(t.Union([
                t.Literal("pending"),
                t.Literal("approved"),
                t.Literal("rejected"),
            ])),
            limit: t.Optional(t.Numeric({minimum: 1, maximum: 200})),
            cursor: t.Optional(t.String({minLength: 1})),
        }),
    })
    /**
     * Get the application relation graph (openchat only)
     */
    .get("/graph", async ({query}: any) => {
        // Extract query
        const {
            room,
            state,
        } = query;
        const limit = Number(query.limit) || 500;

        // Build filter
        const filter: any = {
            ...useStateFilter(state),
        };
        if (room) {
            filter.roomSlug = room;
        }

        // Fetch applications
        const applications = await Application.
            find(filter).
            sort({createdAt: -1}).
            limit(limit).
            exec();

        // Group the indexes by each relation dimension
        const groups = {
            zebra: new Map<string, number[]>(),
            ip: new Map<string, number[]>(),
            subnet: new Map<string, number[]>(),
            device: new Map<string, number[]>(),
        };
        const parsedDevices = applications.map((application, index) => {
            const {zebraCode, ipAddress, userAgent} = application;
            const device = utilFingerprint.getDeviceFingerprint(userAgent);
            const groupEntries = [
                [groups.zebra, zebraCode],
                [groups.ip, ipAddress],
                [groups.subnet, getSubnet(ipAddress)],
                [groups.device, device],
            ];
            for (const [groupMap, value] of groupEntries as any[]) {
                if (!value) {
                    continue;
                }
                if (!groupMap.has(value)) {
                    groupMap.set(value, []);
                }
                groupMap.get(value).push(index);
            }
            return device;
        });

        // Aggregate the pair edges from each identity dimension,
        // the device fingerprint never creates an edge by itself,
        // because the coarse device family is easy to collide.
        const relationWeights: Record<string, number> = {
            zebra: 3,
            ip: 2,
            subnet: 1,
        };
        const edgeMap = new Map<string, any>();
        const addEdge = (
            source: number,
            target: number,
            relation: string,
            weight: number,
        ) => {
            const pairKey = `${source}-${target}`;
            if (!edgeMap.has(pairKey)) {
                edgeMap.set(pairKey, {
                    source,
                    target,
                    relations: [] as string[],
                    weight: 0,
                });
            }
            const edge = edgeMap.get(pairKey);
            edge.relations.push(relation);
            edge.weight += weight;
        };
        for (const [relation, groupMap] of Object.entries(groups)) {
            if (relation === "device") {
                continue;
            }
            const weight = relationWeights[relation];
            for (const indexes of groupMap.values()) {
                if (indexes.length < 2) {
                    continue;
                }
                for (let i = 0; i < indexes.length; i++) {
                    for (let j = i + 1; j < indexes.length; j++) {
                        addEdge(indexes[i], indexes[j], relation, weight);
                    }
                }
            }
        }

        // Reinforce the pairs which already share a zebra or an ip,
        // the same device family only counts as supporting evidence
        for (const edge of edgeMap.values()) {
            const sharesIdentity = edge.relations.includes("zebra") ||
                edge.relations.includes("ip");
            if (!sharesIdentity) {
                continue;
            }
            if (parsedDevices[edge.source] === parsedDevices[edge.target]) {
                edge.relations.push("device");
                edge.weight += 1;
            }
        }
        const edges = [...edgeMap.values()];

        // Union-find the clusters over edges
        const nodeCount = applications.length;
        const clusterRoots = Array.from({length: nodeCount}, (_, i) => i);
        const findRoot = (index: number): number => {
            let root = index;
            while (clusterRoots[root] !== root) {
                root = clusterRoots[root];
            }
            return root;
        };
        for (const edge of edges) {
            const sourceRoot = findRoot(edge.source);
            const targetRoot = findRoot(edge.target);
            if (sourceRoot !== targetRoot) {
                clusterRoots[targetRoot] = sourceRoot;
            }
        }

        // Aggregate the incident weight of each node
        const linkWeights = Array.from({length: nodeCount}, () => 0);
        for (const edge of edges) {
            linkWeights[edge.source] += edge.weight;
            linkWeights[edge.target] += edge.weight;
        }

        // Prepare cluster information
        const clusterInfos = new Map<number, any>();
        for (let index = 0; index < nodeCount; index++) {
            const root = findRoot(index);
            if (!clusterInfos.has(root)) {
                clusterInfos.set(root, {
                    indexes: [] as number[],
                    rooms: new Set<string>(),
                    timestamps: [] as Date[],
                });
            }
            const clusterInfo = clusterInfos.get(root);
            clusterInfo.indexes.push(index);
            clusterInfo.rooms.add(applications[index].roomSlug);
            clusterInfo.timestamps.push(applications[index].createdAt);
            clusterInfo.weight = (clusterInfo.weight || 0) +
                linkWeights[index];
        }

        // Prepare data
        const roomLabelMapper = await useRoomLabelMapper(applications);
        const clusterList = [...clusterInfos.entries()];

        // Prepare the risk level of each cluster
        const clusterRiskLevels = new Map(clusterList.map(([root, info]) => {
            const size = info.indexes.length;
            const multiRoom = info.rooms.size > 1;
            const spread = Math.max(...info.timestamps.map(
                (time: Date) => time.getTime(),
            )) - Math.min(...info.timestamps.map(
                (time: Date) => time.getTime(),
            ));
            const burst = size >= 3 && spread <= 10 * 60 * 1000;
            const riskScore = info.weight || 0;
            const riskLevel = (
                size >= 5 ||
                (multiRoom && riskScore >= 6) ||
                burst
            ) ? "high" : (size >= 2 ? "medium" : "low");
            return [root, {riskLevel, multiRoom, burst}];
        }));

        // Prepare the node data
        const nodes = applications.map((application, index) => {
            const root = findRoot(index);
            const clusterInfo = clusterInfos.get(root);
            const {riskLevel, multiRoom, burst} =
                clusterRiskLevels.get(root)!;
            return {
                code: application.code,
                roomSlug: application.roomSlug,
                roomLabel: roomLabelMapper(application.roomSlug),
                zebraCode: application.zebraCode,
                ipAddress: application.ipAddress,
                ipGeolocation: application.ipGeolocation,
                device: parsedDevices[index],
                createdAt: application.createdAt,
                commitState: application.commitState,
                commitAt: application.commitAt,
                commitBy: application.commitBy,
                clusterId: root,
                clusterSize: clusterInfo.indexes.length,
                clusterMultiRoom: multiRoom,
                clusterBurst: burst,
                riskScore: linkWeights[index],
                riskLevel,
            };
        });

        // Prepare the cluster data
        const clusters = clusterList.
            filter(([, info]) => info.indexes.length > 1).
            map(([root, info]) => {
                const {riskLevel, multiRoom, burst} =
                    clusterRiskLevels.get(root)!;
                return {
                    id: root,
                    size: info.indexes.length,
                    rooms: [...info.rooms],
                    codes: info.indexes.map(
                        (index: number) => applications[index].code,
                    ),
                    riskLevel,
                    flags: [
                        ...(multiRoom ? ["multiRoom"] : []),
                        ...(burst ? ["burst"] : []),
                    ],
                };
            });

        // Send response
        return {
            nodes,
            edges: edges.map((edge) => ({
                ...edge,
                source: nodes[edge.source].code,
                target: nodes[edge.target].code,
            })),
            clusters,
            stats: {
                ...await fetchStats(),
                graphNodes: nodeCount,
                graphEdges: edges.length,
                graphClusters: clusters.length,
                highRisk: clusters.filter((c) => c.riskLevel === "high").length,
            },
        };
    }, {
        ...accessGuard("openchat"),
        query: t.Object({
            room: t.Optional(t.String({minLength: 1})),
            state: t.Optional(t.Union([
                t.Literal("pending"),
                t.Literal("approved"),
                t.Literal("rejected"),
            ])),
            limit: t.Optional(t.Numeric({minimum: 1, maximum: 2000})),
        }),
    })
    /**
     * Create an application (public, with Turnstile)
     */
    .post("/", async ({body, headers, request, server, set, status}: any) => {
        // Extract request body
        const {
            slug: roomSlug,
            captcha: turnstileToken,
        } = body;

        // Extract request header
        const zebraCode = headers["x-zebra-code"];

        // Check room exists
        if (!await Room.findOne({slug: roomSlug}).exec()) {
            return status(404);
        }

        // Fetch visitor information
        const userAgent = utilVisitor.getUserAgent(request.headers);
        const ipAddress = utilVisitor.getIPAddress(request, server);
        const ipGeolocation = ipGeoQuery.lookup(ipAddress);

        // Validate CloudFlare Turnstile
        const turnstileSecret = getMust("TURNSTILE_SECRET_KEY");
        const turnstileResult = await utilTurnstile.validResponse({
            turnstileToken,
            turnstileSecret,
            ipAddress,
        });
        if (!turnstileResult.success) {
            return status(403);
        }

        // Generate code
        const data = [roomSlug, userAgent, ipAddress, zebraCode];
        const code = utilCode.generateCode(data.join("&"));

        // Check application is conflict or not
        if (await Application.findOne({code}).exec()) {
            // Send response
            set.status = 409;
            return {code};
        }

        // Create application
        const application = new Application({
            code, zebraCode, roomSlug, userAgent, ipAddress, ipGeolocation,
        });

        // Save application
        await application.save();

        // Send response
        set.status = 201;
        return {code};
    }, {
        body: t.Object({
            slug: t.String({minLength: 1}),
            captcha: t.String({minLength: 1}),
        }),
        headers: t.Object({
            "x-zebra-code": t.String({minLength: 1}),
        }),
    })
    /**
     * Approve or reject an application (openchat only)
     */
    .patch("/", async ({query, auth, status}: any) => {
        // Extract query
        const {
            code: applicationCode,
            state: applicationState,
        } = query;

        // Update application
        const application = await Application.
            findOne({code: applicationCode}).
            exec();
        if (!application) {
            return status(404);
        }

        // Check commit is conflict or not
        if (application.commitState) {
            return status(409);
        }

        // Fetch commit data
        const commitBy = auth.id;
        const commitAt = Date.now();
        const commitState = applicationState === "true";

        // Update application
        application.commitBy = commitBy;
        application.commitAt = new Date(commitAt);
        application.commitState = commitState;

        // Save application
        await application.save();

        // Send response
        return status(204);
    }, {
        ...accessGuard("openchat"),
        query: t.Object({
            code: t.String({minLength: 1}),
            state: t.Union([t.Literal("true"), t.Literal("false")]),
        }),
    });
