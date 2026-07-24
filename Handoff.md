# Handoff activo

> Cabina de mando para continuidad inmediata. No es changelog, arquitectura ni memoria completa.
> Ventana máxima: 20 sesiones. Historia íntegra e índice: [Handoff.archive.md](Handoff.archive.md).

## Estado activo ahora

- Branch compartida: `develop`. Antes de editar, ejecutar `git status --short` y no asumir árbol limpio.
- El checkout contiene trabajo paralelo de Campaign Layout Compiler / producción creativa que fue preservado
  exactamente en el snapshot del corte; no revertir ni reescribir esos cambios.
- Estado y decisiones vigentes: usar tasks/epics/issues y canon enlazado; la historia no prevalece sobre
  código, schema ni runtime verificados.
- Colas canónicas de trabajo: [tasks](docs/tasks/README.md), [epics](docs/epics/README.md),
  [mini-tasks](docs/mini-tasks/README.md) e [issues](docs/issues/README.md). La ventana de sesiones no reemplaza
  esos índices ni debe ocultar trabajo activo más antiguo.
- La gobernanza de `software-architect-2026` está en
  `docs/architecture/GREENHOUSE_SOFTWARE_ARCHITECT_SKILL_GOVERNANCE_V1.md`.
- Globe formalizó autoría humana en Business Model V1.1/ADRs; `TASK-1530…1534` siguen `to-do` y B2B2B continúa
  como hipótesis sin acceso.

## Riesgos abiertos

- Trabajo local concurrente: coordinar ownership antes de tocar archivos ya modificados.
- **Globe Producer internal-only:** el camino humano ya generó y recuperó Image/Video/Audio reales en tres rutas
  promovidas; feed/viewer y Asset Governance funcionan. El catálogo tiene 10 rutas: las otras 7 requieren
  evidencia/promoción/canario exactos. La reautenticación visible y el viewer multimodal ya están desplegados.
- **Globe — spend fence cross-réplica pendiente (`TASK-1512`).** Hubo dry-run y gasto gobernado; falta prueba de
  contención cross-réplica.
- **Globe — runtime fix desplegado:** Studio `f9839ee` y Worker `8d7ecb1` cerraron reauth/viewer,
  supersedieron 6 reconciles, estabilizaron queue age en `0` y aplicaron severidades. Evidencia:
  `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`.
- **Globe Producer:** `TASK-1525` complete; `TASK-1526` complete (feed/viewer keyed con continuidad estable tras refresh, filtros, búsqueda y orden, con reproducción por modalidad validada).
- **Globe — promoción/media:** auditoría live `0/7` ready. `TASK-1527` está en checkpoint humano; `TASK-1528…1529`
  poseen derivados+Range y GC. No fabricar/heredar evidencia.
- **Globe — Video Effectiveness Agent (diseño aceptado, sin implementación).** `ADR-011` + `SPEC-011` incorporan
  una surface propia compartida por todo Globe. Videos generados o externos convergen en el `assetRef` de
  TASK-1467/ADR-007. Producer→análisis y agente→Producer draft/estimate comparten authority, lineage, idempotencia
  y recursion guard; ningún agente aprueba ni gasta. `TASK-1536…1541` registran seis slices compactas y nacen
  con Full API Parity: surface propia, Producer y demás dominios consumen el mismo primitive.

## Pendientes inmediatos

- **`TASK-1521` IN-PROGRESS.** Producer interno produjo las 3 modalidades y governance promovió un asset; no
  habilita runtime comercial. Pendiente: sesión expirada, outbox stale/alertas, siete promociones (derivados/
  streaming ya los cerró `TASK-1528`). Clientes externos gateados por `TASK-1480`. Plan: `docs/tasks/plans/TASK-1521-plan.md`.

- **`TASK-1525` COMPLETE.** Reader live `ed5e993`; base backend/feed cerrada.

- **`TASK-1526` COMPLETE.** Reconciliación keyed + continuidad del feed/viewer (foco/media estables en refresh/
  filtros/búsqueda/orden, títulos client-safe); Studio desplegado en `7ac0ded`, API `eac1730`. Detalle en su
  task file.

- **`TASK-1527` IN-PROGRESS (P0, rollout live avanzado 2026-07-23/24).** Aggregate + flag ON + recovery worker
  + señales + identities disjuntas + canary authority desplegados internal-only (`ffe4102…ff24093`, migración
  `0028`, tofu `No changes`). Rehearsal stage→rollback ✅ (atrapó y corrigió colisión de idempotency keys por
  fase) y recovery autónomo del worker ✅ (`promotion_recovery_deadline`, señal ERROR emitida). Con el flag ON
  el caller genérico ya NO porta `production-routing.manage`/`asset-rights-policy.manage`. **Ruta image RESTAURADA** (binding enabled rev 3 + circuit closed rev 3, carril gobernado,
  api rev `00065-g67`, tofu No changes, tokenCreator caller revocado con corte verificado). **Queda:** saga
  promote-from-candidate con la primera ruta con evidencia real (no fabricable). Hallazgo: `model-readiness.pause` human-only
  sin superficie operable (follow-up). tokenCreator temporales revocados con corte verificado.
  Plan: `docs/tasks/plans/TASK-1527-plan.md`. `TASK-1528`/`TASK-1529` siguen to-do.

- **`TASK-1528` COMPLETE internal-only (P0, 2026-07-24).** ADR-008 media derivatives + Range gateway (206/416)
  live; canary 3 modalidades verde, flags ON, `tofu plan` No changes. Detalle: `GLOBE_RUNTIME_HANDOFF.md`
  §Media Derivatives. Desbloquea `TASK-1529`; no habilita comercial (`TASK-1480`).

- **`TASK-1503` COMPLETE y ACTIVA internal-only.** Retrieval, favorite y copy-as-reference funcionan en API y UI
  por grants/BFF; el bucket continúa privado y tenant-blind. Estado mutable y evidencia:
  `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`; operación:
  `docs/manual-de-uso/creative-studio/operar-retrieval-assets-globe.md`.

- **Globe hacia comercial — gates vigentes y bloqueo de entorno ahora con dueño (`TASK-1521`).**
  `internal_smoke` es el estadio actual del runtime, no el techo del producto. Camino real:
  `TASK-1519` (bridge humano, grants + enforcement) → `TASK-1505` (integración UI) y, para cliente externo, `TASK-1480`
  bloqueada por `TASK-1477`/`1478`/`1479`/`1482` (sobre `TASK-1468`) — las cinco en `to-do`.
  `readStudioRuntimeConfig` lanza `globe_environment_not_internal_smoke` para cualquier valor distinto, así que
  hoy **no existe forma de bootear un runtime comercial**. `TASK-1521` posee ahora environment contract,
  isolation/config, migrations/secrets, rollback y evidencia; las otras dependencias pueden avanzar en paralelo,
  pero ninguna la sustituye.

