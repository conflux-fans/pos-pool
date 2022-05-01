import poolConfig from '../../pool.config';
export const TypeConnectWallet = {
    uninstalled: 'uninstalled',
    loading: 'loading',
    error: 'error',
    success: 'success',
}

export const NETWORK_ID_CORE_MAINNET = poolConfig.mainnet.core.networkId;
export const NETWORK_ID_CORE_TESTNET = poolConfig.testnet.core.networkId;
export const NETWORK_ID_ESPACE_MAINNET = poolConfig.mainnet.eSpace.networkId;
export const NETWORK_ID_ESPACE_TESTNET = poolConfig.testnet.eSpace.networkId;
export const CFX_BASE_PER_VOTE=1000
export const SCAN_URL = "https://confluxscan.io"
export const SCAN_URL_TESTNET = "https://testnet.confluxscan.io"
export const SCAN_URL_DEVENT = "https://devnet-scantest.confluxnetwork.org"
export const SCAN_URL_POS_DEV = "https://posrc.confluxscan.net"
export const RemainderAmount=1 // you must have 1 cfx in wallet to pay gas fee

export const StatusPosNode={
    loading:'loading',
    error:'error',
    success:'success',
    warning:'warning'
}