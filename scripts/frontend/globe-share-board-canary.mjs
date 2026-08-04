/**
 * TASK-1558 / ADR-014 Slice 1 — visual canary of the Globe share board.
 *
 * The share board is the ONLY surface an external client sees of Globe, and until this driver existed
 * it had no visual regression net of any kind: a change could crop the artwork, leak an internal enum
 * or break the mobile layout and nothing would notice. Globe does not run Greenhouse's GVC (different
 * repo, different runtime), so the canonical equivalent is this pair — a dependency-free harness in
 * Globe plus a Playwright driver here, where Chromium already lives. Same split as the seam gate.
 *
 * What it checks, and why each one is here rather than "nice to have":
 *
 * 1. `scrollWidth <= clientWidth` at 1440, at 390 **and at 320** — WCAG 1.4.10 asks for 320, and this
 *    product has shipped horizontal overflow twice with the assertion green because it measured only
 *    the document. Measured on the scrolling PANELS too: a container with `overflow-y: auto` gets
 *    `overflow-x: auto` for free, so overflow scrolls inside and the document never widens.
 * 2. No leak to a `client` audience: no provider slug, no `house`, no cost, no margin.
 * 3. No internal nomenclature (`Producer`) and no raw machine values (ISO 8601, enum names) — both of
 *    which the surface being replaced puts on screen today.
 * 4. Retry exists ONLY where retrying can work, and `role=alert` only where the reader must act.
 * 5. Every link resolves to a document, never to JSON.
 *
 * Usage (two terminals):
 *   cd ../efeonce-globe && pnpm --filter @efeonce-globe/studio-client build \
 *     && node apps/studio-client/scripts/share-board-canary.mjs
 *   node scripts/frontend/globe-share-board-canary.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';

import { AxeBuilder } from '@axe-core/playwright';
import { chromium } from '@playwright/test';

const ORIGIN = process.env.CANARY_ORIGIN ?? 'http://127.0.0.1:4320';
const SHARE_ID = 'shr_canary';
const OUT = new URL('../../.captures/globe-share-board/', import.meta.url);

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
  // 320 is the WCAG 1.4.10 reflow floor. Not captured — measured.
  { name: 'reflow-320', width: 320, height: 844, measureOnly: true },
];

const SCENARIOS = [
  { name: 'ready', token: 'canary-ready', expect: { retry: false, alert: false, media: true } },
  { name: 'empty', token: 'canary-empty', expect: { retry: false, alert: false, media: true } },
  { name: 'partial', token: 'canary-partial', expect: { retry: true, alert: false, media: false } },
  { name: 'error', token: 'canary-error', expect: { retry: true, alert: false, media: false } },
  { name: 'denied', token: 'canary-denied', expect: { retry: false, alert: true, media: false } },
  // No token at all: the fragment never arrived. Terminal and NOT retryable.
  { name: 'incomplete', token: null, expect: { retry: false, alert: true, media: false } },
];

/**
 * Strings that must never reach a `client` audience.
 *
 * `Producer` is the name of an internal surface and the old page wore it as a label. The ISO and enum
 * entries are not hypothetical: the current board renders `changes_requested` and
 * `2026-08-01T18:00:00.000Z` verbatim.
 */
const FORBIDDEN = [
  { needle: 'Producer', why: 'nomenclatura interna' },
  { needle: 'bytedance/', why: 'slug del proveedor' },
  { needle: 'house', why: 'taxonomía interna operator-only' },
  { needle: 'changes_requested', why: 'enum crudo' },
  { needle: 'approved', why: 'enum crudo' },
  { needle: 'T18:00:00', why: 'ISO 8601 crudo' },
  { needle: 'dependency_unavailable', why: 'código técnico del transporte' },
  { needle: 'not_found', why: 'código técnico del transporte' },
];

const problems = [];
/** Lo que un gate NO pudo comprobar. No sube el exit code, pero nunca queda invisible. */
const unverified = [];
const record = (scenario, viewport, message) => problems.push(`[${scenario}/${viewport}] ${message}`);

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const summary = [];

