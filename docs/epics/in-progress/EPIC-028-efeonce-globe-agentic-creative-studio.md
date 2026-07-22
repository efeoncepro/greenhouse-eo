# EPIC-028 — Efeonce Globe: Creative Studio agentic de producción profesional

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `El vertical slice completo del Producer aprobado está code-complete y verificado localmente —UI source-led, bridge humano, generación multimodal, referencias, library, edición, créditos y review/share—, pero el runtime interno desplegado sigue vivo sólo hasta TASK-1503. El rollout requiere migrations, secrets, IAM/grants, flags, workers/providers y canaries; el runtime comercial sigue bloqueado por TASK-1521 + readiness TASK-1480.`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `Efeonce Creative Technology / Product`
- Branch: `main` en el repositorio hermano
- GitHub Issue: `TBD — backlog operativo en https://github.com/efeoncepro/efeonce-globe`

### Checkpoint 2026-07-22 — Producer integrado localmente

- La UI aprobada de `TASK-1505` dejó de ser intención: está implementada con su riqueza visual y funcional,
  motion/reduced-motion, responsive 390 px, teclado, viewer, compare, inpaint, library, budgets, referencias,
  presets/Style DNA, créditos y review/share. La auditoría visual source-led obtuvo `4.69/5` y `PASS`.
- `TASK-1504`, `TASK-1519`, `TASK-1520` y `TASK-1522` están integradas y verdes en local sobre contracts
  reales. Esta evidencia no equivale a rollout: despliegue, migrations, secrets, IAM/grants, flags, workers,
  provider canaries y smoke humano permanecen pendientes y se declaran como gate operativo.
- La secuencia vigente ya no es “recortar la UI hasta lo que soporte el backend”, sino desplegar por capas las
  capabilities que la UI aprobada consume, preservando fail-closed, lineage, idempotencia y control de gasto.

## Summary

Construir **Efeonce Globe**, la capability creativa propia de Efeonce, como una plataforma **agentic por nacimiento** para imagen, video, audio y extensiones futuras. Creative Studio es su descriptor funcional. El producto se opera por UI, MCP y agentes sobre el mismo contrato, pero la experiencia humana empieza en briefs, referencias, tratamientos, candidatos y review; el workflow técnico se compila por debajo. Templates/rúbricas de Efeonce, assets trazables, gasto controlado y revisión humana viven en una plataforma hermana: Greenhouse la integra como consumidor, no la hospeda.

## Why This Epic Exists

Los pilotos de RRSS y Glitch demostraron que generar media es sólo una fracción del trabajo. El valor operacional está en elegir el motor según fidelidad requerida, preservar el set/derechos, controlar créditos, revisar acción/anatomía/sonido y conservar la decisión para repetirla. Si se construye UI-first, MCP/agentes y clientes llegarían tarde y con lógica duplicada. Si se construye dentro de Greenhouse, se agrava su runtime y se desdibuja la propiedad del dominio creativo.

Este programa convierte esos aprendizajes en una capability de agencia acumulable y, después, vendible: **capacidad creativa + dirección + memoria**, no reventa de tokens de un proveedor.

El producto no sustituye la capacidad de agencia. Crea un flywheel: Efeonce prueba craft en operación managed, convierte patrones validados en templates, habilita autonomía cliente en trabajo repetible y conserva el contexto para que Efeonce absorba excepciones, picos y producción de alta incertidumbre sin reiniciar el proyecto.

## Outcome

- Existe un repositorio y runtime propios de Creative Studio con tenancy, assets, ledger, auditoría y workers aislados de Greenhouse.
- Un operador o agente autorizado puede preparar, estimar, aprobar, ejecutar, revisar y ramificar una corrida mediante el mismo contract UI/MCP.
- Cada capability nace con schema versionado, command/reader transport-neutral, trusted context, HTTP/SDK path,
  coverage matrix y conformance tests; una surface puede estar `policy-blocked`, pero no quedar sin contrato.
- El estimate y el historial del run hacen visible el provider/modelo/version propuesto y realmente ejecutado,
  incluyendo readiness, limitaciones y fallbacks, sin exponer secretos, costo vendor confidencial ni margen.
- El mismo run soporta `client-operated`, `co-operated` y `efeonce-managed` mediante responsabilidades y entitlements explícitos; cambiar de modo conserva brief, assets, lineage, review y ledger.
- La UI principal permite trabajar en lenguaje creativo y compila decisiones aprobadas en templates/runs; un canvas DAG queda como authoring avanzado, no onboarding universal.
- La primera plantilla curada de media funciona con provider routing basado en contrato de fidelidad y gates creativos/económicos verificables.
- Greenhouse/Verk/Think consumen sólo proyecciones, eventos o deep links versionados cuando corresponde; no bases de datos, secrets ni lógica compartida.
- La plataforma queda preparada para habilitar clientes y créditos comerciales sin rediseñar identidad, autorización o modelo de costos.

## Architecture Alignment

- [ADR — Efeonce Creative Studio: plataforma agentic peer con paridad UI + MCP](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md)
- [Efeonce Creative Studio — Agentic Platform Architecture V1](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md)
- [PDR-003 — Layering del ecosistema digital Efeonce](../../public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md)
- [Greenhouse Sister Platforms Integration Contract V1](../../architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md)
- [Efeonce Product Ecosystem](../../context/03_ecosistema-producto.md)
- [Creative Studio Business Model V1](../../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md)
- [Studio Credit Model V1](../../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md)
- [Globe Design System Governance Decision V1](../../architecture/EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1.md)
- [Globe Producer — Human Execution + Approved Product Target Decision V1](../../architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md)

## Child Tasks

> Greenhouse es el único control plane operativo: registra `TASK-###`, dependencias, lifecycle, hooks, lint,
> QA, cierre documental y handoff incluso cuando los paths de implementación viven en el repositorio hermano.
> Globe posee código, datos, infraestructura, ejecución creativa y evidencia técnica; su execution plan referencia
> estas tasks, pero no mantiene un registry ni un namespace de trabajo paralelo.

- `TASK-1454` — **Greenhouse ↔ Globe federated identity and governed SDK bridge.** Única task Greenhouse explícita de esta fase: generaliza el broker reusable, registra Globe internal-only y prueba SSO/WIF/ADC sin llaves. No mueve runtime creativo a Greenhouse ni habilita producción/clientes externos.
- `TASK-1455` — **Globe internal launch and brand shell.** Superficie humana internal-only, identidad visual y
  estados de sesión/recovery; no implementa el Studio funcional.

