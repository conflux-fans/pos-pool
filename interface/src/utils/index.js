import BigNumber from "bignumber.js";
import {
  CFX_BASE_PER_VOTE,
  SCAN_URL,
  SCAN_URL_TESTNET,
  SCAN_URL_DEVENT,
  SCAN_URL_POS_DEV,
  RemainderAmount,
} from "../constants";

export const isTestNetEnv = () => {
  if (typeof window !== `undefined`) {
    return (
      process.env.REACT_APP_TestNet === "true" ||
      window.location.hostname.includes("test")
    );
  }
  return false;
};

export const getCfxByVote = (vote) =>
  new BigNumber(vote).multipliedBy(CFX_BASE_PER_VOTE).toNumber();
export const getApy = (data) => new BigNumber(data).dividedBy(100).toNumber();
export const getFee = (userFee) =>
  new BigNumber(100).minus(new BigNumber(userFee).dividedBy(100)).toNumber();

// add 10% by default
export function calculateGasMargin(value, margin = 0.1) {
  return new BigNumber(value?.toString(10))
    .multipliedBy(new BigNumber(10000).plus(new BigNumber(10000 * margin)))
    .dividedBy(new BigNumber(10000))
    .toFixed(0);
}

export const getDateByBlockInterval = (minuend = 0, subtrahend = 0, space = 'core') => {
  const minuendBn = new BigNumber(minuend);
  const subtrahendBn = new BigNumber(subtrahend);
  const isGreater = minuendBn.isGreaterThan(subtrahendBn);
  const seconds = isGreater
    ? minuendBn.minus(subtrahendBn).dividedBy(space === 'core' ? 2 : 1).toNumber()
    : subtrahendBn.minus(minuendBn).dividedBy(space === 'core' ? 2 : 1).toNumber();
  const futureDate = new Date(
    new BigNumber(Date.now()).plus(seconds * 1000).toNumber()
  );
  const pastDate = new Date(
    new BigNumber(Date.now()).minus(seconds * 1000).toNumber()
  );
  return isGreater ? futureDate : pastDate;
};

export const getEllipsStr = (str, frontNum, endNum) => {
  if (str) {
    const length = str.length;
    if (endNum === 0 && length <= frontNum) {
      return str.substring(0, frontNum);
    }
    return (
      str.substring(0, frontNum) +
      "..." +
      str.substring(length - endNum, length)
    );
  }
  return "";
};

export const getNetworkUrl = () => {
  let networkVersion = "";
  if (typeof window !== `undefined`) {
    networkVersion = window.conflux?.networkVersion;
  }
  let url = "";
  switch (networkVersion) {
    case "1029":
      url = SCAN_URL;
      break;
    case "1":
      url = SCAN_URL_TESTNET;
      break;
    case "1921":
      url = SCAN_URL_DEVENT;
      break;
    case "8888":
      url = SCAN_URL_POS_DEV;
      break;
    default:
      url = SCAN_URL;
      break;
  }
  return url;
};

export const getMax = (amount) => {
  const amountBn = new BigNumber(amount);
  if (
    amountBn.isGreaterThanOrEqualTo(
      new BigNumber(CFX_BASE_PER_VOTE).plus(RemainderAmount)
    )
  ) {
    const multiple = Math.floor(
      new BigNumber(amount)
        .minus(RemainderAmount)
        .dividedBy(CFX_BASE_PER_VOTE)
        .toNumber()
    );
    return new BigNumber(multiple).multipliedBy(CFX_BASE_PER_VOTE).toNumber();
  }
  return 0;
};

export const getPrecisionAmount=(amount,precision=0)=>{
  return new BigNumber(amount).toFixed(precision)
}
