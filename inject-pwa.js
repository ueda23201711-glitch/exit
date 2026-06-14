/**
 * inject-pwa.js
 * StaticCryptで暗号化したindex.htmlにPWAメタタグを注入するスクリプト
 */

const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, 'index.html');

if (!fs.existsSync(TARGET)) {
  console.error('エラー: index.html が見つかりません。先に staticrypt を実行してください。');
  process.exit(1);
}

const PWA_TAGS = `
    <!-- PWA -->
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#F5C800">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="8番出口">
    <link rel="apple-touch-icon" href="icon-180.png">
    <meta name="msapplication-TileImage" content="icon-144.png">
    <meta name="msapplication-TileColor" content="#F5C800">`;

// document.write()前にPWA文脈をsessionStorageに保存するスクリプト
// StaticCryptがdocument.write()するとwindow.navigator.standaloneがリセットされる問題の対策
const PWA_FLAG_SCRIPT = `
    <script>
      (function(){
        var sa=window.navigator.standalone===true;
        var mfs=window.matchMedia&&(window.matchMedia('(display-mode: fullscreen)').matches||window.matchMedia('(display-mode: standalone)').matches);
        if(sa||mfs){try{sessionStorage.setItem('exit8_pwa','1');}catch(e){}}
      })();
    </script>`;

const SW_SCRIPT = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('./sw.js')
            .then(r => console.log('SW登録完了:', r.scope))
            .catch(e => console.log('SW登録失敗:', e));
        });
      }
    </script>`;

let html = fs.readFileSync(TARGET, 'utf-8');

// StaticCryptのviewportタグをviewport-fit=cover付きに差し替え
html = html.replace(
  /<meta\s+name="viewport"[^>]*>/i,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
);

// 既注入タグを除去してクリーンに再注入
html = html.replace(/\n?\s*<!-- PWA -->[\s\S]*?<meta name="msapplication-TileColor"[^>]*>/g, '');
html = html.replace(/\n?\s*<script>\s*\(function\(\)\{[\s\S]*?exit8_pwa[\s\S]*?<\/script>/g, '');
html = html.replace(/\n?\s*<script>\s*if\s*\('serviceWorker'[\s\S]*?<\/script>/g, '');

// </title>の直後にPWAタグ + PWAフラグスクリプトを挿入
const titleEnd = '</title>';
if (!html.includes(titleEnd)) {
  console.error('エラー: </title> が見つかりません。');
  process.exit(1);
}
html = html.replace(titleEnd, titleEnd + PWA_TAGS + PWA_FLAG_SCRIPT);

// </body>の直前にSWスクリプトを挿入
const bodyEnd = '</body>';
if (!html.includes(bodyEnd)) {
  console.error('エラー: </body> が見つかりません。');
  process.exit(1);
}
html = html.replace(bodyEnd, SW_SCRIPT + '\n    </body>');

fs.writeFileSync(TARGET, html, 'utf-8');
console.log('✅ PWAタグの注入が完了しました: index.html');
