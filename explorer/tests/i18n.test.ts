import assert from "node:assert/strict";
import test from "node:test";

import { diffLocales } from "../scripts/check-i18n-keys.mjs";
import { normalizeLocale, SUPPORTED_LOCALES } from "../src/i18n/languages.ts";

test("normalizeLocale maps supported language tags onto a catalog", () => {
  assert.equal(normalizeLocale("zh"), "zh-CN");
  assert.equal(normalizeLocale("zh-CN"), "zh-CN");
  assert.equal(normalizeLocale("zh-Hans-CN"), "zh-CN");
  assert.equal(normalizeLocale("en"), "en");
  assert.equal(normalizeLocale("en-US"), "en");
  assert.equal(normalizeLocale(undefined), "en");
  assert.equal(normalizeLocale(""), "en");
});

test("normalizeLocale leaves Traditional Chinese on the default catalog", () => {
  assert.equal(normalizeLocale("zh-TW"), "en");
  assert.equal(normalizeLocale("zh-Hant"), "en");
});

test("supported locales are unique and cover the default", () => {
  const codes = SUPPORTED_LOCALES.map((locale) => locale.code);
  assert.deepEqual(codes, [...new Set(codes)]);
  assert.ok(codes.includes("en"));
  assert.ok(codes.includes("zh-CN"));
});

test("zh-CN mirrors the English catalog with matching placeholders", () => {
  const result = diffLocales();
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.extra, []);
  assert.deepEqual(result.placeholderMismatches, []);
  assert.equal(result.baseKeyCount, result.targetKeyCount);
  assert.ok(result.baseKeyCount > 0);
});
