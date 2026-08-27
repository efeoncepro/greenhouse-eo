# AGENTS.md

## Objetivo

Contrato de arranque para Codex y agentes genéricos que trabajan en `greenhouse-eo`. Es un router
accionable, no un spec-store. Las reglas específicas de dominio se cargan bajo demanda desde arquitectura,
invariantes y skills versionadas.

## Alcance y prioridades

- Este repo es solo el `starter-kit`; `full-version` es referencia, nunca source of truth activo.
- Prioridad: mantener Vercel desplegable, proteger la base Vuexy, evitar conflictos, dejar handoff claro y
  preferir soluciones robustas/escalables sobre parches locales.
- Arquitectura vigente + código/schema/runtime verificados prevalecen sobre historia o specs stale.
- No mezclar refactors amplios con cambios funcionales pequeños sin una unidad formal y ownership claro.

## Preflight obligatorio

1. Leer [project_context.md](project_context.md) y [Handoff.md](Handoff.md).
2. Leer la task/issue/epic/spec aplicable y la arquitectura dueña del dominio.
3. Si hay impacto de producto, copy, naming, GTM, onboarding, cliente, HubSpot o métricas, cargar
   [`docs/context/00_INDEX.md`](docs/context/00_INDEX.md) y los archivos pertinentes.