- `TASK-1456` — gobierno central y operating model parallel-first.
- `TASK-1481` — **API Contract Spine y cross-surface conformance harness**, gate técnico anterior al primer
  provider call; no bloquea la lane IaC de `TASK-1464`.
- `TASK-1457…1463` — **Model Lab y craft:** sandbox seguro, fixtures/evals, still, motion, audio, campaña E2E y
  registry de readiness. Las integraciones reales empiezan temprano bajo hard budgets y private ingest.
- `TASK-1464…1475`, `TASK-1482…1483`, `TASK-1485` — **plataforma gobernada:** IaC, tenancy, responsabilidad,
  rights/assets, kernel shadow credits, pools/grants/budgets, lifecycle transaccional, adapters promovidos,
  composición determinística, review/delivery, MCP, workbenches y proyección Greenhouse.
  `TASK-1466` está completa sobre SPEC-008: migración Cloud SQL, deploy internal-only, smoke autenticado y readback
  de assignment/audit pasaron. Satisface el contrato de responsabilidad por run; no habilita clientes externos.
- `TASK-1476…1480` — **validación comercial:** demo/Sample Sprint managed, buyer discovery, 30–50 runs de
  calibración, pilotos por modo y commercial approval. `TASK-1480` no habilita clientes sin sign-off explícito.
- `TASK-1484` — **monetización bloqueada:** implementa packages/billing/tax/revenue/payments sólo después de
  un `commercial_decision_record` aplicable; tampoco habilita cobros/clientes sin rollout posterior.
- `TASK-1500…1505` — **Creative Producer (superficie hermana del Workbench).** `TASK-1500` (catálogo de rutas
  gobernado), `TASK-1501` (contrato discriminado por modalidad) y `TASK-1502` (estimate previewable) quedaron
  completas el 2026-07-20. `TASK-1503` ✅ **completa (2026-07-22) y viva en el runtime interno:** el output side
  —traer los bytes de un candidato ya generado, marcarlo favorito y copiarlo como referencia— bajo la capability
  propia `globe.producer.assets.operate`, de **gasto cero** y deliberadamente separada de
  `globe.lab.experiment.run`. Corre en `globe-api-internal` rev `00017-xfm` con
  `GLOBE_PRODUCER_ASSETS_ENABLED=true` (default en git), el secreto HMAC `globe-producer-grant-secret` con
  accessor sólo a `api_runtime` y la migración `0003` aplicada; `ui`/`mcp` siguen `policy-blocked`.
  `TASK-1504` está **code-complete y verificada localmente**: Image/Video/Audio, multi-output y presets viven
  sobre contratos gobernados; despliegue y provider canaries siguen pendientes. `TASK-1505` implementa la
  **superficie aprobada completa**, no un MVP recortado: composer, library/viewer, collections/batch, budgets,
  provenance/lineage, collaboration/share y operator UX. Está validada localmente y no habilita clientes externos.
- `TASK-1519` — **Producer Human Execution Bridge + Surface Enforcement.** Desbloquea browser humano por
  `studio-web` same-origin BFF hacia la API IAM-private, con broker grants, delegación actor/workspace,
  correlation/idempotency y enforcement real de `surface=ui` separado del coverage manifest. Está code-complete
  localmente; faltan secret/env, broker grants, IAM invoker, flags y smoke/revocación sobre el runtime desplegado.
- `TASK-1520` — **Producer Asset Library, Collections + Bulk Operations.** Proyección paginada de generations,
  annotations y lineage; collections y commands batch idempotentes/auditados. Reusa retrieval/lineage y no crea
  un segundo source of truth. Está code-complete localmente; faltan migration, bucket/secret/IAM/grants y smoke.
- `TASK-1522` — **Review, comments + share foundation.** Comments, estados de review y enlaces gobernados están
  integrados localmente; faltan migration, secret/grants y verificación sobre el runtime desplegado.
- `TASK-1521` — **Globe Commercial Runtime Environment Enablement.** Posee el bloqueo actual que impide bootear
  fuera de `internal_smoke`: environment contract, isolation/config, secrets, migrations, rollback y evidencia.
- `TASK-1506` — **frontend hosting and front door decision (RESUELTA — ADR-004).** Gate P0 cerrado: la ADR
  `EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md` mantiene Cloud Run como web/BFF para la release
  internal-only (rechaza migrar a Vercel), adopta el servidor Node nativo (Next.js `superseded` para el shell
  interno), fija el front door de `globe.efeoncepro.com` vía Global External ALB + serverless NEG, y deja el host
  del **frontend cliente comercial** como decisión diferida (revisit en `TASK-1505` + pre-`TASK-1480`). No mutó
  runtime/DNS/OAuth: eso lo implementa la sucesora `TASK-1507`.
- `TASK-1507` — **front door internal-only IMPLEMENTADO (complete 2026-07-21).** `globe.efeoncepro.com` (IP global
  `8.233.189.79`) sirve `globe-studio-internal` por Global External ALB + serverless NEG (`southamerica-west1`), con
  managed cert `ACTIVE` y 301 HTTP→HTTPS; `GLOBE_PUBLIC_BASE_URL` cortado al dominio e ingress endurecido a
  `internal-and-cloud-load-balancing`. `globe-api-internal` sigue IAM-private, sin custom domain y con audience
  `run.app`. El redirect `run.app` se **conserva** en el allowlist como camino de rollback. Sigue siendo
  internal-only: no habilita Production ni clientes externos.
- `TASK-1508` ✅ **completa (2026-07-21): Cloud Run IaC + deploy ownership.** Adoptó los 2 servicios
  vivos mediante import no destructivo (`2 imported / 2 changed / 0 destroyed`) + el invoker binding de la api, y
  reconcilió Terraform con `deploy-internal.yml`: Terraform gobierna configuración estable; el workflow quedó
  **image-only** (sólo `--image`). Cerró el drift de `invokerIamDisabled`, del ingress y de la escala. **Corrigió
  además un cap efectivo de 1 instancia que ningún doc registraba:** `--max-instances` escribe el ceiling de servicio
  desde `run deploy` y el de revisión desde `run services update`, Cloud Run aplica el menor y ambos servicios estaban
  en servicio=1 / revisión=3 — corregido a **3/3**, con ambos campos en Terraform (provider `google` `~> 6.0` →
  `~> 7.0`). Anti-drift probado en dos ciclos, uno por servicio, ambos con `tofu plan` en `No changes`.

