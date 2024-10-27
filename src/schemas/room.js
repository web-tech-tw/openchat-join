"use strict";

const mongoose = require("mongoose");
const {Schema} = mongoose;

const schema = new Schema({
    slug: {
        type: String,
        required: true,
        unique: true,
    },
});

module.exports = schema;
