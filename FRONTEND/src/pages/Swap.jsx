import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Cog6ToothIcon, ExclamationTriangleIcon, InformationCircleIcon, UserIcon } from '@heroicons/react/24/outline';
import { createJupiterApiClient } from '@jup-ag/api';
import { useQuery } from 'react-query';
import { api } from '../services/api';

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
const PRIORITY_PRESETS = {
  low: { label: "Low", priorityLevel: "low", description: "Slower, cheaper" },
  medium: { label: "Medium", priorityLevel: "medium", description: "Balanced" },
  high: { label: "High", priorityLevel: "high", description: "Faster, expensive" }
};

const CHUNK_SIZE = 8; // Optimal chunk size for signing and sending
const SEND_DELAY_MS = 200; // Delay between individual transaction sends

export const Swap = () => {
  const { isAuthenticated, user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('swap');
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
  const [priorityFee, setPriorityFee] = useState("medium");
  const [showSettings, setShowSettings] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [solanaWeb3, setSolanaWeb3] = useState(null);
  const [connection, setConnection] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [jupiterApi, setJupiterApi] = useState(null);
  const [repeatCount, setRepeatCount] = useState(1);
  const [showRepeatSettings, setShowRepeatSettings] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, signatures: [] });
  
  const [recipientInput, setRecipientInput] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  const walletAddress = user?.wallets?.solana?.address;

  const { data: contacts } = useQuery('contacts', api.getContacts, {
    enabled: isAuthenticated,
  });

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
        
        const customRpcUrl = process.env.REACT_APP_SOLANA_RPC_URL;
        
        const rpcEndpoints = [
          customRpcUrl,
          "https://api.mainnet-beta.solana.com",
          "https://rpc.ankr.com/solana"
        ].filter(Boolean);
        
        let conn = null;
        for (let i = 0; i < rpcEndpoints.length; i++) {
          const endpoint = rpcEndpoints[i];
          try {
            const testConn = new web3.Connection(endpoint, 'confirmed');
            await testConn.getSlot();
            conn = testConn;
            const rpcName = endpoint.includes('helius') ? 'Helius RPC' : 
                           endpoint.includes('mainnet-beta') ? 'Official Solana RPC' : 
                           endpoint.includes('ankr') ? 'Ankr RPC' : 'Custom RPC';
            console.log(`✅ Connected to: ${rpcName}`);
            
            if (i > 0) {
              console.warn('⚠️ Using fallback RPC endpoint');
              toast('⚠️ Using fallback RPC (may be slower)', { duration: 3000 });
            }
            break;
          } catch (err) {
            const rpcName = endpoint.includes('helius') ? 'Helius' : 
                           endpoint.includes('mainnet-beta') ? 'Official Solana' : 
                           endpoint.includes('ankr') ? 'Ankr' : 'Custom RPC';
            console.warn(`❌ Failed to connect to ${rpcName}:`, err.message);
          }
        }
        
        if (!conn) {
          throw new Error("Failed to connect to any RPC endpoint");
        }
        
        setConnection(conn);
        
        console.log('Initializing Jupiter API...');
        const jupApi = createJupiterApiClient();
        setJupiterApi(jupApi);
        
        console.log('✅ Solana Web3 and Jupiter API loaded successfully');
      } catch (error) {
        console.error("Failed to load Solana Web3:", error);
        toast.error("⚠️ Failed to load Solana libraries");
      }
    };
    loadSolanaWeb3();
  }, []);

  const resolveRecipient = useCallback(async (input) => {
    if (!input || !solanaWeb3) return;
    
    setIsResolvingAddress(true);
    try {
      if (input.startsWith('@')) {
        const username = input.substring(1);
        const response = await api.getUserByUsername(username);
        if (response?.user?.wallets?.solana?.address) {
          setResolvedAddress(response.user.wallets.solana.address);
          toast.success(`Resolved @${username} to address`);
        } else {
          setResolvedAddress(null);
          toast.error(`User @${username} has no Solana address`);
        }
      } else {
        try {
          new solanaWeb3.PublicKey(input);
          setResolvedAddress(input);
        } catch {
          setResolvedAddress(null);
          toast.error('Invalid Solana address');
        }
      }
    } catch (error) {
      console.error('Error resolving recipient:', error);
      setResolvedAddress(null);
      toast.error('Failed to resolve recipient');
    } finally {
      setIsResolvingAddress(false);
    }
  }, [solanaWeb3]);

  useEffect(() => {
    if (activeTab === 'send' && recipientInput) {
      const debounce = setTimeout(() => {
        resolveRecipient(recipientInput);
      }, 500);
      return () => clearTimeout(debounce);
    }
  }, [recipientInput, activeTab, resolveRecipient]);

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
        slippageBps,
        platformFeeBps: 100
      });
      
      const quote = await jupiterApi.quoteGet({
        inputMint,
        outputMint,
        amount: amountLamports.toString(),
        slippageBps,
        platformFeeBps: 100,
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
    if (amount && parseFloat(amount) > 0 && activeTab === 'swap') {
      getEstimate();
    } else {
      setEstimate(null);
    }
  }, [amount, getEstimate, activeTab]);

  const executeSwap = async () => {
    if (!walletAddress || !solanaWeb3 || !connection || !jupiterApi) {
      toast.error("❌ Wallet not connected or Jupiter API not ready!");
      return;
    }

    if (!window.solana || !window.solana.signAllTransactions) {
      toast.error("❌ Phantom wallet not available or doesn't support batch signing");
      return;
    }

    const uiAmount = parseFloat(amount);
    if (!uiAmount || uiAmount <= 0) {
      toast.error("❌ Enter a valid amount");
      return;
    }

    const count = parseInt(repeatCount);
    if (!count || count < 1 || count > 50) {
      toast.error("❌ Repeat count must be between 1 and 50");
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

    let destinationWallet = walletAddress;
    
    if (activeTab === 'send') {
      if (!resolvedAddress) {
        toast.error("❌ Please enter a valid recipient");
        return;
      }
      destinationWallet = resolvedAddress;
    }

    setIsSwapping(true);
    setBatchProgress({ current: 0, total: count, signatures: [] });

    try {
      const totalChunks = Math.ceil(count / CHUNK_SIZE);
      let allSignatures = [];

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const chunkStart = chunkIndex * CHUNK_SIZE;
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, count);
        const chunkCount = chunkEnd - chunkStart;

        setStatus(`⏳ Building transactions ${chunkStart + 1}-${chunkEnd}/${count}...`);

        // Build transactions for this chunk
        const chunkTransactions = [];
        for (let i = 0; i < chunkCount; i++) {
          const txNum = chunkStart + i + 1;
          setStatus(`⏳ Building transaction ${txNum}/${count}...`);

          const quote = await jupiterApi.quoteGet({
            inputMint,
            outputMint,
            amount: amountLamports.toString(),
            slippageBps,
            platformFeeBps: 100,
          });

          const swapRequestBody = {
            userPublicKey: walletAddress,
            quoteResponse: quote,
            wrapAndUnwrapSol: true,
            feeAccount: referralVault,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: {
              priorityLevelWithMaxLamports: {
                maxLamports: 10000000,
                priorityLevel: PRIORITY_PRESETS[priorityFee].priorityLevel
              }
            },
          };

          if (activeTab === 'send' && destinationWallet !== walletAddress) {
            swapRequestBody.destinationTokenAccount = destinationWallet;
          }

          const swapResult = await jupiterApi.swapPost({
            swapRequest: swapRequestBody,
          });

          if (!swapResult.swapTransaction) {
            throw new Error(`No transaction returned for swap ${txNum}`);
          }

          const tx = solanaWeb3.VersionedTransaction.deserialize(
            Uint8Array.from(atob(swapResult.swapTransaction), c => c.charCodeAt(0))
          );

          chunkTransactions.push(tx);
        }

        // Sign all transactions in this chunk
        setStatus(`🔏 Sign chunk ${chunkIndex + 1}/${totalChunks} (${chunkCount} txs) in wallet...`);
        const signedChunk = await window.solana.signAllTransactions(chunkTransactions);

        // Send transactions from this chunk sequentially
        for (let i = 0; i < signedChunk.length; i++) {
          const txNum = chunkStart + i + 1;
          const globalProgress = chunkStart + i + 1;
          
          setBatchProgress(prev => ({ ...prev, current: globalProgress }));
          setStatus(`⏳ Sending ${txNum}/${count}...`);

          try {
            const sig = await connection.sendRawTransaction(signedChunk[i].serialize(), {
              skipPreflight: true,
              maxRetries: 2,
            });

            allSignatures.push(sig);
            setStatus(`⏳ Sent ${txNum}/${count}: ${sig.slice(0, 8)}...`);

            // Start confirmation in background
            connection.confirmTransaction(sig, "confirmed").catch(err => {
              console.warn(`Confirmation warning for tx ${txNum}:`, err.message);
            });

            setBatchProgress(prev => ({ 
              ...prev, 
              signatures: [...prev.signatures, sig] 
            }));

            // Small delay between sends to avoid rate limiting
            if (i < signedChunk.length - 1) {
              await new Promise(resolve => setTimeout(resolve, SEND_DELAY_MS));
            }

          } catch (txError) {
            console.error(`Transaction ${txNum} failed:`, txError);
            toast.error(`⚠️ Tx ${txNum}/${count} failed`);
          }
        }

        // Brief pause between chunks (except after last chunk)
        if (chunkIndex < totalChunks - 1) {
          setStatus(`⏸️ Preparing next chunk... (${chunkEnd}/${count} completed)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successCount = allSignatures.length;
      if (activeTab === 'send') {
        toast.success(`✅ ${successCount}/${count} swap & send${successCount > 1 ? 's' : ''} completed!`);
        setStatus(`✅ Completed ${successCount}/${count} swap & sends!`);
      } else {
        toast.success(`✅ ${successCount}/${count} swap${successCount > 1 ? 's' : ''} completed!`);
        setStatus(`✅ Completed ${successCount}/${count} swaps!`);
      }
      
      await updateBalance();

      if (allSignatures.length > 0) {
        setTimeout(() => {
          window.open(`https://solscan.io/tx/${allSignatures[0]}`, '_blank');
        }, 500);
      }

    } catch (err) {
      console.error("Batch swap error:", err);
      const errorMsg = err.message || "Batch transaction failed";
      toast.error(`❌ ${errorMsg}`);
      setStatus(`❌ ${errorMsg}`);
    } finally {
      setIsSwapping(false);
      setTimeout(() => {
        setBatchProgress({ current: 0, total: 0, signatures: [] });
      }, 5000);
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

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('swap')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'swap'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Swap to Self
            </button>
            <button
              onClick={() => setActiveTab('send')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'send'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <UserIcon className="w-5 h-5" />
              Swap & Send
            </button>
          </div>

          {walletAddress && (
            <div className="mb-4 text-xs text-gray-500">
              Connected: {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
            </div>
          )}

          {/* Recipient Field for Send Tab */}
          {activeTab === 'send' && (
            <div className="mb-4 bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
              <label className="block text-purple-200 text-sm font-medium mb-2">Send swapped tokens to</label>
              <input
                type="text"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                placeholder="@username or Solana address"
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:border-purple-500 placeholder-gray-400"
              />
              {isResolvingAddress && (
                <p className="text-purple-300 text-xs mt-2">Resolving...</p>
              )}
              {resolvedAddress && (
                <div className="mt-2 bg-green-900/20 border border-green-500/30 rounded-lg p-2">
                  <p className="text-green-300 text-xs">
                    ✓ Resolved to: {resolvedAddress.slice(0, 8)}...{resolvedAddress.slice(-6)}
                  </p>
                </div>
              )}
              {contacts?.contacts?.length > 0 && (
                <div className="mt-3">
                  <p className="text-purple-200 text-xs mb-2">Or select from contacts:</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {contacts.contacts.map((contact) => (
                      <button
                        key={contact.username}
                        type="button"
                        onClick={() => setRecipientInput(`@${contact.username}`)}
                        className={`w-full text-left px-3 py-2 rounded transition-colors text-sm ${
                          recipientInput === `@${contact.username}`
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                      >
                        @{contact.displayName || contact.username}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {showSettings && (
            <div className="mb-6 bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Cog6ToothIcon className="w-5 h-5" />
                Transaction Settings
              </h3>
              
              <div className="space-y-3 mb-6">
                <label className="text-gray-300 text-sm font-medium block">Slippage Tolerance</label>
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

              <div className="space-y-3 pt-4 border-t border-gray-700 mb-6">
                <label className="text-gray-300 text-sm font-medium block">Transaction Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PRIORITY_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => setPriorityFee(key)}
                      className={`py-3 px-2 rounded-lg font-medium transition-all ${
                        priorityFee === key
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <div className="text-sm font-semibold">{preset.label}</div>
                      <div className="text-xs opacity-80 mt-0.5">{preset.description}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  Priority level: {PRIORITY_PRESETS[priorityFee].priorityLevel}
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <label className="text-gray-300 text-sm font-medium">Batch Swap</label>
                  <button
                    onClick={() => setShowRepeatSettings(!showRepeatSettings)}
                    className="text-blue-400 hover:text-blue-300 text-xs"
                  >
                    {showRepeatSettings ? 'Hide' : 'Show'}
                  </button>
                </div>
                
                {showRepeatSettings && (
                  <>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <p className="text-gray-400 text-xs mb-2">
                        Execute multiple identical swaps in optimized chunks. Sign {CHUNK_SIZE} at a time for maximum efficiency.
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <input
                          type="number"
                          value={repeatCount}
                          onChange={(e) => setRepeatCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                          min="1"
                          max="50"
                          className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-gray-400 text-sm">swaps</span>
                      </div>
                      <p className="text-xs text-yellow-400 mt-2">
                        ⚠️ Max 50 swaps. Each swap counts separately for vault fees.
                      </p>
                      {repeatCount > CHUNK_SIZE && (
                        <p className="text-xs text-blue-400 mt-1">
                          ℹ️ Will process in {Math.ceil(repeatCount / CHUNK_SIZE)} chunks of {CHUNK_SIZE} transactions
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

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

          <div className="mb-6">
            <label className="block text-gray-400 text-sm font-medium mb-2">
              {activeTab === 'send' ? 'They Receive' : 'You Receive'}
            </label>
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

          <button
            onClick={executeSwap}
            disabled={isSwapping || !amount || parseFloat(amount) <= 0 || balance === null || (activeTab === 'send' && !resolvedAddress)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none text-lg"
          >
            {isSwapping ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                {batchProgress.total > 0 ? `Swapping ${batchProgress.current}/${batchProgress.total}...` : 'Swapping...'}
              </span>
            ) : activeTab === 'send' ? (
              repeatCount > 1 ? `Batch Swap & Send (${repeatCount}x)` : "Swap & Send Tokens"
            ) : (
              repeatCount > 1 ? `Batch Swap (${repeatCount}x)` : "Swap Tokens"
            )}
          </button>

          {batchProgress.total > 0 && (
            <div className="mt-4 bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300 text-sm font-medium">Batch Progress</span>
                <span className="text-blue-400 text-sm font-bold">
                  {batchProgress.current}/{batchProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                ></div>
              </div>
              {batchProgress.signatures.length > 0 && (
                <div className="space-y-1">
                  <p className="text-gray-400 text-xs mb-2">Completed transactions:</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {batchProgress.signatures.map((sig, idx) => (
                      <a
                        key={sig}
                        href={`https://solscan.io/tx/${sig}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-blue-400 hover:text-blue-300 truncate"
                      >
                        #{idx + 1}: {sig.slice(0, 16)}...{sig.slice(-8)}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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

          <div className="mt-6 pt-4 border-t border-gray-700/50 space-y-3">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Platform Fee: {(platformFeeBps / 100).toFixed(2)}%</span>
              <span>Slippage: {(slippageBps / 100).toFixed(2)}%</span>
              <span>Priority: {PRIORITY_PRESETS[priorityFee].label}</span>
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