### Front door ordering contract

- `TASK-1506` cerró la decisión (ADR-004) y `TASK-1507` la implementó: el custom domain quedó publicado **antes** del
  rollout interno de `TASK-1505`, del rollout del workbench `TASK-1474`, del canary/cutover de callbacks de
  `TASK-1469` y de publicar deep links en `TASK-1475`. **La base URL estable del shell interno es
  `https://globe.efeoncepro.com` + SSO**; el `*.run.app` dejó de ser alcanzable por browser (ingress
  `internal-and-cloud-load-balancing`) y sólo persiste en el allowlist OAuth como camino de rollback.
- Un dominio internal-only puede implementarse (vía `TASK-1507`) sin esperar `TASK-1480`. La persistencia durable
  **ya aterrizó**: `TASK-1465` (complete, deployed + live-verified 2026-07-21) movió sesión/OAuth/experimentos/
  eval/spend-fence + un audit log append-only a Cloud SQL `globe-pg`, con lo que **se levantó el techo de HA** que
  gateaba `maxScale > 1` — ambos servicios Cloud Run corren durable. El ceiling quedó gobernado por IaC recién con
  `TASK-1508`, que además destapó que el techo efectivo **era 1** (servicio=1 / revisión=3, Cloud Run aplica el menor)
  y lo corrigió a **3/3**: el workflow ya no pasa `--max-instances` y Terraform gobierna ambos ceilings. Production/clientes externos
  permanecen bloqueados por `TASK-1480` y un release explícito posterior. El host del frontend cliente comercial es
  una decisión diferida (ADR-004).
- La adopción IaC de servicios ocurrió después del dominio (`TASK-1508`, completa) y corrigió un cap efectivo de 1 instancia que ningún doc registraba; no autoriza Production ni clientes externos.

### Parallel execution contract

Model Lab, plataforma y validación comercial son carriles complementarios, no fases mutuamente excluyentes.
Una ruta puede probarse en vivo con credenciales gobernadas, presupuesto duro, inputs autorizados, manifest e
ingest privado antes de que exista el wallet comercial completo. Sólo puede promoverse a UI/MCP cuando además
tenga tenancy, idempotencia, estimate/reservation, rights policy, eval calificada, observabilidad y rollback.
Desde el primer canary, sin embargo, la llamada entra por el spine de `TASK-1481`: API/SDK o harness normal →
command/reader → adapter → runner. Parity contractual nace temprano; habilitar una surface es un gate separado.

Esto habilita vender primero un **Sample Sprint Efeonce-managed** basado en una campaña demostrable: Efeonce
opera Globe internamente y el cliente compra capacidad/outcome gobernado. `Studio Access`, operación cliente,
precios públicos y wallet self-serve permanecen posteriores a la calibración y aprobación comercial.

### Producer execution order (vigente tras integración local)

1. Congelar el baseline aprobado y su scorecard como gate de regresión: ningún rollout puede sustituir assets,
   motion, microinteracciones o estados por versiones empobrecidas.
2. Aplicar, en orden y con rollback, las migrations de tenancy/lifecycle/readiness, library/recipes/créditos y
   review/share; después provisionar buckets, secrets y service accounts sin compartir credenciales.
3. Activar `TASK-1519`: delegación actor/workspace, broker grants, origin allowlist, IAM invoker y enforcement
   `surface=ui`; verificar expiración/revocación, correlation e idempotencia con smoke humano autenticado.
4. Activar workers, callbacks y reconciliation de `TASK-1469`; habilitar el provider router y referencias sólo
   después de ADC/WIF, provider secrets, budgets y content-addressed ingest. Ejecutar canaries billables acotados.
5. Desplegar `studio-web` con la UI aprobada y ejecutar GVC desktop + 390 px, teclado, reduced motion, overflow,
   viewer/compare/inpaint, library, credits y review/share contra el runtime real.
6. Completar release/delivery y observabilidad, rollback y recuperación; sólo entonces declarar el Producer
   internal-only operativo. `TASK-1521` + `1477/1478/1479/1480` siguen siendo gates para acceso comercial.
7. `TASK-1474` monta el Workbench brief-first sobre los mismos primitivos; no los duplica.

## Existing Related Work

- Pilotos y evidencia: `ai-generations/2026-07-11_glitch-microphone-intro/` y el workflow RRSS documentado en sus manifests/retrospectivos.
- Investigación activa de Creative Operations, agentes y patrón builder/runner: [RESEARCH-009](../../research/RESEARCH-009-creative-operations-agentic-workflows.md). Es input de bootstrap; no habilita implementación dentro de Greenhouse.
- Territorio científico/editorial: [PDR-014](../../public-site/decisions/PDR-014-creative-workflows-territorio-editorial-pillar-cluster.md) + [brief Pillar/cluster](../../public-site/CREATIVE_WORKFLOWS_PILLAR_CLUSTER_BRIEF_V1.md). Puede informar lenguaje, hipótesis y prioridades de investigación; no implementa workflows ni autoriza runtime/backlog.
- Skills operativas: `.codex/skills/motion-design-studio/` y `.codex/skills/audio-studio/` (con espejos Claude).
- Propuestas históricas ahora superseded como runtime Greenhouse: `GREENHOUSE_CONTENT_FACTORY_MEDIA_GENERATION_*`, `GREENHOUSE_CREATIVE_FLOW_STUDIO_DECISION_V1.md` y `GREENHOUSE_CREATIVE_VIDEO_STUDIO_V1.md`.
- `TASK-996` conserva historia del piloto HyperFrames; no es el vehículo de implementación de este epic.

## Exit Criteria

- [ ] Repositorio y límite cloud aislados, con IaC, IAM/secret/tenant posture y evidencia runtime completa. El repositorio privado y el proyecto `efeonce-globe` ya existen; hardening y recursos runtime siguen pendientes.
- [ ] Las capacidades de la primera plantilla funcionan mediante UI y MCP sobre el mismo command/reader layer, con autorización e idempotencia verificadas.
- [ ] Globe posee su propio Design System incremental. Greenhouse gobierna registry/lifecycle/QA/evidencia;
      Globe posee patterns/components/motion/runtime y no hereda el sistema UI Greenhouse.
- [ ] Existe un contract spine machine-readable con schemas versionados, trusted actor/workspace context,
      errores canónicos y coverage matrix por capability/surface.
