import React, { useState, useEffect } from "react";
import { Input, Button, Divider, Form, List, message, Col, Row,Spin } from "antd";
import { useParams } from "react-router-dom";
import BigNumber from "bignumber.js";
import { useConfluxPortal } from "@cfxjs/react-hooks";

import { getPosPoolContract, conflux, Drip,getPosAccountByPowAddress } from "../../utils/cfx";
import {
  getCfxByVote,
  calculateGasMargin,
  getFee,
  getDateByBlockInterval,
  getMax,
  getPrecisionAmount
} from "../../utils";
import { useConnect, useBalance } from "../../hooks/usePortal";
import { CFX_BASE_PER_VOTE,StatusPosNode } from "../../constants";
import Header from "./Header";
import ConfirmModal from "./ConfirmModal";
import TxModal from "./TxModal";

function Pool() {
  const { address: accountAddress } = useConnect();
  const [form] = Form.useForm();
  const balance = getPrecisionAmount(useBalance(accountAddress)||0,5);
  const cfxMaxCanStake = getMax(balance);
  const { confluxJS } = useConfluxPortal();
  let { poolAddress } = useParams();
  const posPoolContract = getPosPoolContract(poolAddress);
  const [status,setStatus]=useState(StatusPosNode.loading)
  const [stakedCfx, setStakedCfx] = useState(0);
  const [rewards, setRewards] = useState(0);
  const [fee, setFee] = useState(0);
  const [cfxCanUnstake, setCfxCanUnstate] = useState(0);
  const [cfxCanWithdraw, setCfxCanWithdraw] = useState(0);
  const [inputStakeCfx, setInputStakeCfx] = useState("");
  const [inputUnstakeCfx, setInputUnstakeCfx] = useState("");
  const [userSummary, setUserSummary] = useState([]);
  const [currentBlockNumber, setCurrentBlockNumber] = useState(0);
  const [lastDistributeTime, setLastDistributeTime] = useState("");
  const [unstakeList, setUnstakeList] = useState([]);
  const [stakeModalShown, setStakeModalShown] = useState(false);
  const [unstakeModalShown, setUnStakeModalShown] = useState(false);
  const [txModalShown, setTxModalShown] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [stakeInputStatus, setStakeInputStatus] = useState("error");
  const [stakeErrorText,setStakeErrorText]=useState('')
  const [unstakeInputStatus, setUnstakeInputStatus] = useState("error");
  const [unstakeErrorText,setUnstakeErrorText]=useState('')
  const [stakeBtnDisabled,setStakeBtnDisabled]=useState(true)
  const [unstakeBtnDisabled,setUnstakeBtnDisabled]=useState(true)
  const [isLoading,setIsLoading]=useState(false)
  
  useEffect(() => {
    async function fetchData() {
      const proArr = [];
      proArr.push(conflux.provider.call("cfx_getStatus"));
      proArr.push(conflux.provider.call("cfx_getPoSEconomics"));
      const data = await Promise.all(proArr);
      const currentBlock = new BigNumber(data[0]?.blockNumber || 0).toNumber();
      const lastDistribute = new BigNumber(
        data[1]?.lastDistributeBlock || 0
      ).toNumber();
      setCurrentBlockNumber(currentBlock);
      setLastDistributeTime(
        getDateByBlockInterval(lastDistribute, currentBlock).toLocaleString()
      );
    }
    fetchData();
  }, []);

  useEffect(()=>{
    if(status){
        if(stakeErrorText){
            setStakeBtnDisabled(true)
        }else{
            setStakeBtnDisabled(false)
        }
    }else{
        setStakeBtnDisabled(true)
    }
  },[stakeErrorText, status])

  useEffect(()=>{
    if(status){
        if(unstakeErrorText){
            setUnstakeBtnDisabled(true)
        }else{
            setUnstakeBtnDisabled(false)
        }
    }else{
        setUnstakeBtnDisabled(true)
    }
  },[unstakeErrorText, status])

  useEffect(()=>{
    async function fetchData(address){
        const posAccount=await getPosAccountByPowAddress(address)
        setStatus(posAccount.status?.forceRetired==null?StatusPosNode.success:StatusPosNode.error)
    }
    fetchData(poolAddress)
  },[poolAddress])

  useEffect(()=>{
    try {
        const stakeCfxNum=Number(inputStakeCfx)
        if(stakeCfxNum>=CFX_BASE_PER_VOTE&&stakeCfxNum<=cfxMaxCanStake&&(stakeCfxNum%CFX_BASE_PER_VOTE===0)){
            setStakeInputStatus('green')
            setStakeErrorText('')
        }else{
            setStakeInputStatus('error')
            setStakeErrorText('Wrong Amount')
        }
    } catch (error) {
        setStakeInputStatus('error')
        setStakeErrorText('Wrong Amount')
    }
  },[cfxMaxCanStake, inputStakeCfx])

  useEffect(()=>{
    try {
        const cfxNum=Number(inputUnstakeCfx)
        if(cfxNum>=CFX_BASE_PER_VOTE&&cfxNum<=cfxCanUnstake&&(cfxNum%CFX_BASE_PER_VOTE===0)){
            setUnstakeInputStatus('green')
            setUnstakeErrorText('')
        }else{
            setUnstakeInputStatus('error')
            setUnstakeErrorText('Wrong Amount')
        }
    } catch (error) {
        setUnstakeInputStatus('error')
        setUnstakeErrorText('Wrong Amount')
    }
  },[cfxCanUnstake, inputUnstakeCfx])

  function resetData(){
    setStakedCfx(0)
    setRewards(0)
    setCfxCanUnstate(0)
    setCfxCanWithdraw(0)
  }

  useEffect(() => {
    async function fetchData() {
        setIsLoading(true)  
      try {
        const proArr = [];
        proArr.push(posPoolContract.userSummary(accountAddress));
        proArr.push(posPoolContract.userInterest(accountAddress));
        proArr.push(posPoolContract.poolUserShareRatio());
        proArr.push(posPoolContract.userOutQueue(accountAddress));
        const data = await Promise.all(proArr);
        const userSum = data[0];
        setUserSummary(userSum);
        setStakedCfx(
          new BigNumber(userSum[1] || 0)
            .multipliedBy(CFX_BASE_PER_VOTE)
            .toString(10)
        );
        setCfxCanUnstate(getCfxByVote(userSum[2] || 0));
        setCfxCanWithdraw(getCfxByVote(userSum[3] || 0));
        setRewards(getPrecisionAmount(new Drip(new BigNumber(data[1]).toString(10)).toCFX(),5));
        setFee(getFee(data[2]));
        setUnstakeList(transferQueue(data[3]));
        setIsLoading(false)
      } catch (error) {
        setIsLoading(false)
      }
    }
    if (accountAddress) {
      fetchData();
    }else{
        resetData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountAddress,currentBlockNumber, balance]);

  const transferQueue = (queueList) => {
    if (queueList.length === 0) return [];
    const arr = [];
    queueList.forEach((item) => {
      const blockNumber = new BigNumber(item[1]).toNumber();
      if (blockNumber > currentBlockNumber) {
        arr.push({
          amount: getCfxByVote(item[0]),
          timeStr: getDateByBlockInterval(
            blockNumber,
            currentBlockNumber
          ).toLocaleString(),
        });
      }
    });
    return arr;
  };

  const onStakeChange = (e) => {
    setInputStakeCfx(e.target.value);
  };

  const onUnstakeChange = (e) => {
    setInputUnstakeCfx(e.target.value);
  };

  const submit = async (type) => {
    if (!accountAddress) {
      message.error("Please connect ConfluxPortal");
      return;
    }
    try {
      let data = "";
      let estimateData = {};
      let value = 0;
      switch (type) {
        case "stake":
          value = new BigNumber(inputStakeCfx).multipliedBy(10**18).toString(10);
          const stakeVote=new BigNumber(inputStakeCfx).dividedBy(CFX_BASE_PER_VOTE).toString(10)
          estimateData = await posPoolContract
            .increaseStake(stakeVote)
            .estimateGasAndCollateral({
              from: accountAddress,
              value,
            });
          data = posPoolContract.increaseStake(stakeVote).data;
          break;
        case "unstake":
          value = 0;
          const unstakeVote=new BigNumber(inputUnstakeCfx).dividedBy(CFX_BASE_PER_VOTE).toString(10)
          estimateData = await posPoolContract
            .decreaseStake(unstakeVote)
            .estimateGasAndCollateral({
              from: accountAddress,
            });
          data = posPoolContract.decreaseStake(unstakeVote).data;
          break;
        case "claim":
          value = 0;
          estimateData = await posPoolContract
            .claimAllInterest()
            .estimateGasAndCollateral({
              from: accountAddress,
            });
          data = posPoolContract.claimAllInterest().data;
          break;
        case "withdraw":
          value = 0;
          estimateData = await posPoolContract
            .withdrawStake(new BigNumber(userSummary[3]).toString(10))
            .estimateGasAndCollateral({
              from: accountAddress,
            });
          data = posPoolContract.withdrawStake(
            new BigNumber(userSummary[3]).toString(10)
          ).data;
          break;
        default:
          break;
      }
      const txParams = {
        from: accountAddress,
        to: poolAddress,
        data,
        gas: calculateGasMargin(estimateData?.gasLimit || 0),
        storageLimit: calculateGasMargin(
          estimateData?.storageCollateralized || 0
        ),
        value,
      };
      if (stakeModalShown) {
        setStakeModalShown(false);
      }
      if (unstakeModalShown) {
        setUnStakeModalShown(false);
      }
      const txHash = await confluxJS.sendTransaction(txParams);
      setTxHash(txHash);
      setTxModalShown(true);
    } catch (error) {
      console.error('error',error)
    }
  };

  return (
    <div className="w-full h-full flex">
      {isLoading?<div className="flex items-center justify-center w-full h-screen"><Spin></Spin></div>:(<div className="container mx-auto">
        <Header status={status}/>
        <div className="flex justify-center mt-6">
          <div className="w-9/12">
            <div className="flex">
              <div className="flex-1 p-6 mr-4 -ml-2 border-gray-800 border-2 text-white box-border rounded bg-main-back">
                <Form
                  layout="vertical"
                  form={form}
                  wrapperCol={{ style: { color: "white" } }}
                  style={{color:'white'}}
                >
                  <div className="font-bold my-4 text-xl text-center">
                    Stake & Unstake
                  </div>
                  <div className="my-2">How much do you want to stake?(Multiples of 1,000 CFX)</div>
                  <Form.Item
                    required
                    validateStatus={stakeInputStatus}
                    help={stakeErrorText}
                  >
                    <Row>
                      <Col span={21}>
                        <Input
                          placeholder="Enter the CFX amount"
                          //   addonAfter={<span>Max</span>}
                          value={inputStakeCfx}
                          onChange={onStakeChange}
                        />
                      </Col>
                      <Col span={3}>
                        <Button onClick={()=>{setInputStakeCfx(cfxMaxCanStake)}}>Max</Button>
                      </Col>
                    </Row>
                  </Form.Item>
                  <div>
                    <span>Balance:</span>
                    <span className="ml-2 font-bold">{balance}</span>
                    <span> CFX</span>
                  </div>
                  <div className="flex mt-2">
                    <Button
                      type="primary"
                      size="middle"
                      onClick={() => {
                        setStakeModalShown(true);
                      }}
                      disabled={stakeBtnDisabled}
                    >
                      Stake
                    </Button>
                  </div>
                  <Divider dashed style={{borderColor:'white'}}/>
                  <div className="my-1">How much do you want to unstake?(Multiples of 1,000 CFX)</div>
                  <Form.Item
                    required
                    validateStatus={unstakeInputStatus}
                    help={unstakeErrorText}
                  >
                      <Row>
                    <Col span={21}>
                      <Input
                        placeholder="Enter the CFX amount"
                        value={inputUnstakeCfx}
                          onChange={onUnstakeChange}
                      />
                    </Col>
                    <Col span={3}>
                      <Button onClick={()=>{setInputUnstakeCfx(cfxCanUnstake)}}>Max</Button>
                    </Col>
                  </Row>
                  </Form.Item>
                  
                  <div>
                    <span>Unstakeable:</span>
                    <span className="ml-2 font-bold">{cfxCanUnstake}</span>
                    <span> CFX</span>
                  </div>
                  <div className="flex mt-2">
                    <Button
                      type="primary"
                      size="middle"
                      onClick={() => {
                        setUnStakeModalShown(true);
                      }}
                      disabled={unstakeBtnDisabled}
                    >
                      UnStake
                    </Button>
                  </div>
                </Form>
              </div>
              <div className="flex-1 p-6 border-gray-800 border-2 box-border rounded bg-main-back text-white">
                <div className="font-bold my-4 text-xl text-center mb-4">
                  My Pool
                </div>
                <div className="mt-7">
                  <span>My Staked:</span>
                  <span className="ml-2 font-bold">{stakedCfx}</span>
                  <span> CFX</span>
                </div>
                <div className="my-4">
                  <span>My Rewards:</span>
                  <span className="ml-2 font-bold">{rewards}</span>
                  <span> CFX</span>
                  <span className="ml-2">
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => {
                        submit("claim");
                      }}
                      disabled={new BigNumber(rewards).isEqualTo(0)}
                    >
                      Claim
                    </Button>
                  </span>
                </div>
                <div className="my-2 opacity-60">
                  <span>Last Update Time:</span>
                  <span>{lastDistributeTime}</span>
                </div>
                <div className="my-4">
                  <span>Performance Fee:</span>
                  <span className="ml-2 font-bold">{ `${fee} %`}</span>
                </div>
                <Divider dashed style={{borderColor:'white'}}/>
                <div>
                  <span>Withdrawable: :</span>
                  <span className="ml-2 font-bold">{cfxCanWithdraw}</span>
                  <span> CFX</span>
                  <span className="ml-2">
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => {
                        submit("withdraw");
                      }}
                      disabled={!cfxCanWithdraw}
                    >
                      Withdraw
                    </Button>
                  </span>
                </div>
              </div>
            </div>
            <div className={`${unstakeList.length > 0 ? "block" : "hidden"}`}>
              <Divider dashed orientation="left" style={{borderColor:'white',color:'white'}}>Unstake Activity</Divider>
              <List
                bordered
                dataSource={unstakeList}
                renderItem={(item) => (
                  <List.Item>
                    <div className="text-white">{`${item.amount} CFX`}</div>
                    <div  className="text-white">{`You can withdraw at ` + item.timeStr}</div>
                  </List.Item>
                )}
              />
            </div>
          </div>
        </div>
      </div>)})
      <ConfirmModal
        visible={stakeModalShown}
        setVisible={setStakeModalShown}
        type="stake"
        onOk={() => {
          submit("stake");
        }}
      ></ConfirmModal>
      <ConfirmModal
        visible={unstakeModalShown}
        setVisible={setUnStakeModalShown}
        type="unstake"
        onOk={() => {
          submit("unstake");
        }}
      ></ConfirmModal>
      <TxModal
        visible={txModalShown}
        setVisible={setTxModalShown}
        txHash={txHash}
      ></TxModal>
    </div>
  );
}

export default Pool;
