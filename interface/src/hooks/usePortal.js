/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useCallback} from 'react'
import {useEffectOnce,useInterval} from 'react-use'

import {TypeConnectWallet} from '../constants'
import {conflux,Drip} from '../utils/cfx'

function validAccounts(accounts) {
  return Array.isArray(accounts) && accounts.length
}

const isPortalInstalled = () => window?.conflux?.isConfluxPortal

function useChainNetId() {
  const [chainId, setChainid] = useState(window?.conflux?.chainId)

  useEffectOnce(() => {
    const chainListener = newChainId => {
      if (newChainId !== '0xNaN') {
        setChainid(newChainId)
      }
    }
    window?.conflux?.on('chainIdChanged', chainListener)
    return () => {
      window?.conflux?.off('chainIdChanged', chainListener)
    }
  })
  return {chainId}
}

export function useConnect() {
  const [address, setAddress] = useState(null)
  const [error, setError] = useState(null)
  const {chainId} = useChainNetId()
  const portalInstalled = isPortalInstalled()
  const [type, setType] = useState(
    portalInstalled ? TypeConnectWallet.success : TypeConnectWallet.uninstalled,
  )

  if (window && window.conflux && window.conflux.autoRefreshOnNetworkChange)
    window.conflux.autoRefreshOnNetworkChange = false

  useEffectOnce(() => {
    const accountObj = window?.conflux?.send({method: 'cfx_accounts'})
    const accounts = accountObj?.result
    if (validAccounts(accounts) && accounts[0] !== address) {
      setAddress(accounts[0])
    }
  })

  useEffectOnce(() => {
    // listen when account change
    const accountsLinstener = accounts => {
      if (validAccounts(accounts) && accounts[0] !== address) {
        setAddress(accounts[0])
      }
      if (accounts.length === 0) {
        setAddress(null)
      }
    }

    window?.conflux?.on('accountsChanged', accountsLinstener)
    return () => {
      window?.conflux?.off?.('accountsChanged', accountsLinstener)
    }
  })

  const login = useCallback(() => {
    if (portalInstalled) {
      setType(TypeConnectWallet.loading)
      if (!address) {
        if (window?.conflux)
          window.conflux
            .enable()
            .then(accounts => {
              setType(TypeConnectWallet.success)
              if (validAccounts(accounts)) {
                setAddress(accounts[0])
              }
            })
            .catch(err => {
              setType(TypeConnectWallet.error)
              setError(err)
              if (err.code === 4001) {
                // EIP-1193 userRejectedRequest error
                // If this happens, the user rejected the connection request.
                console.error('Please connect to ConfluxPortal.')
              } else {
                console.error(err)
              }
            })
      }
    }
  }, [address])

  return {
    type,
    tryActivate: login,
    error,
    address,
    chainId,
  }
}


/**
 * get CFX balance from Conflux Network
 * @returns balance of account
 */
export function useBalance(address) {
  const [balance,setBalance]=useState(0)
  const delay=3000
  useInterval(
    () => {
      conflux.provider.call("cfx_getAccount", address).then(data=>{
        setBalance(new Drip(data?.balance).toCFX())
      }).catch(()=>{
        setBalance(0)
      })
    },
     delay
  );    
  return balance
}


