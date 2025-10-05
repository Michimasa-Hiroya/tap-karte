// 看護記録アシスタント - Frontend JavaScript

class NursingAssistant {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.selectedOptions = {
            style: 'ですます体',
            docType: '記録',
            format: '文章形式'
        };
        
        this.initializeElements();
        this.initializeSpeechRecognition();
        this.attachEventListeners();
    }
    
    initializeElements() {
        this.inputText = document.getElementById('input-text');
        this.outputText = document.getElementById('output-text');
        this.voiceBtn = document.getElementById('voice-input');
        this.voiceStatus = document.getElementById('voice-status');
        this.micIcon = document.getElementById('mic-icon');
        this.convertBtn = document.getElementById('convert-btn');
        this.copyBtn = document.getElementById('copy-btn');
        this.clearBtn = document.getElementById('clear-input');
        this.loading = document.getElementById('loading');
    }
    
    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'ja-JP';
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.voiceStatus.textContent = '音声入力中...';
                this.micIcon.className = 'fas fa-microphone-slash';
                this.voiceBtn.className = 'flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors';
            };
            
            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                if (finalTranscript) {
                    const currentText = this.inputText.value;
                    this.inputText.value = currentText + finalTranscript + ' ';
                    this.inputText.focus();
                    this.inputText.setSelectionRange(this.inputText.value.length, this.inputText.value.length);
                }
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                this.voiceStatus.textContent = '音声入力開始';
                this.micIcon.className = 'fas fa-microphone';
                this.voiceBtn.className = 'flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors';
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isListening = false;
                this.voiceStatus.textContent = '音声入力開始';
                this.micIcon.className = 'fas fa-microphone';
                this.voiceBtn.className = 'flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors';
                
                if (event.error === 'not-allowed') {
                    alert('音声入力の許可が必要です。ブラウザの設定でマイクロフォンのアクセスを許可してください。');
                }
            };
        } else {
            this.voiceBtn.style.display = 'none';
            console.log('Speech recognition not supported');
        }
    }
    
    attachEventListeners() {
        // Option button listeners
        this.attachOptionListeners();
        
        // Voice input button
        if (this.voiceBtn) {
            this.voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
        }
        
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
        
        // Input text change listener for auto-convert (disabled for now)
        // this.inputText.addEventListener('input', debounce(() => this.convertText(), 1000));
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
        });
        document.getElementById('doc-report').addEventListener('click', () => {
            this.selectOption('docType', '報告書', 'doc-report', 'doc-record');
        });
        
        // Format buttons
        document.getElementById('format-text').addEventListener('click', () => {
            this.selectOption('format', '文章形式', 'format-text', 'format-soap');
        });
        document.getElementById('format-soap').addEventListener('click', () => {
            this.selectOption('format', 'SOAP形式', 'format-soap', 'format-text');
        });
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
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }
    
    async convertText() {
        const inputText = this.inputText.value.trim();
        
        if (!inputText) {
            alert('変換するテキストを入力してください。');
            return;
        }
        
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
                    format: this.selectedOptions.format
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
            this.outputText.innerHTML = `<div class=\"text-red-500\">エラーが発生しました: ${error.message}</div>`;
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
            this.copyBtn.className = 'flex items-center space-x-2 px-4 py-2 bg-green-700 text-white rounded-lg transition-colors';
            
            setTimeout(() => {
                this.copyBtn.innerHTML = originalText;
                this.copyBtn.className = 'flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors';
            }, 2000);
            
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('コピーに失敗しました。');
        });
    }
    
    clearInput() {
        this.inputText.value = '';
        this.outputText.innerHTML = '<div class=\"text-gray-400 italic\">整形された文章がここに表示されます...</div>';
        this.copyBtn.disabled = true;
        this.inputText.focus();
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