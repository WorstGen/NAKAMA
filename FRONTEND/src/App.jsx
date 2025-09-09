import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { WalletContextProvider } from './contexts/WalletContext';
import { AuthProvider, ThemeProvider, useTheme } from './contexts/AuthContext';
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
  console.log('🚀 NAKAMA App is rendering!');

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <WalletContextProvider>
          <AuthProvider>
            <Router>
              <AppContent />
            </Router>
          </AuthProvider>
        </WalletContextProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Separate component to use theme hook
const AppContent = () => {
  const { isDark } = useTheme();

  console.log('🎨 Theme isDark:', isDark);

  const bgStyle = {
    backgroundColor: isDark ? '#000000' : '#f9fafb',
    minHeight: '100vh',
    transition: 'background-color 0.5s ease'
  };

  return (
    <div style={bgStyle}>
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
  );
};

export default App;
