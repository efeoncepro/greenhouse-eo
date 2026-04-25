# TASK-631.2 — Contract Version Enforcement (frozen contracts + auto-bump QUOTE_PDF_TEMPLATE_VERSION + Zod schemas)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto` (blindaje de contracts del quote-share antes de iniciar programa CPQ v1.9)
- Effort: `Bajo` (~1 dia)
- Type: `quality_assurance`
- Epic: `none` (RESEARCH-005 v1.9.1 prerequisite)
- Status real: `Diseno cerrado v1.9.1`
- Rank: `TBD` (debe ejecutarse antes de TASK-619 / 620.3 / 625 / 626 / 628)
- Domain: `finance`
- Blocked by: `TASK-631.1`
- Branch: `task/TASK-631.2-contract-version-enforcement`

## Summary

Formalizar los contracts del quote-share pipeline (RenderQuotationPdfInput, email template context, short-link format, GCS object path) como **frozen contracts** versionados con tests bloqueantes que detectan cambios silenciosos. Auto-bump del `QUOTE_PDF_TEMPLATE_VERSION` cuando el contract cambia. Zod schemas para email template variables.

## Why This Task Exists

Hoy estos contracts son TypeScript interfaces mutables. Cualquier dev puede agregar/quitar campos sin que el cache layer (TASK-631 Fase 4) detecte el cambio y regenere los PDFs cacheados. Riesgo concreto:

- Dev agrega `salesRep.linkedinUrl` al `RenderQuotationPdfInput`
- Cache existente NO sabe del campo nuevo, sirve PDF viejo sin LinkedIn link
- Cliente reporta inconsistencia entre lo que ve en el portal y el PDF descargado

Email template variable shapes son aun mas frageil: cambio en `context.totalLabel` rompe templates de email enviado a clientes.

## Goal

- 4 frozen contracts versionados:
  - `RenderQuotationPdfInput` v1
  - Email template context (per template: quote-share, signature-requested, signed-by-client, etc.)
  - `ShortLinkRecord` shape
  - GCS object path constants
- Tests bloqueantes que detectan estructura del contract con snapshot
- `QUOTE_PDF_TEMPLATE_VERSION` se auto-bumpea cuando contract cambia (script CI que detecta diff y exige bump)
- Zod runtime validators en endpoints que reciben estos contracts para fail-fast en payload invalido
- Documentacion en `docs/architecture/GREENHOUSE_QUOTE_SHARE_CONTRACTS_V1.md` (nuevo)

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` Delta v1.9.1

Reglas obligatorias:

- contracts versionados con `as const` + JSDoc tags `@version 1`
- breaking change al contract requires bump explicito de version + auto-bump template_version
- Zod schemas como source of truth runtime; TS interfaces derivados via `z.infer<>`
- snapshot tests no-flakeable: estructura serializada con keys ordenados alfabeticamente

## Dependencies & Impact

### Depends on

- TASK-631.1 (test infra ya configurada)

### Blocks / Impacts

- **TASK-619** (signature) — agrega campos al RenderQuotationPdfInput? -> requires bump
- **TASK-620.3** (composer nesting) — modifica composition shape? -> requires bump
- **TASK-625** (i18n) — agrega `language` al contract? -> requires bump
- **TASK-626** (tax engine) — agrega `taxBreakdown` al PDF input? -> requires bump
- **TASK-628** (amendment) — nuevo contract `AmendmentPdfInput`? -> creates new version

### Files owned

- `src/lib/finance/pdf/contracts/v1.ts` (nuevo, exports `RenderQuotationPdfInputV1` con `as const` + tag `@version 1`)
- `src/lib/finance/pdf/contracts/index.ts` (nuevo, re-exports current version + `CURRENT_CONTRACT_VERSION`)
- `src/lib/finance/pdf/contracts/__tests__/contract-snapshot.test.ts` (nuevo)
- `src/lib/email/contracts/quote-share.ts` (nuevo, Zod schema)
- `src/lib/email/contracts/signature-requested.ts` (nuevo)
- `src/lib/email/contracts/__tests__/email-contracts.test.ts` (nuevo)
- `src/lib/finance/quote-share/short-link-contract.ts` (nuevo, frozen format constants)
- `src/lib/finance/quote-share/gcs-paths.ts` (nuevo, frozen path constants + helpers)
- `scripts/check-template-version-bump.ts` (nuevo, CI gate)
- `docs/architecture/GREENHOUSE_QUOTE_SHARE_CONTRACTS_V1.md` (nuevo)
- `package.json` (npm script `check:template-version`)
- `.github/workflows/*.yml` (modificado: agregar gate)

## Current Repo State

### Already exists

- `RenderQuotationPdfInput` interface en `src/lib/finance/pdf/contracts.ts`
- `QUOTE_PDF_TEMPLATE_VERSION` constante en `quote-pdf-asset.ts`
- Email templates con context object (sin schema validation)
- Short link format alphanumeric 8 chars (sin constante explicita)
- GCS path implicito en `storeSystemGeneratedPrivateAsset` calls

### Gap

- Contract es mutable sin enforcement
- Template version no se bumpea automaticamente
- Email context no es validado runtime
- Short link format no esta definido como constante
- GCS paths estan dispersos en multiples archivos

## Scope

### Slice 1 — Frozen contracts versionados (0.25 dia)

`src/lib/finance/pdf/contracts/v1.ts`:

```typescript
/**
 * Quote PDF Render Input Contract — Version 1
 * Frozen: do not modify. To add fields, create v2.ts and bump CURRENT_CONTRACT_VERSION.
 *
 * @version 1
 * @since TASK-631.2 (2026-04-25)
 */
