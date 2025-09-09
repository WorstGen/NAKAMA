import React from 'react';
import { useAuth, useTheme } from '../contexts/AuthContext';
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
  const { classes } = useTheme();
  const currentColors = classes; // Always dark colors now

  const { data: contacts } = useQuery('contacts', api.getContacts, {
    enabled: isAuthenticated,
  });

  const { data: transactions } = useQuery('transactions', api.getTransactions, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="text-center py-12">
        <p className={`${isDark ? 'text-white' : 'text-gray-900'} text-lg`}>Please connect your wallet and set up your profile.</p>
        <Link to="/profile" className={`${isDark ? 'text-orange-400 hover:text-orange-300' : 'text-orange-500 hover:text-orange-600'}`}>
          Set up profile →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto transition-all duration-500">
      {/* Welcome Section */}
      <div className={`${currentColors.card} backdrop-blur-md rounded-2xl p-6 mb-8 shadow-2xl border`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2 drop-shadow-lg`}>
              Welcome back, @{user.username}!
            </h1>
            <p className={`${isDark ? 'text-gray-200' : 'text-gray-600'} drop-shadow-md`}>
              Manage your contacts and send transactions securely.
            </p>
          </div>
          <div className={`w-16 h-16 ${isDark ? 'bg-gradient-to-r from-orange-400 to-blue-400' : 'bg-gradient-to-r from-orange-500 to-blue-500'} rounded-full flex items-center justify-center overflow-hidden shadow-lg`}>
            {user.profilePicture ? (
              <img
                src={`https://nakama-production-1850.up.railway.app${user.profilePicture}`}
                alt={`${user.username}'s profile`}
                className="w-full h-full rounded-full object-cover"
                style={(() => {
                  const settings = window.getSavedImageSettings?.(user.username) || { position: { x: 50, y: 50 }, zoom: 100 };
                  return {
                    objectPosition: `${settings.position.x}% ${settings.position.y}%`,
                    transform: `scale(${settings.zoom / 100})`,
                    transformOrigin: 'center center'
                  };
                })()}
              />
            ) : (
              <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-2xl`}>
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
          className={`${currentColors.card} backdrop-blur-md rounded-xl p-6 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 border`}
        >
          <WalletIcon className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-500'} mb-3`} />
          <h3 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold mb-2`}>Profile</h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-400'} text-sm`}>Update your profile and settings</p>
        </Link>

        <Link
          to="/contacts"
          className={`${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} backdrop-blur-md rounded-xl p-6 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1`}
        >
          <UserGroupIcon className={`w-8 h-8 ${isDark ? 'text-orange-400' : 'text-orange-500'} mb-3`} />
          <h3 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold mb-2`}>Contacts</h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-400'} text-sm`}>
            {contacts?.contacts?.length || 0} contacts
          </p>
        </Link>

        <Link
          to="/send"
          className={`${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} backdrop-blur-md rounded-xl p-6 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1`}
        >
          <PaperAirplaneIcon className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-500'} mb-3`} />
          <h3 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold mb-2`}>Send</h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-400'} text-sm`}>Send SOL and SPL tokens</p>
        </Link>

        <Link
          to="/transactions"
          className={`${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} backdrop-blur-md rounded-xl p-6 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1`}
        >
          <ClockIcon className={`w-8 h-8 ${isDark ? 'text-orange-400' : 'text-orange-500'} mb-3`} />
          <h3 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold mb-2`}>History</h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-400'} text-sm`}>
            {transactions?.transactions?.length || 0} transactions
          </p>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Contacts */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} backdrop-blur-md rounded-xl p-6 shadow-xl border`}>
          <h3 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold text-lg mb-4`}>Recent Contacts</h3>
          {contacts?.contacts?.slice(0, 5).map((contact) => (
            <div key={contact.username} className="flex items-center space-x-3 py-2">
              <div className={`w-8 h-8 ${isDark ? 'bg-gradient-to-r from-orange-400 to-blue-400' : 'bg-gradient-to-r from-orange-500 to-blue-500'} rounded-full flex items-center justify-center overflow-hidden shadow-md`}>
                {contact.profilePicture ? (
                  <img
                    src={`https://nakama-production-1850.up.railway.app${contact.profilePicture}`}
                    alt={`${contact.username}'s profile`}
                    className="w-full h-full rounded-full object-cover"
                    style={(() => {
                      const settings = window.getSavedImageSettings?.(contact.username) || { position: { x: 50, y: 50 }, zoom: 100 };
                      return {
                        objectPosition: `${settings.position.x}% ${settings.position.y}%`,
                        transform: `scale(${settings.zoom / 100})`,
                        transformOrigin: 'center center'
                      };
                    })()}
                  />
                ) : (
                  <span className={`${isDark ? 'text-white' : 'text-gray-900'} text-xs font-semibold`}>
                    {contact.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium`}>@{contact.username}</p>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-400'} text-sm`}>{contact.bio || 'No bio available'}</p>
              </div>
            </div>
          )) || <p className={`${isDark ? 'text-gray-400' : 'text-gray-400'}`}>No contacts yet</p>}
        </div>

        {/* Recent Transactions */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} backdrop-blur-md rounded-xl p-6 shadow-xl border`}>
          <h3 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold text-lg mb-4`}>Recent Transactions</h3>
          {transactions?.transactions?.slice(0, 5).map((tx) => (
            <div key={tx.signature} className="flex items-center justify-between py-2">
              <div>
                <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium`}>
                  {tx.amount} {tx.token}
                </p>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-400'} text-sm`}>
                  to @{tx.toUsername}
                </p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                tx.status === 'confirmed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {tx.status}
              </span>
            </div>
          )) || <p className={`${isDark ? 'text-gray-400' : 'text-gray-400'}`}>No transactions yet</p>}
        </div>
      </div>
    </div>
  );
};
