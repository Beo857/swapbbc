// @ts-nocheck
import Head from 'next/head'
import styles from '@/styles/Home.module.css'
import { hooks, metaMask } from './connector'
const { useChainId, useAccounts, useIsActive, useProvider } = hooks
import { useEffect, useState } from 'react'
import { Contract } from '@ethersproject/contracts'
import poolABI from '../pages/poolABI.json';
import routerABI from '../pages/routerABI.json';
import tokenABI from '../pages/tokenABI.json';
import minichefABI from '../pages/minichefV2.json';
const WmaticWethPoolAddress = "0xc4e595acDD7d12feC385E5dA5D43160e8A0bAC0E";
const poolAddress = "0x14111b90c86FB433E120db4CCECf74ED3B014100";
const routerAddress = "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506";
const WMATIC = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270";
const BBC = "0xee8fa06c8354f0e27f3112509843d0e3104b4bae";
const minichefV2 = "0x0769fd68dfb93167989c6f7254cd0d766fb2841f";
const appchainID = 137;
const poolIndex = "0";

import { parseEther, formatEther } from '@ethersproject/units'

export default function Wallet() {

  const [wmaticPrice, setWmaticPrice] = useState('')
  const [BBCReserve, setBBCReserve] = useState('')
  const [WMATICReserve, setWMATICReserve] = useState('')
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [swapAmountA, setSwapAmountA] = useState('')
  const [swapAmountB, setSwapAmountB] = useState('')
  const [tokenSwap, setTokenSwap] = useState('BBC')
  const [gasPrice, setGasPrice] = useState(0)
  const [stakedTokenAmount, setStakedTokenAmount] = useState('')
  const [unStakedTokenAmount, setUnStakedTokenAmount] = useState('')
  const [stakeAmount, setStakeAmount] = useState('')
  const [unStakeAmount, setUnStakeAmount] = useState('')
  const chainId = useChainId()
  const accounts = useAccounts()
  const isActive = useIsActive()
  const provider = useProvider()


  useEffect(() => {
    if (isActive) {
      (async () => {
        provider?.getFeeData().then((res) => {
          setGasPrice(res.gasPrice._hex)
        })
        const reserves = await getReserve();
        const { amount, rewardDebt } = await getStakedToken()
        setStakedTokenAmount(((amount._hex) / 10 ** 18).toFixed(4))
        const unstaked = await getSLPBalance();
        setUnStakedTokenAmount(((unstaked._hex) / 10 ** 18).toFixed(4))
        const Wmaticquotes = await getAmountOut(parseEther("1"), reserves._reserve1, reserves._reserve0)
        setWmaticPrice(parseFloat((Wmaticquotes._hex) / 10 ** 18).toFixed(4));
        setBBCReserve(parseFloat((reserves._reserve1._hex) / 10 ** 18).toFixed(6))
        setWMATICReserve(parseFloat((reserves._reserve0._hex) / 10 ** 18).toFixed(4))
      })()

    }
  })




  async function getContract(abi?: Object, contractAddress?: string,): Promise<any> {
    try {
      const signer = provider.getSigner(accounts[0])
      const contract = new Contract(contractAddress, abi, signer)
      return contract
    } catch (e) {
      console.log(e)
    }
  }

  async function getReserve() {
    const cont = await getContract(poolABI, poolAddress)
    const { _reserve0, _reserve1 } = await cont.getReserves()
    return { _reserve0, _reserve1 }
  }

  async function getStakedToken() {
    const cont = await getContract(minichefABI, minichefV2)
    const { amount, rewardDebt } = await cont.userInfo(poolIndex, accounts[0])
    return { amount, rewardDebt };
  }

  async function getQuote(amtA, rsrvA, rsrvB) {
    const cont = await getContract(routerABI, routerAddress)
    const res = await cont.quote(amtA, rsrvA, rsrvB)
    return res
  }

  async function getAmountOut(amtA, rsrvA, rsrvB) {
    const cont = await getContract(routerABI, routerAddress)
    const res = await cont.getAmountOut(amtA, rsrvA, rsrvB)
    return res
  }

  async function getSLPBalance() {
    const cont = await getContract(poolABI, WmaticWethPoolAddress)
    const amount = await cont.balanceOf(accounts[0])
    return amount
  }

  async function handleAmounts(e) {
    if (e.target.value != "") {
      const reserves = await getReserve();
      setTimeout(async () => {
        if (e.target.name == "bbc-amount") { //tokenA - matic , tokenB - bbc
          const quotes = await getQuote(parseEther(e.target.value), reserves._reserve1, reserves._reserve0)
          setAmountA(formatEther(quotes));
        } else {
          const quotes = await getQuote(parseEther(e.target.value), reserves._reserve0, reserves._reserve1)
          setAmountB(formatEther(quotes))
        }
      }, 1500)
    }


  }

  async function handleAddLiqidity(e) {
    try {
      e.preventDefault()
      provider?.getFeeData().then((res) => {
        setGasPrice(res.gasPrice._hex)
      })
      const amountAMin = parseEther(amountA).sub(parseEther(amountA).div(parseEther("0.0000000000000001")))
      const amountBMin = parseEther(amountB).sub(parseEther(amountB).div(parseEther("0.0000000000000001")))
      const BBCcontract = await getContract(tokenABI, BBC);
      await BBCcontract.approve(routerAddress, parseEther(amountB), { gasPrice: gasPrice });
      const cont = await getContract(routerABI, routerAddress)

      const res = await cont.addLiquidityETH(
        BBC,
        parseEther(amountB),
        amountBMin,
        amountAMin,
        accounts[0],
        parseInt(Date.now() / 1000), { gasPrice: gasPrice, value: parseEther(amountA) })
      console.log(res)
    } catch (e) {
      console.log(e)
    }
  }

  async function handleSwap(e) {
    try {
      e.preventDefault()
      provider?.getFeeData().then((res) => {
        console.log("res ", res)
        setGasPrice(res.gasPrice._hex)
      })
      const cont = await getContract(routerABI, routerAddress)
      if (tokenSwap == "BBC") {

        let path = [WMATIC, BBC];

        const res = cont.swapExactETHForTokens(
          parseEther(swapAmountB),
          path,
          accounts[0],
          parseInt(Date.now() / 1000),
          { gasPrice: gasPrice, value: parseEther(swapAmountA) });
        console.log(res)

      } else {

        const BBCcontract = await getContract(tokenABI, BBC);
        await BBCcontract.approve(routerAddress, parseEther(swapAmountA));

        let path = [BBC, WMATIC];

        const res = cont.swapExactTokensForETH(
          parseEther(swapAmountA),
          parseEther(swapAmountB),
          path,
          accounts[0],
          parseInt(Date.now() / 1000),
          { gasPrice: gasPrice });
        console.log(res)
      }


    } catch (e) {
      console.log(e)
    }
  }

  async function handleSwapAmounts(e) {
    if (e.target.value != "") {

      const reserves = await getReserve();
      console.log(reserves)
      if (tokenSwap == "MATIC") {
        const quotes = await getAmountOut(parseEther(e.target.value), reserves._reserve1, reserves._reserve0)
        setSwapAmountB(formatEther(quotes._hex));
      } else {
        const quotes = await getAmountOut(parseEther(e.target.value), reserves._reserve0, reserves._reserve1)
        setSwapAmountB(formatEther(quotes._hex));
      }
    }
  }

  async function tokenSelect(e) {
    if (e.target.value == "MATIC") {
      setTokenSwap("BBC")
    } else {
      setTokenSwap("MATIC")
    }
  }

  async function handleStake(e) {
    try {
      e.preventDefault();
      provider?.getFeeData().then((res) => {
        console.log("res ", res)
        setGasPrice(res.gasPrice._hex)
      })
      const Poolcont = await getContract(poolABI, WmaticWethPoolAddress)
      console.log("🚀 ~ file: wallet.tsx:223 ~ handleStake ~ Poolcont:", Poolcont)
      await Poolcont.approve(minichefV2, parseEther(stakeAmount))
      console.log("🚀 ~ file: wallet.tsx:225 ~ handleStake ~ Poolcont:", Poolcont)
      const cont = await getContract(minichefABI, minichefV2)
      console.log("🚀 ~ file: wallet.tsx:227 ~ handleStake ~ cont:", cont)
      const res = await cont.deposit(poolIndex, parseEther(stakeAmount), accounts[0], { gasPrice: gasPrice })
      console.log("🚀 ~ file: wallet.tsx:229 ~ handleStake ~ res:", res)
      //console.log(res)
    } catch (e) {
      console.log(e)
    }
  }

  async function handleUnStake(e) {
    try {
      e.preventDefault();
      provider?.getFeeData().then((res) => {
        console.log("res ", res)
        setGasPrice(res.gasPrice._hex)
      })
      const cont = await getContract(minichefABI, minichefV2)
      const res = await cont.withdraw(poolIndex, parseEther(unStakeAmount), accounts[0], { gasPrice: gasPrice })
      console.log(res)
    } catch (e) {
      console.log(e)
    }
  }


  return (
    <>
      <Head>
        <title>Sushi Swap</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <center> {isActive == false ? <button onClick={() => {
          metaMask.activate(appchainID)
        }}>connect</button> : <button
          onClick={() => {
            if (metaMask?.deactivate) {
              void metaMask.deactivate()
            } else {
              void metaMask.resetState()
            }
          }}
        >
          Disconnect
        </button>}</center>
        <h1>Metamask is {isActive == true ? "Enabled" : "Not Enabled"}</h1>
        <h1>chain id is {chainId} </h1>
        <h1>Add Liquidity</h1>
        <div>
          <center>
            <form id="add-liquidity-form" onSubmit={handleAddLiqidity}>
              <label htmlFor="bbc-amount">Amount of BBC Tokens to Add:</label><br></br>
              <input type="number" name="bbc-amount" id="bbc-amount" onChange={e => setAmountB(e.target.value)} onKeyUp={handleAmounts} value={amountB} required />
              <br></br>
              <br></br>
              <label htmlFor="matic-amount">Amount of Matic to Add:</label><br></br>
              <input type="number" name="matic-amount" id="matic-amount" onChange={e => setAmountA(e.target.value)} onKeyUp={handleAmounts} value={amountA} required />
              <br></br><br></br>
              <button type="submit">Add Liquidity</button>
              <br></br>
            </form>
          </center>
        </div>
        <br></br>

        <br></br>
        <h1>Swap</h1>
        <div>
          <form id="add-liquidity-form" onSubmit={handleSwap}>
            <center>
              <label htmlFor="swap-token1">Select Token which you want to swap </label>
              <br></br>
              <select name="token1" id="token1" onChange={tokenSelect}>
                <option value="MATIC" defaultValue>MATIC</option>
                <option value="BBC" >BBC</option>
              </select>
              <input type="number" name="amount1" id="amount1" value={swapAmountA} onChange={e => setSwapAmountA(e.target.value)} onKeyUp={handleSwapAmounts} required />
              <br></br>
              <br></br>
              <label htmlFor="swap-token2">Amount of {tokenSwap} </label><br></br>
              <input type="number" name="amount2" id="amount2" value={swapAmountB} readOnly />
              <br></br>
              <button type="submit">swap</button>
              <br></br>
            </center>
          </form>
        </div>
        <br></br>

        <h1>This SLP is belongs to WMatic and  WETH pool </h1>
        <h1>Pool address {WmaticWethPoolAddress}</h1>
        <div>
          <form id="stake-form" onSubmit={handleStake}>
            <label htmlFor="lp-amount">Amount of LP Tokens to Stake:</label>
            <input type="number" name="lp-amount" id="lp-amount" min="0" required value={stakeAmount} onChange={e => setStakeAmount(e.target.value)} />
            <button type="submit">Stake LP Tokens</button>
          </form>
        </div>
        <br></br>
        <div>
          <form id="unstake-form" onSubmit={handleUnStake}> <label htmlFor="unstaked-amount">Amount of Staked LP Tokens to Unstake:</label> <input
            type="number" name="unstaked-amount" id="unstaked-amount" required value={unStakeAmount} onChange={e => setUnStakeAmount(e.target.value)} /> <button
              type="submit">Unstake LP Tokens</button> </form>
        </div>
        <br></br>
        <h2>Current BBC Price: <span id="bbc-price"></span>{wmaticPrice} Matic</h2>
        <h2>Current BBC Liquidity: <span id="bbc-liquidity"></span> {BBCReserve} BBC</h2>
        <h2>Current Matic Liquidity: <span id="matic-liquidity"></span> {WMATICReserve} Matic</h2>
        <h2>My Staked LP Tokens: <span id="staked-lp-tokens">{stakedTokenAmount}</span></h2>
        <h2>My Unstaked LP Tokens: <span id="unstaked-lp-tokens">{unStakedTokenAmount}</span></h2>
      </main>
    </>
  )
}
