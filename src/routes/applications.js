"use strict";

const {getMust} = require("../config");

// Import useApp, withAwait, express
const {useApp, withAwait, express} = require("../init/express");
const {StatusCodes} = require("http-status-codes");

const utilVisitor = require("../utils/visitor");
const utilCode = require("../utils/code");
const utilTurnstile = require("../utils/turnstile");
const utilFingerprint = require("../utils/fingerprint");

const Application = require("../models/application");
const Room = require("../models/room");

const middlewareAccess = require("../middleware/access");
const middlewareInspector = require("../middleware/inspector");
const middlewareValidator = require("express-validator");

const ipGeoQuery = require("geoip-lite");

// Create router
const {Router: newRouter} = express;
const router = newRouter();

router.use(express.urlencoded({extended: true}));

router.get(
    "/",
    middlewareAccess("openchat"),
    middlewareValidator.query("code").notEmpty(),
    middlewareInspector,
    withAwait(async (req, res) => {
        // Extract query
        const {
            code,
        } = req.query;

        // Find application
        const application = await Application.findOne({code}).exec();
        if (!application) {
            res.sendStatus(StatusCodes.NOT_FOUND);
            return;
        }

        // Prepare data
        const appData = {
            ...application.toObject(),
            roomLabel: null,
        };

        // Fetch room label
        const {roomSlug} = application;
        const room = await Room.findOne({slug: roomSlug}).exec();
        appData.roomLabel = room?.label ?? "Unknown";

        // Send response
        res.send(appData);
    }),
);

/**
 * Build the room slug to label mapper.
 * @param {Array<object>} applications the applications
 * @return {Promise<function(string): string>}
 */
async function useRoomLabelMapper(applications) {
    const roomSlugs = [...new Set(
        applications.map((a) => a.roomSlug).filter(Boolean),
    )];
    const rooms = await Room.
        find({slug: {$in: roomSlugs}}).
        exec();
    const labelMap = new Map(rooms.map((room) => [room.slug, room.label]));
    return (slug) => labelMap.get(slug) ?? "Unknown";
}

/**
 * Build the commit state filter from the state query.
 * @param {string|undefined} state the state query
 * @return {object} the mongoose filter of commitState
 */
