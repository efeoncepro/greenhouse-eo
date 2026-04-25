# TASK-625 — Multi-language i18n del Programa CPQ (PDF + composer + notifications + ZapSign)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio` (alto cuando Globe clients crezcan)
- Effort: `Medio` (~3 dias, expandido de 2 dias original)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque E)
- Status real: `Diseno cerrado v1.9`
- Rank: `TBD`
- Domain: `ui` / `content`
- Blocked by: `TASK-630, TASK-619.3, TASK-620.3`
- Branch: `task/TASK-625-multi-language-cpq-i18n`

## Summary

Internacionalizacion completa del programa CPQ a ES + EN: PDF de quote, composer UI, notification templates email/Slack, ZapSign envelope language, validation errors del constraint registry. Resolution per-quote: `client.preferred_language` -> override de `tenant.default_language`. Tagline para Globe clients enterprise (USA, mercados internacionales).

## Why This Task Exists

RESEARCH-005 v1.6 mencionaba TASK-625 como "PDF multi-language" pero v1.9 expandio scope tras gap detectado: i18n debe cubrir TODAS las superficies del programa CPQ, no solo el PDF. Sin esto, Globe client recibe email + ZapSign + notifications en español aunque el cliente sea de USA.

## Goal

- next-intl o i18next library installed (verificar si no existe)
- Translation files ES + EN para 6 surfaces: composer, picker, drawer, notifications, validation messages, PDF
- Resolution chain: `client.preferred_language` ?? `tenant.default_language` ?? 'es'
- ZapSign envelope language matches signer language
- PDF rendering en idioma del cliente
- Composer UI translatable (sales rep en EN tambien posible)

## Architecture Alignment

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/research/RESEARCH-005...` Delta v1.9

## Dependencies & Impact

### Depends on

- TASK-630 (rich text editor — descripciones rich html no se traducen automatic, decision per item: traducir manual o stay)
- TASK-619.3 (notification templates)
- TASK-620.3 (composer UI labels)
- `client.preferred_language` columna en `clients` table (verificar si existe)

### Files owned

- `migrations/YYYYMMDD_task-625-preferred-language-cols.sql` (si no existe)
- `src/i18n/messages/{es,en}.json` (nuevos)
- `src/i18n/config.ts` (nuevo o existente)
- 4-6 components modificados con strings extraidos a translations
- `src/lib/email/templates/*.tsx` (modificados con i18n)
- `src/lib/finance/pdf/quotation-pdf-document.tsx` (modificado con i18n)
- `src/lib/integrations/zapsign/client.ts` (modificado: pasa lang correcto)

## Scope

### Slice 1 — i18n infra setup (0.5 dia)

Verificar si next-intl ya esta. Si no:
- `pnpm add next-intl`
- Setup `src/i18n/config.ts`
- Locale switcher en sidebar (para sales reps EN)
- Persist preference en `tenant.preferred_language`

### Slice 2 — Translations files (1 dia)

`src/i18n/messages/es.json` + `src/i18n/messages/en.json` con keys:
- `composer.*` (TASK-620.3 strings)
- `picker.*` (TASK-620.4)
- `notifications.signature.*` (TASK-619.3)
- `validation.constraints.*` (constraint registry messages)
- `pdf.*` (TASK-629 PDF section labels)
- `email.subject.*` y `email.body.*`

### Slice 3 — Component refactor (1 dia)

Wrappear strings con `useTranslations('namespace')` hook. Componentes afectados:
- `ServiceModuleComposer`
- `QuoteCatalogPicker`
- `AdHocBundleModal`
- `QuoteSignaturePanel`
- `RenewalsInboxView` (TASK-624)
- `ApprovalsInboxView` (TASK-622)

### Slice 4 — Email + PDF + ZapSign per-language (0.5 dia)

```typescript
const renderEmailTemplate = (templateName, context, locale) => {
  const t = await getTranslations(locale, 'email.signature')
  return <Template subject={t('subject', context)} body={t('body', context)} />
}

const generateQuotePdf = async (quoteInput, locale) => {
  const t = await getTranslations(locale, 'pdf.quote')
  return renderQuotationPdf({ ...quoteInput, t })
}

const createZapSignEnvelope = async (quote, signers) => {
  const language = resolveSignerLanguage(signers[0])  // 'es' or 'en'
  return zapsign.createDocument({ ...payload, lang: language })
}
```

### Slice 5 — Tests + QA (~0.5 dia mezclado en slices anteriores)

- Snapshot tests: PDF en ES vs EN identicos en estructura, diferentes en contenido
- Email rendering test ES + EN
- ZapSign payload test pasa lang correcto

## Out of Scope

- Auto-translation de descriptions rich html (TipTap content) - requeriria AI, queda como TASK-625.1 futura
- Idiomas mas alla de ES + EN (PT-BR cuando Brasil entre, etc.) - aditivo trivial post v1
- RTL languages (no aplica para ES/EN)

## Acceptance Criteria

- [ ] next-intl installed + configured
- [ ] 6 namespaces de translations completos
- [ ] PDF renders en ambos idiomas
- [ ] ZapSign envelope language correcto
- [ ] notification templates ES + EN
- [ ] composer UI translatable
- [ ] resolution chain `client > tenant > default` enforced
- [ ] tests passing

## Verification

- Cliente Globe USA con `preferred_language=en`: recibir quote PDF en inglés + ZapSign envelope en inglés + email recordatorio en inglés
- Cliente Acme Chile con `preferred_language=es`: todo en español

## Closing Protocol

- [ ] Lifecycle sincronizado
- [ ] Handoff con screenshots PDF en ES vs EN
- [ ] `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` updated con seccion i18n
