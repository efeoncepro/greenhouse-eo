# TASK-631.1 — Quote Share Pipeline Hardening Test Suite (PDF cache + email + short-link + redirect blast-radius coverage)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto` (blindaje de TASK-631 Fase 4 productivo antes de iniciar programa CPQ v1.9)
- Effort: `Bajo` (~2 dias)
- Type: `quality_assurance`
- Epic: `none` (RESEARCH-005 v1.9.1 prerequisite)
- Status real: `Diseno cerrado v1.9.1`
- Rank: `TBD` (debe ejecutarse antes de TASK-554 / 619 / 620.x / 625 / 626 / 628)
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-631.1-quote-share-pipeline-hardening-tests`

## Summary

Crear suite de tests defensivos sobre el quote-share pipeline productivo (TASK-631 Fase 4) **antes** de empezar el programa CPQ v1.9. Cobertura de cache layer, GCS upload/download, email send + idempotency, short-link redirect, view-tracker, public verification, y un golden-file PDF rendering snapshot que detecta drift byte-perfect en el output del PDF. Suite bloqueante en CI: si pricing cambia, render cambia, o cache invariants se rompen, merge bloqueado.

## Why This Task Exists

TASK-631 Fase 4 quedo en produccion con tests minimos (`accept-quote-validation`, `short-link`, `url-builder`, `qr-verification`). El programa CPQ v1.9 tiene **9 tasks** que tocan directa o indirectamente el quote-share pipeline:

- TASK-619 (signature) modifica el send-email gate
- TASK-619.5 (cost guardrails) agrega quota check al send-email
- TASK-620 / 620.3 / 620.4 / 620.5 modifican composition leida por `loadInternalPdfInputForQuote`
- TASK-620.7 (lifecycle) afecta JOIN de items archived
- TASK-625 (i18n) cambia rendering de PDF + email + ZapSign
- TASK-626 (tax engine) cambia tax breakdown section del PDF
- TASK-628 (amendment) crea PDF derivado del mismo cache layer

Sin esta suite, una regresion en cualquiera de estos tasks pasa silenciosa hasta que un cliente reporta que su PDF no descarga o el email no llega.

## Goal

- 7 archivos de test cubriendo todo el pipeline quote-share
- Golden file PDF buffers para 5 quotes representativas
- SHA-256 byte-perfect comparison enforced en CI
- Mocks de GCS + Resend + ZapSign para tests E2E sin hit a servicios externos
- Coverage report > 90% sobre los 4 archivos productivos del pipeline
- Suite ejecuta < 30 segundos completa (no bloquea developer flow)
- Nuevo npm script `pnpm test:quote-share` para correr solo esta suite

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` Delta v1.9.1

Reglas obligatorias:

- tests deterministicos (sin flakiness): timestamps mockeados, IDs fijos, no network calls reales
- golden files versionados en git (no .gitignore)
- regression bloqueante en CI: cualquier diff en SHA-256 del PDF rechaza merge
- mocks de provider externos via `vitest.mock()` — no usar provider real ni en dev
- coverage gate enforced: < 90% rechaza merge

## Dependencies & Impact

### Depends on

- TASK-631 Fase 4 (productivo, sin cambios — solo tests sobre el)
- vitest + testing-library (ya en repo)

### Blocks / Impacts

- **TASK-554, 619, 619.5, 620, 620.3, 620.4, 620.5, 620.7, 625, 626, 628** — todas estas declaran `blocked by: TASK-631.1` para garantizar regression coverage antes de tocar el pipeline
- Reduce QA manual time ~2h por deploy del programa CPQ a 30s

### Files owned

- `src/lib/finance/quote-share/__tests__/quote-pdf-asset.test.ts` (nuevo)
- `src/lib/finance/quote-share/__tests__/load-quote-for-pdf-internal.test.ts` (nuevo)
- `src/lib/finance/quote-share/__tests__/share-flow-e2e.test.ts` (nuevo)
- `src/lib/finance/quote-share/__tests__/short-link-redirect.test.ts` (nuevo)
- `src/lib/finance/quote-share/__tests__/gcs-lifecycle-fallback.test.ts` (nuevo)
- `src/lib/finance/pdf/__tests__/pdf-rendering-snapshot.test.ts` (nuevo, golden files)
- `src/lib/finance/pdf/__tests__/golden-pdfs/` (carpeta nueva con 5 PDF buffers + metadatos)
- `src/lib/finance/quote-share/__tests__/fixtures/` (carpeta nueva con quote inputs deterministicos)
- `src/test/mocks/{gcs,resend,zapsign}.ts` (nuevos mocks reusables)
- `package.json` (npm script `test:quote-share`)
- `.github/workflows/*.yml` (modificado: agregar gate `pnpm test:quote-share` en PR check)

## Current Repo State

### Already exists

