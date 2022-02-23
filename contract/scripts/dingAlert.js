/* eslint-disable no-unused-vars */
/* eslint-disable prettier/prettier */
require('dotenv').config();
const DingRobot = require('ding-robot');

async function dingAlert(message) {
  const token = process.env.DING_ROBOT_TOKEN;
  if (!token) {
    throw new Error('DING_ROBOT_TOKEN is not set');
  }
  const robot = new DingRobot(token);
  robot.text('PoSNode: ' + message);
}

exports.dingAlert = dingAlert;