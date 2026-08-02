# Contexto vigente del repositorio

## Estado vigente para agentes

Greenhouse es la plataforma operativa de Efeonce Group sobre Next.js 16, MUI 7, Vuexy starter-kit y
TypeScript. Este archivo contiene solo contratos durables y rutas de descubrimiento. El estado de una sesión,
rollout o bloqueo vive en [Handoff.md](Handoff.md); la historia pre-2026-07-19 quedó preservada en
[`docs/operations/agent-context-history/2026-07-19/project_context.legacy.md`](docs/operations/agent-context-history/2026-07-19/project_context.legacy.md).

La migración de consumo privado de AXIS está cerrada para la operación interna/producción: el secreto activo
vive en `efeonce-group`, el secreto legacy de `efeonce-globe` fue eliminado y el PAT legacy fue revocado. El
PAT temporal aprobado para la migración permanece activo hasta su sustitución por una identidad de máquina
antes del rollout externo. El release productivo `30502476429` y el rollback ejercitado están documentados en
[`AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`](docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md).

El payload React activo de Efeonce Globe (`../efeonce-globe`) usa Tailwind v4 como pipeline único de estilos:
composer, shell, diálogos, feed, viewer, share board, primitives y capas base/motion están absorbidos por el
payload Tailwind. El renderer vanilla y `producerStyles` permanecen sólo como fallback de rollout hasta
`TASK-1560`; no confundir esa frontera con una hoja activa en la ruta React.

La dirección de producto móvil de Globe es continuity-first y native-first según [ADR-018](docs/architecture/creative-studio/EFEONCE_GLOBE_MOBILE_CONTINUITY_APPLICATION_DECISION_V1.md): React Native + Expo development builds/CNG es la dirección tecnológica de una companion Android/iOS; web/PWA queda como fallback. El vertical slice debe validar PKCE, deep links, captura, upload interrumpible, push reconciliable, handoff y compatibilidad binary/API; no cambia todavía el runtime ni el rollout internal-only.

La flota de modelos de Globe se resuelve y promueve por identidad exacta de ruta. El estado live se consulta en
`globe.producer.fleet.list` y el mapa humano en `GLOBE_MODEL_FLEET_STATUS.md`; una promoción se cierra con
evaluación/derechos/readbacks y una generación real desde la UI autenticada. Un MIME de transporte genérico nunca
amplía la allowlist global: sólo puede aceptarse para una salida exacta esperada después de verificar sus bytes.
Las atestaciones comerciales son inmutables por identidad de modelo + digest de términos: una corrección jurídica
crea una atestación y policy derivada nuevas, nunca modifica la anterior. La idempotencia de `auto-promote` debe
incluir esa autoridad legal; ruta/workspace/report por sí solos no distinguen una nueva versión de términos. Un
circuito abierto por `promotion_recovery_canary_unattested` es un cierre fail-closed de la saga, no evidencia de que
el driver del proveedor esté roto; primero se leen operación, ruta, circuito y run antes de generar otra pieza.

La administración de créditos de Globe usa el carril gobernado `propose → confirm` de ADR-015 mediante OAuth
público + PKCE (`TASK-1629`; los archivos de migración conservan la etiqueta histórica `task-1616`). Ante una
contradicción de presupuesto, el primer acto es read-only: reconciliar propuesta, pool, grant, policy efectiva,
availability/evaluate, balance, usage, ledger e intents append-only para el mismo workspace/período. `propose`
también crea estado durable; no se ejecuta durante discovery ni se fondea cuando los readers prueban suficiencia.
`TASK-1630` gobierna la convergencia del control plane. Para el workspace interno, una instrucción explícita y
atribuida del CEO ya autoriza una operación one-shot acotada para el mismo usuario/agente autenticado cuando la
policy no exige segundo confirmante. UI browser, OAuth PKCE/CLI y MCP comparten la misma authority state machine;
el write MCP recibe sólo `authorityId` y Globe deriva el ciclo UTC, el pool mensual determinístico y el delta.
La operación live del 2026-08-01 dejó 800 efectivos sobre cap 1500; el canary Seedance posterior consumió 16 y
dejó 784. Workloads nunca confirman y clientes externos
siguen gated. El worker minutely de expiry sólo libera reservations cuando existe evidencia terminal. Los dos
casos históricos sin entregable se resolvieron mediante una decisión Finance exacta y una primitive gobernada,
no por TTL o SQL. El bootstrap de 500.000 de julio se conserva sólo como auditoría append-only: no forma parte
de ninguna proyección operativa, capacidad, KPI, UI, CLI o MCP.

