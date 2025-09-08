import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from 'react-query';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import {
  UserGroupIcon,
  PaperAirplaneIcon,
  ClockIcon,
  WalletIcon
} from '@heroicons/react/24/outline';

export const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();

  const { data: contacts } = useQuery('contacts', api.getContacts, {
    enabled: isAuthenticated,
  });

  const { data: transactions } = useQuery('transactions', api.getTransactions, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="text-center py-12">
        <p className="text-white text-lg">Please connect your wallet and set up your profile.</p>
        <Link to="/profile" className="text-purple-300 hover:text-purple-200">
          Set up profile →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome Section */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, @{user.username}!
            </h1>
            <p className="text-white/70">
              Manage your contacts and send transactions securely.
            </p>
          </div>
          <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center overflow-hidden">
            {user.profilePicture ? (
              <img
                src={`https://nakama-production-1850.up.railway.app${user.profilePicture}`}
                alt={`${user.username}'s profile`}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-2xl">
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link
          to="/profile"
          className="bg-white/10 backdrop-blur-md rounded-xl p-6 hover:bg-white/20 transition-colors"
        >
          <WalletIcon className="w-8 h-8 text-purple-300 mb-3" />
          <h3 className="text-white font-semibold mb-2">Profile</h3>
          <p className="text-white/60 text-sm">Update your profile and settings</p>
        </Link>

        <Link
          to="/contacts"
          className="bg-white/10 backdrop-blur-md rounded-xl p-6 hover:bg-white/20 transition-colors"
        >
          <UserGroupIcon className="w-8 h-8 text-blue-300 mb-3" />
          <h3 className="text-white font-semibold mb-2">Contacts</h3>
          <p className="text-white/60 text-sm">
            {contacts?.contacts?.length || 0} contacts
          </p>
        </Link>

        <Link
          to="/send"
          className="bg-white/10 backdrop-blur-md rounded-xl p-6 hover:bg-white/20 transition-colors"
        >
          <PaperAirplaneIcon className="w-8 h-8 text-green-300 mb-3" />
          <h3 className="text-white font-semibold mb-2">Send</h3>
          <p className="text-white/60 text-sm">Send SOL and SPL tokens</p>
        </Link>

        <Link
          to="/transactions"
          className="bg-white/10 backdrop-blur-md rounded-xl p-6 hover:bg-white/20 transition-colors"
        >
          <ClockIcon className="w-8 h-8 text-yellow-300 mb-3" />
          <h3 className="text-white font-semibold mb-2">History</h3>
          <p className="text-white/60 text-sm">
            {transactions?.transactions?.length || 0} transactions
          </p>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Contacts */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
          <h3 className="text-white font-semibold text-lg mb-4">Recent Contacts</h3>
          {contacts?.contacts?.slice(0, 5).map((contact) => (
            <div key={contact.username} className="flex items-center space-x-3 py-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center overflow-hidden">
                {contact.profilePicture ? (
                  <img
                    src={`https://nakama-production-1850.up.railway.app${contact.profilePicture}`}
                    alt={`${contact.username}'s profile`}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white text-xs font-semibold">
                    {contact.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="text-white font-medium">@{contact.username}</p>
                <p className="text-white/60 text-sm">{contact.bio || 'No bio available'}</p>
              </div>
            </div>
          )) || <p className="text-white/60">No contacts yet</p>}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
          <h3 className="text-white font-semibold text-lg mb-4">Recent Transactions</h3>
          {transactions?.transactions?.slice(0, 5).map((tx) => (
            <div key={tx.signature} className="flex items-center justify-between py-2">
              <div>
                <p className="text-white font-medium">
                  {tx.amount} {tx.token}
                </p>
                <p className="text-white/60 text-sm">
                  to @{tx.toUsername}
                </p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                tx.status === 'confirmed' ? 'bg-green-500/20 text-green-300' :
                tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-red-500/20 text-red-300'
              }`}>
                {tx.status}
              </span>
            </div>
          )) || <p className="text-white/60">No transactions yet</p>}
        </div>
      </div>
    </div>
  );
};
