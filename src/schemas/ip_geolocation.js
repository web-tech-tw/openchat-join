"use strict";

const mongoose = require("mongoose");
const {Schema} = mongoose;

const schema = new Schema({
    range: {
        type: [Number],
        required: false,
    },
    country: {
        type: String,
        required: false,
    },
    region: {
        type: String,
        required: false,
    },
    city: {
        type: String,
        required: false,
    },
    ll: {
        type: [Number],
        required: false,
    },
    metro: {
        type: Number,
        required: false,
    },
    area: {
        type: Number,
        required: false,
    },
    eu: {
        type: String,
        required: false,
    },
    timezone: {
        type: String,
        required: false,
    },
}, {
    _id: false,
});

module.exports = schema;
