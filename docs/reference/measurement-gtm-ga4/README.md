# Reference — Medición GTM + GA4 + Meta CAPI (Efeonce/Greenhouse)

Checkpoint18/10: [activación publicada](../../audits/growth/2026-10-18-google-ads-activation.md),
Web6/Server10, EC ON, Performance/Discovery y tracing HubSpot/Meta configurados; primera recepción y
atribución pendientes. [Cobertura comercial](../../audits/growth/2026-10-18-commercial-forms-measurement-coverage.md):
12 propuestas dry-run validadas sin publicar; Lead Gen - Web requiere corrección canónica de tipo.
Ebooks/careers/newsletter/support/tests quedan fuera de la ampliación solicitada. Los cortes16/10 y
anteriores de este índice son historia; para operar leer el runtime10 y los manuales vigentes.


> **Referencia canónica de medición.** Una sola copia, leída por Claude, Codex, humanos y Nexa. Las skills (`growth-marketing-cro`, `greenhouse-growth-forms`, `digital-marketing`, `efeonce-public-site-wordpress`) apuntan aquí — no duplican.
> Documentación oficial de Google Tag Manager + GA4 + best practice de taxonomía de eventos, más la house style de Greenhouse aterrizada al runtime real.

## Cuándo cargar esto

Al instrumentar, medir, taggear o razonar sobre eventos/conversiones de cualquier superficie pública (Growth Forms, CTAs, landings, lead magnets), al crear/editar tags en GTM, al leer métricas de GA4, o al nombrar un evento nuevo.

## Índice

