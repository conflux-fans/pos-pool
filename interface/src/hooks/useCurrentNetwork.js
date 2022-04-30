import { useMemo } from 'react';
import { isTestNetEnv } from "../utils/index";
import { NETWORK_ID_CORE_MAINNET, NETWORK_ID_CORE_TESTNET, NETWORK_ID_ESPACE_MAINNET, NETWORK_ID_ESPACE_TESTNET } from "../constants";
import poolConfig from '../../pool.config';
import useCurrentSpace from './useCurrentSpace';

const useCurrentNetwork = () => {
    const currentSpace = useCurrentSpace();
    const network = useMemo(() => {
        if (!currentSpace) return null;
        const networkId = isTestNetEnv() ? 
            (currentSpace === 'core' ? NETWORK_ID_CORE_TESTNET : NETWORK_ID_ESPACE_TESTNET)
            : (currentSpace === 'core' ? NETWORK_ID_CORE_MAINNET : NETWORK_ID_ESPACE_MAINNET)

        let url = poolConfig[isTestNetEnv() ? 'testnet' : 'mainnet'][currentSpace].RPC;
        if (process.env.REACT_APP_TestNet === "true") {
            url = window.location.origin + `/${currentSpace}-rpc`;
        }

        return ({
            url,
            networkId,
            name: poolConfig[isTestNetEnv() ? 'testnet' : 'mainnet'][currentSpace].name
        });
    }, [currentSpace]);

    return network;
}

export default useCurrentNetwork;
