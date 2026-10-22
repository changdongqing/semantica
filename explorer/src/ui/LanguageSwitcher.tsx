import { useTranslation } from 'react-i18next';
import { normalizeLocale, SUPPORTED_LOCALES } from '../i18n/languages';
import './LanguageSwitcher.css';

/**
 * Compact locale switcher for the app rail.
 *
 * The rail is only 88px wide, so each locale is a short label ("EN" / "中")
 * with the full native name exposed through aria-label and title.
 */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = normalizeLocale(i18n.resolvedLanguage ?? i18n.language);
  const groupLabel = t('language.label');

  return (
    <div className="language-switcher" role="group" aria-label={groupLabel}>
      {SUPPORTED_LOCALES.map((locale) => {
        const active = locale.code === current;
        return (
          <button
            key={locale.code}
            type="button"
            className="language-switcher-option"
            data-active={active}
            aria-pressed={active}
            aria-label={locale.nativeLabel}
            title={`${groupLabel}: ${locale.nativeLabel}`}
            onClick={() => {
              void i18n.changeLanguage(locale.code);
            }}
          >
            {locale.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