function useStateFilter(state) {
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
 * @param {string} ipAddress the IP address
 * @return {string} the subnet
 */
function getSubnet(ipAddress) {
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
 * @return {Promise<object>} the stats
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

router.get(
    "/list",
    middlewareAccess("openchat"),
    middlewareValidator.query("room").optional({checkFalsy: true}).isString(),
    middlewareValidator.
        query("state").
        optional({checkFalsy: true}).
        isIn(["pending", "approved", "rejected"]),
    middlewareValidator.
        query("limit").
        optional({checkFalsy: true}).
        isInt({min: 1, max: 500}),
    middlewareValidator.
        query("offset").
        optional({checkFalsy: true}).
        isInt({min: 0}),
    middlewareInspector,
    withAwait(async (req, res) => {
        // Extract query
        const {
            room,
            state,
        } = req.query;
        const limit = Number(req.query.limit) || 100;
        const offset = Number(req.query.offset) || 0;

        // Build filter
        const filter = {
            ...useStateFilter(state),
        };
        if (room) {
            filter.roomSlug = room;
        }

        // Fetch applications
        const [total, applications, stats] = await Promise.all([
            Application.countDocuments(filter).exec(),
            Application.
                find(filter).
                sort({createdAt: -1}).
                skip(offset).
                limit(limit).
                exec(),
            fetchStats(),
        ]);

        // Prepare data
        const roomLabelMapper = await useRoomLabelMapper(applications);
        const items = applications.map((application) => {
            const {userAgent} = application;
            return {
                ...application.toObject(),
                device: utilFingerprint.parseUserAgent(userAgent),
                roomLabel: roomLabelMapper(application.roomSlug),
            };
        });

        // Send response
        res.send({
            total,
            stats,
            limit,
            offset,
            applications: items,
        });
    }),
);

router.get(
    "/graph",
    middlewareAccess("openchat"),
    middlewareValidator.query("room").optional({checkFalsy: true}).isString(),
    middlewareValidator.
        query("state").
        optional({checkFalsy: true}).
        isIn(["pending", "approved", "rejected"]),
    middlewareValidator.
        query("limit").
        optional({checkFalsy: true}).
        isInt({min: 1, max: 2000}),
    middlewareInspector,
    withAwait(async (req, res) => {
        // Extract query
        const {
            room,
            state,
        } = req.query;
        const limit = Number(req.query.limit) || 500;

        // Build filter
        const filter = {
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
            zebra: new Map(),
            ip: new Map(),
            subnet: new Map(),
            device: new Map(),
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
            for (const [groupMap, value] of groupEntries) {
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
        const relationWeights = {
            zebra: 3,
            ip: 2,
            subnet: 1,
        };
        const edgeMap = new Map();
        const addEdge = (source, target, relation, weight) => {
            const pairKey = `${source}-${target}`;
            if (!edgeMap.has(pairKey)) {
                edgeMap.set(pairKey, {
                    source,
                    target,
                    relations: [],
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
        const findRoot = (index) => {
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
        const clusterInfos = new Map();
        for (let index = 0; index < nodeCount; index++) {
            const root = findRoot(index);
            if (!clusterInfos.has(root)) {
                clusterInfos.set(root, {
                    indexes: [],
                    rooms: new Set(),
                    timestamps: [],
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
                (time) => time.getTime(),
            )) - Math.min(...info.timestamps.map(
                (time) => time.getTime(),
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
            const {riskLevel, multiRoom, burst} = clusterRiskLevels.get(root);
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
                const {riskLevel, multiRoom, burst} = clusterRiskLevels.
                    get(root);
                return {
                    id: root,
                    size: info.indexes.length,
                    rooms: [...info.rooms],
                    codes: info.indexes.map(
                        (index) => applications[index].code,
                    ),
                    riskLevel,
                    flags: [
                        ...(multiRoom ? ["multiRoom"] : []),
                        ...(burst ? ["burst"] : []),
                    ],
                };
            });

        // Send response
        res.send({
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
        });
    }),
);

router.post(
    "/",
    middlewareValidator.body("slug").notEmpty(),
    middlewareValidator.body("captcha").notEmpty(),
    middlewareValidator.header("x-zebra-code").notEmpty(),
    middlewareInspector,
    withAwait(async (req, res) => {
        // Extract request body
        const {
            slug: roomSlug,
            captcha: turnstileToken,
        } = req.body;

        // Extract request header
        const {
            "x-zebra-code": zebraCode,
        } = req.headers;

        // Check room exists
        if (!await Room.findOne({slug: roomSlug}).exec()) {
            res.sendStatus(StatusCodes.NOT_FOUND);
            return;
        }

        // Fetch visitor information
        const userAgent = utilVisitor.getUserAgent(req);
        const ipAddress = utilVisitor.getIPAddress(req);
        const ipGeolocation = ipGeoQuery.lookup(ipAddress);

        // Validate CloudFlare Turnstile
        const turnstileSecret = getMust("TURNSTILE_SECRET_KEY");
        const turnstileResult = await utilTurnstile.validResponse({
            turnstileToken,
            turnstileSecret,
            ipAddress,
        });
        if (!turnstileResult.success) {
            res.sendStatus(StatusCodes.FORBIDDEN);
            return;
        }

        // Generate code
        const data = [roomSlug, userAgent, ipAddress, zebraCode];
        const code = utilCode.generateCode(data.join("&"));

        // Check application is conflict or not
        if (await Application.findOne({code}).exec()) {
            // Send response
            res.
                status(StatusCodes.CONFLICT).
                send({code});
            return;
        }

        // Create application
        const application = new Application({
            code, zebraCode, roomSlug, userAgent, ipAddress, ipGeolocation,
        });

        // Save application
        await application.save();

        // Send response
        res.
            status(StatusCodes.CREATED).
            send({code});
    }),
);

router.patch(
    "/",
    middlewareAccess("openchat"),
    middlewareValidator.query("code").notEmpty(),
    middlewareValidator.query("state").isBoolean().notEmpty(),
    middlewareInspector,
    withAwait(async (req, res) => {
        // Extract query
        const {
            code: applicationCode,
            state: applicationState,
        } = req.query;

        // Update application
        const application = await Application.
            findOne({code: applicationCode}).exec();
        if (!application) {
            res.sendStatus(StatusCodes.NOT_FOUND);
            return;
        }

        // Check commit is conflict or not
        if (application.commitState) {
            res.sendStatus(StatusCodes.CONFLICT);
            return;
        }

        // Fetch commit data
        const commitBy = req.auth.id;
        const commitAt = Date.now();
        const commitState = applicationState === "true";

        // Update application
        application.commitBy = commitBy;
        application.commitAt = commitAt;
        application.commitState = commitState;

        // Save application
        await application.save();

        // Send response
        res.sendStatus(StatusCodes.NO_CONTENT);
    }),
);

// Export routes mapper (function)
module.exports = () => {
    // Use application
    const app = useApp();

    // Mount the router
    app.use("/applications", router);
};
