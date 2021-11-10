import React, { useState, useEffect } from "react"
import { Table, Space } from "antd";
import { RightCircleOutlined } from "@ant-design/icons";
import BigNumber from "bignumber.js";

import { posPoolManagerContract } from "../../utils/cfx";
import { CFX_BASE_PER_VOTE } from "../../constants";

function Home() {
  const [dataList,setDataList]=useState([])
  const columns = [
    {
      title: "Pool",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Total Locked(CFX)",
      dataIndex: "totalAvailable",
      key: "totalAvailable",
    },
    {
      title: "APY",
      dataIndex: "apy",
      key: "apy",
    },
    {
      title: "Performance Fee",
      dataIndex: "fee",
      key: "fee",
    },
    // {
    //   title: "Tags",
    //   key: "tags",
    //   dataIndex: "tags",
    //   render: (tags) => (
    //     <>
    //       {tags.map((tag) => {
    //         let color = tag.length > 5 ? "geekblue" : "green";
    //         if (tag === "loser") {
    //           color = "volcano";
    //         }
    //         return (
    //           <Tag color={color} key={tag}>
    //             {tag.toUpperCase()}
    //           </Tag>
    //         );
    //       })}
    //     </>
    //   ),
    // },
    {
      title: "",
      key: "action",
      render: (text, record) => (
        <Space size="middle">
          <RightCircleOutlined onClick={goDetails} style={{ fontSize: '28px', color: '#08c' }} />
        </Space>
      ),
    },
  ];

  const goDetails = () => {};

  useEffect(()=>{
    posPoolManagerContract.getPools().then(list=>{
      setDataList(transferData(list))
    }).catch(()=>{
      setDataList([])
    })
  },[])

  const transferData=(list)=>{
    const arr=[]
    list.forEach(item => {
      arr.push({
        key:item[0],
        address:item[0],
        totalAvailable:new BigNumber(item[1]).multipliedBy(CFX_BASE_PER_VOTE).toString(10),
        name:item[2],
        apy:new BigNumber(item[3]).dividedBy(100).toString(10)+'%',
        fee:new BigNumber(100).minus(new BigNumber(item[4]).dividedBy(100).toString(10))+'%'
      })
    });
    return arr
  }
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Table columns={columns} dataSource={dataList} pagination={false} />
    </div>
  );
}

export default Home;