- 4 archivos productivos: `quote-pdf-asset.ts`, `load-quote-for-pdf-internal.ts`, `short-link.ts`, `view-tracker.ts`
- 8 endpoints productivos del share pipeline
- 4 test files minimos: `accept-quote-validation`, `short-link`, `url-builder`, `qr-verification`
- vitest configurado + Resend + GCS clients

### Gap

- Cero coverage del cache layer
- Cero coverage del GCS upload/download flow
- Cero coverage del email send E2E
- Cero golden file regression del PDF
- Cero mock infra centralizada
- Cero coverage gate en CI

## Scope

### Slice 1 — Mocks reusables (0.25 dia)

`src/test/mocks/gcs.ts`:

```typescript
import { vi } from 'vitest'

export const createGcsMock = (options: { uploadFails?: boolean; downloadFails?: boolean; objectExists?: boolean } = {}) => ({
  uploadObject: vi.fn(async ({ bucketName, objectName, bytes }) => {
    if (options.uploadFails) throw new Error('GCS upload mock failure')
    return { bucketName, objectPath: objectName, bytes: bytes.byteLength }
  }),
  downloadObject: vi.fn(async ({ bucketName, objectName }) => {
    if (options.downloadFails) throw new Error('GCS download mock failure')
    if (!options.objectExists) {
      const err: any = new Error('Not found')
      err.code = 404
      throw err
    }
    return { arrayBuffer: new ArrayBuffer(1024), contentType: 'application/pdf' }
  }),
  storeSystemGeneratedPrivateAsset: vi.fn(async ({ assetId, fileName, bytes }) => ({
    assetId: assetId ?? `asset-${Date.now()}`,
    bucketName: 'test-bucket',
    objectPath: `quotation-pdfs/${fileName}`,
    fileSizeBytes: bytes.byteLength
  }))
})
```

Similar para `resend.ts` (mock `sendEmail` returns `{ deliveryId: 'mock-delivery-123' }`) y `zapsign.ts` (mock `createZapSignDocument`).

### Slice 2 — Fixtures de quotes deterministicas (0.25 dia)

`src/lib/finance/quote-share/__tests__/fixtures/`:

5 quote inputs representativos (JSON snapshots):

- `enterprise-quote.json` — Globe USA, USD 184,500, 12 line items, 3 sub-services nested, sub-brand globe, FX footer, QR verification
- `compact-quote.json` — Wave Chile, CLP 4.76M, 3 line items flat, sub-brand wave
- `mixed-currency-quote.json` — quote en USD para cliente Chile (FX needed), tax IVA 19%
- `with-artifacts-quote.json` — quote con 2 artifacts (1 priced directly + 1 absorbed)
- `multi-language-quote.json` — quote en EN para cliente Globe USA

Cada fixture es un `RenderQuotationPdfInput` completo, no requiere DB para test.

### Slice 3 — Test cache layer (0.25 dia)

`quote-pdf-asset.test.ts`:

```typescript
describe('getOrCreateQuotePdfBuffer', () => {
  it('regenerates + uploads on first hit (cache miss)', async () => {
    const gcs = createGcsMock({ objectExists: false })
    vi.mock('@/lib/storage/greenhouse-media', () => gcs)

    const result = await getOrCreateQuotePdfBuffer({ quotationId: 'qt-1', versionNumber: 1 })

    expect(gcs.storeSystemGeneratedPrivateAsset).toHaveBeenCalledTimes(1)
    expect(result.wasGenerated).toBe(true)
  })

  it('downloads from GCS on cache hit', async () => {
    // pre-populate quote_pdf_assets row + mock GCS object exists
    const gcs = createGcsMock({ objectExists: true })

    const result = await getOrCreateQuotePdfBuffer({ quotationId: 'qt-1', versionNumber: 1 })

    expect(gcs.downloadObject).toHaveBeenCalledTimes(1)
    expect(result.wasGenerated).toBe(false)
  })

  it('regenerates when template_version mismatches', async () => {
    // pre-populate row con template_version='0' (older)
    // current QUOTE_PDF_TEMPLATE_VERSION = '1'
    const result = await getOrCreateQuotePdfBuffer(...)
    expect(result.wasGenerated).toBe(true)
  })

  it('regenerates when quote was updated after generation', async () => { ... })
  it('regenerates when line items were updated after generation', async () => { ... })
  it('falls back to regeneration if GCS download throws', async () => { ... })
})
```

### Slice 4 — Test loader internal (0.25 dia)

`load-quote-for-pdf-internal.test.ts`:

- Loader is deterministic: same input -> same output (deep equal)
- Loader respeta caso flat (sin children)
- Loader respeta caso nested (con children) — cuando TASK-620.3 lo agregue
- Loader maneja item archived (lifecycle): JOIN preserva snapshot
- Loader maneja artifact priced directly vs absorbed (modelo hibrido)
- Loader maneja salesRep optional + verification optional gracefully

