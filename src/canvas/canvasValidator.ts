import type { Translator } from '../i18n';

export class CanvasValidator {
  /**
   * Validates if the object adheres to Obsidian Canvas Spec v1
   */
  public static validate(data: unknown, t: Translator): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      return { valid: false, errors: [t('errors.canvas.invalidObject')] };
    }

    const obj = data as Record<string, unknown>;

    if (!Array.isArray(obj.nodes)) {
      errors.push(t('errors.canvas.missingArray', { field: 'nodes' }));
    }

    if (!Array.isArray(obj.edges)) {
      errors.push(t('errors.canvas.missingArray', { field: 'edges' }));
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    const nodeIds = new Set<string>();
    const nodes = obj.nodes as Array<Record<string, unknown>>;
    const edges = obj.edges as Array<Record<string, unknown>>;

    nodes.forEach((node, i) => {
      const id = node.id;
      if (!id || typeof id !== 'string') {
        errors.push(t('errors.canvas.invalidNodeId', { index: i }));
      } else {
        if (nodeIds.has(id)) {
          errors.push(t('errors.canvas.duplicateNodeId', { id, index: i }));
        }
        nodeIds.add(id);
      }

      if (typeof node.x !== 'number' || typeof node.y !== 'number') {
        errors.push(t('errors.canvas.invalidCoordinates', { id: String(id) }));
      }

      if (typeof node.width !== 'number' || typeof node.height !== 'number') {
        errors.push(t('errors.canvas.invalidDimensions', { id: String(id) }));
      }

      if (typeof node.type !== 'string' || !['text', 'file', 'link', 'group'].includes(node.type)) {
        errors.push(t('errors.canvas.invalidType', { id: String(id), type: String(node.type) }));
      }
    });

    edges.forEach((edge, i) => {
      const id = edge.id;
      const fromNode = edge.fromNode;
      const toNode = edge.toNode;

      if (!id || typeof id !== 'string') {
        errors.push(t('errors.canvas.invalidEdgeId', { index: i }));
      }

      if (typeof fromNode !== 'string' || !nodeIdMapHas(nodeIds, fromNode)) {
        errors.push(t('errors.canvas.missingEndpoint', { id: String(id), field: 'fromNode', node: String(fromNode) }));
      }

      if (typeof toNode !== 'string' || !nodeIdMapHas(nodeIds, toNode)) {
        errors.push(t('errors.canvas.missingEndpoint', { id: String(id), field: 'toNode', node: String(toNode) }));
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

function nodeIdMapHas(set: Set<string>, key: string): boolean {
  return set.has(key);
}
