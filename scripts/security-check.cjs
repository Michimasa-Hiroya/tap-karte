#!/usr/bin/env node

/**
 * 🛡️ セキュリティ設定検証スクリプト
 * 
 * GitHub移行後のセキュリティ設定を総合的にチェックします
 */

const fs = require('fs');
const path = require('path');

class SecurityChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
  }

  log(type, message) {
    const timestamp = new Date().toISOString();
    const emoji = {
      error: '❌',
      warning: '⚠️',
      success: '✅',
      info: 'ℹ️'
    }[type] || 'ℹ️';
    
    console.log(`${emoji} [${timestamp}] ${message}`);
    
    if (type === 'error') this.errors.push(message);
    if (type === 'warning') this.warnings.push(message);
    if (type === 'success') this.passed.push(message);
  }

  checkFileExists(filepath, required = true) {
    const exists = fs.existsSync(filepath);
    if (required && !exists) {
      this.log('error', `必須ファイルが見つかりません: ${filepath}`);
    } else if (!required && !exists) {
      this.log('warning', `推奨ファイルが見つかりません: ${filepath}`);
    } else {
      this.log('success', `ファイル確認OK: ${filepath}`);
    }
    return exists;
  }

  checkGitignore() {
    this.log('info', 'GitIgnore セキュリティチェック開始...');
    
    if (!this.checkFileExists('.gitignore')) return;

    const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
    const requiredPatterns = [
      '*.env',
      '*secret*',
      '*key*',
      '*token*',
      '*.pem',
      '*.p12',
      '.dev.vars'
    ];

    requiredPatterns.forEach(pattern => {
      if (gitignoreContent.includes(pattern)) {
        this.log('success', `GitIgnore パターンOK: ${pattern}`);
      } else {
        this.log('error', `GitIgnore パターン不足: ${pattern}`);
      }
    });
  }

  checkSecurityFiles() {
    this.log('info', 'セキュリティ関連ファイルチェック開始...');
    
    const requiredFiles = [
      'SECURITY.md',
      '.github/workflows/security-scan.yml',
      '.github/workflows/pre-commit.yml',
      '.github/dependabot.yml'
    ];

    const optionalFiles = [
      '.env.example',
      'SECURITY_MIGRATION_PLAN.md',
      'CLOUDFLARE_WAF_SETUP.md',
      'CLOUDFLARE_SECRETS_SETUP.md'
    ];

    requiredFiles.forEach(file => this.checkFileExists(file, true));
    optionalFiles.forEach(file => this.checkFileExists(file, false));
  }

  checkForSecrets() {
    this.log('info', '機密情報漏洩チェック開始...');
    
    const sensitivePatterns = [
      /api_key\s*[:=]\s*["'](?!your_|example_|test_)[A-Za-z0-9+\/]{20,}/,
      /password\s*[:=]\s*["'](?!your_|example_|test_)[A-Za-z0-9!@#$%^&*]{8,}/,
      /secret\s*[:=]\s*["'](?!your_|example_|test_)[A-Za-z0-9+\/]{20,}/,
      /token\s*[:=]\s*["'](?!your_|example_|test_)[A-Za-z0-9+\/]{20,}/
    ];

    const checkDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        
        if (stat.isDirectory()) {
          if (!file.startsWith('.') && file !== 'node_modules') {
            checkDirectory(filepath);
          }
        } else if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.json')) {
          const content = fs.readFileSync(filepath, 'utf8');
          
          sensitivePatterns.forEach(pattern => {
            if (pattern.test(content)) {
              this.log('error', `潜在的な機密情報検出: ${filepath}`);
            }
          });
        }
      });
    };

    try {
      checkDirectory('./src');
      checkDirectory('./public');
      this.log('success', '機密情報漏洩チェック完了');
    } catch (error) {
      this.log('warning', `チェック中にエラー: ${error.message}`);
    }
  }

  checkPackageJson() {
    this.log('info', 'Package.json セキュリティ設定チェック...');
    
    if (!this.checkFileExists('package.json')) return;

    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // セキュリティ関連の推奨スクリプト
    const recommendedScripts = {
      'security:audit': 'npm audit',
      'security:fix': 'npm audit fix',
      'security:check': 'node scripts/security-check.js'
    };

    Object.entries(recommendedScripts).forEach(([script, command]) => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        this.log('success', `セキュリティスクリプトOK: ${script}`);
      } else {
        this.log('warning', `セキュリティスクリプト推奨: ${script} (${command})`);
      }
    });
  }

  checkEnvironmentTemplate() {
    this.log('info', '環境変数テンプレートチェック...');
    
    if (!this.checkFileExists('.env.example', false)) return;

    const envTemplate = fs.readFileSync('.env.example', 'utf8');
    const requiredVars = [
      'GEMINI_API_KEY',
      'JWT_SECRET',
      'CLOUDFLARE_API_TOKEN'
    ];

    requiredVars.forEach(variable => {
      if (envTemplate.includes(variable)) {
        this.log('success', `環境変数テンプレートOK: ${variable}`);
      } else {
        this.log('warning', `環境変数テンプレート推奨: ${variable}`);
      }
    });

    // 実際の.envファイルが存在しないことを確認
    if (fs.existsSync('.env')) {
      this.log('error', '.envファイルが検出されました - Git追跡から除外してください');
    } else {
      this.log('success', '.envファイル不存在確認OK');
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('🛡️ セキュリティチェック レポート');
    console.log('='.repeat(50));
    
    console.log(`\n✅ 成功: ${this.passed.length} 項目`);
    console.log(`⚠️  警告: ${this.warnings.length} 項目`);
    console.log(`❌ エラー: ${this.errors.length} 項目`);

    if (this.errors.length > 0) {
      console.log('\n❌ 修正が必要な問題:');
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  改善推奨項目:');
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    const score = (this.passed.length / (this.passed.length + this.warnings.length + this.errors.length)) * 100;
    console.log(`\n🎯 セキュリティスコア: ${score.toFixed(1)}%`);

    if (score >= 90) {
      console.log('🏆 優秀: セキュリティ設定が適切に実装されています');
    } else if (score >= 70) {
      console.log('👍 良好: いくつかの改善項目があります');  
    } else {
      console.log('⚠️  要改善: セキュリティ設定の見直しが必要です');
    }

    console.log('\n' + '='.repeat(50));
    return this.errors.length === 0;
  }

  run() {
    console.log('🛡️ タップカルテ セキュリティ設定検証開始...\n');

    this.checkGitignore();
    this.checkSecurityFiles();  
    this.checkForSecrets();
    this.checkPackageJson();
    this.checkEnvironmentTemplate();

    return this.generateReport();
  }
}

// スクリプト実行
if (require.main === module) {
  const checker = new SecurityChecker();
  const success = checker.run();
  process.exit(success ? 0 : 1);
}

module.exports = SecurityChecker;