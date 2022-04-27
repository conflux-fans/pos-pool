import { useChainId as useFluentChainId } from "@cfxjs/use-wallet";
import { useChainId as useMetaMaskChainId } from "@cfxjs/use-wallet/dist/ethereum";
import useCurrentSpace from "./useCurrentSpace";
import useCurrentNetwork from "./useCurrentNetwork";

const useIsNetworkMatch = () => {
    const currentSpace = useCurrentSpace()
    const currentNetwork = useCurrentNetwork()
    const fluentChainId = useFluentChainId()
    const metaMaskChainId = useMetaMaskChainId()
    if (!currentSpace) return true;
    const usedChainId = currentSpace === 'core' ? fluentChainId : metaMaskChainId
    return String(currentNetwork.networkId) === String(usedChainId);
}

export default useIsNetworkMatch;