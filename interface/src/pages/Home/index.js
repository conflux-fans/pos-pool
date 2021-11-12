import React, { useState, useEffect } from "react"
import { Table, Space } from "antd";
import { RightCircleOutlined } from "@ant-design/icons";
import BigNumber from "bignumber.js";
import {useHistory} from 'react-router-dom'

import { getCfxByVote,getApy,getFee } from "../../utils";
import { posPoolManagerContract } from "../../utils/cfx";
import {useConnect} from '../../hooks/usePortal'

function Home() {
  const [dataList,setDataList]=useState([])
  const history = useHistory()
  const {address:accountAddress,tryActivate}=useConnect()
  const gotoPoolPage=(record)=>{
    if(accountAddress){
      history.push(`/pool/${record?.address}`)
    }else{
      tryActivate()
    }
  }
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
      render: (text, record) => {
        console.info('record',record)
        return <Space size="middle">
        <RightCircleOutlined onClick={()=>gotoPoolPage(record)} style={{ fontSize: '28px', color: '#08c' }} />
      </Space>
      },
    },
  ];

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
      console.info('item',item)
      arr.push({
        key:item[0],
        address:item[0],
        totalAvailable:getCfxByVote(item[1]),
        name:item[2],
        apy:getApy(item[3])+'%',
        fee:getFee(item[4])+'%'
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