Las superficies internas están operativas: Greenhouse `/admin/globe/credits` administra mediante DTOs redactados
sin segundo ledger y Globe Producer muestra un self-view read-only de effective/funding/cap-spent-held/daily fence.
Cobertura parcial o stale nunca se representa como cero. Los IDs mutables del rollout viven en `Handoff.md` y
`GLOBE_RUNTIME_HANDOFF.md`, no en este contrato durable.

### Lectura mínima obligatoria

1. [AGENTS.md](AGENTS.md): reglas transversales y router de dominios.
2. [Handoff.md](Handoff.md): continuidad activa y riesgos del checkout.
3. La task, issue, epic, spec o auditoría aplicable.
4. [`docs/context/00_INDEX.md`](docs/context/00_INDEX.md) si el trabajo afecta producto, negocio, marca,
   GTM, onboarding, HubSpot, métricas o experiencia cliente.
5. Arquitectura, invariantes y skill indicadas por el router de `AGENTS.md`.

No leer snapshots completos de arranque. Buscar en ellos por keyword solo para investigación histórica.

## Identidad y alcance del repo

- Este repo corresponde al `starter-kit` Greenhouse. `full-version` es referencia visual/funcional, no
  source of truth ni producto activo.
- Greenhouse es plataforma/subproducto de Efeonce; `EO` es abreviación del repo, no nomenclatura visible.
- El gateway MCP federado vive en el repo hermano `efeonce-mcp`, no en Greenhouse ni Globe. Su recurso canónico
  es `https://mcp.efeonce.org/mcp`, corre en Cloud Run dentro de `efeonce-group` y habilita el reader internal-only
  `globe.producer.fleet.list` y el write interno one-shot `globe.credits.funding.ensure`, ambos verificados por
  OAuth PKCE real. El write acepta únicamente una autoridad ya sellada y llama el command Greenhouse canónico.
  Clientes externos continúan bloqueados hasta separar entitlements/emisión de scopes
  B2B y probar una identidad base-only. Greenhouse mantiene sólo ADRs, tasks y handoff de ecosistema.
- Para identidad cliente, separar runtimes no significa separar personas: Greenhouse, `auth.efeonce.org` y MCP
  mantienen cookies, sesiones y audiencias propias, pero resuelven un único `identity_profile` y la membresía de
  Account 360 mediante bindings auditados. La coexistencia inicial con el login cliente actual requiere una ruta
  de convergencia posterior al mismo plano de identidad externo; nunca una segunda identidad o contraseña permanente.
- La operación o evolución MCP se enruta por las skills espejo `.codex/skills/efeonce-mcp-platform/` y
  `.claude/skills/efeonce-mcp-platform/`; estas componen la skill dueña de cada provider y no duplican su policy.
  Las skills de arquitectura `software-architect-2026` y `arch-architect` deben cargar ese router antes de
  proponer una nueva surface, OAuth o binding cross-runtime.
- Wave es una product house hermana para la capa de producto de sus Product Services; sus runtimes y plataformas no se crean dentro de Greenhouse. Greenhouse administra transversalmente las plataformas Efeonce mediante contratos de sister platform. Los productos nuevos nacen Agent Native y con Full API Parity. Canon: [`EFEONCE_WAVE_PRODUCT_PLATFORM_GREENHOUSE_ADMINISTRATION_DECISION_V1.md`](docs/architecture/EFEONCE_WAVE_PRODUCT_PLATFORM_GREENHOUSE_ADMINISTRATION_DECISION_V1.md).
- Greenhouse evolucionará hacia un Ecosystem Work Registry + Federated Execution Harness: mantendrá la visibilidad y coordinación global del trabajo; cada repo conservará ejecución, evidencia primaria, runtime y ownership local mediante contratos, manifests y adapters. Canon: [`GREENHOUSE_ECOSYSTEM_WORK_REGISTRY_FEDERATED_EXECUTION_DECISION_V1.md`](docs/architecture/GREENHOUSE_ECOSYSTEM_WORK_REGISTRY_FEDERATED_EXECUTION_DECISION_V1.md). La implementación está gated; no hay transporte, schema, adapter ni mutación cross-repo autorizados todavía.
- Arquitectura vigente + código/schema/runtime verificados prevalecen sobre tasks o handoffs stale.
- El repo puede convivir con satélites. Ver [`docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`](docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md)
  antes de asumir ownership de otro runtime.