- **`TASK-1466` COMPLETE (`EPIC-028`).** SPEC-008 desplegada y verificada internal-only. Detalle en
  `GLOBE_RUNTIME_HANDOFF.md`.

- **`TASK-1509` / `TASK-1510` IN-PROGRESS (Native Meeting Scheduler, `EPIC-023`).** `/agenda/` (WP `251583`,
  `noindex`) opera native-only con flags ON y binding piloto `active`; release `2fbea2b39b555…` pasó GVC live.
  Greenhouse = API; HubSpot/Office 365/Teams = SoT. GTM workspace 6 sin publicar; Contacto/RRSS gateados por
  booking/replay/`/g/collect`. Evidencia y detalle viven en TASK-1510.

  **Decisión corregida 2026-07-22:** `EPIC-035`/ADR V2 mantiene el runtime neutral; `TASK-1514` endurece Vercel y
  `TASK-1515` decide Vercel vs Firebase dedicado antes de provisionar. Firebase en `efeonce-group` queda no autorizado;
  cero cambios cloud/DNS/runtime. Ejecución `TASK-1514`→`1518`.

- **`TASK-1366` COMPLETE / CONDITIONAL PASS (HubSpot Scheduler Booking Equivalence Spike, `EPIC-023`).**
  Booking real verificado `isOffline=false` (CRM/Teams/Office 365/links nativos); productización pendiente de
  UTK/UTM e inbox invitado. No cancelar la reunión salvo instrucción. Canon:
  `docs/tasks/complete/TASK-1366-hubspot-scheduler-booking-equivalence.md` + `PDR-009`.

- **`TASK-1506` COMPLETE (ADR-004 — Globe Frontend Hosting and Front Door Decision, `EPIC-028`).**
  Mantiene **Cloud Run** como web/BFF/SSO del shell interno (Node nativo; Next.js `superseded` ahí) y rechaza migrar
  a Vercel. El **frontend cliente comercial** (`TASK-1505`+) es superficie separada con host + framework **diferidos**
  — no leer "Cloud Run para el shell interno" como "Cloud Run para el cliente". Tres gates distintos: URL
  internal-only / HA (cleared) / Production (`TASK-1480`). Spec:
  `docs/architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`.
- **`TASK-1465` COMPLETE (Globe Workspace/Tenancy/Persistence/Audit, `EPIC-028`) — desplegada + verificada en vivo.**
  Globe pasó de **cero DB / todo in-memory** a durable: Cloud SQL `globe-pg` keyless IAM + `packages/database` + los
  **5 stores** detrás de sus ports (incluido el spend fence atómico) + audit append-only. Durabilidad probada en el
  servicio vivo. Detalle: `EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md` + `GLOBE_RUNTIME_HANDOFF.md`.
  El modelo workspace/members/grants fue entregado después por `TASK-1511`. **Corrección de historia:** el `maxScale=3` que esta task
  reportó era el ceiling de revisión; el efectivo era 1 hasta que `TASK-1508` lo corrigió a 3/3 (detalle en su spec).
- **`TASK-1507` COMPLETE (Globe Internal Front Door, `EPIC-028`) — aplicada y verificada en vivo 2026-07-21.**
  **La base URL estable del shell interno es `https://globe.efeoncepro.com`** (Global External ALB + serverless NEG →
  `globe-studio-internal`, cert `ACTIVE`, 301 HTTP→HTTPS). El ingress del web quedó en
  `internal-and-cloud-load-balancing`, así que **el `*.run.app` ya no es alcanzable por browser** (404) y sólo
  persiste en el allowlist OAuth como camino de rollback. `globe-api-internal` sigue IAM-private, sin custom domain
  y con audience `run.app`. Arquitectura: `docs/architecture/creative-studio/EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md`
  (SPEC-009). Operación y rollback: `docs/manual-de-uso/creative-studio/operar-front-door-globe.md`. Runtime:
  `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`.
- **`TASK-1508` COMPLETE (Globe Cloud Run IaC + Deploy Ownership, `EPIC-028`) — aplicada y probada en vivo 2026-07-21.**
  Los dos servicios Cloud Run entraron a Terraform (import brownfield, cero destroy/replace) y `deploy-internal.yml`
  quedó reducido a desplegar **sólo la imagen**; anti-drift probado en dos ciclos con `tofu plan` en `No changes`.
  Corrigió un **cap efectivo de 1 instancia** que ningún doc registraba: Cloud Run aplica el menor entre el ceiling de
  servicio y el de revisión, y `--max-instances` escribe uno u otro según el subcomando. Hoy 3/3 y ambos bajo IaC
  (provider `~> 7.0`). **Riesgo abierto:** el spend fence cross-réplica sigue **sin ejercitarse** (`TASK-1512`).
  Carril IaC: `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`.
- **`TASK-1500`/`1501`/`1502` COMPLETE (cluster Producer: route catalog · run contract discriminado · estimate
  previewable, `EPIC-028`) — en `../efeonce-globe` `main`, local-first sin push.** Detalle en sus specs `complete/`
  + SPEC-004/005/006 de `creative-studio/DECISIONS_INDEX`. Naming: **modelo real público** (`model`=nombre+versión,
  ancla de posicionamiento), `house` operator-only; slug/costo/margen nunca salen. Rollout: aditivo read-only, sin
  redeploy hasta autorización.
- **`TASK-1492` COMPLETE (repatriación documental Globe → Greenhouse).** La doc gobernante de Globe vive
  ahora en `greenhouse-eo` bajo `creative-studio/` (arquitectura, runbooks, funcional, manuales), + continuidad
  de runtime en `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` y changelog en
  `docs/changelog/internal/creative-studio-globe.md`. La skill `greenhouse-globe` + `CLAUDE.md` corrigieron la
  causa raíz (regla dura: NUNCA doc gobernante en `efeonce-globe/docs/**`). **Pendiente de instrucción del
  operador:** el commit de reducción del meta-repo en `efeonce-globe` (`d7edea0`, borra los docs repatriados,
  deja solo código/infra/evidencia + punteros) está **local, sin push**. Push del repo hermano = decisión humana.
- `TASK-1489` quedó registrada como foundation P0 de IaC GCP para Greenhouse. Orden obligatorio: inventario
  brownfield → ADR aceptada → scaffold/state/CI no mutante → plan con cero destroy/replace → apply supervisado
  opcional → cutover de ownership/drift. La task no autoriza apply por sí sola, no comparte state con Globe, no
  gestiona payloads de secrets y difiere Cloud Run, Scheduler, Cloud SQL y aislamiento a follow-ups. Estado:
  diseño/backlog; cero cambios en GCP.
