# EPIC-028 — Efeonce Globe: Creative Studio agentic de producción profesional

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Producer operativo internal-only en 3 rutas promovidas con Image/Video/Audio reales; 7 rutas, sesión expirada, outbox/alertas y runtime comercial siguen abiertos`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `Efeonce Creative Technology / Product`
- Branch: `main` en el repositorio hermano
- GitHub Issue: `TBD — backlog operativo en https://github.com/efeoncepro/efeonce-globe`

> **Naturaleza comercial:** Globe es un producto comercial de Efeonce (ADR-010). `internal-only` / `internal_smoke`
> describe el estadio técnico actual de rollout y sus gates, nunca la naturaleza del producto ni su destino de mercado.
> EPIC-028 debe llevarlo desde ese estadio hacia un primer rollout comercial gobernado.

### Checkpoint 2026-07-23 — plataforma interna funcional, no GA

- El flujo humano BFF→API→worker→provider→GCS→governance→feed/viewer produjo y reprodujo Image, Video y Audio.
- El catálogo tiene 10 rutas; sólo tres están promovidas durablemente. Las demás no heredan readiness.
- Asset Governance corrige clasificación sin C2PA y recuperación de proyección. El Job aplicó 3 trabajos,
  promovió 1 y falló 0.
- Persisten gaps concretos: reauth de sesión realmente expirada, cinco reconciles stale/queue age, severidades de
  alertas, siete promociones y ADR de derivados/streaming/visibilidad/GC.
- Clientes externos/Production permanecen cerrados por `TASK-1480` y dependencias.

#### Checkpoint anterior: Producer integrado localmente

- La UI aprobada de `TASK-1505` dejó de ser intención: está implementada con su riqueza visual y funcional,
  motion/reduced-motion, responsive 390 px, teclado, viewer, compare, inpaint, library, budgets, referencias,
  presets/Style DNA, créditos y review/share. La auditoría visual source-led obtuvo `4.69/5` y `PASS`.
- `TASK-1504`, `TASK-1519`, `TASK-1520` y `TASK-1522` están integradas y verdes en local sobre contracts
  reales. Esta evidencia no equivale a rollout: despliegue, migrations, secrets, IAM/grants, flags, workers,
  provider canaries y smoke humano permanecen pendientes y se declaran como gate operativo.
- La secuencia vigente ya no es “recortar la UI hasta lo que soporte el backend”, sino desplegar por capas las
  capabilities que la UI aprobada consume, preservando fail-closed, lineage, idempotencia y control de gasto.

## Summary

Construir **Efeonce Globe**, la capability creativa propia de Efeonce, como un product service que combina una
plataforma **agentic por nacimiento**, especialistas creativos y capacidad de delivery para imagen, video, audio y
extensiones futuras. Creative Studio es su descriptor funcional. El producto se opera por UI, MCP y agentes sobre
el mismo contrato, pero la experiencia humana empieza en briefs, referencias, tratamientos, candidatos y review;
el workflow técnico se compila por debajo. Globe puede entregarse como Studio Access, Creative Production,
Managed Squad o Staff Augmentation, con fronteras explícitas de dirección y accountability. Templates/rúbricas de
Efeonce, assets trazables, gasto controlado y revisión humana viven en una plataforma hermana: Greenhouse la integra
como consumidor, no la hospeda.

## Why This Epic Exists

Los pilotos de RRSS y Glitch demostraron que generar media es sólo una fracción del trabajo. El valor operacional está en elegir el motor según fidelidad requerida, preservar el set/derechos, controlar créditos, revisar acción/anatomía/sonido y conservar la decisión para repetirla. Si se construye UI-first, MCP/agentes y clientes llegarían tarde y con lógica duplicada. Si se construye dentro de Greenhouse, se agrava su runtime y se desdibuja la propiedad del dominio creativo.

Este programa convierte esos aprendizajes en una capability de agencia acumulable y, después, vendible: **capacidad creativa + dirección + memoria**, no reventa de tokens de un proveedor.

## Cross-product composition with Experience LaunchOps

Globe puede operar como capability composable dentro del product service Experience LaunchOps de Wave. La frontera
canónica vive en [`Wave + Globe Creative Production Integration`](../../architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_GLOBE_CREATIVE_PRODUCTION_INTEGRATION_V1.md):
Globe produce `CreativeAssetPack`, `AssetManifest` y `AssemblyManifest`; Wave conserva el Launch Contract,
ensamblaje, Search/AEO, Measurement, governance, release y evidencia de lanzamiento. Globe no es dependencia
obligatoria de Wave y Wave puede consumir assets del cliente u otros proveedores.

El producto no sustituye la capacidad de agencia. Crea un flywheel: Efeonce prueba craft en operación managed, convierte patrones validados en templates, habilita autonomía cliente en trabajo repetible y conserva el contexto para que Efeonce absorba excepciones, picos y producción de alta incertidumbre sin reiniciar el proyecto.

La doctrina de experiencia es explícita: el equipo creativo es protagonista, el operador activo es el punto de
vista y Globe es guía/sistema. La plataforma devuelve tiempo a intención, exploración, dirección y decisión al
absorber prompt engineering, routing, parámetros, restricciones, estimate, retries y trazabilidad. No autoasume
gusto, rights, presupuesto, aprobación ni publicación. “Clase mundial” es un gate interno respaldado por
evidencia, no una garantía de marketing.

## Outcome

- Existe un repositorio y runtime propios de Creative Studio con tenancy, assets, ledger, auditoría y workers aislados de Greenhouse.
- Un operador o agente autorizado puede preparar, estimar, aprobar, ejecutar, revisar y ramificar una corrida mediante el mismo contract UI/MCP.
- Cada capability nace con schema versionado, command/reader transport-neutral, trusted context, HTTP/SDK path,
  coverage matrix y conformance tests; una surface puede estar `policy-blocked`, pero no quedar sin contrato.
- El estimate y el historial del run hacen visible el provider/modelo/version propuesto y realmente ejecutado,
  incluyendo readiness, limitaciones y fallbacks, sin exponer secretos, costo vendor confidencial ni margen.
