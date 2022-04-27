import useCurrentSpace from './useCurrentSpace'
import {
  useAccount as useFluentAccount,
  useChainId as useFluentChainId,
  useBalance as useFluentBalance,
  sendTransaction as sendTransactionWithFluent,
  connect as connectFluent,
  Unit,
} from '@cfxjs/use-wallet'
import {
  useAccount as useMetaMaskAccount,
  useChainId as useMetaMaskChainId,
  useBalance as useMetaMaskBalance,
  sendTransaction as sendTransactionWithMetaMask,
  connect as connectMetaMask,
} from '@cfxjs/use-wallet/dist/ethereum'

export const useAccount = () => {
  const currentSpace = useCurrentSpace()
  const fluentAccount = useFluentAccount()
  const metaMaskAccount = useMetaMaskAccount();
  if (!currentSpace) return undefined
  return (currentSpace === 'core' ? fluentAccount : metaMaskAccount)
}

export const useChainId = () => {
  const currentSpace = useCurrentSpace()
  const fluentChainId = useFluentChainId()
  const metaMaskChainId = useMetaMaskChainId()
  if (!currentSpace) return undefined
  return (currentSpace === 'core' ? fluentChainId : metaMaskChainId)
}

export const useBalance = () => {
  const currentSpace = useCurrentSpace()
  const fluentBalance = useFluentBalance()
  const metaMaskBalance = useMetaMaskBalance()
  if (!currentSpace) return undefined;
  return (currentSpace === 'core' ? fluentBalance : metaMaskBalance)
}

export const useSendTransaction = () => {
  const currentSpace = useCurrentSpace()
  return currentSpace === 'core'
    ? sendTransactionWithFluent
    : sendTransactionWithMetaMask
}

export const useTryActivate = () => {
  const currentSpace = useCurrentSpace()
  return currentSpace === 'core'
    ? connectFluent
    : connectMetaMask
}

export {Unit}
