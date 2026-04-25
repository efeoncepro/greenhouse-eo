# TASK-568 — Typography in Delivery Surfaces: Email Stack + PDF Font Registration

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio` (delivery surfaces externas — emails, PDFs)
- Effort: `Medio` (~1 día)
- Type: `implementation`
- Epic: `EPIC-004`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui` + `platform`
- Blocked by: `TASK-566`
- Branch: `task/TASK-568-typography-email-pdf`

## Summary

Extender la nueva política tipográfica (Poppins h1-h4 + Geist body + Geist Mono mono) a las **surfaces de delivery externa** del portal: emails transaccionales (`src/emails/*`) y generación de PDF (`@react-pdf/renderer` en quote PDFs, payroll receipts, DTE PDFs). Emails requieren stack fallback inline porque no cargan custom fonts confiablemente. PDFs requieren `Font.register()` explícito por tipo de font.

## Why This Task Exists

Las surfaces de delivery externa **no heredan del theme del portal** automáticamente:

1. **Emails HTML** (Gmail, Outlook, iCloud, Yahoo) no cargan `next/font/google` ni CSS variables. Necesitan `font-family` explícito inline en `<style>` blocks con stack fallback robusto a system fonts.

2. **PDFs generados con `@react-pdf/renderer`** corren en un runtime Node.js que no conoce las fonts del browser. Requieren `Font.register({ family, src })` por cada font + weight antes de poder usarla en el JSX del PDF.

Sin este task:
- Emails seguirían usando fallback system default (probablemente Arial/Helvetica), sin branding.
- PDFs renderizarían con la font default de `@react-pdf` (Helvetica), no con la brand voice del portal.

## Goal

- Email templates `src/emails/*`: declaran stack `Geist` + fallbacks + stack `Poppins` para headings marketing si aplica.
- PDF generators registran las 3 fonts (Poppins, Geist, Geist Mono) via `Font.register()`.
- Quote PDF, payroll receipts, DTE PDFs renderizan con typography alineada al portal.
- Test manual de rendering: enviar email a Gmail/Outlook/iCloud, descargar PDF de quote/receipt y validar.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §3.1 (post-566 rewrite)
- `docs/epics/to-do/EPIC-004-typography-unification-poppins-geist.md`

Reglas obligatorias:

- Emails usan stack inline, nunca custom font files hospedados (problemas de cache, tracking, CSP).
- PDFs usan `Font.register()` con URLs a Google Fonts API o archivos locales en `public/fonts/`.
- Fallback emails: `'Geist', 'Helvetica', 'Arial', sans-serif` para body; `'Poppins', 'Helvetica', 'Arial', sans-serif` para headings marketing.
- `fontFamily: 'monospace'` prohibido también en emails y PDFs — usar Geist Mono o fallback `'Courier New', monospace`.

## Normative Docs

- `docs/epics/to-do/EPIC-004-typography-unification-poppins-geist.md`
- `docs/tasks/to-do/TASK-566-typography-foundation-geist-poppins-theme.md` (debe estar complete)

## Dependencies & Impact

### Depends on

- `TASK-566` — foundation del theme debe estar landed (define las fonts canónicas del sistema)

### Blocks / Impacts

- No bloquea a 567 (pueden correr en paralelo post-566)
- Bloquea cierre del epic (TASK-569 necesita 567 + 568 complete)

### Files owned

- `src/emails/components/*` — shared layout y heading components
- `src/emails/constants.ts` — font-family constants
- `src/emails/InvitationEmail.tsx`
- `src/emails/LeaveRequestDecisionEmail.tsx`
- `src/emails/LeaveRequestPendingReviewEmail.tsx`
- `src/emails/LeaveRequestSubmittedEmail.tsx`
- `src/emails/LeaveReviewConfirmationEmail.tsx`
- `src/emails/NotificationEmail.tsx`
- `src/emails/PasswordResetEmail.tsx`
- `src/emails/PayrollExportReadyEmail.tsx`
- `src/emails/PayrollLiquidacionV2Email.tsx`
- `src/emails/PayrollReceiptEmail.tsx`
- `src/emails/VerifyEmail.tsx`
- `src/emails/WeeklyExecutiveDigestEmail.tsx`
- `src/lib/finance/pdf/quotation-pdf-document.tsx`
- `src/lib/finance/pdf/render-quotation-pdf.ts`
- `src/lib/payroll/generate-payroll-pdf.tsx`
- `src/app/api/finance/income/[id]/dte-pdf/route.ts` [verificar si tiene font hardcoded]
- `src/app/api/finance/expenses/[id]/dte-pdf/route.ts` [verificar]
- Nuevo: `src/lib/pdf/font-registration.ts` — helper centralizado para `Font.register()` calls (DRY)

## Current Repo State

### Already exists

- 13 email templates en `src/emails/*.tsx`
- `src/emails/components/EmailLayout.tsx` — shared layout con `<style>` inline [verificar contenido]
- `src/emails/constants.ts` — probable location de font constants [verificar]
- PDF generators:
  - `src/lib/finance/pdf/quotation-pdf-document.tsx` — Quote PDF
  - `src/lib/payroll/generate-payroll-pdf.tsx` — Payroll liquidación
  - API routes que invocan los generators
