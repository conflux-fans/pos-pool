import { useMemo } from 'react';
import { isTestNetEnv } from "../utils/index";
import { NETWORK_ID_CORE_MAINNET, NETWORK_ID_CORE_TESTNET, NETWORK_ID_ESPACE_MAINNET, NETWORK_ID_ESPACE_TESTNET } from "../constants";
import poolConfig from '../../pool.config';
import useCurrentSpace from './useCurrentSpace';

const useCurrentNetwork = () => {
    const currentSpace = useCurrentSpace();
    const network = useMemo(() => {
        const networkId = isTestNetEnv() ? 
            (currentSpace === 'core' ? NETWORK_ID_CORE_TESTNET : NETWORK_ID_ESPACE_TESTNET)
            : (currentSpace === 'core' ? NETWORK_ID_CORE_MAINNET : NETWORK_ID_ESPACE_MAINNET)

        let url = poolConfig[currentSpace][isTestNetEnv() ? 'testnet' : 'mainnet'].RPC;
        if (process.env.REACT_APP_TestNet === "true") {
            url = window.location.origin + `/${currentSpace}-rpc`;
        }

        const poolManagerAddress = poolConfig[currentSpace][isTestNetEnv() ? 'testnet' : 'mainnet'].poolManagerAddress;

        return ({
            url,
            networkId,
            poolManagerAddress
        });
    }, [currentSpace]);

    return network;
}

export default useCurrentNetwork;
