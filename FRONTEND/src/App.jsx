import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { WalletContextProvider } from './contexts/WalletContext';
import { AuthProvider, ThemeProvider, useTheme } from './contexts/AuthContext';
import { CloudinaryProvider } from './contexts/CloudinaryContext';
import { Header } from './components/Header';
import CloudinaryDebug from './components/CloudinaryDebug';
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
      <CloudinaryProvider>
        <ThemeProvider>
          <WalletContextProvider>
            <AuthProvider>
              <Router>
                <AppContent />
              </Router>
            </AuthProvider>
          </WalletContextProvider>
        </ThemeProvider>
      </CloudinaryProvider>
    </QueryClientProvider>
  );
}

// Separate component to use theme hook
const AppContent = () => {
  const themeResult = useTheme();

  // Handle case where theme context might not be available
  if (!themeResult) {
    console.error('🎨 AppContent: Theme context not available, using fallback');

    const fallbackStyle = {
      backgroundColor: '#000000',
      minHeight: '100vh',
      color: '#ffffff',
      padding: '20px'
    };

    return (
      <div style={fallbackStyle}>
        <h1 style={{ color: '#ffffff', marginBottom: '20px' }}>NAKAMA - Theme Loading...</h1>
        <p style={{ color: '#cccccc' }}>
          Theme system is initializing. If you see this for more than a few seconds, there might be an issue.
        </p>
        <div style={{
          backgroundColor: '#1f2937',
          padding: '20px',
          borderRadius: '8px',
          marginTop: '20px',
          border: '1px solid #374151'
        }}>
          <h2 style={{ color: '#ffffff', marginBottom: '10px' }}>Fallback Theme Active</h2>
          <p style={{ color: '#cccccc' }}>
            Black background with gray cards - this means the theme system encountered an error but the app is working.
          </p>
        </div>
      </div>
    );
  }

  const { isDark } = themeResult;
  console.log('🎨 AppContent: Theme working, isDark:', isDark);

  const bgStyle = {
    backgroundColor: '#000000',
    minHeight: '100vh',
    transition: 'background-color 0.5s ease'
  };

  return (
    <div style={bgStyle}>
      <CloudinaryDebug />
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
