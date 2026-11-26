import { useMemo } from 'react';
import useController from './useController';
import posPoolArtifact from './../../../contract/ABI/IPoSPool.json'
import { useParams } from "react-router-dom";
import { utils } from 'ethers';

const posPoolAbi = posPoolArtifact.abi;

const usePoolContract = () => {
    const { poolAddress } = useParams();
    const controller = useController();

    return useMemo(() => {
        return {
            contract: controller.Contract({
                abi: posPoolAbi,
                address: poolAddress,
            }),
            interface: new utils.Interface(posPoolAbi)
        }
    }
    , [poolAddress, controller]);
}

export default usePoolContract;
