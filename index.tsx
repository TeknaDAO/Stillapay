/* eslint-disable */

import React, { useState, createContext } from 'react'
import Web3 from 'web3'

import isMobile from 'ismobilejs'

import WalletConnect from '@walletconnect/client'
import QRCodeModal from '@walletconnect/qrcode-modal'

import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { MetaMaskInpageProvider } from '@metamask/providers'

import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
  SystemProgram,
} from '@solana/web3.js'

import { getNetworkById } from './networks'

const SOLANA_NETWORK = clusterApiUrl('testnet'/*'mainnet-beta'*/)

declare global {
  interface Window {
    ethereum: MetaMaskInpageProvider
    solana: any
  }
}


interface WalletInterface {
  isLoading: boolean
  isConnected: boolean
  name: null | 'WalletConnect' | 'MetaMask' | 'Phantom'
  chainId: null | number
  address: string | null
  addressShort: string | null
  addressDomain: null | string
  web3: Web3 | null // todo: types
  provider: any // 📌 TODO: add interface
  restore: Function
  connect: Function
  changeNetwork: Function
  sendTx: Function
  disconnect: Function
}

export const WalletContext = createContext<WalletInterface>({
  isLoading: false,
  isConnected: false,
  name: null,
  chainId: null,
  address: '',
  addressShort: '',
  addressDomain: null,
  web3: null,
  provider: null,
  restore: () => {},
  connect: () => {},
  changeNetwork: () => {},
  sendTx: () => {},
  disconnect: () => {},
})


const names = {
  'WalletConnect': 'WalletConnect',
  'MetaMask': 'MetaMask',
  'Phantom': 'Phantom',
}

/*
const { ethereum } = window
*/

/*const web3 = new Web3(window.ethereum)
web3.eth.getAccounts((err, accounts) => {
  if (err != null) console.error("An error occurred: " + err)
  else if (accounts.length === 0) console.log("User is not logged in to MetaMask");
  else connect();
});*/

let isMetamaskHandler = false

let connector // wc
//window.getConnector = () => connector


const goMetamask = () => {
  //if (isMobile(window.navigator).apple.device) {
  if (isMobile(window.navigator).any) {
    /*
      open app in mobile metamask
      info: https://docs.metamask.io/guide/mobile-best-practices.html#deeplinking

      `https://checkout.webill.io/nft/bb811382-1f1b-4376-8884-5f74bd808f83/`
      ->
      `https://metamask.app.link/dapp/checkout.webill.io/nft/bb811382-1f1b-4376-8884-5f74bd808f83/`
    */
    const locationHref = window.location.href
    let locationHrefNoProtocol = locationHref.replace('http://', '')
    locationHrefNoProtocol = locationHrefNoProtocol.replace('https://', '')
    const deepLink = `https://metamask.app.link/dapp/${locationHrefNoProtocol}`
    window.location.href = deepLink
  }
  if (!isMobile(window.navigator).any) {
    window.open('https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn')
  }
}

const goPhantom = () => {
  const url = 'https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa'
  if (window) {
    window.open(url, '_blank')
  }
}

interface StateProps {
  isLoading: boolean
  isConnected: boolean
  name: null | 'WalletConnect' | 'MetaMask' | 'Phantom'
  provider: any
  web3: Web3 | null
  chainId: number | null
  address: string | null
  addressShort: string | null
  addressDomain: string | null
}

