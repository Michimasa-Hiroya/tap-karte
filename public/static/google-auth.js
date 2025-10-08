// Google認証専用JavaScript

class GoogleAuth {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.googleClientId = null; // 後で設定
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkAuthenticationStatus();
        this.loadGoogleAPI();
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
        this.googleLoginBtn = document.getElementById('google-login-btn');
        this.authError = document.getElementById('auth-error');
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
        
        // Googleログイン
        if (this.googleLoginBtn) {
            this.googleLoginBtn.addEventListener('click', () => this.handleGoogleLogin());
        }
    }
    
    // Google API読み込み
    async loadGoogleAPI() {
        try {
            // Google Client IDを先に取得
            this.googleClientId = await this.getGoogleClientId();
            
            if (!this.googleClientId) {
                throw new Error('Google Client IDが取得できませんでした');
            }
            
            // Google Identity Services API を動的に読み込み
            if (!window.google) {
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
                
                // スクリプト読み込み完了を待機
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    // タイムアウト設定
                    setTimeout(() => reject(new Error('Google APIの読み込みがタイムアウトしました')), 10000);
                });
            }
            
            // Google Sign-In初期化
            this.initializeGoogleSignIn();
            
        } catch (error) {
            console.error('Google API loading failed:', error);
            this.showError('Google認証の初期化に失敗しました: ' + error.message);
        }
    }
    
    // Google Client ID取得
    async getGoogleClientId() {
        try {
            // サーバーから Google Client ID を取得
            const response = await fetch('/api/auth/google-config');
            if (response.ok) {
                const data = await response.json();
                return data.clientId;
            }
        } catch (error) {
            console.error('Failed to get Google Client ID:', error);
        }
        
        // 正しいGoogle Client ID（本番用 - tap-karte.com ドメイン用）
        return '388638501823-sv6e46462k3f7b57mfltv5r9o9dbh4el.apps.googleusercontent.com';
    }
    
    // Google Sign-In初期化
    initializeGoogleSignIn() {
        try {
            if (window.google && this.googleClientId) {
                console.log('Initializing Google Sign-In with client ID:', this.googleClientId);
                
                google.accounts.id.initialize({
                    client_id: this.googleClientId,
                    callback: (response) => this.handleGoogleSignInResponse(response),
                    auto_select: false,
                    cancel_on_tap_outside: false
                });
                
                console.log('Google Sign-In initialized successfully');
                
            } else {
                throw new Error('Google APIまたはClient IDが利用できません');
            }
        } catch (error) {
            console.error('Google Sign-In initialization error:', error);
            this.showError('Google認証の初期化に失敗しました: ' + error.message);
        }
    }
    
    // 認証状態チェック
    async checkAuthenticationStatus() {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                this.showUnauthenticatedUI();
                return;
            }
            
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.currentUser = data.user;
                    this.authToken = token;
                    this.showAuthenticatedUI();
                } else {
                    localStorage.removeItem('auth_token');
                    this.showUnauthenticatedUI();
                }
            } else {
                localStorage.removeItem('auth_token');
                this.showUnauthenticatedUI();
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            this.showUnauthenticatedUI();
        }
    }
    
    // 認証済みUI表示
    showAuthenticatedUI() {
        if (this.userStatus && this.authButtons) {
            this.userStatus.classList.remove('hidden');
            this.authButtons.classList.add('hidden');
            
            if (this.userName) {
                this.userName.textContent = this.currentUser.display_name || this.currentUser.email;
            }
            
            if (this.userAvatar) {
                if (this.currentUser.profile_image) {
                    this.userAvatar.src = this.currentUser.profile_image;
                } else {
                    // デフォルトアバター
                    const name = this.currentUser.display_name || this.currentUser.email;
                    this.userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff&size=32`;
                }
            }
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
            this.clearError();
        }
    }
    
    // 認証モーダル非表示
    hideAuthModal() {
        if (this.authModal) {
            this.authModal.classList.add('hidden');
            this.clearError();
        }
    }
    
    // Googleログイン処理
    async handleGoogleLogin() {
        try {
            console.log('Google login button clicked');
            console.log('Window.google available:', !!window.google);
            console.log('Client ID:', this.googleClientId);
            
            if (!window.google) {
                throw new Error('Google APIが読み込まれていません');
            }
            
            if (!this.googleClientId) {
                throw new Error('Google Client IDが設定されていません');
            }
            
            // Google One Tap 認証を表示
            google.accounts.id.prompt((notification) => {
                console.log('Google prompt notification:', notification);
                if (notification.isNotDisplayed()) {
                    console.log('Google One Tap not displayed, reason:', notification.getNotDisplayedReason());
                    // フォールバック: 通常のポップアップサインイン
                    this.showGoogleSignInPopup();
                }
            });
            
        } catch (error) {
            console.error('Google login error:', error);
            this.showError('Googleログインに失敗しました: ' + error.message);
        }
    }
    
    // Google サインインポップアップ表示（フォールバック）
    showGoogleSignInPopup() {
        try {
            // 一時的な要素を作成してGoogleボタンをレンダリング
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'fixed';
            tempDiv.style.top = '50%';
            tempDiv.style.left = '50%';
            tempDiv.style.transform = 'translate(-50%, -50%)';
            tempDiv.style.zIndex = '9999';
            tempDiv.style.backgroundColor = 'white';
            tempDiv.style.padding = '20px';
            tempDiv.style.borderRadius = '8px';
            tempDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            document.body.appendChild(tempDiv);
            
            google.accounts.id.renderButton(tempDiv, {
                theme: "outline",
                size: "large",
                width: 300,
                locale: 'ja'
            });
            
            // 5秒後に削除
            setTimeout(() => {
                if (tempDiv.parentNode) {
                    tempDiv.parentNode.removeChild(tempDiv);
                }
            }, 5000);
            
        } catch (error) {
            console.error('Google popup signin error:', error);
            this.showError('Googleサインインポップアップの表示に失敗しました');
        }
    }
    
    // Googleサインインレスポンス処理
    async handleGoogleSignInResponse(response) {
        try {
            // Google JWTトークンをサーバーに送信して認証
            const authResponse = await fetch('/api/auth/google', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: response.credential
                })
            });
            
            const data = await authResponse.json();
            
            if (data.success) {
                // 認証成功
                this.currentUser = data.user;
                this.authToken = data.token;
                
                // トークンを保存
                localStorage.setItem('auth_token', data.token);
                
                // UI更新
                this.showAuthenticatedUI();
                this.hideAuthModal();
                
                // 成功メッセージ
                this.showSuccess('ログインしました');
                
            } else {
                throw new Error(data.error || 'ログインに失敗しました');
            }
        } catch (error) {
            console.error('Google auth response error:', error);
            this.showError('ログイン処理でエラーが発生しました: ' + error.message);
        }
    }
    
    // ログアウト
    async logout() {
        try {
            // サーバーにログアウト通知
            if (this.authToken) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });
            }
            
            // ローカルデータクリア
            localStorage.removeItem('auth_token');
            
            // Google Sign-Out
            if (window.google) {
                google.accounts.id.disableAutoSelect();
            }
            
            // UI更新
            this.showUnauthenticatedUI();
            
            this.showSuccess('ログアウトしました');
            
        } catch (error) {
            console.error('Logout error:', error);
            // エラーでもローカルの状態はクリア
            localStorage.removeItem('auth_token');
            this.showUnauthenticatedUI();
        }
    }
    
    // エラーメッセージ表示
    showError(message) {
        if (this.authError) {
            this.authError.textContent = message;
            this.authError.classList.remove('hidden');
        }
        console.error('Auth Error:', message);
    }
    
    // エラーメッセージクリア
    clearError() {
        if (this.authError) {
            this.authError.textContent = '';
            this.authError.classList.add('hidden');
        }
    }
    
    // 成功メッセージ表示（簡易版）
    showSuccess(message) {
        // 簡易的な成功メッセージ
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
let googleAuth = null;

// DOM読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => {
    googleAuth = new GoogleAuth();
});

// 他のスクリプトから利用するためのエクスポート
window.GoogleAuth = GoogleAuth;
window.getGoogleAuth = () => googleAuth;