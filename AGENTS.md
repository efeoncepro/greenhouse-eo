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
y `Handoff.archive.md` anteriores. Índice, hashes y conteos:
[`docs/operations/agent-context-history/2026-07-19/README.md`](docs/operations/agent-context-history/2026-07-19/README.md).

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
| Release/promoción develop→main                      | `greenhouse-production-release`                                  | `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`                                                                                                                                             |
| Cloud, secrets, deploy, runtime config              | `greenhouse-secret-hygiene`, skill cloud aplicable               | cloud governance + security posture + infra architecture                                                                                                                             |
| Ops/reliability/crons/Teams/Platform Health         | skill ops aplicable, `teams-bot-platform`                        | `agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`                                                                                                                               |
| PostgreSQL/migraciones/SQL readers                  | skill PostgreSQL aplicable                                       | `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` + SQL date-math invariants                                                                                                                  |
| Backend/API/outbox/webhooks                         | `software-architect-2026`                                        | API platform + webhooks architecture + full API parity decision                                                                                                                      |
| Finance/ledger/bank/CLP/FX/payments                 | `greenhouse-finance-accounting-operator`                         | `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`                                                                                                                                              |
| Payroll/Workforce/leave/participation               | `greenhouse-payroll-auditor`                                     | `agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`                                                                                                                             |
| Payroll receipts/finiquito/legal docs               | `greenhouse-payroll-auditor`                                     | `agent-invariants/PAYROLL_LEGAL_DOCS_AGENT_INVARIANTS.md`                                                                                                                            |
| Hiring/ATS/talent                                   | `greenhouse-talent-people-operator`                              | `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`                                                                                                                                           |
| Identity/roles/session/access                       | skill identity aplicable                                         | `agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` + entitlements/roles architecture                                                                                          |
| Organization/Client portal/Account 360              | skill producto aplicable                                         | `agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md`                                                                                                                                    |
| Knowledge/Nexa                                      | `greenhouse-nexa-conversational`                                 | `agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md`                                                                                                                                |
| Notion sync/work management                         | `notion-platform`                                                | `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` + Notion architecture/runbook aplicable                                                                                                     |
| HubSpot/CRM/services intake                         | `hubspot-greenhouse-bridge` o `hubspot-as-a-service`             | `GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md`                                                                                                                                           |
| Integraciones cross-runtime                         | skill de integración aplicable                                   | `agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`                                                                                                                            |
| Growth/SEO/AEO/forms/CTAs/GTM                       | skill growth/SEO/GTM aplicable                                   | arquitectura del subdominio + `docs/context/` + tracking/privacy contracts                                                                                                           |
| Sitio público WordPress/Kinsta                      | `efeonce-public-site-wordpress`                                  | `docs/public-site/README.md` + Kinsta access invariants                                                                                                                              |
| Radiografía AEO / repo `efeonce-think`              | `seo-aeo`, `seo-aeo-practice`, `astro`                           | `docs/think/radiografia-aeo-architecture.md` + runbook/manual; runtime no vive aquí                                                                                                  |
| Creative/editorial/image/audio/decks                | skill studio específica                                          | docs/skills de producción; preservar provenance, licencia, evidencia y gates humanos                                                                                                 |
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
- GCP interactivo local requiere ambos flujos: `gcloud auth login` y
  `gcloud auth application-default login`.
- macOS usa `gtimeout`, no asumir `timeout` GNU.
- GVC: `pnpm fe:capture <scenario> --env=staging`; review/diff/health según necesidad.
- Antes de una acción sensible, consultar Platform Health/safe modes cuando el dominio lo exponga.

## Git, verificación y cierre

- Preservar cambios ajenos; usar cambios mínimos coherentes y commits enfocados.
- No ejecutar comandos destructivos ni cambiar de branch/worktree compartido sin autorización.
- Validar proporcionalmente: tests/lint/build/manual/runtime según riesgo y dominio.
- Implementaciones no triviales: `greenhouse-qa-release-auditor` + `pnpm qa:gates --changed`.
- Cierre documental: `greenhouse-documentation-governor` + `pnpm docs:closure-check`.
- Contexto/handoff: `pnpm docs:context-check:strict` antes de cerrar cambios a estos contratos.
- Estado honesto: `complete | code complete, rollout pendiente | operativamente bloqueado`.

## Documentación viva

- `AGENTS.md`: reglas transversales y router; nunca volver a almacenar specs de dominio inline.
- `project_context.md`: estado durable vigente; sin diario ni secciones `Delta`.
- `Handoff.md`: continuidad activa, máximo 20 sesiones.
- Tasks/issues/ADRs/arquitectura: evidencia y contrato canónico.
- Historia: `docs/operations/agent-context-history/`, buscable bajo demanda y nunca auto-cargada completa.
- Toda capacidad mantiene documentación técnica, funcional y manual/runbook proporcional.

## Regla final

No adivinar contratos ni obedecer memoria histórica a ciegas. Resolver la fuente vigente, cargar el contexto
del dominio, preservar evidencia y dejar el siguiente paso ejecutable.
