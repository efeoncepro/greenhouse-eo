# Canales y martech: qué existe vs qué NO (no inventar paths)

> Regla de honestidad: distingue lo que tiene runtime en el repo de lo que solo existe como MCP
> o no existe. **No apuntes el overlay a paths fantasma.** Aplica `../modules/08` sobre lo real.

## Lo que EXISTE en el repo (runtime)

- **SSOT de marca:** `src/config/efeonce-brand.ts` (`../efeonce/BRAND_VOICE_IN_MARKET.md`).
- **Content engine:** `src/lib/public-site/content-factory/**` + sitio público
  (`../efeonce/CONTENT_ENGINE.md`).
- **Email infra:** `src/lib/email/**` + `src/emails/**` + `deliverability-monitor`
  (`../efeonce/EMAIL_CHANNEL.md`).
- **UTM en forms:** `src/growth-forms-renderer/telemetry.ts` + `src/lib/growth/forms/contracts.ts`
  capturan UTM **en la submission de un formulario**. Es la única captura de UTM del repo.
- **HubSpot:** `src/lib/hubspot/**` — **CRM/commercial** (deals, products, quotes, company
  lifecycle) + cross-sell del AEO grader. Escritura nueva vía cliente in-app directo
  (`getHubSpotAccessToken` + fetch), NO el bridge Cloud Run legacy.
- **Lead forms:** `src/lib/growth/forms/**` → skill `greenhouse-growth-forms`.

## Lo que NO existe en el repo (declararlo, no inventarlo)

- **Social media / Metricool:** **no hay integración en el código.** (Los hits de `metricool`/
  `instagram`/`linkedin` en grep son strings incidentales.) Social scheduling/analytics solo vía
  **MCP Metricool** cuando el entorno lo exponga.
- **UTM / tag management site-wide:** **no hay** librería de atribución ni GTM/dataLayer en el
  app source (solo la captura de UTM en forms, arriba). El tracking engine que gobernaría esto
  está **propuesto**, no implementado (`growth-marketing-cro/efeonce/MEASUREMENT_IN_GREENHOUSE.md`).
- **HubSpot marketing:** **no hay** marketing-email/campaign/landing-page code. HubSpot es
  CRM-only in-repo. No asumas un módulo de campañas HubSpot.
- **Ad platforms (Google/Meta/LinkedIn/TikTok):** **no hay** integración de ads en el repo. La
  ejecución de pauta es externa (plataformas + MCP donde exista).

## MCP disponibles (no runtime del repo)

Cuando el entorno los exponga, para datos reales:
- **HubSpot** — CRM/marketing/campaign analytics.
- **Metricool** — social scheduling/analytics.
- **Semrush** — keyword/competencia/paid research.

Si un tool no es callable, **declara la limitación** y usa fuentes primarias/estimadas marcadas.

## Regla operativa

- Al proponer medición/atribución en Greenhouse: la verdad de conversión hoy es el **forms
  submission ledger**; la arquitectura de tracking/atribución es de `growth-marketing-cro` (07) y
  su tracking engine está **propuesto**. No prometas instrumentación que no existe.
- Al proponer social/ads: es ejecución **externa** (plataformas/MCP); el repo no la corre.