- `TASK-1481` (Globe API Contract Spine), `TASK-1457` (Safe Model Lab foundation), `TASK-1464` (keyless IaC
  foundation) y `TASK-1458` (Golden Briefs & Evaluation Harness) COMPLETE local-first, sin push, en el repo hermano
  `../efeonce-globe` (`main`; en greenhouse-eo sólo lifecycle documental). El spine + el Model Lab (`LabSpendFence` hard cap, private-ingest, kill switch,
  `FakeReferenceAdapter` + `LabRunner`) fluyen end-to-end con un proveedor **fake determinístico** (cero gasto,
  cero infra); `pnpm check` + `pnpm build` verdes. `TASK-1464` escribió el Terraform completo (import blocks de los
  recursos VIVOS de TASK-1454 + GitHub WIF/budgets/observabilidad + outputs para 1457), los workflows keyless y el
  runbook. **1464 APPLY SUPERVISADO EJECUTADO (2026-07-19):** `tofu apply` contra GCP vivo → `23 imported, 13 added,
  0 changed, 0 destroyed` (identidad TASK-1454 adoptada sin destroy/replace, verificado en el plan antes de aplicar).
  Vivo: GitHub WIF pool/provider (ACTIVE), deployer run.admin + act-as, bucket privado `efeonce-globe-lab-evidence`,
  log metric de SA-key, state remoto `gs://efeonce-globe-tfstate`; secret `GCP_WORKLOAD_IDENTITY_PROVIDER` seteado en
  `efeoncepro/efeonce-globe`.
  **Único rollout pendiente:** el canary con **proveedor real** de 1457 (`GLOBE_LAB_ENABLED` default OFF). La infra
  ya no bloquea; falta código+config: un provider adapter real que reemplace el fake en el `LabRunner`, secretos de
  provider en Secret Manager, un Dockerfile de studio-web, y prender el flag. Deferidos: mapping ID-token→principal
  por identidad → live; tenancy/store durable → TASK-1465.
  **`TASK-1458` (Evaluation Harness, SPEC-003)** es la segunda capability (`globe.lab.evaluation.run`): CONSUME el Lab
  vía `runModelLabExperiment` para puntuar golden briefs (still/motion/audio con derechos) contra rúbricas
  versionadas — objetivo (checks automáticos) separado del juicio humano; verdict nunca auto-"passed". Comparte el
  gate de rollout del canary real (con proveedor fake declara la limitación "sólo técnico"); el juicio humano
  (surface `ui`) y el store durable de reports quedan diferidos.
  **`TASK-1486` (Vertex real provider adapter) COMPLETE — code-complete, rollout gated.** Primer `CreativeProviderAdapter`
  real (`VertexCreativeAdapter`, `apps/creative-runner/src/vertex-adapter.ts`) reemplaza el fake detrás del `LabRunner`
  sin tocar dominio/contrato: routing capability→modelo Vertex interno (image→`gemini-2.5-flash-image`; video→
  `gemini-omni-flash-preview` región `global`), keyless (ADC/WIF lazy), `estimate` sin red / `submit` única facturable /
  `poll`→hashes, error mapping sanitizado. Provider-selection `GLOBE_LAB_PROVIDER` default **`fake`** (reversible);
  15 tests mockeados (cero gasto), `pnpm check`+`build` verdes. **Canary billable en vivo = gated por humano** —
  go-live checklist (§"Realización" en `EFEONCE_GLOBE_MODEL_LAB_V1.md`): habilitar Vertex+modelos en el proyecto
  `efeonce-globe` (verificados en `efeonce-group`, NO aún en `efeonce-globe`), SA `aiplatform.user`, deploy/ADC, budget,
  `GLOBE_LAB_PROVIDER=vertex`+`GLOBE_LAB_ENABLED=true`. Audio (TASK-1461) NO queda desbloqueado (adapter Vertex
  `supports('audio-generate')=false`; necesita adapter Fal/Chirp + `CompositeProviderAdapter`).
  **Canary billable VERIFICADO EN VIVO (2026-07-19):** una generación real por el seam (harness→command→runner→adapter→
  `generateContent`), ADC del operador contra `efeonce-globe`: `image-generate`→`gemini-2.5-flash-image` (global),
  `candidate_ready`, `provider=vertex`, sin fallback, `estimated==actual==10` créditos, output como `sha256:…` (fence
  reservó/liquidó). Prereqs OK (aiplatform habilitada + ambos modelos accesibles en `efeonce-globe`). El runtime
  **deployado sigue `fake` por default** — el canary probó el path vertex sin cambiar el default; el harness one-shot
  no se commiteó.
  **`TASK-1487` (Fal provider adapter + Composite) COMPLETE — code-complete, rollout gated.** Segundo adapter real
  (`FalCreativeAdapter`, `apps/creative-runner/src/fal-adapter.ts`) conecta el stack no-Google vía Fal: **Seedream 5**
  (image), **Recraft** (vectorize), **Seedance 2.0** (video), **ElevenLabs** (audio/voz) — las 7 caps. Secreto propio de
  Globe (`GLOBE_FAL_API_KEY`); queue con gotcha `status_url`/`response_url`; output→hash. `CompositeProviderAdapter`
  combina Vertex+Fal (Fal-only por supports(); overlap image/video por política, default Vertex). `GLOBE_LAB_PROVIDER`
  = `fake|vertex|fal|composite` (default fake). 29 tests creative-runner verdes. **Desbloquea audio (1461)** + motores
  alternativos (1459/1460). Canary Fal billable gated por el secreto Fal de Globe + verificación de slugs.
  Inputs con bytes (edit/vectorize/i2v) → `inputs_unavailable` hasta la resolución hash→bytes (follow-up compartido).
  **`TASK-1488` (Fal model expansion) COMPLETE — canary Fal VERIFICADO EN VIVO.** Expande el adapter Fal a 10 caps
  (+`image-upscale`/`video-upscale`/`model-3d-generate`) con modelos verificados **contra las skills**: Seedream 5
  Pro/Lite, Recraft v4.1 text-to-vector, Topaz upscale, Hyper3D Rodin v2.5 text-to-3D, Seed Audio (reverify),
  ElevenLabs speech, Seedance 2.0. **Regla dura descubierta:** modelos **ByteDance** en Fal usan slug **sin** prefijo
  `fal-ai/` (con prefijo el submit pasa pero el result da 404) — la skill lo tenía bien, el catálogo doc mal (corregido).
  Canary Fal en vivo por el seam con la **key Fal existente del repo** (excepción temporal; retiro = key propia de
  Globe): Seedream 5 Pro, `candidate_ready`, `sha256:f9d9a216…`, fence liquidó. **Los 10 modelos verificados en vivo:**
  6 text-driven con hash real end-to-end (Seedream 5 Pro, Recraft v4.1, Seed Audio, ElevenLabs TTS, Rodin v2.5 3D,
  Seedance 2.0) + 4 input-requiring con slug 422 (edit, Topaz image/video, Seedance i2v). Seed Audio vive en
  `fal-ai/seed-audio` (usa `prompt`); poll budget 450s; 422 en result → `provider_failed`. Inputs con bytes
  (edit/upscale/i2v) → `inputs_unavailable` hasta la resolución hash→bytes.
  **`TASK-1459` (Still Model Lab) COMPLETE — recommendation matrix en vivo.** El golden brief still corrió por el
  harness de evaluación real contra 2 motores: Vertex Nano Banana (10cr, **7s**, pass) vs Fal Seedream 5 Pro (10cr,
  **138s**, pass), ambos `objective_pass_pending_human`; diferenciador = latencia; craft a revisión humana. La corrida
  **encontró un bug**: el `route_stable` de Fal comparaba el slug contra el route del contrato — corregido
  (`actualRoute=request.route`). **Próximo:** TASK-1460 (motion) + 1461 (audio) necesitan la **resolución hash→bytes**
  (track B) porque sus briefs parten de una imagen/referencia; el aún pendiente compartido es la **key Fal propia de
  Globe** (retirar la excepción de la key compartida) + deploy del studio-web.
