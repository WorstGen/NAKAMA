import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { Transaction } from '@solana/web3.js';
import { api } from '../services/api';
import { useAuth, useTheme } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

const SUPPORTED_TOKENS = [
  { symbol: 'SOL', name: 'Solana', decimals: 9 },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
];

export const Send = () => {
  const { isAuthenticated } = useAuth();
  const { signTransaction } = useWallet();
  const [searchParams] = useSearchParams();

  let isDark = true; // default to dark
  try {
    const theme = useTheme();
    isDark = theme.isDark;
  } catch (error) {
    console.error('🎨 Send: Theme hook failed, using dark fallback:', error);
  }
  
  const [formData, setFormData] = useState({
    recipient: searchParams.get('recipient') || '',
    amount: '',
    token: 'SOL',
    memo: ''
  });

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
        <p className={`${isDark ? 'text-white' : 'text-gray-900'} text-lg`}>Please connect your wallet first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} backdrop-blur-md rounded-2xl p-8 border`}>
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-8 text-center`}>Send Tokens</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recipient */}
          <div>
            <label className="block text-white dark:text-gray-900 font-medium mb-2">
              Recipient *
            </label>
            <div className="space-y-2">
              <input
                type="text"
                name="recipient"
                value={formData.recipient}
                onChange={handleInputChange}
                placeholder="Enter username"
                className="w-full px-4 py-3 bg-gray-700 dark:bg-gray-50 text-white dark:text-gray-900 border-gray-600 dark:border-gray-300 placeholder-gray-400 focus:outline-none focus:border-orange-400"
                required
              />
              {contacts?.contacts?.length > 0 && (
                <div className="max-h-40 overflow-y-auto">
                  <p className="text-white/60 text-sm mb-2">Or select from contacts:</p>
                  <div className="space-y-1">
                    {contacts.contacts.map((contact) => (
                      <button
                        key={contact.username}
                        type="button"
                        onClick={() => setFormData({ ...formData, recipient: contact.username })}
                        className={`w-full text-left px-3 py-2 rounded bg-gray-700 dark:bg-gray-100 hover:bg-gray-600 dark:hover:bg-gray-200 transition-colors ${
                          formData.recipient === contact.username ? 'bg-purple-500/20 border border-purple-400' : ''
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
            <label className="block text-white dark:text-gray-900 font-medium mb-2">
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
              className="w-full px-4 py-3 bg-gray-700 dark:bg-gray-50 text-white dark:text-gray-900 border-gray-600 dark:border-gray-300 placeholder-gray-400 focus:outline-none focus:border-orange-400"
              required
            />
          </div>

          {/* Token Selection */}
          <div>
            <label className="block text-white dark:text-gray-900 font-medium mb-2">
              Token *
            </label>
            <select
              name="token"
              value={formData.token}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
            >
              {SUPPORTED_TOKENS.map((token) => (
                <option key={token.symbol} value={token.symbol} className="bg-gray-800">
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>

          {/* Memo */}
          <div>
            <label className="block text-white dark:text-gray-900 font-medium mb-2">
              Memo (Optional)
            </label>
            <input
              type="text"
              name="memo"
              value={formData.memo}
              onChange={handleInputChange}
              placeholder="Payment for..."
              maxLength={280}
              className="w-full px-4 py-3 bg-gray-700 dark:bg-gray-50 text-white dark:text-gray-900 border-gray-600 dark:border-gray-300 placeholder-gray-400 focus:outline-none focus:border-orange-400"
            />
          </div>

          {/* Transaction Summary */}
          {formData.recipient && formData.amount && (
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Transaction Summary</h3>
              <div className="space-y-1 text-sm">
                <p className="text-white/80">
                  Send <span className="font-semibold">{formData.amount} {formData.token}</span>
                </p>
                <p className="text-white/80">
                  To <span className="font-semibold">@{formData.recipient}</span>
                </p>
                {formData.memo && (
                  <p className="text-white/80">
                    Memo: <span className="font-semibold">"{formData.memo}"</span>
                  </p>
                )}
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
