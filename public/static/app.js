// 看護記録アシスタント - Frontend JavaScript

class NursingAssistant {
    constructor() {
        this.selectedOptions = {
            style: 'ですます体',
            docType: '記録',
            format: '文章形式'
        };
        this.currentSessionId = null;
        this.currentUser = null; // 現在のユーザー情報
        this.authToken = null;   // 認証トークン
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeButtonStates();
        this.checkAuthenticationStatus(); // 認証状態チェック
        this.generateSessionId();
        this.loadHistory();
    }
    
    initializeElements() {
        this.inputText = document.getElementById('input-text');
        this.outputText = document.getElementById('output-text');
        this.convertBtn = document.getElementById('convert-btn');
        this.copyBtn = document.getElementById('copy-btn');
        this.clearBtn = document.getElementById('clear-input');
        this.loading = document.getElementById('loading');
        
        // Character limit elements
        this.charLimitSlider = document.getElementById('char-limit-slider');
        this.charLimitDisplay = document.getElementById('char-limit-display');
        
        // History elements
        this.sessionIdDisplay = document.getElementById('session-id-display');
        this.historyContainer = document.getElementById('history-container');
        this.historyLoading = document.getElementById('history-loading');
        this.refreshHistoryBtn = document.getElementById('refresh-history');
        this.clearHistoryBtn = document.getElementById('clear-history');
        
        // Authentication elements
        this.userStatus = document.getElementById('user-status');
        this.authButtons = document.getElementById('auth-buttons');
        this.loginBtn = document.getElementById('login-btn');
        this.registerBtn = document.getElementById('register-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.userAvatar = document.getElementById('user-avatar');
        this.userName = document.getElementById('user-name');
        
        // Modal elements
        this.authModal = document.getElementById('auth-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.closeModalBtn = document.getElementById('close-modal');
        this.loginForm = document.getElementById('login-form');
        this.authEmail = document.getElementById('auth-email');
        this.authPassword = document.getElementById('auth-password');
        this.authDisplayName = document.getElementById('auth-display-name');
        this.registerFields = document.getElementById('register-fields');
        this.authError = document.getElementById('auth-error');
        this.authSubmit = document.getElementById('auth-submit');
        this.googleLoginBtn = document.getElementById('google-login-btn');
        this.toggleAuthMode = document.getElementById('toggle-auth-mode');
        
        // Initialize character limit (for output)
        this.currentCharLimit = 500;
        
        // Character count elements
        this.inputCountDisplay = document.getElementById('input-count');
        this.outputCountDisplay = document.getElementById('output-count');
        
        // Auth mode state
        this.isRegisterMode = false;
    }
    
    // 音声認識機能を削除
    
    attachEventListeners() {
        // Option button listeners
        this.attachOptionListeners();
        
        // 音声入力機能を削除
        
        // Convert button
        if (this.convertBtn) {
            this.convertBtn.addEventListener('click', () => this.convertText());
        }
        
        // Copy button
        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', () => this.copyOutput());
        }
        
        // Clear button
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clearInput());
        }
        
        // Character limit slider
        if (this.charLimitSlider) {
            this.charLimitSlider.addEventListener('input', () => this.updateCharLimit());
        }
        
        // History buttons
        if (this.refreshHistoryBtn) {
            this.refreshHistoryBtn.addEventListener('click', () => this.loadHistory());
        }
        
        if (this.clearHistoryBtn) {
            this.clearHistoryBtn.addEventListener('click', () => this.clearHistoryWithConfirm());
        }
        
        // Authentication event listeners
        this.attachAuthListeners();
        
