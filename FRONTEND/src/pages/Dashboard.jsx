import React from 'react';
import { useAuth, useTheme } from '../contexts/AuthContext';
import { usePhantomMultiChain } from '../contexts/PhantomMultiChainContext';
import { useQuery } from 'react-query';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import ProfileImage from '../components/ProfileImage';
import {
  UserGroupIcon,
  PaperAirplaneIcon,
  ClockIcon,
  WalletIcon
} from '@heroicons/react/24/outline';

export const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const { connectedChains } = usePhantomMultiChain();
  const { classes } = useTheme();
  const currentColors = classes; // Always dark colors now

  const { data: contacts } = useQuery('contacts', api.getContacts, {
    enabled: isAuthenticated,
  });

  const { data: transactions } = useQuery('transactions', api.getTransactions, {
    enabled: isAuthenticated,
  });

  const getTransactionType = (tx) => {
    // Get all user addresses from the user object (more reliable than connectedChains)
    const myAddresses = [];
    
    if (user?.wallets?.solana?.address) myAddresses.push(user.wallets.solana.address);
    if (user?.wallets?.ethereum?.address) myAddresses.push(user.wallets.ethereum.address);
    if (user?.wallets?.polygon?.address) myAddresses.push(user.wallets.polygon.address);
    if (user?.wallets?.arbitrum?.address) myAddresses.push(user.wallets.arbitrum.address);
    if (user?.wallets?.optimism?.address) myAddresses.push(user.wallets.optimism.address);
    if (user?.wallets?.base?.address) myAddresses.push(user.wallets.base.address);
    if (user?.wallets?.bsc?.address) myAddresses.push(user.wallets.bsc.address);
    
    // Fallback to connected chains if user wallets not available
    if (myAddresses.length === 0) {
      const chainAddresses = Object.values(connectedChains)
        .filter(chain => chain?.address)
        .map(chain => chain.address);
      myAddresses.push(...chainAddresses);
    }
    
    // Check if the transaction's fromAddress matches any of our addresses
    const isFromMe = myAddresses.includes(tx.fromAddress);
    return isFromMe ? 'sent' : 'received';
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-white text-lg">Please connect your wallet first.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-white text-lg">Please set up your profile.</p>
        <Link to="/profile" className="text-orange-400 hover:text-orange-300">
          Set up profile →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto transition-all duration-500">
      {/* Welcome Section */}
      <div className={`${currentColors.card} backdrop-blur-md rounded-2xl p-4 md:p-6 mb-6 md:mb-8 shadow-2xl border`}>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-lg">
          Welcome back, @{user.username}!
        </h1>
        <p className="text-gray-200 drop-shadow-md text-sm md:text-base">
          Manage your contacts and send transactions securely.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <Link
          to="/profile"
          className={`${currentColors.card} backdrop-blur-md rounded-xl p-4 md:p-6 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 border active:scale-95`}
        >
          <WalletIcon className={`w-6 h-6 md:w-8 md:h-8 text-blue-400 mb-2 md:mb-3`} />
          <h3 className={`text-white font-semibold mb-1 md:mb-2 text-sm md:text-base`}>Profile</h3>
          <p className="text-gray-400 text-xs md:text-sm">Update your profile and settings</p>
        </Link>

        <Link
          to="/contacts"
          className="bg-gray-800 hover:bg-gray-700 backdrop-blur-md rounded-xl p-4 md:p-6 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:scale-95"
        >
          <UserGroupIcon className={`w-6 h-6 md:w-8 md:h-8 text-orange-400 mb-2 md:mb-3`} />
          <h3 className={`text-white font-semibold mb-1 md:mb-2 text-sm md:text-base`}>Contacts</h3>
          <p className="text-gray-400 text-xs md:text-sm">
            {contacts?.contacts?.length || 0} contacts
          </p>
        </Link>

        <Link
          to="/send"
          className={`bg-gray-800 hover:bg-gray-700 backdrop-blur-md rounded-xl p-4 md:p-6 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:scale-95`}
        >
          <PaperAirplaneIcon className={`w-6 h-6 md:w-8 md:h-8 text-blue-400 mb-2 md:mb-3`} />
          <h3 className={`text-white font-semibold mb-1 md:mb-2 text-sm md:text-base`}>Send</h3>
          <p className="text-gray-400 text-xs md:text-sm">Send SOL and SPL tokens</p>
        </Link>

        <Link
          to="/transactions"
          className={`bg-gray-800 hover:bg-gray-700 backdrop-blur-md rounded-xl p-4 md:p-6 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:scale-95`}
        >
          <ClockIcon className={`w-6 h-6 md:w-8 md:h-8 text-orange-400 mb-2 md:mb-3`} />
          <h3 className={`text-white font-semibold mb-1 md:mb-2 text-sm md:text-base`}>History</h3>
          <p className="text-gray-400 text-xs md:text-sm">
            {transactions?.transactions?.length || 0} transactions
          </p>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent Contacts */}
        <div className={`bg-gray-800 border-gray-700 backdrop-blur-md rounded-xl p-4 md:p-6 shadow-xl border`}>
          <h3 className={`text-white font-semibold text-base md:text-lg mb-3 md:mb-4`}>Recent Contacts</h3>
          {contacts?.contacts?.slice(0, 5).map((contact) => (
            <div key={contact.username} className="flex items-center space-x-3 py-2">
              <ProfileImage
                src={contact.profilePicture || null}
                username={contact.username}
                size="sm"
                className="shadow-md"
              />
              <div>
                <p className={`text-white font-medium`}>@{contact.username}</p>
                <p className="text-gray-400 text-sm">{contact.bio || 'No bio available'}</p>
              </div>
            </div>
          )) || <p className={`text-gray-400`}>No contacts yet</p>}
        </div>

        {/* Recent Transactions */}
        <div className={`bg-gray-800 border-gray-700 backdrop-blur-md rounded-xl p-4 md:p-6 shadow-xl border`}>
          <h3 className={`text-white font-semibold text-base md:text-lg mb-3 md:mb-4`}>Recent Transactions</h3>
          {transactions?.transactions?.slice(0, 5).map((tx) => {
            const type = getTransactionType(tx);
            return (
              <div key={tx.signature} className="flex items-center justify-between py-2">
                <div>
                  <p className={`text-white font-medium`}>
                    {tx.amount} {tx.token}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {type === 'sent' ? 'To' : 'From'}: @{type === 'sent' ? tx.toUsername : tx.fromUsername || 'Unknown'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  tx.status === 'confirmed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                  tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                  'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                }`}>
                  {tx.status}
                </span>
              </div>
            );
          }) || <p className={`text-gray-400`}>No transactions yet</p>}
        </div>
      </div>
    </div>
  );
};
