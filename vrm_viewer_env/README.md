# VRMビューワー 環境一式

しろみぶりVSゲーム版（Space `vrmbiyua`）から、モデル表示まわりだけを抜き出して
単体ビューワーにした Space `vrmbiyuwa`（VRMビューワー）のソース一式。

## 構成
- `viewer/` — 完成品そのもの（静的サイト）
  - `index.html` — 本体。UI・手続きモーション・表情/ポーズ操作の全コード入り
  - `assets/three.min.js` — three.js + @pixiv/three-vrm を1本化したライブラリ
  - `assets/model.vrm` — 既定モデル（白海ぶり v4.6）
  - `space.json` — Spaceとしての定義（runtime: static / entry: index.html）
- `src/` — 抜き出し時の素材
  - `app_code.js` — ゲーム版バンドルから分離したアプリ側コード（モデル埋め込み部はプレースホルダ化）
  - `three_vrm_lib.js` — ライブラリ部（viewer/assets/three.min.js と同一系統）
  - `model_extracted.vrm` — ゲーム版から抜いたモデル（assets/model.vrm と同一）

## ローカルで動かす
`viewer/` フォルダで静的サーバーを立てるだけ：
    python3 -m http.server 8000
→ http://localhost:8000 を開く。
（file:// 直開きはVRM読み込みがCORSで失敗するので不可）

## 機能
- 既定モデル自動読み込み＋手続きモーション（待機/歩行ほかゲーム版の動き）
- 表情24種（プリセット＋スライダー＋口形）、ポーズ/関節スライダー、尻尾連動
- カメラプリセット、背景切り替え
- 「別のVRMファイルを開く」ボタン＋ドラッグ&ドロップで任意のVRM 1.0を表示
- 色変更：パーカー/下駄プリセット8色＋マテリアル別カラーピッカー＋リセット

## 由来メモ
- 2026-11-19、ユーザーの「既存コードから該当箇所とモデルを抜き出して」の指示で作成
- ゲーム本体の処理（対戦・ウェーブ・HUD等）は含まない
