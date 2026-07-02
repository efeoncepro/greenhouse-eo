# Medición del growth en Greenhouse (qué existe vs qué está propuesto)

> Regla de honestidad: distingue **live** de **propuesto/planned**. No prometas
> instrumentación que no existe todavía. Aplica `../modules/07` sobre lo que hay.

## Tracking Engine — PROPUESTO (aún sin runtime)

`docs/architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md`
(Status: *Proposed direction — discovery complete, no runtime changes yet*, 2026-06-28,
TASK-1260). Decisión V1: **arquitectura híbrida**, no reemplazo de todo el stack:

- mantiene `dataLayer`/GTM del sitio como superficie de tags de marketing;
- agrega un **path de ingestión server-side propio** para eventos conductuales gobernados;
- el **Growth Forms submission ledger es la verdad de conversión autoritativa**;
- HubSpot, GA/GTM, Clarity, Metricool y BigQuery son **consumers/destinos/comparación**,
  no source of truth;
- identidad de visitante/sesión = contexto pseudónimo rotable, no prueba de persona.

Boundary duro del doc:
```text
behavioral tracking != conversion ledger != CRM attribution
```

Esto **coincide** con el stack en capas de `../modules/07` (server-side + verdad única +
privacidad por diseño). Cuando el tracking engine se implemente, es el lugar canónico
del tracking plan; **hoy** la verdad de conversión es el ledger de forms.

## Search Console (GSC) — LIVE (analítica de búsqueda)

`src/lib/growth/search-console/**` (`api-client.ts`, `oauth-client.ts`,
`connection-store.ts`, `reader.ts`, `command.ts`, `secret-naming.ts`, `flags.ts`).
Conexión multitenant en progreso (TASK-1282/1283). Es la integración de analítica de
búsqueda más madura del repo; su explotación SEO/AEO es de la skill `seo-aeo`.

## Funnel comercial (party lifecycle) — LIVE

`docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`;
`getPartyLifecycleFunnelMetrics` (`src/lib/commercial/party/party-lifecycle-snapshot-store.ts`,
ruta `api/admin/commercial/parties/funnel`). Es el funnel **post-handoff** (commercial).
Growth entrega el lead; este funnel mide su avance a revenue. Úsalo para cerrar el loop
de atribución growth→commercial, pero recuerda que su dueño es `commercial`.

## Señal de conversión (reliability) — LIVE

`src/lib/reliability/queries/engagement-conversion-rate-drop.ts` (signal
`commercial.engagement.conversion_rate_drop`), respaldada por
`src/lib/commercial/sample-sprints/health.ts`. Detecta caídas de conversión como señal
de salud operativa — útil como guardrail automático (`../modules/04`, `06`).

## GA4 — PLANNED (aún sin runtime)

`docs/tasks/to-do/TASK-1284-growth-ga4-multitenant-connection-signal.md`. No hay
runtime GA4 propio todavía. Al planear medición web, trátalo como pendiente y apóyate
en GSC + el forms ledger como fuente confiable, y en GA/GTM del sitio como consumer.

## Lo que NO existe (declarar el gap, no inventarlo)

- **No hay motor de A/B / experimentación propio** en el repo. Si el trabajo requiere
  experimentar sobre el portal/sitio, dilo explícito y propón: cambios de alta confianza,
  o instrumentación mínima, o una herramienta externa — con owner y task. No asumas un
  runtime de experimentos que no está (`../modules/04`).
- Atribución MMM/incrementality: no hay runtime; es doctrina a aplicar cuando haya escala.

## Cómo aplicar `../modules/07` aquí

1. Verdad de conversión = **forms submission ledger** (hoy). Instrumenta eventos ahí.
2. Cuando exista el tracking engine, migra el tracking plan a su ingestión server-side.
3. GSC para búsqueda; party funnel para post-handoff; conversion signal como guardrail.
4. Privacidad: `growth/forms/pii/boundary.ts` + Ley 21.719 (no PII cruda, base legal).
5. Marca siempre live vs propuesto/planned al reportar qué se puede medir.