- [ ] El primer provider canary y el E2E usan API/SDK/conformance harness sobre el mismo primitive; no existen
      direct provider calls desde UI, MCP, CLI, scripts de task o tests con backdoor.
- [ ] `TASK-1473` certifica transports/SDK/MCP sin introducir business logic ni reparar parity tardía.
- [ ] Un run completa el lifecycle estimate → reserve → approve → execute → candidate → review → settle/release sin doble gasto ni pérdida de evidencia.
- [ ] Pools, grants y project budgets se aplican transaccionalmente sobre el mismo ledger; no existe un segundo
      saldo ni un pre-check TOCTOU fuera de `reserveCredits`.
- [ ] Estimate, approval y run history muestran ruta propuesta versus ruta real por attempt; un fallback nunca
  cambia de modelo silenciosamente ni convierte provider/modelo en la unidad de crédito.
- [ ] Assets, referencias, provider attempts, output y review poseen lineage y acceso scoped por workspace.
- [ ] Cada run identifica operador, aprobadores de creatividad/gasto, autoridad de template/derechos y owner de delivery; un cambio de modo es auditado y no pierde contexto ni eleva permisos por sí solo.
- [ ] Existe al menos una prueba `efeonce-managed` y una simulación co-operated/client-operated sobre el mismo template/run contract, con responsabilidades, escalamiento y métricas diferenciadas.
- [ ] Existe un set de fixtures/evals que incluye al menos un caso de set/practical + actuación/foley y uno de microescena flexible; la selección de motor queda explicable.
- [ ] Integración sister-platform se limita a contrato versionado/documentado y no introduce base de datos, sesión o secret compartido.
- [ ] Habilitar a un cliente, pago/tax o publicación automática permanece bloqueado hasta sus decisiones de
      legal/finance/rights y sus tasks de rollout. `TASK-1521` posee el bloqueo duro actual:
      `readStudioRuntimeConfig` rechaza cualquier `GLOBE_ENVIRONMENT` distinto de `internal_smoke`; debe entregar
      contrato de environment, aislamiento, migrations/secrets/rollback y evidencia antes de `TASK-1480`.

## Non-goals

- No construir un clon generalista de Higgsfield/ComfyUI ni un canvas libre como primera entrega.
- No pedir a creativos o equipos de marketing que diseñen nodos, proveedores o prompts internos para usar templates curados.
- No mover el runtime creativo a Greenhouse ni exponer Greenhouse como proxy de providers.
- No vender créditos ni procesar pagos antes de definir propiedad comercial, impuestos, refund y derechos.
- No prometer publicación autónoma, aprobación creativa automática ni reemplazar dirección/criterio humano.
- No declarar que un modelo es “mejor” globalmente: la evaluación es por contrato de fidelidad y evidencia de fixture.
- No inferir features, schemas, commands, templates ejecutables ni tasks desde artículos o assets editoriales.

## Delta 2026-07-11

Epic creado desde la decisión explícita del operador: la capability debe nacer agentic y ser operable por UI y MCP con el mismo contrato. La siguiente acción es decidir el bootstrap del repositorio/proyectos, no abrir implementación dentro de `greenhouse-eo`.

## Delta 2026-07-14

El programa adopta un solo producto con tres modos operativos (`client-operated`, `co-operated`, `efeonce-managed`), autonomía progresiva según incertidumbre/riesgo y UI creative-native que compila workflows desde decisiones. Esto no habilita clientes ni crea una quinta modalidad comercial; agrega contratos que el bootstrap debe resolver antes del primer rollout externo.

## Delta 2026-07-19 — Efeonce Globe y bootstrap inicial

El operador fija **Efeonce Globe** como nombre canónico del producto; Creative Studio permanece como descriptor funcional de la vertical creativa. Se creó el repositorio privado `efeoncepro/efeonce-globe` y un único proyecto GCP adicional `efeonce-globe` bajo la organización Efeonce, con billing y APIs base habilitadas. No se crearon workloads, bases de datos, buckets, secretos ni gasto de proveedores. La separación de un proyecto productivo queda diferida hasta que exista un primer release reproducible, con presupuesto, IAM, rollback y promoción de secretos aprobados.

## Delta 2026-07-19 — ejecución parallel-first y gobierno central Greenhouse

El programa deja de interpretar gobierno y prueba de modelos como una secuencia lineal. Se aceptan tres lanes
paralelas —Model Lab/craft, plataforma gobernada y validación comercial— con gates distintos para ejecutar un
experimento y promover una ruta a producción. Greenhouse registra `TASK-1456…1485` y conserva todo el harness;
Globe ejecuta el runtime y guarda evidencia técnica. `TASK-1456` cerró la corrección de gobierno; la siguiente
wave ejecuta `TASK-1457`, `TASK-1458` y `TASK-1464`. `TASK-1459` comienza apenas el Lab gate y los
fixtures estén listos.

## Delta 2026-07-19 — cierre del sistema de créditos

El programa separa cuatro responsabilidades: `TASK-1468` posee el kernel append-only; `TASK-1482` administra
pools, grants, policies y budgets sin segundo saldo; `TASK-1483` entrega el Runway Control Plane UI; y
`TASK-1484` queda bloqueada para implementar monetización sólo después del gate `TASK-1480`. `TASK-1474`
conserva sólo contexto de credits por run. `TASK-1485` funda el Design System propio de Globe: Greenhouse
gobierna decisiones, registry, lifecycle, QA, evidencia y promoción; Globe posee tokens seleccionados,
patterns, components, motion y runtime. Compartir deliberadamente un color no implica heredar el sistema UI
de Greenhouse.

## Delta 2026-07-19 — TASK-1458 complete (Golden Briefs & Evaluation Harness)

`TASK-1458` quedó **complete** (fake canary), sumándose a `TASK-1481` (spine), `TASK-1457` (Model Lab) y
`TASK-1464` (IaC) como capabilities cerradas sobre el spine. El Golden Briefs & Evaluation Harness (SPEC-003)
consume el Model Lab (`runModelLabExperiment`) para puntuar golden briefs still/motion/audio —con derechos
declarados— contra rúbricas versionadas: checks objetivos deterministas separados de criterios humanos, verdict
que nunca es un "passed" creativo (`objective_fail` u `objective_pass_pending_human`) y reports versionados,
scopeados al workspace y con limitaciones declaradas. Capability `globe.lab.evaluation.run` (`ui`/`mcp`
`policy-blocked`); un report es evidencia técnica, no aprobación de ruta (invariante 9) ni de artefacto
(invariante 6). Con esto el Lab gate y los fixtures/rúbricas están listos: `TASK-1459` (still), `TASK-1460`
(motion) y `TASK-1461` (audio) quedan desbloqueadas en su dependencia de harness y consumen el comando
`evaluate` + readers de reporte; `TASK-1463` (readiness registry) ya dispone del `EvaluationReportV1`
versionado como artefacto de evidencia para sus transiciones de estado. Spec canónica:
`docs/architecture/creative-studio/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`.

