export type SupportedLocale = 'en' | 'zh-CN';

export type LocaleOption = {
  code: SupportedLocale;
  shortLabel: string;
  nativeLabel: string;
};

export const SUPPORTED_LOCALES: readonly LocaleOption[] = [
  { code: 'en', shortLabel: 'EN', nativeLabel: 'English' },
  { code: 'zh-CN', shortLabel: '中', nativeLabel: '简体中文' },
] as const;

export const DEFAULT_LOCALE: SupportedLocale = 'en';

/**
 * Map a browser or stored language tag onto a supported locale.
 *
 * Simplified Chinese variants collapse to zh-CN; Traditional Chinese
 * (zh-TW / zh-Hant) is intentionally not mapped yet and falls back to the
 * default until a zh-TW catalog exists.
 */
export function normalizeLocale(input?: string | null): SupportedLocale {
  const value = (input ?? '').trim().toLowerCase();
  if (value === 'zh' || value === 'zh-cn' || value.startsWith('zh-hans')) {
    return 'zh-CN';
  }
  if (value.startsWith('en')) {
    return 'en';
  }
  return DEFAULT_LOCALE;
}
