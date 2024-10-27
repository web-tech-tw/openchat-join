"use strict";

const mongoose = require("mongoose");

const {Schema} = mongoose;
const {ObjectId} = Schema.Types;

const IPGeolocation = require("./ip_geolocation");

const schema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
    },
    zebraCode: {
        type: String,
        required: true,
    },
    roomSlug: {
        type: String,
        required: true,
    },
    userAgent: {
        type: String,
        required: true,
    },
    ipAddress: {
        type: String,
        required: true,
    },
    ipGeolocation: {
        type: IPGeolocation,
        required: true,
    },
    commitBy: {
        type: ObjectId,
        required: false,
    },
    commitAt: {
        type: Date,
        required: false,
    },
    commitState: {
        type: Boolean,
        required: false,
    },
}, {
    timestamps: true,
});

module.exports = schema;
