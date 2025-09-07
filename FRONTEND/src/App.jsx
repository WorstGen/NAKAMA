import React from 'react';
import './App.css';

function App() {
  console.log('App component rendering...');

  return (
    <div style={{
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        🚀 SolConnect is Working!
      </h1>
      <p style={{ fontSize: '1.2rem' }}>
        React is rendering successfully. The build is working!
      </p>
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px'
      }}>
        <h2>Debug Info:</h2>
        <p>✅ React is loaded</p>
        <p>✅ Vite build is working</p>
        <p>✅ CSS is loading</p>
      </div>
    </div>
  );
}

export default App;
