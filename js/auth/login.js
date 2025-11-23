class LoginManager {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.init();
    }

    init() {
        console.log('🔐 Login Manager initializing...');
        this.setupEventListeners();
        
        // Check if user is already logged in
        this.checkExistingAuth();
    }

    async checkExistingAuth() {
        console.log('🔍 Checking existing authentication...');
        await authManager.ready;
        
        const user = authManager.getCurrentUser();
        console.log('👤 Current user on page load:', user);
        
        if (user) {
            console.log('✅ User already logged in, redirecting...');
            this.redirectAfterLogin();
        }
    }

    setupEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleLogin(e));
            console.log('✅ Login form event listener added');
        } else {
            console.error('❌ Login form not found!');
        }
        
        const forgotPassword = document.getElementById('forgotPassword');
        if (forgotPassword) {
            forgotPassword.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleForgotPassword();
            });
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        console.log('🚀 Login form submitted');
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember')?.checked || false;

        console.log('📧 Email:', email);

        if (!email || !password) {
            Helpers.showAlert('Please fill in all fields', 'error');
            return;
        }

        if (!Helpers.validateEmail(email)) {
            Helpers.showAlert('Please enter a valid email address', 'error');
            return;
        }

        const submitBtn = this.form.querySelector('button[type="submit"]');
        const originalText = Helpers.showLoading(submitBtn);

        try {
            console.log('🔐 Attempting login...');
            const result = await authManager.signIn(email, password);
            
            if (result.success) {
                console.log('✅ Login successful!');
                Helpers.showAlert('Login successful! Redirecting...', 'success');
                
                if (remember && window.firebaseAuth) {
                    await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                    console.log('💾 Login persistence set to LOCAL');
                }

                // Wait a moment for auth state to fully update
                setTimeout(() => {
                    this.redirectAfterLogin();
                }, 1500);
            } else {
                console.error('❌ Login failed:', result.error);
                Helpers.showAlert(result.error, 'error');
            }
        } catch (error) {
            console.error('💥 Unexpected login error:', error);
            Helpers.showAlert('An unexpected error occurred', 'error');
        } finally {
            Helpers.hideLoading(submitBtn, originalText);
        }
    }

    async redirectAfterLogin() {
        console.log('🔄 Starting redirect process...');
        
        // Wait for auth manager to be ready
        await authManager.ready;
        
        const user = authManager.getCurrentUser();
        console.log('👤 User for redirect:', user);
        
        if (!user) {
            console.error('❌ No user found for redirect');
            return;
        }

        try {
            // Check if user is admin
            // Extra diagnostics: log token claims and Firestore user doc
            try {
                if (firebaseAuth && firebaseAuth.currentUser) {
                    const idTokenResult = await firebaseAuth.currentUser.getIdTokenResult();
                    console.log('🔐 ID token claims:', idTokenResult.claims);
                }
            } catch (tokenErr) {
                console.warn('⚠ Could not read ID token claims:', tokenErr);
            }

            try {
                const db = window.firebaseDb || (typeof firebase !== 'undefined' && typeof firebase.firestore === 'function' ? firebase.firestore() : null);
                if (db) {
                    const doc = await db.collection('users').doc(user.uid).get();
                    console.log('📋 Firestore user doc:', doc.exists ? doc.data() : 'not found');
                } else {
                    console.warn('⚠ Firestore not available for diagnostic read');
                }
            } catch (dbErr) {
                console.warn('⚠ Could not read Firestore user doc:', dbErr);
            }

            const isAdmin = await authManager.isAdmin();
            console.log('👑 Is admin?', isAdmin);
            
            let redirectUrl = 'dashboard.html'; // Default to user dashboard
            
            if (isAdmin) {
                redirectUrl = 'admin/dashboard.html';
                console.log('🎯 Redirecting to admin dashboard');
            } else {
                console.log('🎯 Redirecting to user dashboard');
            }
            
            console.log('📍 Final redirect URL:', redirectUrl);
            
            // Force redirect
            window.location.href = redirectUrl;
            
        } catch (error) {
            console.error('💥 Error during redirect check:', error);
            // Fallback to regular dashboard
            window.location.href = 'dashboard.html';
        }
    }

    async handleForgotPassword() {
        const email = prompt('Please enter your email address:');
        if (!email) return;

        if (!Helpers.validateEmail(email)) {
            alert('Please enter a valid email address');
            return;
        }

        try {
            const result = await authManager.resetPassword(email);
            if (result.success) {
                alert('Password reset email sent! Please check your inbox.');
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            alert('An error occurred. Please try again.');
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM loaded, initializing LoginManager');
        new LoginManager();
    });
} else {
    console.log('📄 DOM already loaded, initializing LoginManager');
    new LoginManager();
}