export interface RenderQuotationPdfInputV1 {
  readonly quotationId: string
  readonly quotationNumber: string
  readonly versionNumber: number
  readonly currency: string
  readonly quoteDate: string
  readonly validUntil: string | null
  readonly clientName: string | null
  readonly organizationName: string | null
  readonly description: string | null
  readonly lineItems: readonly QuoteLineItemV1[]
  readonly totals: TotalsV1
  readonly terms: readonly TermV1[]
  readonly fxFooter: FxFooterV1 | null
  readonly legalEntity: LegalEntityV1
  readonly subBrand: 'efeonce' | 'globe' | 'wave' | 'reach'
  readonly salesRep: SalesRepV1 | null
  readonly verification: VerificationV1 | null
}

// All sub-interfaces also frozen with `readonly` everywhere
```

`src/lib/finance/pdf/contracts/index.ts`:

```typescript
export const CURRENT_CONTRACT_VERSION = 1 as const
export type RenderQuotationPdfInput = RenderQuotationPdfInputV1
// When v2 is created: change this line + update CURRENT_CONTRACT_VERSION
```

### Slice 2 — Snapshot test bloqueante (0.25 dia)

`contract-snapshot.test.ts`:

```typescript
import { RenderQuotationPdfInputV1 } from '../v1'
import { describe, it, expect } from 'vitest'

const serializeContractStructure = (typeName: string): string => {
  // Use ts-morph or similar to extract interface structure as sorted JSON string
  // Returns: { properties: [...], types: [...] } sorted alphabetically
}

describe('Contract Snapshot — Frozen Contracts', () => {
  it('RenderQuotationPdfInputV1 structure has not changed', () => {
    const current = serializeContractStructure('RenderQuotationPdfInputV1')
    const golden = readFileSync('./snapshots/RenderQuotationPdfInputV1.json', 'utf-8')
    expect(current).toBe(golden)
  })
})
```

Si dev agrega/quita campo del contract -> test rechaza merge. Para cambiar legitimo: regenerar snapshot manualmente con script + bump version.

### Slice 3 — Auto-bump template version CI gate (0.25 dia)

`scripts/check-template-version-bump.ts`:

```typescript
import { execSync } from 'child_process'

const main = async () => {
  // Get diff vs main del archivo de contracts
  const contractDiff = execSync('git diff origin/main -- src/lib/finance/pdf/contracts/').toString()

  if (contractDiff.length === 0) return  // no contract changes, nothing to enforce

  // Get diff del QUOTE_PDF_TEMPLATE_VERSION constant
  const versionDiff = execSync('git diff origin/main -- src/lib/finance/quote-share/quote-pdf-asset.ts').toString()
  const versionBumped = versionDiff.includes('QUOTE_PDF_TEMPLATE_VERSION')

  if (!versionBumped) {
    console.error('❌ Contract changed but QUOTE_PDF_TEMPLATE_VERSION not bumped.')
    console.error('Modify QUOTE_PDF_TEMPLATE_VERSION in src/lib/finance/quote-share/quote-pdf-asset.ts')
    console.error('to invalidate cached PDFs and force lazy regeneration.')
    process.exit(1)
  }

  console.log('✅ Contract change + template version bump detected.')
}

main()
```

`package.json`:

```json
"scripts": {
  "check:template-version": "tsx scripts/check-template-version-bump.ts"
}
```

GitHub Actions PR check:

```yaml
- name: Enforce Template Version Bump on Contract Changes
  run: pnpm check:template-version
