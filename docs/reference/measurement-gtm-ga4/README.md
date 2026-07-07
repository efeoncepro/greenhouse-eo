# Reference — Medición GTM + GA4 (Efeonce/Greenhouse)

> **Referencia canónica de medición.** Una sola copia, leída por Claude, Codex, humanos y Nexa. Las skills (`growth-marketing-cro`, `greenhouse-growth-forms`, `digital-marketing`, `efeonce-public-site-wordpress`) apuntan aquí — no duplican.
> Documentación oficial de Google Tag Manager + GA4 + best practice de taxonomía de eventos, más la house style de Greenhouse aterrizada al runtime real.

## Cuándo cargar esto

Al instrumentar, medir, taggear o razonar sobre eventos/conversiones de cualquier superficie pública (Growth Forms, CTAs, landings, lead magnets), al crear/editar tags en GTM, al leer métricas de GA4, o al nombrar un evento nuevo.

## Índice

| Doc | Qué cubre |
|---|---|
| **[TRACKING-PLAN.md](TRACKING-PLAN.md)** | **Registro vivo OBLIGATORIO** de forms & CTAs con su estado de tagging. Leer antes de crear un form/CTA; registrar su fila al crearlo (taggeado o no). |
| **[04-greenhouse-gh-event-convention.md](04-greenhouse-gh-event-convention.md)** | **Empezar aquí.** House style `gh_<object>_<action>`, coordenadas reales (`GTM-NGHPGRLZ`, GA4 `486264460`), regla de decisión GA4-recomendado vs `gh_` + tabla de mapeo, allowlist/PII, naming GTM, loop de verificación, gobernanza. |
| [01-ga4-event-model.md](01-ga4-event-model.md) | GA4: 4 tipos de evento, recomendados por vertical, reglas de naming + límites duros (nombres/prefijos reservados verbatim), key events, custom dimensions, Measurement Protocol. |
| [02-gtm-and-datalayer.md](02-gtm-and-datalayer.md) | GTM: conceptos, web vs server-side, dataLayer en profundidad, tags/triggers/variables, consent mode v2, convenciones de naming de entidades. |
| [03-event-naming-taxonomy.md](03-event-naming-taxonomy.md) | Marco object–action, casing, anti-explosión (parámetros > eventos), UTM, gobernanza/tracking plan, evaluación de la convención `gh_`. |
| **[05-gtm-api-v2-tag-shapes.md](05-gtm-api-v2-tag-shapes.md)** | **Operador.** JSON exacto de la API v2 para crear tags/triggers/variables (`gaawe`, `customEvent`, `v`…) + workflow versions/publish. Usado por la skill `greenhouse-gtm-ga4-operator`. |
| [06-gtm-tagging-as-code-and-ops.md](06-gtm-tagging-as-code-and-ops.md) | Operador. Container-as-code, deploy seguro, verificación, gobernanza, sGTM, diagnóstico "event not showing in GA4". |
| [07-ga4-admin-api-ops.md](07-ga4-admin-api-ops.md) | Operador. GA4 Admin API: measurement ID, custom dimensions, key events, MP secrets, blueprint lead-gen. |

## Regla de una línea

`gh_<object>_<action>`, `snake_case`, past tense, ≤40 chars, sin PII, allowlist de parámetros. Si existe un evento **recomendado** de GA4 que calza el momento de conversión (`generate_lead`, `sign_up`, …) → usar ese verbatim (hereda features GA4); si no hay equivalente → custom `gh_`. Todo evento nuevo se registra primero en el SoT (`src/lib/growth/forms/contracts.ts → GTM_EVENT_NAMES`).

## Contratos relacionados en el repo

- `docs/architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md §19` — mandato de instrumentación + conexión GTM/GA4 + coordenadas.
- `src/lib/growth/gtm/` · `src/lib/growth/ga4/` — clientes de gestión (Efeonce por SA; clientes por OAuth per-org).
- `scripts/ga4/realtime-events.ts` — verificación de eventos en vivo.
- `src/lib/growth/forms/contracts.ts` · `src/growth-forms-renderer/telemetry.ts` — SoT del vocabulario + allowlist.

> Frescura: GA4/GTM cambian cada trimestre (consent mode, features de reporting, límites). Antes de afirmar un límite exacto o una regla volátil, reverificar contra la doc oficial citada en cada archivo.
