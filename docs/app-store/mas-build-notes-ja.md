# MAS ビルド検証メモ

## コマンド

```sh
npm run dist:mas
```

## 必要な署名アセット

Mac App Store 提出用ビルドには、Apple Developer Program 側で以下の準備が必要です。

- Apple Developer Program の有効なメンバーシップ
- App Store Connect のアプリ登録
- Paid Apps Agreement、銀行、税務情報
- Mac App Store 配布用の Application 署名証明書
- Mac App Store 配布用の Installer 署名証明書
- App ID に対応した Provisioning Profile

証明書名は Apple Developer の画面や作成時期により表記が異なる場合があります。electron-builder のログでは Installer 署名として `3rd Party Mac Developer Installer` identity が要求されることがあります。

## 現在の検証結果

2026-06-20 時点では、`npm run dist:mas` は MAS 用 Electron ランタイムの取得、Vite/Electron ビルド、MAS 用 `.app` のパッケージングまでは進みました。

ローカル環境に Mac App Store 提出用 Installer 証明書がないため、最終的な MAS installer 署名で停止します。

```text
Cannot find valid "3rd Party Mac Developer Installer" identity to sign MAS installer
```

証明書と Provisioning Profile をキーチェーンと electron-builder 設定に追加した後、同じコマンドで再検証してください。

## 実装メモ

- `VITE_DISTRIBUTION=mas` で App Store 版の UI / IPC 分岐を有効化します。
- MAS 版では外部更新確認、外部支援リンク、外部 URL 導線を無効化します。
- MAS 版では `/Volumes` 自動探索による復旧を無効化します。
- ファイル選択ダイアログでは security-scoped bookmarks を有効化します。
- entitlements は `build/entitlements.mas.plist` と `build/entitlements.mas.inherit.plist` を使います。