- `@react-pdf/renderer` v4.3 instalado en package.json

### Gap

- Emails usan font stack actual (DM Sans o fallback). Post-566 ya no debería ser DM Sans. Confirmar que stack usa Geist ahora o declararlo.
- PDFs probablemente no registran ninguna font custom — usan default Helvetica de @react-pdf. Branding perdido en PDF output.
- No hay helper centralizado `font-registration.ts` — cada PDF generator haría `Font.register()` aislado, genera duplicación.

## Scope

### Slice 1 — Email font stack

- Leer `src/emails/components/EmailLayout.tsx` y `src/emails/constants.ts` actual
- Actualizar `<style>` inline para declarar:
  ```css
  body, .body { font-family: 'Geist', 'Helvetica', 'Arial', sans-serif; }
  h1, h2, h3, h4, .heading { font-family: 'Poppins', 'Helvetica', 'Arial', sans-serif; }
  code, .mono { font-family: 'Geist Mono', 'Courier New', monospace; }
  ```
- Si emails usan `@react-email/components` `<Font>` tag para cargar desde Google Fonts: actualizar a Geist + Poppins + Geist Mono. Si no, usar solo stack system fallback.
- Update `constants.ts` con `FONT_STACKS` export para reusar across emails
- Revisar cada email individual (13 archivos) y confirmar que usan los stacks del layout/constants, no hardcoded

### Slice 2 — PDF Font helper centralizado

- Crear `src/lib/pdf/font-registration.ts`:
  ```tsx
  import { Font } from '@react-pdf/renderer'

  let registered = false

  export const ensureFontsRegistered = () => {
    if (registered) return

    Font.register({
      family: 'Geist',
      fonts: [
        { src: 'https://fonts.gstatic.com/s/geist/v1/geist-regular.ttf', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/geist/v1/geist-medium.ttf', fontWeight: 500 },
        { src: 'https://fonts.gstatic.com/s/geist/v1/geist-semibold.ttf', fontWeight: 600 },
        { src: 'https://fonts.gstatic.com/s/geist/v1/geist-bold.ttf', fontWeight: 700 }
      ]
    })

    Font.register({
      family: 'Geist Mono',
      fonts: [
        { src: 'https://fonts.gstatic.com/s/geist-mono/v1/geist-mono-regular.ttf', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/geist-mono/v1/geist-mono-medium.ttf', fontWeight: 500 }
      ]
    })

    Font.register({
      family: 'Poppins',
      fonts: [
        { src: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecg.ttf', fontWeight: 500 },
        { src: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJnecmNE.ttf', fontWeight: 600 },
        { src: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJbecmNE.ttf', fontWeight: 700 },
        { src: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJhecmNE.ttf', fontWeight: 800 }
      ]
    })

    registered = true
  }
  ```
- **Nota**: URLs exactas de gstatic deben verificarse en Discovery — Google Fonts tiene URLs versionadas que cambian. Alternativa: hospedar fonts en `public/fonts/` del propio repo para control total.
- Slice puede optar por `public/fonts/` si se prefiere no depender de gstatic URLs

### Slice 3 — Integrar helper en PDF generators

- `src/lib/finance/pdf/quotation-pdf-document.tsx`: llamar `ensureFontsRegistered()` al inicio, usar `fontFamily: 'Geist'` / `'Poppins'` / `'Geist Mono'` en los `<Text>` / `<View>` según rol
- `src/lib/finance/pdf/render-quotation-pdf.ts`: igual
- `src/lib/payroll/generate-payroll-pdf.tsx`: igual
- Cualquier otro PDF generator descubierto en sweep

### Slice 4 — Update styles dentro de los PDFs

Aplicar la misma política del portal en los PDFs:
- Page titles / section titles en Poppins weight 600-700
- Body text en Geist 400-500
- Quotation numbers, IDs, totals en Geist Mono weight 400-500

Ajustar los StyleSheets internos de cada PDF generator.

### Slice 5 — Manual testing

- Enviar email de invitación, leave request decision, payroll receipt — inspeccionar en Gmail, Outlook (web + desktop), iCloud Mail
- Descargar quote PDF, payroll receipt PDF, DTE PDF — abrir en Preview (macOS), Acrobat Reader (Windows), Chrome PDF viewer
- Validar que fonts renderizan como esperado (o fallback correcto si el client no las carga)

## Out of Scope

- **No tocar `mergedTheme.ts`, `app/layout.tsx`, `GREENHOUSE_DESIGN_TOKENS_V1.md`**. TASK-566.
- **No tocar componentes de product UI en browser**. TASK-567.
- **No hacer ESLint rule**. TASK-567.
- **No hacer visual regression sweep del portal browser**. TASK-569.
- **No rediseñar los emails** (layout, contenido, estructura). Solo swap de fontFamily.
- **No rediseñar los PDFs**. Solo swap de fontFamily.

## Detailed Spec

### Email `<style>` block shape (EmailLayout.tsx o equivalente)

