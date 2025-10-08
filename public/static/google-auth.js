// Google認証専用JavaScript

class GoogleAuth {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.googleClientId = null; // 后で設定
        
        this.initializeElements();
        this.attachEventListeners();
        
        // OAuth認証成功チェック
        this.checkOAuthCallback();
        
        this.checkAuthenticationStatus();
        
        // モバイル環境を考慮した遅延読み込み
        setTimeout(() => {
            this.loadGoogleAPI();
        }, 1000);
        
        // 自動セッション管理の開始
        this.startSessionManagement();
    }
    
    // 自動セッション管理
    startSessionManagement() {
        // 5分ごとにセッション状態をチェック
        this.sessionCheckInterval = setInterval(() => {
            if (this.isAuthenticated()) {
                this.checkAuthenticationStatus();
            }
        }, 5 * 60 * 1000); // 5分
        
        // 30分ごとにセッション延長
        this.sessionRefreshInterval = setInterval(() => {
            if (this.isAuthenticated()) {
                this.refreshSession();
            }
        }, 30 * 60 * 1000); // 30分
        
        // ページ非表示時の処理
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // ページが非表示になった時
                this.lastActiveTime = Date.now();
            } else {
                // ページが表示された時
                const inactiveTime = Date.now() - (this.lastActiveTime || Date.now());
                if (inactiveTime > 60 * 60 * 1000) { // 1時間以上非アクティブ
                    console.log('[GoogleAuth] Long inactivity detected, checking auth status');
                    this.checkAuthenticationStatus();
                }
            }
        });
        
        console.log('[GoogleAuth] Session management started');
    }
    
    // セッション管理停止
    stopSessionManagement() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
        
        if (this.sessionRefreshInterval) {
            clearInterval(this.sessionRefreshInterval);
            this.sessionRefreshInterval = null;
        }
        
        console.log('[GoogleAuth] Session management stopped');
    }
    
    // OAuth認証コールバック結果をチェック
    checkOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const authSuccess = urlParams.get('auth_success');
        const token = urlParams.get('token');
        const error = urlParams.get('error');
        
        if (error) {
            console.error('[GoogleAuth] OAuth error:', error);
            this.showError('Google認証でエラーが発生しました: ' + error);
            // URLからエラーパラメータを削除
            this.cleanUrl();
            return;
        }
        
        if (authSuccess && token) {
            console.log('[GoogleAuth] OAuth authentication successful');
            
            // トークンを保存
            localStorage.setItem('auth_token', token);
            this.authToken = token;
            
            // ユーザー情報を取得してUI更新
            this.fetchUserInfoFromToken(token);
            
            // URLをクリーン
            this.cleanUrl();
            
            // 成功メッセージ
            this.showSuccess('🎉 Google認証が完了しました！');
        }
    }
    
    // URLからクエリパラメータを削除
    cleanUrl() {
        const url = new URL(window.location);
        url.search = '';
        window.history.replaceState({}, '', url);
    }
    
    // JWTトークンからユーザー情報を取得
    async fetchUserInfoFromToken(token) {
        try {
            // JWT payload をデコード（簡易版）
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const userData = JSON.parse(jsonPayload);
            
            this.currentUser = {
                id: userData.sub,
                email: userData.email,
                display_name: userData.name,
                profile_image: userData.picture
            };
            
            this.showAuthenticatedUI();
            
        } catch (error) {
            console.error('[GoogleAuth] Failed to decode user info:', error);
            // フォールバック: サーバーから取得
            this.checkAuthenticationStatus();
        }
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
        
        // 強制本番認証ボタン
        const forceRealAuthBtn = document.getElementById('force-real-auth-btn');
        if (forceRealAuthBtn) {
            forceRealAuthBtn.addEventListener('click', () => this.forceRealAuthentication());
        }
        
        // モバイル専用デモ認証ボタン
        const mobileDemoAuthBtn = document.getElementById('mobile-demo-auth-btn');
        if (mobileDemoAuthBtn) {
            mobileDemoAuthBtn.addEventListener('click', () => this.mobileOptimizedDemo());
        }
    }
    
    // Google API読み込み（静的読み込み方式）
    async loadGoogleAPI() {
        try {
            console.log('[GoogleAuth] Starting Google API loading...');
            
            // Google Client IDを先に取得
            this.googleClientId = await this.getGoogleClientId();
            console.log('[GoogleAuth] Retrieved Client ID:', this.googleClientId);
            
            if (!this.googleClientId) {
                throw new Error('Google Client IDが取得できませんでした');
            }
            
            // HTMLで事前読み込みされたGoogle APIを待機
            console.log('[GoogleAuth] Waiting for pre-loaded Google API...');
            await this.waitForGoogleAPI();
            
            // Google Sign-In初期化
            this.initializeGoogleSignIn();
            
        } catch (error) {
            console.error('[GoogleAuth] Google API loading failed:', error);
            this.showError('Google認証の初期化に失敗しました: ' + error.message);
        }
    }
    
    // Google APIの完全読み込みを待機
    async waitForGoogleAPI() {
        console.log('[GoogleAuth] Waiting for complete Google API loading...');
        
        // 最大30秒待機（本番認証優先のため延長）
        for (let i = 0; i < 30; i++) {
            // より詳細な状態チェック
            const googleExists = typeof window.google !== 'undefined';
            const accountsExists = googleExists && typeof window.google.accounts !== 'undefined';
            const idExists = accountsExists && typeof window.google.accounts.id !== 'undefined';
            
            console.log(`[GoogleAuth] Check ${i + 1}/30 - google:${googleExists}, accounts:${accountsExists}, id:${idExists}`);
            
            if (googleExists && accountsExists && idExists) {
                console.log('[GoogleAuth] Google API fully loaded and ready');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // 最後の手段: 手動でGoogle APIをもう一度読み込み
        console.warn('[GoogleAuth] Google API loading timeout - attempting manual reload');
        await this.forceLoadGoogleAPI();
    }
    
    // 強制的にGoogle APIを再読み込み
    async forceLoadGoogleAPI() {
        try {
            console.log('[GoogleAuth] Force loading Google API...');
            
            // 既存のscriptタグを削除
            const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
            if (existingScript) {
                existingScript.remove();
                console.log('[GoogleAuth] Removed existing Google API script');
            }
            
            // 新しいscriptタグを追加
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            
            return new Promise((resolve, reject) => {
                script.onload = async () => {
                    console.log('[GoogleAuth] Force loaded Google API successfully');
                    // 2秒待機してからAPI使用可能性を確認
                    setTimeout(() => {
                        if (window.google && window.google.accounts && window.google.accounts.id) {
                            console.log('[GoogleAuth] Google API ready after force load');
                            resolve();
                        } else {
                            console.warn('[GoogleAuth] Google API still not ready after force load');
                            reject(new Error('Google API force load failed'));
                        }
                    }, 2000);
                };
                
                script.onerror = () => {
                    console.error('[GoogleAuth] Force load Google API failed');
                    reject(new Error('Google API script failed to load'));
                };
                
                document.head.appendChild(script);
                
                // 10秒タイムアウト
                setTimeout(() => {
                    reject(new Error('Google API force load timeout'));
                }, 10000);
            });
            
        } catch (error) {
            console.error('[GoogleAuth] Force load failed:', error);
            throw error;
        }
    }
    
    // Google Client ID取得
    async getGoogleClientId() {
        try {
            console.log('[GoogleAuth] Fetching Google Client ID from server...');
            
            // サーバーから Google Client ID を取得
            const response = await fetch('/api/auth/google-config');
            if (response.ok) {
                const data = await response.json();
                console.log('[GoogleAuth] Server response:', data);
                
                // 実際のClient IDかテスト用かをチェック
                if (data.clientId && data.clientId !== 'your-google-client-id-here') {
                    console.log('[GoogleAuth] Using production Client ID');
                    return data.clientId;
                }
            } else {
                console.warn('[GoogleAuth] Server request failed:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('[GoogleAuth] Failed to get Google Client ID from server:', error);
        }
        
        // テスト用Client ID（デモ用）
        const fallbackClientId = '1234567890-abcdefghijklmnopqrstuvwxyz1234567890.apps.googleusercontent.com';
        console.log('[GoogleAuth] Using fallback Client ID for testing');
        return fallbackClientId;
    }
    
    // Google Sign-In初期化
    initializeGoogleSignIn() {
        try {
            console.log('[GoogleAuth] Attempting to initialize Google Sign-In...');
            console.log('[GoogleAuth] window.google available:', !!window.google);
            console.log('[GoogleAuth] Client ID:', this.googleClientId);
            
            if (!window.google) {
                throw new Error('Google APIが読み込まれていません');
            }
            
            if (!window.google.accounts) {
                throw new Error('Google Accounts APIが利用できません');
            }
            
            if (!this.googleClientId) {
                throw new Error('Client IDが設定されていません');
            }
            
            console.log('[GoogleAuth] Initializing Google accounts.id...');
            
            google.accounts.id.initialize({
                client_id: this.googleClientId,
                callback: (response) => this.handleGoogleSignInResponse(response),
                auto_select: false,
                cancel_on_tap_outside: false
            });
            
            console.log('[GoogleAuth] Google Sign-In initialized successfully');
            
            // 初期化成功の表示更新
            this.clearError();
            
        } catch (error) {
            console.error('[GoogleAuth] Google Sign-In initialization error:', error);
            this.showError('Google認証の初期化に失敗しました: ' + error.message);
        }
    }
    
    // 認証状態チェック（強化版）
    async checkAuthenticationStatus() {
        try {
            console.log('[GoogleAuth] Checking authentication status...');
            
            const token = localStorage.getItem('auth_token');
            if (!token) {
                console.log('[GoogleAuth] No token found');
                this.showUnauthenticatedUI();
                return;
            }
            
            // トークンの有効性を確認
            if (this.isTokenExpired(token)) {
                console.log('[GoogleAuth] Token expired');
                localStorage.removeItem('auth_token');
                this.showUnauthenticatedUI();
                return;
            }
            
            // サーバーでトークン検証
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log('[GoogleAuth] Authentication valid:', data.user);
                    this.currentUser = data.user;
                    this.authToken = token;
                    this.showAuthenticatedUI();
                    
                    // セッション延長
                    this.refreshSession();
                } else {
                    console.log('[GoogleAuth] Server rejected token');
                    localStorage.removeItem('auth_token');
                    this.showUnauthenticatedUI();
                }
            } else {
                console.log('[GoogleAuth] Server authentication check failed');
                localStorage.removeItem('auth_token');
                this.showUnauthenticatedUI();
            }
        } catch (error) {
            console.error('[GoogleAuth] Authentication check failed:', error);
            this.showUnauthenticatedUI();
        }
    }
    
    // JWTトークンの有効期限確認
    isTokenExpired(token) {
        try {
            const base64Url = token.split('.')[1];
            if (!base64Url) return true;
            
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const decoded = JSON.parse(jsonPayload);
            const currentTime = Math.floor(Date.now() / 1000);
            
            return decoded.exp && decoded.exp < currentTime;
        } catch (error) {
            console.error('[GoogleAuth] Token parsing failed:', error);
            return true;
        }
    }
    
    // セッション延長
    async refreshSession() {
        try {
            console.log('[GoogleAuth] Refreshing session...');
            
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.token) {
                    console.log('[GoogleAuth] Session refreshed');
                    this.authToken = data.token;
                    localStorage.setItem('auth_token', data.token);
                }
            }
        } catch (error) {
            console.log('[GoogleAuth] Session refresh failed:', error);
            // エラーでも継続（既存トークンで動作）
        }
    }
    
    // 認証済みUI表示（強化版）
    showAuthenticatedUI() {
        console.log('[GoogleAuth] Updating UI to authenticated state');
        
        if (this.userStatus && this.authButtons) {
            this.userStatus.classList.remove('hidden');
            this.authButtons.classList.add('hidden');
            
            if (this.userName) {
                const displayName = this.currentUser.display_name || this.currentUser.name || this.currentUser.email;
                this.userName.textContent = displayName;
                console.log('[GoogleAuth] Display name set:', displayName);
            }
            
            if (this.userAvatar) {
                const profileImage = this.currentUser.profile_image || this.currentUser.picture;
                if (profileImage) {
                    this.userAvatar.src = profileImage;
                } else {
                    // デフォルトアバター（ピンクテーマに合わせる）
                    const name = this.currentUser.display_name || this.currentUser.name || this.currentUser.email;
                    this.userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f472b6&color=fff&size=32`;
                }
                console.log('[GoogleAuth] Avatar updated');
            }
        }
        
        // 認証状態の表示効果
        this.showAuthenticationIndicator();
    }
    
    // 認証状態インジケーター
    showAuthenticationIndicator() {
        // 短時間の視覚効果で認証成功を表示
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
            console.log('[GoogleAuth] Google login button clicked');
            console.log('[GoogleAuth] window.google available:', !!window.google);
            console.log('[GoogleAuth] Client ID:', this.googleClientId);
            
            // 本番環境かどうかを先にチェック
            if (this.isProductionMode()) {
                console.log('[GoogleAuth] Production mode detected - attempting real Google auth');
                
                // Google APIの状態チェック
                const googleReady = window.google && window.google.accounts && window.google.accounts.id;
                
                if (!googleReady) {
                    console.log('[GoogleAuth] Google API not ready - attempting to reload...');
                    try {
                        await this.forceLoadGoogleAPI();
                        console.log('[GoogleAuth] Google API reloaded successfully');
                    } catch (error) {
                        console.error('[GoogleAuth] Failed to reload Google API:', error);
                        this.showError('Google認証の読み込みに失敗しました。ページを再読み込みしてください。');
                        return;
                    }
                }
                
                console.log('[GoogleAuth] Starting real Google authentication...');
                this.showRealGoogleLogin();
                
            } else {
                console.log('[GoogleAuth] Demo mode - using demo authentication');
                this.showDemoLogin();
            }
            
        } catch (error) {
            console.error('[GoogleAuth] Google login error:', error);
            if (this.isProductionMode()) {
                this.showError('Google認証でエラーが発生しました: ' + error.message);
            } else {
                console.warn('[GoogleAuth] Falling back to demo mode');
                this.showDemoLogin();
            }
        }
    }
    
    // 本番環境かどうかの判定
    isProductionMode() {
        // 実際のGoogle Client IDが設定されているかチェック
        return this.googleClientId && 
               this.googleClientId !== '1234567890-abcdefghijklmnopqrstuvwxyz1234567890.apps.googleusercontent.com' &&
               !this.googleClientId.includes('test') &&
               !this.googleClientId.includes('demo');
    }
    
    // 強制的に本番認証を実行（モバイル対応強化）
    async forceRealAuthentication() {
        try {
            console.log('[GoogleAuth] Force real authentication requested');
            
            if (!this.googleClientId) {
                this.showError('Google Client IDが設定されていません');
                return;
            }
            
            this.clearError();
            
            // モバイル環境の詳細検出
            const mobileInfo = this.getMobileEnvironmentInfo();
            console.log('[GoogleAuth] Mobile environment:', mobileInfo);
            
            if (mobileInfo.isRestrictedEnvironment) {
                // 制限環境での代替認証
                this.showMobileAuthOptions();
            } else {
                // 通常のOAuth認証
                console.log('[GoogleAuth] Using OAuth 2.0 direct redirect method');
                this.useDirectOAuthRedirect();
            }
            
        } catch (error) {
            console.error('[GoogleAuth] Force real authentication error:', error);
            this.showError('強制認証でエラーが発生しました: ' + error.message);
        }
    }
    
    // モバイル環境詳細検出
    getMobileEnvironmentInfo() {
        const userAgent = navigator.userAgent;
        const isAndroid = /Android/i.test(userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
        const isWebView = /wv|WebView/i.test(userAgent);
        const isInAppBrowser = /FBAV|FBAN|Instagram|Twitter|Line|WeChat/i.test(userAgent);
        const isChromeIOS = /CriOS/i.test(userAgent);
        const isFirefoxIOS = /FxiOS/i.test(userAgent);
        
        const isRestrictedEnvironment = isWebView || isInAppBrowser;
        
        return {
            isAndroid,
            isIOS,
            isWebView,
            isInAppBrowser,
            isChromeIOS,
            isFirefoxIOS,
            isRestrictedEnvironment,
            userAgent: userAgent.substring(0, 100) + '...' // ログ用に短縮
        };
    }
    
    // モバイル認証オプション表示
    showMobileAuthOptions() {
        const modalContent = `
            <div class="bg-white rounded-lg p-6 max-w-md mx-auto">
                <h3 class="text-lg font-semibold text-pink-800 mb-4">📱 モバイル認証オプション</h3>
                
                <div class="space-y-4">
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 class="font-semibold text-blue-800 mb-2">🌐 外部ブラウザで認証</h4>
                        <p class="text-sm text-blue-700 mb-3">Safari/Chromeなどの標準ブラウザで認証します</p>
                        <button id="external-browser-auth" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            外部ブラウザで認証
                        </button>
                    </div>
                    
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 class="font-semibold text-green-800 mb-2">📱 デモ認証（推奨）</h4>
                        <p class="text-sm text-green-700 mb-3">すぐに全機能をお試しいただけます</p>
                        <button id="demo-auth-option" class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                            デモ認証で開始
                        </button>
                    </div>
                </div>
                
                <button id="close-mobile-options" class="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                    キャンセル
                </button>
            </div>
        `;
        
        // 既存のモーダル内容を置き換え
        if (this.authModal) {
            this.authModal.innerHTML = modalContent;
            this.authModal.classList.remove('hidden');
            
            // イベントリスナー追加
            document.getElementById('external-browser-auth')?.addEventListener('click', () => {
                this.openExternalBrowserAuth();
            });
            
            document.getElementById('demo-auth-option')?.addEventListener('click', () => {
                this.hideAuthModal();
                this.mobileOptimizedDemo();
            });
            
            document.getElementById('close-mobile-options')?.addEventListener('click', () => {
                this.hideAuthModal();
            });
        }
    }
    
    // 外部ブラウザ認証
    openExternalBrowserAuth() {
        const authUrl = this.buildAuthUrl();
        
        // 外部ブラウザで開く
        if (navigator.share) {
            // Web Share API対応の場合
            navigator.share({
                title: 'タップカルテ - Google認証',
                url: authUrl
            });
        } else {
            // 通常の外部ブラウザオープン
            window.open(authUrl, '_blank', 'noopener,noreferrer');
        }
        
        this.showSuccess('外部ブラウザでGoogle認証を開いています...');
        this.hideAuthModal();
    }
    
    // 認証URL構築
    buildAuthUrl() {
        const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
        const redirectUri = encodeURIComponent(window.location.origin);
        const scope = encodeURIComponent('openid email profile');
        const responseType = 'code';
        const state = this.generateRandomState();
        
        sessionStorage.setItem('oauth_state', state);
        
        return `${baseUrl}?` +
            `client_id=${this.googleClientId}&` +
            `redirect_uri=${redirectUri}&` +
            `scope=${scope}&` +
            `response_type=${responseType}&` +
            `state=${state}&` +
            `access_type=offline&` +
            `include_granted_scopes=true`;
    }
    
    // モバイル対応OAuth 2.0リダイレクト方式（PKCE対応）
    useDirectOAuthRedirect() {
        console.log('[GoogleAuth] Starting mobile-compatible OAuth 2.0 redirect');
        
        // モバイル環境検出
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('[GoogleAuth] Mobile detected:', isMobile);
        
        const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
        const redirectUri = encodeURIComponent(window.location.origin);
        const scope = encodeURIComponent('openid email profile');
        const responseType = 'code';
        const state = this.generateRandomState();
        
        // PKCE (Proof Key for Code Exchange) パラメータ
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = this.generateCodeChallenge(codeVerifier);
        
        // セキュリティのためstateとcode_verifierをセッションストレージに保存
        sessionStorage.setItem('oauth_state', state);
        sessionStorage.setItem('code_verifier', codeVerifier);
        
        const authUrl = `${baseUrl}?` +
            `client_id=${this.googleClientId}&` +
            `redirect_uri=${redirectUri}&` +
            `scope=${scope}&` +
            `response_type=${responseType}&` +
            `state=${state}&` +
            `code_challenge=${codeChallenge}&` +
            `code_challenge_method=S256&` +
            `access_type=offline&` +
            `include_granted_scopes=true`;
        
        console.log('[GoogleAuth] Redirecting to:', authUrl);
        
        if (isMobile) {
            // モバイルの場合：新しいタブで開く（WebView制限回避）
            this.showSuccess('Google認証を新しいタブで開きます...');
            setTimeout(() => {
                const authWindow = window.open(authUrl, '_blank', 'noopener,noreferrer');
                if (!authWindow) {
                    this.showError('ポップアップがブロックされました。ブラウザの設定を確認してください。');
                }
            }, 1500);
        } else {
            // デスクトップの場合：通常のリダイレクト
            this.showSuccess('Googleログインページにリダイレクトします...');
            setTimeout(() => {
                window.location.href = authUrl;
            }, 1500);
        }
    }
    
    // PKCE Code Verifier生成
    generateCodeVerifier() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return this.base64URLEncode(array);
    }
    
    // PKCE Code Challenge生成
    generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        return crypto.subtle.digest('SHA-256', data).then(hash => {
            return this.base64URLEncode(new Uint8Array(hash));
        });
    }
    
    // Base64 URL Safe エンコード
    base64URLEncode(array) {
        return btoa(String.fromCharCode(...array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
    
    // ランダムstateを生成
    generateRandomState() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // モバイル最適化デモ認証
    mobileOptimizedDemo() {
        console.log('[GoogleAuth] Starting mobile optimized demo authentication');
        
        this.clearError();
        
        // よりリアルなデモユーザー情報
        const mockGoogleUser = {
            email: 'mobile.user@example.com',
            name: 'モバイルユーザー',
            picture: 'https://ui-avatars.com/api/?name=Mobile+User&background=10b981&color=fff&size=128'
        };
        
        // UIを認証済み状態に更新
        this.currentUser = mockGoogleUser;
        this.authToken = 'mobile_demo_token_' + Date.now();
        
        // ローカルストレージに保存
        localStorage.setItem('auth_token', this.authToken);
        localStorage.setItem('mobile_demo_user', JSON.stringify(mockGoogleUser));
        
        // UI更新
        this.showAuthenticatedUI();
        this.hideAuthModal();
        
        // 成功メッセージ
        this.showSuccess('📱 モバイル最適化デモ認証が完了しました！タップカルテをお試しください。');
    }
    
    // 実際のGoogleログイン
    showRealGoogleLogin() {
        try {
            console.log('[GoogleAuth] Starting real Google authentication...');
            
            // Google One Tap認証を表示
            google.accounts.id.prompt((notification) => {
                console.log('[GoogleAuth] Google prompt notification:', notification);
                if (notification.isNotDisplayed()) {
                    const reason = notification.getNotDisplayedReason();
                    console.log('[GoogleAuth] Google One Tap not displayed, reason:', reason);
                    
                    // フォールバック: ポップアップサインイン
                    this.showGoogleSignInPopup();
                } else if (notification.isSkippedMoment()) {
                    console.log('[GoogleAuth] User skipped the moment');
                } else if (notification.isDismissedMoment()) {
                    console.log('[GoogleAuth] User dismissed the moment');
                }
            });
            
        } catch (error) {
            console.error('[GoogleAuth] Real Google login error:', error);
            this.showError('Google認証でエラーが発生しました: ' + error.message);
        }
    }
    
    // デモ用ログイン（テスト目的）
    showDemoLogin() {
        console.log('[GoogleAuth] Showing demo login...');
        
        // エラー表示をクリア
        this.clearError();
        
        // 模擬的なユーザー情報でログイン成功をシミュレート
        const mockGoogleUser = {
            email: 'demo@example.com',
            name: 'デモユーザー',
            picture: 'https://ui-avatars.com/api/?name=Demo+User&background=f472b6&color=fff&size=128'
        };
        
        // UIを認証済み状態に更新
        this.currentUser = mockGoogleUser;
        this.authToken = 'demo_token_12345';
        
        // ローカルストレージに保存
        localStorage.setItem('auth_token', this.authToken);
        localStorage.setItem('demo_user', JSON.stringify(mockGoogleUser));
        
        // UI更新
        this.showAuthenticatedUI();
        this.hideAuthModal();
        
        // 成功メッセージ
        this.showSuccess('🧪 デモログインが完了しました（Google OAuth設定完了後に本格認証に切り替わります）');
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
    
    // ログアウト（強化版）
    async logout() {
        try {
            console.log('[GoogleAuth] Starting logout process...');
            
            // セッション管理停止
            this.stopSessionManagement();
            
            // サーバーにログアウト通知
            if (this.authToken) {
                try {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.authToken}`
                        }
                    });
                    console.log('[GoogleAuth] Server logout completed');
                } catch (error) {
                    console.log('[GoogleAuth] Server logout failed:', error);
                }
            }
            
            // 全てのローカルデータクリア
            localStorage.removeItem('auth_token');
            localStorage.removeItem('demo_user');
            localStorage.removeItem('mobile_demo_user');
            sessionStorage.removeItem('oauth_state');
            sessionStorage.removeItem('code_verifier');
            
            // Google Sign-Out
            if (window.google && window.google.accounts) {
                try {
                    google.accounts.id.disableAutoSelect();
                    console.log('[GoogleAuth] Google auto-select disabled');
                } catch (error) {
                    console.log('[GoogleAuth] Google sign-out failed:', error);
                }
            }
            
            // インスタンス変数クリア
            this.currentUser = null;
            this.authToken = null;
            this.lastActiveTime = null;
            
            // UI更新
            this.showUnauthenticatedUI();
            
            this.showSuccess('✅ ログアウトが完了しました');
            
            console.log('[GoogleAuth] Logout process completed');
            
        } catch (error) {
            console.error('[GoogleAuth] Logout error:', error);
            
            // エラーでもローカルの状態は強制クリア
            localStorage.clear();
            sessionStorage.clear();
            this.currentUser = null;
            this.authToken = null;
            this.stopSessionManagement();
            this.showUnauthenticatedUI();
            
            this.showError('ログアウト中にエラーが発生しましたが、ローカルデータはクリアされました');
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