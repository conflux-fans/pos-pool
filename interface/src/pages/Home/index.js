import React, { useState, useEffect } from "react";
import { Table, Space, Tag, } from "antd";
import { RightCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { format } from 'js-conflux-sdk';
import { getCfxByVote, getApy, getFee } from "../../utils";
import {
  getPosAccountByPowAddress,
  posPoolManagerContract,
} from "../../utils/cfx";
// import {useAccount} from '../../hooks/useWallet';
import {StatusPosNode} from '../../constants'

function Home() {
  const { t } = useTranslation();
  const [dataList, setDataList] = useState([])
  const [loading,setLoading]=useState(false)
  const navigate = useNavigate()
  // const accountAddress = useAccount()
  const gotoPoolPage = ({
    address,
    space,
    coreAddress
  }) => {
    if (address && space) {
      navigate(`/pool/${space}/${address}${space === 'e-space' ? `?coreAddress=${coreAddress}` : ''}`);
    }
  };
  const [columns,setColumns] = useState([
    {
      title: t("Home.status"),
      key: "status",
      dataIndex: "status",
      width:80,
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
      width:100
    },
    {
      title: t("Home.total_locked"),
      dataIndex: "totalAvailable",
      key: "totalAvailable",
      width:150
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
      title: "Core",
      key: "action1",
      width: 45,
      render: (text, record) => {
        return (
          <Space size="middle">
              <RightCircleOutlined
                onClick={() => gotoPoolPage({ address: record.coreAddress, space: 'core' })}
                style={{ fontSize: "28px", color: "#08c" }}
              />
          </Space>
        );
      },
      fixed: 'right'
    },
    {
      title: "eSpace",
      key: "action2",
      width:60,
      render: (text, record) => {
        if (!record.eSpaceAddress) return null;
        return (
          <Space size="middle">
              <RightCircleOutlined
                onClick={() => gotoPoolPage({ address: record.eSpaceAddress, space: 'e-space', coreAddress: record.coreAddress })}
                style={{ fontSize: "28px", color: "#08c" }}
              />
          </Space>
        );
      },
      fixed: 'right'
    },
  ])
  useEffect(() => {
    async function getData() {
      setLoading(true)
      try {
        // const options = {};
        // if (accountAddress) {
        //   options.from = accountAddress;
        // }
        // const list = await posPoolManagerContract.getPools().call(options)

        const list = await posPoolManagerContract.getPools()
        const eSpaceAddresses = await Promise.allSettled(list.map(async pool => await posPoolManagerContract.eSpacePoolAddresses(pool[3])));
        const data = await transferData(list, eSpaceAddresses);
        const hasAnyeSpaceAddresses = data.some(item=>item.eSpaceAddress);
        if(!hasAnyeSpaceAddresses){
            setColumns(columns => columns.filter(column=>column.title!=="eSpace"))
        }
        setDataList(data);
        setLoading(false)
      } catch (error) {
        console.log('error', error);
        setDataList([]);
        setLoading(false)
      }
    }
    getData();
  }, []);

  const transferData = async (list, eSpaceAddresses) => {
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
          coreAddress: item[3],
          eSpaceAddress: eSpaceAddresses?.[index]?.value && format.hexAddress(eSpaceAddresses?.[index]?.value) !== '0x0000000000000000000000000000000000000000' ? eSpaceAddresses?.[index]?.value : undefined,
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
          coreAddress: item[3],
          eSpaceAddress: eSpaceAddresses?.[index]?.value && format.hexAddress(eSpaceAddresses?.[index]?.value) !== '0x0000000000000000000000000000000000000000' ? eSpaceAddresses?.[index]?.value : undefined,
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
      <Table columns={columns} dataSource={dataList} pagination={false} size='middle' loading={loading} scroll={{ x: 800 }}/>
    </div>
  );
}

export default Home;
