import React, { useState, useEffect } from "react";
import { Input, Button, Divider, Form, List, message, Col, Row } from "antd";
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
} from "../../utils";
import { useConnect, useBalance } from "../../hooks/usePortal";
import { CFX_BASE_PER_VOTE } from "../../constants";
import Header from "./Header";
import ConfirmModal from "./ConfirmModal";
import TxModal from "./TxModal";

function Pool() {
  const { address: accountAddress } = useConnect();
  const [form] = Form.useForm();
  const balance = useBalance(accountAddress);
  const cfxMaxCanStake = getMax(balance);
  const { confluxJS } = useConfluxPortal();
  let { poolAddress } = useParams();
  const posPoolContract = getPosPoolContract(poolAddress);
  const [status,setStatus]=useState(false)
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
    async function fetchData(address){
        const posAccount=await getPosAccountByPowAddress(address)
        setStatus(posAccount.status?.forceRetired==null)
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

  useEffect(() => {
    async function fetchData() {
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
            .toNumber()
        );
        setCfxCanUnstate(getCfxByVote(userSum[2] || 0));
        setCfxCanWithdraw(getCfxByVote(userSum[3] || 0));
        setRewards(new Drip(new BigNumber(data[1]).toNumber()).toCFX());
        setFee(getFee(data[2]));
        setUnstakeList(transferQueue(data[3]));
      } catch (error) {
      }
    }
    if (accountAddress) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountAddress]);

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
          value = new BigNumber(inputStakeCfx).multipliedBy(10**18).toNumber();
          const stakeVote=new BigNumber(inputStakeCfx).dividedBy(CFX_BASE_PER_VOTE).toNumber()
          estimateData = await posPoolContract
            .increaseStake(stakeVote)
            .estimateGasAndCollateral({
              from: accountAddress,
              value,
            });
          data = posPoolContract.increaseStake(stakeVote).data;
          break;
        case "unstake":
          value = inputUnstakeCfx;
          const unstakeVote=new BigNumber(inputUnstakeCfx).dividedBy(CFX_BASE_PER_VOTE).toNumber()
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
            .withdrawStake(new BigNumber(userSummary[3]).toNumber())
            .estimateGasAndCollateral({
              from: accountAddress,
            });
          data = posPoolContract.withdrawStake(
            new BigNumber(userSummary[3]).toNumber()
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
    }
  };

  return (
    <div className="w-full h-full flex">
      <div className="container mx-auto">
        <Header status={status}/>
        <div className="flex justify-center mt-6">
          <div className="w-9/12">
            <div className="flex">
              <div className="flex-1 p-6 mr-4 -ml-2 border-gray-800 border-2 text-white box-border rounded">
                <Form
                  layout="vertical"
                  form={form}
                  wrapperCol={{ style: { color: "white" } }}
                >
                  <div className="font-bold my-4 text-xl text-center">
                    Stake&Unstake
                  </div>
                  <Form.Item
                    label="How much do you want to stake?(Multiples of 1,000 CFX)"
                    required
                    tooltip="This is a required field"
                    labelCol={{ style: { color: "white" } }}
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
                    <span>{balance}</span>
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
                  <Divider dashed />
                  <Form.Item
                    label="How much do you want to unstake?(Multiples of 1,000 CFX)"
                    required
                    tooltip="This is a required field"
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
                    <span>{cfxCanUnstake}</span>
                    <span> CFX</span>
                  </div>
                  <div className="flex mt-2">
                    <Button
                      type="primary"
                      size="middle"
                      onClick={() => {
                        setUnStakeModalShown(true);
                      }}
                      disabled={unstakeErrorText}
                    >
                      UnStake
                    </Button>
                  </div>
                </Form>
              </div>
              <div className="flex-1 p-6 border-gray-800 border-2 box-border rounded">
                <div className="font-bold my-4 text-xl text-center mb-4">
                  My Pool
                </div>
                <div className="mt-12">
                  <span>My Staked:</span>
                  <span>{stakedCfx}</span>
                  <span> CFX</span>
                </div>
                <div className="my-4">
                  <span>My Rewards:</span>
                  <span>{rewards}</span>
                  <span> CFX</span>
                  <span className="ml-2">
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => {
                        submit("claim");
                      }}
                    >
                      Claim
                    </Button>
                  </span>
                </div>
                <div className="my-2">
                  <span>Last Update Time:</span>
                  <span>{lastDistributeTime}</span>
                </div>
                <div className="my-4">
                  <span>Performance Fee:</span>
                  <span>{`${fee} %`}</span>
                </div>
                <Divider dashed />
                <div>
                  <span>Withdrawable: :</span>
                  <span>{cfxCanWithdraw}</span>
                  <span> CFX</span>
                  <span className="ml-2">
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => {
                        submit("withdraw");
                      }}
                    >
                      Withdraw
                    </Button>
                  </span>
                </div>
              </div>
            </div>
            <div className={`${unstakeList.length > 0 ? "block" : "hidden"}`}>
              <Divider orientation="left">Unstake Activity</Divider>
              <List
                bordered
                dataSource={unstakeList}
                renderItem={(item) => (
                  <List.Item>
                    <div>{`${item.amount} CFX`}</div>
                    <div>{`You can withdraw at ` + item.timeStr}</div>
                  </List.Item>
                )}
              />
            </div>
          </div>
        </div>
      </div>
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