- El mismo run soporta `client-operated`, `co-operated` y `efeonce-managed` mediante responsabilidades y entitlements explícitos; cambiar de modo conserva brief, assets, lineage, review y ledger.
- La UI principal permite trabajar en lenguaje creativo y compila decisiones aprobadas en templates/runs; un canvas DAG queda como authoring avanzado, no onboarding universal.
- Toda asistencia creativa preserva el source y distingue `aportado|derivado|sugerido`; el operador puede aceptar,
  editar o rechazar sin que una inferencia se convierta silenciosamente en autoría.
- La primera plantilla curada de media funciona con provider routing basado en contrato de fidelidad y gates creativos/económicos verificables.
- Greenhouse/Verk/Think consumen sólo proyecciones, eventos o deep links versionados cuando corresponde; no bases de datos, secrets ni lógica compartida.
- La plataforma queda preparada para habilitar clientes y créditos comerciales sin rediseñar identidad, autorización o modelo de costos.
- Una surface propia de Video Effectiveness y sus entry points en Producer, Professional Workbench, Model Lab y
  cualquier dominio autorizado consumen un solo agente: analiza videos generados o ingresados por el uploader
  canónico de Globe contra objetivo, craft y channel fit con evidencia temporal exacta, propone direcciones
  alternativas y sólo habilita forecasts numéricos cuando datos first-party comparables superan una política de
  calibración versionada. Producer lo invoca directamente con asset/contexto precargado, muestra status/resumen,
  abre el mismo reporte completo y convierte recomendaciones aceptadas en drafts de refine sin ejecución ni gasto
  automático. En la dirección inversa, el agente puede llamar los contratos canónicos de Producer para crear una
  propuesta y obtener su estimate; conserva actor, authority y lineage, y nunca aprueba ni ejecuta por sí mismo.
- Equipos de otras agencias sólo pueden explorarse como hipótesis B2B2B dentro de modos/modelos existentes y
  después de cerrar tenancy agencia→cliente final, confidencialidad, rights, brand authority y economics.

## Architecture Alignment

- [ADR — Efeonce Creative Studio: plataforma agentic peer con paridad UI + MCP](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md)
- [Efeonce Creative Studio — Agentic Platform Architecture V1](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md)
- [PDR-003 — Layering del ecosistema digital Efeonce](../../public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md)
- [Greenhouse Sister Platforms Integration Contract V1](../../architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md)
- [Efeonce Product Ecosystem](../../context/03_ecosistema-producto.md)
- [Creative Studio Business Model V1](../../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md)
- [Studio Credit Model V1](../../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md)
- [Globe Design System Governance Decision V1](../../architecture/EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1.md)
- [ADR-016 — Motor de estilos del payload cliente: Tailwind v4 sobre el SSOT](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md) · `Accepted` 2026-07-27
- [Composer — Referencia de estilo e implementación V1](../../ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md)
- [Globe Producer — Human Execution + Approved Product Target Decision V1](../../architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md)
- [ADR-011 — Globe Video Effectiveness Agent Decision V1](../../architecture/creative-studio/EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_DECISION_V1.md)
- [SPEC-011 — Globe Video Effectiveness Agent Architecture V1](../../architecture/creative-studio/EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_V1.md)
- [UI Flow — Globe Video Effectiveness standalone + Producer bidireccional](../../ui/flows/TASK-1540-globe-video-effectiveness-surface-flow.md)
- [ADR-012 — Globe Storyboard Studio Decision V1](../../architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_DECISION_V1.md)
- [SPEC-012 — Globe Storyboard Studio Architecture V1](../../architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_V1.md)
- [UI Flow — Storyboard Studio Structured Sequence Canvas](../../ui/flows/TASK-1547-globe-storyboard-studio-flow.md)
- [Master UI Flow — Globe Creative Studio](../../ui/flows/EPIC-028-globe-creative-studio-master-flow.md)
- [Master UI Motion — Globe Creative Studio](../../ui/motion/EPIC-028-globe-creative-studio-master-motion.md)

### Delta 2026-07-27 — ADR-016: el payload cliente adopta Tailwind v4

Seis colisiones de CSS global medidas en una sola sesión (cuatro donde la hoja legacy pisó markup nuevo, una
donde renombrar clases desconectó el glow del prompt, y el hallazgo de que **66 de 84 clases del composer vivían
en la hoja del legacy**) motivaron [**ADR-016**](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md),
**aceptado el 2026-07-27**: el payload cliente adopta **Tailwind v4 con el SSOT de tokens como theme**.

Supersede a ADR-014 **sólo** en el motor de estilos; Vite, React 19, shell propio, CSP por nonce y CDN siguen
vigentes. Dueño de implementación: **`TASK-1485`** (barrido por dominio, no task nueva).

**Consecuencias en el backlog:** el Slice 0 de `TASK-1552` **se retira** —una superficie reescrita en Tailwind
no depende de la hoja legacy, así que mover 272 reglas era trabajo desechable— y `TASK-1560` se destraba por el
mismo camino. Reescribir los tres gates de diseño es **precondición**, no follow-up.

La referencia de valores para migrar sin reinterpretar vive en
[`GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md`](../../ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md).

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
- `TASK-1519` — ✅ **Producer Human Execution Bridge + Surface Enforcement.** Browser humano operativo por
  `studio-web` same-origin BFF hacia la API IAM-private, con broker grants, delegación actor/workspace,
  correlation/idempotency y enforcement real de `surface=ui`. IAM/env/secrets, smoke negativo y revocación
  quedaron verificados internal-only; no habilita entorno comercial.
- `TASK-1520` — **Producer Asset Library, Collections + Bulk Operations.** Writes y bulk están operativos
  internal-only con smoke durable y partial failure honesto. Export permanece OFF sin asset elegible; purge OFF
  por policy/Legal. Reusa retrieval/lineage y no crea un segundo source of truth.
- `TASK-1522` — **Review, comments + share foundation.** Migration, secret y grants están desplegados; el smoke
  positivo permanece bloqueado porque aún no existe un output owned/elegible producido por el carril gobernado.
