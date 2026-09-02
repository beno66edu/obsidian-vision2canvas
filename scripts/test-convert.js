/**
 * Standalone test script for Vision2Canvas
 * Tests converting spatial OCR analysis of ref/sample.jpeg into a valid Obsidian .canvas file.
 */

const fs = require('fs');
const path = require('path');

// 1. Sample Vision Analysis Result extracted from ref/sample.jpeg & ref/content.md
const sampleAiResult = {
  title: "手寫收納與分類白板",
  nodes: [
    {
      id: "sec1_top",
      title: "第一區塊：分類總覽",
      content: "**再細分**\n- (NEXT) 位於右上角\n- FOR ART\n  - 左側：文件 / 紀錄\n  - 右側：物品 / 相簿 / 展櫃",
      sectionIndex: 1,
      relativeBox: { x: 30, y: 40, width: 220, height: 160 },
      color: "1"
    },
    {
      id: "sec1_middle",
      title: "☆ 夾袋規範",
      content: "- 證件, pass...\n↳ **profile pic.**",
      sectionIndex: 1,
      relativeBox: { x: 30, y: 220, width: 220, height: 120 },
      color: "2"
    },
    {
      id: "sec1_bottom",
      title: "收藏管理",
      content: "收藏？ -\n↳ **可再製** (包含指向標記)",
      sectionIndex: 1,
      relativeBox: { x: 30, y: 360, width: 220, height: 100 },
      color: "3"
    },
    {
      id: "sec2_top",
      title: "第二區塊：證件與信件",
      content: "- [符號] 證件\n- Ⓑ 票券 (紀念性的) → FOR ART\n- Ⓒ 銀行, 政府 (信)\n- Ⓓ sign-name paper → FOR ART (can track)\n- Ⓔ 轉帳\n- Ⓕ coupon...",
      sectionIndex: 2,
      relativeBox: { x: 280, y: 40, width: 220, height: 200 },
      color: "4"
    },
    {
      id: "sec2_bottom",
      title: "FOR ART 自動紀錄",
      content: "auto log:\n- Ⓑ 回憶性的 (ex: 發票)\n- Ⓒ 交易明細 ATM\n- Ⓓ 收據 from hospital\n- Ⓔ 廣告單\n- [方框標記] ① 票 ② 例外",
      sectionIndex: 2,
      relativeBox: { x: 280, y: 260, width: 220, height: 200 },
      color: "5"
    },
    {
      id: "sec3_top",
      title: "第三區塊：物品與訂閱",
      content: "**blueberry case** (11 cm x 11 cm)\n↳ 放置？ easy to check\n\n☆ **物品**：\n  - 生活 ↗ 日常\n  - ↘ 工具 tool\n  - ART\n  - 消耗本 Read.",
      sectionIndex: 3,
      relativeBox: { x: 530, y: 40, width: 220, height: 220 },
      color: "3"
    },
    {
      id: "sec3_middle",
      title: "固定支出訂閱",
      content: "- Netflix & 電話費\n- 680 / 380 Net\n- 300 - cloud",
      sectionIndex: 3,
      relativeBox: { x: 530, y: 280, width: 220, height: 130 },
      color: "1"
    },
    {
      id: "sec3_bottom",
      title: "數字圖鴉記錄",
      content: "7858\n  ↓\n7988",
      sectionIndex: 3,
      relativeBox: { x: 530, y: 430, width: 220, height: 110 },
      color: "6"
    },
    {
      id: "sec4_top",
      title: "第四區塊：MUJI 收納盒與備件",
      content: "↓ **MUJI - file box**\n- 3C - 配件 (controller)\n- 行動電源\n- 備用線材",
      sectionIndex: 4,
      relativeBox: { x: 780, y: 40, width: 200, height: 160 },
      color: "4"
    },
    {
      id: "sec4_middle",
      title: "MUJI 檔案盒 15cm",
      content: "↓ **MUJI - file box (15cm)**\n放置 (無印八格中區):\n→ black-hard-box\n→ triangle - soft bag\n→ PEN & NAME log",
      sectionIndex: 4,
      relativeBox: { x: 780, y: 220, width: 200, height: 180 },
      color: "4"
    },
    {
      id: "sec4_bottom",
      title: "☆ personal memo",
      content: "personal memo\n?? ↗ A MUJI → F-15\n   ↘ B MUJI → F-10",
      sectionIndex: 4,
      relativeBox: { x: 780, y: 420, width: 200, height: 140 },
      color: "2"
    }
  ],
  edges: [
    { fromNodeId: "sec2_top", toNodeId: "sec2_bottom", label: "FOR ART 導流", arrowDirection: "forward" },
    { fromNodeId: "sec1_middle", toNodeId: "sec1_bottom", label: "profile pic 引導", arrowDirection: "forward" },
    { fromNodeId: "sec3_middle", toNodeId: "sec3_bottom", arrowDirection: "forward" },
    { fromNodeId: "sec3_bottom", toNodeId: "sec4_bottom", label: "指向 personal memo", arrowDirection: "forward" }
  ],
  groups: [
    { id: "grp_sec1", title: "第一欄位：分類起點", nodeIds: ["sec1_top", "sec1_middle", "sec1_bottom"], color: "1" },
    { id: "grp_sec2", title: "第二欄位：證件與發票紀錄", nodeIds: ["sec2_top", "sec2_bottom"], color: "4" },
    { id: "grp_sec3", title: "第三欄位：物品與費用規畫", nodeIds: ["sec3_top", "sec3_middle", "sec3_bottom"], color: "3" },
    { id: "grp_sec4", title: "第四欄位：MUJI 收納體系", nodeIds: ["sec4_top", "sec4_middle", "sec4_bottom"], color: "2" }
  ]
};

