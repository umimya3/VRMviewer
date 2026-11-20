@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [1/3] フォルダを作成しています...
if not exist "css" mkdir "css"
if not exist "js" mkdir "js"
if not exist "js\motions" mkdir "js\motions"
if not exist "assets" mkdir "assets"

echo [2/3] ファイルを配置先へ移動しています...
if exist "viewer.css"  move /y "viewer.css"  "css\"
if exist "core.js"     move /y "core.js"     "js\"
if exist "ui.js"       move /y "ui.js"       "js\"
if exist "registry.js" move /y "registry.js" "js\motions\"
if exist "basic.js"    move /y "basic.js"    "js\motions\"
if exist "sword.js"    move /y "sword.js"    "js\motions\"
if exist "vs.js"       move /y "vs.js"       "js\motions\"

echo [3/3] assets の必須ファイルを確認しています...
if not exist "assets\three.min.js" (
  echo [注意] assets\three.min.js が見つかりません。元プロジェクトからコピーしてください。
)
if not exist "assets\model.vrm" (
  echo [注意] assets\model.vrm が見つかりません。初期表示したいVRMを model.vrm の名前で置いてください。
)

echo.
echo 完了しました！
pause