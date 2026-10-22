#!/usr/bin/env node
/**
 * Compare the English and Simplified Chinese catalogs.
 *
 * Phase 1 runs in report mode: drift is printed but does not fail the build,
 * because Phase 2 lands English keys ahead of their translations. Pass
 * --strict (or run `npm run check:i18n:strict`) once the Chinese catalog is
 * complete to make drift a CI failure.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const BASE_LOCALE = 'en';
export const TARGET_LOCALE = 'zh-CN';

const LOCALES_DIR = fileURLToPath(new URL('../src/i18n/locales', import.meta.url));

export function flattenKeys(value, prefix = '', out = []) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    out.push(prefix);
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    flattenKeys(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function flattenEntries(value, prefix = '', out = new Map()) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    out.set(prefix, String(value));
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    flattenEntries(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function placeholders(value) {
  return [...String(value).matchAll(/\{\{\s*([\w]+)\s*\}\}/g)]
    .map((match) => match[1])
    .sort();
}

function samePlaceholders(base, target) {
  const a = placeholders(base);
  const b = placeholders(target);
  return a.length === b.length && a.every((name, index) => name === b[index]);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function listNamespaces(locale) {
  const dir = join(LOCALES_DIR, locale);
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => name.slice(0, -'.json'.length))
      .sort();
  } catch {
    return [];
  }
}

export function collectLocale(locale) {
  const catalog = new Map();
  for (const namespace of listNamespaces(locale)) {
    const file = join(LOCALES_DIR, locale, `${namespace}.json`);
    catalog.set(namespace, flattenEntries(readJson(file), namespace));
  }
  return catalog;
}

export function diffLocales(baseLocale = BASE_LOCALE, targetLocale = TARGET_LOCALE) {
  const base = collectLocale(baseLocale);
  const target = collectLocale(targetLocale);
  const missing = [];
  const extra = [];
  const placeholderMismatches = [];
  const namespaces = [...new Set([...base.keys(), ...target.keys()])].sort();

  for (const namespace of namespaces) {
    const baseKeys = base.get(namespace) ?? new Map();
    const targetKeys = target.get(namespace) ?? new Map();
    for (const [key, value] of baseKeys) {
      if (!targetKeys.has(key)) {
        missing.push(key);
      } else if (!samePlaceholders(value, targetKeys.get(key))) {
        placeholderMismatches.push({
          key,
          base: placeholders(value),
          target: placeholders(targetKeys.get(key)),
        });
      }
    }
    for (const key of targetKeys.keys()) {
      if (!baseKeys.has(key)) extra.push(key);
    }
  }

  return {
    baseLocale,
    targetLocale,
    namespaces,
    missing: missing.sort(),
    extra: extra.sort(),
    placeholderMismatches,
    baseKeyCount: [...base.values()].reduce((sum, keys) => sum + keys.size, 0),
    targetKeyCount: [...target.values()].reduce((sum, keys) => sum + keys.size, 0),
  };
}

export function formatReport(result, maxList = 25) {
  const lines = [
    'i18n catalog check',
    `  base:        ${result.baseLocale} (${result.baseKeyCount} keys)`,
    `  target:      ${result.targetLocale} (${result.targetKeyCount} keys)`,
    `  namespaces:  ${result.namespaces.length}`,
    `  missing in ${result.targetLocale}: ${result.missing.length}`,
    `  extra in ${result.targetLocale}:   ${result.extra.length}`,
    `  placeholder mismatches: ${result.placeholderMismatches.length}`,
  ];
  for (const key of result.missing.slice(0, maxList)) lines.push(`    missing  ${key}`);
  if (result.missing.length > maxList) {
    lines.push(`    … ${result.missing.length - maxList} more missing`);
  }
  for (const key of result.extra.slice(0, maxList)) lines.push(`    extra    ${key}`);
  if (result.extra.length > maxList) {
    lines.push(`    … ${result.extra.length - maxList} more extra`);
  }
  for (const mismatch of result.placeholderMismatches.slice(0, maxList)) {
    lines.push(
      `    placeholders ${mismatch.key}: [${mismatch.base.join(', ')}] -> [${mismatch.target.join(', ')}]`,
    );
  }
  if (result.placeholderMismatches.length > maxList) {
    lines.push(`    … ${result.placeholderMismatches.length - maxList} more placeholder mismatches`);
  }
  return lines.join('\n');
}

function main(argv) {
  const strict = argv.includes('--strict');
  const json = argv.includes('--json');
  const result = diffLocales();
  const clean = result.missing.length === 0
    && result.extra.length === 0
    && result.placeholderMismatches.length === 0;

  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatReport(result)}\n`);
    if (!clean) {
      process.stdout.write(
        strict
          ? '\nFAIL: catalogs drifted (strict mode).\n'
          : '\nWARN: catalogs drifted (report mode; pass --strict to fail).\n',
      );
    } else {
      process.stdout.write('\nOK: catalogs are in sync.\n');
    }
  }

  process.exit(strict && !clean ? 1 : 0);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) {
  main(process.argv.slice(2));
}

export { LOCALES_DIR };
