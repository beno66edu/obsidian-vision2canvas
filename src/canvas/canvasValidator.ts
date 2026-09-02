import { CanvasData, CanvasNode, CanvasEdge } from '../types';

export class CanvasValidator {
  /**
   * Validates if the object adheres to Obsidian Canvas Spec v1
   */
  public static validate(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Canvas data must be a valid JSON object'] };
    }

    if (!Array.isArray(data.nodes)) {
      errors.push('Canvas data missing "nodes" array');
    }

    if (!Array.isArray(data.edges)) {
      errors.push('Canvas data missing "edges" array');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    const nodeIds = new Set<string>();

    data.nodes.forEach((node: any, i: number) => {
      if (!node.id || typeof node.id !== 'string') {
        errors.push(`Node at index ${i} missing valid string "id"`);
      } else {
        if (nodeIds.has(node.id)) {
          errors.push(`Duplicate node id "${node.id}" at index ${i}`);
        }
        nodeIds.add(node.id);
      }

      if (typeof node.x !== 'number' || typeof node.y !== 'number') {
        errors.push(`Node "${node.id}" has invalid numeric coordinates (x, y)`);
      }

      if (typeof node.width !== 'number' || typeof node.height !== 'number') {
        errors.push(`Node "${node.id}" has invalid numeric dimensions (width, height)`);
      }

      if (!['text', 'file', 'link', 'group'].includes(node.type)) {
        errors.push(`Node "${node.id}" has invalid type "${node.type}"`);
      }
    });

    data.edges.forEach((edge: any, i: number) => {
      if (!edge.id || typeof edge.id !== 'string') {
        errors.push(`Edge at index ${i} missing valid string "id"`);
      }

      if (!edge.fromNode || !nodeIds.has(edge.fromNode)) {
        errors.push(`Edge "${edge.id}" references non-existent fromNode "${edge.fromNode}"`);
      }

      if (!edge.toNode || !nodeIds.has(edge.toNode)) {
        errors.push(`Edge "${edge.id}" references non-existent toNode "${edge.toNode}"`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
