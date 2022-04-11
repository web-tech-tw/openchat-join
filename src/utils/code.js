function generateCode(ctx, util, code_data) {
    const datetime = new Date();
    const date_string = datetime.toLocaleDateString();
    return util.hash(ctx, `${date_string}_${code_data}`, 6);
}

module.exports = {generateCode}
