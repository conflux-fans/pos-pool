import React, { useState, useEffect } from "react";
import { Table, Space, Tag, } from "antd";
import { RightCircleOutlined } from "@ant-design/icons";
import { useHistory } from "react-router-dom";
import { useTranslation } from 'react-i18next';

import { getCfxByVote, getApy, getFee } from "../../utils";
import {
  posPoolManagerContract,
  getPosAccountByPowAddress,
} from "../../utils/cfx";
import {connect as tryActivate, useAccount} from '@cfxjs/use-wallet';
import {StatusPosNode} from '../../constants'

function Home() {
  const { t } = useTranslation();

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
      title: t("Home.status"),
      key: "status",
      dataIndex: "status",
      width:100,
      render: (status) => (
        <>
          {
            status==="success"&&<Tag color="green">{t("Home.status_good")}</Tag>
          }
          {
            status==="error"&&<Tag color="error">{t("Home.status_error")}</Tag>
          }
          {
            status==="warning"&&<Tag color="warning">{t("Home.status_warning")}</Tag>
          }
        </>
      ),
    },
    {
      title: t("Home.pool"),
      dataIndex: "name",
      key: "name",
      width:200
    },
    {
      title: t("Home.total_locked"),
      dataIndex: "totalAvailable",
      key: "totalAvailable",
      width:200
    },
    {
      title: t("Home.apy"),
      dataIndex: "apy",
      key: "apy",
      width:100,
    },
    {
      title: t("Home.performance_fee"),
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
        const options = {};
        if (accountAddress) {
          options.from = accountAddress;
        }
        const list = await posPoolManagerContract.getPools().call(options);
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
          status: proRes[index]?.status?.forceRetired == null? StatusPosNode.success
          : StatusPosNode.error,
        });
      });
    } catch (error) {
      list.forEach((item, index) => {
        arr.push({
          key: item[3],
          address: item[3],
          totalAvailable: getCfxByVote(item[2]),
          name: item[4],
          apy: getApy(item[0]) + "%",
          fee: getFee(item[1]) + "%",
          status: "warning",
        });
      });
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