- EPIC-028 avanza en tres carriles paralelos gobernados íntegramente por Greenhouse. `TASK-1456…1485` viven
  en `docs/tasks/to-do/`, pasan por hooks/lint/QA/handoff de este repo y pueden poseer paths de implementación
  en el repositorio hermano. Globe conserva sólo **código, runtime, infra y evidencia técnica**; su
  **documentación gobernante vive en Greenhouse** bajo `creative-studio/` (TASK-1492) — arquitectura en
  `docs/architecture/creative-studio/`, runbooks en `docs/operations/creative-studio/`, y la **continuidad
  de runtime de Globe** en `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`; no tiene registry
  ni namespace de tasks propio. `TASK-1456` cerró esta corrección; próxima wave: `TASK-1457`, `TASK-1458`
  y `TASK-1464`; `TASK-1459` puede integrar/probar still models apenas cierre el Lab gate, sin esperar ledger/workbench.
  Las specs separan ahora ownership: `TASK-1464` posee IaC/WIF/IAM/budgets/observabilidad y `TASK-1457` el
  runtime/policy del Lab. `TASK-1460`, `1468`, `1470` y `1474` mantienen Seedance 2.5 fail-closed hasta una ruta
  verificable y exigen mostrar provider/modelo/version propuestos versus ejecutados, incluidos fallbacks.
  Producción, clientes externos, precios y checkout siguen fuera de alcance.
  **Full API Parity correction:** `TASK-1481` es ahora el primer gate P0 antes de cualquier provider call:
  separa trusted actor/workspace de payload no confiable y entrega schemas, private API/SDK, coverage matrix y
  conformance harness. `TASK-1457` ejecuta el primer canary real por ese spine; `TASK-1473` sólo
  empaqueta/certifica SDK/MCP, no crea parity tardía. El runtime actual es parity-aware, no parity-complete:
  SDK sólo expone health y `CommandEnvelope` bootstrap todavía debe endurecerse durante TASK-1481.
  `TASK-1468` fue reforzada como kernel: allocation shadow, catálogo/rates, balance reconstruible,
  reserve/settle/release/expire/adjust, posting source-ref único, funding pinning y BudgetPolicyPort
  transaccional. `TASK-1482` posee pools/grants/project budgets/policies/forecast sin segundo saldo;
  `TASK-1483` posee `/studio/credits` como Runway Control Plane; `TASK-1474` conserva sólo credits del run.
  `TASK-1484` queda bloqueada para packages/billing/tax/revenue/payments después del decision record de
  `TASK-1480`. `TASK-1485` crea el Design System propio de Globe: Greenhouse gobierna registry/lifecycle/QA,
  Globe posee patterns/components/motion/runtime; compartir color no implica heredar UI Greenhouse.
- `TASK-1454` completó su runtime interno en `develop`, sin push ni Production: broker OAuth multiproducto,
  migración aditiva aplicada a `greenhouse-pg-dev/greenhouse_app`, client/binding Globe internal-only,
  callback `globe-studio-internal`, API privada `globe-api-internal`, SDK y WIF/ADC sin llaves. Los smokes live
  cubren acceso humano interno, denegación de tenant cliente, PKCE/replay, revocación convergente, audience
  correcto/incorrecto y Vercel OIDC → WIF → Cloud Run. Globe queda activo sólo como piloto interno por
  instrucción del operador; rollback = suspender client/binding y retirar IAM/WIF. No existen Production,
  clientes externos, providers creativos, base Globe ni buckets. El repo hermano `efeonce-globe` permanece
  `main` local, sin push; la distribución por tarballs vendorizados es temporal hasta registry privado.
  Incidente contenido: un JWT OIDC efímero apareció en un log diagnóstico y se retiraron deployments/binding
  Preview; una credencial operativa existente de DB apareció durante diagnóstico local y requiere rotación en
  checkpoint separado, sin repetirla ni rotarla unilateralmente.
  `TASK-1455` cerró la lane UI separada: Globe está live en Cloud Run revision `globe-studio-internal-00006-445`
  con root branded, callback→`/studio`, sesión/recovery, assets canónicos y GVC premium desktop/mobile. Score visual
  4,73/5, cero overflow y cero errores Globe. El próximo slice debe especificar el workbench real; projects, runs,
  providers, clientes y Production siguen ausentes. No renombrar el typo histórico `goble` sin revisar consumers.
- Para continuar trabajo activo, partir desde las sesiones recientes de abajo y el artefacto formal aplicable.
- Para investigar decisiones anteriores, buscar primero task/issue/ADR y después los snapshots históricos.

## Recuperación histórica

- Índice: [Handoff.archive.md](Handoff.archive.md).
- Snapshot íntegro pre-migración: [`docs/operations/agent-context-history/2026-07-19/Handoff.legacy.md`](docs/operations/agent-context-history/2026-07-19/Handoff.legacy.md).
- Modelo operativo: [`docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`](docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md).

## Sesión 2026-07-24 — ANAM: agente, backlog y metas operativas