- `TASK-1523` — **Creative Suite Experience Logic and Information Architecture.** Policy ui-platform que
  contractualiza el Creative Loop común, la relación Producer prompt-first ↔ Workbench brief-first, el rol
  agentic `propose→approve→execute→judge` y los gates humanos, sin crear backend ni runtime paralelo.
- **Media review specialization — auditada en el Producer React real con Playwright (2026-07-26).**
  [`TASK-1567`](../../tasks/to-do/TASK-1567-globe-audio-waveform-derivative-playback-projection.md) posee la proyección gobernada de waveform/duración/preview de audio y estados degradados;
  [`TASK-1568`](../../tasks/to-do/TASK-1568-globe-sonic-canvas-audio-experience.md) extiende el audio nativo a
  Sonic Canvas con playback único, AudioDock contextual, keyboard y reduced motion. [`TASK-1569`](../../tasks/to-do/TASK-1569-globe-video-derivative-playback-projection.md) posee la
  proyección de poster/preview transcode/duración/aspect ratio/audio presence de video;
  [`TASK-1570`](../../tasks/to-do/TASK-1570-globe-cinematic-canvas-video-experience.md) extiende el video nativo
  a Cinematic Canvas con timeline real, estados de buffering y MediaDock. Finalmente,
  [`TASK-1571`](../../tasks/to-do/TASK-1571-globe-image-focus-compare-canvas.md) extiende el viewer de imagen a
  Focus Canvas y compare condicionado por lineage. Las cinco tasks conservan el shell/feed/composer actual,
  consumen contratos gobernados y no crean una galería paralela; `TASK-1568` depende de `TASK-1567`,
  `TASK-1570` de `TASK-1569` y `TASK-1571` del ownership vigente de feed/viewer de `TASK-1559`.
- **Audio editing specialization — multi-provider y layer-aware.** `TASK-1575` posee el contrato neutral
  `audio-edit`, el brief temporal/capa, preservation, lineage, mix manifest, QC, credits y rights; mantiene
  separadas las capabilities existentes de voz y doblaje. `TASK-1576` audita Seed Audio/ElevenLabs y suma
  challengers vía Fal para SFX, música, audio-to-audio, restore y stems sólo después de eval, licencia, canary y
  promotion. `TASK-1577` consume ambos contratos dentro de `TASK-1568` con selección waveform/transcript, layer
  rail, compare A/B y recovery; no crea selector de provider, segundo player ni DAW paralelo.

 - `TASK-1580` — **Globe Creative Project, Session and Reusable Element Contract.** Foundation backend/data para Project, Session y Element sin duplicar experiment, library, lineage, rights ni ledger.
 - `TASK-1581` — **Globe Producer Creative Entry Hub and Session Feed.** Consumer UI que cambia el ingreso por modalidad a ingreso por intención, muestra contexto reciente y agrupa actividad por sesión sin crear otro feed.
 - `TASK-1582` — **Globe Producer Asset Workspace and Contextual Reuse.** Consumer UI que conecta el viewer/media canvases con proyecto, colección, sesión, lineage y acciones de continuidad.
 - `TASK-1583` — **Globe Producer Review-to-Element and Governed Reuse Experience.** Consumer UI que conecta review/changes-requested/approval con child sessions, creación explícita de Elements y reutilización gobernada.

### Commercial architecture and market validation — 2026-07-29

EPIC-028 incorpora la capa comercial que conecta la fundación de producto con la visión de mercado de Globe:

```text
enterprise marketing organizations = ICP estratégico
enterprise unit o mid-market = beachhead operativo
agencias/productoras = canal multiplicador
e-commerce/DTC/retail = vertical wedge
creators/SMB = distribución y aprendizaje
```

Estas tasks no sustituyen los gates de activación ni autorizan un bypass de clientes externos, pricing público, checkout,
reseller rights o co-selling. Globe sigue siendo un producto comercial de Efeonce; consumen los gates existentes y no
duplican sus owners:

- `TASK-1593` — **Enterprise ICP and Design-Partner Readiness.** ICP estratégico, enterprise unit, buying group,
  qualification y readiness dossier para `TASK-1480`.
- `TASK-1594` — **Agency Workflow Sprint.** Validación de agencia como canal multiplicador con cliente final,
  tenancy, approval, rights, attribution y economics; depende de `TASK-1595`.
- `TASK-1595` — **Campaign Variant Workflow.** Proving ground vertical `brief → key visual → variantes → localización
  → QA → review → manifest`, reusable por agency, e-commerce y enterprise lane.
- `TASK-1596` — **Distribution and Activation Layer.** Artifact/template/content/creator/referral/integration loops,
  PQL, Sample Sprint conversion y `second_run_activated`, sin runtime CRM.
- `TASK-1597` — **Packaging and Unit Economics Validation.** Software/Product Service/managed/co-operated/channel,
  cost-to-serve, rights/pass-through y margin gate ≥45%; `pricing_blocked` hasta aprobación.

El orden recomendado es `1595 → 1594`, con `1593`, `1596` y `1597` en paralelo documental. La capa comercial debe
cerrar para promover el Producer actual `internal-only` / `internal_smoke` al primer rollout comercial gobernado; no
para decidir si Globe es un producto vendible.

### Governed Skill System and orchestration — 2026-07-26

Globe incorpora como línea de arquitectura el diseño de un sistema de Skills ejecutables y evolucionables.
La Skill aporta método y criterio especializado; el agente define el perfil; el Capability Registry define
qué operaciones existen; Policy define qué está permitido; la memoria conserva contexto de workspace; y la
Evidence Store conserva lo que ocurrió. El **Skill Plan** es el objeto que conecta intención, composición,
estimación, aprobación, ejecución, evaluación y feedback.

La orquestación se separa en dos responsabilidades: un **Skill Planner** propone y valida un plan de Skills,
y un **Skill Execution Coordinator** ejecuta únicamente el plan aprobado mediante commands/readers/workers
canónicos. Ninguno puede otorgarse capabilities, ampliar presupuesto, saltar rights/approvals, llamar providers
directamente o modificar una Skill productiva en silencio.

