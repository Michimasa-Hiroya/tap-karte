/**
 * タップカルテ - ダッシュボード版 JavaScript
 * アコーディオンメニュー・テンプレート機能対応
 */

class TapKarteDashboard {
    constructor() {
        // 🎯 設定の初期化
        this.selectedOptions = {
            docType: '記録',        // デフォルト: 記録
            format: '文章形式',     // デフォルト: 文章形式  
            style: 'だ・である体'   // デフォルト: だ・である体
        };
        
        this.selectedTemplates = [];        // 選択されたテンプレート（複数）
        this.currentCharLimit = 500;        // 文字数制限
        this.currentSessionId = null;
        
        // 利用制限関連
        this.isLoggedIn = false;            // ログイン状態
        this.dailyUsageCount = 0;           // 本日の利用回数
        this.maxDailyUsage = 1;             // 新規ユーザーの1日制限
        
        // 🚀 初期化実行
        this.initializeElements();
        this.attachEventListeners();
        this.initializeAccordions();
        this.initializeTemplates();
        this.generateSessionId();
        this.checkUsageLimit();
    }
    
    /**
     * 📝 DOM要素の初期化
     */
    initializeElements() {
        // メイン入力・出力エリア
        this.quickInputText = document.getElementById('quick-input-text');
        this.quickGenerateBtn = document.getElementById('quick-generate-btn');
        this.quickInputCount = document.getElementById('quick-input-count');
        
        this.outputText = document.getElementById('output-text');
        this.outputCount = document.getElementById('output-count');
        this.copyBtn = document.getElementById('copy-btn');
        
        // アコーディオン要素
        this.documentSettingsToggle = document.getElementById('document-settings-toggle');
        this.documentSettingsContent = document.getElementById('document-settings-content');
        this.documentSettingsIcon = document.getElementById('document-settings-icon');
        
        this.templateToggle = document.getElementById('template-toggle');
        this.templateContent = document.getElementById('template-content');
        this.templateIcon = document.getElementById('template-icon');
        
        // 設定要素
        this.charLimitSlider = document.getElementById('char-limit-slider');
        this.charLimitDisplay = document.getElementById('char-limit-display');
        
        // テンプレート要素
        this.templateNurseBtn = document.getElementById('template-nurse');
        this.templateRehabBtn = document.getElementById('template-rehab');
        this.nurseTemplates = document.getElementById('nurse-templates');
        this.rehabTemplates = document.getElementById('rehab-templates');
        this.selectedTemplatesDiv = document.getElementById('selected-templates');
        this.selectedTemplateList = document.getElementById('selected-template-list');
        this.clearTemplatesBtn = document.getElementById('clear-templates');
        
        // その他のボタン
        this.clearAllBtn = document.getElementById('clear-all-btn');
        this.usageLimitMessage = document.getElementById('usage-limit-message');
        
        // 認証関連要素
        this.loginBtn = document.getElementById('login-btn');
        this.authModal = document.getElementById('auth-modal');
        this.closeModalBtn = document.getElementById('close-modal');
        this.loginForm = document.getElementById('login-form');
        this.loginPassword = document.getElementById('login-password');
        this.loginErrorMessage = document.getElementById('login-error-message');
        this.loginBtnText = document.getElementById('login-btn-text');
        this.loginSpinner = document.getElementById('login-spinner');
    }
    
    /**
     * 🎯 イベントリスナーの設定
     */
    attachEventListeners() {
        // メイン入力エリア
        if (this.quickInputText) {
            this.quickInputText.addEventListener('input', () => this.updateQuickInputCount());
            this.quickInputText.addEventListener('input', () => this.checkGenerateButton());
        }
        
        if (this.quickGenerateBtn) {
            this.quickGenerateBtn.addEventListener('click', () => this.convertText());
        }
        
        // アコーディオントグル
        if (this.documentSettingsToggle) {
            this.documentSettingsToggle.addEventListener('click', () => this.toggleAccordion('document'));
        }
        
        if (this.templateToggle) {
            this.templateToggle.addEventListener('click', () => this.toggleAccordion('template'));
        }
        
        // 文字数制限スライダー
        if (this.charLimitSlider) {
            this.charLimitSlider.addEventListener('input', () => this.updateCharLimit());
        }
        
        // 設定ボタン（記録種別、フォーマット、文体）
        this.attachSettingButtons();
        
        // テンプレート関連
        this.attachTemplateListeners();
        
        // その他のボタン
        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', () => this.copyOutput());
        }
        
