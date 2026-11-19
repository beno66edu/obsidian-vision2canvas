import type { Translator } from '../i18n';

export const PROVIDERS = {
  gemini: { name: 'Google Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-flash-latest' },
  openai: { name: 'OpenAI', endpoint: 'https://api.openai.com/v1', model: 'gpt-4.1-mini' },
  anthropic: { name: 'Anthropic (Claude)', endpoint: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6' },
  openrouter: { name: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4.1-mini' },
  local: { labelKey: 'settings.providers.local', endpoint: 'http://127.0.0.1:1234/v1', model: '' },
  remote: { labelKey: 'settings.providers.custom', endpoint: '', model: '' }
} as const;

export type ProviderId = keyof typeof PROVIDERS;

export function providerName(preset: typeof PROVIDERS[ProviderId], t: Translator): string {
  return 'labelKey' in preset ? t(preset.labelKey) : preset.name;
}

export interface Connection {
  apiEndpoint: string;
  apiKey: string;
  modelName: string;
}

export function defaultConnection(provider: ProviderId): Connection {
  const { endpoint, model } = PROVIDERS[provider];
  return { apiEndpoint: endpoint, apiKey: '', modelName: model };
}
