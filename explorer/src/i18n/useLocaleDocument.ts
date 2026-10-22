import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { normalizeLocale } from './languages';

/**
 * Keep <html lang> and document.title in sync with the active locale.
 *
 * `index.html` ships lang="en" as the pre-hydration default; this hook
 * updates both as soon as React mounts and on every language change.
 */
export function useLocaleDocument() {
  const { i18n, t } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = normalizeLocale(i18n.resolvedLanguage ?? i18n.language);
    document.title = t('app.documentTitle');
  }, [i18n, i18n.language, i18n.resolvedLanguage, t]);
}
