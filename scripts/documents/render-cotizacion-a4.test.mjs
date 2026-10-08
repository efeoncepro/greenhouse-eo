import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { validateQuote, quoteAmounts, fillSlots, buildHtml } from './render-cotizacion-a4.mjs';

const dataPath = new URL('../../docs/commercial/templates/cotizacion-a4/ejemplo.json', import.meta.url);
const example = JSON.parse(await fs.readFile(dataPath, 'utf8'));

test('neto del servicio completo e IVA redondeado al peso, incluidos casos sin impuesto', () => {
  assert.deepEqual(quoteAmounts(example), { net: 4800000, vat: 912000, total: 5712000, monthly: { months: 3, net: 1600000, vat: 304000, total: 1904000 } });
  assert.equal(quoteAmounts({ ...example, net: 50, vatRate: 0.19 }).vat, 10);
  assert.equal(quoteAmounts({ ...example, vatRate: 0 }).total, example.net);
});

test('rechaza estados presentados, fechas imposibles y montos inválidos', () => {
  assert.throws(() => validateQuote({ ...example, submitted: true }), /presentada/);
  assert.throws(() => validateQuote({ ...example, signed: true }), /firmada/);
  assert.throws(() => validateQuote({ ...example, date: '2026-02-30' }), /fecha/);
  assert.throws(() => validateQuote({ ...example, net: -1 }), /positivo/);
  assert.throws(() => validateQuote({ ...example, vatRate: 0.12345 }), /cuatro/);
  assert.throws(() => validateQuote({ ...example, currency: 'USD' }), /CLP/);
  assert.throws(() => validateQuote({ ...example, status: 'submitted' }), /status/);
});

test('los slots se resuelven una vez y no toleran campos olvidados', () => {
  assert.equal(fillSlots('{{name}} / {{name}}', { name: '{{amount.total}}' }), '{{amount.total}} / {{amount.total}}');
  assert.throws(() => fillSlots('{{missing}}', {}), /sin resolver/);
});

test('textos de cliente escapados, montos coherentes y equivalente mensual opcional', async () => {
  const q = structuredClone(example);

  q.buyer.name = '<script>alert(1)</script> & {{reference}}';
  q.pricing.monthly = null;
  const { html, amounts } = await buildHtml(q, dataPath.pathname);

  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; {{reference}}'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(!html.includes('Equivalente mensual'));
  assert.equal(amounts.monthly, null);
  assert.equal((html.match(/data-slot="amount.net">\$4\.800\.000/g) ?? []).length, 3);
  assert.equal((html.match(/data-slot="amount.total">\$5\.712\.000/g) ?? []).length, 2);
  assert.ok(!html.includes('UTEM'));
  assert.equal((html.match(/class="page-footer"/g) ?? []).length, 4);
});
