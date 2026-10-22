#!/usr/bin/env node
/**
 * Layout regression checks for en / zh-CN / pseudo-locale (en-XA).
 *
 * Spawns a Vite dev server, renders the landing page, the graph workspace and
 * the ontology registry at phone/tablet/desktop widths, and fails on:
 *   - horizontal document overflow
 *   - untranslated keys leaking into the DOM
 *   - pseudo-locale interpolation markers leaking
 *
 * Screenshots are written to tests/artifacts/i18n for manual review.
 */
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(ROOT, '..');
const ARTIFACTS = join(ROOT, 'artifacts', 'i18n');
const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
const WIDTHS = [375, 768, 1440];
const MODES = [
  { id: 'en', locale: 'en-US', path: '/', expect: 'Knowledge Explorer' },
  { id: 'zh', locale: 'zh-CN', path: '/', expect: '知识探索器' },
  { id: 'pseudo', locale: 'en-US', path: '/?pseudo=xa', expect: null },
];

const RAW_KEY_RE =
  /\b(?:shell|landing|graph|ontology|manage|enrich|decision|diffmerge|importexport|lineage|memory|reasoning|sparql|vocabulary|errors)\.[a-zA-Z][a-zA-Z0-9.]*/;

function waitForServer(timeoutMs = 60000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const response = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
        if (response.ok) return resolve();
      } catch {
        // not ready yet
      }
      if (Date.now() - started > timeoutMs) return reject(new Error('Vite dev server did not start'));
      setTimeout(tick, 400);
    };
    void tick();
  });
}

async function mockApis(page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/info') return json({ capabilities: { agent_memory: false } });
    if (url.pathname === '/api/graph/stats') return json({ node_count: 0, edge_count: 0 });
    if (url.pathname === '/api/graph/nodes') return json({ nodes: [], total: 0, next_cursor: null });
    if (url.pathname === '/api/graph/edges') return json({ edges: [], total: 0, next_cursor: null });
    if (url.pathname === '/api/ontology/registry') return json([]);
    if (url.pathname === '/api/ontology/skos/schemes') return json([]);
    if (url.pathname === '/api/vocabulary/schemes') return json([]);
    if (url.pathname === '/api/decisions') return json([]);
    return json({});
  });
}

async function overflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      doc: doc.scrollWidth - doc.clientWidth,
      body: body.scrollWidth - body.clientWidth,
    };
  });
}

async function run() {
  await rm(ARTIFACTS, { recursive: true, force: true });
  await mkdir(ARTIFACTS, { recursive: true });

  const server = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    { cwd: APP_DIR, stdio: 'ignore' },
  );

  const failures = [];
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });

  try {
    await waitForServer();

    for (const mode of MODES) {
      for (const width of WIDTHS) {
        const context = await browser.newContext({
          locale: mode.locale,
          viewport: { width, height: 900 },
        });
        const page = await context.newPage();
        const caseId = `${mode.id}-${width}`;
        const pageErrors = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));
        await mockApis(page);

        await page.goto(`${BASE}${mode.path}`, { waitUntil: 'networkidle' });
        const landingText = await page.evaluate(() => document.body.innerText);
        if (mode.expect && !landingText.includes(mode.expect)) {
          failures.push(`${caseId}: landing missing "${mode.expect}"`);
        }
        if (RAW_KEY_RE.test(landingText)) failures.push(`${caseId}: raw i18n keys on landing`);
        if (mode.id === 'pseudo') {
          if (/\{\{/.test(landingText)) failures.push(`${caseId}: pseudo locale leaked {{placeholders}}`);
          if (!/···/.test(landingText) || !/[áéíóúñçý]/i.test(landingText)) {
            failures.push(`${caseId}: pseudo locale not applied: ${landingText.slice(0, 120)}`);
          }
        }
        let size = await overflow(page);
        if (size.doc > 1 || size.body > 1) {
          failures.push(`${caseId}: horizontal overflow landing doc=${size.doc} body=${size.body}`);
        }
        await page.screenshot({ path: join(ARTIFACTS, `${caseId}-landing.png`), fullPage: false });

        // Graph workspace (empty graph, mocked backend)
        await page.locator('.nav-button').first().click();
        await page.waitForTimeout(1200);
        const graphText = await page.evaluate(() => document.body.innerText);
        if (RAW_KEY_RE.test(graphText)) failures.push(`${caseId}: raw i18n keys in graph`);
        size = await overflow(page);
        if (size.doc > 1 || size.body > 1) {
          failures.push(`${caseId}: horizontal overflow graph doc=${size.doc} body=${size.body}`);
        }
        await page.screenshot({ path: join(ARTIFACTS, `${caseId}-graph.png`), fullPage: false });

        // Ontology registry
        await page.locator('.nav-button').nth(5).click();
        await page.waitForTimeout(1200);
        const ontologyText = await page.evaluate(() => document.body.innerText);
        if (RAW_KEY_RE.test(ontologyText)) failures.push(`${caseId}: raw i18n keys in ontology`);
        size = await overflow(page);
        if (size.doc > 1 || size.body > 1) {
          failures.push(`${caseId}: horizontal overflow ontology doc=${size.doc} body=${size.body}`);
        }
        await page.screenshot({ path: join(ARTIFACTS, `${caseId}-ontology.png`), fullPage: false });

        if (pageErrors.length) failures.push(`${caseId}: page errors: ${pageErrors.join(' | ')}`);
        await context.close();
        console.log(`checked ${caseId}`);
      }
    }
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }

  if (failures.length) {
    console.error(`\n${failures.length} i18n layout failure(s):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`\nAll ${MODES.length * WIDTHS.length} layout cases passed.`);
}

await run();
