#!/bin/bash
# update_gemini_key.sh - Gemini APIキー更新ヘルパー

echo "=== Gemini APIキー更新ヘルパー ==="
echo ""
echo "現在の.dev.varsファイルの内容:"
cat .dev.vars
echo ""
echo "新しいGemini APIキー (AIzaSyC...形式) を入力してください:"
read -r NEW_API_KEY

if [[ $NEW_API_KEY == AIzaSyC* ]]; then
    # APIキーを更新
    sed -i "s/GEMINI_API_KEY=.*/GEMINI_API_KEY=$NEW_API_KEY/" .dev.vars
    echo "✅ APIキーを更新しました"
    echo ""
    echo "開発サーバーを再起動しています..."
    pm2 restart nursing-assistant
    echo ""
    echo "🎉 設定完了！以下でテストできます:"
    echo "curl -X POST -H 'Content-Type: application/json' -d '{\"text\":\"テスト入力\",\"style\":\"だ・である体\",\"docType\":\"記録\",\"format\":\"文章形式\",\"charLimit\":300}' http://localhost:3000/api/convert"
else
    echo "❌ 無効なAPIキー形式です。AIzaSyCで始まる必要があります。"
fi