import { Connection, defaultConnection, ProviderId, PROVIDERS } from './ai/providers';

// Obsidian Canvas v1 Specification Types
export type CanvasNodeType = 'text' | 'file' | 'link' | 'group';

export type CanvasNodeColor = '1' | '2' | '3' | '4' | '5' | '6';

export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: CanvasNodeType;
  text?: string;
  file?: string;
  url?: string;
  label?: string; // Group label
  color?: CanvasNodeColor;
  background?: string;
  styleAttributes?: Record<string, unknown>;
}

export type NodeSide = 'top' | 'right' | 'bottom' | 'left';

export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide?: NodeSide;
  fromEnd?: 'none' | 'arrow';
  toNode: string;
  toSide?: NodeSide;
  toEnd?: 'none' | 'arrow';
  label?: string;
  color?: CanvasNodeColor;
}

export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

// Vision AI Output Schema Interface
export interface AIVisionNode {
  id?: string;
  title?: string;
  content: string;
  type?: 'text' | 'group';
  sectionIndex?: number; // e.g. 1..4 columns
  gridPos?: {
    col: number; // 1-based column index
    row: number; // 1-based row index
  };
  relativeBox?: {
    x: number;      // 0..1000
    y: number;      // 0..1000
    width: number;  // 0..1000
    height: number; // 0..1000
  };
  category?: string;
  color?: CanvasNodeColor;
}

export interface AIVisionEdge {
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  arrowDirection?: 'forward' | 'both' | 'none';
}

export interface AIVisionGroup {
  id: string;
  title: string;
  nodeIds: string[];
  color?: CanvasNodeColor;
}

export interface VisionAnalysisResult {
  title?: string;
  nodes: AIVisionNode[];
  edges?: AIVisionEdge[];
  groups?: AIVisionGroup[];
}

// Plugin Settings Interface
export interface Vision2CanvasSettings {
  aiProvider: ProviderId;
  connections: Partial<Record<ProviderId, Connection>>;
  customPrompt: string;
  outputFolder: string;
  canvasScaleX: number;
  canvasScaleY: number;
  cardWidth: number;
  cardHeight: number;
  autoOpenCanvas: boolean;
}

export const DEFAULT_SETTINGS: Vision2CanvasSettings = {
  aiProvider: 'gemini',
  connections: {},
  customPrompt: '',
  outputFolder: '',
  canvasScaleX: 2.5,
  canvasScaleY: 2.0,
  cardWidth: 320,
  cardHeight: 180,
  autoOpenCanvas: true,
};

// Older installs saved a single connection alongside the general settings.
export function readSettings(saved: Partial<Vision2CanvasSettings & Connection> | null): Vision2CanvasSettings {
  const { apiEndpoint, apiKey, modelName, ...general } = saved ?? {};
  const settings = { ...DEFAULT_SETTINGS, ...general, connections: { ...general.connections } };
  if (!saved || general.connections) {
    return settings;
  }

  const endpoint = apiEndpoint?.trim().replace(/\/+$/, '');
  let provider: ProviderId = 'remote';
  if (general.aiProvider === 'local') {
    provider = 'local';
  } else {
    const legacyEndpoint = endpoint ?? PROVIDERS.gemini.endpoint;
    for (const id of ['gemini', 'openai', 'anthropic', 'openrouter'] as const) {
      if (PROVIDERS[id].endpoint === legacyEndpoint) provider = id;
    }
  }
  const connection = defaultConnection(provider);
  // The old local client used localhost even when settings still held the Gemini default.
  if (endpoint && !(provider === 'local' && endpoint === PROVIDERS.gemini.endpoint)) {
    connection.apiEndpoint = endpoint;
  }
  connection.apiKey = apiKey ?? '';
  connection.modelName = modelName || connection.modelName || PROVIDERS.gemini.model;
  settings.aiProvider = provider;
  settings.connections[provider] = connection;
  return settings;
}