## Delta 2026-07-19 — stack de proveedores real + recommendation matrix (TASK-1486/1487/1488/1459)

El Model Lab pasa de canary fake a **stack de proveedores real verificado en vivo**, sumándose a las capabilities ya
cerradas sobre el spine (`TASK-1481` spine, `TASK-1457` Model Lab, `TASK-1458` eval harness, `TASK-1464` IaC).
`TASK-1486` implementa el `VertexCreativeAdapter` (Google-native por Vertex AI, **keyless** vía ADC/WIF, verificado en
vivo). `TASK-1487` agrega el `FalCreativeAdapter` (non-Google, queue API) y el `CompositeProviderAdapter`, que rutea
entre Vertex y Fal por `supports()` + política de proveedor (Google-native → Vertex; non-Google → Fal). `TASK-1488`
cierra 10 capabilities con modelos verificados contra cuentas reales de proveedor —no claims de marketing— (Seedream 5,
Recraft, Topaz, Seedance, Seed Audio, ElevenLabs, Rodin 3D), con la regla dura de que los IDs de modelos ByteDance se
referencian **sin** el prefijo `fal-ai/`. `TASK-1459` convierte el Still Model Lab en una **recommendation matrix** real
(Vertex Nano Banana vs Fal Seedream comparados por costo, latencia y objetivo) y corrige un bug de `route_stable`.

Invariantes que quedan pinneados por esta wave: el ruteo capability→modelo vive **dentro del adapter**, nunca en policy
de dominio; `actualRoute` es la ruta del contrato de fidelidad, no el slug del proveedor; los secretos siguen la frontera
sister-platform —keyless para Google-native (ADC/WIF del propio proyecto), keyed-con-secreto-propio para el resto,
**nunca un secreto compartido entre Globe y Greenhouse** (la key Fal compartida del canary es una excepción declarada y
temporal)—; y la recommendation matrix compara motores objetivamente, pero **el harness nunca auto-elige un ganador
creativo** (el craft sigue siendo decisión humana; promover una ruta a producción es un gate separado). Follow-ups
abiertos: resolución hash→bytes (desbloquea labs input-bearing + motion/audio), key Fal propia de Globe, deploy de
`studio-web` y routing por contrato de fidelidad dentro del Composite. Spec canónica: el provider seam del Model Lab en
el repo hermano (`docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md`).

## Delta 2026-07-20 — TASK-1490 complete (refinar un candidato es transversal, no de un proveedor)

`TASK-1490` queda **complete**: refinar un candidato del Model Lab dejó de ser específico de un modelo. El
contrato expone **una sola semántica** (`editFrom = { experimentId }`, sin vocabulario de proveedor) y el
mecanismo lo resuelve el seam entre los dos paradigmas nativos —**stateful** (se encadena la sesión que el
proveedor guarda) y **reference-based** (el output del padre se re-inyecta como base)—. El dominio resuelve el
padre server-side; el runner elige el paradigma con el único dato que sólo él tiene en ese momento —qué
proveedor va a ejecutar— y la elección queda en `ExperimentAttemptManifestV1.editMode`, nunca como cambio
silencioso. Un edit **no** es un command nuevo: es un experimento, con la misma autoridad
(`globe.lab.experiment.run`), el mismo spend fence, la misma state machine y el mismo manifest inmutable.

Lo que lo habilitó fue completar la **mitad de escritura** del store content-addressed: los adapters hasheaban
los bytes de salida y los descartaban, así que el hash de un candidato no resolvía a nada y reference-based
fallaba en runtime, no en compilación. Con el output ingest (espejo del resolver hash→bytes de track B) los
outputs se retienen bajo el mismo `sha256` que publica el manifest, `outputsRetained` lo declara y un fallo de
storage degrada honestamente en vez de destruir un candidato ya pagado. **Esa retención es la que hace posible
el edit cross-model**, porque refinar por referencia no depende de ninguna sesión del proveedor. Verificado en
vivo por el seam completo (2026-07-20) en cuatro carriles: reference-based, **cross-model** (Seedream → Nano
Banana en Vertex), stateful (Omni) y referencias combinadas imagen+vídeo.

Estado de dependientes: `TASK-1460` (motion) y `TASK-1461` (audio) ya estaban **complete** y no dependían de
este carril. `TASK-1467` (asset provenance, rights y private ingest) sigue `to-do` y hereda dos piezas ya
construidas: el store content-addressed completo —lectura y escritura— y la postura `derived-internal`, que
impide blanquear un derivado como material propio y arrastra los derechos del padre a sus descendientes. El
rollout del servicio `globe-studio-internal` se ejecutó en esta sesión; el estado vigente vive en `Handoff.md`.
Spec canónica: `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md` → §"Edit / refine cross-model".

## Delta 2026-07-20 — Creative Producer (superficie hermana del Workbench, se construye antes)

Tras análisis riguroso de la referencia Higgsfield (Image/Video/Audio), el operador fija que Globe expone **dos
superficies sobre el mismo backend**: el **Creative Producer** (producción atómica de piezas sueltas
image/video/audio, low-ceremony, prompt-first) y el **Workbench** (`TASK-1474`, agencia brief-first). El
**Producer se construye ANTES del Workbench**: salta el critical path de plataforma (no necesita aprobación
`1469`, delivery `1472`, parity `1473` ni ledger comercial `1468/1482` — solo spine `1481` ✅ + Model Lab
`1457` ✅ + spend fence + ~5 primitivos nuevos) y **construye los primitivos compartidos** que el Workbench
también consume.

