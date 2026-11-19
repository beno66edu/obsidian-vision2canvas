import { requestUrl, RequestUrlResponse } from 'obsidian';
import { VisionAnalysisResult, Vision2CanvasSettings } from '../types';
import { Connection, defaultConnection, ProviderId, PROVIDERS } from './providers';
import { DEFAULT_VISION_SYSTEM_PROMPT } from './promptTemplates';

export class VisionClient {
  private readonly provider: ProviderId;
  private readonly connection: Connection;
  private readonly systemPrompt: string;

  constructor(settings: Vision2CanvasSettings) {
    this.provider = settings.aiProvider;
    this.connection = { ...(settings.connections[this.provider] ?? defaultConnection(this.provider)) };
    this.systemPrompt = settings.customPrompt || DEFAULT_VISION_SYSTEM_PROMPT;
  }

  /**
   * Analyze image via Vision MLLM API endpoint (with automatic retry for 503/429 transient errors)
   */
  public async analyzeImage(base64ImageData: string, mimeType: string = 'image/jpeg'): Promise<VisionAnalysisResult> {
    const preset = PROVIDERS[this.provider];
    const baseEndpoint = (this.connection.apiEndpoint || preset.endpoint).replace(/\/+$/, '');
    const model = this.connection.modelName || preset.model;
    if (!baseEndpoint) throw new Error('Set the AI API endpoint in Vision2Canvas settings.');
    if (!model) throw new Error(`Set a vision model for ${preset.name} in Vision2Canvas settings.`);
    if (!this.connection.apiKey && this.provider !== 'local' && this.provider !== 'remote') {
      throw new Error(`Set your ${preset.name} API key in Vision2Canvas settings.`);
    }
    if (this.provider === 'local') {
      await this.loadLocalModel(baseEndpoint);
    }

    const endpoint = baseEndpoint + '/chat/completions';
    const dataUrl = base64ImageData.startsWith('data:')
      ? base64ImageData
      : `data:${mimeType};base64,${base64ImageData}`;
    const requestBody = this.buildRequestBody(model, dataUrl);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.connection.apiKey) {
      headers['Authorization'] = `Bearer ${this.connection.apiKey}`;
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response: RequestUrlResponse = await requestUrl({
          url: endpoint,
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          throw: false
        });

        if (response.status === 503 || response.status === 429) {
          if (attempt < maxRetries) {
            await new Promise((resolve) => window.setTimeout(resolve, 1500 * attempt));
            continue;
          }
          throw new Error(`AI API service temporarily unavailable (${response.status}). Please retry in a few seconds.`);
        }

        if (response.status >= 400) {
          throw new Error(`AI API request failed (${response.status}): ${response.text}`);
        }

        const responseJson = response.json as {
          choices?: Array<{
            message?: {
              content?: string | Array<{ text?: string }>;
            };
          }>;
        };
        const rawContent = this.getResponseContent(responseJson);

        if (!rawContent) {
          throw new Error('AI API returned empty response content.');
        }

        return this.parseJsonResponse(rawContent);
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        lastError = errorObj;
        if (attempt < maxRetries && (errorObj.message.includes('503') || errorObj.message.includes('429'))) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500 * attempt));
          continue;
        }
        break;
      }
    }

    throw lastError || new Error('Failed to analyze image with Vision AI.');
  }

  private buildRequestBody(model: string, dataUrl: string): Record<string, unknown> {
    return {
      model,
      messages: [
        { role: 'system', content: this.systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Please analyze this handwritten note photo and output the JSON canvas structure.' },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ],
      ...(this.provider === 'local' && { temperature: 0.2, stream: false }),
      ...(this.provider === 'anthropic' && { max_tokens: 8192 })
    };
  }

  /**
   * Loads the selected model through LM Studio's REST API before inference.
   */
  private async loadLocalModel(baseEndpoint: string): Promise<void> {
    const apiRoot = baseEndpoint.endsWith('/v1')
      ? baseEndpoint.slice(0, -3)
      : baseEndpoint;
    const loadEndpoint = `${apiRoot}/api/v1/models/load`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.connection.apiKey) {
      headers['Authorization'] = `Bearer ${this.connection.apiKey}`;
    }

    const response = await requestUrl({
      url: loadEndpoint,
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.connection.modelName,
        echo_load_config: false
      }),
      throw: false
    });

    if (response.status >= 400) {
      throw new Error(
        `LM Studio could not load model "${this.connection.modelName}" (${response.status}): ${response.text}`
      );
    }
  }

  /**
   * Extracts text from the OpenAI-compatible response returned by local models.
   */
  private getResponseContent(response: {
    choices?: Array<{
      message?: {
        content?: string | Array<{ text?: string }>;
      };
    }>;
  }): string {
    const content = response.choices?.[0]?.message?.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => part.text || '')
        .join('')
        .trim();
    }

    return '';
  }

  /**
   * Parses JSON even when a local model adds markdown or a short explanation.
   */
  public parseJsonResponse(rawText: string): VisionAnalysisResult {
    const cleanJson = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    const jsonStart = cleanJson.indexOf('{');
    const jsonEnd = cleanJson.lastIndexOf('}');

    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      throw new Error('AI API response did not contain a JSON object.');
    }

    const parsed = JSON.parse(cleanJson.slice(jsonStart, jsonEnd + 1)) as { nodes?: unknown[] };
    if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
      throw new Error('Parsed JSON is missing "nodes" array.');
    }
    return parsed as unknown as VisionAnalysisResult;
  }
}