```

### Slice 4 — Zod schemas email contracts (0.25 dia)

`src/lib/email/contracts/quote-share.ts`:

```typescript
import { z } from 'zod'

export const QuoteShareEmailContextSchema = z.object({
  shareUrl: z.string().url(),
  quotationNumber: z.string(),
  versionNumber: z.number().int().positive(),
  clientName: z.string(),
  recipientName: z.string().optional(),
  totalLabel: z.string(),
  validUntilLabel: z.string().nullable(),
  senderName: z.string(),
  senderRole: z.string().nullable(),
  senderEmail: z.string().email().nullable(),
  customMessage: z.string().nullable(),
  hasPdfAttached: z.boolean(),
  pdfFileName: z.string().nullable(),
  pdfSizeBytes: z.number().nullable(),
  subject: z.string()
}).strict()

export type QuoteShareEmailContext = z.infer<typeof QuoteShareEmailContextSchema>
```

Modificar `sendEmail` calls en `send-email/route.ts` y `resend-email/route.ts` para validar `context` con `QuoteShareEmailContextSchema.parse(context)` antes de enviar -> fail-fast si payload invalido.

Tests:

- Email context valido -> pasa
- Email context con campo missing -> ZodError thrown
- Email context con tipo wrong -> ZodError thrown

### Slice 5 — Short-link + GCS path constants (~mezclado en otros slices)

`src/lib/finance/quote-share/short-link-contract.ts`:

```typescript
export const SHORT_LINK_FORMAT = {
  length: 8,
  alphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',  // no I, O, 0, 1 para evitar confusion
  pattern: /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/
} as const

export const validateShortCode = (code: string): boolean => SHORT_LINK_FORMAT.pattern.test(code)
```

`src/lib/finance/quote-share/gcs-paths.ts`:

```typescript
export const GCS_QUOTE_PDF_PATHS = {
  bucketPrefix: 'quotation-pdfs',
  buildObjectPath: (quotationId: string, versionNumber: number, fileName: string) =>
    `quotation-pdfs/${quotationId}/v${versionNumber}/${fileName}`,
  // En TASK-619.1 (signed PDF storage): adicional path
  signedDocumentsBucketPrefix: 'signed-documents/quotes',
  buildSignedDocumentPath: (quotationId: string, versionNumber: number) =>
    `signed-documents/quotes/${quotationId}/v${versionNumber}/signed.pdf`
} as const
```

Tests de stability: las constantes no cambian en futuros refactors, tests las verifican.

### Slice 6 — Documentacion arquitectonica (~0.05 dia)

`docs/architecture/GREENHOUSE_QUOTE_SHARE_CONTRACTS_V1.md`:

- Lista de los 4 frozen contracts + version actual
- Como agregar campo al contract (process: crear v2, deprecate v1, update CURRENT_CONTRACT_VERSION)
- Como bumpear `QUOTE_PDF_TEMPLATE_VERSION` correctamente
- Schema validation flow para email contexts
- Anti-patterns: que NO hacer (modificar v1 directamente)

## Out of Scope

- Migracion de v1 a v2 (esta task crea infra, futuras tasks lo usan)
- Contracts para signature documents (TASK-619 los crea)
- Contracts para amendment PDFs (TASK-628 los crea)
- Polymorphic contracts (multi-template) — single template confirmed v1.4

## Acceptance Criteria

- [ ] 4 frozen contracts creados con `as const` + `readonly` everywhere
- [ ] snapshot tests bloqueantes para estructura
- [ ] auto-bump CI gate funcional
- [ ] Zod schemas para email contexts + runtime validation en endpoints
- [ ] short-link + GCS path constants documentados
- [ ] doc arquitectura publicado
- [ ] tests passing
- [ ] Specs del programa CPQ (619, 620.3, 625, 626, 628) actualizadas con instruccion explicita "incrementar version del contract si modifican RenderQuotationPdfInput"

## Verification

- Modificar `RenderQuotationPdfInputV1` (agregar campo dummy) sin bump version -> CI rechaza merge
- Bumpear version sin modificar contract -> OK pero warning
- Email send con context invalido (e.g. `versionNumber: "not-a-number"`) -> ZodError thrown, email NOT enviado

## Closing Protocol

- [ ] Lifecycle sincronizado
- [ ] README + Handoff actualizados
- [ ] `docs/architecture/GREENHOUSE_QUOTE_SHARE_CONTRACTS_V1.md` publicado
- [ ] CI workflow merged
- [ ] TASK-619 / 620.3 / 625 / 626 / 628 specs actualizados con seccion "Quote Share Compat Check"
