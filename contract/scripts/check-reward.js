const { conflux } = require("./conflux");

const address =
  "NET8888:TYPE.CONTRACT:ACCHHA25SM4P7C0WXC778MMBTVNE99X53PXFWE26UN";

async function main() {
  const status = await conflux.pos.getStatus();
  console.log("PoS status: ", status);

  for (let i = status.epoch; i >= 0; i--) {
    const reward = await conflux.pos.getRewardsByEpoch(i);
    if (!reward) continue;
    for (const item of reward.accountRewards) {
      if (item.powAddress === address) {
        console.log(item);
      }
    }
  }
}

main().catch(console.log);