> Customer Agent publicado con Seguimiento/Calidad y handoff neutral; regresión live complementaria pendiente.
> Backlog comercial piloto `21329151` reconciliado en 575 Deals / 205.005,55 UF nominales / 77.134,72 UF
> ponderadas. Tres Goals y nueve gráficos live. Los proxies no fieles permanecen bloqueados y los insumos del
> cliente están enumerados en
> `docs/architecture/kortex/hubspot-as-a-service/anam-follow-up-change-set-2026-07-24.md`; QA:
> `docs/audits/ANAM_HUBSPOT_GOALS_EXECUTION_QA_2026-07-24.md`.
> Los espejos Codex/Claude de `hubspot-as-a-service` ya incorporan el playbook de Goals/metainformes y el fallback
> de closeout cuando Outlook permite lectura pero deniega borradores (`403`).

## Sesión 2026-07-20 — TASK-1490 cerrada: edit/refine cross-model en Globe (verificado en vivo)

- Refinar un candidato pasó a ser **una sola semántica** para todo modelo editable en `efeonce-globe`:
  `editFrom = { experimentId }`; el paradigma (stateful vs reference-based) lo resuelve el seam según qué
  proveedor va a ejecutar. Spec: `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md`.
- **Hallazgo que cambió el alcance:** la task daba por hecho que track B ya permitía re-inyectar un output
  previo. Era falso — los adapters hasheaban los bytes de salida y los **descartaban**, así que el paradigma
  reference-based fallaba en runtime, no en compilación. Se sumó Slice 0 (retención de outputs) como
  prerrequisito duro y se recalibró la spec antes de implementar.
- Verificado en vivo por el seam: reference-based, **cross-model** (Seedream→Nano Banana), stateful (Omni) y
  cross-modal (imagen+vídeo). Dos defectos aparecieron sólo gastando plata real, con la suite unitaria verde.
- **Rollout pendiente (no cerrado):** el servicio `globe-studio-internal` sigue en `GLOBE_LAB_PROVIDER=fake`
  y **sin `GLOBE_LAB_INPUT_BUCKET`** — sin ese flag no hay retención de outputs y todo edit por referencia se
  rechaza en `prepare`. El flip debe incluirlo en la MISMA operación, y la runtime SA necesita
  `storage.objectCreator` sobre `efeonce-globe-lab-evidence` (el canary corrió con ADC humana).
- Sin push: los 5 commits quedan locales en `efeonce-globe` (`596b818`…`1e9dc32`).

## Sesión 2026-07-19 — Surface Recipes hardening y CTA como benchmark de no regresión

> Se añadió `SurfaceRecipe` como ejecutor tipado de los seis recipes sobre `CompositionShell` y se migraron el Lab workbench y `/growth/ctas` sin reemplazar los paneles maduros del cockpit. El contrato prohíbe lectura sostenida directamente sobre `background.default`: el gris es gutter y los work planes sostienen inventario, detalle, metadata y decisión. Se redujo card-on-card, `WorkbenchHeader` usa `surfaceHeroTitle`, sombras/colores pasan por tokens y Growth usa `tabler-trending-up`. La iteración siguiente corrigió causas compartidas: `NavCollapseIcons` ahora es un botón nativo con labels/teclado/target válido, el drawer compacto responde a Escape, Search/Notifications consumen microcopy ARIA canónico, Settings recuperó la jerarquía `listbox→option`, Growth usa el footer interno y los textos CTA señalados pasan por tokens con contraste suficiente. ESLint y TypeScript pasan; GVC iPhone del Lab queda sin findings reales y el shell CTA desktop/mobile fue inspeccionado. Estado de QA: checkpoint, no cierre visual. Los baselines anteriores permanecen sin promover; el authoring profundo CTA conserva hydration warning, skeleton dominante y findings de contraste/label/overflow que requieren otra iteración. No hubo push ni rollout.

## Sesión 2026-07-19 — Studio Credits y Design System Globe cerrados como backlog formal

> Se registraron `TASK-1482` (pools/grants/budgets), `TASK-1483` (credits operations UI), `TASK-1484`
> (monetización bloqueada) y `TASK-1485` (Design System Globe). `TASK-1468` sigue siendo el único kernel/ledger;
> `TASK-1469` liga approvals a funding/policy; `TASK-1478` calibra percentiles/five-line economics; `TASK-1480`
> produce el commercial decision record. Greenhouse gobierna el Design System, pero Globe no hereda sus
> patterns: construye los propios incrementalmente. Siguiente ID libre: `TASK-1486`. No hubo runtime/rollout.

## Sesión 2026-07-19 — Worker build contract endurecido; rollout remoto pendiente

> Se corrigió la causa compartida de los deploys rojos: los 4 Dockerfiles copian `vendor/` antes de instalar,
> los 4 workflows observan todos los build inputs y Agent Context Governance hereda pnpm `10.32.1` desde
> `packageManager` con Node/actions canónicos. Nuevo `pnpm worker:build-contract-gate`: valida Git + SHA-512
> contra lockfile, orden Docker, ignores, triggers y toolchain; 6 tests negativos PASS. `worker:runtime-deps-gate`
> cubre ahora Artifact Worker y forzó declarar `playwright@1.59.1` runtime exacto. `gcloud meta
> list-files-for-upload` confirma ambos tarballs. Docker local no está disponible, por lo que el estado es
> **code complete, rollout pendiente** hasta que los workflows canónicos construyan las cuatro imágenes. El
> registry privado y retiro de tarballs siguen bajo `TASK-1473` (bloqueada por `TASK-1469`/`TASK-1472`).

## Sesión 2026-07-19 — Creative Studio Business Model V1 formalizado

> Se creó la categoría `docs/business-models/` y el primer modelo formal del repo. Creative Studio separa
> delivery model, engagement form y operating mode; Managed Squad deja de confundirse con Staff Augmentation o
> `efeonce-managed`. Studio Credits miden operaciones generativas gobernadas y excluyen capacidad humana,
> finishing determinístico y derechos. Provider-neutral no significa provider-oculto: estimate, approval y
> run history muestran provider/modelo/version, readiness y fallbacks reales, sin revelar costo vendor, margen,
> keys ni prompt/IP interno. El estado es `Approved for validation`: faltan shadow ledger, 30–50
> runs instrumentados, entrevistas, Sample Sprints y sign-off Finance/Legal antes de precio público o clientes
> externos. El contrato se propagó a 20 skills comerciales, productivas y transversales en `.codex/.claude`,
> con módulos específicos para credits comerciales, visuales, motion, audio y HyperFrames; Finance, Legal,
> Talent, Tenders, GTM, Research y Digital Marketing preservan sus boundaries. Los 20 routers Codex pasan `quick_validate`; la
> matriz de adopción registra también dominios auditados sin cambio. Canon: `docs/business-models/creative-studio/`.

## Sesión 2026-07-19 — Contexto de agentes migrado a router con preservación íntegra

