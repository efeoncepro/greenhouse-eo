# Contexto vigente del repositorio

## Estado vigente para agentes

Greenhouse es la plataforma operativa de Efeonce Group sobre Next.js 16, MUI 7, Vuexy starter-kit y
TypeScript. Este archivo contiene solo contratos durables y rutas de descubrimiento. El estado de una sesión,
rollout o bloqueo vive en [Handoff.md](Handoff.md); la historia pre-2026-07-19 quedó preservada en
[`docs/operations/agent-context-history/2026-07-19/project_context.legacy.md`](docs/operations/agent-context-history/2026-07-19/project_context.legacy.md).

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
- Arquitectura vigente + código/schema/runtime verificados prevalecen sobre tasks o handoffs stale.
- El repo puede convivir con satélites. Ver [`docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`](docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md)
  antes de asumir ownership de otro runtime.

## Ambientes, ramas y despliegue

- Desarrollo normal: local-first sobre `develop`; no hacer push, merge, release ni promoción automática sin
  instrucción humana explícita.
- Producción: `main` y `https://greenhouse.efeoncepro.com`; promoción mediante el release control plane.
- Staging/preview y producción tienen configuración separada. Flags, secrets y migraciones deben verificarse
  en cada runtime consumidor, no solo en Vercel.
- Nunca cambiar la rama de un checkout compartido con trabajo ajeno. Coordinar o usar worktree solo con
  autorización/justificación aplicable.
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
| Cómo modelar Efeonce Group, Growth Platform, AEO y Search Visibility 360 | `docs/business-models/README.md` + `.codex/skills/efeonce-business-model-operator/SKILL.md` + modelos `Draft` vigentes |
| Cómo evaluar el portafolio de partners/providers de IA | `.codex/skills/efeonce-business-model-operator/SKILL.md` + `.codex/skills/efeonce-customer-model-operator/SKILL.md` + audit comercial fechado; economics y routing directo/Fal en `design-studio` y `motion-design-studio` |
| Qué es un Product Service y cómo separar oferta, productización, delivery, operación y engagement | `docs/business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md` |
| Cómo se relacionan los modelos corporativo, portfolio, capability, packaging y submodelo | `docs/business-models/EFEONCE_BUSINESS_MODEL_ARCHITECTURE_V1.md` |
| Cómo se separan marca paraguas, líneas de negocio/prácticas, product brands, ofertas y delivery | `docs/architecture/EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md` |
| Cuál es la directriz estratégica 2028 para todos los servicios | `docs/strategy/EFEONCE_2028_PRODUCTIZED_AI_NATIVE_SERVICES_STRATEGIC_DIRECTION_V1.md` |
| Cómo implementar/operar Globe y dónde leer su estado runtime mutable | `.codex/skills/greenhouse-globe/SKILL.md` + `.claude/skills/greenhouse-globe/SKILL.md` + `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` |
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
