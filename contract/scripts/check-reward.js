const { conflux } = require("./conflux");

let address = "";

if (process.argv.length > 2) {
  address = process.argv[2];
}

async function main() {
  const status = await conflux.pos.getStatus();
  console.log("Latest PoS Status: ", status);

  for (let i = status.epoch; i >= 0; i--) {
    const reward = await conflux.pos.getRewardsByEpoch(i);
    if (!reward) continue;
    for (const item of reward.accountRewards) {
      if (item.powAddress === address) {
        console.log(`Epoch ${i}: `, item);
      }
    }
  }
}

main().catch(console.log);
