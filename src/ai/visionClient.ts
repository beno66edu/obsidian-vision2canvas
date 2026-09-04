import { requestUrl, RequestUrlResponse } from 'obsidian';
import { VisionAnalysisResult, Vision2CanvasSettings } from '../types';
import { DEFAULT_VISION_SYSTEM_PROMPT } from './promptTemplates';

export class VisionClient {
  private settings: Vision2CanvasSettings;

  constructor(settings: Vision2CanvasSettings) {
    this.settings = settings;
  }

  /**
   * Analyze image via Vision MLLM API endpoint (with automatic retry for 503/429 transient errors)
   */
  public async analyzeImage(base64ImageData: string, mimeType: string = 'image/jpeg'): Promise<VisionAnalysisResult> {
    const endpoint = this.settings.apiEndpoint.replace(/\/+$/, '') + '/chat/completions';
    const systemPrompt = this.settings.customPrompt || DEFAULT_VISION_SYSTEM_PROMPT;

    const dataUrl = base64ImageData.startsWith('data:') 
      ? base64ImageData 
      : `data:${mimeType};base64,${base64ImageData}`;

    const requestBody = {
      model: this.settings.modelName || 'gemini-flash-latest',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this handwritten note photo and output the JSON canvas structure.'
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.settings.apiKey) {
      headers['Authorization'] = `Bearer ${this.settings.apiKey}`;
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
          throwOnError: false
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

        const responseJson = response.json as { choices?: Array<{ message?: { content?: string } }> };
        const rawContent = responseJson?.choices?.[0]?.message?.content;

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

  /**
   * Safe JSON parser that strips markdown ticks if present
   */
  public parseJsonResponse(rawText: string): VisionAnalysisResult {
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanJson) as { nodes?: unknown[] };
    if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
      throw new Error('Parsed JSON is missing "nodes" array.');
    }
    return parsed as unknown as VisionAnalysisResult;
  }
}
