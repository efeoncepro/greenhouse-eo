/**
 * TASK-1556 / ADR-014 — gate (b): the seam smoke.
 *
 * Loads the REAL built bundle, served by the REAL shell renderer under the REAL strict CSP, in a
 * REAL browser. It is the only gate that can surface Rolldown's strict CommonJS semantics: that
 * failure (`TypeError: e is not a function`) type-checks, bundles and passes the unit suite, then
 * throws on page load, so no amount of CI catches it.
 *
 * The driver lives in Greenhouse because Playwright and Chromium live here; the server it drives is
 * `apps/studio-client/scripts/seam-smoke-server.mjs` in `efeonce-globe`, which stays dependency-free
 * so Globe never takes a browser-automation dependency for a smoke.
 *
 * Usage (two terminals):
 *   cd ../efeonce-globe && pnpm --filter @efeonce-globe/studio-client build \
 *     && node apps/studio-client/scripts/seam-smoke-server.mjs
 *   node scripts/frontend/globe-client-seam-gate.mjs
 */
import { chromium } from '@playwright/test';

const URL_UNDER_TEST = 'http://127.0.0.1:4319/_client-seam';
const problems = [];

const browser = await chromium.launch();
const page = await browser.newPage();

// Anything the browser refuses or throws is a gate failure. Rolldown's strict CommonJS semantics
// surface here as `TypeError: e is not a function` — it type-checks, bundles and passes the unit
// suite, then throws on load.
page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
page.on('console', message => {
  if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
});
page.on('requestfailed', request => problems.push(`requestfailed: ${request.url()} — ${request.failure()?.errorText}`));

const response = await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle' });

console.log('HTTP:', response?.status());

const read = sel => page.locator(`[data-seam="${sel}"]`).textContent();

const hydrated = await read('hydrated');
const route = await read('route');
const before = await read('interactions');

await page.getByRole('button', { name: 'Registrar interacción' }).click();
const after = await read('interactions');

console.log('hydration :', hydrated);
console.log('router    :', route);
console.log('state     :', `${before} → ${after}`);

if (hydrated !== 'ok') problems.push(`React no hidrató (data-seam=hydrated="${hydrated}")`);
if (route !== '/_client-seam') problems.push(`router no resolvió la ruta ("${route}")`);
if (after !== '1') problems.push(`el estado no actualizó (${before} → ${after})`);

await browser.close();

if (problems.length > 0) {
  console.log('\n❌ COMPUERTA (b) EN ROJO');
  for (const problem of problems) console.log('  -', problem);
  process.exit(1);
}

console.log('\n✅ COMPUERTA (b) VERDE — el bundle real corre en un browser real bajo la CSP estricta');
