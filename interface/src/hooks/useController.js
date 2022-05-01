import { useMemo } from 'react';
import {Conflux} from "js-conflux-sdk/dist/js-conflux-sdk.umd.min.js";
import useCurrentNetwork from './useCurrentNetwork';
import useCurrentSpace from './useCurrentSpace';
import { ethers, Contract} from 'ethers';

const useController = () => {
    const currentSpace = useCurrentSpace();
    const currentNetwork = useCurrentNetwork();
    return useMemo(() => {
        if (currentSpace === 'eSpace') {
            const provider = new ethers.providers.JsonRpcProvider(currentNetwork.url);
            return {
                Contract: ({ abi, address }) => new Contract(address, abi, provider),
                provider
            }
        }
        return new Conflux(currentNetwork)
    }, [currentSpace, currentNetwork]);
}

export default useController;