// 2. Simple Node-compatible Canvas builder for testing
function buildCanvasData(aiResult) {
  const scaleX = 2.5;
  const scaleY = 2.0;

  const nodes = [];
  const edges = [];
  const nodeIdMap = new Map();

  aiResult.nodes.forEach((aiNode, index) => {
    const id = aiNode.id || `node_${index + 1}`;
    const x = Math.round(aiNode.relativeBox.x * scaleX);
    const y = Math.round(aiNode.relativeBox.y * scaleY);
    const width = Math.round(aiNode.relativeBox.width * scaleX);
    const height = Math.round(aiNode.relativeBox.height * scaleY);

    const node = {
      id,
      x,
      y,
      width,
      height,
      type: 'text',
      text: aiNode.title ? `### ${aiNode.title}\n\n${aiNode.content}` : aiNode.content,
      color: aiNode.color || '1'
    };

    nodes.push(node);
    nodeIdMap.set(id, node);
  });

  if (aiResult.groups) {
    aiResult.groups.forEach((grp, gIdx) => {
      const gNodes = grp.nodeIds.map(id => nodeIdMap.get(id)).filter(Boolean);
      if (gNodes.length > 0) {
        const padding = 30;
        const minX = Math.min(...gNodes.map(n => n.x)) - padding;
        const minY = Math.min(...gNodes.map(n => n.y)) - padding - 30;
        const maxX = Math.max(...gNodes.map(n => n.x + n.width)) + padding;
        const maxY = Math.max(...gNodes.map(n => n.y + n.height)) + padding;

        nodes.unshift({
          id: grp.id,
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          type: 'group',
          label: grp.title,
          color: grp.color
        });
      }
    });
  }

  aiResult.edges.forEach((e, idx) => {
    edges.push({
      id: `edge_${idx + 1}`,
      fromNode: e.fromNodeId,
      toNode: e.toNodeId,
      label: e.label,
      toEnd: 'arrow'
    });
  });

  return { nodes, edges };
}

// Execute test build
const canvasData = buildCanvasData(sampleAiResult);

// Validate
console.log('--- TEST RESULTS ---');
console.log(`Generated ${canvasData.nodes.length} nodes and ${canvasData.edges.length} edges.`);

const outputPath = path.join(__dirname, '../output_sample.canvas');
fs.writeFileSync(outputPath, JSON.stringify(canvasData, null, 2), 'utf-8');
console.log(`Saved output canvas to: ${outputPath}`);
