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

Las decisiones de arquitectura de Globe se enrutan por el overlay `.claude/skills/arch-architect/globe-overlay.md`
(pinned decisions G1–G10, los dos bug class canonizados y cómo condiciona un modelo generativo). Decide la FORMA;
la skill espejo `greenhouse-globe` (`.claude/` + `.codex/`, paridad verificada por `pnpm skills:mirrors`) llena la
implementación. Cada ruta ejecutable publica un contrato creativo versionado y autocontenido —operación, slots con
rol, combinaciones, controles con mecanismo y forma de valor, contrato de salida— según
[ADR-022](docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md): el contrato
declara qué honra la ruta y el brief lleva el valor pedido, nunca al revés, y la forma de salida (duración, ratio,
resolución) pertenece a `RouteConstraintsV1`/`OutputShapeV1`. La compilación del prompt efectivo es por ruta.

La captura de completitud de un proveedor es **propiedad del proveedor, no una elección nuestra**, según
[ADR-021](docs/architecture/creative-studio/EFEONCE_GLOBE_PROVIDER_COMPLETION_CAPTURE_DECISION_V1.md): Fal avisa
por webhook firmado **por request**, OpenAI **no emite eventos de imagen** —así que su `poll` es correcto por
diseño, no una deuda— y Vertex sólo ofrece la operación de larga duración. El aviso acelera y nunca es la única
vía. Una firma válida **no prueba propiedad** cuando el JWKS del proveedor es global; las URLs de seguimiento de
Fal **no son derivables** y se declaran por endpoint desde evidencia medida; el código HTTP que devolvemos
gobierna si el proveedor reintenta. Y cuando un run llega a terminal, **todo agregado dependiente converge o
queda observable**, declarado como lista enumerable cuyo incumplimiento rompe el build.

Una **vista que reemplaza a una tabla debe proyectar la MISMA superficie**: un swap de una línea convierte a cada
consumidor existente en un error de parseo diferido que sólo aparece ejercitando el camino (`TASK-1641`, medido el
2026-08-04 — `42703` en planificación saliendo como `internal_error` 500). Dos trampas del carril de migraciones de
Globe que no se ven leyendo el archivo: `CREATE OR REPLACE VIEW` **no puede** reordenar ni renombrar columnas
(`42P16`, va `DROP`+`CREATE`), y su runner ejecuta el **archivo completo sin parsear markers**, así que una sección
`-- Down Migration` —convención de `node-pg-migrate`, ajena a ese repo— se ejecuta y deshace el arreglo. Y **un
checkpoint de saga nunca va delante de una lectura pura**: no protege nada y consume el único estado desde el que
se puede reintentar.

La flota de modelos de Globe se resuelve y promueve por identidad exacta de ruta. El estado live se consulta en
`globe.producer.fleet.list` y el mapa humano en `GLOBE_MODEL_FLEET_STATUS.md`; una promoción se cierra con
evaluación/derechos/readbacks y una generación real desde la UI autenticada. Un MIME de transporte genérico nunca
amplía la allowlist global: sólo puede aceptarse para una salida exacta esperada después de verificar sus bytes.
El método transversal para añadir o auditar proveedores es `greenhouse-globe-model-fleet`, espejado para Codex y
Claude; sus route cards machine-readable viven en `docs/architecture/creative-studio/model-fleet/routes/` y nunca
sustituyen la autoridad live del reader. ADR-023 y el card inicial de FLUX 3 fijan la separación entre evidencia del
proveedor, cables de integración y disponibilidad de Globe; el baseline auditado también cubre Gemini Omni, Veo 3.1,
Seedance 2.0/R2V, GPT Image 2, Seedream 5 Pro, Nano Banana 2/Pro y Kling 3.0. “Imagen 2 de ChatGPT” se normaliza a
`gpt-image-2`; Google `imagen-2` no tiene ruta en Globe. Seedream T2I, GPT Image 2 y Nano Banana 2/Pro están disponibles
según el reader live; Seedream Edit queda `gated` por binding deshabilitado. Seedream Lite, edición de OpenAI/Nano
Banana y video-to-image de Nano Banana permanecen como superficies no públicas hasta tener ruta, binding, canary y
readback propios. Un lookup de circuito `not_found` para Nano Banana Pro es blocker operativo explícito.
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

El módulo Growth SEO (`growth.seo`, EPIC-022) autoriza todo run por un único chokepoint, `enforceSeoRunEntitlement`
(`src/lib/growth/seo/entitlement.ts`), con entitlement per-org vía el módulo `seo_v1` de
`greenhouse_client_portal.modules`; contrato en
[`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §9 (§17
contrata el seam de extracción hacia Wave). Los reads del módulo son readers canónicos consumer-agnósticos —
`readKeywordOpportunities` y `readSeoAeoGap` (este último cruza SEO↔AEO respetando el boundary de §1.1) —
expuestos por el lane ecosystem `/api/platform/ecosystem/growth/seo/*` y sus 3 MCP tools (TASK-1645); regla
durable del módulo: **todo reader SEO nuevo expone su MCP tool en el mismo PR**. Desde 2026-08-06 ese camino
está **vivo en producción y federado en `mcp.efeonce.org`** (TASK-1645 + TASK-1647 complete; provider
`greenhouse-seo` en el gateway, revisión `efeonce-mcp-gateway-00012-dkj`): preguntar por MCP por la
visibilidad 360 de una org entitled devuelve su quadrant real, y una org fuera del binding falla cerrada.
El flag `GROWTH_SEO_ENABLED` es **multi-runtime** — Vercel (lane) + `ops-worker` (materializer GSC);
prenderlo en uno solo deja el otro camino muerto. Su primera captura corre live
desde 2026-08-05: la serie propia de
Google Search Console (`greenhouse_growth.seo_gsc_daily`) se materializa a diario en el **ops-worker** —
**servicio Cloud Run único compartido staging+prod**, así que una capacidad worker-only queda viva al mergear a
`develop`, sin release control plane, y **no existe un flip "sólo staging"** (invariantes en
[`OPS_RELIABILITY_AGENT_INVARIANTS.md`](docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md)).

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
- Greenhouse ya dispone de NextAuth y un broker OAuth sister-platform reutilizable. `TASK-1631` debe decidir entre
  WorkOS, extraer ese broker a `auth.efeonce.org` o un híbrido; el broker actual no es todavía un authorization
  server MCP público y debe ganar metadata/CIMD-DCR, callbacks hospedados, consent/grants y verificación compatible
  con el gateway antes de atender clientes.
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
| Cómo funcionan partnerships/providers, licencias, co-selling, capability enablement y captura de valor en Efeonce | `docs/operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md` + `docs/business-models/EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1.md` + `docs/audits/commercial/AI_PARTNER_PROGRAM_APPLICATIONS_2026-07-26.md` + `efeonce-business-model-operator` |
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
