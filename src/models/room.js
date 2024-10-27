"use strict";

const {useDatabase} = require("../init/database");
const database = useDatabase();

const schema = require("../schemas/room");
module.exports = database.model("Room", schema);