### Slice 5 — Test golden-file PDF snapshot (0.5 dia)

`pdf-rendering-snapshot.test.ts`:

```typescript
import { renderQuotationPdf } from '@/lib/finance/pdf/render-quotation-pdf'
import { createHash } from 'crypto'
import enterpriseFixture from './fixtures/enterprise-quote.json'

describe('PDF rendering snapshot', () => {
  it('enterprise quote produces deterministic SHA-256', async () => {
    const buffer = await renderQuotationPdf(enterpriseFixture)
    const sha256 = createHash('sha256').update(buffer).digest('hex')

    const goldenSha = readFileSync('./golden-pdfs/enterprise-quote.sha256', 'utf-8').trim()
    expect(sha256).toBe(goldenSha)
  })

  // Repeat para los otros 4 fixtures
})
```

Golden files generados una sola vez al cerrar TASK-631.1 + commiteados. **Cualquier cambio futuro al PDF rendering cambia el SHA -> test rechaza merge** unless el dev regenera explicitamente los golden files con `pnpm test:quote-share -- --update-golden` (script nuevo).

### Slice 6 — Test share flow E2E + redirect (0.25 dia)

`share-flow-e2e.test.ts`:

- POST /share -> creates short_code unico
- POST /share/[code]/send-email con idempotency-key X -> envia 1 email
- POST /share/[code]/send-email con idempotency-key X otra vez (retry) -> NO envia segundo email, devuelve 200 cached
- POST /share/[code]/send-email con idempotency-key Y -> envia segundo email
- POST /share/[code]/resend-email con parent_delivery_id -> nueva delivery linked

`short-link-redirect.test.ts`:

- GET /q/[shortCode] -> 302 redirect al PDF endpoint correcto
- GET /q/[invalidCode] -> 404
- GET /q/[expiredCode] -> 410
- GET /q/[revokedCode] -> 410
- view-tracker registra hit en cada request valido

### Slice 7 — GCS lifecycle fallback + public verification (0.25 dia)

`gcs-lifecycle-fallback.test.ts`:

- GCS object lifecycle-deleted (404) -> cache layer regenera + reuploads sin error al usuario
- GCS COLDLINE restore needed -> graceful degrade (regenera mientras restore happens)

`public-verification.test.ts` (puede absorber al existing qr-verification.test.ts o expandirlo):

- Token HMAC valido -> verification page muestra "documento auténtico"
- Token con quotationId modificado -> "documento inválido"
- Token expirado (futuro: TTL del token) -> mensaje correcto
- Sin secret env var -> verification page no se renderiza pero PDF sigue funcionando (graceful degradation)

### Slice 8 — CI integration + npm script (0.25 dia)

`package.json`:

```json
"scripts": {
  "test:quote-share": "vitest run src/lib/finance/quote-share src/lib/finance/pdf/__tests__",
  "test:quote-share:update-golden": "vitest run src/lib/finance/pdf/__tests__/pdf-rendering-snapshot --update-golden"
}
```

GitHub Actions workflow PR check (additivo al existing):

```yaml
- name: Quote Share Regression Suite
  run: pnpm test:quote-share
- name: Coverage Gate (quote-share > 90%)
  run: pnpm test:quote-share -- --coverage --reporter=verbose
```

## Out of Scope

- Tests E2E con browser (Playwright) — separate task TASK-599 ya existe para Finance preventive lane
- Performance benchmarks (PDF rendering speed) — separate concern
- Tests del flow ZapSign envelope creation real — eso lo cubre TASK-491 spec
- Tests de Resend delivery real (solo mocks)

## Acceptance Criteria

- [ ] 7 test files creados con cobertura completa de cada slice
- [ ] 5 fixtures + 5 golden PDF SHA-256 commiteados
- [ ] mocks reusables en `src/test/mocks/`
- [ ] suite ejecuta < 30s total
- [ ] coverage > 90% sobre los 4 archivos productivos del pipeline
- [ ] CI PR check bloqueante con `pnpm test:quote-share`
- [ ] `pnpm test:quote-share:update-golden` documentado para developers
- [ ] documentacion en `docs/operations/runbooks/quote-share-regression-suite.md` con como interpretar fallos + como regenerar golden

## Verification

- `pnpm test:quote-share` clean en local
- Modificar trivialmente `quote-pdf-asset.ts` (ej. cambiar template version) y ver test fallar correctamente
- Modificar el PDF render (ej. cambiar color del header) y ver golden file test fallar
- Coverage report shows > 90%

## Closing Protocol

- [ ] Lifecycle sincronizado
- [ ] README + Handoff actualizados
- [ ] `docs/operations/runbooks/quote-share-regression-suite.md` creado
- [ ] CI workflow merged
- [ ] Specs del programa CPQ que dependian de esta task (619, 620.x, 625, 626, 628) actualizadas confirmando dependencia satisfecha