const Wallet = (props) => {

  const [state, setState] = useState<StateProps>({
    isLoading: false,
    isConnected: false,
    name: null,
    provider: null,
    web3: null,
    chainId: null,
    address: null,
    addressShort: null,
    addressDomain: null
  })

  const getDomain = async (address) => {
    if (!address) {
      return null
    }
    try {
      // ENS test
      //const address = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'
      const answer = await (await fetch(`https://domains.1inch.io/reverse-lookup?address=${address}`)).json()
      const domain = answer.domain
      return domain
    } catch (e) {
      console.warn(`Can't get domain, ${e}`)
    }
    return null
  }

  const shortify = (address) => {
    const result = typeof address === 'string'
      ? `${address.slice(0, 6)}...${address.slice(address.length - 4)}`
      : null
    return result
  }

  /*
  setState(prev => {
    // Object.assign would also work
    return {...prev, ...updates};
  })

  setState(prev => ({...prev, ...{

  }}))
  */

  /*
  useEffect(() => {
    // todo: check
    if (window?.ethereum?.chainId) {
      const metamaskChainId = parseInt(window.ethereum.chainId)
      console.log('setMetamaskChainId', metamaskChainId)
      setMetamaskChainId(metamaskChainId)
    }

    const metamaskChainChangeHandler = (chainIdHex) => {
      const chainId = parseInt(chainIdHex)
      console.log('chainChanged / setMetamaskChainId', chainId)
      setMetamaskChainId(chainId)
    }

    if (!isMetamaskHandler) {
      if (window.ethereum) {
       window.ethereum.on('chainChanged', metamaskChainChangeHandler)
       isMetamaskHandler = true
      }
    }
  }, [metamaskChainId])
  */


  const restore = async () => {
    console.log('Wallet.restore()')
    /*
    if (!ethereum) {
      console.warn('connectAuto failed: no window.ethereum')
      return
    }

    //

    try {
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      })

      console.log('setAccount', accounts[0])
      setAddress(accounts[0])

      parseInt(ethereum.networkVersion)

    } catch (error) {
      console.error('Cannot connect:', error)
    }
    */


    await dropWC()

    return await connectMetamask()
  }

  const connectMetamask = async (chainId?: string | number) => {
    if (!window.ethereum || !window.ethereum.isMetaMask) {
      return false
    }
    const provider_ = window.ethereum
    const chainIdHex_ = provider_.chainId
    let chainId_ = typeof chainIdHex_ === 'string'
      ? parseInt(chainIdHex_)
      : null

    let accounts

    try {
      accounts = await provider_.request({
        method: 'eth_requestAccounts'
      })
    } catch (e: any) {
      if (e.code === 4001) {
        console.warn('User rejected the request', e)
        return false
      } else {
        throw e
      }
    }

    console.log('accounts = ', accounts)
    const address_ = accounts[0]
    const addressDomain_ = await getDomain(getDomain)

    if (chainId) { // go change network
      const network = getNetworkById(chainId)
      if (!network.data.params) {
        throw new Error('Missing network params')
      }
      const isNeedToChangeNetwork = chainId_ !== network.chain_id
      if (isNeedToChangeNetwork) {
        await metamaskChangeNetwork(network.data.params)
        chainId_ = network.chain_id
      }
    }


    if (!isMetamaskHandler) {
      provider_.on('chainChanged', metamaskChainChangeHandler)
      provider_.on('accountsChanged', metamaskAccountChangeHandler)
      isMetamaskHandler = true
    }

    setState(prev => ({...prev, ...{
      isConnected: true,
      name: 'MetaMask',
      provider: provider_,
      //@ts-ignore
      web3: new Web3(provider_),
      chainId: chainId_,
      address: address_,
      addressShort: shortify(address_),
      addressDomain: addressDomain_
    }}))
    return true
  }

  const connectWC = ({ showQR = false, chainId = '' }) => {
    /*
      showQR === false | only reconnect
      showQR === true  | try to connect + show QR
    */

    console.log('connectWC()', showQR ? '(connect+QR)' : '(reconnect)')

    return new Promise((resolve) => {
      connector = new WalletConnect({
        bridge: 'https://bridge.walletconnect.org',
        qrcodeModal: QRCodeModal,
      })

      console.log('connector: ', connector)

      if (
        (connector.connected && showQR) ||
        (!connector.connected && !showQR)
      ) {
        resolve(false)
      }

      if (!connector.connected && showQR) {
        console.log('no session, create')
        connector.createSession()
      }

      if (connector.connected && !showQR) {
        console.log('restore session: ', connector.session)
        console.log('WC reconnect not implemented, drop session')
        try {
          connector.killSession()
        } catch (e) {
          console.warn(e)
        }
        resolve(false)
        /* todo later:
        const dappChainId = network.chain_id
        const walletChainId = connector.session.chainId

        if (walletChainId !== dappChainId) {
          toast.warn('(Rejected) Select the correct network in your wallet')
          //console.warn('(Rejected) Select the correct network in your wallet')
          resolve(false)
          connector.killSession()
        }

        const rpcUrl = network.rpc_url
        console.log('rpcUrl', rpcUrl)
        const provider_ = new Web3.providers.HttpProvider(rpcUrl)
        const web3_ = new Web3(provider_)

        setState(prev => ({...prev, ...{
          isConnected: connector.session.connected,
          name: 'WalletConnect',
          provider: provider_,
          web3: web3_,
          chainId: connector.session.chainId,
          address: connector.session.accounts[0],
          addressShort: shortify(connector.session.accounts[0]),
          addressDomain
        }}))

        resolve(true)
        */
      }

        /*
        Events:
          - connect
          - disconnect
          - session_request
          - session_update
          - call_request
          - wc_sessionRequest
          - wc_sessionUpdate
        */

      connector.on('connect', async (error, payload) => { // only after QR scan
        console.log('* connected', payload)
        //toast.success('[dapp ⮀ wallet] Connected')

        if (error) {
          throw error
        }

        // Get provided accounts and chainId
        const { accounts, chainId: walletChainId } = payload.params[0]

        const network = getNetworkById(chainId)
        const dappChainId = network.chain_id
        if (walletChainId !== dappChainId) {
          toast.warn('Wrong wallet network — disconnected')
          /*console.warn('(Rejected) Select the correct network in your wallet')*/
          resolve(true) // to close modalbox
          connector.killSession()
        }

        const address_ = accounts[0]
        const addressDomain_ = await getDomain(address_)

        const rpcUrl = network.rpc_url
        console.log('rpcUrl', rpcUrl)
        const provider_ = new Web3.providers.HttpProvider(rpcUrl)
        const web3_ = new Web3(provider_)

        setState(prev => ({...prev, ...{
          isConnected: true,
          name: 'WalletConnect',
          provider: provider_,
          web3: web3_,
          chainId: walletChainId,
          address: address_,
          addressShort: shortify(address_),
          addressDomain: addressDomain_
        }}))

        resolve(true)
      })


      connector.on('session_request', (error, payload) => { console.log('* session_request', error, payload) })


      connector.on('session_update', (error, payload) => {
        console.log('* session_update', payload)

        if (error) {
          throw error
        }

        console.log('chainId', state.chainId)

        // Get updated accounts and chainId
        const { /*accounts,*/ chainId: newChainId } = payload.params[0]
        //console.log(accounts, newChainId)

        //const account = accounts[0] // todo: account

        if (newChainId !== state.chainId) {
          //toast.info(`[wallet] chainId changed to ${newChainId}`)
          setState(prev => ({...prev, ...{
            chainId: newChainId
          }}))
        }
      });


      connector.on('call_request', (error, payload) => {
        console.log('* call_request', error, payload)
      })


      connector.on('disconnect', (error, payload) => {
        console.log('* disconnect', payload)

        /*
          "Session Rejected" = reject after QR scan
          "Session Disconnected" = disconnected by dapp
          "Session disconnected" = disconnected by wallet
        */

        if (payload.params[0]?.message === 'Session Rejected') {
          //toast.warn('[wallet] Connection rejected')
          console.log('[Wallet] Session rejected')
          resolve(false)
        }

        if (payload.params[0]?.message === 'Session disconnected') {
          //toast.info('[wallet] Disconnected')
          console.log('[Wallet] Disconnected (by wallet)')
        }

        if (payload.params[0]?.message === 'Session Disconnected') {
          //toast.info('[dapp] Disconnected')
          console.log('[Wallet] Disconnected (by dapp)')
        }


        if (error) {
          throw error
        }

        setState(prev => ({...prev, ...{
          isConnected: false,
          name: null,
          provider: null,
          web3: null,
          chainId: null,
          address: null,
          addressShort: null,
          addressDomain: null
        }}))
      })
    })
  }

  const connectPhantom = async () => {
    try {
      const resp = await window.solana.connect()
      //console.log('resp', resp)
      const address_ = resp.publicKey.toString()

      setState(prev => ({...prev, ...{
        isConnected: true,
        name: 'Phantom',
        provider: null,
        web3: null,
        chainId: null,
        address: address_,
        addressShort: shortify(address_),
        addressDomain: null
      }}))
    } catch (err: any) {
      if (err.code === 4001) {
        console.warn('[Wallet] User rejected the request.')
        return false
      }
      console.error('[Wallet]', err)
    }
  }

  const dropWC = () => {
    return connectWC({ showQR: false })
  }

  const metamaskChainChangeHandler = (chainIdHex) => {
    // todo: fix state
    /*if (!state.isConnected) {
      return
    }*/
    const chainId_ = parseInt(chainIdHex)
    console.log('* chainChanged', chainIdHex, chainId_)
    setState(prev => ({...prev, ...{
      chainId: chainId_
    }}))
  }

  const metamaskAccountChangeHandler = (accounts) => {
    console.log('* accountsChanged', accounts)

    // todo: fix state
    /*if (!state.isConnected) {
      return
    }*/
    if (!accounts.length) { // metamask disconnect
      disconnect()
    }
  }

  const connect = async ({ name, chainId }) => {
    console.log('Wallet.connect()', name, chainId)
    if (!names[name]) {
      console.error(`Unknown wallet name: ${name}`)
      return
    }

    if (name === 'MetaMask') {
      if (!window.ethereum || !window.ethereum.isMetaMask) {
        goMetamask()
        return false
      }
      return await connectMetamask(chainId)
    }

    if (name === 'WalletConnect') {
      return connectWC({ showQR: true, chainId })
    }

    if (name === 'Phantom') {
      const isPhantomInstalled = window.solana && window.solana.isPhantom
      if (!isPhantomInstalled) {
        goPhantom()
        return false
      }
      return await connectPhantom()
    }
  }

  const metamaskChangeNetwork = async (params) => {
      const newChainIdHex = params[0].chainId
      const { ethereum } = window

      try {
        await ethereum.request({
          "method": "wallet_switchEthereumChain",
          "params": [
            {
              "chainId": newChainIdHex,
            }
          ]
        })
        return true
      } catch (error: any) {
        console.warn('Cant change network:', error)

        if (error.code === 4902) { // the chain has not been added to MetaMask
          try {
            console.log('Try to add the network...', params)
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: params
            })
            // todo:
            // Users can allow adding, but not allowing switching
            return true
          } catch (error) {
            console.warn('Cant add the network:', error)
            return false
          }
        }
      }
      return false
  }

  const changeNetwork = async (name, chainId) => {
    console.log('Wallet.changeNetwork()', chainId)

    const network = getNetworkById(chainId)
    const params = network.data.params
    // console.log('state.name', state.name)
    /*if (state.name === 'MetaMask') {*/
    // todo: stale state
    if (name === 'MetaMask') {
      const isChanged = await metamaskChangeNetwork(params)
      if (isChanged) {
        setState(prev => ({...prev, ...{
          chainId: chainId
        }}))
        return true
      }
      return false
    }

    if (state.name === 'WalletConnect') {
      // todo (show new QR)
    }
  }

  const sendTx = async (rawTx) => {
    console.log('[Wallet] sendTx', rawTx)

    if (state.name === 'MetaMask') {
      return await state.provider.request({
        method: 'eth_sendTransaction',
        params: [rawTx]
      })
    }

    if (state.name === 'WalletConnect') {
      return await connector.sendTransaction(rawTx)
    }

    if (state.name === 'Phantom') {
      const connection = new Connection(SOLANA_NETWORK)
      const provider = window.solana

      const createTransferTransaction = async () => {
        if (!provider.publicKey) return;
        let transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: provider.publicKey,
            toPubkey: provider.publicKey,
            lamports: 1000000,
          })
        );
        transaction.feePayer = provider.publicKey;
        console.log('Getting recent blockhash')
        const anyTransaction: any = transaction;
        anyTransaction.recentBlockhash = (
          await connection.getRecentBlockhash()
        ).blockhash;
        return transaction;
      }

      const sendTransaction = async () => {
        try {
          const transaction = await createTransferTransaction();
          if (!transaction) return;
          let signed = await provider.signTransaction(transaction);
          console.log('Got signature, submitting transaction...')
          let signature = await connection.sendRawTransaction(signed.serialize());
          console.log(`Tx submitted`, signature)

          console.log(`Waiting for network confirmation...`)
          await connection.confirmTransaction(signature);
          console.log('Tx confirmed!', signature)
          console.log(`See explorer:`)
          console.log(`https://solscan.io/tx/${signature}?cluster=testnet`)
        } catch (err) {
          console.warn(err);
          console.log('[Wallet error] sendTransaction: ' + JSON.stringify(err))
        }
      }

      return await sendTransaction()
    }
  }

  /*const request = async (params) => {
    // from provider
  }*/

  const disconnect = () => {
    console.log('Wallet.disconnect()')

    if (state.name === 'MetaMask') {
      if (state.provider) {
        state.provider.removeListener('chainChanged', metamaskChainChangeHandler)
        state.provider.removeListener('accountsChanged', metamaskAccountChangeHandler)
        isMetamaskHandler = false
      }
    }

    if (state.name === 'WalletConnect') {
      connector.killSession()
    }

    if (state.name === 'Phantom') {
      window.solana.disconnect()
    }

    setState(prev => ({...prev, ...{
      isConnected: false,
      name: null,
      provider: null,
      web3: null,
      chainId: null,
      address: null,
      addressShort: null,
      addressDomain: null
    }}))
  }

  return (
    <WalletContext.Provider value={{
      isLoading: false, // todo
      isConnected: state.isConnected,
      name: state.name,
      chainId: state.chainId,
      address: state.address,
      addressShort: state.addressShort,
      addressDomain: state.addressDomain,
      web3: state.web3,
      provider: state.provider,
      restore,
      connect,
      changeNetwork,
      sendTx,
      disconnect
    }}>
      {props.children}
      <ToastContainer position="top-center" />
    </WalletContext.Provider>
  )
}

export default Wallet