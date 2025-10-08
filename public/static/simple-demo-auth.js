// シンプルなデモ認証のみのJavaScript

class SimpleDemoAuth {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkAuthenticationStatus();
        
        console.log('[SimpleDemoAuth] Initialized demo-only authentication system');
    }
    
    initializeElements() {
        // Authentication elements
        this.userStatus = document.getElementById('user-status');
        this.authButtons = document.getElementById('auth-buttons');
        this.loginBtn = document.getElementById('login-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.userAvatar = document.getElementById('user-avatar');
        this.userName = document.getElementById('user-name');
        
        // Modal elements
        this.authModal = document.getElementById('auth-modal');
        this.closeModalBtn = document.getElementById('close-modal');
        this.demoLoginBtn = document.getElementById('demo-login-btn');
    }
    
    attachEventListeners() {
        // ログインボタン
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', () => this.showAuthModal());
        }
        
        // ログアウトボタン
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // モーダル関連
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.hideAuthModal());
        }
        
        if (this.authModal) {
            this.authModal.addEventListener('click', (e) => {
                if (e.target === this.authModal) {
                    this.hideAuthModal();
                }
            });
        }
        
        // デモログインボタン
        if (this.demoLoginBtn) {
            this.demoLoginBtn.addEventListener('click', () => this.handleDemoLogin());
        }
    }
    
    // 認証状態チェック
    checkAuthenticationStatus() {
        try {
            console.log('[SimpleDemoAuth] Checking authentication status...');
            
            const token = localStorage.getItem('demo_auth_token');
            const userDataStr = localStorage.getItem('demo_user_data');
            
            if (token && userDataStr) {
                try {
                    this.currentUser = JSON.parse(userDataStr);
                    this.authToken = token;
                    this.showAuthenticatedUI();
                    console.log('[SimpleDemoAuth] Restored demo session:', this.currentUser);
                } catch (parseError) {
                    console.log('[SimpleDemoAuth] Failed to parse saved user data');
                    localStorage.removeItem('demo_auth_token');
                    localStorage.removeItem('demo_user_data');
                    this.showUnauthenticatedUI();
                }
            } else {
                console.log('[SimpleDemoAuth] No demo session found');
                this.showUnauthenticatedUI();
            }
        } catch (error) {
            console.error('[SimpleDemoAuth] Authentication check failed:', error);
            this.showUnauthenticatedUI();
        }
    }
    
    // 認証済みUI表示
    showAuthenticatedUI() {
        console.log('[SimpleDemoAuth] Updating UI to authenticated state');
        
        if (this.userStatus && this.authButtons) {
            this.userStatus.classList.remove('hidden');
            this.authButtons.classList.add('hidden');
            
            if (this.userName) {
                const displayName = this.currentUser.name || this.currentUser.email;
                this.userName.textContent = displayName;
            }
            
            if (this.userAvatar) {
                this.userAvatar.src = this.currentUser.picture || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.name)}&background=f472b6&color=fff&size=32`;
            }
        }
        
        // 認証成功の視覚効果
        this.showAuthenticationIndicator();
    }
    
    // 認証状態インジケーター
    showAuthenticationIndicator() {
        if (this.userStatus) {
            this.userStatus.style.backgroundColor = '#dcfce7'; // 薄緑
            this.userStatus.style.transition = 'background-color 0.3s ease';
            
            setTimeout(() => {
                this.userStatus.style.backgroundColor = '';
            }, 2000);
        }
    }
    
    // 未認証UI表示
    showUnauthenticatedUI() {
        if (this.userStatus && this.authButtons) {
            this.userStatus.classList.add('hidden');
            this.authButtons.classList.remove('hidden');
        }
        this.currentUser = null;
        this.authToken = null;
    }
    
    // 認証モーダル表示
    showAuthModal() {
        if (this.authModal) {
            this.authModal.classList.remove('hidden');
        }
    }
    
    // 認証モーダル非表示
    hideAuthModal() {
        if (this.authModal) {
            this.authModal.classList.add('hidden');
        }
    }
    
    // デモログイン処理
    handleDemoLogin() {
        console.log('[SimpleDemoAuth] Starting demo login...');
        
        // デモユーザー情報
        const demoUser = {
            id: 'demo_user_001',
            name: 'デモユーザー',
            email: 'demo@tapcarte.example.com',
            picture: 'https://ui-avatars.com/api/?name=デモユーザー&background=f472b6&color=fff&size=128'
        };
        
        // デモトークン生成
        const demoToken = 'demo_token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // セッション保存
        this.currentUser = demoUser;
        this.authToken = demoToken;
        localStorage.setItem('demo_auth_token', demoToken);
        localStorage.setItem('demo_user_data', JSON.stringify(demoUser));
        
        // UI更新
        this.showAuthenticatedUI();
        this.hideAuthModal();
        
        // 成功メッセージ
        this.showSuccess('🎉 デモログインが完了しました！タップカルテをお試しください。');
    }
    
    // ログアウト
    logout() {
        try {
            console.log('[SimpleDemoAuth] Starting logout process...');
            
            // ローカルストレージクリア
            localStorage.removeItem('demo_auth_token');
            localStorage.removeItem('demo_user_data');
            
            // インスタンス変数クリア
            this.currentUser = null;
            this.authToken = null;
            
            // UI更新
            this.showUnauthenticatedUI();
            
            this.showSuccess('✅ ログアウトが完了しました');
            
            console.log('[SimpleDemoAuth] Logout completed');
            
        } catch (error) {
            console.error('[SimpleDemoAuth] Logout error:', error);
            
            // エラーでもローカルの状態は強制クリア
            localStorage.removeItem('demo_auth_token');
            localStorage.removeItem('demo_user_data');
            this.currentUser = null;
            this.authToken = null;
            this.showUnauthenticatedUI();
        }
    }
    
    // 成功メッセージ表示
    showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // 現在のユーザー取得
    getCurrentUser() {
        return this.currentUser;
    }
    
    // 認証トークン取得
    getAuthToken() {
        return this.authToken;
    }
    
    // 認証状態確認
    isAuthenticated() {
        return !!this.currentUser && !!this.authToken;
    }
}

// グローバルインスタンス
let simpleDemoAuth = null;

// DOM読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => {
    simpleDemoAuth = new SimpleDemoAuth();
});

// 他のスクリプトから利用するためのエクスポート
window.SimpleDemoAuth = SimpleDemoAuth;
window.getSimpleDemoAuth = () => simpleDemoAuth;