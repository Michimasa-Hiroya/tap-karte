// 看護記録アシスタント - Frontend JavaScript

class NursingAssistant {
    constructor() {
        this.selectedOptions = {
            style: 'ですます体',
            docType: '記録',
            format: '文章形式'
        };
        
        this.initializeElements();
        this.attachEventListeners();
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
        this.currentCharLimit = 1000;
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
        
        // 入力文字数カウント関連のリスナーを削除
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
        
        activeBtn.className = 'px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors';
        inactiveBtn.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors';
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
            const response = await fetch('/api/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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
            } else {
                throw new Error(result.error || '変換に失敗しました。');
            }
            
        } catch (error) {
            console.error('Conversion error:', error);
            this.outputText.innerHTML = `<div class=\"text-pink-700\">エラーが発生しました: ${error.message}</div>`;
            this.copyBtn.disabled = true;
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
    
    clearInput() {
        if (confirm('入力内容をクリアしますか？')) {
            this.inputText.value = '';
            this.outputText.innerHTML = '<div class=\"text-pink-400 italic\">整形された文章がここに表示されます...</div>';
            this.copyBtn.disabled = true;
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
    new NursingAssistant();
});