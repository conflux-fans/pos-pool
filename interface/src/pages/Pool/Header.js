import React, { useState, useEffect } from "react";
import { Card, Tag } from "antd";
import { useParams } from "react-router-dom";
import BigNumber from "bignumber.js";
import {
  CheckCircleOutlined,SyncOutlined,CloseCircleOutlined
} from '@ant-design/icons';

import { getPosPoolContract, Drip } from "../../utils/cfx";
import { getCfxByVote, getApy,getPrecisionAmount } from "../../utils";
import { StatusPosNode } from "../../constants";


function Header({ status }) {
  let { poolAddress } = useParams();
  const posPoolContract = getPosPoolContract(poolAddress);
  const [lockedCfx, setLockedCfx] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [apy, setApy] = useState(0);
  const [name,setName]=useState('loading...')

  const getStatusTag=(status)=>{
    let icon=null
    let color=''
    let text=''
    switch(status){
      case StatusPosNode.loading:
        icon=<SyncOutlined spin />
        color='default'
        text='Loading'
        break;
      case StatusPosNode.success:
        icon=<CheckCircleOutlined />
        color='success'
        text='Good'
        break;
      case StatusPosNode.error:
        icon=<CloseCircleOutlined />
        color='error'
        text='Error'
        break;  
      default:break  
    }
    return <Tag color={color} icon={icon}>{text}</Tag>
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const proArr = [];
        proArr.push(posPoolContract.poolSummary());
        proArr.push(posPoolContract.poolAPY());
        proArr.push(posPoolContract.poolName());
        const data = await Promise.all(proArr);
        const poolSummary = data[0];
        setLockedCfx(getCfxByVote(poolSummary[0]));
        setTotalRevenue(
          new Drip(
            new BigNumber(poolSummary[2]).minus(poolSummary[1]).toNumber()
          ).toCFX()
        );
        setApy(getApy(data[1]));
        setName(data[2])
      } catch (error) {}
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolAddress]);

  const cardStyle = {
    backgroundColor: "#4d5a7e",
    borderRadius: "10px",
    color: "#fff",
    fontWeight: "700",
  };
  const cardHeadStyle = { color: "#fff", opacity: "0.6" };
  return (
    <div className="flex">
      <div className="flex-1 pr-4 ">
        <Card
          title="Status"
          bordered={false}
          style={cardStyle}
          headStyle={cardHeadStyle}
        >
          {getStatusTag(status)}
        </Card>
      </div>
      <div className="flex-1 pr-4">
        <Card
          title="Pool Name"
          bordered={false}
          style={cardStyle}
          headStyle={cardHeadStyle}
        >
          <div>{name}</div>
        </Card>
      </div>
      <div className="flex-1 pr-4">
        <Card
          title="Total Locked(CFX)"
          bordered={false}
          style={cardStyle}
          headStyle={cardHeadStyle}
        >
          <div>{lockedCfx}</div>
        </Card>
      </div>
      <div className="flex-1 pr-4">
        <Card title="Total Revenue" bordered={false} style={cardStyle} headStyle={cardHeadStyle}>
          <div>{getPrecisionAmount(totalRevenue,5)}</div>
        </Card>
      </div>
      <div className="flex-1">
        <Card title="APY" bordered={false} style={cardStyle} headStyle={cardHeadStyle}>
          <div>{apy + "%"}</div>
        </Card>
      </div>
    </div>
  );
}
export default Header;
