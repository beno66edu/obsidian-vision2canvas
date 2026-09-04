export class CanvasValidator {
  /**
   * Validates if the object adheres to Obsidian Canvas Spec v1
   */
  public static validate(data: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Canvas data must be a valid JSON object'] };
    }

    const obj = data as Record<string, unknown>;

    if (!Array.isArray(obj.nodes)) {
      errors.push('Canvas data missing "nodes" array');
    }

    if (!Array.isArray(obj.edges)) {
      errors.push('Canvas data missing "edges" array');
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
        errors.push(`Node at index ${i} missing valid string "id"`);
      } else {
        if (nodeIds.has(id)) {
          errors.push(`Duplicate node id "${id}" at index ${i}`);
        }
        nodeIds.add(id);
      }

      if (typeof node.x !== 'number' || typeof node.y !== 'number') {
        errors.push(`Node "${String(id)}" has invalid numeric coordinates (x, y)`);
      }

      if (typeof node.width !== 'number' || typeof node.height !== 'number') {
        errors.push(`Node "${String(id)}" has invalid numeric dimensions (width, height)`);
      }

      if (typeof node.type !== 'string' || !['text', 'file', 'link', 'group'].includes(node.type)) {
        errors.push(`Node "${String(id)}" has invalid type "${String(node.type)}"`);
      }
    });

    edges.forEach((edge, i) => {
      const id = edge.id;
      const fromNode = edge.fromNode;
      const toNode = edge.toNode;

      if (!id || typeof id !== 'string') {
        errors.push(`Edge at index ${i} missing valid string "id"`);
      }

      if (typeof fromNode !== 'string' || !nodeIdMapHas(nodeIds, fromNode)) {
        errors.push(`Edge "${String(id)}" references non-existent fromNode "${String(fromNode)}"`);
      }

      if (typeof toNode !== 'string' || !nodeIdMapHas(nodeIds, toNode)) {
        errors.push(`Edge "${String(id)}" references non-existent toNode "${String(toNode)}"`);
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
