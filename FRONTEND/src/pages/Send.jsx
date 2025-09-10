import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useMultiWallet } from '../contexts/MultiWalletContext';
import { Transaction } from '@solana/web3.js';
import { api } from '../services/api';
import { useAuth, useTheme } from '../contexts/AuthContext';
import { chainConfig, getAllSupportedTokens, getTokensByChain } from '../config/web3Config';
import toast from 'react-hot-toast';
import { PaperAirplaneIcon, SwitchHorizontalIcon } from '@heroicons/react/24/outline';

export const Send = () => {
  const { isAuthenticated } = useAuth();
  const { signTransaction } = useWallet();
  const { 
    activeChain, 
    connectedWallets, 
    switchActiveChain, 
    getActiveWallet,
    getActiveChainTokens,
    signMessage: multiSignMessage 
  } = useMultiWallet();
  const [searchParams] = useSearchParams();
  const { classes } = useTheme();
  const currentColors = classes; // Always dark colors now
  
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
  }, [selectedChain, getTokensByChain]);

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
      
      // Check if wallet is connected for this chain
      if (!connectedWallets[chainName]?.isConnected) {
        toast.error(`Please connect your ${chainConfig[chainName]?.name} wallet first`);
        return;
      }
      
      // Switch to the selected chain
      await switchActiveChain(chainName);
      
      // Update form data
      const tokens = getTokensByChain(chainName);
      setFormData(prev => ({
        ...prev,
        chain: chainName,
        token: tokens.length > 0 ? tokens[0].symbol : ''
      }));
      
      toast.success(`Switched to ${chainConfig[chainName]?.name}`);
    } catch (error) {
      console.error('Failed to switch chain:', error);
      toast.error('Failed to switch chain');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!signTransaction) {
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
        memo: formData.memo
      });

      // Step 2: Sign transaction
      const transactionBuffer = Buffer.from(prepared.transaction, 'base64');
      const transaction = Transaction.from(transactionBuffer);
      
      const signedTransaction = await signTransaction(transaction);
      const signedTransactionBase64 = signedTransaction.serialize().toString('base64');

      // Step 3: Submit signed transaction
      toast.dismiss();
      toast.loading('Submitting transaction...');
      
      const result = await submitTransactionMutation.mutateAsync({
        signedTransaction: signedTransactionBase64,
        recipientUsername: formData.recipient,
        amount: parseFloat(formData.amount),
        token: formData.token,
        memo: formData.memo
      });

      toast.dismiss();
      toast.success('Transaction sent successfully!');
      
      // Reset form
      setFormData({
        recipient: '',
        amount: '',
        token: 'SOL',
        memo: ''
      });

      // Show explorer link
      if (result.explorerUrl) {
        toast.success(
          <div>
            <p>Transaction confirmed!</p>
            <a 
              href={result.explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              View on Explorer
            </a>
          </div>,
          { duration: 10000 }
        );
      }

    } catch (error) {
      toast.dismiss();
      console.error('Transaction error:', error);
      toast.error(error.error || 'Transaction failed');
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
          {/* Chain Selection */}
          <div>
            <label className="block text-white font-medium mb-3">
              Select Network *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(chainConfig).map(([chainName, chainInfo]) => {
                const isConnected = connectedWallets[chainName]?.isConnected;
                const isSelected = selectedChain === chainName;
                
                return (
                  <button
                    key={chainName}
                    type="button"
                    onClick={() => handleChainChange(chainName)}
                    disabled={!isConnected}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-blue-400 bg-blue-500/10 shadow-lg'
                        : isConnected
                        ? 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800/70'
                        : 'border-gray-700 bg-gray-900/50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: chainInfo.color }}
                      />
                      <div className="text-left">
                        <div className={`font-medium ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                          {chainInfo.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {chainInfo.symbol}
                        </div>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full" />
                    )}
                    
                    {!isConnected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                        <span className="text-xs text-gray-400">Not Connected</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Active wallet info */}
            {connectedWallets[selectedChain]?.isConnected && (
              <div className="mt-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">Active Wallet</div>
                <div className="font-mono text-sm text-white">
                  {connectedWallets[selectedChain].address.slice(0, 8)}...{connectedWallets[selectedChain].address.slice(-6)}
                </div>
              </div>
            )}
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
                {' '}on {chainConfig[selectedChain]?.name}
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
                <SwitchHorizontalIcon className="w-5 h-5 mr-2" />
                Transaction Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: chainConfig[selectedChain]?.color }}
                  />
                  <p className="text-white/80">
                    Network: <span className="font-semibold text-white">{chainConfig[selectedChain]?.name}</span>
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
                    Using wallet: {connectedWallets[selectedChain]?.address.slice(0, 8)}...{connectedWallets[selectedChain]?.address.slice(-6)}
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
