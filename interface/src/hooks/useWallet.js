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
  return (currentSpace === 'core' ? useFluentAccount : useMetaMaskAccount)()
}

export const useChainId = () => {
  const currentSpace = useCurrentSpace()
  return (currentSpace === 'core' ? useFluentChainId : useMetaMaskChainId)()
}

export const useBalance = () => {
  const currentSpace = useCurrentSpace()
  return (currentSpace === 'core' ? useFluentBalance : useMetaMaskBalance)()
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
