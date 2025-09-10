import React from 'react';
import { useQuery } from 'react-query';
import { api } from '../services/api';
import { useAuth, useTheme } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { ClockIcon, CheckCircleIcon, XCircleIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

export const Transactions = () => {
  const { isAuthenticated } = useAuth();
  const { publicKey } = useWallet();
  const { classes } = useTheme();
  const currentColors = classes; // Always dark colors now
  
  const { data: transactions, isLoading } = useQuery('transactions', api.getTransactions, {
    enabled: isAuthenticated,
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-400" />;
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/20 text-green-300';
      case 'failed':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-yellow-500/20 text-yellow-300';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getTransactionType = (tx) => {
    const myAddress = publicKey?.toString();
    return tx.fromAddress === myAddress ? 'sent' : 'received';
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-white text-lg">Please connect your wallet first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0">
      <div className={`${currentColors.card} backdrop-blur-md rounded-2xl p-4 sm:p-8 border`}>
        <h1 className="text-3xl font-bold text-white mb-8">Transaction History</h1>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Loading transactions...</p>
          </div>
        ) : transactions?.transactions?.length > 0 ? (
          <div className="space-y-4">
            {transactions.transactions.map((tx) => {
              const type = getTransactionType(tx);
              return (
                <div key={tx.signature} className="bg-gray-700/50 rounded-lg p-4 border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        type === 'sent' ? 'bg-red-500/20' : 'bg-green-500/20'
                      }`}>
                        {type === 'sent' ? (
                          <ArrowUpIcon className="w-5 h-5 text-red-400" />
                        ) : (
                          <ArrowDownIcon className="w-5 h-5 text-green-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-white font-semibold">
                            {type === 'sent' ? 'Sent' : 'Received'} {tx.amount} {tx.token}
                          </p>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(tx.status)}
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(tx.status)}`}>
                              {tx.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-white/60 text-sm">
                          {type === 'sent' ? 'To' : 'From'}: @{type === 'sent' ? tx.toUsername : tx.fromUsername || 'Unknown'}
                        </p>
                        {tx.memo && (
                          <p className="text-white/40 text-sm italic">"{tx.memo}"</p>
                        )}
                        <p className="text-white/40 text-xs">
                          {formatDate(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <a
                        href={`https://explorer.solana.com/tx/${tx.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm underline break-all sm:break-normal"
                      >
                        View on Explorer
                      </a>
                      <p className="text-gray-500 text-xs font-mono break-all sm:break-normal">
                        {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <ClockIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">No transactions yet</p>
            <p className="text-gray-500">Your transaction history will appear here once you start sending or receiving tokens.</p>
          </div>
        )}
      </div>
    </div>
  );
};
