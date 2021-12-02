// This is a monitor script used to check whether a PoS node is forceRetired.
// If the node is forceRetired, this script will push Dingding message to notify the Manager.
const {conflux, Drip, account} = require("./conflux");