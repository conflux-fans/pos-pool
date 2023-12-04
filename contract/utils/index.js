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

// proxy1967 initialize(no params) method data
const InitializeMethodData = '0x8129fc1c';


module.exports = {
  loadPrivateKey,
  InitializeMethodData,
};
