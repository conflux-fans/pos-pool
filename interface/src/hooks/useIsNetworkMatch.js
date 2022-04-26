import { useChainId as useFluentChainId } from "@cfxjs/use-wallet";
import { useChainId as useMetaMaskChainId } from "@cfxjs/use-wallet/dist/ethereum";
import useCurrentSpace from "./useCurrentSpace";
import useCurrentNetwork from "./useCurrentNetwork";

const useIsNetworkMatch = () => {
    const currentSpace = useCurrentSpace();
    const currentNetwork = useCurrentNetwork();
    const fluentChainId = useFluentChainId()
    const metaMaskChainId = useMetaMaskChainId()
    const usedChainId = currentSpace === 'core' ? fluentChainId : metaMaskChainId

    return currentNetwork.networkId === usedChainId;
}

export default useIsNetworkMatch;