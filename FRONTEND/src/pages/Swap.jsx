import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';

const TOKEN_VAULTS_AFFILIATE = {
  "So11111111111111111111111111111111111111112": "9hCLuXrQrHCU9i7y648Nh7uuWKHUsKDiZ5zyBHdZPWtG",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "6NqvoPpSYCPEtLEukQaSNs7mS3yK6k285saH9o3vgC96",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "5LmFGjbae5iWejFVT8UiRLggh1me22nTetmere8SjwKy",
  "3JgFwoYV74f6LwWjQWnr3YDPFnmBdwQfNyubv99jqUoq": "6NqvoPpSYCPEtLEukQaSNs7mS3yK6k285saH9o3vgC96",
  "he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A": "9hCLuXrQrHCU9i7y648Nh7uuWKHUsKDiZ5zyBHdZPWtG",
  "B5WTLaRwaUQpKk7ir1wniNB6m5o8GgMrimhKMYan2R6B": "3qGSU2RySrjvQ2iGMts2HZ4ssGVSrBUSGL4jN7LHGhgo",
};

const TOKEN_NAMES = {
  "So11111111111111111111111111111111111111112": "SOL",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
  "3JgFwoYV74f6LwWjQWnr3YDPFnmBdwQfNyubv99jqUoq": "wPOND",
  "he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A": "hSOL",
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": "mSOL",
  "B5WTLaRwaUQpKk7ir1wniNB6m5o8GgMrimhKMYan2R6B": "PepeOnSOL"
};

const TOKEN_DECIMALS = {
  "So11111111111111111111111111111111111111112": 9,
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": 6,
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": 6,
  "3JgFwoYV74f6LwWjQWnr3YDPFnmBdwQfNyubv99jqUoq": 9,
  "he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A": 9,
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": 9,
  "B5WTLaRwaUQpKk7ir1wniNB6m5o8GgMrimhKMYan2R6B": 6,
};