Cluster nuevo (no EPIC nuevo — es parte de Globe): **`TASK-1500` catálogo de rutas gobernado · `TASK-1501`
contrato discriminado por modalidad · `TASK-1502` estimate previewable · `TASK-1503` retrieval + asset actions
· `TASK-1504` capability expansion (frames, motion-control, change-voice, translate, omni multi-output,
voice-preset) · `TASK-1505` Producer Surface (UI)**. Contrato de run = **discriminated union por modalidad**
(diseñado para las 3 desde el día 1; impl incremental Image→Video→Audio), validado contra constraints del
catálogo fail-closed pre-spend; **naming** (decisión invertida 2026-07-20): el **modelo real (nombre+versión)
es PÚBLICO/client-facing** (ancla de posicionamiento), la **casa** (taxonomía interna) es **operator-only**
(`globe.producer.route.reveal_house`), y slug/costo/margen **nunca** salen; unidad de
crédito = ruta×shape, nunca el modelo. Reusa `1493/1494/1496/1497/1498` (primitivos compartidos), **absorbe
`1495`** (formatos → output-shape), y `1499` queda como única exclusiva del Workbench. `TASK-1474` pasa a
depender también de `1500–1503`. Spec canónica:
`docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`.

## Delta 2026-07-21 — TASK-1465 complete (persistencia durable, techo de HA levantado)

`TASK-1465` queda **complete, deployed + live-verified (2026-07-21)**: Globe pasó de no tener datastore (todo
in-memory / per-proceso) a **durable**. Su primer datastore es un Cloud SQL `globe-pg` propio (Postgres 16,
`southamerica-west1`, IAM keyless sobre el connector) provisto en Terraform. Los cinco stores antes en memoria
—sesiones, transacciones OAuth, experimentos, reportes de evaluación y el spend fence de seguridad— más un audit
log append-only ahora persisten detrás de sus ports; ambos servicios Cloud Run corren durable.

**Esto levanta el techo de HA** que ADR-004 (`TASK-1506`) hard-gateaba en esta task: el ceiling in-memory /
`maxScale=1` ya no existe. **Corrección de historia (`TASK-1508`):** el `maxScale=3` que 1465 reportó era el ceiling
**de revisión**; el de **servicio** seguía en 1 y Cloud Run aplica el menor, así que el techo efectivo **era 1** hasta
que `TASK-1508` (completa) lo corrigió a **3/3** y puso ambos campos en Terraform. Consecuencia: el spend fence
cross-réplica nunca se ejercitó — es **`TASK-1512`**. **Queda diferido:** el modelo rico de workspace/members/grants
tenancy (follow-up). Production/clientes externos siguen gateados por `TASK-1480`. Spec canónica:
`docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md` (SPEC-007) +
`docs/tasks/complete/TASK-1465-globe-workspace-tenancy-persistence-audit.md`.

## Delta 2026-07-21 — TASK-1507 complete (front door internal-only vivo; sigue TASK-1508)

`TASK-1507` queda **complete, aplicada y verificada en vivo (2026-07-21)**: el shell interno de Globe ya no se
alcanza por su hostname de Cloud Run. `globe.efeoncepro.com` (IP global `8.233.189.79`) se sirve por un Global
External ALB + serverless NEG (`southamerica-west1`) hacia `globe-studio-internal`, con certificado administrado
`ACTIVE`, 301 HTTP→HTTPS y `GLOBE_PUBLIC_BASE_URL` cortado al dominio; el ingress del web quedó en
`internal-and-cloud-load-balancing`, así que el acceso directo por `*.run.app` devuelve 404 al browser. El plan
Terraform fue aditivo puro (11 add / 0 change / 0 destroy, cero recursos Cloud Run) y `maxScale=3` no se tocó.
`globe-api-internal` sigue sin custom domain, IAM-private (403 anónimo) y con audience derivada de `run.app`.

En Greenhouse nació la primitive aditiva `updateSisterPlatformOAuthRedirectUris` (`oauth-broker.ts`) + el CLI
`pnpm sister-platform:redirect`: el allowlist se amplía en una transacción tocando sólo `redirect_uris`, sin rotar
el client secret ni reemplazar el array. El redirect `*.run.app` **se conserva** como camino de rollback.

**Dos desviaciones respecto a la spec, registradas:** (1) el orden de cutover se invirtió —allowlist antes que
`GLOBE_PUBLIC_BASE_URL`— porque un redirect es inerte hasta que algo lo usa, mientras que la env var al revés abre
una ventana de SSO roto; (2) el ingress se endureció por `gcloud`, no por Terraform, porque los servicios Cloud Run
no están en IaC y adoptarlos es `TASK-1508` — el valor **queda sin gobierno IaC hasta entonces**.

Costo del front door: ~US$18,25/mes fijo + ~US$0,024 por GiB servido (in+out), con precios de la Cloud Billing
Catalog API vigentes al 2026-07-21. **Siguiente paso ejecutable: `TASK-1508`** (adopción brownfield de los dos
servicios + single-writer deploy ownership; ahí se pinean ingress, `maxScale` e `invokerIamDisabled`). El dominio
es internal-only: **no** habilita Production ni clientes externos (gate `TASK-1480`). Spec:
`docs/tasks/complete/TASK-1507-globe-internal-front-door-alb-terraform.md`; continuidad de runtime en
`docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`.

## Delta 2026-07-22 — TASK-1503 complete (el output side del Creative Producer, vivo en el runtime interno)

`TASK-1503` queda **complete, desplegada y verificada en vivo (2026-07-22)**: el Creative Producer deja de
terminar en "la pieza existe" y pasa a hacerla **usable**. Cierra el output side —traer los bytes de un
candidato ya generado, marcarlo favorito y copiarlo como referencia para un refine— con **gasto cero** bajo una
capability propia, `globe.producer.assets.operate` (la que llevó `GLOBE_CAPABILITIES` de 11 a 12 entradas). No reusa
`globe.lab.experiment.run` a propósito: esa autoridad es de gasto y vive en el workload principal, y descargar
lo que uno ya produjo no debe implicar poder facturarle a un proveedor. Los ids viven en un mapa propio
(`GLOBE_PRODUCER_ASSET_READERS` = `output`/`assets`, `GLOBE_PRODUCER_ASSET_COMMANDS` =
`favorite`/`copyAsReference`), separado del `GLOBE_PRODUCER_READERS` del catálogo de `TASK-1500`, que responde
a otra capability: conflacionarlos habría metido dos autoridades en un mismo vocabulario.