La evolución queda gobernada por evidencia: `draft → shadow → governed → commercial → deprecated/retired`,
con evals objetivas y review creativa humana separadas, rollback, version pin y aislamiento entre memoria de
workspace y doctrina global. Esto no crea un segundo task registry, provider router, credit ledger ni runtime
en Greenhouse.

`TASK-1587` posee el ADR/spec y el backlog downstream. La implementación runtime en `efeonce-globe` queda
bloqueada hasta aceptar ese contrato.

### Creative production workspace experience — 2026-07-26

El benchmark de Magnific, Higgsfield, Krea, Runway, Leonardo, Recraft y Firefly confirma que el patrón premium no es una galería más rica: es una cadena de continuidad `intención → proyecto → sesión → asset → lineage → review → reuse`. Magnific demuestra que el destino debe poder elegirse antes de generar y que edición, historial y organización deben conservarse juntas; Higgsfield aporta Projects, Elements, Canvas y workflows guiados; Krea aporta un entry point simple con herramientas multimodales y asset manager; Runway separa Project, Session y Asset.

Globe adopta esos patrones sin copiar sus límites:

- Project aporta contexto de producción; Collection aporta agrupación editorial; Session conserva exploración; Candidate conserva investigación; Approved asset conserva decisión; Element conserva reutilización.
- El feed queda orientado a sesiones y deltas, no a una pared de outputs.
- El Asset Workspace es la superficie de continuidad entre media, metadata, lineage, review y acciones.
- Creative Recipes presentan intención y resultado esperado antes de exponer ruta/modelo.
- Auto-routing, derechos, credits, provenance y approval siguen siendo gobernados por Globe; ningún benchmark autoriza una simulación cliente o una segunda fuente de verdad.
- Boards y community discovery quedan después de la continuidad Project/Session/Asset/Review, fuera del primer corte del Producer.

El mapa de implementación, estados, rutas, focus, mobile, failure paths y ownership vive en el [Master UI Flow del epic](../../ui/flows/EPIC-028-globe-creative-studio-master-flow.md). La gramática cross-surface de causalidad, llegada de sesiones, branch/lineage, workspace, review y reduced motion vive en el [Master UI Motion del epic](../../ui/motion/EPIC-028-globe-creative-studio-master-motion.md). `TASK-1523` conserva la autoridad transversal; las tasks 1580–1583 materializan las piezas nuevas sin apropiarse de feed/viewer/library/media owners existentes.

### Library discovery and adoption policy — 2026-07-26

La revisión de librerías del mercado deja una estrategia de primitives, no un editor monolítico:

| Superficie | Adopción | Uso gobernado |
|---|---|---|
| Imagen | `react-konva` + `perfect-freehand` | Focus/compare, zoom/pan y máscara; geometry normalizada hacia `image-edit` |
| Audio | `wavesurfer.js` + `@wavesurfer/react` | Peaks predecodificados, regions, timeline, hover y transcript selection; playback sigue en Globe |
| Video player | Native `<video>` V1; Vidstack sólo spike React 19 | Playback, focus, captions y controls sin segundo source of truth |
| Video composition | Remotion sólo futuro | Multi-shot, captions, overlays y rendering; no semantic edit V1 |
| Media metadata | Mediabunny opcional | Inspección/preview browser; nunca autoridad ni output canónico |
| Processing | FFmpeg server-side existente | Derivatives, mix, QC y composición determinista |
| Intake | Uppy/Tus sólo cuando exista uploader gobernado | Upload resumable detrás de BFF/GCS/asset governance |
| Providers | Fal client server-side | `creative-runner`/adapters; nunca SDK, key o raw provider URL en React |

