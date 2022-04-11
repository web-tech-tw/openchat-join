function generateCode(ctx, util, code_data, prefix = 0) {
    const datetime = new Date();
    const date_string = `${datetime.getMonth()}_${datetime.getDate() + prefix}`;
    return util.hash(ctx, `${date_string}_${code_data}`, 6);
}

module.exports = {generateCode}
