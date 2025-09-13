import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { WagmiConfig } from 'wagmi';
import { Web3Modal } from '@web3modal/react';
import { WalletContextProvider } from './contexts/WalletContext';
import { MultiWalletProvider } from './contexts/MultiWalletContext';
import { PhantomMultiChainProvider } from './contexts/PhantomMultiChainContext';
import { WalletConnectProvider } from './contexts/WalletConnectContext';
import { AuthProvider, ThemeProvider, useTheme } from './contexts/AuthContext';
import { CloudinaryProvider } from './contexts/CloudinaryContext';
import { wagmiConfig, ethereumClient, projectId } from './config/web3Config';
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
      <WagmiConfig config={wagmiConfig}>
        <CloudinaryProvider>
          <ThemeProvider>
            <WalletContextProvider>
              <MultiWalletProvider>
                <PhantomMultiChainProvider>
                  <WalletConnectProvider>
                    <AuthProvider>
                      <Router>
                        <AppContent />
                      </Router>
                    </AuthProvider>
                  </WalletConnectProvider>
                </PhantomMultiChainProvider>
              </MultiWalletProvider>
            </WalletContextProvider>
          </ThemeProvider>
        </CloudinaryProvider>
        {/* Hidden Web3Modal - triggered programmatically */}
        <div style={{ display: 'none' }}>
          <w3m-connect-button />
        </div>
        <Web3Modal 
          projectId={projectId} 
          ethereumClient={ethereumClient}
          themeMode="dark"
          themeVariables={{
            '--w3m-accent-color': '#3b82f6',
            '--w3m-background-color': '#1f2937',
            '--w3m-z-index': '9999',
            '--w3m-overlay-backdrop-filter': 'blur(4px)'
          }}
          defaultChain={1}
          enableAccountView={true}
          enableExplorer={false}
          enableNetworkView={true}
        />
      </WagmiConfig>
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

  // const { isDark } = themeResult;
  // console.log('🎨 AppContent: Theme working, isDark:', isDark);

  const bgStyle = {
    backgroundColor: '#000000',
    minHeight: '100vh',
    transition: 'background-color 0.5s ease'
  };

  return (
    <div style={bgStyle} className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
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
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#ffffff',
            border: '1px solid #374151',
            borderRadius: '8px',
            fontSize: '14px'
          },
          success: {
            iconTheme: {
              primary: '#3b82f6',
              secondary: '#ffffff'
            }
          },
          error: {
            iconTheme: {
              primary: '#f97316',
              secondary: '#ffffff'
            }
          }
        }}
      />
    </div>
  );
};

export default App;