```tsx
<style>
  {`
    body {
      font-family: 'Geist', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;
      /* ... otras propiedades existentes ... */
    }

    h1, h2, h3, h4 {
      font-family: 'Poppins', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;
    }

    code, .mono, .id-display {
      font-family: 'Geist Mono', 'SF Mono', 'Courier New', monospace;
    }
  `}
</style>
```

Si el repo usa `@react-email/components` con `<Font>`:

```tsx
<Font fontFamily='Geist' fallbackFontFamily='Helvetica' webFont={{ url: 'https://fonts.googleapis.com/...', format: 'woff2' }} />
<Font fontFamily='Poppins' fallbackFontFamily='Helvetica' webFont={{ url: '...' }} />
<Font fontFamily='Geist Mono' fallbackFontFamily='Courier New' webFont={{ url: '...' }} />
```

### `src/emails/constants.ts` — new FONT_STACKS export

```ts
export const FONT_STACKS = {
  body: "'Geist', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
  heading: "'Poppins', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
  mono: "'Geist Mono', 'SF Mono', 'Courier New', monospace"
} as const
```

Referencia en emails via `style={{ fontFamily: FONT_STACKS.body }}`.

### PDF StyleSheet ejemplo (quotation-pdf-document.tsx)

```tsx
import { StyleSheet } from '@react-pdf/renderer'
import { ensureFontsRegistered } from '@/lib/pdf/font-registration'

ensureFontsRegistered()

const styles = StyleSheet.create({
  pageTitle: {
    fontFamily: 'Poppins',
    fontWeight: 600,
    fontSize: 24
  },
  body: {
    fontFamily: 'Geist',
    fontWeight: 400,
    fontSize: 11
  },
  quotationNumber: {
    fontFamily: 'Geist Mono',
    fontWeight: 500,
    fontSize: 10
  }
})
```

## Acceptance Criteria

- [ ] `src/emails/constants.ts` exporta `FONT_STACKS` con 3 stacks (`body`, `heading`, `mono`) usando Geist + Poppins + Geist Mono con fallback system fonts
- [ ] `src/emails/components/EmailLayout.tsx` usa los stacks en su `<style>` inline (o equivalente estructura)
- [ ] Los 13 email templates usan `FONT_STACKS` (no tienen `fontFamily` hardcoded ni diferente)
- [ ] `src/lib/pdf/font-registration.ts` nuevo archivo con `ensureFontsRegistered()` helper
- [ ] `src/lib/finance/pdf/quotation-pdf-document.tsx` llama `ensureFontsRegistered()` y usa `fontFamily: 'Geist'/'Poppins'/'Geist Mono'`
- [ ] `src/lib/payroll/generate-payroll-pdf.tsx` igual
- [ ] Cualquier otro PDF generator encontrado en sweep igual
- [ ] Manual: email renderiza con Geist en Gmail web (o fallback Helvetica si no carga)
- [ ] Manual: quote PDF descargado tiene page title en Poppins, body en Geist, quotation number en Geist Mono
- [ ] Manual: payroll receipt PDF mismo chequeo
- [ ] `pnpm lint` pasa
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa (tests de emails existentes — `PayrollExportReadyEmail.test.tsx`, `PayrollReceiptEmail.test.tsx` — no rompen)

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test` (incluye `PayrollExportReadyEmail.test.tsx`, `PayrollReceiptEmail.test.tsx`)
- `pnpm build`
- Manual email preview (usar `pnpm` script si existe para preview de emails, sino usar Resend test endpoint)
- Manual PDF generation: descargar quote PDF desde `/finance/quotes/[id]`, descargar payroll receipt
- Open PDFs in Preview/Acrobat y verify fonts correctas

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en `docs/tasks/complete/`
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado (cambio visible en delivery surfaces)
- [ ] `changelog.md` actualizado
- [ ] Chequeo cruzado: TASK-569 desbloqueada si TASK-567 también cerrada
- [ ] EPIC-004 `Child Tasks` actualizado
- [ ] Tests de emails + PDFs ejecutados y passing

## Follow-ups

- Considerar hospedar fonts en `public/fonts/` del repo (en vez de depender de gstatic URLs) para control total + no network dependency en PDF generation serverless.
- Si hay email previewer (React Email dev server), actualizar para cargar Geist en el preview env.
- Si Vercel/CI corre PDF generation en env sin outbound network a gstatic, asegurar fallback local.

## Open Questions

- ¿Los emails usan `@react-email/components` `<Font>` tag o solo `<style>` inline? **Resolver en Discovery** leyendo `EmailLayout.tsx`.
- ¿Las URLs `gstatic.com` de Geist y Geist Mono están disponibles en formato `.ttf` (requerido por `@react-pdf`)? Google Fonts API devuelve `.woff2` por default. **Resolver en Discovery** — puede que haya que hostear fonts en `public/fonts/` como `.ttf`.
- ¿Tests de email (`*Email.test.tsx`) dependen del contenido de `fontFamily`? **Default assumed**: no, tests validan contenido semántico, no CSS. Confirmar en Discovery.
- ¿Hay algún email o PDF no listado arriba? **Resolver en Discovery** con grep `@react-pdf/renderer` y `@react-email`.
