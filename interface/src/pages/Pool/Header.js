import React, { useState, useEffect } from "react";
import { Card, Tag } from "antd";
import { useParams } from "react-router-dom";
import BigNumber from "bignumber.js";

import { getPosPoolContract, Drip } from "../../utils/cfx";
import { getCfxByVote, getApy } from "../../utils";

function Header() {
  let { poolAddress } = useParams();
  const posPoolContract = getPosPoolContract(poolAddress);
  const [lockedCfx, setLockedCfx] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [apy, setApy] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const proArr = [];
        proArr.push(posPoolContract.poolSummary());
        // TODO: proArr.push(posPoolContract.poolAPY());
        proArr.push(Promise.resolve(1000));
        const data = await Promise.all(proArr);
        const poolSummary = data[0];
        setLockedCfx(getCfxByVote(poolSummary[0]));
        setTotalRevenue(
          new Drip(
            new BigNumber(poolSummary[2]).minus(poolSummary[1]).toNumber()
          ).toCFX()
        );
        setApy(getApy(data[1]));
      } catch (error) {}
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolAddress]);

  return (
    <div className="flex">
      <div className="flex-1 pr-4">
        <Card title="Status">
          <Tag color={"green"}>good</Tag>
        </Card>
      </div>
      <div className="flex-1 pr-4">
        <Card title="Total Locked(CFX)">
          <div>{lockedCfx}</div>
        </Card>
      </div>
      <div className="flex-1 pr-4">
        <Card title="Total Revenue">
          <div>{totalRevenue}</div>
        </Card>
      </div>
      <div className="flex-1">
        <Card title="APY">
          <div>{apy + "%"}</div>
        </Card>
      </div>
    </div>
  );
}
export default Header;
