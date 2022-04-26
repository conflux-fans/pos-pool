import { useMemo } from 'react';
import useConflux from './useConflux';
import { abi as posPoolAbi } from "./../../../contract/ABI/IPoSPool.json";
import { useParams } from "react-router-dom";

const usePoolContract = () => {
    const { poolAddress } = useParams();
    const conflux = useConflux();

    return useMemo(() => {
        return conflux.Contract({
            abi: posPoolAbi,
            address: poolAddress,
        })
    }
    , [poolAddress, conflux]);
}

export default usePoolContract;
