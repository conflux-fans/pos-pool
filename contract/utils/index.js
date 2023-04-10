const { sign, format } = require("js-conflux-sdk");

function loadPrivateKey() {
  if (process.env.PRIVATE_KEY) {
    return process.env.PRIVATE_KEY;
  } else {
    const keystore = require(process.env.KEYSTORE);
    const privateKeyBuf = sign.decrypt(keystore, process.env.KEYSTORE_PWD);
    return format.hex(privateKeyBuf);
  }
}

module.exports = {
  loadPrivateKey,
};