> Se separó bootstrap, estado vigente y memoria histórica sin borrar contexto. Los cuatro archivos previos al
> corte quedaron preservados byte-for-byte bajo `docs/operations/agent-context-history/2026-07-19/`, con SHA-256 y conteos en
> `manifest.json`. `AGENTS.md` ahora enruta por dominio; `project_context.md` conserva solo contratos
> durables; este archivo mantiene una ventana máxima de 20 sesiones. El fallback obligatorio ante una duda es
> buscar por keyword en `AGENTS.legacy.md` o los snapshots de contexto y contrastar contra arquitectura,
> task, código y runtime vigentes. `CLAUDE.md` y su CI quedaron fuera de alcance por instrucción del operador;
> su pointer existente, `.claude/commands/implement-task.md` y el governor espejo enseñan el nuevo protocolo y
> el gate estricto verifica que sigan alcanzables. La rotación indexa shards mensuales con hash y aborta ante
> una edición concurrente del handoff.

## Sesión 2026-07-19 — Campaign Layout Compiler V1 implementado y validado

> Se convirtió Layout Design & Finishing en tooling reusable: `pnpm creative:layout` acepta un contrato
> `campaign-layout-compiler.v1` y opera `plan|compile|check` sin llamar a proveedores. Produce SVGs editables
> con capas reales, masters, manifests/hashes portables, contact sheet y QA; bloquea anchor/layout/finish
> pendientes y mantiene el release humano independiente. High Frequency se recompiló en `16:9`, `4:5` y
> `9:16` sin inferencia nueva: tests `2/2`, QA `3/3`, fidelity MAE `0,001096–0,001155` bajo `0,002`, contact sheet
> inspeccionado. Canon: `docs/architecture/GREENHOUSE_CAMPAIGN_LAYOUT_COMPILER_V1.md`; contrato de prueba:
> `ai-generations/2026-07-18_high-frequency-campaign-e2e/brief/layout-compiler-v1.yaml`. Los 84 binarios de la
> corrida (`148861636` bytes) están archivados en el bucket privado canónico y referenciados por
> `artifacts.remote.json`; Git conserva contratos, manifests, QA, scripts y SVG editables. No hay rollout,
> secrets, IAM, deploy ni media activation pendientes. La unidad queda cerrada en commit local, sin push.
>
> En la misma línea de **Efeonce Globe / Creative Studio** se consolidó un portfolio enterprise y un registry machine-readable de
> research. Google nativo queda directo GCP; Fal sólo no-Google exacto/allowlisted; OpenAI directo; finishing
> determinístico. Gemini Image se divide en Flash Lite/Flash/Pro; Imagen 4 está deprecado y el helper actual
> `src/lib/ai/image-generator.ts` conserva un P0 de migración que no se resolvió aquí porque el runtime del Studio
> debe nacer fuera de Greenhouse. Seedance 2.5 sigue bloqueado/no verificado. Todas las routes permanecen
> `research_verified`: no hay adapter, secrets, provisioning, bake-off/load test ni autorización de gasto.
> **Bootstrap ejecutado 2026-07-19:** existe el repositorio privado `efeoncepro/efeonce-globe` y el único proyecto
> GCP inicial `efeonce-globe` (billing + APIs base). El monorepo foundation compila y prueba domain contracts,
> provider boundary, artifact manifest, run gates, runner y media hash. No existen workloads, DB, buckets,
> service accounts de aplicación, secretos ni gasto de providers. Próximo paso: registrar las tasks en Globe y
> cerrar IaC/state + WIF + presupuesto antes de aprovisionar el primer vertical slice.

## Sesión 2026-07-18 — Campaña E2E “Alta frecuencia” (creative release completo)

> Se ejecutó y guardó el primer worked example durable de idea a campaña con la metáfora del
> colibrí: 3 territorios Seedream 5 Lite → selección `T02 Chromatic wake` → anchor Seedream 5 Pro →
> plates 4:5, 9:16 y 16:9 desde el mismo anchor con GPT Image 2 → composición determinista de
> 3 mensajes × 6 formatos. Resultado V3: 18 stills (digital, A2 y OOH), 2 heroes de 15 s,
> 2 masters Gemini Omni de 10 s y 2 bumpers de 6 s en 9:16/16:9, matriz/alt text, posters,
> contact sheets, manifests y ZIP. Los heroes extienden el clean shot ya aprobado con claims exactos,
> format wall y end card determinísticos; no hubo inferencia adicional.
> La primera composición fue rechazada por copy/safe zones; OOH perdió el support copy para lectura a
> distancia. El primer clip Omni de 3 s fue reclasificado correctamente como technical probe, no release.
> QA `18/18 + 6/6`, heroes medidos en `-16.3/-16.4 LUFS` y true peak `-2.0/-2.2 dBFS`, score
> visual `47.4/50`, costo release estimado `USD 2.9650`. El workflow reusable de single-shot a hero
> determinístico quedó espejado en la skill `motion-design-studio`; el QA mide loudness/peak en los seis
> MP4 y marca masters/bumpers para normalización por destino si se trafican. Seedance 2.0 queda sólo como
> fallback para toma/ángulo/continuidad física ausente, no como corrector de edición. Canon y reproducción:
> `ai-generations/2026-07-18_high-frequency-campaign-e2e/`. **Estado:** PASS para creative release;
> no hay activación de medios, spend, deploy ni cambio de secretos/IAM. Próximo gate real: campaña
> con human audio listen, normalización por destino, ICC/vendor spec, audience/offer/landing/UTM/conversión y una segunda ruta
> visual para medir performance/fatiga.

## Sesión 2026-07-18 — Secondary Tidal Teal (code-complete local, sin push)

> Por instrucción del operador se retiró el secondary verde/lime. Se compararon Atlantic,
> Tidal y Harbor; quedó **Tidal Teal** porque separa supporting action de success emerald sin
> invadir Core Blue/info. SoT: `axisRamp.secondary` `#DDF9F5→#083F3D`, anchor `500 #12AFA2`,
> opacity scale derivada; semantic light `{main:700 #0B726C, light:500, dark:800, white}` y dark
> `{main:400 #3BCBBD, light:300, dark:500, Midnight}`. Contrastes críticos: 5.77:1 y 7.25:1.
> `mergedTheme`, Colors/Buttons/Chips labs, chart secondary/nomenclature y Careers consumen tokens;
> no se hizo sweep ciego de lime histórico/semántico (success/campaign artifacts permanecen fuera
> del rol secondary). ADR nuevo supersede sólo la cláusula secondary de TASK-1053; Figma AXIS queda
> pendiente de reconciliación code→upstream.
>
> **Hardening adicional:** Colors Lab pasó de 142 `aria-label` inválidos + 53 contrast findings a
> axe limpio; `ui:code-lint` ahora permite HEX en las tres fuentes canónicas de color y tests de
> drift, no en consumers. GVC PASS: `design-system-colors` desktop/mobile (4 frames), baseline
> durable `scripts/frontend/baselines/design-system.colors/`, rerun 0.00%; `design-system-buttons`
> desktop/mobile PASS; `design-system-chips` desktop/mobile PASS. Tests: 40 color tests PASS;
> `ui:quality:test`, `ui:code-lint --changed`, ESLint focal, tsc 8GB, design lint, flags audit,
> qa gates, docs closure y ops lint limpios/advisory; production build final PASS después del
> ajuste a11y. Flag nuevo registrado:
> `NEXT_PUBLIC_GREENHOUSE_SECONDARY_TEAL_ENABLED` default-on; unset en Vercel sigue significando
> teal, `false` revierte a azure. **No push/deploy**: el runtime remoto cambia sólo en el próximo build.