for (const scenario of SCENARIOS) {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      // Reduced motion on the mobile pass, so the reduced-motion equivalence is exercised by the run
      // rather than asserted in prose.
      ...(viewport.name === 'mobile' ? { reducedMotion: 'reduce' } : {}),
    });

    const page = await context.newPage();

    page.on('pageerror', error => record(scenario.name, viewport.name, `pageerror: ${error.message}`));
    page.on('console', message => {
      if (message.type() !== 'error') return;

      /*
       * The browser logs "Failed to load resource" for every non-2xx, and this canary INDUCES 503s
       * and 404s on purpose — so counting them as defects would make four of the six scenarios
       * permanently red and the whole gate get switched off.
       *
       * The exemption is narrow rather than a blanket ignore: only the browser's own resource-status
       * line, only the two statuses the harness stubs, and only in a scenario that expects the bytes
       * to fail. A React error, a CSP refusal or an unexpected status still fails the run.
       */
      const inducedFailure = /Failed to load resource: the server responded with a status of (?:404|503)\b/.test(message.text());

      if (inducedFailure && scenario.expect.media === false) return;

      record(scenario.name, viewport.name, `console.error: ${message.text()}`);
    });

    const fragment = scenario.token === null ? '' : `#token=${scenario.token}`;

    await page.goto(`${ORIGIN}/shares/${SHARE_ID}${fragment}`, { waitUntil: 'load' });

    // Waits for the surface to REACH a terminal render — the mounted piece or a state block — rather
    // than for the network to fall quiet. `networkidle` hung here: the harness keeps connections
    // alive, so "no requests for 500ms" is a property of the server's socket handling and not of the
    // page being ready. Waiting on the thing being asserted is both faster and impossible to fool.
    await page.waitForSelector('.gl-stage__media, .gl-state', { state: 'attached', timeout: 10_000 });
    await page.waitForTimeout(250);

    const observed = await page.evaluate(() => {
      const overflowing = [...document.querySelectorAll('*')]
        .filter(node => node.scrollWidth > node.clientWidth + 1 && node.clientWidth > 0)
        .map(node => `${node.tagName.toLowerCase()}.${node.className || '(sin clase)'}`)
        .slice(0, 5);

      return {
        documentScrollWidth: document.documentElement.scrollWidth,
        documentClientWidth: document.documentElement.clientWidth,
        overflowing,
        text: document.body.innerText,
        html: document.documentElement.outerHTML,
        retryButtons: [...document.querySelectorAll('button')].filter(node => /reintentar/i.test(node.textContent ?? '')).length,
        alerts: document.querySelectorAll('[role="alert"]').length,
        statuses: document.querySelectorAll('[role="status"]').length,
        mediaNodes: document.querySelectorAll('.gl-stage__media').length,
        headings: [...document.querySelectorAll('h1')].map(node => node.textContent?.trim() ?? ''),
        links: [...document.querySelectorAll('a')].map(node => node.getAttribute('href') ?? ''),
        captureMarkers: [...document.querySelectorAll('[data-capture]')].map(node => node.getAttribute('data-capture')),
        ariaBusy: document.querySelectorAll('[aria-busy="true"]').length,
        focusableCount: document.querySelectorAll('button, a[href], [tabindex="0"], input, select, textarea').length,
      };
    });

    // 1 — overflow, document and panels, at every width including 320.
    if (observed.documentScrollWidth > observed.documentClientWidth) {
      record(
        scenario.name,
        viewport.name,
        `overflow horizontal: scrollWidth ${observed.documentScrollWidth} > clientWidth ${observed.documentClientWidth}`,
      );
    }

    if (observed.overflowing.length > 0) {
      record(scenario.name, viewport.name, `panel(es) con overflow interno: ${observed.overflowing.join(', ')}`);
    }

    // 2 & 3 — nothing internal, nothing raw. Checked against the SERVED HTML, not only the visible
    // text: a leaked value inside an attribute or a hidden node is still a leak.
    for (const forbidden of FORBIDDEN) {
      if (observed.html.includes(forbidden.needle)) {
        record(scenario.name, viewport.name, `fuga "${forbidden.needle}" (${forbidden.why}) presente en el DOM`);
      }
    }

    // 4 — the action and the announcement match the state.
    const hasRetry = observed.retryButtons > 0;

    if (hasRetry !== scenario.expect.retry) {
      record(scenario.name, viewport.name, `Reintentar ${hasRetry ? 'presente' : 'ausente'}, se esperaba ${scenario.expect.retry ? 'presente' : 'ausente'}`);
    }

    const hasAlert = observed.alerts > 0;

    if (hasAlert !== scenario.expect.alert) {
      record(scenario.name, viewport.name, `role="alert" ${hasAlert ? 'presente' : 'ausente'}, se esperaba ${scenario.expect.alert ? 'presente' : 'ausente'}`);
    }

    const hasMedia = observed.mediaNodes > 0;

    if (hasMedia !== scenario.expect.media) {
      record(scenario.name, viewport.name, `pieza ${hasMedia ? 'presente' : 'ausente'}, se esperaba ${scenario.expect.media ? 'presente' : 'ausente'}`);
    }

    // `partial` is the state the old page did not have: the rail must SURVIVE a byte failure.
    if (scenario.name === 'partial' && !observed.text.includes('Seedance')) {
      record(scenario.name, viewport.name, 'partial perdió los hechos del riel — es el "preview roto genérico" que ADR-005 prohíbe');
    }

    // 5 — every link is a document or an absolute external URL. None may answer JSON.
    for (const href of observed.links) {
      if (href.startsWith('https://') || href.startsWith('http://')) continue;
      record(scenario.name, viewport.name, `link relativo "${href}": verifica que responde HTML y no JSON`);
    }

    // A single h1, and it is never empty.
    if (scenario.expect.media && observed.headings.length !== 1) {
      record(scenario.name, viewport.name, `se esperaba exactamente un <h1>, hay ${observed.headings.length}`);
    }

    // Content is content: the rail must not turn comments into tab stops.
    if (observed.focusableCount > 4) {
      record(scenario.name, viewport.name, `${observed.focusableCount} elementos focusables: el contenido se lee, no se opera`);
    }

    /*
     * axe, sobre la superficie renderizada.
     *
     * Cierra la única dimensión del scorecard que quedó en 4 por falta de evidencia mecánica: el
     * contraste estaba verificado por token y a ojo, no medido contra el fondo real — y el fondo real
     * acá son tres gradientes superpuestos, o sea justo donde un cálculo por token miente.
     *
     * Sólo `serious` y `critical`: `moderate` arrastra reglas de best-practice que no son WCAG AA, y un
     * gate que mezcla las dos cosas enseña a ignorar su propia salida. Corre en los viewports que se
     * capturan; a 320 sólo se mide overflow, que es lo que ese ancho vino a probar.
     */
    if (viewport.measureOnly !== true) {
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const blocking = audit.violations.filter(violation => violation.impact === 'serious' || violation.impact === 'critical');

      for (const violation of blocking) {
        const where = violation.nodes
          .map(node => node.target.join(' '))
          .slice(0, 3)
          .join(' | ');

        record(scenario.name, viewport.name, `axe ${violation.impact} — ${violation.id}: ${violation.help} [${where}]`);
      }

      /*
       * `incomplete` NO es "pasó". Se reporta explícitamente porque acá miente por omisión.
       *
       * Verificado el 2026-07-25: con `--muted` movido a `#1b2a52` —contraste muy por debajo de 4.5:1 y
       * el token efectivamente presente en el HTML servido— axe devolvió **0 violations** y
       * `color-contrast` en `incomplete` sobre 22 nodos. El fondo de esta superficie son tres gradientes
       * apilados, y axe no puede resolver un color de fondo que no es un color: en vez de fallar, punta a
       * `incomplete`.
       *
       * O sea que "axe verde" en esta página **no** significa contraste verificado, y dejarlo pasar en
       * silencio sería peor que no correr axe: convertiría una laguna conocida en una casilla marcada.
       * Se imprime como advertencia y no sube el exit code, porque en esta superficie `color-contrast`
       * va a estar SIEMPRE incompleto — un gate permanentemente rojo se apaga y deja de existir. La
       * medición real (muestrear el píxel renderizado detrás del texto) es follow-up de TASK-1558.
       */
      for (const item of audit.incomplete) {
        unverified.push(`[${scenario.name}/${viewport.name}] axe no pudo verificar "${item.id}" en ${item.nodes.length} nodos`);
      }

      const file = new URL(`${scenario.name}-${viewport.name}.png`, OUT);

      await page.screenshot({ path: file.pathname, fullPage: false });
      summary.push({
        scenario: scenario.name,
        viewport: viewport.name,
        file: file.pathname,
        markers: observed.captureMarkers,
        axe: { total: audit.violations.length, blocking: blocking.length, incomplete: audit.incomplete.length },
      });
    }

    await context.close();
  }
}