        // Character count listeners
        this.attachCharCountListeners();
    }
    
    // 文字数カウント関連イベントリスナー
    attachCharCountListeners() {
        // 入力エリアの文字数カウント
        if (this.inputText) {
            this.inputText.addEventListener('input', () => {
                this.updateInputCharCount();
            });
            
            // 初期値設定
            this.updateInputCharCount();
        }
    }
    
    // 入力文字数更新
    updateInputCharCount() {
        if (this.inputText && this.inputCountDisplay) {
            const count = this.inputText.value.length;
            this.inputCountDisplay.textContent = `${count}文字`;
        }
    }
    
    // 出力文字数更新
    updateOutputCharCount() {
        if (this.outputText && this.outputCountDisplay) {
            const text = this.outputText.textContent || '';
            // プレースホルダーテキストの場合は0文字とする
            const count = text.includes('生成された文章がここに表示されます') || 
                         text.includes('整形された文章がここに表示されます') ? 0 : text.length;
            this.outputCountDisplay.textContent = `${count}文字`;
        }
    }
    
    // 認証関連イベントリスナー
    attachAuthListeners() {
        // ログイン・登録ボタン
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', () => this.showAuthModal(false));
        }
        
        if (this.registerBtn) {
            this.registerBtn.addEventListener('click', () => this.showAuthModal(true));
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
        
        // フォーム送信
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuthSubmit();
            });
        }
        
        // モード切り替え
        if (this.toggleAuthMode) {
            this.toggleAuthMode.addEventListener('click', () => this.toggleAuthenticationMode());
        }
        
        // Googleログイン
        if (this.googleLoginBtn) {
            this.googleLoginBtn.addEventListener('click', () => this.handleGoogleLogin());
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
                this.userName.textContent = this.currentUser.display_name;
            }
            
            if (this.userAvatar) {
                if (this.currentUser.profile_image) {
                    this.userAvatar.src = this.currentUser.profile_image;
                    this.userAvatar.classList.remove('hidden');
                } else {
                    // デフォルトアバター
                    this.userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.display_name)}&background=f3e8ff&color=7c2d12&size=32`;
                    this.userAvatar.classList.remove('hidden');
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
    }
    
    // 認証モーダル表示
    showAuthModal(isRegister = false) {
        this.isRegisterMode = isRegister;
        
        if (this.modalTitle) {
            this.modalTitle.textContent = isRegister ? '新規登録' : 'ログイン';
        }
        
        if (this.authSubmit) {
            this.authSubmit.textContent = isRegister ? '登録' : 'ログイン';
        }
        
        if (this.registerFields) {
            if (isRegister) {
                this.registerFields.classList.remove('hidden');
            } else {
                this.registerFields.classList.add('hidden');
            }
        }
        
        if (this.toggleAuthMode) {
            this.toggleAuthMode.textContent = isRegister 
                ? 'アカウントをお持ちの場合はログイン'
                : 'アカウントをお持ちでない場合は新規登録';
        }
        
        // フォームクリア
        this.clearAuthForm();
        
        if (this.authModal) {
            this.authModal.classList.remove('hidden');
        }
    }
    
    // 認証モーダル非表示
    hideAuthModal() {
        if (this.authModal) {
            this.authModal.classList.add('hidden');
        }
        this.clearAuthForm();
    }
    
    // フォームクリア
    clearAuthForm() {
        if (this.authEmail) this.authEmail.value = '';
        if (this.authPassword) this.authPassword.value = '';
        if (this.authDisplayName) this.authDisplayName.value = '';
        if (this.authError) this.authError.classList.add('hidden');
    }
    
    // 認証モード切り替え
    toggleAuthenticationMode() {
        this.showAuthModal(!this.isRegisterMode);
    }
    
    // 認証フォーム送信
    async handleAuthSubmit() {
        const email = this.authEmail?.value;
        const password = this.authPassword?.value;
        const displayName = this.authDisplayName?.value;
        
        if (!email || !password) {
            this.showAuthError('メールアドレスとパスワードを入力してください');
            return;
        }
        
        if (this.isRegisterMode && !displayName) {
            this.showAuthError('表示名を入力してください');
            return;
        }
        
        try {
            const endpoint = this.isRegisterMode ? '/api/auth/register' : '/api/auth/login';
            const payload = this.isRegisterMode 
                ? { email, password, display_name: displayName }
                : { email, password };
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 認証成功
                this.currentUser = data.user;
                this.authToken = data.token;
                localStorage.setItem('auth_token', data.token);
                
                this.showAuthenticatedUI();
                this.hideAuthModal();
                this.loadHistory(); // 履歴を再読み込み
                
                this.showTemporaryMessage(
                    this.isRegisterMode ? '登録が完了しました' : 'ログインしました', 
                    'success'
                );
                
            } else {
                this.showAuthError(data.error || '認証に失敗しました');
            }
            
        } catch (error) {
            console.error('Authentication error:', error);
            this.showAuthError('認証中にエラーが発生しました');
        }
    }
    
    // Googleログイン（仮実装）
    async handleGoogleLogin() {
        // Google OAuth の実装は複雑なため、今回は仮実装
        this.showTemporaryMessage('Googleログイン機能は開発中です', 'info');
    }
    
    // ログアウト
    async logout() {
        try {
            if (this.authToken) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });
            }
            
            // ローカルストレージクリア
            localStorage.removeItem('auth_token');
            
            // 状態リセット
            this.currentUser = null;
            this.authToken = null;
            
            // UIを未認証状態に
            this.showUnauthenticatedUI();
            
            // 履歴を再読み込み
            this.loadHistory();
            
            this.showTemporaryMessage('ログアウトしました', 'success');
            
        } catch (error) {
            console.error('Logout error:', error);
            this.showTemporaryMessage('ログアウト中にエラーが発生しました', 'error');
        }
    }
    
    // 認証エラー表示
    showAuthError(message) {
        if (this.authError) {
            this.authError.textContent = message;
            this.authError.classList.remove('hidden');
        }
    }
    
    initializeButtonStates() {
        // Initialize button styles based on default selected options
        this.selectOption('style', this.selectedOptions.style, 'style-polite', 'style-plain');
        this.selectOption('docType', this.selectedOptions.docType, 'doc-record', 'doc-report');
        this.selectOption('format', this.selectedOptions.format, 'format-text', 'format-soap');
    }
    
    attachOptionListeners() {
        // Style buttons
        document.getElementById('style-polite').addEventListener('click', () => {
            this.selectOption('style', 'ですます体', 'style-polite', 'style-plain');
        });
        document.getElementById('style-plain').addEventListener('click', () => {
            this.selectOption('style', 'だ・である体', 'style-plain', 'style-polite');
        });
        
        // Document type buttons
        document.getElementById('doc-record').addEventListener('click', () => {
            this.selectOption('docType', '記録', 'doc-record', 'doc-report');
            // 記録選択時はフォーマット選択を有効化
            this.enableFormatSelection();
        });
        document.getElementById('doc-report').addEventListener('click', () => {
            this.selectOption('docType', '報告書', 'doc-report', 'doc-record');
            // 報告書選択時は文章形式に固定
            this.lockFormatToText();
        });
        
        // Format buttons
        document.getElementById('format-text').addEventListener('click', () => {
            if (this.selectedOptions.docType !== '報告書') {
                this.selectOption('format', '文章形式', 'format-text', 'format-soap');
            }
        });
        document.getElementById('format-soap').addEventListener('click', () => {
            if (this.selectedOptions.docType !== '報告書') {
                this.selectOption('format', 'SOAP形式', 'format-soap', 'format-text');
            }
        });
    }
    
    lockFormatToText() {
        // 文章形式に固定
        this.selectOption('format', '文章形式', 'format-text', 'format-soap');
        
        // SOAPボタンを無効化
        const soapBtn = document.getElementById('format-soap');
        soapBtn.style.opacity = '0.5';
        soapBtn.style.cursor = 'not-allowed';
        soapBtn.title = '報告書ではSOAP形式は使用できません';
    }
    
    enableFormatSelection() {
        // SOAPボタンを有効化
        const soapBtn = document.getElementById('format-soap');
        soapBtn.style.opacity = '1';
        soapBtn.style.cursor = 'pointer';
        soapBtn.title = '';
    }
    
    selectOption(optionType, value, activeId, inactiveId) {
        this.selectedOptions[optionType] = value;
        
        // Update button styles
        const activeBtn = document.getElementById(activeId);
        const inactiveBtn = document.getElementById(inactiveId);
        
        if (activeBtn && inactiveBtn) {
            activeBtn.className = 'px-4 py-2 bg-pink-300 text-pink-800 rounded-md text-sm font-medium hover:bg-pink-400 transition-colors';
            inactiveBtn.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors';
        }
    }
    
    toggleVoiceInput() {
        if (!this.recognition) {
            alert('音声認識がサポートされていません。');
            return;
        }
        
        if (this.isListening) {
            this.stopVoiceInput();
        } else {
            this.startVoiceInput();
        }
    }
    
    // 音声入力関連関数を削除
    
    async convertText() {
        const inputText = this.inputText.value.trim();
        
        if (!inputText) {
            alert('変換するテキストを入力してください。');
            return;
        }
        
        // 入力文字数の制限を削除（制限なし）
        
        this.showLoading(true);
        this.convertBtn.disabled = true;
        
        try {
            const headers = {
                'Content-Type': 'application/json',
                'x-session-id': this.currentSessionId
            };
            
            // 認証トークンがある場合は追加
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }
            
            const response = await fetch('/api/convert', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    text: inputText,
                    style: this.selectedOptions.style,
                    docType: this.selectedOptions.docType,
                    format: this.selectedOptions.format,
                    charLimit: this.currentCharLimit
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.outputText.innerHTML = `<div class=\"whitespace-pre-wrap\">${this.escapeHtml(result.convertedText)}</div>`;
                this.copyBtn.disabled = false;
                
                // 出力文字数を更新
                this.updateOutputCharCount();
                
                // 履歴を更新
                setTimeout(() => {
                    this.loadHistory();
                    this.loadStats();
                }, 500);
            } else {
                throw new Error(result.error || '変換に失敗しました。');
            }
            
        } catch (error) {
            console.error('Conversion error:', error);
            this.outputText.innerHTML = `<div class=\"text-pink-700\">エラーが発生しました: ${error.message}</div>`;
            this.copyBtn.disabled = true;
            
            // エラー時も文字数を更新
            this.updateOutputCharCount();
        } finally {
            this.showLoading(false);
            this.convertBtn.disabled = false;
        }
    }
    
    copyOutput() {
        const outputContent = this.outputText.textContent;
        
        if (!outputContent || outputContent.includes('エラーが発生しました')) {
            alert('コピーできるテキストがありません。');
            return;
        }
        
        navigator.clipboard.writeText(outputContent).then(() => {
            // Show temporary success message
            const originalText = this.copyBtn.innerHTML;
            this.copyBtn.innerHTML = '<i class=\"fas fa-check\"></i><span>コピー完了</span>';
            this.copyBtn.className = 'flex items-center space-x-2 px-4 py-2 bg-pink-700 text-white rounded-lg transition-colors';
            
            setTimeout(() => {
                this.copyBtn.innerHTML = originalText;
                this.copyBtn.className = 'flex items-center space-x-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors';
            }, 2000);
            
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('コピーに失敗しました。');
        });
    }
    
    updateCharLimit() {
        this.currentCharLimit = parseInt(this.charLimitSlider.value);
        this.charLimitDisplay.textContent = `${this.currentCharLimit}文字`;
    }
    
    // updateCharCount関数を削除（入力文字数カウント不要）
    
    generateSessionId() {
        // セッションIDを生成または既存のものを使用
        this.currentSessionId = sessionStorage.getItem('nursingSessionId') || 
            `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        sessionStorage.setItem('nursingSessionId', this.currentSessionId);
        
        if (this.sessionIdDisplay) {
            this.sessionIdDisplay.textContent = this.currentSessionId;
        }
    }
    
    async loadHistory() {
        if (!this.historyContainer) return;
        
        this.showHistoryLoading(true);
        
        try {
            let url = '/api/history';
            const headers = {};
            
            // 認証されている場合はトークンを送信、未認証の場合はセッションIDを使用
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            } else if (this.currentSessionId) {
                url = `/api/history/${this.currentSessionId}`;
            }
            
            const response = await fetch(url, { headers });
            const data = await response.json();
            
            if (data.success && data.records) {
                this.displayHistory(data.records);
            } else {
                this.displayHistoryError('履歴の取得に失敗しました');
            }
        } catch (error) {
            console.error('History loading error:', error);
            this.displayHistoryError('履歴の読み込み中にエラーが発生しました');
        } finally {
            this.showHistoryLoading(false);
        }
    }
    
    displayHistory(records) {
        if (!this.historyContainer) return;
        
        // 履歴データを保存（コピー機能で使用）
        this.historyRecords = records;
        
        if (records.length === 0) {
            this.historyContainer.innerHTML = `
                <div class="text-center text-pink-400 italic py-8">
                    まだ変換履歴がありません。上記のフォームで記録を作成してください。
                </div>
            `;
            return;
        }
        
        // 日付でグループ化
        const groupedRecords = this.groupRecordsByDate(records);
        
        let historyHTML = '';
        
        for (const [date, dayRecords] of Object.entries(groupedRecords)) {
            historyHTML += `
                <div class="mb-4">
                    <h4 class="text-sm font-semibold text-pink-800 mb-2 flex items-center">
                        <i class="fas fa-calendar-day text-pink-600 mr-2"></i>
                        ${date}
                    </h4>
                    <div class="space-y-2">
            `;
            
            dayRecords.forEach(record => {
                const recordId = `record_${record.id}`;
                const time = new Date(record.created_at).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                historyHTML += `
                    <div class="border border-pink-200 rounded-lg bg-white p-4 mb-3">
                        <div class="flex justify-between items-start gap-4">
                            <!-- 左側：時刻、オプション、出力内容 -->
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center space-x-3 mb-2">
                                    <div class="text-sm font-medium text-pink-700">
                                        <i class="fas fa-clock mr-1"></i>${time}
                                    </div>
                                    <div class="flex space-x-1">
                                        <span class="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs">${record.options_doc_type}</span>
                                        <span class="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs">${record.options_format}</span>
                                        <span class="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs">${record.options_style}</span>
                                    </div>
                                    <span class="text-xs text-pink-600">${record.response_time}ms</span>
                                </div>
                                
                                <!-- 出力内容 -->
                                <div class="text-sm text-gray-700 bg-pink-25 p-3 rounded border whitespace-pre-wrap break-words">
                                    ${this.escapeHtml(record.output_text)}
                                </div>
                            </div>
                            
                            <!-- 右側：コピーボタン -->
                            <div class="flex-shrink-0">
                                <button class="copy-output-btn px-3 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 text-sm transition-colors" 
                                        onclick="window.nursingAssistant.copyHistoryOutput('${record.id}')"
                                        title="出力内容をコピー">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            historyHTML += `
                    </div>
                </div>
            `;
        }
        
        this.historyContainer.innerHTML = historyHTML;
    }
    
    groupRecordsByDate(records) {
        const grouped = {};
        
        records.forEach(record => {
            const date = new Date(record.created_at).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long', 
                day: 'numeric'
            });
            
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(record);
        });
        
        // 日付順でソート（新しい順）
        const sortedEntries = Object.entries(grouped).sort((a, b) => {
            const dateA = new Date(a[1][0].created_at);
            const dateB = new Date(b[1][0].created_at);
            return dateB - dateA;
        });
        
        // 各日の記録も時間順でソート（新しい順）
        sortedEntries.forEach(([date, dayRecords]) => {
            dayRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        });
        
        return Object.fromEntries(sortedEntries);
    }
    

    
    displayHistoryError(message) {
        if (!this.historyContainer) return;
        
        this.historyContainer.innerHTML = `
            <div class="text-center text-red-500 py-8">
                <i class="fas fa-exclamation-triangle mb-2"></i>
                <div>${message}</div>
            </div>
        `;
    }
    
    showHistoryLoading(show) {
        if (!this.historyLoading) return;
        
        if (show) {
            this.historyLoading.classList.remove('hidden');
        } else {
            this.historyLoading.classList.add('hidden');
        }
    }
    

    
    async clearHistoryWithConfirm() {
        if (confirm('履歴をクリアしますか？この操作は取り消せません。')) {
            // 新しいセッションIDを生成
            this.generateSessionId();
            // 履歴を再読み込み
            await this.loadHistory();
        }
    }
    
    copyToClipboard(text) {
        // HTMLエンティティをデコード
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        const decodedText = textarea.value;
        
        navigator.clipboard.writeText(decodedText).then(() => {
            // 一時的な成功メッセージを表示（より控えめに）
            this.showTemporaryMessage('出力をクリップボードにコピーしました', 'success');
        }).catch(err => {
            console.error('Copy failed: ', err);
            this.showTemporaryMessage('コピーに失敗しました', 'error');
        });
    }
    
    copyHistoryOutput(recordId) {
        // 履歴から該当レコードを見つけて出力をコピー
        if (this.historyRecords && this.historyRecords.length > 0) {
            const record = this.historyRecords.find(r => r.id == recordId);
            
            if (record && record.output_text) {
                // HTMLエスケープを解除してからコピー
                const textarea = document.createElement('textarea');
                textarea.innerHTML = record.output_text;
                const plainText = textarea.value;
                
                navigator.clipboard.writeText(plainText).then(() => {
                    this.showTemporaryMessage('履歴の出力をコピーしました', 'success');
                }).catch(err => {
                    console.error('Copy failed:', err);
                    this.showTemporaryMessage('コピーに失敗しました', 'error');
                });
            } else {
                this.showTemporaryMessage('コピー対象のデータが見つかりません', 'error');
            }
        } else {
            this.showTemporaryMessage('履歴データが読み込まれていません', 'error');
        }
    }
    
    showTemporaryMessage(message, type = 'info') {
        // 既存のメッセージを削除
        const existingMessage = document.getElementById('temp-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // 新しいメッセージを作成
        const messageDiv = document.createElement('div');
        messageDiv.id = 'temp-message';
        messageDiv.className = `fixed top-4 right-4 px-4 py-2 rounded-lg text-white text-sm z-50 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        // 3秒後に自動削除
        setTimeout(() => {
            if (messageDiv && messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }
    
    clearInput() {
        if (confirm('入力内容をクリアしますか？')) {
            this.inputText.value = '';
            this.outputText.innerHTML = '<div class=\"text-pink-400 italic\">整形された文章がここに表示されます...</div>';
            this.copyBtn.disabled = true;
            
            // 文字数カウントを更新
            this.updateInputCharCount();
            this.updateOutputCharCount();
            
            this.inputText.focus();
        }
    }
    
    showLoading(show) {
        if (show) {
            this.loading.classList.remove('hidden');
            this.loading.classList.add('flex');
        } else {
            this.loading.classList.add('hidden');
            this.loading.classList.remove('flex');
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.nursingAssistant = new NursingAssistant();
});