        if (this.clearAllBtn) {
            this.clearAllBtn.addEventListener('click', () => this.clearAll());
        }
        
        // 新しいボタン
        document.getElementById('clear-input-btn')?.addEventListener('click', () => this.clearInput());
        document.getElementById('clear-output-btn')?.addEventListener('click', () => this.clearOutput());
        
        // 認証関連
        this.attachAuthListeners();
        
        // ログアウトボタン
        document.getElementById('logout-btn')?.addEventListener('click', () => this.handleLogout());
        
        // 初期文字数カウント
        this.updateQuickInputCount();
        this.updateOutputCount();
    }
    
    /**
     * ⚙️ 設定ボタンのイベントリスナー
     */
    attachSettingButtons() {
        // 記録種別
        document.getElementById('doc-record')?.addEventListener('click', () => {
            this.selectOption('docType', '記録', ['doc-record', 'doc-report']);
        });
        document.getElementById('doc-report')?.addEventListener('click', () => {
            this.selectOption('docType', '報告書', ['doc-record', 'doc-report']);
        });
        
        // フォーマット
        document.getElementById('format-text')?.addEventListener('click', () => {
            this.selectOption('format', '文章形式', ['format-text', 'format-soap']);
        });
        document.getElementById('format-soap')?.addEventListener('click', () => {
            this.selectOption('format', 'SOAP形式', ['format-text', 'format-soap']);
        });
        
        // 文体
        document.getElementById('style-plain')?.addEventListener('click', () => {
            this.selectOption('style', 'だ・である体', ['style-plain', 'style-polite']);
        });
        document.getElementById('style-polite')?.addEventListener('click', () => {
            this.selectOption('style', 'ですます体', ['style-plain', 'style-polite']);
        });
    }
    
    /**
     * 📋 テンプレート関連のイベントリスナー
     */
    attachTemplateListeners() {
        // 職種選択
        if (this.templateNurseBtn) {
            this.templateNurseBtn.addEventListener('click', () => this.selectProfession('nurse'));
        }
        
        if (this.templateRehabBtn) {
            this.templateRehabBtn.addEventListener('click', () => this.selectProfession('rehab'));
        }
        
        // テンプレートチェックボックス
        document.querySelectorAll('.template-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const template = e.target.dataset.template;
                if (e.target.checked) {
                    this.addTemplate(template);
                } else {
                    this.removeTemplate(template);
                }
            });
        });
        
        // テンプレート全クリア
        if (this.clearTemplatesBtn) {
            this.clearTemplatesBtn.addEventListener('click', () => this.clearAllTemplates());
        }
    }
    
    /**
     * 🎛️ アコーディオンメニューの初期化
     */
    initializeAccordions() {
        // 初期状態：両方とも閉じた状態
        if (this.documentSettingsContent) {
            this.documentSettingsContent.classList.add('hidden');
        }
        if (this.templateContent) {
            this.templateContent.classList.add('hidden');
        }
    }
    
    /**
     * 📋 テンプレート機能の初期化
     */
    initializeTemplates() {
        // 初期状態：看護師を選択
        this.selectProfession('nurse');
    }
    
    /**
     * 🔄 アコーディオンの開閉
     */
    toggleAccordion(type) {
        if (type === 'document') {
            const content = this.documentSettingsContent;
            const icon = this.documentSettingsIcon;
            
            if (content.classList.contains('hidden')) {
                content.classList.remove('hidden');
                icon.classList.add('rotate-180');
            } else {
                content.classList.add('hidden');
                icon.classList.remove('rotate-180');
            }
        } else if (type === 'template') {
            const content = this.templateContent;
            const icon = this.templateIcon;
            
            if (content.classList.contains('hidden')) {
                content.classList.remove('hidden');
                icon.classList.add('rotate-180');
            } else {
                content.classList.add('hidden');
                icon.classList.remove('rotate-180');
            }
        }
    }
    
    /**
     * ⚙️ 設定オプションの選択
     */
    selectOption(type, value, buttonIds) {
        this.selectedOptions[type] = value;
        
        // ボタンの見た目を更新
        buttonIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.classList.remove('bg-pink-600', 'text-white');
                btn.classList.add('bg-pink-100', 'text-pink-700', 'hover:bg-pink-200');
            }
        });
        
        // 選択されたボタンをアクティブに
        const selectedBtn = buttonIds.find(id => 
            (type === 'docType' && ((value === '記録' && id === 'doc-record') || (value === '報告書' && id === 'doc-report'))) ||
            (type === 'format' && ((value === '文章形式' && id === 'format-text') || (value === 'SOAP形式' && id === 'format-soap'))) ||
            (type === 'style' && ((value === 'だ・である体' && id === 'style-plain') || (value === 'ですます体' && id === 'style-polite')))
        );
        
        if (selectedBtn) {
            const btn = document.getElementById(selectedBtn);
            if (btn) {
                btn.classList.remove('bg-pink-100', 'text-pink-700', 'hover:bg-pink-200');
                btn.classList.add('bg-pink-600', 'text-white');
            }
        }
        
        console.log('Setting updated:', type, value);
    }
    
    /**
     * 👥 職種選択
     */
    selectProfession(profession) {
        // 職種ボタンの見た目更新
        if (profession === 'nurse') {
            this.templateNurseBtn?.classList.remove('bg-pink-100', 'text-pink-700');
            this.templateNurseBtn?.classList.add('bg-pink-600', 'text-white');
            this.templateRehabBtn?.classList.remove('bg-pink-600', 'text-white');
            this.templateRehabBtn?.classList.add('bg-pink-100', 'text-pink-700', 'hover:bg-pink-200');
            
            // テンプレート表示切り替え
            this.nurseTemplates?.classList.remove('hidden');
            this.rehabTemplates?.classList.add('hidden');
        } else if (profession === 'rehab') {
            this.templateRehabBtn?.classList.remove('bg-pink-100', 'text-pink-700');
            this.templateRehabBtn?.classList.add('bg-pink-600', 'text-white');
            this.templateNurseBtn?.classList.remove('bg-pink-600', 'text-white');
            this.templateNurseBtn?.classList.add('bg-pink-100', 'text-pink-700', 'hover:bg-pink-200');
            
            // テンプレート表示切り替え
            this.rehabTemplates?.classList.remove('hidden');
            this.nurseTemplates?.classList.add('hidden');
        }
        
        // 既存のテンプレート選択をクリア
        this.clearAllTemplates();
    }
    
    /**
     * 📋 テンプレート追加
     */
    addTemplate(template) {
        if (!this.selectedTemplates.includes(template)) {
            this.selectedTemplates.push(template);
            this.updateSelectedTemplateDisplay();
            console.log('Template added:', template, 'Selected:', this.selectedTemplates);
        }
    }
    
    /**
     * 📋 テンプレート削除
     */
    removeTemplate(template) {
        const index = this.selectedTemplates.indexOf(template);
        if (index > -1) {
            this.selectedTemplates.splice(index, 1);
            this.updateSelectedTemplateDisplay();
            console.log('Template removed:', template, 'Selected:', this.selectedTemplates);
        }
    }
    
    /**
     * 📋 選択されたテンプレート表示を更新
     */
    updateSelectedTemplateDisplay() {
        if (this.selectedTemplates.length > 0) {
            if (this.selectedTemplatesDiv) {
                this.selectedTemplatesDiv.classList.remove('hidden');
            }
            if (this.selectedTemplateList) {
                this.selectedTemplateList.innerHTML = this.selectedTemplates
                    .map(template => `<div class="flex items-center justify-between py-1">
                        <span>• ${template}</span>
                        <button onclick="window.tapKarte.removeTemplateFromDisplay('${template}')" class="text-pink-600 hover:text-pink-800 ml-2">
                            <i class="fas fa-times text-xs"></i>
                        </button>
                    </div>`)
                    .join('');
            }
        } else {
            if (this.selectedTemplatesDiv) {
                this.selectedTemplatesDiv.classList.add('hidden');
            }
        }
    }
    
    /**
     * 📋 表示からテンプレート削除（個別削除用）
     */
    removeTemplateFromDisplay(template) {
        // チェックボックスも解除
        const checkbox = document.querySelector(`input[data-template="${template}"]`);
        if (checkbox) {
            checkbox.checked = false;
        }
        this.removeTemplate(template);
    }
    
    /**
     * 🗑️ テンプレート選択をすべてクリア
     */
    clearAllTemplates() {
        this.selectedTemplates = [];
        
        // すべてのチェックボックスを解除
        document.querySelectorAll('.template-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        this.updateSelectedTemplateDisplay();
        console.log('All templates cleared');
    }
    
    /**
     * 🔢 文字数制限の更新
     */
    updateCharLimit() {
        if (this.charLimitSlider && this.charLimitDisplay) {
            this.currentCharLimit = parseInt(this.charLimitSlider.value);
            this.charLimitDisplay.textContent = `${this.currentCharLimit}文字`;
        }
    }
    
    /**
     * 📊 入力文字数カウント更新
     */
    updateQuickInputCount() {
        if (this.quickInputText && this.quickInputCount) {
            const count = this.quickInputText.value.length;
            this.quickInputCount.textContent = `${count}文字`;
        }
    }
    
    /**
     * 📊 出力文字数カウント更新
     */
    updateOutputCount() {
        if (this.outputText && this.outputCount) {
            const text = this.outputText.textContent || '';
            // プレースホルダーテキストの場合は0文字とする
            const count = text.includes('看護記録・医療文書がここに自動生成されます') ? 0 : text.length;
            this.outputCount.textContent = `${count}文字`;
        }
    }
    
    /**
     * ✅ 生成ボタンの有効/無効チェック
     */
    checkGenerateButton() {
        if (this.quickInputText && this.quickGenerateBtn) {
            const hasText = this.quickInputText.value.trim().length > 0;
            
            // 利用制限チェック（新規ユーザーのみ）
            const isLimitReached = !this.isLoggedIn && this.dailyUsageCount >= this.maxDailyUsage;
            
            // テキストがあり、かつ制限に達していない場合のみ有効
            const shouldEnable = hasText && !isLimitReached;
            
            this.quickGenerateBtn.disabled = !shouldEnable;
            
            if (shouldEnable) {
                this.quickGenerateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                this.quickGenerateBtn.classList.add('hover:bg-pink-700');
            } else {
                this.quickGenerateBtn.classList.add('opacity-50', 'cursor-not-allowed');
                this.quickGenerateBtn.classList.remove('hover:bg-pink-700');
            }
        }
    }
    
    /**
     * 🔄 テキスト変換（メイン機能）
     */
    async convertText() {
        const inputText = this.quickInputText?.value?.trim();
        
        if (!inputText) {
            this.showMessage('変換したいテキストを入力してください', 'error');
            return;
        }
        
        // 🎯 UI状態を生成中に変更
        this.setGeneratingState(true);
        
        try {
            // 📋 プロンプトにテンプレート情報を追加
            let templateContext = '';
            if (this.selectedTemplates.length > 0) {
                templateContext = `業務内容: ${this.selectedTemplates.join('、')}に関する記録として整理してください。\\n\\n`;
            }
            
            // 📡 API呼び出し
            const response = await fetch('/api/ai/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: templateContext + inputText,
                    options: {
                        docType: this.selectedOptions.docType,
                        format: this.selectedOptions.format,
                        style: this.selectedOptions.style,
                        charLimit: this.currentCharLimit,
                        templates: this.selectedTemplates  // テンプレート情報も送信（複数）
                    }
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // 🎉 成功：出力エリアに結果を表示
                if (this.outputText) {
                    this.outputText.textContent = data.data.result;
                    this.updateOutputCount();
                }
                
                // コピーボタンを有効化
                if (this.copyBtn) {
                    this.copyBtn.disabled = false;
                }
                
                // 利用回数を記録（新規ユーザーのみ）
                this.recordUsage();
                
                this.showMessage('変換が完了しました', 'success');
            } else {
                throw new Error(data.error || '変換に失敗しました');
            }
            
        } catch (error) {
            console.error('Conversion error:', error);
            
            if (this.outputText) {
                this.outputText.innerHTML = `<div class="text-red-500 italic">エラーが発生しました: ${error.message}</div>`;
                this.updateOutputCount();
            }
            
            this.showMessage('変換中にエラーが発生しました: ' + error.message, 'error');
        } finally {
            // 🔄 UI状態を元に戻す
            this.setGeneratingState(false);
        }
    }
    
    /**
     * ⚙️ 生成中のUI状態設定
     */
    setGeneratingState(isGenerating) {
        if (this.quickGenerateBtn) {
            this.quickGenerateBtn.disabled = isGenerating;
            
            if (isGenerating) {
                this.quickGenerateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>生成中...';
                this.quickGenerateBtn.classList.add('opacity-75');
            } else {
                this.quickGenerateBtn.innerHTML = '<i class="fas fa-magic mr-2"></i>生成';
                this.quickGenerateBtn.classList.remove('opacity-75');
                // 入力チェックを再実行
                this.checkGenerateButton();
            }
        }
        
        if (this.outputText && isGenerating) {
            this.outputText.innerHTML = '<div class="text-pink-600 italic text-center"><i class="fas fa-spinner fa-spin mr-2"></i>AI変換中...</div>';
        }
    }
    
    /**
     * 📋 出力結果をクリップボードにコピー
     */
    async copyOutput() {
        if (!this.outputText) return;
        
        const text = this.outputText.textContent;
        if (!text || text.includes('看護記録・医療文書がここに自動生成されます')) {
            this.showMessage('コピーするテキストがありません', 'error');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(text);
            this.showMessage('クリップボードにコピーしました', 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            this.showMessage('コピーに失敗しました', 'error');
        }
    }
    
    /**
     * 🗑️ 入力のみクリア
     */
    clearInput() {
        if (this.quickInputText) {
            this.quickInputText.value = '';
            this.updateQuickInputCount();
            this.checkGenerateButton();
            this.showMessage('入力内容をクリアしました', 'info');
        }
    }
    
    /**
     * 🗑️ 出力のみクリア
     */
    clearOutput() {
        if (this.outputText) {
            this.outputText.innerHTML = `
                <div class="text-pink-400 italic text-center mt-32">
                    <i class="fas fa-magic text-3xl mb-3 block"></i>
                    看護記録・医療文書がここに自動生成されます。
                </div>
            `;
            this.updateOutputCount();
        }
        
        // コピーボタンを無効化
        if (this.copyBtn) {
            this.copyBtn.disabled = true;
        }
        
        this.showMessage('出力内容をクリアしました', 'info');
    }
    
    /**
     * 🗑️ すべてクリア
     */
    clearAll() {
        if (confirm('入力内容と出力結果をすべてクリアしますか？')) {
            // 入力クリア
            this.clearInput();
            
            // 出力クリア
            this.clearOutput();
            
            // テンプレートクリア
            this.clearAllTemplates();
            
            this.showMessage('すべてクリアしました', 'info');
        }
    }
    
    /**
     * 📢 メッセージ表示
     */
    showMessage(message, type = 'info') {
        // 簡易的なメッセージ表示（将来的にはトーストメッセージなどに置き換え可能）
        const colors = {
            success: 'text-green-600',
            error: 'text-red-600',
            info: 'text-pink-600',
            warning: 'text-yellow-600'
        };
        
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // 使用制限メッセージエリアを一時的に使用
        if (this.usageLimitMessage) {
            this.usageLimitMessage.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-info-circle ${colors[type]} mr-2"></i>
                    <span class="${colors[type]}">${message}</span>
                </div>
            `;
            this.usageLimitMessage.classList.remove('hidden');
            
            // 3秒後に非表示
            setTimeout(() => {
                this.usageLimitMessage.classList.add('hidden');
            }, 3000);
        }
    }
    
    /**
     * 🆔 セッションID生成
     */
    generateSessionId() {
        this.currentSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        console.log('Session ID generated:', this.currentSessionId);
    }
    
    /**
     * 🔐 認証関連イベントリスナー
     */
    attachAuthListeners() {
        // ログインボタン
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', () => this.openLoginModal());
        }
        
        // モーダル閉じるボタン
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closeLoginModal());
        }
        
        // モーダル背景クリックで閉じる
        if (this.authModal) {
            this.authModal.addEventListener('click', (e) => {
                if (e.target === this.authModal) {
                    this.closeLoginModal();
                }
            });
        }
        
        // ログインフォーム送信
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // Escキーでモーダルを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.authModal.classList.contains('hidden')) {
                this.closeLoginModal();
            }
        });
    }
    
    /**
     * 🔓 ログインモーダルを開く
     */
    openLoginModal() {
        if (this.authModal) {
            this.authModal.classList.remove('hidden');
            if (this.loginPassword) {
                this.loginPassword.focus();
            }
        }
    }
    
    /**
     * 🔒 ログインモーダルを閉じる
     */
    closeLoginModal() {
        if (this.authModal) {
            this.authModal.classList.add('hidden');
            this.clearLoginForm();
        }
    }
    
    /**
     * 🧹 ログインフォームをクリア
     */
    clearLoginForm() {
        if (this.loginPassword) {
            this.loginPassword.value = '';
        }
        if (this.loginErrorMessage) {
            this.loginErrorMessage.classList.add('hidden');
        }
    }
    
    /**
     * 🔑 ログイン処理
     */
    async handleLogin() {
        const password = this.loginPassword?.value?.trim();
        
        if (!password) {
            this.showLoginError('パスワードを入力してください');
            return;
        }
        
        // ローディング開始
        this.setLoginLoading(true);
        
        try {
            // デモ用：簡単なパスワード認証
            // 本番環境では適切な認証APIを使用してください
            const isValidPassword = password === '656110';
            
            if (isValidPassword) {
                // 認証成功
                this.showMessage('ログインしました', 'success');
                this.closeLoginModal();
                
                // ログイン状態を更新
                this.isLoggedIn = true;
                
                // UI更新（ログイン状態に変更）
                this.updateAuthUI(true, { name: 'ゲストユーザー' });
                
                // 利用制限を解除
                this.checkUsageLimit();
                
            } else {
                this.showLoginError('パスワードが正しくありません');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError('ログインに失敗しました');
        } finally {
            this.setLoginLoading(false);
        }
    }
    
    /**
     * 🚨 ログインエラー表示
     */
    showLoginError(message) {
        if (this.loginErrorMessage) {
            this.loginErrorMessage.textContent = message;
            this.loginErrorMessage.classList.remove('hidden');
        }
    }
    
    /**
     * ⏳ ログインローディング状態設定
     */
    setLoginLoading(loading) {
        if (this.loginBtnText) {
            this.loginBtnText.style.display = loading ? 'none' : 'inline';
        }
        if (this.loginSpinner) {
            this.loginSpinner.classList.toggle('hidden', !loading);
        }
        if (this.loginForm) {
            const submitBtn = this.loginForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = loading;
            }
        }
    }
    
    /**
     * 👤 認証UI更新
     */
    updateAuthUI(isLoggedIn, user = null) {
        const userStatus = document.getElementById('user-status');
        const authButtons = document.getElementById('auth-buttons');
        
        if (isLoggedIn && user) {
            // ログイン状態のUI
            if (userStatus) {
                userStatus.classList.remove('hidden');
                const userName = userStatus.querySelector('#user-name');
                if (userName) {
                    userName.textContent = user.name || 'ユーザー';
                }
            }
            if (authButtons) {
                authButtons.classList.add('hidden');
            }
        } else {
            // 未ログイン状態のUI
            if (userStatus) {
                userStatus.classList.add('hidden');
            }
            if (authButtons) {
                authButtons.classList.remove('hidden');
            }
        }
    }
    
    /**
     * 🚪 ログアウト処理
     */
    handleLogout() {
        if (confirm('ログアウトしますか？')) {
            this.showMessage('ログアウトしました', 'info');
            this.isLoggedIn = false;
            this.updateAuthUI(false);
            this.checkUsageLimit(); // ログアウト後に制限を再確認
        }
    }
    
    /**
     * 📊 利用制限チェック
     */
    checkUsageLimit() {
        if (this.isLoggedIn) {
            // ログイン済みユーザーは無制限
            this.enableGeneration();
            return;
        }
        
        // 新規ユーザー（未ログイン）の制限をチェック
        const today = new Date().toDateString();
        const storedData = localStorage.getItem('tapkarte_usage');
        
        if (storedData) {
            const usageData = JSON.parse(storedData);
            if (usageData.date === today) {
                this.dailyUsageCount = usageData.count || 0;
            } else {
                // 日付が変わった場合はリセット
                this.dailyUsageCount = 0;
                localStorage.setItem('tapkarte_usage', JSON.stringify({
                    date: today,
                    count: 0
                }));
            }
        } else {
            // 初回利用
            this.dailyUsageCount = 0;
            localStorage.setItem('tapkarte_usage', JSON.stringify({
                date: today,
                count: 0
            }));
        }
        
        // 制限チェック
        if (this.dailyUsageCount >= this.maxDailyUsage) {
            this.disableGeneration();
        } else {
            this.enableGeneration();
        }
    }
    
    /**
     * ✅ 生成機能を有効化
     */
    enableGeneration() {
        if (this.quickGenerateBtn) {
            this.quickGenerateBtn.disabled = false;
            this.quickGenerateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            this.quickGenerateBtn.classList.add('hover:bg-pink-700');
        }
    }
    
    /**
     * ❌ 生成機能を無効化（制限到達時）
     */
    disableGeneration() {
        if (this.quickGenerateBtn) {
            this.quickGenerateBtn.disabled = true;
            this.quickGenerateBtn.classList.add('opacity-50', 'cursor-not-allowed');
            this.quickGenerateBtn.classList.remove('hover:bg-pink-700');
        }
        
        // 制限メッセージを表示
        this.showMessage('本日の利用制限に達しました。ログインすると無制限でご利用いただけます。', 'warning');
    }
    
    /**
     * 📈 利用回数を記録
     */
    recordUsage() {
        if (this.isLoggedIn) {
            // ログインユーザーは記録不要
            return;
        }
        
        // 新規ユーザーの利用回数を増加
        this.dailyUsageCount++;
        const today = new Date().toDateString();
        
        localStorage.setItem('tapkarte_usage', JSON.stringify({
            date: today,
            count: this.dailyUsageCount
        }));
        
        // 制限チェック
        this.checkUsageLimit();
    }
}

// 🚀 アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    window.tapKarte = new TapKarteDashboard();
    console.log('🎯 タップカルテ ダッシュボード版が起動しました！');
});