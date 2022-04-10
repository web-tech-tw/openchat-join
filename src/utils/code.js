function generateCode(ctx, util, room, prefix = 0) {
    const datetime = new Date();
    const date_string = `${datetime.getMonth()}_${datetime.getDate() + prefix}`;
    return util.hash(ctx, `${date_string}_${room._id}`, 4);
}

module.exports = {generateCode}
