import React, { useState, useEffect } from "react";
import { Table, Space, Tag, } from "antd";
import { RightCircleOutlined } from "@ant-design/icons";
import { useHistory } from "react-router-dom";

import { getCfxByVote, getApy, getFee } from "../../utils";
import {
  posPoolManagerContract,
  getPosAccountByPowAddress,
} from "../../utils/cfx";
import {connect as tryActivate, useAccount} from '@cfxjs/use-wallet';

function Home() {
  const [dataList, setDataList] = useState([]);
  const [loading,setLoading]=useState(false)
  const history = useHistory();
  const accountAddress = useAccount();
  const gotoPoolPage = (record) => {
    if (accountAddress) {
      history.push(`/pool/${record?.address}`);
    } else {
      tryActivate();
    }
  };
  const columns = [
    {
      title: "Status",
      key: "status",
      dataIndex: "status",
      width:100,
      render: (status) => (
        <>
          {
            <Tag color={`${status ? "green" : "error"}`}>
              {status ? "Good" : "Error"}
            </Tag>
          }
        </>
      ),
    },
    {
      title: "Pool",
      dataIndex: "name",
      key: "name",
      width:200
    },
    {
      title: "Total Locked(CFX)",
      dataIndex: "totalAvailable",
      key: "totalAvailable",
      width:200
    },
    {
      title: "APY",
      dataIndex: "apy",
      key: "apy",
      width:100,
    },
    {
      title: "Performance Fee",
      dataIndex: "fee",
      key: "fee",
      width:150
    },
    {
      title: "",
      key: "action",
      width:60,
      render: (text, record) => {
        return (
          <Space size="middle">
            <RightCircleOutlined
              onClick={() => gotoPoolPage(record)}
              style={{ fontSize: "28px", color: "#08c" }}
            />
          </Space>
        );
      },
    },
  ];

  useEffect(() => {
    async function getData() {
      setLoading(true)
      try {
        const list = await posPoolManagerContract.getPools();
        const data = await transferData(list);
        setDataList(data);
        setLoading(false)
      } catch (error) {
        setDataList([]);
        setLoading(false)
      }
    }
    getData();
  }, []);

  const transferData = async (list) => {
    const arr = [];
    const proArr = [];
    list.forEach((item) => {
      const address = item[3];
      proArr.push(getPosAccountByPowAddress(address));
    });
    try {
      const proRes = await Promise.all(proArr);
    list.forEach((item, index) => {
      arr.push({
        key: item[3],
        address: item[3],
        totalAvailable: getCfxByVote(item[2]),
        name: item[4],
        apy: getApy(item[0]) + "%",
        fee: getFee(item[1]) + "%",
        status: proRes[index]?.status?.forceRetired == null,
      });
    });
    } catch (error) {
      console.info('error',error)
    }
    
    return arr;
  };
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Table columns={columns} dataSource={dataList} pagination={false} size='middle' loading={loading} />
    </div>
  );
}

export default Home;