**La pieza load-bearing es `authorizeOwnedOutput`.** El store es content-addressed y **tenant-blind** —el
nombre del objeto ES el hash, un bucket para todos los workspaces— y guarda tanto outputs como bytes de
referencias private-ingest, así que la autoridad no puede venir del store: la pone el dominio, gateando contra
`store.get(workspaceId, experimentId)` —el **mismo** `ExperimentStorePort` del Lab, no un índice paralelo— y
matcheando sólo `outputHashes` de un attempt con `outcome==='candidate_ready'` y `outputsRetained===true`;
nunca consulta `authorizedInputHashes`. Todo rechazo de propiedad colapsa a `not_found`: cross-workspace, id desconocido,
hash que sólo fue input y candidato no retenido quedan indistinguibles desde afuera. Cualquier respuesta más
fina sería un oráculo para sondear un bucket compartido.

El acceso se materializa con un **grant opaco server-minted** (`RetrievalGrantSignerPort` + HMAC-SHA256),
firmado y no cifrado —sus claims son cosas que el caller ya sabe—, atado a
`(workspaceId, experimentId, sha256, disposition)` con TTL corto (300 s por defecto, rango 30–900),
verificación stateless y comparación en tiempo constante. Viaja en query porque la UI necesita un `src`
directo, y eso no abre un hueco porque **no es un bearer autosuficiente**: `GET /v1/outputs/:sha256` autentica
antes y **re-ejecuta `authorizeOwnedOutput` después** —defense in depth: un candidato que dejó de ser
recuperable deja de ser servible aunque el grant siga vivo—, luego sirve con `Content-Type` del objeto real,
`Content-Disposition` de nombre neutro (`globe-<hash12>.<ext>`, sin vendor) y
`Cache-Control: private, no-store`. El kill switch corre primero y outranks al grant. El grant nunca se loggea
ni entra a un audit event. La ruta reusa el mismo helper del reader y el mismo `handlerErrorToApiCode` del
dispatch: un primitivo, dos transportes, sin política duplicada.

**La degradación es deliberada:** cualquier `OutputRetrievalError` (`not_found` / `unreadable` /
`integrity_mismatch`) colapsa a `dependency_unavailable` retryable. Nunca 200 con cuerpo vacío, y nunca
`not_found`: el dominio acaba de certificar que el candidato existe, y contradecir el descriptor mandaría a un
operador a cazar un fantasma. El seam de lectura (`OutputRetrievalPort` / `GcsOutputRetrieval`) es el **tercer**
lector del store —distinto de `GcsInputResolver`, que alimenta a un provider dentro de un run pagado, detrás
del fence—, usa el mismo bucket, el mismo token keyless (ADC/WIF) y el mismo naming que `GcsOutputIngest`, y
re-verifica `sha256(bytes)` contra lo declarado antes de devolver.

Las **asset actions** no mueven bytes por la API ni consumen crédito: `favorite` toma el estado deseado
explícito —nunca un toggle ciego— y conserva el timestamp original en un repeat; `copyAsReference` certifica un
`ProducerReferenceHandleV1` con `rights:'derived-internal'` **inforjable** —un caller no puede declararlo— y
`parentRights` heredado por `inheritedDerivedRights`, la misma función que usa el edit base del Lab, para que
un ancestro `licensed` no deje de restringir en una sola de las dos derivaciones; falla cerrado antes de
mintear si el medio no es referenciable (`model-3d`). `ProducerOutputMediaType`
(`image|video|audio|model-3d`) es propio y no es `LabInputMediaType` (`image|video|audio|text`): el `mediaType`
se deriva de la capability semántica del run, pero el `Content-Type` servido sale del objeto real, así un run
multi-output no miente en el cable.

**Delta al spec, con su razón:** las anotaciones quedaron **durables** en lugar de in-memory. El spec las
difería a `TASK-1465`, que ya shipeó sin cubrirlas, y con los servicios en 3 réplicas (`TASK-1508`) un store
in-memory no queda "volátil" sino **no determinista** —una estrella escrita en una réplica es invisible en
otra—. Entró `AssetAnnotationStorePort` + `DurableProducerAssetStore` + migración
`0003_producer_asset_annotations.sql`, con la idempotencia en SQL (`ON CONFLICT DO NOTHING` + re-lectura) y no
en un read-then-write, que entre réplicas es una carrera cuyo síntoma visible es un `referenceId` duplicado o
una estrella re-fechada; `rights='derived-internal'` es un CHECK, no una convención.

**Runtime vivo:** servicio `globe-api-internal`, revisión `00017-xfm`, imagen `:b12451db2d6e`, desplegada por
`deploy-internal.yml` (run `29908442357`, OIDC→WIF→`globe-deployer`), con `tofu plan` en **No changes** y la
revisión conservando `maxScale 3` —el drift-trap que cerró `TASK-1508` sigue cerrado—.
`GLOBE_PRODUCER_ASSETS_ENABLED` es variable Terraform (`producer_assets_enabled`) con default **true en git**
(`variables.tf`) y no en el `terraform.tfvars` gitignoreado: un flag cuyo estado real vive en un archivo sin
trackear es el mismo problema de estado efímero que moverlo con `gcloud`, mejor disfrazado.
`GLOBE_PRODUCER_GRANT_SECRET` vive en Secret Manager (`globe-producer-grant-secret`; contenedor y accessor en
Terraform, valor out-of-band) con accessor **sólo a `api_runtime`** —`web_runtime` no tiene consumidor hasta el
gate de `TASK-1505`— y sin él el mint degrada fail-closed a `dependency_unavailable`. La capability vive en el
servicio API y **no** en el web por **autoridad, no por despliegue**: en modo web las capabilities de una
persona salen del broker de Greenhouse, que no otorga `globe.producer.assets.operate`.
Coverage `PRODUCER_ASSETS_COVERAGE`: `ui`/`mcp` `policy-blocked`; `http`/`sdk`/`cli`/`worker`/`e2e`
`available`; `sister-platform` `not-applicable`. SDK: `getProducerOutput` / `listProducerAssets` /
`favoriteProducerAsset` / `copyProducerAssetAsReference`.

**Gates hacia comercial (identificados, no inventados).** Para que esta capability le sirva a un **humano
interno** falta `TASK-1505`: el broker de Greenhouse debe otorgar la capability y hay que flipear `ui`/`mcp`.
Para **cliente externo** manda `TASK-1480`, bloqueada por `TASK-1477`, `TASK-1478`, `TASK-1479` y `TASK-1482`
(sobre `TASK-1468`) — las cinco en `to-do`. La contabilidad comercial sigue siendo el carril
`TASK-1468` → `TASK-1482`: el spend fence es de **seguridad**, no ledger; el retrieval es gasto cero y no lo
necesita, el Producer completo sí.

