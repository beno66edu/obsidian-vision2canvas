# Vision2Canvas for Obsidian 🚀

> Convert physical handwritten note photos, whiteboard sketches, and mind maps into native, structured Obsidian `.canvas` whiteboards with Vision AI.

**English README** | [繁體中文說明文件](file:///Users/user/projects/vision2obsidian/README_ZH.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Obsidian](https://img.shields.io/badge/Obsidian-v1.4.0%2B-purple)

---

## 📖 Overview

**Vision2Canvas** bridges the gap between analog handwritten thinking and digital Obsidian knowledge bases. Using multimodal Vision Large Language Models (Vision MLLMs like Google AI Studio Gemini, OpenAI, Claude, or OpenClaw), this Obsidian plugin not only extracts text OCR but also:
- **Preserves Spatial Layout**: Maps handwritten sections to absolute `(x, y)` coordinates and card dimensions.
- **Translates Visual Connections**: Converts arrows, flowchart paths, and group boxes into native Obsidian Canvas `nodes`, `edges`, and `groups`.
- **Desktop Workflow**: Instantly process clipboard screenshots or images directly in your vault.

---

## 🌟 Key Features

1. **Spatial Bounding Box Mapping**  
   Maps handwritten columns, bullet points, and margin notes to Canvas nodes with proper spacing and color categorization.

2. **Smart Arrow & Hierarchy Detection**  
   Automatically detects connecting arrows, labels them, and attaches them to the best attachment sides (`top`, `bottom`, `left`, `right`).

3. **OpenAI & Google AI Studio Compatible API**  
   Seamlessly connects to Google AI Studio (Gemini), OpenAI API, or local MLLM gateways.

4. **Multi-Channel Desktop Triggers**  
   - **Clipboard Command**: Copy any image or screenshot to clipboard → `Convert Clipboard Image to Canvas`.
   - **Vault File Menu**: Right-click any image (`.png`, `.jpg`, `.jpeg`, `.webp`) in Obsidian file explorer → `Convert to Obsidian Canvas Whiteboard`.

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Input Triggers                                │
│           ┌─────────────────────┐       ┌───────────────┐               │
│           │ Clipboard Screenshot│       │ Vault Image   │               │
│           └──────────┬──────────┘       └───────┬───────┘               │
└──────────────────────┼──────────────────────────┼───────────────────────┘
                       │                          │
                       ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Vision2Canvas Plugin Core                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ VisionClient (Google AI Studio / OpenAI Compatible Vision API)   │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
│                                     │ (Spatial OCR + JSON Schema Output)│
│  ┌──────────────────────────────────▼────────────────────────────────┐  │
│  │ CanvasBuilder & CanvasValidator                                   │  │
│  │ - Coordinate Normalization (scaleX, scaleY)                       │  │
│  │ - Edge Connection Sides calculation (top, bottom, left, right)     │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────────────┼───────────────────────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │ Obsidian Vault (.canvas File) │
                      └───────────────────────────────┘
```

---

## 🚀 Quick Start & Installation

### 1. Build & Install Plugin

```bash
# Clone repository into your vault's plugin directory
cd /path/to/your/vault/.obsidian/plugins/
git clone https://github.com/yourname/vision2obsidian.git
cd vision2obsidian

# Install dependencies and compile bundle
npm install
npm run build
```

Then in Obsidian: `Settings` → `Community Plugins` → Enable **Vision2Canvas**.

### 2. Configure Settings

In Obsidian `Settings` → `Vision2Canvas`:
- **AI API Endpoint**: `https://generativelanguage.googleapis.com/v1beta/openai` (or `https://api.openai.com/v1`)
- **API Key**: `YOUR_API_KEY`
- **Vision Model Name**: `gemini-flash-latest` (or `gpt-4o`)

---

## 🧪 Testing & Verification

Run the included standalone test script to test converting `ref/sample.jpeg` into `output_sample.canvas`:

```bash
npm run test:sample
```

Output:
```
--- TEST RESULTS ---
Generated 15 nodes and 4 edges.
Saved output canvas to: /Users/user/projects/vision2obsidian/output_sample.canvas
```

---

## 📜 License

MIT License © 2026 Antigravity
