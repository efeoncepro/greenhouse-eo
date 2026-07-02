# Overlay Efeonce / Greenhouse — índice

> Aterriza la doctrina portable de Marketing Digital en el runtime real de Greenhouse.
> Los conceptos genéricos viven en `../modules/`; aquí van los mapeos, boundaries y paths
> reales verificados. **Reverifica el estado en el repo** (specs y código cambian).

## Cuándo usar este overlay

Cuando el trabajo de marketing digital toca el runtime Greenhouse o el sitio público de
Efeonce: marca/voz, content engine (AI Content Factory), email como canal, o los gaps de
martech del repo. Para marketing genérico basta con `../modules/`.

## Archivos del overlay

| Archivo | Qué cubre |
|---|---|
| `DIGITAL_MARKETING_BOUNDARY.md` | La costura completa DM vs growth-marketing-cro vs seo-aeo vs commercial-expert vs efeonce-agency + regla de precedencia. |
| `BRAND_VOICE_IN_MARKET.md` | SSOT de marca (`src/config/efeonce-brand.ts`) + voz es-CL; expresión de marca en campañas; ilustraciones propietarias. |
| `CONTENT_ENGINE.md` | AI Content Factory (`src/lib/public-site/content-factory/**`) + skill `efeonce-public-site-wordpress`; content marketing en el repo. |
| `EMAIL_CHANNEL.md` | `src/lib/email/**` + `src/emails/**` + skill `greenhouse-email`; email marketing (canal) vs transaccional; deliverability. |
| `CHANNELS_AND_MARTECH_GAPS.md` | Qué EXISTE vs GAPS (social/Metricool, UTM/tag-mgmt site-wide, HubSpot=CRM); MCP disponibles. **No inventar paths.** |

## Boundary duro (hand-offs, repetido por seguridad)

Esta skill decide **cómo traer/enganchar audiencia y ejecutar campañas por canal**. NO invade:

- **Conversión/CRO, experimentación, activación, retención, arquitectura de atribución/tracking,
  loops, PLG** → `growth-marketing-cro` (+ su overlay). **Es la costura crítica** →
  `DIGITAL_MARKETING_BOUNDARY.md`.
- **SEO técnico / AEO / GEO por-motor / schema / entidad** → `seo-aeo` (Codex-only).
- **Pricing, quote-to-cash, pipeline, RevOps de venta** → `commercial-expert` (Claude-only).
- **Doctrina de marca / ASaaS / GTM / modelo de negocio** → `efeonce-agency`.
- **Publishing del sitio público + AI Content Factory (ejecución)** → `efeonce-public-site-wordpress`.
- **Plantillas y entrega de email runtime** → `greenhouse-email` (Claude-only) + `src/lib/email/**`.
- **Copy/UX-writing final** → `src/lib/copy/` + `greenhouse-ux-content-accessibility` (Codex-only).
- **Logos de medios de pago** → `greenhouse-digital-brand-asset-designer` (NO para marca general).

> Nota cross-runtime: algunas skills vecinas existen solo en un runtime (`seo-aeo` y
> UX-writing = Codex; `greenhouse-email` y overlay `commercial-expert` = Claude). Al encadenar,
> nombra la sibling y aclara el runtime.

## Context pack de negocio (leer para GTM/ICP/marca/voz)

`docs/context/` (empezar por `00_INDEX.md`): `02_gtm.md`, `05_voz-tono-estilo.md` (voz es-CL),
`08_estrategia-comercial.md`, `09_marca-agencia.md` (marca Efeonce), `11_hubspot-bowtie.md`,
`13_icp-buyer-personas-jtbd.md`, `14_modelo-negocio-asaas.md`.

## Fuentes de verdad (reverificar estado)

- `src/config/efeonce-brand.ts` (SSOT marca), `docs/context/**`
- `src/lib/public-site/content-factory/**`, `docs/documentation/public-site/**`
- `src/lib/email/**`, `src/emails/**`
- `src/lib/hubspot/**` (CRM), `src/growth-forms-renderer/telemetry.ts` (UTM en forms)
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
