const hashMix = "";
const adminPass = "";

function genCode() {
  let result = "";
  const charset = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < 32; ++i) {
    result += charset.charAt(
      Math.floor(Math.random() * charset.length)
    );
  }
  return result;
}

function hash(data) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, data, Utilities.Charset.UTF_8));
}

function response(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  const code = genCode();
  const secret = hash([code, hashMix].join("."));
  return response({ code, secret });
}

function doPost(e) {
  if (e.parameter.pass !== adminPass) {
    return response(false);
  }
  if (!e.parameter.code) {
    return response(null);
  }
  const code = e.parameter.code;
  const secret = hash([code, hashMix].join("."));
  return response({ secret });
}