4. Revisar `git status --short`; no asumir árbol limpio ni sobrescribir cambios ajenos.
5. Cargar las skills e invariantes indicadas por el [router de dominios](#router-de-dominios).

## Recuperación de contexto y regla de no pérdida

La compactación de 2026-07-19 preservó byte-for-byte el `AGENTS.md`, `project_context.md`, `Handoff.md`
y `Handoff.archive.md` anteriores. La extensión del mismo día preservó también el `changelog.md` previo al
corte. Índices, hashes y conteos:
[`docs/operations/agent-context-history/2026-07-19/README.md`](docs/operations/agent-context-history/2026-07-19/README.md).
Para historia interna del producto, usar
[`docs/changelog/internal/README.md`](docs/changelog/internal/README.md); no cargar snapshots completos al inicio.

Si este router no resuelve una duda load-bearing:

1. Buscar primero en la spec/ADR/task y en el runtime real.
2. Ejecutar `rg -n '<keyword>' docs/architecture docs/operations .codex/skills`.
3. Como fallback histórico, ejecutar
   `rg -n '<keyword>' docs/operations/agent-context-history/2026-07-19/AGENTS.legacy.md`.
4. No obedecer historia a ciegas: contrastarla y mover la regla vigente al dueño canónico antes de actuar.
5. Si faltaba una ruta, actualizar este router y su gate; no volver a pegar el bloque completo aquí.

## Greenhouse Operating Loop

Todo trabajo formal sigue `intake -> taxonomy -> plan -> execution -> verification -> closure -> handoff`.
Canon: [`GREENHOUSE_OPERATING_LOOP_V1.md`](docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md).

### Tasks, issues, epics y mini-tasks

- Tasks nuevas: ID `TASK-###`, template y enums vigentes de [`TASK_PROCESS.md`](docs/tasks/TASK_PROCESS.md).
- Si una task combina backend/data y UI, preferir tasks dependientes; una híbrida requiere justificación.
- Codex + `ISSUE-###`: ejecutar `pnpm codex:issue-hook ISSUE-###` antes de código y decidir
  `issue-only fix | issue + TASK | blocked`.
- Cambios en taxonomía operativa: `pnpm ops:lint --changed` como primera pasada.
- No mover artefactos a complete sin evidencia proporcional y estado runtime honesto.

### Goal preflight TASK-\* para Codex

Si el pedido menciona `TASK-###`, `[TASK-###]`, su ruta o los aliases `/implement-task TASK-###`,
`/implement-task ###`, `/task TASK-###` o `/task ###`, y pide ejecutar/implementar/continuar:

1. Si no hay `/goal` explícito en la conversación, proponer uno y esperar confirmación.
2. Con el goal confirmado, ejecutar `pnpm codex:task-hook TASK-###` antes de implementar.
3. Usar `--develop` o `--subagents` únicamente cuando el operador lo haya autorizado.

### ADR gate

Cambios a source of truth, schema/projections compartidas, acceso/auth, finanzas/payroll, eventos/webhooks,
APIs externas, cloud/deploy/secrets, UI platform o workflows de agentes requieren identificar/proponer ADR.
Canon: [`ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`](docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md)
y [`DECISIONS_INDEX.md`](docs/architecture/DECISIONS_INDEX.md).

## Router de dominios

Al tocar un dominio, cargar la skill y la fuente canónica de esa fila. El snapshot legado es solo fallback de
investigación, no contrato vigente.

Manifest machine-readable y gateado: [`docs/operations/agent-context-router.json`](docs/operations/agent-context-router.json).

| Dominio / disparador                                | Skill principal                                                  | Invariantes / canon a cargar                                                                                                                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Arquitectura, boundaries, EPIC-027, modularidad     | `software-architect-2026`                                        | `GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` + `MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`                                                                            |
| UI visible, layout, interacción, motion, primitives | `greenhouse-ai-design-studio` primero                            | `agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md` + `architecture/ui-platform/README.md` + premium UI standard                                                                      |
| Implementación UI Greenhouse/Vuexy                  | `greenhouse-portal-ui-implementer`, `greenhouse-vuexy-ui-expert` | `agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md` + `DESIGN.md`                                                                                                                      |
| Copy visible / UX content                           | `greenhouse-ux-content-accessibility`, `copywriting`             | `src/lib/copy/*` + nomenclature config + docs de contexto aplicables                                                                                                                 |
| Browser/URL/captura/diagnóstico visual              | `greenhouse-browser-diagnostics`                                 | `GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` + manual GVC                                                                                                                              |
| Gcloud local auth / OAuth CLI + ADC / Playwright    | `greenhouse-gcloud-auth-playwright` + `greenhouse-secret-hygiene` | `docs/manual-de-uso/operations/gcloud-auth-playwright.md` + `scripts/gcloud-auth-preflight.sh`; la credencial local vive ignorada en `.auth/` con `0600` y nunca se expone |
| Release/promoción develop→main                      | `greenhouse-production-release`                                  | `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`                                                                                                                                             |
| Cloud, secrets, deploy, runtime config              | `greenhouse-secret-hygiene`, skill cloud aplicable               | cloud governance + security posture + infra architecture                                                                                                                             |
| Ops/reliability/crons/Teams/Platform Health         | skill ops aplicable, `teams-bot-platform`                        | `agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`                                                                                                                               |
| Workers/Cloud Build/build inputs                    | `software-architect-2026`                                        | `GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md` + `agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`                                                                                    |
| PostgreSQL/migraciones/SQL readers                  | skill PostgreSQL aplicable                                       | `GREENHOUSE_DATABASE_TOOLING_V1.md` (contract post-release · `pending-migrations/`) + `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` + SQL date-math invariants                                                                                                                  |
| Backend/API/outbox/webhooks                         | `software-architect-2026`                                        | API platform + webhooks architecture + full API parity decision                                                                                                                      |
| Finance/ledger/bank/CLP/FX/payments                 | `greenhouse-finance-accounting-operator`                         | `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`                                                                                                                                              |
| Payroll/Workforce/leave/participation               | `greenhouse-payroll-auditor`                                     | `agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`                                                                                                                             |
| Payroll receipts/finiquito/legal docs               | `greenhouse-payroll-auditor`                                     | `agent-invariants/PAYROLL_LEGAL_DOCS_AGENT_INVARIANTS.md`                                                                                                                            |
| Hiring/ATS/talent (incl. procedencia `data_origin`) | `greenhouse-talent-people-operator`                              | `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§Delta 2026-08-18: `data_origin` ⊥ `source`; `real` = default = visible; NUNCA publicar vacante no-real ni marcar sintética a quien tenga vida laboral; retención y comunicaciones ciegas a la procedencia)                                                                                                                                           |
| Identity/roles/session/access                       | skill identity aplicable                                         | `agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` + entitlements/roles architecture                                                                                          |
| Organization/Client portal/Account 360              | skill producto aplicable                                         | `agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md`                                                                                                                                    |
| Knowledge/Nexa                                      | `greenhouse-nexa-conversational`                                 | `agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md`                                                                                                                                |
| **Efeonce Globe / Creative Studio** (repo hermano `efeonce-globe`) · EPIC-028 | `greenhouse-globe` + `greenhouse-globe-model-fleet` para rutas de modelos/proveedores (+ `arch-architect`) | **Globe es un PRODUCTO COMERCIAL de Efeonce (ADR-010), NUNCA un lab/piloto interno; su estadio de rollout hoy es internal-only + `internal_smoke` + externos gated por TASK-1480 — estadio ≠ naturaleza.** `architecture/creative-studio/README.md` + `DECISIONS_INDEX.md` + `operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` (estado vivo) + `operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md` + `GLOBE_MODEL_FLEET_STATUS.md`. **ADR-016 (`Accepted` 2026-07-27): el payload cliente usa Tailwind v4 con `tokens.ts` como theme — NUNCA un valor de diseño literal en `className` (`text-[#hex]`, `p-[13px]`); todo sale del theme, que sale del SSOT. Dueño: `TASK-1485`.** Valores exactos del composer: `docs/ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md` |
| **Efeonce MCP Platform / federación de providers** · `mcp.efeonce.org`, Streamable HTTP, OAuth, tools/resources/prompts, Cloud Run/ALB/TLS | `efeonce-mcp-platform` + skill dueña del provider | [`EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md`](docs/architecture/EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md) + [`EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`](docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md) + [`EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`](docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md) + `TASK-1626`; para Globe cargar además `greenhouse-globe` y `TASK-1473`. El gateway es adapter neutral: nunca sustituye el contrato, datos ni policy del provider. Estado inicial vivo: `globe.producer.fleet.list` read-only interno, `concurrency=80`, `maxScale=5`; acceso de clientes espera entitlements B2B/multitenant verificables. |
| **AXIS Design System** · tokens, contracts, registry, adapters y distribución privada | `axis-design-system` | `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md` + `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md` + `docs/operations/AXIS_CONTINUITY_MAP_2026-07-29.md` |
| Notion sync/work management                         | `notion-platform`                                                | `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` + Notion architecture/runbook aplicable                                                                                                     |
| HubSpot/CRM/services intake                         | `hubspot-greenhouse-bridge` o `hubspot-as-a-service`             | `GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md`                                                                                                                                           |
| Salesforce CRM / Agentforce / Marketing Cloud Engagement / Marketing Cloud Next | `salesforce-crm-practice`, `salesforce-marketing-cloud-engagement` o `salesforce-marketing-cloud-next` según producto | `docs/services/salesforce/README.md` + `docs/services/salesforce/SALESFORCE_PRODUCT_AND_OFFERING_MAP_V1.md` + `EFEONCE_PARTNERSHIP_REGISTRY_V1.md`; operar y vender son modos separados, y Consulting Partner nunca implica Cloud Reseller |
| Business model, customer model, packaging, pricing, unit economics | `efeonce-business-model-operator` + `efeonce-customer-model-operator` + `efeonce-pricing-operator` + práctica dueña | `docs/business-models/README.md` + modelo vigente + Finance/Legal/Product según corresponda; customer model gobierna ICP/JTBD/buying group; `creative-practice` conserva la especialización Creative Studio |
| Capital, inversión y fundraising                   | `efeonce-investor-readiness` + `efeonce-agency` + Finance/Legal | `docs/strategy/EFEONCE_CAPITAL_AND_INVESTMENT_STRATEGY_V1.md` + `docs/strategy/ASAAS_MANIFESTO_V1.md`; no emitir, endeudar, transferir IP ni crear spinout sin aprobación proporcional |
| Integraciones cross-runtime                         | skill de integración aplicable                                   | `agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`                                                                                                                            |
| Growth/SEO/AEO/forms/CTAs/GTM                       | skill growth/SEO/GTM aplicable                                   | arquitectura del subdominio + `docs/context/` + tracking/privacy contracts                                                                                                           |
| DataForSEO (cliente `src/lib/ai/dataforseo*`, rank/keyword/backlink/site-audit, visibilidad AI/LLM Mentions) | `dataforseo-operator` (+ `seo-aeo` para el oficio)               | `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` + references en `.claude/skills/dataforseo-operator/references/` (canónicas, compartidas con Codex)                                        |
| Sitio público WordPress/Kinsta                      | `efeonce-public-site-wordpress`                                  | `docs/public-site/README.md` + Kinsta access invariants                                                                                                                              |
| **Producción de contenidos del cliente Berel** (ciclo mensual en su Notion, artículos de berel.com, banners, derivados sociales, voz es-MX, CMS Drupal) | `berel-content-production` (+ `copywriting`, `seo-aeo`, `content-marketing-studio`, `social-media-studio`) | La skill ES el canon (espejada `.claude`/`.codex`, bajo gate). Aguas arriba: `SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md` + `SEO_CONTENT_BRIEF_STRUCTURE_V1.md`. La fuente de verdad viva es el Notion del cliente |
| Radiografía AEO / repo `efeonce-think`              | `seo-aeo`, `seo-aeo-practice`, `astro`                           | `docs/think/radiografia-aeo-architecture.md` + runbook/manual; runtime no vive aquí                                                                                                  |
| Creative/editorial/image/audio/decks                | `greenhouse-ai-creative-rights-governance` + skill studio específica | derechos, consentimiento, provenance, licencias, indemnidad, disclosure y gates enterprise; `GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md` + docs/skills de producción |
| Licitaciones/propuestas/composer                    | `greenhouse-public-private-tenders`, `deck-studio`               | `agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`                                                                                                                            |
| Documentación/contexto/handoff                      | `greenhouse-documentation-governor`                              | `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` + `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md` + `docs/architecture/GREENHOUSE_AGENT_CONTEXT_ROUTER_DECISION_V1.md` |
| QA/cierre no trivial                                | `greenhouse-qa-release-auditor`                                  | `pnpm qa:gates --changed` + skills especializadas que el auditor inyecte                                                                                                             |

Las rutas de la tabla son relativas a `docs/architecture/` cuando comienzan por nombre de spec o
`agent-invariants/`, y relativas a `docs/operations/` para operating models.

## Contratos transversales de implementación

- **Calidad:** resolver causa raíz; workaround solo temporal, reversible, documentado y con owner/retiro.
- **API parity:** la UI consume commands/readers/primitives server-side; no crear endpoints como click handlers.
- **Reuso:** buscar helpers, components, routes, signals, capabilities y copy antes de introducir piezas nuevas.
- **Copy:** texto reutilizable/estado/CTA/error/empty/aria vive en `src/lib/copy/*`; nomenclatura institucional
  en `src/config/greenhouse-nomenclature.ts`.
- **Acceso:** diseñar siempre views + entitlements; roles revocados/expirados nunca confieren acceso.
- **Seguridad:** no improvisar credenciales/pools/bypasses, no imprimir secrets ni raw errors, usar CLIs con
  guardrails y redacción canónica.
- **Local-first:** validar local antes de gastar CI/cloud; no push/merge/release como cierre automático.
- **Multi-agente:** no cambiar branch ni sobrescribir archivos con trabajo ajeno; subagentes solo para trabajo
  paralelo independiente y con ownership claro cuando estén autorizados.
- **Runtime completeness:** código no equivale a operativo. Flags, env, deploy, migrations, backfills, crons,
  webhooks, workers, secrets, data recovery y verificación live forman parte del cierre.
- **Entorno ≠ `NODE_ENV`:** para distinguir staging de producción se lee `VERCEL_ENV`. Vercel compila TODO
  deployment (Preview, staging, Production) con `NODE_ENV=production`, así que un guard por `NODE_ENV` queda
  **solo-local** y la afordancia sigue expuesta en los dos entornos desplegados, con los tests en verde.
  Patrón vigente: `src/app/api/auth/agent-session/route.ts`, `src/proxy.ts`. En Cloud Run el discriminante es
  la env var que declare el `deploy.sh` del servicio. Detalle:
  `greenhouse-qa-release-auditor/references/runtime-rollout.md`.
- **Evidencia sobre runtime:** una afirmación sobre runtime se verifica contra el runtime (`curl`,
  `vercel env ls`, `gcloud run services describe`, el reader, la consulta a PG), nunca contra `Handoff.md`, un
  doc, un runbook o la memoria de la sesión: **un doc describe el día en que se escribió.** Si no se puede
  verificar, se reporta como *no verificada* — no como hecho ni como "pendiente del operador" cuando el agente
  tiene el CLI a mano. Caso fuente y las otras dos formas de evidencia falsa:
  `greenhouse-qa-release-auditor` §Integridad de la evidencia.

### Registro del español (voseo → tuteo neutro)

El operador **no es argentino** y el voseo rioplatense le molesta explícitamente. La regla vive en
`CLAUDE.md` → §`Operator Communication Style`; acá va el detalle operativo, porque **el tic no está en
los modismos obvios (`che`, `boludo`) sino en los IMPERATIVOS**, que son el modo por defecto al escribir
docs, runbooks, specs y mensajes al operador. Aplica **igual a los docs del repo que a la conversación**:
un agente que lee un runbook en voseo copia ese registro al responder (causa verificada del sweep
2026-07-26: ~560 formas corregidas en 147 archivos vigentes).

- **Imperativos** — escribir `agrega`, `actualiza`, `verifica`, `corre`, `revisa`, `usa`, `lee`, `escribe`,
  `mira`, `deja`, `prende`, `elige`, `abre`, `activa`, `recuerda`, `genera`, `ejecuta`, `cierra`, `busca`;
  NUNCA `agregá`, `actualizá`, `verificá`, `corré`, `revisá`, `usá`, `leé`, `escribí`, `mirá`, `dejá`,
  `prendé`, `elegí`, `abrí`, `activá`, `recordá`, `generá`, `ejecutá`, `cerrá`, `buscá`.
- **Irregulares y con diptongo** — `mantén` (no `mantené`), `propón` (no `proponé`), `pon` (no `poné`),
  `vuelve` (no `volvé`), `extiende` (no `extendé`), `remueve` (no `remové`), `prueba` (no `probá`),
  `empieza` (no `empezá`), `refuerza` (no `reforzá`), `sigue` (no `seguí`), `corrige` (no `corregí`).
- **Indicativo** — `puedes`, `quieres`, `tienes`, `necesitas`, `haces`, `sabes`, `eres`; NUNCA `podés`,
  `querés`, `tenés`, `necesitás`, `hacés`, `sabés`, `sos`.
- **Enclíticos** — `dime`, `fíjate`, `acuérdate`, `quédate`; NUNCA `decime`, `fijate`, `acordate`, `quedate`.
- **Pronombre** — `tú` (o `ti` tras preposición: "para ti"); NUNCA `vos`.
- **NO confundir con el pretérito de 1ª persona, que es correcto y no se toca:** "yo **elegí** el slug",
  "**escribí** el adapter", "**medí** el transporte", "**descubrí** que Cloud Run no soporta TCP". La
  diferencia es semántica, no ortográfica: imperativo (instrucción al lector) vs. narración de trabajo ya
  hecho. Un sweep automático que no distinga esto corrompe los registros históricos.
- Se permite chilenismo operativo solo en contexto de producto/país, nunca como muletilla.

## Contrato UI resumido

Cualquier UI invoca primero `greenhouse-ai-design-studio`. Antes de JSX: dirección visual, comparación de
alternativas, primitive lookup, mapping de tokens, wireframe/flow/motion cuando aplique y decisión
`reuse | extend | new primitive`. Toda pantalla nueva considera primero `CompositionShell`; cards nuevas
nacen adaptables/rich-ready. Usar primitives canónicas para breadcrumbs, sidecars, floating surfaces, motion y
density. Validar desktop + 390 px, teclado, reduced motion y `scrollWidth === clientWidth`; GVC es evidencia
primaria. Detalle load-bearing: [`UI_PLATFORM_AGENT_INVARIANTS.md`](docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md)
y [`GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`](docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md).

## Tooling operativo

- CLIs autenticados: `az`, `gcloud`, `gh`, `vercel`, `psql` vía `pnpm pg:connect`.
- **Correo laboral:** el correo de trabajo de Efeonce y sus clientes, incluido ANAM, vive en Outlook/Microsoft 365. Buscar allí primero mediante el conector o sesión de Outlook disponible. Gmail, incluido `jreysgo@gmail.com`, es correo personal y no es fuente de verdad laboral; si Outlook no está disponible, informar el bloqueo y no sustituirlo por Gmail.
- GCP interactivo local requiere ambos flujos: `gcloud auth login` y
  `gcloud auth application-default login`.
- Cuando el operador solicite autenticación o renovación Gcloud, invocar
  `greenhouse-gcloud-auth-playwright` y ejecutar `pnpm gcloud:auth:playwright -- --force`; el agente debe
  completar el flujo estándar con Playwright sin pedir pasos manuales. Nunca imprimir la clave, URLs OAuth,
  códigos, tokens o cookies; mantener `.auth/` ignorado y con permisos `0600`.
- **GCP multi-proyecto local:** `default` conserva `julio.reyes@efeonce.org` / `efeonce-group` y
  `globe` apunta a la misma cuenta / `efeonce-globe`. Son perfiles locales, no permisos ni runtime.
  Para Globe preferir `gcloud --configuration=globe ... --project=efeonce-globe`; si se activa el
  perfil interactivamente, restaurar `default` al terminar. No cambiar el proyecto de `default` para
  un acto puntual.
- macOS usa `gtimeout`, no asumir `timeout` GNU.
- GVC: `pnpm fe:capture <scenario> --env=staging`; review/diff/health según necesidad.
- Antes de una acción sensible, consultar Platform Health/safe modes cuando el dominio lo exponga.
- Workers/build inputs: `pnpm worker:build-contract-gate` + `pnpm worker:runtime-deps-gate`; un `file:` local
  debe existir, estar versionado, coincidir con el lockfile y entrar a cada etapa/contexto consumidor.

## Git, verificación y cierre

- Preservar cambios ajenos; usar cambios mínimos coherentes y commits enfocados.
- **Prohibición absoluta de worktrees aislados:** trabajar sólo en el checkout compartido actual. Nunca crear,
  usar, mover trabajo a, ni operar desde `git worktree`, checkouts aislados o carpetas clonadas; tampoco tocar
  worktrees preexistentes salvo autorización explícita que indique ruta y acción exactas. Si el estado compartido
  bloquea, detenerse y pedir decisión al operador. Canon:
  [`REPOSITORY_SHARED_WORKSPACE_AGENT_INVARIANTS.md`](docs/architecture/agent-invariants/REPOSITORY_SHARED_WORKSPACE_AGENT_INVARIANTS.md).
- No ejecutar comandos destructivos ni cambiar de branch en el checkout compartido sin autorización.
- Validar proporcionalmente: tests/lint/build/manual/runtime según riesgo y dominio.
- **Live tests (`*.live.test.ts`): `pnpm test:live`, NUNCA `set -a; source .env.local`.** Ese `source` exporta
  las ~85 variables del archivo al proceso y tumba tests unitarios de otros dominios que afirman DEFAULTS
  (secrets, cloud/billing, cloud/postgres, emails); `test:live` pasa **sólo acceso a base** y rechaza cualquier
  `*_ENABLED`. Corren **serializados** entre sí (proyecto `live` en `vitest.config.ts`) porque comparten la
  ÚNICA instancia Cloud SQL de dev/staging/prod. Dos modos de falla que engañan: **`skipped` se ve igual que
  verde** —leer `passed`, nunca la ausencia de rojo—, y con el **Cloud SQL Proxy caído los tests PASAN y la
  suite igual sale ROJA**, porque quien no conecta es el teardown. Fixtures: derivar el sujeto por `scope`
  (`resolveLiveTestCandidateFixture`), nunca tomarlo de un pool compartido con `ORDER BY … LIMIT n`.
- Implementaciones no triviales: `greenhouse-qa-release-auditor` + `pnpm qa:gates --changed`.
- Cierre documental: `greenhouse-documentation-governor` + `pnpm docs:closure-check`.
- Contexto/handoff: `pnpm docs:context-check:strict` antes de cerrar cambios a estos contratos. Si recomienda
  rotar, ejecutar `pnpm docs:context-rotate --apply` y repetir strict; no basta cumplir sesiones/entradas si
  lineas o tokens siguen fuera de presupuesto. **Es el ÚLTIMO gate del cierre: `docs:closure-check` NO lo
  incluye**, y cualquier edición posterior a `Handoff.md`/`changelog.md` invalida su resultado. Orden seguro:
  ediciones documentales → `docs:closure-check` → `docs:context-rotate --apply` si hace falta →
  `docs:context-check:strict` → commit.
- Estado honesto: `complete | code complete, rollout pendiente | operativamente bloqueado`.

## Documentación viva

- `AGENTS.md`: reglas transversales y router; nunca volver a almacenar specs de dominio inline.
- `project_context.md`: estado durable vigente; sin diario ni secciones `Delta`.
- `Handoff.md`: continuidad activa, máximo 20 sesiones, 600 líneas y ~12.000 tokens.
- `changelog.md`: ventana reciente de cambios reales, máximo 60 entradas, 2.000 líneas y ~60.000 tokens; el
  historial sale a `docs/changelog/internal/` mediante `pnpm docs:context-rotate --apply`, nunca se elimina ni se
  vuelve a pegar en raíz.
- Tasks/issues/ADRs/arquitectura: evidencia y contrato canónico.
- Historia: `docs/operations/agent-context-history/`, buscable bajo demanda y nunca auto-cargada completa.
- Toda capacidad mantiene documentación técnica, funcional y manual/runbook proporcional.

## Regla final

No adivinar contratos ni obedecer memoria histórica a ciegas. Resolver la fuente vigente, cargar el contexto
del dominio, preservar evidencia y dejar el siguiente paso ejecutable.