## Sesión 2026-07-18 — Producción visual híbrida Seedream 5 ↔ GPT Image 2

> Se investigaron y probaron en paralelo ambos relevos reales para la campaña del colibrí. GPT →
> Seedream preservó estructura (`edge correlation 0.9212`) y elevó cromaticidad `12.1%`; Seedream
> → GPT produjo un banner `3:1` seleccionado `4.67/5` con `48%` de copy field limpio, después de
> documentar tres correcciones fallidas útiles. El método durable ya vive en `design-studio`
> módulo 12 y en la referencia Seedream/GPT de `greenhouse-ai-image-generator`, con contrato YAML
> de relevo, topología estrella, anchors, gates de lote y composición determinista. Se sincronizaron
> espejos Codex/Claude y docs de arquitectura/operación/funcional/manual. Outputs experimentales:
> `.captures/concepts/hummingbird-high-frequency/hybrid-flows/` (gitignored). Sin cambios de IAM,
> runtime, deploy o secretos; el intento GCS privado falló por Token Creator, se borró el objeto y
> el puente seguro quedó resuelto con upload temporal Fal CDN.

## Sesión 2026-07-18 — TASK-1430 refactor visual enterprise + puente Claude Design (commits locales; push bloqueado por WIP de Codex)

> Post-mortem del "wireframe look" (feedback del operador): la estructura era correcta pero la
> piel salió de TRANSCRIBIR el mock .dc.html a sx ad-hoc en vez de COMPONER el sistema —
> violando 4 anti-patrones ya documentados (radii multiplicadores off-scale, Box+borde en vez de
> Card canónico, spacing arbitrario, íconos fuera de escala) + ALL-CAPS técnicos. Refactor en
> loop GVC (4 iteraciones, frames mirados desktop+mobile): Card+CardHeader+CardContent con
> sombras del theme, customBorderRadius como px strings, kpiValue para métricas, GreenhouseChip
> para trust tags/resumen/estado del motor, affordances neutras, evidencia fail-closed en el
> preview (el CTA smoke 1431 con destino inválido ya no parece bug: se explica). Guardrails
> sistémicos: `docs/architecture/ui-platform/CLAUDE_DESIGN_TO_GREENHOUSE_BRIDGE.md` (tabla
> mock→tokens + checklist pre-JSX, indexada en ui-platform/README), overlay modern-ui v1.2 con
> el gate, quality.layout/runtime/enterpriseRubric declarados en ambos scenarios del cockpit.
> **Push pendiente**: el pre-push falla por WIP SIN COMMITEAR de la sesión paralela de Codex
> (scripts/ci/ui-*-gate.mjs nuevos con errores de parse a medio escribir — está construyendo
> gates de calidad UI; ver también su edición del overlay §0 "Premium delivery contract" +
> GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1). Coordinar: los dos esfuerzos son complementarios
> (bridge doc = traducción de mocks; lo de Codex = orquestación/score). Commits locales seguros:
> `b109ffc…` refactor + `docs` + fix scenarios. Nota: `.env.local` reparado
> (GOOGLE_APPLICATION_CREDENTIALS_JSON re-serializado; pg:doctor healthy de nuevo).

## Sesión 2026-07-18 — TASK-1430 Growth CTA cockpit CODE-COMPLETE (develop local, SIN push)

> `/implement-task 1430` ejecutada completa en `develop` local-first. **Shipped:** cockpit
> master-detail en `/growth/ctas` (CompositionShell `split` + prop nueva `splitTemplateColumns`),
> autoría gobernada de 8 pasos (metadata del registry TASK-1431, cero enum paralelo), preview
> harness del renderer canónico (scrubber density 560/400, claro/oscuro, hosts, matriz pairwise;
> degradación bloquea revisión), kill switches global/surface con reason auditado, y métricas de
> marketing server-side (`getCtaMarketingMetrics`: CTR/tasas con trust tags + guard
> `impressions_undercounted` — instrucción explícita del operador) wired a `CtaDetailVm.metrics`;
> `authorDraftCta` acepta `suppressionPolicy`. GETs admin + POST author des-gateados del engine
> flag (gobierna exposición pública, no gobernanza). Autoridad visual: proyecto Claude Design
> «Cockpit de CTAs» (el operador autorizó primitives/estética nuevas; contrato > mock donde
> divergen). SQL vivo verificado (gate TASK-893, `_sanity-cta-metrics-sql.ts`). GVC
> `task-1430-growth-cta-cockpit` (1440, 17 frames) + `-mobile` (390, 9 frames) mirados en loop.
> Docs: arch §28, funcional, manual, skill (ambos espejos), changelog. **Rollout: push ejecutado
> (`787f594ed`) + staging VERIFICADO** — deploy `dpl_CF21oKbss8x5…` READY, smoke API (list/detail
> con métricas reales y coverage guard live, kill-switch con audit, POST author 201 con
> `suppressionPolicy` round-trip en draft de smoke) y GVC staging 1440/390 OK. Producción llega
> con el próximo release train (la task queda `in-progress` como TASK-1431). Nota ambiente local:
> ADC gcloud vencida + `GOOGLE_APPLICATION_CREDENTIALS_JSON` corrupto en `.env.local` (línea
> multiline rompe dotenv de fe:capture) — pendiente `gcloud auth login` + ADC del operador.

## Sesión 2026-07-18 — EPIC-032 Notion Work Management Control Plane registrado

