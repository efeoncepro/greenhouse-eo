# TASK-1250 / Email — AI Visibility Report Delivery (Report Packet Delivery)

## Meta

- Surface: email transaccional (React Email) — lead magnet público de **Efeonce (agencia)**, NO el portal Greenhouse.
- UI rigor: `ui-lite` (email-client constraints; sin web layout system).
- Copy source: `src/lib/copy/dictionaries/es-CL/emails.ts` → `growth.aiVisibilityReport` + `subjects.aiVisibilityGraderReport`.
- Primitive decision: `reuse` — `EmailLayout` (con prop nuevo `brand='efeonce'`), `EmailButton`, tablas inline + tokens `EMAIL_COLORS`/`EMAIL_FONTS`.

## Brief

Cierra el intercambio de valor del lead magnet: el prospecto recibe su diagnóstico en el inbox como **paquete de entrega auditable** (no solo notificación). Dirección de Product Design aprobada 2026-06-25: **Report Packet Delivery** (Opción 2), mezclando el score compacto de la Opción 1 y el bloque insight `qué detectamos / por qué importa / qué hacer ahora` de la Opción 3.

Assets aprobados (SoT visual): `docs/assets/product-design/task-1250-ai-visibility-email-report-delivery/{report-packet-delivery,executive-snapshot-email,insight-to-action-email}.png`.

## Layout Skeleton

```
┌─ EmailLayout (brand='efeonce') ─────────────────────────┐
│  Masthead navy + wordmark Efeonce blanco                │
│  H: "Recibiste tu informe completo" (parcial: variante) │
│  Intro: "Analizamos la visibilidad de <marca>…"         │
│  [banner ámbar si parcial]                              │
│  ┌ Resumen (tabla inline) ─────────────────┐            │
│  │ Visibilidad estimada   72 / 100          │            │
│  │ Nivel                  Intermedio        │            │
│  │ Brecha principal       <gap>             │            │
│  │ Contenido              Público           │            │
│  └──────────────────────────────────────────┘           │
│  ┌ Insight #1 (qué/por qué/qué hacer) ──────┐            │
│  └──────────────────────────────────────────┘           │
│  [ Abrir informe seguro ] (EmailButton → link token)    │
│  ┌ Adjunto: informe-…pdf · PDF · ~peso ─────┐            │
│  ┌ ¿Por qué recibiste este informe? ────────┐            │
│  Fallback: enlace seguro (texto plano)                  │
│  Footer: eslogan Efeonce + automated disclaimer         │
└──────────────────────────────────────────────────────────┘
```

## Copy Ledger

Todo en `emails.ts → growth.aiVisibilityReport` (heading, headingPartial, greeting, intro, partialBanner, summary.*, insight.*, cta, ctaHelp, attachment.*, why.*, fallback.*, automatedFooter) + subject `subjects.aiVisibilityGraderReport(isPartial)`. en-US fallback inline en el template (`LEGACY_EN_AI_VISIBILITY_REPORT_EMAIL_COPY`).

## State Copy

- Default (ready): heading "Recibiste tu informe completo", score real, insight si hay recomendación.
- Parcial (gate `partial`): heading "Tu informe de visibilidad está listo" + banner ámbar honesto.
- Score nulo: "Sin dato" (nunca 0); nivel/insight se omiten si no derivables.
- No se envía: gate `review_required`/`insufficient_data` (el dispatch corta antes).

## Accessibility Contract

- Subject claro + plain-text fallback completo (lectores que no renderizan HTML).
- CTA con texto explícito ("Abrir informe seguro"), fallback con el URL crudo visible.
- Sin motion (email). Color nunca es el único portador (severidad va con texto).

## Implementation Mapping

- Route / surface: email template `src/emails/AiVisibilityGraderReportEmail.tsx` (no web route).
- Primitives: `EmailLayout` (prop `brand`), `EmailButton`, tablas inline, tokens `EMAIL_COLORS`/`EMAIL_FONTS`.
- Copy source: `src/lib/copy/dictionaries/es-CL/emails.ts`.
- Data contract: props construidas server-side por `dispatchAiVisibilityReportEmail` desde `modelFromPublicReport(publicReport, 'attachment')` (leak-safe). Adjunto: `buildAiVisibilityReportAttachment` → `renderAiVisibilityReportPdf`.
- API parity: `EmailType` `ai_visibility_grader_report` registrado; envío vía `sendEmail()` (un primitive, consumers = reactive worker + admin preview).

## GVC Scenario Plan

GVC (Playwright web capture) **no aplica** a esta superficie: es un email, no una ruta web. Verificación visual equivalente:

- Admin preview: `GET /api/admin/emails/preview?template=ai_visibility_grader_report&locale=es` (+ `&locale=en`).
- Dev preview: `pnpm email:dev` (puerto 3001) con default props.
- Baseline test (`AiVisibilityGraderReportEmail.test.tsx`): render es/en + banner parcial + score null + guard de marca Efeonce.

## Design Decision Log

- **Marca Efeonce, no Greenhouse** (corrección del operador 2026-06-27): el lead magnet es de la agencia; su adjunto PDF ya es Efeonce. `EmailLayout` gana `brand='efeonce'` (default greenhouse → 0 cambio a los 18 templates). "Efeonce Greenhouse" NO es marca (deuda histórica) → no se usa.
- **Insight compacto incluido** (decisión del operador): 1 insight prioritario en 3 filas, desde la recomendación #1 del `PublicGraderReport`. Activación comercial sin inflar el correo; el detalle vive en el PDF/link.
- **Reuse > new**: `EmailLayout`/`EmailButton` existentes + tokens email; no se introduce un layout web. El adjunto reusa el renderer PDF de TASK-1273.

## Acceptance Checklist

- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan (admin/dev preview + baseline test; web GVC N/A para email).
- [x] Design decision log explains reuse/extend/new (marca Efeonce + insight + reuse) before JSX.
