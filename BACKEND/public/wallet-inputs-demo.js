// Wallet Inputs Demo JavaScript
let watcher = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize demo
    initDemo();
    
    // Set up event listeners
    setupEventListeners();
    
    // Start status updates
    startStatusUpdates();
});

function initDemo() {
    console.log('Wallet Inputs Demo initialized');
}

function setupEventListeners() {
    // Replace onclick handlers with event listeners
    
    // Simulate search buttons
    document.querySelectorAll('[data-action="simulate-search"]').forEach(button => {
        button.addEventListener('click', function() {
            const chain = this.dataset.chain;
            simulateSearch(chain);
        });
    });
    
    // Simulate analyze buttons
    document.querySelectorAll('[data-action="simulate-analyze"]').forEach(button => {
        button.addEventListener('click', function() {
            const chain = this.dataset.chain;
            simulateAnalyze(chain);
        });
    });
    
    // Manual control buttons
    document.querySelectorAll('[data-action="populate-inputs"]').forEach(button => {
        button.addEventListener('click', populateInputs);
    });
    
    document.querySelectorAll('[data-action="clear-inputs"]').forEach(button => {
        button.addEventListener('click', clearInputs);
    });
    
    document.querySelectorAll('[data-action="start-watching"]').forEach(button => {
        button.addEventListener('click', startWatching);
    });
    
    document.querySelectorAll('[data-action="stop-watching"]').forEach(button => {
        button.addEventListener('click', stopWatching);
    });
}

function startStatusUpdates() {
    // Update status every second
    setInterval(updateStatus, 1000);
    
    // Initial update
    updateStatus();
}

// Simulate search functionality
function simulateSearch(chain) {
    console.log(`Simulating ${chain} portfolio search...`);
    alert(`🔍 Searching ${chain} portfolio...\n\nThis would normally:\n- Fetch wallet data\n- Load transaction history\n- Display portfolio value\n- Show token holdings`);
}

// Simulate analyze functionality
function simulateAnalyze(chain) {
    console.log(`Simulating ${chain} data analysis...`);
    alert(`📊 Analyzing ${chain} data...\n\nThis would normally:\n- Analyze transaction patterns\n- Calculate profit/loss\n- Generate insights\n- Create charts`);
}

// Populate inputs function
function populateInputs() {
    if (NAKAMA && NAKAMA.populateInputs) {
        const count = NAKAMA.populateInputs();
        if (count > 0) {
            console.log(`Populated ${count} inputs`);
        } else {
            console.log('No inputs found to populate');
        }
    } else {
        console.log('NAKAMA widget not loaded');
    }
}

// Clear inputs function
function clearInputs() {
    const inputs = document.querySelectorAll('input[data-nakama-populated="true"]');
    inputs.forEach(input => {
        input.value = '';
        input.style.borderLeft = '';
        input.title = '';
        input.removeAttribute('data-nakama-populated');
        input.removeAttribute('data-nakama-chain');
    });
    console.log(`Cleared ${inputs.length} inputs`);
}

// Start watching function
function startWatching() {
    if (watcher) {
        NAKAMA.stopWatching(watcher);
    }
    watcher = NAKAMA.watchInputs({
        interval: 1000,
        maxAttempts: 60
    });
    console.log('Started watching for wallet inputs');
}

// Stop watching function
function stopWatching() {
    if (watcher) {
        NAKAMA.stopWatching(watcher);
        watcher = null;
        console.log('Stopped watching for wallet inputs');
    }
}

// Update status function
function updateStatus() {
    const user = NAKAMA ? NAKAMA.getUser() : null;
    const wallets = NAKAMA ? NAKAMA.getWallets() : {};
    const statusDisplay = document.getElementById('status-display');
    const walletDisplay = document.getElementById('wallet-display');
    
    if (user) {
        statusDisplay.innerHTML = `
            <p><span class="populated-indicator populated-true"></span>Connected as @${user.displayName || user.username}</p>
            <p>Wallet addresses are ready to be populated!</p>
        `;
        
        const connectedWallets = Object.entries(wallets)
            .filter(([chain, wallet]) => wallet !== null)
            .map(([chain, wallet]) => `
                <div class="wallet-info">
                    <h4>${chain.charAt(0).toUpperCase() + chain.slice(1)}</h4>
                    <div class="wallet-address">${wallet.address}</div>
                </div>
            `).join('');
        
        if (walletDisplay) {
            walletDisplay.innerHTML = connectedWallets || '<p>No wallets connected</p>';
        }
    } else {
        statusDisplay.innerHTML = `
            <p><span class="populated-indicator populated-false"></span>Not connected</p>
            <p>Connect your wallet to populate inputs automatically!</p>
        `;
        if (walletDisplay) {
            walletDisplay.innerHTML = '<p>No wallets connected</p>';
        }
    }
}

// Auto-populate inputs when user connects
document.addEventListener('DOMContentLoaded', () => {
    // Watch for user connection changes
    setInterval(() => {
        const user = NAKAMA ? NAKAMA.getUser() : null;
        if (user) {
            // Auto-populate inputs when user connects
            setTimeout(() => {
                populateInputs();
            }, 1000);
        }
    }, 2000);
});