const TOKENS = [
  { mint: "So11111111111111111111111111111111111111112", name: "SOL" },
  { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", name: "USDC" },
  { mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", name: "USDT" },
  { mint: "3JgFwoYV74f6LwWjQWnr3YDPFnmBdwQfNyubv99jqUoq", name: "wPOND" },
  { mint: "he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A", name: "hSOL" },
  { mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", name: "mSOL" },
  { mint: "B5WTLaRwaUQpKk7ir1wniNB6m5o8GgMrimhKMYan2R6B", name: "PepeOnSOL" },
];

export const Swap = () => {
  const [inputMint, setInputMint] = useState("So11111111111111111111111111111111111111112");
  const [outputMint, setOutputMint] = useState("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [status, setStatus] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [platformFeeBps] = useState(100);
  const [slippageBps] = useState(100);

  const connection = new Connection("https://api.mainnet-beta.solana.com", 'confirmed');

  useEffect(() => {
    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (isConnected) {
      updateBalance();
    }
  }, [inputMint, isConnected]);

  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      getEstimate();
    } else {
      setEstimate(null);
    }
  }, [amount, inputMint, outputMint, slippageBps, platformFeeBps]);

  const checkWalletConnection = async () => {
    if (window.solana?.isConnected) {
      const pubKey = window.solana.publicKey.toBase58();
      setWalletAddress(pubKey);
      setIsConnected(true);
      await updateBalance();
    }
  };

  const connectWallet = async () => {
    if (!window.solana) {
      setStatus("⚠️ No Solana wallet detected! Please install Phantom or Solflare.");
      return;
    }

    try {
      const resp = await window.solana.connect();
      const pubKey = resp.publicKey.toBase58();
      setWalletAddress(pubKey);
      setIsConnected(true);
      setStatus(`✅ Connected: ${pubKey.slice(0, 4)}...${pubKey.slice(-4)}`);
      await updateBalance();
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
  };

  const disconnectWallet = async () => {
    if (window.solana?.isConnected) {
      await window.solana.disconnect();
    }
    setWalletAddress("");
    setIsConnected(false);
    setBalance(null);
    setStatus("Disconnected");
  };

  const updateBalance = async () => {
    if (!walletAddress) return;

    try {
      let bal = 0;
      if (inputMint === "So11111111111111111111111111111111111111112") {
        bal = (await connection.getBalance(new PublicKey(walletAddress))) / 1e9;
      } else {
        const accounts = await connection.getParsedTokenAccountsByOwner(
          new PublicKey(walletAddress),
          { mint: new PublicKey(inputMint) }
        );
        if (accounts.value.length > 0) {
          bal = accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        }
      }
      setBalance(bal);
    } catch (err) {
      console.error("Error fetching balance:", err);
      setBalance(0);
    }
  };

  const getEstimate = async () => {
    const uiAmount = parseFloat(amount);
    if (!uiAmount || uiAmount <= 0) return;

    const decimals = TOKEN_DECIMALS[inputMint] || 6;
    const amountLamports = Math.floor(uiAmount * 10 ** decimals);

    const url = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=${slippageBps}&platformFeeBps=${platformFeeBps}`;

    try {
      const quote = await fetch(url).then(r => r.json());
      const outDecimals = TOKEN_DECIMALS[outputMint] || 6;
      setEstimate((quote.outAmount / 10 ** outDecimals).toFixed(6));
    } catch (err) {
      console.error("Error getting estimate:", err);
      setEstimate(null);
    }
  };

  const executeSwap = async () => {
    if (!walletAddress) {
      setStatus("❌ Connect wallet first!");
      return;
    }

    const uiAmount = parseFloat(amount);
    if (!uiAmount || uiAmount <= 0) {
      setStatus("❌ Enter a valid amount");
      return;
    }

    const decimals = TOKEN_DECIMALS[inputMint] || 6;
    const amountLamports = Math.floor(uiAmount * 10 ** decimals);
    const referralVault = TOKEN_VAULTS_AFFILIATE[inputMint];

    if (!referralVault) {
      setStatus(`⚠️ No vault available for ${TOKEN_NAMES[inputMint]}`);
      return;
    }

    setIsSwapping(true);
    setStatus("⏳ Preparing transaction...");

    const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=${slippageBps}&platformFeeBps=${platformFeeBps}`;

    try {
      const quote = await fetch(quoteUrl).then(r => r.json());

      const swapBody = {
        userPublicKey: walletAddress,
        wrapAndUnwrapSol: true,
        quoteResponse: quote,
        swapMode: "ExactIn",
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
        platformFeeBps: platformFeeBps,
        feeAccount: referralVault
      };

      setStatus("⏳ Building transaction...");

      const res = await fetch("https://lite-api.jup.ag/swap/v1/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(swapBody),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Jupiter API Error (${res.status}): ${errText}`);
      }

      const swapRes = await res.json();

      if (!swapRes.swapTransaction) {
        throw new Error("No swapTransaction returned from API");
      }

      const tx = VersionedTransaction.deserialize(
        Uint8Array.from(atob(swapRes.swapTransaction), c => c.charCodeAt(0))
      );

      setStatus("⏳ Please approve transaction in wallet...");
      const signedTx = await window.solana.signTransaction(tx);

      setStatus("⏳ Sending transaction...");
      const sig = await connection.sendRawTransaction(signedTx.serialize());

      setStatus(`⏳ Confirming transaction... ${sig.slice(0, 8)}...`);

      await connection.confirmTransaction(sig, "confirmed");

      setStatus(`✅ Swap successful!`);
      setAmount("");
      await updateBalance();

      setTimeout(() => {
        window.open(`https://solscan.io/tx/${sig}`, '_blank');
      }, 500);

    } catch (err) {
      console.error("Swap error:", err);
      setStatus(`❌ ${err.message}`);
    } finally {
      setIsSwapping(false);
    }
  };

  const swapTokens = () => {
    const temp = inputMint;
    setInputMint(outputMint);
    setOutputMint(temp);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-xl mx-auto">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-xl">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">Token Swap</h1>

          {/* From Token */}
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">From</label>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <select
                  value={inputMint}
                  onChange={(e) => setInputMint(e.target.value)}
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                >
                  {TOKENS.map(token => (
                    <option key={token.mint} value={token.mint}>{token.name}</option>
                  ))}
                </select>
                {balance !== null && (
                  <span className="text-gray-400 text-sm">
                    Balance: {balance.toFixed(6)}
                  </span>
                )}
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="w-full bg-transparent text-white text-2xl font-semibold focus:outline-none"
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center my-2">
            <button
              onClick={swapTokens}
              className="bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full border border-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* To Token */}
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-medium mb-2">To</label>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <select
                value={outputMint}
                onChange={(e) => setOutputMint(e.target.value)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 mb-2"
              >
                {TOKENS.map(token => (
                  <option key={token.mint} value={token.mint}>{token.name}</option>
                ))}
              </select>
              <div className="text-2xl font-semibold text-gray-400">
                {estimate ? `≈ ${estimate}` : '—'}
              </div>
            </div>
          </div>

          {/* Action Button */}
          {!isConnected ? (
            <button
              onClick={connectWallet}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-colors"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={executeSwap}
                disabled={isSwapping || !amount || parseFloat(amount) <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors"
              >
                {isSwapping ? "Swapping..." : "Swap"}
              </button>
              <button
                onClick={disconnectWallet}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Disconnect ({walletAddress.slice(0, 4)}...{walletAddress.slice(-4)})
              </button>
            </div>
          )}

          {/* Status Message */}
          {status && (
            <div className={`mt-4 p-4 rounded-lg text-sm ${
              status.includes('✅') ? 'bg-green-900/30 border border-green-700 text-green-300' :
              status.includes('❌') ? 'bg-red-900/30 border border-red-700 text-red-300' :
              status.includes('⚠️') ? 'bg-yellow-900/30 border border-yellow-700 text-yellow-300' :
              'bg-blue-900/30 border border-blue-700 text-blue-300'
            }`}>
              {status}
            </div>
          )}

          {/* Info Footer */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Platform Fee: {(platformFeeBps / 100).toFixed(2)}%</span>
              <span>Slippage: {(slippageBps / 100).toFixed(2)}%</span>
            </div>
            <div className="text-xs text-gray-500 text-center mt-2">
              Powered by Jupiter • Pond0x Affiliate
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
