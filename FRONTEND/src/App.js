import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { WalletContextProvider } from './contexts/WalletContext';
import { AuthProvider } from './contexts/AuthContext';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Contacts } from './pages/Contacts';
import { Send } from './pages/Send';
import { Transactions } from './pages/Transactions';
import { OAuth } from './pages/OAuth';
import { Landing } from './pages/Landing';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletContextProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-800">
              <Header />
              <main className="container mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/send" element={<Send />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/oauth/authorize" element={<OAuth />} />
                </Routes>
              </main>
              <Toaster position="bottom-right" />
            </div>
          </Router>
        </AuthProvider>
      </WalletContextProvider>
    </QueryClientProvider>
  );
}

export default App;
