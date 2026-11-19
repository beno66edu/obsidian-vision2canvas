import { requestUrl, RequestUrlResponse } from 'obsidian';
import type { Translator } from '../i18n';
import { VisionAnalysisResult, Vision2CanvasSettings } from '../types';
import { Connection, defaultConnection, ProviderId, providerName, PROVIDERS } from './providers';
import { DEFAULT_VISION_SYSTEM_PROMPT } from './promptTemplates';

export class VisionClient {
  private readonly provider: ProviderId;
  private readonly connection: Connection;
  private readonly systemPrompt: string;

  constructor(settings: Vision2CanvasSettings, private readonly t: Translator) {
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
    if (!baseEndpoint) throw new Error(this.t('errors.ai.endpointRequired'));
    if (!model) {
      throw new Error(this.t('errors.ai.modelRequired', { provider: providerName(preset, this.t) }));
    }
    if (!this.connection.apiKey && this.provider !== 'local' && this.provider !== 'remote') {
      throw new Error(this.t('errors.ai.apiKeyRequired', { provider: providerName(preset, this.t) }));
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

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let response: RequestUrlResponse;
      try {
        response = await requestUrl({
          url: endpoint,
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          throw: false
        });
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries && (errorObj.message.includes('503') || errorObj.message.includes('429'))) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500 * attempt));
          continue;
        }
        throw errorObj;
      }

      if (response.status === 503 || response.status === 429) {
        if (attempt < maxRetries) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500 * attempt));
          continue;
        }
        throw new Error(this.t('errors.ai.temporarilyUnavailable', { status: response.status }));
      }

      if (response.status >= 400) {
        throw new Error(this.t('errors.ai.requestFailed', { status: response.status, detail: response.text }));
      }
      const rawContent = this.getResponseContent(response.json);
      if (!rawContent) throw new Error(this.t('errors.ai.emptyResponse'));
      return this.parseJsonResponse(rawContent);
    }

    throw new Error(this.t('errors.ai.analysisFailed'));
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
      throw new Error(this.t('errors.ai.modelLoadFailed', {
        model: this.connection.modelName, status: response.status, detail: response.text
      }));
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
      throw new Error(this.t('errors.ai.missingJson'));
    }

    let parsed: { nodes?: unknown[] };
    try {
      parsed = JSON.parse(cleanJson.slice(jsonStart, jsonEnd + 1));
    } catch {
      throw new Error(this.t('errors.ai.invalidJson'));
    }
    if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
      throw new Error(this.t('errors.ai.missingNodes'));
    }
    return parsed as unknown as VisionAnalysisResult;
  }
}
