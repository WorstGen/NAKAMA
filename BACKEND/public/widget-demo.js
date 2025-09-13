/**
 * NAKAMA Widget Demo Script
 * External JavaScript file to avoid CSP issues
 */

let currentTheme = 'dark';
let currentSize = 'medium';
let demoUsers = ['beripool', 'worstgen', 'nakama'];
let currentUserIndex = 0;

// Initialize with a demo user
async function initDemo() {
    const container = document.getElementById('demo-widget');
    if (!container) {
        console.error('Demo container not found');
        return;
    }
    
    // Show loading state
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">Loading NAKAMA profile...</div>';
    
    try {
        // Try to load the current demo user
        const username = demoUsers[currentUserIndex];
        console.log('Loading demo user:', username);
        
        await NAKAMA.embed(username, 'demo-widget', {
            theme: currentTheme,
            size: currentSize,
            showBio: true,
            showWallet: true,
            showVerified: true
        });
        
        console.log('Demo loaded successfully');
        
    } catch (error) {
        console.error('Demo loading error:', error);
        
        // Show error state with fallback
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="color: #dc2626; margin-bottom: 20px;">
                    <strong>Demo Error</strong><br>
                    Could not load profile. This might be because:
                </div>
                <ul style="text-align: left; color: #666; max-width: 300px; margin: 0 auto;">
                    <li>The user doesn't exist</li>
                    <li>API is not accessible</li>
                    <li>Network connection issue</li>
                </ul>
                <button class="try-next-user-btn" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Try Different User
                </button>
                <div style="margin-top: 20px; font-size: 14px; color: #888;">
                    <strong>Manual Test:</strong><br>
                    <code>NAKAMA.embed('your-username', 'demo-widget')</code>
                </div>
            </div>
        `;
    }
}

function tryNextUser() {
    currentUserIndex = (currentUserIndex + 1) % demoUsers.length;
    initDemo();
}

function setTheme(theme) {
    currentTheme = theme;
    document.querySelectorAll('.theme-toggle button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
    initDemo();
}

function setSize(size) {
    currentSize = size;
    document.querySelectorAll('.size-toggle button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-size="${size}"]`).classList.add('active');
    initDemo();
}

// Test NAKAMA widget availability
function testNAKAMA() {
    if (typeof NAKAMA === 'undefined') {
        console.error('NAKAMA widget not loaded');
        document.getElementById('demo-widget').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc2626;">
                <strong>NAKAMA Widget Not Loaded</strong><br>
                Check the browser console for errors.
            </div>
        `;
        return false;
    }
    console.log('NAKAMA widget loaded:', NAKAMA.version);
    return true;
}

// Test custom user
async function testCustomUser() {
    const username = document.getElementById('test-username').value.trim();
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    const container = document.getElementById('demo-widget');
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">Loading profile for @' + username + '...</div>';
    
    try {
        await NAKAMA.embed(username, 'demo-widget', {
            theme: currentTheme,
            size: currentSize,
            showBio: true,
            showWallet: true,
            showVerified: true
        });
        console.log('Custom user test successful:', username);
    } catch (error) {
        console.error('Custom user test failed:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="color: #dc2626; margin-bottom: 20px;">
                    <strong>User Not Found</strong><br>
                    Could not find profile for "@${username}"
                </div>
                <div style="color: #666; margin-bottom: 20px;">
                    This user might not exist on NAKAMA or might not have a public profile.
                </div>
                <button class="back-to-demo-btn" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Back to Demo
                </button>
            </div>
        `;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Theme toggle buttons
    document.querySelectorAll('[data-theme]').forEach(button => {
        button.addEventListener('click', (e) => {
            const theme = e.target.getAttribute('data-theme');
            setTheme(theme);
        });
    });
    
    // Size toggle buttons
    document.querySelectorAll('[data-size]').forEach(button => {
        button.addEventListener('click', (e) => {
            const size = e.target.getAttribute('data-size');
            setSize(size);
        });
    });
    
    // Test user button
    const testUserBtn = document.getElementById('test-user-btn');
    if (testUserBtn) {
        testUserBtn.addEventListener('click', testCustomUser);
    }
    
    // Enter key on username input
    const testUsernameInput = document.getElementById('test-username');
    if (testUsernameInput) {
        testUsernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                testCustomUser();
            }
        });
    }
    
    // Event delegation for dynamically created buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('try-next-user-btn')) {
            tryNextUser();
        } else if (e.target.classList.contains('back-to-demo-btn')) {
            initDemo();
        }
    });
}

// Initialize demo when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Setup event listeners first
    setupEventListeners();
    
    // Wait a bit for the NAKAMA script to load
    setTimeout(() => {
        if (testNAKAMA()) {
            initDemo();
        }
    }, 1000);
});

// Make functions globally available for debugging
window.testNAKAMA = testNAKAMA;
window.initDemo = initDemo;
window.tryNextUser = tryNextUser;
window.testCustomUser = testCustomUser;
