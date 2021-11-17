const { conflux } = require("./conflux");

let address =
  "NET8888:TYPE.CONTRACT:ACCHHA25SM4P7C0WXC778MMBTVNE99X53PXFWE26UN";
address = "NET8888:TYPE.CONTRACT:ACFANGB2WPPT9YB1U4F4272BYZF6NUWJ3PFJ9MTFGZ";

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
