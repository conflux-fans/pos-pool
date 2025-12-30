/* eslint-disable prettier/prettier */
const DingRobot = require('ding-robot');

async function dingAlert(message) {
  const token = process.env.DING_ROBOT_TOKEN;
  if (!token) {
    // throw new Error('DING_ROBOT_TOKEN is not set');
    console.warn('DING_ROBOT_TOKEN is not set');
    return;
  }
  const robot = new DingRobot(token);
  robot.text('PoSNode: ' + message);
}

module.exports = {
  dingAlert
}