// 看護記録アシスタント - 簡素化版 (Google認証対応)

class NursingAssistant {
    constructor() {
        this.selectedOptions = {
            style: 'だ・である体',
            docType: '記録',
            format: '文章形式'
        };
        this.currentSessionId = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeButtonStates();
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
        
        // Initialize character limit (for output)
        this.currentCharLimit = 500;
        
        // Character count elements
        this.inputCountDisplay = document.getElementById('input-count');
        this.outputCountDisplay = document.getElementById('output-count');
    }
    
    attachEventListeners() {
        // Option button listeners
        this.attachOptionListeners();
        
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
    
    initializeButtonStates() {
        // Initialize button styles based on default selected options
        this.selectOption('style', this.selectedOptions.style, 'style-plain', 'style-polite');
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
            this.forceTextFormat();
        });
        
        // Format buttons
        document.getElementById('format-text').addEventListener('click', () => {
            this.selectOption('format', '文章形式', 'format-text', 'format-soap');
        });
        document.getElementById('format-soap').addEventListener('click', () => {
            this.selectOption('format', 'SOAP形式', 'format-soap', 'format-text');
        });
    }
    
    selectOption(category, value, activeId, inactiveId) {
        this.selectedOptions[category] = value;
        
        const activeBtn = document.getElementById(activeId);
        const inactiveBtn = document.getElementById(inactiveId);
        
        if (activeBtn && inactiveBtn) {
            // Active button style
            activeBtn.classList.remove('bg-pink-100', 'text-pink-700', 'hover:bg-pink-200');
            activeBtn.classList.add('bg-pink-600', 'text-white', 'hover:bg-pink-700');
            
            // Inactive button style
            inactiveBtn.classList.remove('bg-pink-600', 'text-white', 'hover:bg-pink-700');
            inactiveBtn.classList.add('bg-pink-100', 'text-pink-700', 'hover:bg-pink-200');
        }
        
        console.log('Selected:', this.selectedOptions);
    }
    
    enableFormatSelection() {
        const textBtn = document.getElementById('format-text');
        const soapBtn = document.getElementById('format-soap');
        
        if (textBtn && soapBtn) {
            textBtn.disabled = false;
            soapBtn.disabled = false;
            textBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            soapBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    forceTextFormat() {
        // 報告書は文章形式のみ
        this.selectOption('format', '文章形式', 'format-text', 'format-soap');
        
        const soapBtn = document.getElementById('format-soap');
        if (soapBtn) {
            soapBtn.disabled = true;
            soapBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
        const textBtn = document.getElementById('format-text');
        if (textBtn) {
            textBtn.disabled = false;
            textBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    updateCharLimit() {
        if (this.charLimitSlider && this.charLimitDisplay) {
            this.currentCharLimit = parseInt(this.charLimitSlider.value);
            this.charLimitDisplay.textContent = `${this.currentCharLimit}文字`;
        }
    }
    
    generateSessionId() {
        this.currentSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2);
    }
    
    clearInput() {
        if (this.inputText) {
            this.inputText.value = '';
            this.updateInputCharCount();
        }
    }
    
    async convertText() {
        const inputText = this.inputText?.value?.trim();
        
        if (!inputText) {
            this.showTemporaryMessage('変換したいテキストを入力してください', 'error');
            return;
        }
        
        // UI状態変更
        if (this.loading) this.loading.classList.remove('hidden');
        if (this.convertBtn) this.convertBtn.disabled = true;
        if (this.outputText) {
            this.outputText.textContent = '処理中...';
            this.updateOutputCharCount();
        }
        
        try {
            // 認証トークンを取得（google-auth.jsから）
            const authToken = window.getGoogleAuth ? window.getGoogleAuth()?.getAuthToken() : null;
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // 認証トークンがある場合は追加
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }
            
            const response = await fetch('/api/convert', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    text: inputText,
                    style: this.selectedOptions.style,
                    docType: this.selectedOptions.docType,
                    format: this.selectedOptions.format,
                    maxOutputChars: this.currentCharLimit,
                    sessionId: this.currentSessionId
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                if (this.outputText) {
                    this.outputText.textContent = data.convertedText;
                    this.updateOutputCharCount();
                }
                
                if (this.copyBtn) {
                    this.copyBtn.disabled = false;
                }
                
                this.showTemporaryMessage('変換が完了しました', 'success');
                
                // 履歴を更新（認証済みユーザーの場合のみ）
                if (authToken) {
                    this.loadHistory();
                }
            } else {
                throw new Error(data.error || '変換に失敗しました');
            }
            
        } catch (error) {
            console.error('Conversion error:', error);
            if (this.outputText) {
                this.outputText.innerHTML = '<div class="text-red-500 italic">エラーが発生しました: ' + error.message + '</div>';
                this.updateOutputCharCount();
            }
            this.showTemporaryMessage('変換中にエラーが発生しました: ' + error.message, 'error');
        } finally {
            // UI状態復元
            if (this.loading) this.loading.classList.add('hidden');
            if (this.convertBtn) this.convertBtn.disabled = false;
        }
    }
    
    copyOutput() {
        if (!this.outputText) return;
        
        const text = this.outputText.textContent;
        if (!text || text.includes('生成された文章がここに表示されます') || text.includes('エラーが発生しました')) {
            this.showTemporaryMessage('コピーするテキストがありません', 'error');
            return;
        }
        
        navigator.clipboard.writeText(text).then(() => {
            this.showTemporaryMessage('クリップボードにコピーしました', 'success');
        }).catch(err => {
            console.error('Copy failed:', err);
            this.showTemporaryMessage('コピーに失敗しました', 'error');
        });
    }
    
    // 履歴関連（簡素化版）
    async loadHistory() {
        // 認証ユーザーのみ履歴機能を使用
        const authToken = window.getGoogleAuth ? window.getGoogleAuth()?.getAuthToken() : null;
        if (!authToken) {
            return; // 未認証の場合は履歴なし
        }
        
        // 履歴機能は必要に応じて実装
        console.log('History loading skipped (simplified version)');
    }
    
    showTemporaryMessage(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg z-50 transition-all duration-300`;
        
        // Set color based on type
        switch (type) {
            case 'success':
                notification.classList.add('bg-green-500', 'text-white');
                break;
            case 'error':
                notification.classList.add('bg-red-500', 'text-white');
                break;
            case 'warning':
                notification.classList.add('bg-yellow-500', 'text-white');
                break;
            default: // info
                notification.classList.add('bg-blue-500', 'text-white');
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.nursingAssistant = new NursingAssistant();
});