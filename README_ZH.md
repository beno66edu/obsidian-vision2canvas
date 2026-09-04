# Vision2Canvas for Obsidian 🚀 (繁體中文)

> 運用多模態視覺 AI（Vision MLLM），將實體手寫筆記照片、白板草圖與心智圖，無縫轉化為具備空間座標與關聯連線的 Obsidian 原生 `.canvas` 數位白板。

[English README](file:///Users/user/projects/vision2obsidian/README.md) | **繁體中文說明文件**

---

## 📖 專案簡介

**Vision2Canvas** 填補了「實體手寫思維」與「數位 Obsidian 知識庫」之間的轉換斷層。透過多模態大語言模型（Vision MLLMs，例如 Google AI Studio Gemini、OpenAI 或 Claude），這款 Obsidian 外掛不僅能提取文字 OCR，更能：

- **完整還原空間排版**：精準捕捉手寫區塊的相對位置，自動推算並賦予 Canvas 卡片絕對 `(x, y)` 座標與長寬尺寸。
- **智慧解析邏輯連線**：將手寫圖中的箭頭、流程線與群組外框，轉譯為 Obsidian Canvas 原生的 `nodes`（節點）、`edges`（連線）與 `groups`（群組）。
- **桌面極速工作流**：輕鬆透過螢幕截圖、剪貼簿或檔案庫內的圖片，一鍵轉換為數位白板。

---

## 🌟 核心特徵

1. **空間邊界框座標映射 (Spatial Bounding Box Mapping)**  
   精準將手寫欄位、列點事項與邊欄註記映射為獨立 Canvas 卡片，並自動進行顏色分類與防重疊算術。

2. **智慧箭頭與層級判讀 (Smart Arrow & Hierarchy Detection)**  
   自動判讀連線箭頭方向與文字標記，並智慧計算最佳掛載側邊（`top`、`bottom`、`left`、`right`）。

3. **相容 Google AI Studio 與 OpenAI 相容 API**  
   原生支援串接 Google AI Studio (Gemini)、OpenAI API 或本地端 MLLM API 網關。

4. **桌面多通道觸發機制**  
   - **剪貼簿命令**：複製任意圖片或螢幕截圖 → 執行 `Convert Clipboard Image to Canvas`。
   - **檔案選單右鍵**：在 Obsidian 檔案瀏覽器中右鍵點擊圖片（`.png`, `.jpg`, `.jpeg`, `.webp`）→ `Convert to Obsidian Canvas Whiteboard`。

---

## 🏗 系統架構

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              觸發輸入端                                 │
│           ┌─────────────────────┐       ┌───────────────┐               │
│           │ 剪貼簿截圖 (Clipboard)│       │ Vault 內圖片  │               │
│           └──────────┬──────────┘       └───────┬───────┘               │
└──────────────────────┼──────────────────────────┼───────────────────────┘
                       │                          │
                       ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Vision2Canvas 外掛核心                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ VisionClient (Google AI Studio / OpenAI 相容 API)                  │  │
│  └──────────────────┬────────────────────────────────────────────────┘  │
│                     │ (空間 OCR + 結構化 JSON Schema 輸出)             │
│  ┌──────────────────▼────────────────────────────────────────────────┐  │
│  │ CanvasBuilder & CanvasValidator                                   │  │
│  │ - 座標正規化 (scaleX, scaleY) 與防重疊處理                        │  │
│  │ - 自動連線側邊計算 (top, bottom, left, right)                     │  │
│  └──────────────────┬────────────────────────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────────────────────┘
                      │
                      ▼
      ┌───────────────────────────────┐
      │ Obsidian Vault (.canvas 檔案) │
      └───────────────────────────────┘
```

---

## 🚀 快速啟動與安裝說明

### 1. 編譯與安裝外掛

```bash
# 進入你 Obsidian 庫的 plugins 目錄
cd /path/to/your/vault/.obsidian/plugins/

# 克隆本專案
git clone https://github.com/yourname/vision2obsidian.git
cd vision2obsidian

# 安裝依賴並進行構建
npm install
npm run build
```

編譯完成後，開啟 Obsidian：`設定` → `社群外掛程式` → 啟用 **Vision2Canvas**。

### 2. 配置設定頁面

進入 Obsidian `設定` → `Vision2Canvas`：
- **AI API Endpoint**：`https://generativelanguage.googleapis.com/v1beta/openai`（或 `https://api.openai.com/v1`）
- **API Key**：填入您的 Google AI Studio 或 OpenAI API 金鑰
- **Vision Model Name**：`gemini-flash-latest`（或 `gpt-4o`）

---

## 🧪 本地測試與驗證

本專案附帶獨立測試腳本，可將 `ref/sample.jpeg` 手寫範例解析為 `output_sample.canvas`：

```bash
npm run test:sample
```

輸出結果：
```
--- TEST RESULTS ---
Generated 15 nodes and 4 edges.
Saved output canvas to: /Users/user/projects/vision2obsidian/output_sample.canvas
```

---

## 📜 授權條款

MIT License © 2026 beno66edu
