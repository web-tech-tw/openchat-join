"use strict";

const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

module.exports = new Schema({
    id: ObjectId,
    room_id: String,
    user_agent: String,
    ip_address: String,
    created_at: Number,
});