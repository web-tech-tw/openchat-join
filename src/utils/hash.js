const {sha256} = require('js-sha256');

function hash(ctx, data, sub = 0) {
    const metadata = `${ctx.hash_secret}_${data}`;
    const hash_hex = sha256(metadata);
    return sub ? hash_hex.substring(0, sub) : hash_hex;
}

module.exports = hash;