Fuentes primarias: [Konva React](https://konvajs.org/docs/react/index.html), [perfect-freehand](https://www.npmjs.com/package/perfect-freehand), [Fabric.js](https://fabricjs.com/docs/core-concepts/), [WaveSurfer](https://wavesurfer.xyz/docs/), [Vidstack](https://vidstack.io/docs/player/), [Remotion Editor Starter](https://www.remotion.dev/docs/buy-a-video-editor), [Mediabunny](https://mediabunny.dev/guide/introduction), [Uppy React](https://uppy.io/docs/react/) y [Fal client](https://fal.ai/docs/documentation/model-apis/inference/client-setup).

Reglas de adopción:

- Una librería sólo resuelve interacción, representación, preview o upload; nunca se convierte en source of truth de Globe.
- No se combinan dos canvas engines ni dos timelines para la misma superficie.
- Todo spike debe validar React 19, keyboard, focus restoration, reduced motion, `390px`, Blob URL cleanup, bundle/performance y license posture.
- Los providers se agregan por route contract, eval, rights attestation, promotion y rollback; no por una UI o marketplace SDK.
- FFmpeg, governance, lineage, credits, rights, commands/readers y reconciliation permanecen server-side.
- `TASK-1524` — **Commercial Login Cinematic Threshold.** Evoluciona la puerta anónima internal-only a una
  apertura comercial poster-first `One Idea, Many Forms`, con master desktop/mobile, pausa, reduced motion,
  progressive enhancement y OAuth/session existentes intactos; promoción sigue gateada por `TASK-1521/1480`.
- **Video Effectiveness Agent (ADR-011/SPEC-011) — seis tasks compactas, registradas con Full API Parity.**
  `TASK-1536` posee dominio, lifecycle y primitive durable; `TASK-1537`, evidencia temporal, Gemini/Vertex,
  challengers y eval experta; `TASK-1538`, channel intelligence y calibración; `TASK-1539`, `assetRef` gobernado,
  uploader canónico y orquestación standalone/Producer/Workbench/otros dominios/Harness, incluido
  Producer→análisis y agente→Producer draft/estimate con recursion guard; `TASK-1540`, la surface propia,
  entry points contextuales, status/resumen in-place en Producer, timeline y review; `TASK-1541`, rollout,
  grants, credits, canarios, recovery y certificación cross-surface. No crea uploader, asset store ni lógica
  de negocio por surface: reutiliza TASK-1467/ADR-007 y todas las interfaces consumen el primitive de TASK-1536.
- **Storyboard Studio (ADR-012/SPEC-012) — contrato aceptado y ocho slices de implementación/rollout.**
  `TASK-1542` cerró el bounded context Narrative Preproduction y la dirección Editorial Sequence Desk;
  `TASK-1543` posee Narrative Project, Script/Storyboard y revisiones durables; `TASK-1544` extiende TASK-1522 con
  mentions, colaboración cliente, anotación vectorial y masks; `TASK-1545` reutiliza TASK-1530 para propuestas
  estructuradas con human apply; `TASK-1546` posee mixed-origin realization y handoffs bidireccionales a Producer/
  Video Effectiveness; `TASK-1550` compila una revisión aprobada en un ProductionPlan multi-shot con DAG,
  paralelismo acotado, unidades humanas y coordinación estimate/approval/execute con Producer sin apropiarse de su
  ejecución; `TASK-1547` implementa Brief/Outline/Guion/Storyboard/Review sobre Structured Sequence Canvas;
  `TASK-1548` entrega exports determinísticos; `TASK-1549` gobierna flags, grants/invites, privacidad, recovery,
  canarios y rollout. Storyboard no ejecuta modelos ni post-producción: Producer y Video Effectiveness conservan
  autoridad y consumen una revisión narrativa exacta. El grafo es parallel-first: el primer fold de `TASK-1547`
  usa fixtures desde los contratos aceptados; `TASK-1546/1550` aplican gates por slice y los exports no bloquean
  el primer piloto de `TASK-1549` mientras permanezcan `policy-blocked`.
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

La incorporación de modelos y su efecto en credits se cierra mediante `TASK-1579` y `TASK-1578`: `TASK-1579`
define la fórmula, settlement, fallback y lifecycle de rates; `TASK-1468` implementa el ledger; `TASK-1553` posee
catálogo, bindings y resolución por ruta; `TASK-1578` certifica route → rate → binding → estimate/actual → canary
→ promotion y declara coverage API/SDK/MCP/UI. Ningún modelo nuevo se considera disponible sólo por existir en el
catálogo.

## Delta 2026-08-01 — TASK-1630 converge el control plane de créditos

`TASK-1630` coordina las tasks existentes sin crear un tercer ledger ni absorber sus archivos. La auditoría del
runtime comprobó que availability/evaluate no aplican aún la misma semántica que reservation: gasto histórico se
publica como `spentInPeriod`, los caps no incluyen holds vigentes, el período del pool no se exige y el rollover
mensual presupone un pool preparado. Por eso `TASK-1586`, `TASK-1483` y `TASK-1628` no pueden ejecutarse sobre los
DTOs actuales.

El orden normativo queda: `TASK-1482` corrige período, funding y decisión compartida; `TASK-1468` + `TASK-1579`
cierran holds/expiry/settlement; `TASK-1586` entrega lifecycle/receipts autoritativos en Globe y proyecciones de
status/recovery en Greenhouse; `TASK-1629` agrega autoridad one-shot y adapters one-command/readback;
`TASK-1483` implementa `/admin/globe/credits` en Greenhouse; `TASK-1628` conserva
Producer como self-view read-only; MCP llega después por `TASK-1473`/`TASK-1626`.

La autoridad owner-operated queda explícita: una instrucción atribuida del CEO puede autorizar a un humano o
agente autenticado para completar `preview → propose → confirm → readback` sin un segundo humano.
`requireSecondConfirmer` es policy opcional por workspace/umbral y permanece OFF en
`greenhouse-org:efeonce`; un workload genérico nunca confirma y un agente no puede ampliar su propia delegación.

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
cross-réplica nunca se ejercitó — es **`TASK-1512`**. El modelo rico de workspace/members/grants fue entregado por
**`TASK-1511`** y verificado internal-only en shadow; `enforced` espera reconciliación continua. Production/clientes
externos siguen gateados por `TASK-1480`. Spec canónica:
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
habilitar acceso directo/cobro automatizado es **TASK-1521** (runtime comercial) + **TASK-1480** (readiness comercial).
El primer servicio comercial managed ya tiene `conditional-go` CEO en `TASK-1480`; el acceso directo al runtime y la
expansión siguen sujetos a las dependencias completas. Esa es la distancia real a comercial, no la UI.
**Estado verificado 2026-07-25 (no inferir de esta prosa — chequear el lifecycle real):** `TASK-1521` está
**`in-progress`** con trabajo cerrado (Producer interno multimodal con sesión/viewer, outbox/queue age y
severidades); `TASK-1480` está `in-progress` con `conditional-go` CEO para el primer lane managed. La versión anterior de esta línea decía *"ninguna empezada"* y
quedó stale — un agente la citó como hecho vigente sin verificar la carpeta de la task.

## Delta 2026-07-24 — principio faltante: catálogo multi-modelo extensible y elegible (best-in-class, coexistente)

El epic planteaba **provider routing por contrato de fidelidad** + recommendation matrix (TASK-1459) + stack de
proveedores (TASK-1486/87/88), pero **NO** plantaba un principio de producto que la dirección hizo explícito el
2026-07-24: **Globe corre los mejores modelos del mercado, coexistiendo y creciendo en el tiempo — sin que uno
sustituya a otro.** Se agrega como principio del epic:

- **Catálogo multi-modelo extensible:** varios modelos por capacidad (imagen, y por diseño video/audio) coexisten como
  **rutas gobernadas elegibles**. Agregar un modelo nuevo es un **paso chico y gobernado** (entrada de catálogo + binding),
  no una reescritura ni una sustitución.
- **Update ≠ Add (dos operaciones distintas):** *update* = bump de versión dentro de la misma ruta/lineaje (reemplaza:
  ej. Gemini 2.5→3, gpt-image-1→2); *add* = modelo/tier distinto = ruta nueva que **coexiste** (ej. Seedream ≠ Nano
  Banana; GPT Image 1.5 **y** 2; Nano Banana Pro **y** 2). Regla uniforme para todos los proveedores.
- **Compatibilidad con el non-goal "no declarar un modelo 'mejor' globalmente":** el catálogo **ofrece** los mejores;
  la **selección** es explícita del operador (selector, TASK-1552) o por contrato de fidelidad / recommendation matrix
  (TASK-1459) — nunca un "mejor global".

**Gap de implementación al abrir el delta:** los adapters resolvían el modelo por capacidad y dos modelos del mismo
proveedor no podían coexistir. **Resuelto por TASK-1553:** la identidad ejecutable se resuelve por ruta, una ruta
declarada sin entry falla cerrada y el selector consume disponibilidad live. La historia de esta brecha se conserva
porque explica ADR-013; no representa el runtime actual.

**Actualización 2026-07-30:** Seedream 5 Pro, Nano Banana Pro, Nano Banana 2, GPT Image 2, GPT Image 1.5 y Recraft
v4.1 Vector coexisten como rutas disponibles y fueron ejercitados desde el Producer autenticado. El 404 histórico
de Nano Banana 2 y el bloqueo del verifier OpenAI quedaron superados. Cada futura identidad conserva evaluación,
revisión, derechos, binding/readiness/circuito y canary UI propios.

### Outcome (adición)

- Globe opera un **catálogo multi-modelo extensible de best-in-class** (imagen/video/audio) donde los modelos
  coexisten como rutas elegibles; **agregar** un modelo es un paso gobernado y **actualizar** (versión) es distinto de
  **sumar** (modelo nuevo); la selección es explícita o por contrato de fidelidad, nunca "mejor global".

## Delta 2026-07-25 — el payload de browser de Globe deja de ser un string (ADR-014, foundation viva)

El epic tenía superficies humanas (`TASK-1505`, `TASK-1524`, `TASK-1540`, `TASK-1547`) pero **ningún
principio sobre cómo se construyen**. ADR-014 lo hace explícito y su foundation ya está en `main` de Globe.

- **Ninguna superficie humana nueva de Globe nace como template de string.** El payload es una app tipada
  y componetizada (`apps/studio-client`: Vite 8.1.5 + React 19.2.8 + React Router 8.3.0, SSR apagado)
  servida como assets estáticos por el **mismo** `studio-web`. Host, BFF, sesión SSO, CSP por nonce, ALB y
  API privada **sin tocar** — la ADR cambia qué se le manda al browser, no quién tiene autoridad.
- **Consecuencia directa para tres child tasks:** `TASK-1547` (Storyboard), `TASK-1540` (Video
  Effectiveness) y `TASK-1472` (delivery) **nacen** en el payload nuevo; no se portan.
- **Globe estrena maquinaria de gates, no sólo framework.** SSOT de tokens con `LEGACY_TOKEN_DRIFT`, capa
  de copy locale-keyed, ESLint (jsx-a11y + rules-of-hooks) y 3 gates de diseño como tests. Los 6 gates se
  verificaron **mordiendo**: se introdujo una violación de cada clase y las 6 fallaron.
- **Estado real:** la foundation está completa (`TASK-1556`) y el **share board también** (`TASK-1558`
  Slices 1-2, `a336ff5` en `main` de Globe): nacieron las seis primitives base (`Chip`, `Eyebrow`,
  `FactList`, `CommentList`, `StateBlock`, `MediaStage`) sirviendo a una superficie real, los tokens de
  tipografía entraron al SSOT, el gate de diseño creció a tipografía y pesos sin `@font-face`, y hay
  canary visual de seis estados × tres anchos con assertion de no-fuga sobre el HTML servido.
  **Cutover ejecutado 2026-07-25: el share board YA SIRVE** (revisión `00071-6vp`, imagen `85dac33b03b1`,
  `GLOBE_CLIENT_APP_ENABLED = "true"`). Es la primera superficie de ADR-014 en producción; `launch`,
  `studio`, `error` y `producer` siguen en el legacy. Verificado automáticamente en vivo: React monta
  bajo la CSP estricta real **sin un solo error de consola** en desktop y 390px, sin overflow, con Geist
  cargando del SSOT, cero fugas en 7 sondas del HTML servido, y el asset por CDN con hit de edge —
  `TASK-1557` y `TASK-1558` se validan mutuamente en vivo por primera vez. **Lo que falta necesita una
  persona y no puede automatizarse:** el token del grant se guarda hasheado, así que ningún share
  existente tiene token recuperable y crear uno pide sesión OAuth de Globe.
- **El único unknown técnico de la ADR quedó cerrado:** React Router 8.3.0 compila sobre Vite 8.1.5, y el
  bundle real corre en Chromium real bajo la CSP estricta real sin un solo error. El fallback a
  `vite@7.3.x` se retira.
- **Cluster ADR-013/ADR-014 en el programa:** `TASK-1553` (resolución de modelo por-ruta) · `TASK-1554`
  (reader de availability, desplegado) · `TASK-1555` (selector compacto del Producer, **complete** — la galería se rechazó) · `TASK-1556`
  (esta foundation, **complete**) · `TASK-1557` (CDN de assets, **complete y verificado en vivo**).

### El programa de ADR-014, completo (creado 2026-07-25)

Los cinco slices de la ADR tienen dueño. Antes de esto sólo existían los dos primeros, y **una
migración sin task para su último paso no es una migración: es una convivencia permanente.**

**Estado 2026-07-25** (verificado contra lifecycle real y contra `main` de Globe, no inferido de esta prosa):

| Slice ADR-014 | Task | Estado | Qué la destraba |
|---|---|---|---|
| 0 — Foundation | `TASK-1556` | ✅ complete | — |
| — CDN de assets | `TASK-1557` | ✅ complete, verificado en vivo | — |
| — Reader de flota | `TASK-1554` | ✅ complete | — |
| — Hardening del gate | `TASK-1561` | ✅ complete | — |
| 1 — Share board | `TASK-1558` | ✅ **SIRVIENDO** (cutover 2026-07-25, rev. `00071-6vp`) | — |
| — Hidratación de la proyección del share | `TASK-1562` | ✅ entregada (`85dac33`), precedió al cutover | — |
| 2 — `ui.ts` (launch/studio/error) | `TASK-1524` | 📋 to-do | Dirección cinematográfica |
| 3 — Composer | `TASK-1552` | 📋 to-do | **Nada — desbloqueado**: las primitives ya existen |
| 4 — Feed + viewer | `TASK-1559` | 📋 to-do | **Nada — desbloqueado**: las primitives ya existen |
| 5 — Retiro del legacy | `TASK-1560` | 📋 to-do | Los ports de `1524` / `1552` / `1559` |

**El hecho que gobierna el próximo paso: el cutover no es un `tofu apply`.** Se creía que sí —lo decía
la propia `TASK-1558`— y hoy quedó verificado que es falso. En `main` de Globe, `client_app_enabled`
aparece **una sola vez** en todo `infra/terraform/`: su propia declaración en `variables.tf:188`, **sin
cablear a ningún recurso**. `GLOBE_CLIENT_APP_ENABLED` no aparece en ningún `.tf` ni en el spec del
Cloud Run `globe-studio-internal`, y la imagen desplegada (`45235ccb62ca`) es **anterior** al commit de
`TASK-1556`: no tiene bundle, no tiene `renderShell` y no lee esa variable. Cambiar el default a `true`
y correr `tofu apply` daría **plan vacío** y producción idéntica — el mismo modo de falla de
`GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`: el registro dice ON y la realidad es OFF.

**La cadena real, en orden:** (1) cablear `GLOBE_CLIENT_APP_ENABLED = tostring(var.client_app_enabled)`
en el `.tf` del servicio → (2) `TASK-1562` → (3) desplegar `origin/main` vía `deploy-internal.yml`
(**requiere autorización humana**) → (4) flip del default + `tofu apply` → (5) verificar con un grant
real → (6) retirar el legacy (`TASK-1560`).

**`TASK-1562` va antes del cutover y no es cosmética.** Hidrata `modelLabel`, `reviewStatus` y
`comments`: el grant los pide, el dominio los proyecta y el operador puede crearlos, pero
`resolveForShare` devuelve sólo `{ target, mediaType }` y los descarta en silencio en **todos** los
shares de producción. El board viejo tapaba el agujero con un `if (!value) continue` que nunca ve un
valor; el board nuevo, al mostrar "Sin dato", **destapó un bug que llevaba tiempo ahí — no lo
introdujo**. Sin `1562`, el cutover cambiaría "sin panel" por "panel con tres huecos declarados" en la
única superficie que ve un cliente externo.

Tres decisiones que quedaron fijadas al crear estas tasks:

- **`TASK-1524` es dueña del port de `ui.ts`, no sólo su consumidora.** `ui.ts` sirve TRES superficies
  (`launch`, `studio`, `error`); portar sólo la de login no retira el archivo, y `TASK-1560` no puede
  borrar algo con dos consumidores vivos. Su Slice 5 nuevo lo hace explícito, incluido adoptar el
  anillo de foco canónico — hoy es **ámbar** ahí y **azul** en el Producer, así que un usuario de
  teclado ve cambiar la identidad del foco al cruzar de pantalla.
- **`TASK-1559` es el slice de concurrencia, no una superficie más.** Watermark, epoch por operación y
  refresh single-flight hoy sólo están verificados por haber funcionado en vivo. Se portan **con sus
  tests, antes de tocar render** — un port que renderiza bien y reconcilia mal produce una UI que se ve
  correcta y muestra el candidato equivocado.
- **`TASK-1561` nace de que el gate de color expuso su propio agujero.** La sesión de `TASK-1558`
  encontró `font-family` literal en cuatro lugares de `producer-ui.ts`, sin que nada lo detuviera —
  *"the same shape of failure that produced 63 unrepeatable colours, one step behind"*. Y la tipografía
  es peor que el color: un peso sin archivo cargado **lo sintetiza el browser** deformando las letras,
  sin fallar ningún gate.

## Delta 2026-08-01 — primer reader Globe federado por MCP, internal-only

`TASK-1473` y `TASK-1626` habilitaron el primer corte real de MCP sin mover el dominio creativo: el gateway
independiente `efeonce-mcp` publica únicamente `globe.producer.fleet.list` y lo delega al reader canónico de
Globe. El principal downstream queda limitado a `globe.producer.catalog.read` y al workspace
`greenhouse-org:efeonce`; no obtiene grants de runs, assets, review, delivery, créditos ni reveal-house.

La evidencia operativa es Globe `001ce1b` / `globe-api-internal-00179-qcz`, gateway `ce593f2` /
`efeonce-mcp-gateway-00009-9c6` y canary OAuth authorization-code + PKCE por
`https://mcp.efeonce.org/mcp`: initialize, discovery y la tool respondieron sin provider slug, house, costo de
vendor ni margen. El gateway es un adapter: no importa DB, storage ni SDKs de proveedores y Cloud Run conserva
`concurrency=80` con `maxScale=5` efectivo.

Esto **no habilita clientes externos ni completa la paridad MCP de Globe**. El cliente interno Entra recibe ambos
scopes incluso cuando solicita el base; antes de B2B/multitenant debe separarse la emisión/asignación de
entitlements y repetirse el deny con una identidad base-only. La paridad de lifecycle, assets, review, delivery y
writes conserva sus tasks y gates propios.

## Delta 2026-07-25 — ADR-014 avanza cuatro superficies, y un fallo de gobernanza que vale más que el código

Este delta registra dos cosas de peso muy distinto: **lo que shippeó** del payload cliente, y **un fallo de
gobernanza propio** que produjo cinco tasks duplicadas antes de detectarse. El segundo es el aprendizaje.

### Lo que shippeó

| Pieza | Estado | Evidencia |
|---|---|---|
| **Share board** sobre el payload cliente (`TASK-1558`) | **LIVE en producción** | revisión `globe-studio-internal-00071-6vp`, imagen `85dac33b03b1`; verificado en browser a 1440/390/320 con axe limpio y sin fugas |
| **Hidratación de la proyección del share** (`TASK-1562`) | **LIVE** | `resolveForShare` devolvía sólo `{ target, mediaType }`: `modelLabel`, `reviewStatus` y `comments` se descartaban **en silencio en TODOS los shares** — el grant los pedía, el dominio los proyectaba, el operador podía crearlos, y la autoridad nunca los entregaba |
| **Feed + viewer** sobre el payload cliente | code complete, sin desplegar | commits `85c0d1f` → `c9ceabc`; 4 slices; transporte gobernado, resolver de bytes, reconciliación por marca |
| **Motion del payload cliente** | 6/7 slices, verificado en browser | commit `1c0684e`; 13 asserts del canary en los dos modos de `prefers-reduced-motion` |
| **Recipe + vigencia del estimado** | Slice 1 | commit `feffd47`, 17 tests |

**Nada de esto está desplegado salvo el share board.** El push a `main` de `efeonce-globe` espera señal del
operador; el estado correcto del resto es `code complete, rollout pendiente`.

### Las cuatro correcciones técnicas que vale conservar

1. **El criterio de retiro del payload legacy medía 12 de 38 capabilities.** `producer-client.ts` es el
   **transporte** y expone un `reader(id)`/`command(id)` **genérico**; `producer-controller.ts` —la UI— despacha
   **29 capabilities más** por ese camino, y ninguna aparece como literal en el transporte. El drift guard leía
   sólo el transporte, así que **pasaba en verde midiendo el archivo que su autor eligió, no la realidad** — el
   anti-patrón *"el gate es el test de regresión del primer consumidor"* aplicado al propio gate. Sin corregirlo,
   `TASK-1560` habría podido borrar el legacy cubriendo un tercio de su capacidad. El inventario ahora declara las
   38 con su **`surface`**, y ese campo lo convierte en un plan: **composer 14 · viewer 6 · library 6 · credits 4 ·
   feed 4 · review 4**. El composer es el cuello de botella del retiro, y ahora es un dato.
2. **`Serie` y `Compartir` SÍ tienen contrato.** Se deshabilitaron en el feed con el mensaje *"no tiene contrato
   gobernado"* y era falso: `LibraryContainerKindV1` incluye `'series'` y el item del feed ya trae
   `output.containerIds`; `globe.producer.review.share.create` existe. Lo que falta es la **superficie**. La
   diferencia no es de copy: *"no hay contrato"* manda al próximo agente a construir uno que ya está.
3. **El motion del feed shippeó con 4 de 11 animaciones** porque `TASK-1559` se autorizó con **`Motion: none`**
   para una superficie cuyo diseño aprobado tiene 11 `@keyframes`. El gate de task-lint sólo verifica que el campo
   exista; **quien ejecuta tiene que cuestionar el contrato**, no ejecutar contra él.
4. **La vigencia del estimado la da el contrato, no el cliente.** `LabEstimatePreviewV1` trae `approvalToken` —
   *"binding the previewed commercial quote"*— y `execute` lo consume: **el token ES la cotización**, así que el
   cliente no puede ejecutar un precio que no mostró. Reemplaza cualquier bookkeeping de "¿cambió algún campo?".

### 🔴 El fallo de gobernanza: cinco tasks duplicadas

Se crearon `TASK-1559`, `1562`, `1563`, `1564` y `1565` sin barrer el registry, y **cada una pisaba territorio de
una task que ya existía**:

| Creada | Dueña que ya existía |
|---|---|
| `TASK-1559` feed + viewer | **`TASK-1526`** Producer Resilient Feed and Viewer |
| `TASK-1562` proyección del share | **`TASK-1522`** Review, Comments and Read-only Share Foundation |
| `TASK-1563` menciones | **`TASK-1522`** |
| `TASK-1564` composer | **`TASK-1552`** Composer Focused Creation + **`TASK-1532`** One-Click Generate + **`TASK-1555`** Model Selector + **`TASK-1530/1531`** Prompt |
| `TASK-1565` motion | **`TASK-1523`** Creative Suite Experience Logic (dueña de los contratos visual/flow/motion) |

Y se estuvo por crear una sexta, de biblioteca, cuando **`TASK-1520`** ya existe — su propio Summary dice
*"proyectables en el feed canónico"*, o sea la sinergia con el feed ya estaba en su scope.

**La causa raíz: se barrió por NOMBRE, no por DOMINIO.** *"Feed + viewer sobre el payload cliente"* y *"Resilient
Feed and Viewer"* son la misma superficie con dos nombres, y ningún barrido por nombre las cruza.

**Lo hecho:** `1563/1564/1565` **retiradas** (movidas a `complete/` con cabecera que dice dónde fue cada pieza).
Se retiran en vez de completarse porque dos specs de la misma superficie se separan y después nadie sabe cuál
manda — que es el mismo mecanismo que produjo la medición de 12 vs 38. `1559/1562` **no** se retiran: su código ya
shippeó y hay commits que las nombran; llevan puntero a su dueña.

**El contenido volvió a las ocho dueñas, y no sólo el razonamiento — también los criterios exigibles**, porque
prosa no es criterio: 14 checkboxes en `1552` (encabezados por las cuatro compuertas del gasto), 10 en `1523` (8
ya verificados en browser), 9 en `1520`, 10 en `1522` y 5 en `1532`. Los docs de UI se **migraron con `git mv`** a
la nomenclatura de su dueña, para que no queden dos versiones. `TASK-1532` bajó de `UI ready: yes` a `no`: un CTA
que **gasta plata** no puede declararse listo con `Motion: none` y `Flow: none`.

### El patrón que une los cuatro errores de esta sesión

Medir el archivo elegido en vez de la realidad · afirmar que algo no tiene contrato sin buscarlo · declarar
`Motion: none` sin mirar el diseño · decir "el contenido está en las tasks dueñas" sin abrir sus campos.

**Los cuatro son conclusión antes de barrido.** Y los cuatro tenían el mismo remedio, que cuesta segundos: el
comando que lo prueba. `grep` del despacho real, `grep` del contrato, contar los `@keyframes` del prototipo,
`grep -E "^- (Motion|Flow|UI ready):"`.

**Regla operativa que queda para EPIC-028:** antes de crear una task de este epic, barrer el registry **por
dominio y por superficie**, no por el título que se le quiere dar al trabajo. El epic tiene ~50 tasks hijas y
varias describen la misma superficie desde ángulos distintos (foundation · resiliencia · port · rediseño): la
pregunta correcta no es *"¿existe una task con este nombre?"* sino *"¿quién es dueño de esta superficie?"*.
