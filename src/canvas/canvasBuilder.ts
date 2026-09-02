import {
  CanvasData,
  CanvasNode,
  CanvasEdge,
  VisionAnalysisResult,
  AIVisionNode,
  AIVisionEdge,
  NodeSide,
  Vision2CanvasSettings
} from '../types';

export class CanvasBuilder {
  private settings: Vision2CanvasSettings;

  constructor(settings: Vision2CanvasSettings) {
    this.settings = settings;
  }

  /**
   * Main entry: Convert Vision AI analysis output into Obsidian Canvas v1 JSON structure
   */
  public buildCanvasData(aiResult: VisionAnalysisResult): CanvasData {
    const nodes: CanvasNode[] = [];
    const edges: CanvasEdge[] = [];
    const nodeIdMap = new Map<string, CanvasNode>();

    const defaultWidth = this.settings.cardWidth || 320;
    const defaultHeight = this.settings.cardHeight || 180;
    const scaleX = this.settings.canvasScaleX || 2.5;
    const scaleY = this.settings.canvasScaleY || 2.0;

    // 1. Process Nodes
    aiResult.nodes.forEach((aiNode, index) => {
      const id = aiNode.id || `node_${index + 1}`;
      let x = 0;
      let y = 0;
      let width = defaultWidth;
      let height = defaultHeight;

      if (aiNode.relativeBox) {
        // Map 0..1000 bounding box to canvas pixels
        x = Math.round(aiNode.relativeBox.x * scaleX);
        y = Math.round(aiNode.relativeBox.y * scaleY);
        if (aiNode.relativeBox.width > 0) {
          width = Math.max(200, Math.round(aiNode.relativeBox.width * scaleX));
        }
        if (aiNode.relativeBox.height > 0) {
          height = Math.max(120, Math.round(aiNode.relativeBox.height * scaleY));
        }
      } else if (aiNode.gridPos) {
        // Column grid fallback
        const colMargin = 380;
        const rowMargin = 220;
        x = (aiNode.gridPos.col - 1) * colMargin;
        y = (aiNode.gridPos.row - 1) * rowMargin;
      } else if (aiNode.sectionIndex !== undefined) {
        // Section index fallback (1-based columns)
        const col = Math.max(1, aiNode.sectionIndex);
        x = (col - 1) * 380;
        // calculate vertical offset among nodes in same section
        const existingInCol = nodes.filter(n => Math.abs(n.x - x) < 50);
        y = existingInCol.reduce((acc, n) => acc + n.height + 40, 0);
      } else {
        // Grid fallback based on index
        x = (index % 4) * 380;
        y = Math.floor(index / 4) * 240;
      }

      // Format markdown node content
      let textContent = '';
      if (aiNode.title && !aiNode.content.startsWith('#')) {
        textContent = `### ${aiNode.title}\n\n${aiNode.content}`;
      } else {
        textContent = aiNode.content;
      }

      // Determine color (Obsidian Canvas supports '1'..'6')
      const color = this.mapColor(aiNode.color || String((index % 6) + 1));

      const node: CanvasNode = {
        id,
        x,
        y,
        width,
        height,
        type: 'text',
        text: textContent,
        color
      };

      nodes.push(node);
      nodeIdMap.set(id, node);
    });

    // 2. Process Groups (if any)
    if (aiResult.groups && aiResult.groups.length > 0) {
      aiResult.groups.forEach((group, gIdx) => {
        const groupNodes = group.nodeIds
          .map(id => nodeIdMap.get(id))
          .filter((n): n is CanvasNode => n !== undefined);

        if (groupNodes.length > 0) {
          const padding = 30;
          const minX = Math.min(...groupNodes.map(n => n.x)) - padding;
          const minY = Math.min(...groupNodes.map(n => n.y)) - padding - 20;
          const maxX = Math.max(...groupNodes.map(n => n.x + n.width)) + padding;
          const maxY = Math.max(...groupNodes.map(n => n.y + n.height)) + padding;

          const groupNode: CanvasNode = {
            id: group.id || `group_${gIdx + 1}`,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            type: 'group',
            label: group.title,
            color: this.mapColor(group.color || '5')
          };

          nodes.unshift(groupNode); // Put group nodes in background
        }
      });
    }

    // 3. Process Edges
    if (aiResult.edges && aiResult.edges.length > 0) {
      aiResult.edges.forEach((aiEdge, edgeIdx) => {
        const fromNode = nodeIdMap.get(aiEdge.fromNodeId);
        const toNode = nodeIdMap.get(aiEdge.toNodeId);

        if (fromNode && toNode && aiEdge.fromNodeId !== aiEdge.toNodeId) {
          const { fromSide, toSide } = this.calculateBestConnectionSides(fromNode, toNode);
          
          const edge: CanvasEdge = {
            id: `edge_${edgeIdx + 1}`,
            fromNode: fromNode.id,
            fromSide,
            toNode: toNode.id,
            toSide,
            toEnd: aiEdge.arrowDirection === 'none' ? 'none' : 'arrow',
            label: aiEdge.label || undefined
          };

          if (aiEdge.arrowDirection === 'both') {
            edge.fromEnd = 'arrow';
          }

          edges.push(edge);
        }
      });
    }

    return { nodes, edges };
  }

  /**
   * Smart calculation for edge attachment sides based on relative position
   */
  private calculateBestConnectionSides(
    from: CanvasNode,
    to: CanvasNode
  ): { fromSide: NodeSide; toSide: NodeSide } {
    const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
    const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 };

    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal separation dominant
      if (dx > 0) {
        return { fromSide: 'right', toSide: 'left' };
      } else {
        return { fromSide: 'left', toSide: 'right' };
      }
    } else {
      // Vertical separation dominant
      if (dy > 0) {
        return { fromSide: 'bottom', toSide: 'top' };
      } else {
        return { fromSide: 'top', toSide: 'bottom' };
      }
    }
  }

  private mapColor(colorStr?: string): string | undefined {
    if (!colorStr) return undefined;
    if (['1', '2', '3', '4', '5', '6'].includes(colorStr)) {
      return colorStr;
    }
    // Simple color name mapping
    const lower = colorStr.toLowerCase();
    if (lower.includes('red') || lower.includes('pink')) return '1';
    if (lower.includes('orange') || lower.includes('yellow')) return '2';
    if (lower.includes('green')) return '3';
    if (lower.includes('cyan') || lower.includes('blue')) return '4';
    if (lower.includes('purple')) return '5';
    return '6';
  }
}
