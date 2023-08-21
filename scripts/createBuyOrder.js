import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import fetch from 'cross-fetch';
import { Wallet } from '@project-serum/anchor';
import bs58 from 'bs58';

// Use your own RPC endpoint. This one points to the Solana mainnet cluster and cannot be used for production.
const connection = new Connection('https://api.mainnet-beta.solana.com');

let wallets=[
  // your private keys here, two wallets. Referrals are optional, but you can get referral fees if you provide them
]

const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(wallets[0])));
const referral = new Wallet(Keypair.fromSecretKey(bs58.decode(wallets[1])));

const inputMint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";//USDC
const outputMint="5qKDWkBejLtRh1UGFV7e58QEkdn2fRyH5ehVXqUYujNW";//SCOIN

// Base key are used to generate a unique order id
const base = Keypair.generate();

const getCurrentPrice = await fetch("https://quote-api.jup.ag/v6/quote?inputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&outputMint=5qKDWkBejLtRh1UGFV7e58QEkdn2fRyH5ehVXqUYujNW&amount=1000000&slippageBps=50&onlyDirectRoutes=false&experimentalDexes=Jupiter LO")
const currentPrice = await getCurrentPrice.json()

const dollarAmount=50; // amount in USDC

// get serialized transactions
const transactions = await (
  await fetch('https://jup.ag/api/limit/v1/createOrder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      owner: wallet.publicKey.toString(),
      inAmount: currentPrice.inAmount*dollarAmount,
      outAmount: ((currentPrice.outAmount/100)*101.5)*dollarAmount,
      inputMint: inputMint.toString(),
      outputMint: outputMint.toString(),
      expiredAt: null,// or add an expiration date in unix timestamp format
      base: base.publicKey.toString(),
      // referralAccount and name are both optional
      // provide both to get referral fees
      //referralAccount: referral.publicKey.toString(),
      //referralName: "your name"
    })
  })
).json();

const { tx } = transactions;
// deserialize the transaction
const transactionBuf = Buffer.from(tx, 'base64');
var transaction = VersionedTransaction.deserialize(transactionBuf);

// sign the transaction using the required key
// for create order, wallet and base key are required.
transaction.sign([wallet.payer, base]);

// Execute the transaction
const rawTransaction = transaction.serialize()
const txid = await connection.sendRawTransaction(rawTransaction, {
  skipPreflight: true,
  maxRetries: 2
});

await connection.confirmTransaction(txid);

console.log(`https://solscan.io/tx/${txid}`);

