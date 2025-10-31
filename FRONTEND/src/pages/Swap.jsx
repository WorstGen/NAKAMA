import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Cog6ToothIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { createJupiterApiClient } from '@jup-ag/api';

const TOKEN_VAULTS_AFFILIATE = {
  "So11111111111111111111111111111111111111112": "9hCLuXrQrHCU9i7y648Nh7uuWKHUsKDiZ5zyBHdZPWtG",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "6NqvoPpSYCPEtLEukQaSNs7mS3yK6k285saH9o3vgC96",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "5LmFGjbae5iWejFVT8UiRLggh1me22nTetmere8SjwKy",
  "3JgFwoYV74f6LwWjQWnr3YDPFnmBdwQfNyubv99jqUoq": "6NqvoPpSYCPEtLEukQaSNs7mS3yK6k285saH9o3vgC96",
  "he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A": "9hCLuXrQrHCU9i7y648Nh7uuWKHUsKDiZ5zyBHdZPWtG",
  "B5WTLaRwaUQpKk7ir1wniNB6m5o8GgMrimhKMYan2R6B": "3qGSU2RySrjvQ2iGMts2HZ4ssGVSrBUSGL4jN7LHGhgo",
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
  { mint: "So11111111111111111111111111111111111111112", name: "SOL", symbol: "SOL" },
  { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", name: "USDC", symbol: "USDC" },
  { mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", name: "USDT", symbol: "USDT" },
  { mint: "3JgFwoYV74f6LwWjQWnr3YDPFnmBdwQfNyubv99jqUoq", name: "wPOND", symbol: "wPOND" },
  { mint: "he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A", name: "hSOL", symbol: "hSOL" },
  { mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", name: "mSOL", symbol: "mSOL" },
  { mint: "B5WTLaRwaUQpKk7ir1wniNB6m5o8GgMrimhKMYan2R6B", name: "PepeOnSOL", symbol: "Pepe" },
];

const SLIPPAGE_PRESETS = [0.1, 0.5, 1.0, 2.0];

export const Swap = () => {
  const { isAuthenticated, user } = useAuth();
  
  const [inputMint, setInputMint] = useState("So11111111111111111111111111111111111111112");
  const [outputMint, setOutputMint] = useState("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [status, setStatus] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [platformFeeBps] = useState(100);
  const [slippageBps, setSlippageBps] = useState(100);
  const [customSlippage, setCustomSlippage] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [solanaWeb3, setSolanaWeb3] = useState(null);
  const [connection, setConnection] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [jupiterApi, setJupiterApi] = useState(null);

  const walletAddress = user?.wallets?.solana?.address;

  // Debug logging
  useEffect(() => {
    console.log('Swap Page Debug:', {
      isAuthenticated,
      hasUser: !!user,
      walletAddress,
      solanaWeb3Available: !!solanaWeb3,
      connectionAvailable: !!connection,
      jupiterApiAvailable: !!jupiterApi
    });
  }, [isAuthenticated, user, walletAddress, solanaWeb3, connection, jupiterApi]);

  useEffect(() => {
    const loadSolanaWeb3 = async () => {
      try {
        console.log('Loading Solana Web3...');
        const web3 = await import('@solana/web3.js');
        setSolanaWeb3(web3);
        const conn = new web3.Connection("https://api.mainnet-beta.solana.com", 'confirmed');
        setConnection(conn);
        
        // Initialize Jupiter API
        console.log('Initializing Jupiter API...');
        const jupApi = createJupiterApiClient();
        setJupiterApi(jupApi);
        
        console.log('Solana Web3 and Jupiter API loaded successfully');
      } catch (error) {
        console.error("Failed to load Solana Web3:", error);
        toast.error("⚠️ Failed to load Solana libraries");
      }
    };
    loadSolanaWeb3();
  }, []);

  const updateBalance = useCallback(async () => {
    if (!walletAddress || !connection || !solanaWeb3) {
      console.log('Cannot update balance:', { walletAddress, connection: !!connection, solanaWeb3: !!solanaWeb3 });
      return;
    }

    setLoadingBalance(true);
    try {
      console.log('Fetching balance for:', walletAddress, 'Token:', inputMint);
      let bal = 0;
      if (inputMint === "So11111111111111111111111111111111111111112") {
        const lamports = await connection.getBalance(new solanaWeb3.PublicKey(walletAddress));
        bal = lamports / 1e9;
        console.log('SOL balance:', bal);
      } else {
        const accounts = await connection.getParsedTokenAccountsByOwner(
          new solanaWeb3.PublicKey(walletAddress),
          { mint: new solanaWeb3.PublicKey(inputMint) }
        );
        if (accounts.value.length > 0) {
          bal = accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
          console.log('Token balance:', bal);
        } else {
          console.log('No token account found');
        }
      }
      setBalance(bal);
    } catch (err) {
      console.error("Error fetching balance:", err);
      setBalance(0);
      toast.error("Failed to fetch balance");
    } finally {
      setLoadingBalance(false);
    }
  }, [walletAddress, connection, solanaWeb3, inputMint]);

  const getEstimate = useCallback(async () => {
    const uiAmount = parseFloat(amount);
    if (!uiAmount || uiAmount <= 0 || !jupiterApi) {
      setEstimate(null);
      return;
    }

    const decimals = TOKEN_DECIMALS[inputMint] || 6;
    const amountLamports = Math.floor(uiAmount * 10 ** decimals);

    try {
      console.log('Fetching quote from Jupiter API...', {
        inputMint,
        outputMint,
        amount: amountLamports.toString(),
        slippageBps
      });
      
      const quote = await jupiterApi.quoteGet({
        inputMint,
        outputMint,
        amount: amountLamports.toString(), // Must be string
        slippageBps,
      });
      
      console.log('Quote received:', quote);
      const outDecimals = TOKEN_DECIMALS[outputMint] || 6;
      const estimatedAmount = (parseInt(quote.outAmount) / 10 ** outDecimals).toFixed(6);
      console.log('Estimated output:', estimatedAmount);
      setEstimate(estimatedAmount);
    } catch (err) {
      console.error("Error getting estimate:", err);
      console.error("Full error:", JSON.stringify(err, null, 2));
      setEstimate(null);
      toast.error("Failed to get price estimate");
    }
  }, [amount, inputMint, outputMint, slippageBps, jupiterApi]);

  useEffect(() => {
    if (walletAddress && connection && solanaWeb3) {
      console.log('Triggering balance update...');
      updateBalance();
    }
  }, [inputMint, walletAddress, connection, solanaWeb3, updateBalance]);

  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      getEstimate();
    } else {
      setEstimate(null);
    }
  }, [amount, getEstimate]);

  const executeSwap = async () => {
    if (!walletAddress || !solanaWeb3 || !connection || !jupiterApi) {
      toast.error("❌ Wallet not connected or Jupiter API not ready!");
      return;
    }

    if (!window.solana || !window.solana.signTransaction) {
      toast.error("❌ Phantom wallet not available");
      return;
    }

    const uiAmount = parseFloat(amount);
    if (!uiAmount || uiAmount <= 0) {
      toast.error("❌ Enter a valid amount");
      return;
    }

    const decimals = TOKEN_DECIMALS[inputMint] || 6;
    const amountLamports = Math.floor(uiAmount * 10 ** decimals);
    const referralVault = TOKEN_VAULTS_AFFILIATE[inputMint];

    if (!referralVault) {
      const tokenName = TOKENS.find(t => t.mint === inputMint)?.name || 'this token';
      toast.error(`⚠️ No vault available for ${tokenName}`);
      return;
    }

    setIsSwapping(true);
    setStatus("⏳ Preparing transaction...");

    try {
      // Get quote using Jupiter API
      console.log('Getting quote from Jupiter API...', {
        inputMint,
        outputMint,
        amount: amountLamports.toString(),
        slippageBps
      });
      
      const quote = await jupiterApi.quoteGet({
        inputMint,
        outputMint,
        amount: amountLamports.toString(), // Must be string
        slippageBps,
      });

      console.log('Quote received:', quote);
      setStatus("⏳ Building transaction...");

      // Get swap transaction using Jupiter API
      const swapResult = await jupiterApi.swapPost({
        swapRequest: {
          userPublicKey: walletAddress,
          quoteResponse: quote,
          wrapAndUnwrapSol: true,
          feeAccount: referralVault,
          prioritizationFeeLamports: "auto",
        },
      });

      console.log('Swap result received');

      if (!swapResult.swapTransaction) {
        throw new Error("No swapTransaction returned from Jupiter API");
      }

      const tx = solanaWeb3.VersionedTransaction.deserialize(
        Uint8Array.from(atob(swapResult.swapTransaction), c => c.charCodeAt(0))
      );

      setStatus("⏳ Please approve transaction in wallet...");
      const signedTx = await window.solana.signTransaction(tx);

      setStatus("⏳ Sending transaction...");
      const sig = await connection.sendRawTransaction(signedTx.serialize());

      setStatus(`⏳ Confirming transaction... ${sig.slice(0, 8)}...`);

      await connection.confirmTransaction(sig, "confirmed");

      toast.success("✅ Swap successful!");
      setStatus(`✅ Swap successful!`);
      setAmount("");
      await updateBalance();

      setTimeout(() => {
        window.open(`https://solscan.io/tx/${sig}`, '_blank');
      }, 500);

    } catch (err) {
      console.error("Swap error:", err);
      console.error("Full error:", JSON.stringify(err, null, 2));
      const errorMsg = err.message || "Transaction failed";
      toast.error(`❌ ${errorMsg}`);
      setStatus(`❌ ${errorMsg}`);
    } finally {
      setIsSwapping(false);
    }
  };

  const swapTokens = () => {
    const temp = inputMint;
    setInputMint(outputMint);
    setOutputMint(temp);
  };

  const setMaxAmount = () => {
    if (balance !== null) {
      const maxAmount = inputMint === "So11111111111111111111111111111111111111112" 
        ? Math.max(0, balance - 0.01) 
        : balance;
      setAmount(maxAmount.toString());
    }
  };

  const handleSlippageChange = (value) => {
    const bps = Math.floor(value * 100);
    setSlippageBps(bps);
    setCustomSlippage("");
  };

  const handleCustomSlippageChange = (e) => {
    const value = e.target.value;
    setCustomSlippage(value);
    if (value && !isNaN(value)) {
      const bps = Math.floor(parseFloat(value) * 100);
      setSlippageBps(bps);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg mb-4">Please connect your wallet to use the swap feature.</p>
          <p className="text-gray-400">Click "Connect Wallet" in the header to get started.</p>
        </div>
      </div>
    );
  }

  if (!solanaWeb3 || !connection || !jupiterApi) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p>Loading Swap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-xl mx-auto px-4">
        {/* Warning Banner */}
        {showWarning && (
          <div className="mb-4 bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-red-500/50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-200 text-sm font-semibold">
                  ⚠️ Use at your own risk. No warranties or guarantees provided.
                </p>
              </div>
              <button
                onClick={() => setShowWarning(false)}
                className="text-red-300 hover:text-red-100 text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl p-6 shadow-2xl">
          {/* Header with Settings */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Token Swap
            </h1>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Settings"
            >
              <Cog6ToothIcon className="w-6 h-6 text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* Debug Info */}
          {walletAddress && (
            <div className="mb-4 text-xs text-gray-500">
              Connected: {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <div className="mb-6 bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Cog6ToothIcon className="w-5 h-5" />
                Slippage Settings
              </h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  {SLIPPAGE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleSlippageChange(preset)}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                        slippageBps === preset * 100 && !customSlippage
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customSlippage}
                    onChange={handleCustomSlippageChange}
                    placeholder="Custom"
                    step="0.1"
                    min="0"
                    max="50"
                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-400">
                  Current slippage: {(slippageBps / 100).toFixed(2)}%
                </p>
              </div>
            </div>
          )}

          {/* From Token */}
          <div className="mb-4">
            <label className="block text-gray-400 text-sm font-medium mb-2">You Pay</label>
            <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors">
              <div className="flex justify-between items-center mb-3">
                <select
                  value={inputMint}
                  onChange={(e) => setInputMint(e.target.value)}
                  className="bg-gray-700/50 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 font-semibold"
                >
                  {TOKENS.map(token => (
                    <option key={token.mint} value={token.mint}>{token.symbol}</option>
                  ))}
                </select>
                {loadingBalance ? (
                  <span className="text-gray-400 text-sm">Loading...</span>
                ) : balance !== null ? (
                  <div className="text-right">
                    <span className="text-gray-400 text-sm block">
                      Balance: {balance.toFixed(6)}
                    </span>
                    <button
                      onClick={setMaxAmount}
                      className="text-blue-400 text-xs hover:text-blue-300 underline font-medium"
                    >
                      MAX
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm">No balance</span>
                )}
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.000001"
                className="w-full bg-transparent text-white text-3xl font-bold focus:outline-none placeholder-gray-600"
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center my-3">
            <button
              onClick={swapTokens}
              className="bg-gradient-to-br from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white p-3 rounded-xl border border-gray-600 hover:border-gray-500 transition-all shadow-lg hover:shadow-xl"
              aria-label="Swap tokens"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* To Token */}
          <div className="mb-6">
            <label className="block text-gray-400 text-sm font-medium mb-2">You Receive</label>
            <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors">
              <select
                value={outputMint}
                onChange={(e) => setOutputMint(e.target.value)}
                className="bg-gray-700/50 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 font-semibold mb-3"
              >
                {TOKENS.map(token => (
                  <option key={token.mint} value={token.mint}>{token.symbol}</option>
                ))}
              </select>
              <div className="text-3xl font-bold text-gray-300">
                {estimate ? `≈ ${estimate}` : '—'}
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <button
            onClick={executeSwap}
            disabled={isSwapping || !amount || parseFloat(amount) <= 0 || balance === null}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none text-lg"
          >
            {isSwapping ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Swapping...
              </span>
            ) : "Swap Tokens"}
          </button>

          {/* Status Message */}
          {status && (
            <div className={`mt-4 p-4 rounded-xl text-sm font-medium ${
              status.includes('✅') ? 'bg-green-900/30 border border-green-500/50 text-green-300' :
              status.includes('❌') ? 'bg-red-900/30 border border-red-500/50 text-red-300' :
              status.includes('⚠️') ? 'bg-yellow-900/30 border border-yellow-500/50 text-yellow-300' :
              'bg-blue-900/30 border border-blue-500/50 text-blue-300'
            }`}>
              {status}
            </div>
          )}

          {/* Info Footer */}
          <div className="mt-6 pt-4 border-t border-gray-700/50 space-y-3">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Platform Fee: {(platformFeeBps / 100).toFixed(2)}%</span>
              <span>Slippage: {(slippageBps / 100).toFixed(2)}%</span>
            </div>
            
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-300 text-xs font-medium mb-1">
                    Powered by Jupiter Aggregator
                  </p>
                  <p className="text-blue-400/80 text-xs">
                    This swap uses Pond0x's Jupiter referral code. A portion of fees support Pond0x development.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 text-center">
              Wallet: {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
