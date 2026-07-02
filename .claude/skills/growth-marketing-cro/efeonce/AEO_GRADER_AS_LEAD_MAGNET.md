# El AI Visibility / AEO Grader como lead magnet (growth loop real)

> El grader es el caso vivo del playbook "lanzar un lead magnet" (`../modules/08` B).
> Fuente: `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
> (+ §Delta 2026-06-24) y `src/lib/growth/ai-visibility/**`. La **metodología de scoring
> y agentic-readiness** es de la skill `seo-aeo`; **aquí** vemos su rol como motor de
> adquisición.

## El loop en una imagen

```
sujeto (marca) corre su grade gratis ──▶ recibe reporte de valor (cómo lo ve la IA)
        ▲                                          │
        │                                    lead en HubSpot (intent)
   compartible / citable                           │
   (informe con marca) ◀── cross-sell operador ── calificación → commercial motion
```

Es un **content/viral loop** de tope de embudo: entrega valor real sin fricción
(diagnóstico), captura intención, y el output (el reporte) es compartible → re-alimenta
la entrada. Encaja con el charter del dominio `growth` (acquisition intelligence +
pre-pipeline + HubSpot attribution before opportunity).

## Piezas reales (código)

- **Motor de run/scoring:** `src/lib/growth/ai-visibility/run-engine.ts`,
  `scoring/`, `providers/`, `prompt-packs/`, `taxonomy/` (`resolve-category.ts`,
  `business-model.ts`, `hubspot-industry-map.ts`).
- **Entitlement / tiers (PLG):** `src/lib/growth/ai-visibility/entitlement.ts`,
  `assign-tier.ts`, `policy.ts`, `flags.ts`, `cost.ts` (abuse/cost controls).
- **Handoff a HubSpot:** `src/lib/growth/ai-visibility/hubspot/` (crm-client,
  property-mapper, report-link, events) y `public-intake/forms-engine-binding.ts`.
- **Cross-sell operador:** `operator/send-report-and-create-lead.ts`,
  `operator/hubspot-cross-sell-mapper.ts`, `operator/organization-commercial-facts.ts`.
- **Entrega del reporte:** `report/` (recommendations, command),
  `public-delivery/email/dispatch-report-email.ts`, `status-reader.ts`.
- **Rutas:** públicas `api/public/growth/ai-visibility/{run,report}`; cliente
  `api/client-portal/growth/ai-visibility/{run,report}`; admin
  `api/admin/growth/ai-visibility/*`.

## Entitlement PLG: un motor, varias puertas

El grader es **una capability con entitlement por-ORG** (no por rol): público
self-serve / contratado / trial-PLG / operador. El "gate de run" es un chokepoint
gobernado. Al diseñar growth sobre esto, respeta ese modelo de entitlement (memoria
del repo: el AEO Grader = un motor, 4 puertas; NO gatees por rol).

## Cómo aplicar la skill aquí

- **Optimizar el loop:** ¿el reporte es suficientemente valioso y compartible para
  re-alimentar la entrada? (viral cycle time, `../modules/02`). ¿El prompt de compartir
  aparece post-aha (reporte entregado)?
- **CRO de la captura:** la landing/intake del grader se audita con `../modules/03`
  (propuesta de valor, message match, form mínimo, trust). Gate de email corporativo
  solo con razón de negocio, no como fricción.
- **Activación:** el "aha" es *ver su score y el reporte*; mide time-to-value del run
  y % que llega al reporte (`../modules/05`).
- **Handoff:** el lead calificado pasa a la commercial motion (`commercial-expert`),
  con atribución en HubSpot **antes** de crear oportunidad — no lo cierres desde growth.
- **Medición:** instrumenta run→reporte→lead→calidad del lead en el tracking plan
  (`../modules/07` + `MEASUREMENT_IN_GREENHOUSE.md`).

## Distinción crítica (no conflacionar)

El **lead magnet self-serve del grader** (esta página) es distinto de la **landing del
servicio AEO `/aeo-2/`** (comercial → HubSpot AEO Lead Form). Ver `CRO_PUBLIC_SITE.md`.
Calibración brand-aware del scoring: EPIC-021 (no es scope de growth, es de `seo-aeo`).