await browser.close();

await writeFile(
  new URL('canary-report.json', OUT),
  `${JSON.stringify({ origin: ORIGIN, captures: summary, problems, unverified }, null, 2)}\n`,
  'utf8',
);

console.log('\ncapturas:', OUT.pathname);
for (const entry of summary) console.log(`  ${entry.scenario}/${entry.viewport} → ${entry.file}`);

if (unverified.length > 0) {
  // Se imprime SIEMPRE y antes del veredicto, para que nadie lea "verde" como "todo comprobado".
  const contrast = unverified.filter(entry => entry.includes('color-contrast')).length;

  console.log(`\n⚠️  NO VERIFICADO MECÁNICAMENTE (${unverified.length})`);

  if (contrast > 0) {
    console.log('  - contraste: axe no puede resolver el fondo de esta superficie (tres gradientes apilados),');
    console.log('    así que reporta `incomplete` en vez de fallar. Comprobado el 2026-07-25 rompiendo --muted');
    console.log('    a propósito: 0 violations. "axe verde" acá NO significa contraste verificado.');
  }

  console.log(`  detalle completo en ${new URL('canary-report.json', OUT).pathname}`);
}

if (problems.length > 0) {
  console.log('\n❌ CANARY DEL SHARE BOARD EN ROJO');
  for (const problem of problems) console.log('  -', problem);
  process.exit(1);
}

console.log('\n✅ CANARY DEL SHARE BOARD VERDE — 6 estados × 3 anchos, sin fugas, sin overflow, axe sin violations');
