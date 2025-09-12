import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { usePhantomMultiChain } from '../contexts/PhantomMultiChainContext';
import { useWalletConnect } from '../contexts/WalletConnectContext';
import { Transaction } from '@solana/web3.js';
import { api } from '../services/api';
import { useAuth, useTheme } from '../contexts/AuthContext';
import { phantomChains } from '../contexts/PhantomMultiChainContext';
import { getTokensByChain } from '../config/web3Config';
import toast from 'react-hot-toast';
import { PaperAirplaneIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

export const Send = () => {
  const { isAuthenticated, user } = useAuth();
  const { 
    activeChain, 
    connectedChains, 
    switchToChain,
    getActiveWallet
  } = usePhantomMultiChain();
  const { 
    isConnected: walletConnectConnected, 
    address: walletConnectAddress, 
    connect: connectWalletConnect 
  } = useWalletConnect();
  const [searchParams] = useSearchParams();
  const { classes } = useTheme();
  const currentColors = classes; // Always dark colors now
  
  // Helper function to determine if a chain is connected or available
  const isChainConnected = (chainName) => {
    if (chainName === 'solana') {
      // Solana is connected if user is authenticated (they connected with Solana)
      return !!user;
    } else {
      // For EVM chains, check PhantomMultiChain first
      if (connectedChains[chainName]?.isConnected || connectedChains[chainName]?.isAvailable) {
        return true;
      }
      
      // For WalletConnect, we can only be sure it supports the chain if:
      // 1. WalletConnect is connected AND
      // 2. The user has registered an EVM address (meaning they can use EVM chains)
      const hasEVMAddress = user?.wallets?.ethereum?.address || 
                           user?.wallets?.polygon?.address || 
                           user?.wallets?.arbitrum?.address || 
                           user?.wallets?.optimism?.address || 
                           user?.wallets?.base?.address ||
                           user?.wallets?.bsc?.address;
      
      return walletConnectConnected && walletConnectAddress && hasEVMAddress;
    }
  };
  
  const [selectedChain, setSelectedChain] = useState(activeChain || 'solana');
  const [availableTokens, setAvailableTokens] = useState([]);
  const [formData, setFormData] = useState({
    recipient: searchParams.get('recipient') || '',
    amount: '',
    token: '',
    memo: '',
    chain: selectedChain
  });

  // Update available tokens when chain changes
  useEffect(() => {
    const tokens = getTokensByChain(selectedChain);
    setAvailableTokens(tokens);
    
    // Set default token for the chain
    if (tokens.length > 0) {
      setFormData(prev => ({
        ...prev,
        token: tokens[0].symbol,
        chain: selectedChain
      }));
    }
  }, [selectedChain]);

  // Initialize with active chain
  useEffect(() => {
    if (activeChain && activeChain !== selectedChain) {
      setSelectedChain(activeChain);
    }
  }, [activeChain, selectedChain]);

  const { data: contacts } = useQuery('contacts', api.getContacts, {
    enabled: isAuthenticated,
  });

  const prepareTransactionMutation = useMutation(api.prepareTransaction);
  const submitTransactionMutation = useMutation(api.submitTransaction);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleChainChange = async (chainName) => {
    try {
      setSelectedChain(chainName);
      
      // For Solana, just switch directly
      if (chainName === 'solana') {
        await switchToChain(chainName);
      } else {
        // For EVM chains, check if we have access to this chain
        const hasEVMAccess = connectedChains[chainName]?.isConnected || 
                            connectedChains[chainName]?.isAvailable ||
                            (walletConnectConnected && walletConnectAddress && 
                             (user?.wallets?.ethereum?.address || user?.wallets?.polygon?.address || 
                              user?.wallets?.arbitrum?.address || user?.wallets?.optimism?.address || 
                              user?.wallets?.base?.address || user?.wallets?.bsc?.address));
        
        if (hasEVMAccess) {
          // We have access, switch the chain
          if (walletConnectConnected && walletConnectAddress) {
            console.log('Using existing WalletConnect connection for EVM chain');
            toast.success(`Switched to ${phantomChains[chainName]?.name} via WalletConnect`);
          } else if (connectedChains[chainName]?.isAvailable || connectedChains[chainName]?.isConnected) {
            console.log('Using existing Phantom EVM connection for chain, switching...');
            try {
              await switchToChain(chainName);
              toast.success(`Switched to ${phantomChains[chainName]?.name} via Phantom`);
            } catch (error) {
              console.log('Chain switch failed:', error);
              throw error;
            }
          } else {
            console.log('Using existing Phantom EVM connection for chain');
            toast.success(`Switched to ${phantomChains[chainName]?.name} via Phantom`);
          }
        } else {
          // No access to this chain, try to connect
          toast.loading(`Connecting to ${phantomChains[chainName]?.name}...`);
          
          // Try Phantom EVM access first
          if (window.ethereum) {
            try {
              await window.ethereum.request({ method: 'eth_requestAccounts' });
              console.log('Phantom EVM access granted');
              // Switch to the selected chain via Phantom
              await switchToChain(chainName);
              toast.dismiss();
            } catch (error) {
              console.log('Phantom EVM connection failed:', error);
              
              // If Phantom fails, try WalletConnect as fallback
              console.log('Attempting WalletConnect connection as fallback...');
              const connected = await connectWalletConnect();
              if (!connected) {
                throw new Error('No EVM wallet available. Please connect Phantom with EVM support or use WalletConnect.');
              }
              toast.dismiss();
              toast.success(`Connected to ${phantomChains[chainName]?.name} via WalletConnect`);
              return; // Don't call switchToChain for WalletConnect
            }
          } else {
            // No Phantom EVM, try WalletConnect
            console.log('No Phantom EVM available, attempting WalletConnect...');
            const connected = await connectWalletConnect();
            if (!connected) {
              throw new Error('No EVM wallet available. Please connect WalletConnect.');
            }
            toast.dismiss();
            toast.success(`Connected to ${phantomChains[chainName]?.name} via WalletConnect`);
            return; // Don't call switchToChain for WalletConnect
          }
        }
      }
      
      // Update form data
      const tokens = getTokensByChain(chainName);
      setFormData(prev => ({
        ...prev,
        chain: chainName,
        token: tokens.length > 0 ? tokens[0].symbol : ''
      }));
      
      toast.success(`Switched to ${phantomChains[chainName]?.name}`);
    } catch (error) {
      console.error('Failed to switch chain:', error);
      toast.error(`Failed to switch to ${phantomChains[chainName]?.name}: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple rapid submissions
    if (prepareTransactionMutation.isLoading || submitTransactionMutation.isLoading) {
      return;
    }
    
    const activeWallet = getActiveWallet();
    if (!activeWallet || !activeWallet.signMessage) {
      toast.error('Wallet not connected properly');
      return;
    }

    try {
      // Step 1: Prepare transaction
      toast.loading('Preparing transaction...');
      const prepared = await prepareTransactionMutation.mutateAsync({
        recipientUsername: formData.recipient,
        amount: parseFloat(formData.amount),
        token: formData.token,
        memo: formData.memo,
        chain: selectedChain
      });

      // Step 2: Sign transaction based on chain
      if (prepared.chain === 'solana') {
        // Solana transaction signing
        const transactionBuffer = Buffer.from(prepared.transaction, 'base64');
        const transaction = Transaction.from(transactionBuffer);
        
        if (window.solana && window.solana.signTransaction) {
          const signedTransaction = await window.solana.signTransaction(transaction);
          const signedTransactionBase64 = signedTransaction.serialize().toString('base64');
          
          // Step 3: Submit signed transaction
          toast.dismiss();
          toast.loading('Submitting transaction...');
          
          const result = await submitTransactionMutation.mutateAsync({
            signedTransaction: signedTransactionBase64,
            recipientUsername: formData.recipient,
            amount: parseFloat(formData.amount),
            token: formData.token,
            memo: formData.memo,
            chain: 'solana'
          });
          
          toast.dismiss();
          toast.success('Transaction sent successfully!');
          console.log('Transaction result:', result);
          
          // Reset form
          setFormData({
            recipient: '',
            amount: '',
            message: ''
          });
        } else {
          throw new Error('Phantom wallet not connected');
        }
      } else {
        // EVM transaction signing - prioritize WalletConnect if already connected
        let evmAccount = null;
        let useWalletConnect = false;
        
        // First, check if WalletConnect is already connected (prioritize to avoid Phantom popups)
        if (walletConnectConnected && walletConnectAddress) {
          evmAccount = walletConnectAddress;
          useWalletConnect = true;
          console.log('Using WalletConnect account (prioritized):', evmAccount);
        }
        // Only try Phantom EVM if WalletConnect is not available
        else if (window.ethereum) {
          try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
              evmAccount = accounts[0];
              console.log('Using Phantom EVM account:', evmAccount);
            }
          } catch (error) {
            console.log('Phantom EVM not available:', error);
            
            // If Phantom fails and WalletConnect is not connected, try to connect it
            if (!walletConnectConnected) {
              console.log('Phantom failed, trying WalletConnect as fallback...');
              const connected = await connectWalletConnect();
              if (connected && walletConnectAddress) {
                evmAccount = walletConnectAddress;
                useWalletConnect = true;
                console.log('Connected to WalletConnect for EVM transaction:', evmAccount);
              }
            }
          }
        }
        
        // If still no EVM account, try to connect WalletConnect
        if (!evmAccount) {
          console.log('No EVM account available, attempting WalletConnect connection...');
          const connected = await connectWalletConnect();
          if (connected) {
            evmAccount = walletConnectAddress;
            useWalletConnect = true;
            console.log('Connected to WalletConnect for EVM transaction:', evmAccount);
          }
        }
        
        if (!evmAccount) {
          throw new Error('No EVM wallet available. Please connect Phantom with EVM support or use WalletConnect.');
        }

        // Send the transaction directly (eth_sendTransaction handles signing)
        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [prepared.transaction]
        });
        
        console.log(`Transaction sent via ${useWalletConnect ? 'WalletConnect' : 'Phantom'}, hash:`, txHash);

        // Step 3: Record the transaction (already sent to blockchain)
        toast.dismiss();
        toast.loading('Recording transaction...');
        
        const result = await submitTransactionMutation.mutateAsync({
          signedTransaction: txHash, // Use the transaction hash instead
          recipientUsername: formData.recipient,
          amount: parseFloat(formData.amount),
          token: formData.token,
          memo: formData.memo,
          chain: prepared.chain
        });
        
        toast.dismiss();
        toast.success('Transaction sent successfully!');
        console.log('Transaction result:', result);
        
        // Reset form
        setFormData({
          recipient: '',
          amount: '',
          message: ''
        });
      }

    } catch (error) {
      toast.dismiss();
      console.error('Transaction error:', error);
      
      // Handle specific error types
      if (error.error === 'Too many requests from this IP, please try again later') {
        toast.error('Too many requests. Please wait a moment before trying again.');
      } else if (error.error?.includes('does not have a') || (error.error?.includes('No') && error.error?.includes('address found'))) {
        const availableChains = error.availableChains || [];
        const requestedChain = error.requestedChain || selectedChain;
        if (availableChains.length > 0) {
          toast.error(`Recipient does not have a ${requestedChain} address. Available chains: ${availableChains.join(', ')}`);
        } else {
          toast.error('Recipient does not have the required wallet address for this chain.');
        }
      } else {
        toast.error(error.error || 'Transaction failed');
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-white text-lg">Please connect your wallet first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0">
      <div className={`${currentColors.card} backdrop-blur-md rounded-2xl p-4 sm:p-8 border`}>
        <h1 className="text-3xl font-bold text-white mb-8 text-center">Send Tokens</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Simplified Network Selection */}
          <div>
            <label className="block text-white font-medium mb-2">
              Network
            </label>
            <select
              value={selectedChain}
              onChange={(e) => handleChainChange(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
            >
              {Object.entries(phantomChains).map(([chainName, chainInfo]) => {
                const isConnected = isChainConnected(chainName);
                return (
                  <option 
                    key={chainName} 
                    value={chainName} 
                    className={`bg-gray-800 ${!isConnected ? 'text-gray-500' : 'text-white'}`}
                  >
                    {chainInfo.name} {isConnected ? '✓' : '(Connect to enable)'}
                  </option>
                );
              })}
            </select>
            
            {/* Current network indicator */}
            {isChainConnected(selectedChain) && (
              <div className="mt-2 flex items-center space-x-2 text-sm text-gray-400">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: phantomChains[selectedChain]?.color }}
                />
                <span>
                  Connected: {selectedChain === 'solana' 
                    ? (user?.wallets?.solana?.address?.slice(0, 6) + '...' + user?.wallets?.solana?.address?.slice(-4) || 'Solana Connected')
                    : connectedChains[selectedChain]?.isConnected && connectedChains[selectedChain]?.address
                    ? `${connectedChains[selectedChain].address.slice(0, 6)}...${connectedChains[selectedChain].address.slice(-4)} (Phantom)`
                    : walletConnectConnected && walletConnectAddress
                    ? `${walletConnectAddress.slice(0, 6)}...${walletConnectAddress.slice(-4)} (WalletConnect)`
                    : 'Connected'
                  }
                </span>
              </div>
            )}
            
            {/* Transaction note */}
            <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-300 text-sm">
                💡 <strong>Note:</strong> Transactions are processed on the selected network. 
                Choose your preferred chain to send tokens on that specific network.
              </p>
            </div>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-white font-medium mb-2">
              Recipient *
            </label>
            <div className="space-y-2">
              <input
                type="text"
                name="recipient"
                value={formData.recipient}
                onChange={handleInputChange}
                placeholder="Enter username"
                className="w-full px-4 py-3 bg-gray-700 text-white border-gray-600 placeholder-gray-400 focus:outline-none focus:border-orange-400"
                required
              />
              {contacts?.contacts?.length > 0 && (
                <div className="max-h-40 overflow-y-auto">
                  <p className="text-white/60 text-sm mb-2">Or select from contacts:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {contacts.contacts.map((contact) => (
                      <button
                        key={contact.username}
                        type="button"
                        onClick={() => setFormData({ ...formData, recipient: contact.username })}
                        className={`w-full text-left px-3 py-2 rounded transition-colors ${
                          formData.recipient === contact.username 
                            ? 'bg-purple-500/20 border border-purple-400 text-white' 
                            : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
                        }`}
                      >
                        <span className="text-white">@{contact.username}</span>
                        {contact.bio && <span className="text-white/60 text-sm ml-2">{contact.bio}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-white font-medium mb-2">
              Amount *
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.0"
              step="0.000000001"
              min="0.000000001"
              className="w-full px-4 py-3 bg-gray-700 text-white border-gray-600 placeholder-gray-400 focus:outline-none focus:border-orange-400"
              required
            />
          </div>

          {/* Token Selection */}
          <div>
            <label className="block text-white font-medium mb-2">
              Token *
            </label>
            <select
              name="token"
              value={formData.token}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
            >
              {availableTokens.map((token) => (
                <option key={token.symbol} value={token.symbol} className="bg-gray-800">
                  {token.symbol} - {token.name}
                  {token.isNative && ' (Native)'}
                </option>
              ))}
            </select>
            
            {/* Token info */}
            {formData.token && (
              <div className="mt-2 text-xs text-gray-400">
                Selected: {availableTokens.find(t => t.symbol === formData.token)?.name} 
                {' '}on {phantomChains[selectedChain]?.name}
              </div>
            )}
          </div>

          {/* Memo */}
          <div>
            <label className="block text-white font-medium mb-2">
              Memo (Optional)
            </label>
            <input
              type="text"
              name="memo"
              value={formData.memo}
              onChange={handleInputChange}
              placeholder="Payment for..."
              maxLength={280}
              className="w-full px-4 py-3 bg-gray-700 text-white border-gray-600 placeholder-gray-400 focus:outline-none focus:border-orange-400"
            />
          </div>

          {/* Transaction Summary */}
          {formData.recipient && formData.amount && formData.token && (
            <div className="bg-gradient-to-r from-blue-500/10 to-orange-500/10 rounded-xl p-4 border border-blue-500/20">
              <h3 className="text-white font-medium mb-3 flex items-center">
                <ArrowsRightLeftIcon className="w-5 h-5 mr-2" />
                Transaction Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: phantomChains[selectedChain]?.color }}
                  />
                  <p className="text-white/80">
                    Network: <span className="font-semibold text-white">{phantomChains[selectedChain]?.name}</span>
                  </p>
                </div>
                
                <p className="text-white/80">
                  Send <span className="font-semibold text-white">{formData.amount} {formData.token}</span>
                </p>
                
                <p className="text-white/80">
                  To <span className="font-semibold text-blue-400">@{formData.recipient}</span>
                </p>
                
                {formData.memo && (
                  <p className="text-white/80">
                    Memo: <span className="font-semibold text-white">"{formData.memo}"</span>
                  </p>
                )}
                
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-gray-400">
                    Using wallet: {connectedChains[selectedChain]?.address.slice(0, 8)}...{connectedChains[selectedChain]?.address.slice(-6)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              prepareTransactionMutation.isLoading || 
              submitTransactionMutation.isLoading ||
              !formData.recipient ||
              !formData.amount
            }
            className="w-full bg-gradient-to-r from-orange-500 to-blue-500 hover:from-orange-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
            {prepareTransactionMutation.isLoading || submitTransactionMutation.isLoading
              ? 'Processing...'
              : 'Send Transaction'
            }
          </button>
        </form>
      </div>
    </div>
  );
};
