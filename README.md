# テトリス (Tetris Game)

本プロジェクトはReact TypeScript製テトリス風ゲームです。


## ⌨️ 操作方法

### 移動
- `← →` / `A D`: 左右移動
- `↓` / `S`: 下降
- `↑` / `W`: ハードドロップ

### 回転
- `J`: 左回転（反時計回り）
- `K`: 右回転（時計回り）

### 特殊機能
- `スペース`: HOLD（ピース保持/交換）
- `P`: 一時停止

## 技術仕様

- **フレームワーク**: React 18 + TypeScript
- **ビルドツール**: Vite
- **スタイリング**: Tailwind CSS
- **状態管理**: React Hooks (useState, useEffect, useCallback)

## 開発・実行

### 開発サーバー起動
```bash
npm install
npm run dev
```

### 本番ビルド
```bash
npm run build
```

### プレビュー
```bash
npm run preview
```

## プロジェクト構造

```
tetris-game/
├── src/
│   ├── App.tsx          # メインゲームロジック
│   ├── App.css          # スタイル設定
│   ├── main.tsx         # エントリーポイント
│   └── index.css        # グローバルスタイル
├── public/              # 静的ファイル
├── dist/                # ビルド出力
└── package.json         # 依存関係設定
```