> Se creó el programa compacto `EPIC-032` con sólo cuatro tasks: `TASK-1449` (ADR, reconciliación de
> `TASK-880`/`TASK-577`, registry/fingerprint y Enhanced Markdown), `TASK-1450` (commands de delegación,
> subtasks recursivas y reparenting), `TASK-1451` (estado live, deadlines, progreso, resultados e historia
> observada) y `TASK-1452` (CLI, adopción Codex/Claude y rollout multi-space). No hay runtime implementado ni
> writes externos: todo queda `to-do`. Validación: las cuatro tasks `template=1 errors=0 warnings=0`,
> `pnpm epic:lint` y `pnpm ops:lint --changed` limpios. Siguiente ID: `TASK-1453`; siguiente ejecución
> recomendada: `TASK-1449` con goal/hook y ADR aceptado antes de construir el control plane.

## Sesión 2026-07-18 — notion-platform V1.1 enriquecida para work management

> Por pedido del operador se investigó en paralelo la gramática oficial de Enhanced Markdown, la skill local y
> los patrones de proyectos/tareas. Se versionaron espejos Codex/Claude con renderer/linter y templates para
> proyecto, tarea, subtarea recursiva, cierre y estado; registry multi-space; consultas live de vencimiento,
> progreso, resultado e historial observado. Se eliminó la falsa seguridad por prefijos de ID y se actualizó MCP
> para async/tool portability. Este cambio documenta el contrato para la futura CLI/API; todavía no implementa
> el runtime ni crea la EPIC/tasks de ejecución.

## Sesión 2026-07-18 — ISSUE-123: alias env-staging pinneado — causa raíz + tooling resiliente + des-pin

> Derivado del smoke de TASK-1431: el alias `greenhouse-eo-env-staging` servía código de la mañana
> (3ª recurrencia; Handoff registra fixes manuales `vercel alias set` el 07-17 y 07-18 AM — **ese
> fix manual ES la causa**: pinnea el alias fuera de la gestión automática). Shipped: resolver
> canónico del deployment staging READY vigente vía Vercel API en `vercel-staging-access.mjs`
> (staging-request lo usa por default; alias = fallback con warning), CLI `pnpm staging:url`,
> GVC con `STAGING_URL` + storageState por host, unit tests del picker (shape API real), ISSUE-123
> + delta §10 en `GREENHOUSE_STAGING_ACCESS_V1.md` con la regla **NUNCA `vercel alias set`**.
> Alias des-pinneado con `vercel alias rm` (autorización explícita del operador; el classifier
> bloquea mutaciones Vercel a agentes — 2 denials previos documentados). Pendiente de cierre:
> verificar re-atado automático del alias en los próximos 2 deploys staging (el push de esta misma
> sesión es el ciclo 1). Verificado E2E: `staging:request` sin override → auth + 200 contra el
> deployment vigente (`dpl_GoK4Tz…`).

## Sesión 2026-07-18 — TASK-1431 Growth CTA Action Registry (CODE COMPLETE, rollout pendiente)

> Code-complete local-first, sin push: registry server-only y navegación gobernada para
> `open_growth_form`, `link_url`, `open_think_tool` y `book_meeting`; renderer
> `1.2.0-preview.1` fail-closed, accesible y protegido contra open redirects. Evidencia: 122 tests
> focales + 9728 full suite, build/lint/tsc/gates UI verdes y GVC 1440/390 revisado. El contrato y
> la evidencia completa viven en `docs/tasks/in-progress/TASK-1431-growth-cta-action-registry.md`.
> **Rollout pendiente:** push/release, desplegar el bundle en hosts y ejecutar smoke staging de
> destinos reales antes de publicar acciones nuevas; ninguna CTA nueva fue publicada.

## Sesión 2026-07-18 — EPIC-031 Delta Daily/Flash/Weekly + Glitch Desk

> Corrección del operador incorporada: Daily y Flash son modos internos de discovery/staging y **nunca escriben WordPress**; sólo Weekly produce private draft programado. Una candidata Daily/Flash puede transformarse en una noticia única `glitchFlash` sólo por promoción `propose→confirm→execute` con actor humano; no consume número y tampoco autoriza publish público. Se agregaron `TASK-1448` (contract backend de promoción) y `TASK-1447` (Glitch Desk, queue+evidence inspector) con wireframe/flow/motion completos; `TASK-1444` queda bloqueada también por 1448 y `TASK-1446` por 1447. Siguiente ID `TASK-1449`.

## Sesión 2026-07-18 — EPIC-031 Glitch Agentic Editorial Pipeline registrado

> Discovery de `/Users/jreye/Documents/glitch-context/`, sitio público Glitch y calendarios Notion Q3/Q4 formalizado como programa ejecutable. Se creó ADR Proposed `GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md`, delta Proposed en PDR-003, `EPIC-031` y `TASK-1440`…`TASK-1446`. Decisión propuesta: Greenhouse controla estado/runs/evidencia; Notion es calendario/proyección; Content Factory es único write Gutenberg; autonomía termina en WordPress `private`; publish público sigue humano; `weeklyEdition` y `tacticalGlitch` son tipos distintos. `TASK-1441` protege la #16 como piloto controlado para el lunes 2026-07-20. Validación: cada task reporta `template=1 errors=0 warnings=0`; `pnpm ops:lint --changed` limpio. Siguiente: ejecutar `TASK-1440` con goal/hook, aceptar ADR/PDR y luego tomar el piloto #16.

## Sesión 2026-07-18 (cont. 3) — RELEASE A PRODUCCIÓN: TASK-1428 + TASK-1429 released + enforcement ON

> Orden del operador: "implementa 1429, enciende enforcement, paso a producción" — COMPLETO.
> **Release `d5db8b568849-a1ae09c1-f6a6-4c35-a427-4e92ca8ca517`** (target `d5db8b568`, PR #159
> release + PR #160 fix CI, orquestador run `29651461496`, 12m01s, manifest `released` 16:23Z,
> ambos gates `production` aprobados por el watcher sin stall). **Enforcement
> `GROWTH_CTA_SUPPRESSION_ENFORCEMENT_ENABLED` ON en staging Y Production**, verificado E2E en
> ambos (dismiss → exclusión por visitor; fresco ve; sin identidad = embedded eligible). Incidente
> real del release: el CI de `9f00a1715` murió SIN summary — diagnóstico: los steps Test (8 min) y
> Coverage (10 min) morían exactamente en start+timeout con la suite (~9.8k tests) verde; fix de
> raíz en #160 (14/17/25 min) validado en el mismo release. Watchdog: residual conocido
> `ops-worker` (gh=d5db8b56 vs run=c9f3041b4 de develop; diff rutas runtime VACÍO + Ready=True →
> label, sin redeploy — gotcha #4). **TASK-1428 y TASK-1429 → complete/** (README/registry/ledger/
> timing ledger sincronizados). Queda: ventana monitor 7d `growth.cta.*` (comparte 2026-07-25 con
> TASK-1427) y la primera campaña `slide_in` real (decisión de negocio: surface/copy/trigger).