## Ambientes, ramas y despliegue

- Greenhouse: desarrollo normal local-first sobre `develop`. Globe: trabajo directo sobre su rama única `main`.
  Ninguna de las dos ramas autoriza push, deploy, release o promoción automática sin instrucción humana explícita.
- Producción: `main` y `https://greenhouse.efeoncepro.com`; promoción mediante el release control plane.
- Staging/preview y producción tienen configuración separada. Flags, secrets y migraciones deben verificarse
  en cada runtime consumidor, no solo en Vercel.
- El checkout compartido actual es el único entorno de ejecución autorizado. Nunca crear, usar ni tocar
  worktrees/checkouts aislados o carpetas clonadas; si el estado compartido bloquea, detenerse y pedir una
  decisión al operador. Canon: [`REPOSITORY_SHARED_WORKSPACE_AGENT_INVARIANTS.md`](docs/architecture/agent-invariants/REPOSITORY_SHARED_WORKSPACE_AGENT_INVARIANTS.md).
- Canon: [`LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`](docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md),
  [`RELEASE_CHANNELS_OPERATING_MODEL_V1.md`](docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md) y
  [`GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`](docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md).

## Sources of truth por pregunta

| Pregunta                                   | Fuente primaria                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Qué hago ahora                             | `Handoff.md` + artefacto activo                                                                    |
| Qué existe y qué contrato gobierna         | `docs/architecture/**`, ADRs y código/runtime                                                      |
| Por qué se decidió                         | `docs/architecture/DECISIONS_INDEX.md` + ADR                                                       |
| Cómo se ejecuta una unidad de trabajo      | `docs/tasks/TASK_PROCESS.md` / modelo de issue/epic/mini-task                                      |
| Qué pasó históricamente                    | task/issue/commit y snapshots bajo `agent-context-history/`                                        |
| Qué ofrece/opera Efeonce                   | `docs/services/README.md`                                                                          |
| Cómo se presenta Efeonce para capital, inversión y fundraising | `docs/strategy/EFEONCE_CAPITAL_AND_INVESTMENT_STRATEGY_V1.md` + [`ASAAS_MANIFESTO_V1.md`](strategy/ASAAS_MANIFESTO_V1.md) |
| Cómo preparar investor readiness y fundraising | `.codex/skills/efeonce-investor-readiness/SKILL.md` + estrategia de capital + Finance/Legal |
| Cómo diseñar/auditar customer models, business models, pricing y unit economics | `.codex/skills/efeonce-customer-model-operator/SKILL.md` + `.codex/skills/efeonce-business-model-operator/SKILL.md` + `.codex/skills/efeonce-pricing-operator/SKILL.md` + `docs/business-models/README.md` + Finance/Legal |
| Cómo modelar Wave y sus boundaries con Efeonce Digital, Kortex, Globe y Reach | `docs/architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md` + `docs/business-models/wave/WAVE_BUSINESS_MODEL_V1.md` |
| Qué tooling/modelos evalúa Efeonce Globe / Creative Studio | `docs/architecture/EFEONCE_CREATIVE_STUDIO_ENTERPRISE_MODEL_PORTFOLIO_V1.md` + capability registry |
| Cómo crea y captura valor Creative Studio, cómo funcionan sus créditos y qué skills lo adoptan | `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md` + `EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md` + `EFEONCE_CREATIVE_STUDIO_SKILL_ADOPTION_V1.md` |
| Cómo producir posts sociales visuales con reportes, dashboards o evidencia de producto | `docs/operations/GREENHOUSE_SOCIAL_VISUAL_REPORT_PRODUCTION_V1.md` + capas funcional/manual + skills `design-studio` y `social-media-studio` |
| Cómo modelar Efeonce Group, Media & Distribution, Growth Platform, AEO y Search Visibility 360 | `docs/business-models/README.md` + `.codex/skills/efeonce-business-model-operator/SKILL.md` + modelos vigentes |
| Cómo reconciliar el costo del AI Visibility Grader | `docs/audits/cloud-cost/AI_VISIBILITY_GRADER_COST_RECONCILIATION_2026-07-27.md` + documentación funcional/runbook del grader |
| Cómo evaluar el portafolio de partners/providers de IA | `.codex/skills/efeonce-business-model-operator/SKILL.md` + `.codex/skills/efeonce-customer-model-operator/SKILL.md` + audit comercial fechado; economics y routing directo/Fal en `design-studio` y `motion-design-studio` |
| Qué es un Product Service y cómo separar oferta, productización, delivery, operación y engagement | `docs/business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md` |
| Cómo se relacionan los modelos corporativo, portfolio, capability, packaging y submodelo | `docs/business-models/EFEONCE_BUSINESS_MODEL_ARCHITECTURE_V1.md` |
| Cómo se estructura, vende y opera Creative Services, incluido Creative Operations, sus rutas de entrada, Efeonce Run & Gun Studio/Production y sus composiciones | `docs/services/creative-services/EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_V2.md` + `docs/services/creative-services/EFEONCE_CREATIVE_SERVICES_OPERATING_MODEL_V1.md` + `docs/services/creative-services/README.md` + `.codex/skills/creative-practice/modules/03_OFERTA.md` + `.codex/skills/creative-practice/efeonce/EFEONCE_OVERLAY.md` |
| Cómo gobernar derechos, consentimiento, provenance, providers, no-training, retención, contratos y entrega enterprise de creatividad generativa | `docs/architecture/GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md` + `.codex/skills/greenhouse-ai-creative-rights-governance/SKILL.md` + `.codex/skills/greenhouse-ai-creative-rights-governance/references/` + Creative Services/Creative Studio docs + `legal-privacy-ip-operator` |
| Cómo se estructura, vende y opera Social Media, incluido el beachhead B2B experto, Social Search + SEO/AEO y el squad humano | `docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_BUSINESS_MODEL_V1.md` + `docs/services/creative-services/EFEONCE_SOCIAL_MEDIA_PRODUCT_SERVICE_CONTRACT_V1.md` + `.codex/skills/social-media-studio/SKILL.md` |
| Cómo se estructura y vende Media & Distribution, sus tres soluciones, Performance & Commerce, capacidades de delivery, Influencers/UGC y el rol de Reach | `docs/services/media-distribution/README.md` + `docs/business-models/media-distribution/MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md` + `docs/business-models/media-distribution/CREATOR_INFLUENCE_CONTENT_BUSINESS_MODEL_V1.md` + `docs/business-models/media-distribution/CREATOR_INFLUENCE_CONTENT_PRICING_INTEGRITY_PACK_V1.md` + `docs/audits/commercial/CREATOR_INFLUENCE_CONTENT_MARKET_RESEARCH_2026-07-29.md` + `docs/audits/commercial/CREATOR_INFLUENCE_PERFUME_ATHLETES_CHILE_SIMULATION_2026-07-29.md` |
| Cómo se estructura y vende RevOps & CRM/HubSpot, y cómo usar los brochures comerciales como insumo sin volverlos canon | `docs/services/hubspot-as-a-service/README.md` + `docs/audits/commercial/HUBSPOT_BROCHURE_REVIEW_2026-07-26.md` + skills `hubspot-as-a-service` y `hubspot-solutions-partner` |
| Cómo construir y cerrar una licitación client-facing con Artifact Composer, desde evidencia y narrativa hasta deck auditado y Proposal versionada | `docs/commercial/tenders/TENDER_WORKSPACE_TEMPLATE.md` + `docs/commercial/tenders/PROPOSAL_STUDIO_CLOSURE_SCHEMA.md` + `docs/architecture/GREENHOUSE_AGENTIC_QUOTATION_ORCHESTRATION_DECISION_V1.md` + `docs/audits/commercial/EFEONCE_SERVICE_PRICING_LEARNINGS_AND_GUARDRAILS_2026-07-31.md` + expedientes aprobados + skills `greenhouse-public-private-tenders` y `deck-studio`; separar fuentes y gobernanza técnica/económica sin imponer artefactos físicos distintos, derivar todo precio del quote congelado, declarar IVA, pasar `pnpm tender:canonical-gate <slug>` y no emitir stubs/HOLD como oferta |
| Cómo funcionan partnerships/providers, licencias, co-selling, capability enablement y captura de valor en Efeonce | `docs/business-models/EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1.md` + `docs/audits/commercial/AI_PARTNER_PROGRAM_APPLICATIONS_2026-07-26.md` + `efeonce-business-model-operator` |
| Cómo se priorizan beachheads, ofertas de entrada, rutas de expansión, proof y cross-sell | `docs/strategy/EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1.md` + `docs/context/13_icp-buyer-personas-jtbd.md` + `gtm-architect`/`efeonce-customer-model-operator` |
| Contrato transversal de producto y crecimiento operator-first | `docs/strategy/EFEONCE_OPERATOR_FIRST_PRODUCT_AND_GROWTH_CONTRACT_V1.md` + `docs/context/03_ecosistema-producto.md` + `docs/context/10_experiencia-cliente.md` + `efeonce-business-model-operator`/`efeonce-customer-model-operator`/`research-benchmark-operator` |
| Mapa operativo de dolores y fallas del journey del operador | `docs/strategy/EFEONCE_OPERATOR_PAIN_AND_JOURNEY_FAILURE_MAP_V1.md` + `efeonce-customer-experience` + RESEARCH-010 |
| Relación Why → operator-first → CX → Greenhouse | `docs/context/09_marca-agencia.md` + `docs/strategy/EFEONCE_OPERATOR_FIRST_PRODUCT_AND_GROWTH_CONTRACT_V1.md` + `docs/context/10_experiencia-cliente.md` |
| Arquitectura de contenido y learn moments | `docs/strategy/EFEONCE_CONTENT_TO_CAPABILITY_LOOP_V1.md` + `content-marketing-studio` + `efeonce-customer-experience` |
| Cómo se separan marca paraguas, líneas de negocio/prácticas, product brands, ofertas y delivery | `docs/architecture/EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md` |
| Cuál es la directriz estratégica 2028 para todos los servicios | `docs/strategy/EFEONCE_2028_PRODUCTIZED_AI_NATIVE_SERVICES_STRATEGIC_DIRECTION_V1.md` |
| Cómo implementar/operar Globe y dónde leer su estado runtime mutable | `.codex/skills/greenhouse-globe/SKILL.md` + `.claude/skills/greenhouse-globe/SKILL.md` + `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` |
| Cómo compartir UI entre Greenhouse, Globe y futuros productos | `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md` + `TASK-1588` + `TASK-1591` (canary opt-in completo; promoción separada) + `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md` + `../axis-design-system` (AXIS foundation; [`DESIGN.md`](https://github.com/efeoncepro/axis-design-system/blob/main/DESIGN.md) agent-facing generado desde tokens; packages `@efeoncepro/axis-*` y Lab Vercel) |
| Cómo componer Globe con Wave para producir experiencias launch-ready | `docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_GLOBE_CREATIVE_PRODUCTION_INTEGRATION_V1.md` + las skills gemelas `greenhouse-globe` |
| Cómo se administran los créditos y las capabilities de los usuarios de Globe (y por qué la llave de aprobación nunca sale de su runtime) | `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md` (ADR-015) + `TASK-1566` + `.claude/rules/globe-administration.md` |
| Cómo debe razonar, documentar y autoevaluarse el arquitecto Codex | skill `software-architect-2026` + `docs/architecture/GREENHOUSE_SOFTWARE_ARCHITECT_SKILL_GOVERNANCE_V1.md` + `evals/software-architect-2026/` |
| Cómo opera el scheduler nativo, su booking/medición y la plataforma portable de Forms/CTAs/Meetings | `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md` + `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V2.md` + `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_ARCHITECTURE_V1.md` + skill `greenhouse-growth-meetings` |
| Qué significa para producto/negocio        | `docs/context/00_INDEX.md` + docs funcionales                                                      |
| Cómo lo opera una persona/agente           | `docs/manual-de-uso/**` y runbook aplicable                                                        |

## Loop operativo vigente

Todo trabajo formal sigue:

`intake -> taxonomy -> plan -> execution -> verification -> closure -> handoff`

- Modelo: [`GREENHOUSE_OPERATING_LOOP_V1.md`](docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md).
- Tasks: [`docs/tasks/TASK_PROCESS.md`](docs/tasks/TASK_PROCESS.md).
- Calidad de solución: [`SOLUTION_QUALITY_OPERATING_MODEL_V1.md`](docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md).
- QA: skill `greenhouse-qa-release-auditor` + `pnpm qa:gates --changed`.
- Cierre documental: skill `greenhouse-documentation-governor` + `pnpm docs:closure-check`.
- Contexto: `pnpm docs:context-check`; modo de cierre/enforcement: `pnpm docs:context-check:strict`.

## Entry points ejecutables

- **GCP local multi-proyecto:** mantener `default` en `efeonce-group` y usar la configuración nombrada
  `globe` para `efeonce-globe`; preferir `gcloud --configuration=globe ... --project=efeonce-globe`
  para no mutar el contexto compartido. La configuración no sustituye IAM ni cambia la postura runtime.
  Detalle operativo: [`GLOBE_RUNTIME_HANDOFF.md`](docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md#cli-local-multi-proyecto).
- Cambio en task/epic/mini-task: `pnpm ops:lint --changed`.
- Ejecución Codex de `TASK-###`: goal preflight y luego `pnpm codex:task-hook TASK-###`; aliases aceptados:
  `/implement-task TASK-###`, `/implement-task ###`, `/task TASK-###` y `/task ###`.
- Ejecución Codex de `ISSUE-###`: `pnpm codex:issue-hook ISSUE-###`.
- UI visible: primero `greenhouse-ai-design-studio`; después contratos UI, GVC desktop/mobile y gates premium.
- Captura visual: `pnpm fe:capture`, `pnpm fe:capture:review`, `pnpm fe:capture:diff`.
- Producción estática reproducible: `pnpm creative:layout -- --contract <yaml|json> --mode plan|compile|check`;
  binarios de `ai-generations` se archivan con `pnpm media:archive-ai-generation` y Git conserva su manifest.
- PostgreSQL: `pnpm pg:connect`; no improvisar pools ni credenciales.
- Workers/Cloud Build: `pnpm worker:build-contract-gate` valida toolchain, inputs `file:`, Docker contexts y
  triggers; `pnpm worker:runtime-deps-gate` valida la dependency closure runtime de los cuatro workers.
- Sitio público por SSH/WP-CLI: `pnpm public-website:ssh-check` antes de mutar.
- Contexto histórico: `rg -n '<keyword>' docs/operations/agent-context-history`.

## Contratos transversales no negociables

- Reusar primitives, readers, commands, routes, copy, signals y helpers antes de crear piezas paralelas.
- Toda capacidad ejecutable en Greenhouse debe tener o planificar API parity; la UI no es el único camino.
- No declarar cierre si faltan flags, secrets, deploy, migración, backfill, worker/cron/webhook, datos reales o
  verificación runtime.
- Copy reutilizable vive en `src/lib/copy/*`; nomenclatura institucional en
  `src/config/greenhouse-nomenclature.ts`.
- Seguridad: no imprimir secretos/raw errors, no improvisar accesos y preferir CLIs autenticados con guardrails.
- Auditorías son evidencia fechada, no verdad permanente: revalidar contra código y runtime.
- Trabajo nuevo durante EPIC-027 debe ser extraction-ready y declarar placement sin crear deployables por
  anticipado. Canon: build-unit decision + modular migration operating model.

## Contexto por dominio

El mapa canónico está en [AGENTS.md](AGENTS.md#router-de-dominios). Cargar solo la fila aplicable: skill,
invariantes, arquitectura y task. Su versión machine-readable vive en
[`docs/operations/agent-context-router.json`](docs/operations/agent-context-router.json). Si una regla no aparece en el router:

1. buscar keyword en arquitectura, operations y skills;
2. buscar en el snapshot [`AGENTS.legacy.md`](docs/operations/agent-context-history/2026-07-19/AGENTS.legacy.md);
3. contrastar con código/runtime;
4. corregir el router o el documento canónico antes de depender de memoria histórica.

## Memoria histórica e integridad

- Snapshot íntegro del contexto anterior: [índice 2026-07-19](docs/operations/agent-context-history/2026-07-19/README.md).
- El manifest SHA-256 prueba que no se perdió el texto original durante la compactación.
- Los snapshots no gobiernan comportamiento vigente y no deben editarse.
- `project_context.md` no acepta secciones `## Delta YYYY-MM-DD`; cambios históricos van a changelog,
  tasks/issues/ADRs o archivo, según ownership.