| Doc | Qué cubre |
|---|---|
| [Arquitectura Google Ads](../../architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md) | Dirección aceptada 17/10/2026: Ads API, GTM web/server y CRM; identidad, consentimiento, emisor único y rollout. Acceso de operador probado a `6862539491`; integración de producto y conversiones pendientes. |
| **[TRACKING-PLAN.md](TRACKING-PLAN.md)** | **Registro vivo OBLIGATORIO** de forms & CTAs con su estado de tagging. Leer antes de crear un form/CTA; registrar su fila al crearlo (taggeado o no). |
| **[LEARNINGS.md](LEARNINGS.md)** | Build-log de aprendizajes reales operando GTM/GA4 en runtime (gotchas verificados). Leer antes de construir tags. |
| `container-snapshot.json` | Snapshot normalizado del config live del container **web** `GTM-NGHPGRLZ` (cuenta `6291647045`, container `218104216`). Lo escribe `pnpm gtm:snapshot`; diff en git + drift detection. Estrategia: ADR `GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1`. |
| `server-container-snapshot.json` | Snapshot normalizado del container **servidor** `GTM-K2X4ZTTK` (cuenta `6068297031`, container `191286361`), con secretos tapados. Versiona la configuración sGTM (Meta CAPI incluido); **no** prueba entrega a Meta. Ver [§Snapshot y drift](#snapshot-y-drift-de-los-dos-containers). |
| **[04-greenhouse-gh-event-convention.md](04-greenhouse-gh-event-convention.md)** | **Empezar aquí.** House style `gh_<object>_<action>`, coordenadas reales (`GTM-NGHPGRLZ`, GA4 `486264460`), regla de decisión GA4-recomendado vs `gh_` + tabla de mapeo, allowlist/PII, naming GTM, loop de verificación, gobernanza. |
| [01-ga4-event-model.md](01-ga4-event-model.md) | GA4: 4 tipos de evento, recomendados por vertical, reglas de naming + límites duros (nombres/prefijos reservados verbatim), key events, custom dimensions, Measurement Protocol. |
| [02-gtm-and-datalayer.md](02-gtm-and-datalayer.md) | GTM: conceptos, web vs server-side, dataLayer en profundidad, tags/triggers/variables, consent mode v2, convenciones de naming de entidades. |
| [03-event-naming-taxonomy.md](03-event-naming-taxonomy.md) | Marco object–action, casing, anti-explosión (parámetros > eventos), UTM, gobernanza/tracking plan, evaluación de la convención `gh_`. |
| **[05-gtm-api-v2-tag-shapes.md](05-gtm-api-v2-tag-shapes.md)** | **Operador.** JSON exacto de la API v2 para crear tags/triggers/variables (`gaawe`, `customEvent`, `v`…) + workflow versions/publish. Usado por la skill `greenhouse-gtm-ga4-operator`. |
| [06-gtm-tagging-as-code-and-ops.md](06-gtm-tagging-as-code-and-ops.md) | Operador. Container-as-code, deploy seguro, verificación, gobernanza, sGTM, diagnóstico "event not showing in GA4". |
| [07-ga4-admin-api-ops.md](07-ga4-admin-api-ops.md) | Operador. GA4 Admin API: measurement ID, custom dimensions, key events, MP secrets, blueprint lead-gen. |
| [09-hubspot-consent.md](09-hubspot-consent.md) | Banner HubSpot, bridge, categorías, PageView por destino, UUID sender, rollout/rollback WP–Think. |
| [08-meta-conversions-api-server-side.md](08-meta-conversions-api-server-side.md) | Canon Meta CAPI por GTM **Server**: inventario live, ingreso web/backend, consentimiento, dedupe, secretos y verificación Meta; separado del Pixel web. |
| [10-growth-lead-matching-runtime.md](10-growth-lead-matching-runtime.md) | Implementación vigente de matching: fuentes, consentimiento, normalización, proyección cifrada, cola, Client sGTM, Google UPD, operación y límites. |

## Snapshot y drift de los dos containers

Estado 2026-10-16 (commits `e791942ea` y `5d28dda76` en `develop`, sin push al corte):

- `pnpm gtm:snapshot` lee los **dos** containers live y reescribe ambos JSON. Normaliza tags,
  triggers, variables, clients, transformations y builtInVariables. De las plantillas
  personalizadas guarda sólo la huella `templateDataSha256` de su código, no el código.
- **Secretos tapados antes de escribir a disco.** Un parámetro cuyo nombre contiene
  token/secret/password/apiKey/accessKey/credential/privateKey, o cuyo valor tiene forma de
  credencial (`EAA…`, `sk-…`, `AIza…`, `ya29.…`), se guarda como `[redacted sha256:<12 hex>]`.
  Una rotación cambia la huella y aparece como drift; el valor nunca llega a git. Una referencia
  `{{variable}}` se conserva tal cual. En el servidor hoy se tapan dos valores: `apiAccessToken`
  del tag Meta CAPI y `tokenDigest` del client «Efeonce backend Lead ingress».
- `pnpm gtm:snapshot --check` compara live contra lo commiteado en ambos containers y sale 1 con
  un resumen por colección (`+` alta, `-` baja, `~` cambio). Lógica pura y tests en
  `scripts/gtm/snapshot-lib.ts` + `scripts/gtm/__tests__/snapshot-lib.test.ts`; entrypoint
  `scripts/gtm/snapshot.ts`.
- `scripts/gtm/build-cta-events-workspace.ts --publish` reescribe ambos snapshots tras publicar.
- **Chequeo diario**: `.github/workflows/gtm-drift.yml` (12:00 UTC + `workflow_dispatch`) corre
  `--check` y **falla si hay drift**; la falla es la alerta. Clasificación tooling, no
  async-critical. Se autentica por WIF directamente como `greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com`
  (`GTM_SNAPSHOT_DIRECT_AUTH=1`, scope `tagmanager.readonly`); local sigue con ADC + impersonación.
  Los workflows programados corren desde `main`: el chequeo se activa con el release que incluya
  esos commits y **todavía no ha corrido en GitHub**.
- Al 2026-10-16 ambos containers estaban sin drift: web «2026-10-13 Efeonce consent + server
  CAPI recovery», servidor «TASK2035 strict policy v2 after web/worker convergence».

Un snapshot sin drift prueba que la configuración no cambió fuera del repo; no prueba recepción
en GA4 ni en Meta. Si el chequeo falla: [qué hacer](../../manual-de-uso/growth/operar-meta-capi-servidor.md#si-falla-el-chequeo-diario-gtm-drift).
Pendiente decidido por el operador: el token Meta sigue literal en el tag servidor (ver
[08 §Token Meta literal](08-meta-conversions-api-server-side.md#token-meta-literal-en-el-tag-servidor--pendiente-2026-10-16)).

## Regla de una línea

`gh_<object>_<action>`, `snake_case`, past tense, ≤40 chars, sin PII, allowlist de parámetros. Si existe un evento **recomendado** de GA4 que calza el momento de conversión (`generate_lead`, `sign_up`, …) → usar ese verbatim (hereda features GA4); si no hay equivalente → custom `gh_`. Todo evento nuevo se registra primero en el SoT (`src/lib/growth/forms/contracts.ts → GTM_EVENT_NAMES`).

## Contratos relacionados en el repo

- `docs/architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md §19` — mandato de instrumentación + conexión GTM/GA4 + coordenadas.
- `src/lib/growth/gtm/` · `src/lib/growth/ga4/` — clientes de gestión (Efeonce por SA; clientes por OAuth per-org).
- `scripts/ga4/realtime-events.ts` — verificación de eventos en vivo.
- `src/lib/growth/forms/contracts.ts` · `src/growth-forms-renderer/telemetry.ts` — SoT del vocabulario + allowlist.

> Frescura: GA4/GTM cambian cada trimestre (consent mode, features de reporting, límites). Antes de afirmar un límite exacto o una regla volátil, reverificar contra la doc oficial citada en cada archivo.

Consentimiento HubSpot y sender publicado: [09-hubspot-consent.md](09-hubspot-consent.md);
lectura funcional del [panel de cookies](../../documentation/growth/medicion-gtm-ga4.md#cookies-y-preferencias-del-visitante)
y [manual de operación](../../manual-de-uso/growth/operar-consentimiento-cookies-publico.md).
Estado verificado **14/10: Server9/Web5**, backend único de Lead, contexto original del visitante,
Google UPD y políticas administrables por API/panel/CLI en [contrato de runtime](10-growth-lead-matching-runtime.md).
La [referencia API interna](../../api/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_API_V1.md) define discovery,
dry-run, comandos, permisos y recuperación; el [manual de agentes](../../manual-de-uso/growth/configurar-medicion-conversiones.md)
explica su operación. Alta compatible por datos comprobada sin código/redeploy/publicación GTM.
[Release completo y Test Events](../../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md);
primera conversión comercial consentida y mejora EMQ siguen sin observarse. Los expedientes13/10
conservan la recuperación y el matching iniciales, sin sustituir este contrato vigente.
