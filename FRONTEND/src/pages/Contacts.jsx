import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import ProfileImage from '../components/ProfileImage';
import { 
  UserPlusIcon, 
  PaperAirplaneIcon, 
  TrashIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

export const Contacts = () => {
  const { isAuthenticated } = useAuth();
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const queryClient = useQueryClient();

  const { data: contacts, isLoading } = useQuery('contacts', api.getContacts, {
    enabled: isAuthenticated,
  });

  const addContactMutation = useMutation(api.addContact, {
    onSuccess: () => {
      queryClient.invalidateQueries('contacts');
      toast.success('Contact added successfully!');
      setSearchUsername('');
      setSearchResults(null);
    },
    onError: (error) => {
      toast.error(error.error || 'Failed to add contact');
    },
  });

  const removeContactMutation = useMutation(api.removeContact, {
    onSuccess: () => {
      queryClient.invalidateQueries('contacts');
      toast.success('Contact removed');
    },
    onError: (error) => {
      toast.error(error.error || 'Failed to remove contact');
    },
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;

    setSearching(true);
    try {
      const result = await api.searchUser(searchUsername.trim());
      setSearchResults(result);
      if (!result.found) {
        toast.error('User not found');
      }
    } catch (error) {
      toast.error('Search failed');
      setSearchResults(null);
    } finally {
      setSearching(false);
    }
  };

  const handleAddContact = (username) => {
    addContactMutation.mutate(username);
  };

  const handleRemoveContact = (username) => {
    if (window.confirm(`Remove @${username} from contacts?`)) {
      removeContactMutation.mutate(username);
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
    <div className="max-w-4xl mx-auto px-4 sm:px-0">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-8">
        <h1 className="text-3xl font-bold text-white mb-8">Contact Book</h1>

        {/* Search Section */}
        <div className="bg-white/5 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Add New Contact</h2>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                placeholder="Search by username..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !searchUsername.trim()}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Search Results */}
          {searchResults && (
            <div className="bg-white/10 rounded-lg p-4">
              {searchResults.found ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <ProfileImage
                      src={searchResults.profilePicture || null}
                      username={searchResults.username}
                      size="md"
                    />
                    <div>
                      <p className="text-white font-semibold">@{searchResults.username}</p>
                      <p className="text-white/60 text-sm">{searchResults.bio}</p>
                      {searchResults.isVerified && (
                        <span className="text-green-400 text-xs">✓ Verified</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddContact(searchResults.username)}
                    disabled={addContactMutation.isLoading}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <UserPlusIcon className="w-4 h-4" />
                    Add Contact
                  </button>
                </div>
              ) : (
                <p className="text-white/60">User not found</p>
              )}
            </div>
          )}
        </div>

        {/* Contacts List */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-6">
            Your Contacts ({contacts?.contacts?.length || 0})
          </h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-white/60">Loading contacts...</p>
            </div>
          ) : contacts?.contacts?.length > 0 ? (
            <div className="space-y-4">
              {contacts.contacts.map((contact) => (
                <div key={contact.username} className="bg-white/5 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <ProfileImage
                      src={contact.profilePicture || null}
                      username={contact.username}
                      size="md"
                    />
                    <div>
                      <p className="text-white font-semibold">@{contact.username}</p>
                      <p className="text-white/60 text-sm">{contact.bio}</p>
                      <p className="text-white/40 text-xs font-mono">{contact.walletAddress.slice(0, 8)}...{contact.walletAddress.slice(-8)}</p>
                      {contact.isVerified && (
                        <span className="text-green-400 text-xs">✓ Verified</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
                    <Link
                      to={`/send?recipient=${contact.username}`}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <PaperAirplaneIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Send</span>
                    </Link>
                    <button
                      onClick={() => handleRemoveContact(contact.username)}
                      disabled={removeContactMutation.isLoading}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <UserPlusIcon className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <p className="text-white/60 text-lg mb-2">No contacts yet</p>
              <p className="text-white/40">Search for users by their username to add them to your contact book.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
