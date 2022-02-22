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
import {useTranslation} from 'react-i18next'


function Header({ status }) {
  const {t} = useTranslation()

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
        text=t("Home.status_loading")
        break;
      case StatusPosNode.success:
        icon=<CheckCircleOutlined />
        color='success'
        text=t("Home.status_good")
        break;
      case StatusPosNode.error:
        icon=<CloseCircleOutlined />
        color='error'
        text=t("Home.status_error")
        break;  
      case StatusPosNode.warning:
        icon=<></>
        color='warning'
        text=t("Home.status_warning")
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
          title={t("Home.status")}
          bordered={false}
          style={cardStyle}
          headStyle={cardHeadStyle}
        >
          {getStatusTag(status)}
        </Card>
      </div>
      <div className="flex-1 pr-4">
        <Card
          title={t("Home.pool")}
          bordered={false}
          style={cardStyle}
          headStyle={cardHeadStyle}
        >
          <div>{name}</div>
        </Card>
      </div>
      <div className="flex-1 pr-4">
        <Card
          title={t("Home.total_locked")}
          bordered={false}
          style={cardStyle}
          headStyle={cardHeadStyle}
        >
          <div>{lockedCfx}</div>
        </Card>
      </div>
      <div className="flex-1 pr-4">
        <Card title={t("Home.total_revenue")} bordered={false} style={cardStyle} headStyle={cardHeadStyle}>
          <div>{getPrecisionAmount(totalRevenue,5)}</div>
        </Card>
      </div>
      <div className="flex-1">
        <Card title={t("Home.apy")} bordered={false} style={cardStyle} headStyle={cardHeadStyle}>
          <div>{apy + "%"}</div>
        </Card>
      </div>
    </div>
  );
}
export default Header;
