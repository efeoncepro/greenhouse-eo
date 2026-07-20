# EPIC-028 — Efeonce Globe: Creative Studio agentic de producción profesional

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Bootstrap de repositorio y proyecto GCP completado; foundation runtime en construcción`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `Efeonce Creative Technology / Product`
- Branch: `main` en el repositorio hermano
- GitHub Issue: `TBD — backlog operativo en https://github.com/efeoncepro/efeonce-globe`

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
- `TASK-1476…1480` — **validación comercial:** demo/Sample Sprint managed, buyer discovery, 30–50 runs de
  calibración, pilotos por modo y commercial approval. `TASK-1480` no habilita clientes sin sign-off explícito.
- `TASK-1484` — **monetización bloqueada:** implementa packages/billing/tax/revenue/payments sólo después de
  un `commercial_decision_record` aplicable; tampoco habilita cobros/clientes sin rollout posterior.

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
- [ ] Habilitar a un cliente, pago/tax o publicación automática permanece bloqueado hasta sus decisiones de legal/finance/rights y sus tasks de rollout.

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