**Dependencia identificada sin dueño.** `readStudioRuntimeConfig` **lanza**
`globe_environment_not_internal_smoke` para cualquier `GLOBE_ENVIRONMENT` distinto de `internal_smoke`, de modo
que hoy no existe forma de bootear un runtime comercial. Ninguna task del programa sostiene ese ensanche y
`TASK-1480` no lo menciona: es un bloqueo duro en código sin dueño declarado, y las otras cuatro dependencias
de `TASK-1480` pueden avanzar en paralelo sin resolverlo, pero ninguna lo resuelve. Queda registrado acá como
lo que es —una dependencia detectada, no una task ni un dueño asignado— hasta que el programa decida quién la
toma. `internal_smoke` es el **estadio actual del runtime**, no el techo del producto.

**Lecciones de método que dejó este rollout** y que aplican al resto del programa: los scripts `test` de cada
package de `efeonce-globe` enumeran archivos a mano, así que un test nuevo no registrado nunca corre y la suite
queda verde por no haber mirado; un `execute` síncrono puede exceder el timeout de transporte del **cliente** y
completar bien en el **servidor**, así que leerlo como fallo y reintentar gasta créditos de nuevo —hay que leer
el estado antes—; un negativo private-ingest con un hash inexistente prueba muchísimo menos que uno con un hash
que sí está en el store como input, y la versión válida declara el output retenido de una corrida como input de
otra y agrega el control de que el output propio de esa corrida sí se sirve; y el acceso privilegiado temporal
se opera como grant acotado → verificar → revocar → **verificar el corte**, sin asumir que la revocación
propagó. Spec: `docs/tasks/complete/TASK-1503-globe-governed-output-retrieval-asset-actions.md` +
`docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`.

## Delta 2026-07-22 — Producer aprobado rebaselined contra runtime real

El source de Claude Design de `TASK-1505` queda reconocido como target de producto completo y aprobado; el
backend debe darle vida sin convertir sus gaps en recortes de UI. `ADR-005` fija browser → same-origin BFF →
IAM-private API, grants/delegación humana y surface enforcement fail-closed, además del paso de ejecución cara a
jobs/outbox durables. `TASK-1504` está `in-progress` solo local y no desplegada. Se agregan owners explícitos:
`TASK-1519` (human bridge), `TASK-1520` (library/collections/bulk) y `TASK-1521` (runtime comercial, resolviendo el
anterior gap sin dueño). `TASK-1505` integra por slices sobre esas unidades y sobre `1467/1469/1472/1493/1494/
1496/1497/1498/1511/1512`, preservando el target y mostrando estados honestos hasta que cada contract esté vivo.

## Delta 2026-07-22 — Producer verificado en vivo end-to-end; gaps de superficie repartidos a sus dueños

Se manejó el Producer de punta a punta por el SSO federado contra los servicios desplegados con una sesión de
agente autenticada. **Lo que quedó vivo esta sesión** (fixes desplegados en `978b202`→`9ef2d21`): el cliente
browser ahora manda `x-idempotency-key` (toda escritura moría 400 en el BFF), `isBrokerIdentity` deriva el
workspace interno de `tenantId` (el guard sobre `clientId` daba 502 a **todo** login interno), la query de
tarifas dejó de tener columna ambigua, y el recibo de idempotencia del ledger se llavea por comando (migración
`0023`, aplicada y con readback). El split-brain web/api se cerró (ambos servicios mismo SHA). El workspace
interno se fondeó con 500k créditos por el spine gobernado `globe.credits.allocate` (tokenCreator temporal
otorgado → usado → **revocado y corte verificado**). La UI pasó de **401** a **crear runs reales**
(`state: prepared`).

**Los cuatro gaps "Codex dejó controles sin cablear" quedaron repartidos a su dueño real** (Deltas registrados
en cada task; se rechazó crear un namespace de superficie paralelo — es la deuda que la auditoría marcó):

1. **Estimate antes de generar es código muerto** — `requestEstimate()`/`estimateIsCurrent()` sin callers; un
   test blinda su ausencia y otro certifica una llamada dentro de la función muerta. Dueño **TASK-1505** (el
   reader ya existe, TASK-1502; falta el cableado + retirar los asserts que lo bloquean).
2. **Style DNA nace vacío para siempre** — `analyze` exige dos puertos sin implementación en el repo, no
   inyectados en `app.ts`. Dueño **TASK-1494** (`to-do`).
3. **6 de 9 modos del composer muertos** por `GLOBE_ASSET_PROVENANCE_ENABLED=false`, con sus botones pintados
   habilitados (gate contra la capability equivocada). Dueño **TASK-1467** (`in-progress`).
4. **Seed, prompt negativo y breakpoint 390 px ausentes** (+ markers GVC `producer-seed`/`producer-shape`/
   `producer-asset-actions`). Dueño **TASK-1505**. Se corrigieron en TASK-1505 dos ACs marcados `[x]` en falso
   (estados incl. estimating; 390 px) — nueve ACs se habían flipeado en un cambio no commiteado que además
   cargaba el veredicto `BLOCK`.

**Por qué el Producer todavía 409 con el ledger fondeado (y por qué NO es un bug):** el compilador rechaza
`route_not_promoted` porque el registro de model-readiness está vacío (0 rutas promovidas). La promoción es un
**gate humano de dos pasos por diseño** (`requireHuman`; maker/promoter distintos; evidencia de proveedor real,
no `fake`) — el control que hace el producto vendible, no un defecto. Decisión del operador (CEO/dueño):
autoridad única para el workspace interno; queda **pendiente un ADR** que convierta la separación
maker/promoter en **política por workspace** (default `true`, `false` sólo para el workspace interno de Efeonce,
`requireHuman` intacto), para no borrar el control que aplicará a los workspaces de cliente. Ese ADR + el grant
de operador de readiness en el broker de Greenhouse es el siguiente paso ejecutable para que el Producer genere.

**Producto comercial (no piloto):** el runtime sigue clavado en `internal_smoke` por `readStudioRuntimeConfig`;
habilitar cobro/clientes externos es **TASK-1521** (runtime comercial) + **TASK-1480** (readiness comercial,
bloqueada por 1477/1478/1479/1482) — ninguna empezada. Esa es la distancia real a comercial, no la UI.
