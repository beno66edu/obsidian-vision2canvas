import { getLanguage } from 'obsidian';
import { en } from './locales/en';
import { ptBR } from './locales/pt-BR';
import { zhTW } from './locales/zh-TW';

const catalogs = { en, 'pt-BR': ptBR, 'zh-TW': zhTW };
export type Locale = keyof typeof catalogs;
export type LanguagePreference = Locale | 'auto';
export type Translator = (key: keyof typeof en, params?: Record<string, string | number>) => string;

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === 'auto' || (typeof value === 'string' && Object.hasOwn(catalogs, value));
}

export function resolveLanguage(preference: LanguagePreference): Locale {
  if (preference !== 'auto') return preference;
  let language: string | null;
  try {
    language = typeof getLanguage === 'function'
      ? getLanguage()
      : globalThis.localStorage.getItem('language');
  } catch {
    return 'en';
  }
  const tag = (language ?? '').trim().toLowerCase().replace(/_/g, '-');
  if (/^pt(?:-|$)/.test(tag)) return 'pt-BR';
  if (/^zh-(?:hant|tw|hk|mo)(?:-|$)/.test(tag)) return 'zh-TW';
  return 'en';
}

export function translate(locale: Locale, key: keyof typeof en, params?: Record<string, string | number>): string {
  const template = catalogs[locale][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (token, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : token
  );
}
