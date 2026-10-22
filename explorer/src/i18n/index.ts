import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, normalizeLocale, SUPPORTED_LOCALES } from './languages';

import enCommon from './locales/en/common.json';
import enDecision from './locales/en/decision.json';
import enDiffmerge from './locales/en/diffmerge.json';
import enEnrich from './locales/en/enrich.json';
import enErrors from './locales/en/errors.json';
import enGraph from './locales/en/graph.json';
import enImportexport from './locales/en/importexport.json';
import enLanding from './locales/en/landing.json';
import enLineage from './locales/en/lineage.json';
import enManage from './locales/en/manage.json';
import enMemory from './locales/en/memory.json';
import enOntology from './locales/en/ontology.json';
import enReasoning from './locales/en/reasoning.json';
import enShell from './locales/en/shell.json';
import enSparql from './locales/en/sparql.json';
import enVocabulary from './locales/en/vocabulary.json';

import zhCommon from './locales/zh-CN/common.json';
import zhDecision from './locales/zh-CN/decision.json';
import zhDiffmerge from './locales/zh-CN/diffmerge.json';
import zhEnrich from './locales/zh-CN/enrich.json';
import zhErrors from './locales/zh-CN/errors.json';
import zhGraph from './locales/zh-CN/graph.json';
import zhImportexport from './locales/zh-CN/importexport.json';
import zhLanding from './locales/zh-CN/landing.json';
import zhLineage from './locales/zh-CN/lineage.json';
import zhManage from './locales/zh-CN/manage.json';
import zhMemory from './locales/zh-CN/memory.json';
import zhOntology from './locales/zh-CN/ontology.json';
import zhReasoning from './locales/zh-CN/reasoning.json';
import zhShell from './locales/zh-CN/shell.json';
import zhSparql from './locales/zh-CN/sparql.json';
import zhVocabulary from './locales/zh-CN/vocabulary.json';

type NamespaceTree = Record<string, Record<string, unknown>>;

const PSEUDO_LOCALE = 'en-XA';

/**
 * Accented Latin + padding, preserving interpolation and JSX tags.
 *
 * Fullwidth glyphs would over-state column pressure for Latin locales and
 * break words mid-character in the 72px rail; accented text with ~30%
 * padding is the standard pseudo-localization shape for truncation checks.
 */
const PSEUDO_ACCENTS: Record<string, string> = {
  a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', n: 'ñ', c: 'ç', y: 'ý',
  A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú', N: 'Ñ', C: 'Ç', Y: 'Ý',
};

function pseudoText(value: string): string {
  return value
    .split(/(\{\{[^}]+\}\}|<[^>]+>)/g)
    .map((part) => {
      if (!part || part.startsWith('{{') || part.startsWith('<')) return part;
      const accented = part.replace(/[A-Za-z]/g, (ch) => PSEUDO_ACCENTS[ch] ?? ch);
      return `${accented}···`;
    })
    .join('');
}

function pseudoTree(value: unknown): unknown {
  if (typeof value === 'string') return pseudoText(value);
  if (Array.isArray(value)) return value.map(pseudoTree);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, pseudoTree(child)]),
    );
  }
  return value;
}

function shouldUsePseudoLocale(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('pseudo') === 'xa';
  } catch {
    return false;
  }
}

const usePseudoLocale = Boolean(import.meta.env?.DEV) && shouldUsePseudoLocale();

const resources: Record<string, NamespaceTree> = {
  en: {
    common: enCommon,
    decision: enDecision,
    diffmerge: enDiffmerge,
    enrich: enEnrich,
    errors: enErrors,
    graph: enGraph,
    importexport: enImportexport,
    landing: enLanding,
    lineage: enLineage,
    manage: enManage,
    memory: enMemory,
    ontology: enOntology,
    reasoning: enReasoning,
    shell: enShell,
    sparql: enSparql,
    vocabulary: enVocabulary,
  },
  'zh-CN': {
    common: zhCommon,
    decision: zhDecision,
    diffmerge: zhDiffmerge,
    enrich: zhEnrich,
    errors: zhErrors,
    graph: zhGraph,
    importexport: zhImportexport,
    landing: zhLanding,
    lineage: zhLineage,
    manage: zhManage,
    memory: zhMemory,
    ontology: zhOntology,
    reasoning: zhReasoning,
    shell: zhShell,
    sparql: zhSparql,
    vocabulary: zhVocabulary,
  },
};

if (usePseudoLocale) {
  resources[PSEUDO_LOCALE] = pseudoTree(resources[DEFAULT_LOCALE]) as NamespaceTree;
}

const namespaces = Object.keys(resources[DEFAULT_LOCALE]);
const supportedLngs: string[] = SUPPORTED_LOCALES.map((locale) => locale.code);
if (usePseudoLocale) supportedLngs.push(PSEUDO_LOCALE);

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: namespaces,
    defaultNS: 'common',
    lng: usePseudoLocale ? PSEUDO_LOCALE : undefined,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs,
    returnNull: false,
    interpolation: {
      // i18next v26 ships Intl-backed formatters ({{value, number}},
      // {{value, datetime}}, {{value, relativetime}}), so no custom
      // format callback is needed.
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'semantica.locale',
      convertDetectedLanguage: (detected: string) => normalizeLocale(detected),
    },
  })
  .catch((error: unknown) => {
    // Bundled resources make initialization synchronous in practice; surface
    // a failure instead of leaving the UI stuck on raw keys.
    console.error('Failed to initialize i18n', error);
  });

export default i18n;
