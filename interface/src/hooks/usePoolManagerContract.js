import { useMemo } from 'react';
import useCurrentNetwork from './useCurrentNetwork';
import useConflux from './useConflux';
import { abi as posManagerAbi } from "./../../../contract/ABI/PoolManager.json";

const usePoolManagerContract = () => {
    const currentNetwork = useCurrentNetwork();
    const conflux = useConflux();
    return useMemo(() => 
        conflux.Contract({
            abi: posManagerAbi,
            address: currentNetwork.poolManagerAddress,
        })
    , [conflux, currentNetwork]);
}

export default usePoolManagerContract;
