const API_BASE = 'http://localhost:3000/api';

let currentUser = null;

// Clear any corrupted data on page load
localStorage.removeItem('currentUser');
console.log('🧹 CLEARED: Removed any existing user data');

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 AUTH: Initializing authentication system...');
    initializeApp();
});

function initializeApp() {
    console.log('🔍 AUTH: Checking for saved user...');
    
    // IMPORTANT: Don't check for saved user on login page
    // Always show login page first
    showAuthPage();

    // Setup form submission
    const loginForm = document.getElementById('loginForm');
    const phoneInput = document.getElementById('phoneInput');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Add real-time validation
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            const value = e.target.value.replace(/\D/g, '');
            e.target.value = value;
            
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                submitBtn.disabled = value.length !== 10;
            }
        });
    }

    // Show welcome toast
    showToast('Welcome to Navi Mumbai Utilities Platform', 'info');
}

// Show authentication page
function showAuthPage() {
    console.log('🎯 AUTH: Showing login page');
    const authSection = document.getElementById('authSection');
    const dashboardSection = document.getElementById('dashboardSection');
    
    if (authSection) authSection.classList.remove('d-none');
    if (dashboardSection) dashboardSection.classList.add('d-none');
}

// Fill demo credentials
function fillDemo(phone) {
    console.log('📋 AUTH: Filling demo credentials:', phone);
    const phoneInput = document.getElementById('phoneInput');
    if (phoneInput) {
        phoneInput.value = phone;
        
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
        }
        
        showToast(`Demo phone ${phone} filled`, 'success');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastElement = document.getElementById('authToast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (toastElement && toastMessage) {
        toastMessage.textContent = message;
        toastElement.className = `toast ${type === 'error' ? 'bg-danger text-white' : ''}`;
        
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const phone = document.getElementById('phoneInput').value.trim();
    
    console.log('🔐 AUTH: Login attempt for phone:', phone);
    
    if (!phone || phone.length !== 10) {
        showToast('Please enter a valid 10-digit phone number', 'error');
        return;
    }

    // Show loading state
    setLoadingState(true);

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ phone })
        });

        console.log('📡 AUTH: Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ AUTH: Login result:', result);

        if (result.success) {
            // Login successful
            currentUser = result.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            console.log('🎉 AUTH: Login successful!');
            console.log('👤 AUTH: User details:', currentUser);
            console.log('🔄 AUTH: Redirecting to:', currentUser.role === 'admin' ? 'Admin Dashboard' : 'User Dashboard');
            
            showToast(`Welcome back, ${result.user.name}!`, 'success');
            
            // Redirect after showing success message
            setTimeout(() => {
                redirectToDashboard();
            }, 1500);
            
        } else {
            // New user - register
            console.log('🆕 AUTH: User not found, proceeding to registration...');
            await registerNewUser(phone);
        }
        
    } catch (error) {
        console.error('❌ AUTH: Login error:', error);
        showToast('Connection error. Please check if server is running!', 'error');
        setLoadingState(false);
    }
}

// Register new user
async function registerNewUser(phone) {
    const name = prompt('Welcome to Navi Mumbai Utilities!\n\nPlease enter your name:');
    if (!name) {
        showToast('Registration cancelled', 'error');
        setLoadingState(false);
        return;
    }

    const area = prompt('Please enter your area (e.g., Vashi, Nerul, Kharghar):');
    if (!area) {
        showToast('Registration cancelled', 'error');
        setLoadingState(false);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ phone, name, area })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ AUTH: Registration result:', result);

        if (result.success) {
            currentUser = result.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            console.log('🎉 AUTH: Registration successful!');
            console.log('👤 AUTH: New user details:', currentUser);
            
            showToast(`Account created! Welcome, ${name}!`, 'success');
            
            setTimeout(() => {
                redirectToDashboard();
            }, 1500);
        } else {
            showToast('Registration failed: ' + result.message, 'error');
            setLoadingState(false);
        }
        
    } catch (error) {
        console.error('❌ AUTH: Registration error:', error);
        showToast('Registration failed. Please try again.', 'error');
        setLoadingState(false);
    }
}

// Set loading state
function setLoadingState(isLoading) {
    const submitBtn = document.getElementById('submitBtn');
    if (!submitBtn) return;
    
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    
    if (isLoading) {
        submitBtn.disabled = true;
        if (btnText) btnText.classList.add('d-none');
        if (btnSpinner) btnSpinner.classList.remove('d-none');
    } else {
        submitBtn.disabled = false;
        if (btnText) btnText.classList.remove('d-none');
        if (btnSpinner) btnSpinner.classList.add('d-none');
    }
}

// Redirect to appropriate dashboard
function redirectToDashboard() {
    console.log('🔄 AUTH: Starting redirect process...');
    
    if (!currentUser) {
        console.log('❌ AUTH: No current user, staying on login page');
        return;
    }

    console.log('👤 AUTH: Current user role:', currentUser.role);
    console.log('📊 AUTH: User object:', currentUser);

    // Redirect based on role
    if (currentUser.role === 'admin') {
        console.log('🎯 AUTH: Redirecting to ADMIN dashboard');
        window.location.href = '/admin';
    } else {
        console.log('🎯 AUTH: Redirecting to USER dashboard');
        window.location.href = '/user-dashboard';
    }
}

// Logout function
function logout() {
    console.log('🚪 AUTH: Logging out...');
    currentUser = null;
    localStorage.removeItem('currentUser');
    window.location.href = '/';
}

// Check server status
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        if (response.ok) {
            console.log('✅ AUTH: Server is running');
        }
    } catch (error) {
        console.log('❌ AUTH: Server is not running');
        showToast('⚠️ Backend server not detected. Please run: cd backend && node server.js', 'error');
    }
}

// Check server status when page loads
checkServerStatus();