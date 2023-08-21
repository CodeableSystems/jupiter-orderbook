import { useCallback, useEffect, useState } from "react"

export interface Order {
  maker: string
  inputMint: string
  outputMint: string
  oriInAmount: string
  oriOutAmount: string
  inAmount: string
  outAmount: string
  expiredAt: string
  base: string
}
export type BidType = {
  price: number
  size: number
  percentage: number
}
export interface Orderbook {
  orderbook: BidType[]
}
/**
 * This orderbook is for the Jupiter exchange
 * and is built for the SCOIN/USDC pair
 *
 * @returns {asks, bids, priceUSDC, scoinFor1USDC, fetchOrderbook}
 */

export default function useJupiterOrderbook(TOKEN:string, STABLE:string, AMOUNT:number, TOKEN_DECIMALS:number, STABLE_DECIMALS:number) {
  const [orderbook, setOrderbook] = useState<Orderbook>()
  const [asks, setBids] = useState<BidType[]>([])
  const [bids, setbids] = useState<BidType[]>([])
  const [priceUSDC, setPriceUSDC] = useState<number>(0)
  const [tokensfor1USDC, setScoinFor1USDC] = useState<number>(0)

  // assuming SCOIN/USDC pair and that bids are in SCOIN and asks are in USDC
  const asksUrl = `https://jup.ag/api/limit/v1/openOrders?outputMint=${TOKEN}&inputMint=${STABLE}`
  const bidsUrl = `https://jup.ag/api/limit/v1/openOrders?outputMint=${STABLE}&inputMint=${TOKEN}`

  const currentPriceUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${STABLE}&outputMint=${TOKEN}&amount=${AMOUNT}&slippageBps=50&onlyDirectRoutes=false&experimentalDexes=Jupiter LO`

  const fetchOrderbook = useCallback(async () => {
    const currentPriceResponse = await fetch(currentPriceUrl)
    const currentPriceJson = await currentPriceResponse.json()
    const intermediatePrice = Math.floor(Number(currentPriceJson.outAmount) / TOKEN_DECIMALS)
    const priceUSDC = STABLE_DECIMALS / intermediatePrice / STABLE_DECIMALS
    setScoinFor1USDC(intermediatePrice)
    setPriceUSDC(priceUSDC)
    const orderbook: BidType[] = []
    const askresponse = await fetch(asksUrl)
    const askOrders = await askresponse.json()
    const now = new Date().getTime() / 1000

    for (let order of askOrders) {
      if (order.account.expiredAt !== null && order.account.expiredAt < now) continue

      const scoinPerUSDC = Number(order.account.outAmount) / TOKEN_DECIMALS
      order.size = Math.floor((Number(order.account.inAmount) / STABLE_DECIMALS) * scoinPerUSDC)

      const intermediatePrice = (scoinPerUSDC / Number(order.account.inAmount)) * STABLE_DECIMALS
      order.price = STABLE_DECIMALS / intermediatePrice / STABLE_DECIMALS

      orderbook.push(order)
    }

    const bidresponse = await fetch(bidsUrl)
    const bidOrders = await bidresponse.json()

    for (let order of bidOrders) {
      if (order.account.expiredAt !== null && order.account.expiredAt < now) continue
      order.size = Number(order.account.inAmount) / TOKEN_DECIMALS
      const scoinPerUSDC = Number(order.account.outAmount) / STABLE_DECIMALS
      order.price = (scoinPerUSDC / Number(order.account.inAmount)) * TOKEN_DECIMALS

      orderbook.push(order)
    }
    let asks = orderbook.filter((order) => order.price > priceUSDC).sort((a, b) => a.price - b.price)
    let bids = orderbook.filter((order) => order.price < priceUSDC).sort((a, b) => b.price - a.price)
    let totalSizeBids = asks.reduce((a, b) => a + b.size, 0)
    let totalSizebids = bids.reduce((a, b) => a + b.size, 0)
    let size = 0
    asks = asks.map((ask) => {
      size += ask.size
      ask.percentage = (size / totalSizeBids) * 100
      return ask
    })
    size = 0
    bids.map((bid) => {
      size += bid.size
      bid.percentage = (size / totalSizebids) * 100
      return bid
    })

    setOrderbook(askOrders)
    setBids(asks)
    setbids(bids)
  }, [asksUrl, bidsUrl, currentPriceUrl]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrderbook()
    }, 3000)
    return () => clearInterval(interval)
  }, [asksUrl, bidsUrl, currentPriceUrl, TOKEN_DECIMALS, STABLE_DECIMALS])

  return { asks, bids, priceUSDC, tokensfor1USDC, fetchOrderbook }
}

