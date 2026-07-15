## Estado vigente para agentes

- **Kinsta SSH/WP-CLI con preflight durable (2026-07-15):** antes de cualquier operación SSH/WP-CLI del sitio
  público ejecutar `pnpm public-website:ssh-check`. Kinsta API y SSH son carriles independientes: la ausencia de
  `PUBLIC_WEBSITE_KINSTA_API_TOKEN_SECRET_REF` no demuestra que SSH esté caído. La configuración local estable
  vive en `.env.public-website.local` (gitignored, prioridad sobre `.env.local` para resistir `vercel env pull`),
  mientras la llave permanece en `~/.ssh/`. `public-website:runtime-status.v2` reporta ambos carriles por separado.
  Canon: `docs/architecture/agent-invariants/PUBLIC_SITE_KINSTA_ACCESS_AGENT_INVARIANTS.md` + skill
  `efeonce-public-site-wordpress` sincronizada en Codex/Claude.
- **Roadmap cockpit runtime OFF (2026-07-15):** por bajo uso y warning/performance recurrente de Turbopack, `/roadmap`
  salio del menu y del runtime del portal. `GET /api/roadmap/work-items*` conserva auth/capability pero responde
  `410 roadmap_disabled`; `next.config.ts` ya no bundlea `docs/{epics,tasks,mini-tasks,issues}/**/*.md` con
  `outputFileTracingIncludes`. El Markdown sigue siendo SSOT para agentes; el codigo Roadmap queda como referencia
  historica fuera del grafo vivo. Reactivar requiere una proyeccion externa/materializada/local-first, no volver a
  leer `docs/**` desde Next runtime.
- **Creative Workflows Knowledge-to-Product Ladder (2026-07-15):** el territorio editorial puede madurar por
  la secuencia `Pillar -> satelites -> ebook/workbook -> tool diagnostica -> Creative Studio`, con un trabajo y
  gate distinto por capa. Canon: `docs/public-site/CREATIVE_WORKFLOWS_KNOWLEDGE_TO_PRODUCT_LADDER_V1.md`.
  Los articulos crean lenguaje, evidencia y autoridad; el ebook agrega metodo y ejercicios; una eventual
  `Creative Workflow Opportunity Mapper` priorizaria que proceso abordar y que debe seguir humano, pero requiere
  PDR/modelo/privacidad/evals/analytics/task propios. Creative Studio conserva evidencia de producto separada y
  sigue autorizado solo por RESEARCH-009 -> arquitectura -> EPIC-028 en su repositorio.
- **Blogpost agentic end to end canonizado (2026-07-15):** el primer ciclo completo, Creative Workflows post `251363`, queda separado en [retrospectiva del caso](docs/public-site/CREATIVE_WORKFLOWS_AGENTIC_END_TO_END_RETROSPECTIVE_V1.md) y [runbook reusable](docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md). Regla central: Content Factory ensambla/valida y `run --send` termina en `private`; una transicion agentic a `publish` es otra operacion y exige autorizacion humana explicita, snapshot, rollback fail-closed y QA live anonima/autenticada. Skills dueñas: `efeonce-public-site-wordpress` (runtime/publicacion), `seo-aeo` (intent/E-E-A-T/schema), `copywriting` (autor/voz) y `content-marketing-studio` (sistema visual); `AGENTS.md`/`CLAUDE.md`, manual, docs funcionales, PDR-014 e indices enrutan al canon. Los scripts temporales del caso no son una capability durable ni deben copiarse con credenciales.
- **Creative Workflows es soporte científico/editorial, NO implementación operativa (2026-07-15):** [PDR-014](docs/public-site/decisions/PDR-014-creative-workflows-territorio-editorial-pillar-cluster.md) fija una Pillar educativa y 12 satélites bajo la tesis **“un sistema de decisiones creativas humanas vuelto ejecutable”**. El [brief maestro](docs/public-site/CREATIVE_WORKFLOWS_PILLAR_CLUSTER_BRIEF_V1.md) prepara contenido, fuentes, preguntas y distribución para sostener Creative Studio futuro; sus secciones, diagramas, checklists o templates conceptuales **no son product specs, workflows ejecutables ni child tasks**. La implementación sólo puede nacer después desde RESEARCH-009 + arquitectura vigente + EPIC-028 y tasks formales en el repositorio de Creative Studio. Estado editorial: V4 está **publicada** en `https://efeoncepro.com/creative/creative-workflows/` (`post 251363`, autor `1`, categoría `Creative`, 111 bloques, tres imágenes y featured/OG `251370`); suma fuentes primarias inline, caso SKY medido, límites y disclosure integrados en prosa, `99` énfasis semánticos y la firma visible `Vamos con manzanitas 🍏🍏🍏:`. Content Factory, entidad Yoast `Person`, canonical, SEO `index, follow`, Open Graph, 34 enlaces HTTP únicos y render live desktop/mobile pasaron; Think no tiene URL duplicada. Evidencia: `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_EEAT_AUDIT_V4.md`.
- **Copywriting separa voz Julio de voz Efeonce (2026-07-15):** la skill espejo `.codex/.claude/skills/copywriting` resuelve primero `author + surface + speaker`. Piezas firmadas o habladas por Julio, Marketing con Manzanitas y thought leadership personal cargan `efeonce/JULIO_REYES_VOICE_SYSTEM.md`; landings, producto, UI, propuestas, políticas, emails del sistema y artículos institucionales cargan `EFEONCE_VOICE_SYSTEM.md`. En híbridos, Julio narra y la doctrina se atribuye como `En Efeonce...`. `con manzanitas` / `te lo explico con manitas` son running motifs personales: no se prestan a Efeonce institucional ni a otros autores. Cuando el motivo se activa en copy visible, lleva exactamente `🍏🍏🍏` antes de la puntuación; menciones documentales no lo activan.
- **Radiografía AEO — muestra de trabajo viva (2026-07-14):** `think.efeoncepro.com/muestras/<slug>-<token>` es una **capacidad**, no un anexo de la licitación de SKY: hace **educación** de cliente/prospecto (enseña qué significa "aparecer en ChatGPT" sin una lámina de teoría, y sirve **sin venta en curso**) **y habilitación de ventas** (enlace + lámina de deck + demo en vivo + prueba que el comité verifica solo). **Runtime en el repo satélite `efeonce-think`, NO en `greenhouse-eo`**; el cliente es un **payload JSON** (`src/content/aeo-xray/`), cero código — un `if (cliente === 'x')` en un componente rompe la frontera del motor. Gate propio: `pnpm build && pnpm verify:aeo-xray` (**46 asserts**) + `pnpm read:aeo-xray` **obligatorio antes de tocar el texto** (la coherencia no es estructural y la prosa vive en 3 capas). Canon: `docs/think/radiografia-aeo-architecture.md` (invariantes vigentes) + `radiografia-aeo-manual.md` + `docs/documentation/comercial/radiografia-aeo-muestra-de-trabajo.md`. Primer caso: SKY (Wherex 2026); existe fixture no publicada de segundo cliente para probar motor/gate sin IDs de SKY, pero falta un segundo payload comercial real para comprobar operación end-to-end.
- **Hiring Activation production ON (2026-07-14):** `HIRING_HANDOFF_BRIDGES_ENABLED` + `HIRING_ACTIVATION_ENABLED` están ON en Vercel Production con valor exacto `"true"` y deployment `dpl_Grm71rLhwyyURq9ar7jf87i7DGzF` Ready en `https://greenhouse.efeoncepro.com`; smoke autenticado `GET /api/hr/hiring-activation?limit=5` -> `200 { enabled:true, items:[] }` y command no-mutante inexistente -> `404 hiring_activation_not_found`, no disabled. `HIRING_HANDOFF_BRIDGES_ENABLED=true` también está en Cloud Run `ops-worker-00488-fvl` y declarado en `services/ops-worker/deploy.sh` para persistir redeploys. El frente abierto de EPIC-011 es fairness/legal/privacy, no activation.
- **Experiencia Efeonce / primer wrapper cliente — SKY primer año live (2026-07-13):** `https://experiencia.efeoncepro.com` ya materializa el primer **Efeonce Wrapper** para un cliente: una experiencia anual creada para SKY por su primer año con Efeonce. Repo satélite `efeoncepro/sky-efeonce` (`/Users/jreye/Documents/sky-efeonce`), Astro estático en Vercel, video self-hosted en GCS como HLS adaptativo + MP4 fallback. Esto valida manualmente la dirección de `"Tu año con Efeonce"` como artefacto de renovación/memoria, pero no significa que Greenhouse ya lo genere automáticamente ni autoriza usar SKY como caso público sin permiso escrito. Canon satélite: `sky-efeonce/Handoff.md`, `sky-efeonce/docs/experiencia/`, `sky-efeonce/docs/video-hosting.md`; canon Greenhouse: `docs/context/10_experiencia-cliente.md`.
- **TASK-1373 Careers Apply Native Growth Form production live (2026-07-14):** `/public/careers/[publicId]/apply` consume el Growth Form publicado `efeonce-careers-application` (`form_key=9f7a8fc0-6fa7-4670-8e2d-efe0ce354001`, version 2, `styleVariant=careers-html-fidelity`, surface `public-careers-nextjs`) vía `<greenhouse-form>`, con el custom `CareersApplyClient` preservado como rollback por `CAREERS_NATIVE_GROWTH_FORM_ENABLED`. Production ON por release `a3b5ea3adb30` + hotfixes visuales `baac9c394560` y `f7bb199ed537`; Vercel Production `dpl_CcYdEgiT9f7JyQm8PSycfCPSDnPV` Ready en `https://greenhouse.efeoncepro.com`. Evidencia productiva: API contract `careers-html-fidelity` + `cvFile`, submit sin CAPTCHA fail-closed `403 captcha_failed/missing_token`, Playwright desktop/mobile sin overflow con paleta/progreso/uploader del HTML original. Staging histórico: `greenhouse-ldqkedyia` (`dpl_3hdhDYu6VxvadTHbXXH595gstjKj`) y GVC `.captures/2026-07-13T22-07-38_task354-careers-runtime-audit`. El helper GVC limita `x-vercel-protection-bypass` al origin capturado para no contaminar Sentry.
- **TASK-1372 Growth Forms application upload + ATS projection staging live (2026-07-13):** Growth Forms ya puede ser source of truth backend para formularios `application` con CV/archivo privado. Contrato/render submit soporta `type='file'`, `dataClass='uploaded_file'`, `uploadPolicy` `scan_required`, iconos de campo y multipart sólo cuando hay archivos; el JSON browser no lleva `File`, filename, private URL, mapping de destino ni IDs internos. El submit público crea asset privado `hiring_application_cv_draft`, corre `scanAndGateUploadedAsset` con los bytes y persiste sólo descriptor seguro. El ATS se crea por projection reactiva `growth_hiring_application_from_submission` sobre `growth.forms.submission_accepted`, llamando `submitPublicHiringApplication`; **no existe `form_destination` interno** para application forms. Rollout `develop`/staging SHA `25c7e246cbf059847639b5f82ac5c431192685f8`: Vercel `Ready`, Ops Worker revision `ops-worker-00486-n96`, CI/Playwright/workers verdes. Smoke target multipart PASS: submission `fsub-324c40a5-3ab3-4c7a-be1e-871b76c9398e` -> application `happ-072a61fc-dfda-4278-8955-af12dbb35b42`, asset privado `asset-74e85693-916f-4dd4-8a5e-86d934d05cd8`, scan `clean`, destinations `0`; submit sin token falla cerrado `403 captcha_failed`. Producción no fue tocada.
- **TASK-1363 Assessment Taking + Review Surface complete local (2026-07-13):** candidato rinde en
  `/assessment/[token]` (+ compat `/public/assessment/[token]`) con timer/accommodations, autosave,
  submit fail-closed y payload público allowlisted; operador revisa en Application 360 con scorecard
  advisory, barras/radar, cola y drawer de corrección anti-anclaje. Modelo operativo: la plantilla de
  assessment es reusable por rol/vacante, pero la ejecución real se asigna a cada `hiring_application`
  y crea una instancia `hiring_assessment` con token/estado/respuestas propias; no existe un test
  "rendido por la vacante". Manual/functional doc/skills Codex+Claude quedaron sincronizados con el
  flujo: asignar template → copiar token una vez → candidato rinde → humano corrige → decisión →
  handoff → Hiring Activation Lane. Evidencia local vigente: GVC candidate
  `.captures/2026-07-13T16-09-34_task1363-assessment-taking-runtime`, GVC operator
  `.captures/2026-07-13T14-44-04_task1363-assessment-review-runtime`, lint/typecheck/build/Vitest
  focales verdes; staging/prod quedan pendientes de push/deploy.
- **TASK-1368 Hiring Activation Lane complete + master flow N10→N11 cableado (2026-07-13):** `/hr/onboarding?lane=hiring-activation`
  es la lane "Contrataciones listas" dentro de `HR > Onboarding & Offboarding`, no reemplaza
  `/hr/workforce/activation`. Application 360 ahora es el seam correcto de EPIC-011: decisión
  `selected` + `internal_hire` muestra el handoff real, puede aprobarlo con `hiring.handoff.approve`
  y abre `/hr/onboarding?lane=hiring-activation&applicationId=...&handoffId=...`. La lane selecciona
  el caso por `handoffId`/`applicationId` o muestra "todavía no está en la cola"; no cae a un caso
  random. Consume TASK-770 + resolver real TASK-1400 (`resolve-blocker`), con microinteracciones de
  alta fidelidad al HTML fuente. Evidencia local: GVC `.captures/2026-07-13T11-35-04_hiring-activation-lane`,
  Application 360 bridge `.captures/2026-07-13T11-38-59_inline-agency-hiring-applications-happ-ab583c21-13a5-4f21-af41-814528ee4452`,
  deep link N11 `.captures/2026-07-13T11-39-22_inline-hr-onboarding-lane-hiring-activation-applicationid-happ-ab583c21-13a5-4f21-af41-814528ee4452-handoffid-hhof-949edeaf-b1f1-46c0-a016-e76c9b40baf6`.
  Staging post-push verificado sobre `f09fd7039`: deploy Vercel `Ready`, flags ON, API autenticada
  `GET /api/hr/hiring-activation?limit=5` → `200 enabled:true`, y GVC staging PASS en
  `.captures/2026-07-13T12-08-35_inline-hr-onboarding-lane-hiring-activation`. Task movida a
  `complete/`.
- **Tender Deck Composer — `TimelineFull` v0.2: schedule y labels data-driven (2026-07-12):** el
  cronograma ya acepta `timeUnit` (`day|week|month|quarter|custom`), un eje discreto de 3..8 unidades,
  rangos enteros y hitos de frontera; su compiler deriva grilla, barras, diamantes y conectores de ese único
  input. `phases[].barLabel` es copy editable para barra sólida o punteada, incluso de una unidad, y el
  renderer lo mide contra la geometría real: si se recorta, aborta (no lo borra ni lo trunca). SKY conserva
  las tres etiquetas de sus barras. Canon: `GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` → `TimelineFull`,
  invariantes de Commercial/Tenders y las skills espejo `.codex/.claude/skills/deck-studio/`.
- **Tender Deck Composer — destinos editables aceptados, no implementados (2026-07-12):** PDF sigue
  contractual; los dos siguientes destinos son `pptx-native` (primero, renderer de objetos PowerPoint)
  y `adobe-express-rest` (después, API server-to-server sobre templates Express etiquetados). No hay
  Add-on en el flujo de producto. El manifest sigue fuente de verdad; ni PDF importado, HTML convertido
  ni documento externo editado reemplazan slots. Express REST cubre matriz fija de tags
  texto/imagen/video, no Gantt variable; beta/evaluation-only bloquea producción. Canon: ADR del
  Composer; `TASK-1395`/`TASK-1396` siguen a TASK-1393/TASK-1391.
- **Tender Proposal Studio + Artifact Renderer — runtime actual (2026-07-12):** `TASK-1394`, `TASK-1393`, `TASK-1392` y `TASK-1391` están complete. `Proposal` tiene aggregate DB/API/capabilities/evidencia allowlisted y el Composer domain-free produce `ResolvedCompositionManifest` inmutable. El `artifact-worker` de staging (2 vCPU/2 GiB) verificó el E2E remoto: SKY 15 láminas en 25,2 s / 3,16 MB y bench 25 láminas en 32,3 s / 5,56 MB, ambos al primer intento, con asset privado y outbox published; staging está ON en Vercel, dispatcher y Job. Capacidad inicial mantiene 10–15 jobs/h como envelope operativo conservador y 30 jobs/h como techo del dispatcher; no es SLO ni prueba de concurrencia sostenida. Production continúa OFF y exige release control plane + sign-off. `social-carousel` requiere su propio command y benchmark; no es consumer aún. El LLM no muta estado, assets, evidencia ni gates. Canon: `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`, `GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md`, companion `greenhouse-public-private-tenders/proposal-studio-runtime.md` y tasks `1394 → 1393 → 1392 → 1391`.
- **Efeonce Creative Studio — operating model aprobado como dirección (2026-07-14):** la capability de imagen/video/audio/3D nace como runtime hermano, primero interno. La experiencia humana es creative-native (brief, referencias, tratamientos, candidatos, review) y compila workflows por debajo; UI, MCP y agentes consumen la misma capa command/reader. Un solo run soporta `efeonce-managed`, `co-operated` y `client-operated` con operador/aprobadores/owners explícitos, autonomía según incertidumbre/riesgo y escalamiento sin perder brief, assets, lineage, review o ledger. Los modos no son una quinta modalidad comercial ni acceso cliente habilitado. `propose → reserve → approve → execute`, cloud/worker separados, derechos y credit ledger append-only siguen vigentes; pagos, uploads externos, publicación y rollout cliente permanecen gateados por EPIC-028. Canon: `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_{DECISION,ARCHITECTURE}_V1.md`; programa: `docs/epics/to-do/EPIC-028-efeonce-creative-studio-agentic-platform.md`.
- **Creative Workflow / Glitch — sin candidata; generación y reconstrucción 3D cerradas (2026-07-11):** T–Z no produjeron dos contactos de 1–2 frames con continuidad. Un blocking 3D posterior controló los frames 15/28, pero el operador rechazó la ruta porque la reconstrucción se veía rudimentaria frente al key visual; no continuar lookdev ni pasarlo a otro modelo. No hay retime, recomposición, audio final, publicación ni bundle. Gasto estimado T–Z: US$10.44 + tokens Seedance. Blender 5.1.2 permanece instalado fuera del repo. Evidencia privada: 106 archivos, 142160554 bytes, vía `artifacts.remote.json`. Si se reabre, la única ruta fundada es captura práctica integral; el audio sigue siendo exactamente dos respuestas `micrófono → preamp → corneta/monitor`. Canon: `ai-generations/2026-07-11_glitch-microphone-intro/review/takes-u-to-z-guided-recovery-review.md` y `review/v3-blocking-review.md`.
- **Creative Workflow / selección de motor basada en evidencia (2026-07-11):** no clasificar por “RRSS” o “landing”. La landing Redes Sociales validó `gpt-image-2` → set de ocho stills ficticios → Gemini Omni image-to-video de seis microescenas, porque las imágenes eran una ancla de lenguaje visual y no contenían copy/practical exacto. Glitch revela el otro contrato: cuando el key visual es identidad de set/producto/practical y la acción física es hero, partir por Seedance/reference-video y auditar fidelidad, actuación y foley por separado; S preservó diseño, pero no aprobó el gesto. Regla/ejemplos: `.codex/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md`; ADR existente de orquestación: `docs/architecture/GREENHOUSE_CREATIVE_FLOW_STUDIO_DECISION_V1.md` (registry de providers/modelos versionado, sin cambio de plataforma aceptado).
- **Creative Workflow / previs 3D → Seedance (investigación externa, 2026-07-12):** Seedance 2.0 documenta referencias de video + imagen + audio + texto; una previs de Blender/Unreal/C4D entra como video exportado, nunca como `.blend`, y sólo funciona si el adapter expone reference-to-video multimodal. No hay fixture interno validado, no cambia runtime/ADR y no revierte el veto del blocking 3D Glitch. Canon funcional: `docs/documentation/ai-tooling/previs-3d-y-referencias-seedance.md`.
- **Creative Operations / agents (research activo, 2026-07-14):** `RESEARCH-009` formaliza dos velocidades, builder/runner como autoridades creativas, workflow compilado desde `preservar → explorar → evitar → entregar`, tres modos operativos, autonomía progresiva, flywheel producto-servicio y métricas que no confunden throughput con creatividad. Informa EPIC-028; no crea runtime ni habilita cliente y preserva autoridad humana sobre criterio, gasto, derechos, delivery y publicación. Canon: `docs/research/RESEARCH-009-creative-operations-agentic-workflows.md`.
- **EPIC-027 — desacople físico aceptado por trigger económico (`in-progress`, 2026-07-10):** evidencia del operador cambia la decisión: Elastic pasó aproximadamente USD 20→530; Standard llegó a 45 min o no completó; Elastic sigue en USD 250 aun con local-first. TASK-1379 conserva su no-go específico para materializar Roadmap, pero ya no justifica detener la descomposición. Primer corte: TASK-1382 extrae un piloto pure-UI de las 55 páginas Design System Labs, sin mover DB/API/transacciones ni mutar Vercel/producción todavía. Canon: `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` + `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_ARCHITECTURE_V1.md`.
- **TASK-1381 — low-memory local queda explícito, no adaptativo (`keep-explicit-only`, 2026-07-10):** existe `pnpm build:low-memory` como escape hatch local de 1 CPU, delegando al mismo prebuild/runner y fallando cerrado en CI/Vercel. La cohorte alternada n=5 no validó auto-selección: tree RSS p50 +0,2% y p95 -6,8% vs 2 CPUs (target -15%), con tiempo p50 +4,5%. No existe `build:local`; `pnpm build`, `build:fast`, next.config y remotos siguen intactos. Canon: `docs/audits/platform/2026-07-10-adaptive-local-low-memory-build.md`.
- **TASK-1380 — RSS atribuido a concurrencia de compile/typecheck (`proceed`, 2026-07-10):** profiler local sanitizado root+árbol/fases demuestra que static generation no domina el peak. En cohorte n=3, `NEXT_BUILD_CPUS=1` redujo tree RSS p50 17,1% frente a `cpus=2` (6,58 vs 7,94 GB) con +9,5% de tiempo (106,1 vs 96,9 s); `cpus=4` fue retorno negativo. No se cambió default/runtime/CI/Vercel por alta dispersión y n bajo. Siguiente propuesta no registrada: TASK-1381 para un modo local low-memory/adaptativo con n≥5 y rollback. Canon: `docs/audits/platform/2026-07-10-build-rss-attribution-concurrency.md`.
- **EPIC-026 / TASK-1379 — experimento Roadmap permanece `no-go` histórico (2026-07-10):** eliminó 2.493 Markdown de traces y mejoró clean p50, pero warm RSS p95 subió 9,8% (7,51→8,25 GB); el cutover fue revertido. Su ADR está `Superseded` por la nueva evidencia económica/EPIC-027; no reutilizarlo como prohibición general del desacople.
- **TASK-355 Hiring Desk complete en repo/dev (2026-07-10):** rutas internas `/agency/hiring`, `/pipeline`, `/applications/[id]` y `/publication` materializan Demand, Kanban, Application 360 y governance de publicación sobre el dominio real `src/lib/hiring/**`. Shell canónica `CompositionShell`; cards adaptativas; drag + menú de teclado + rollback; assessment review consume TASK-1360/1361 con confirmación humana; decisión gobernada `POST /api/hiring/applications/[id]/decide` exige capability `hiring.application.decide:execute`, idempotencia y reason, conserva `decisionHistory[]` append-only y emite `hiring.application.decided` transaccional. Views vigentes: `gestion.hiring*` (no el namespace stale `agency.hiring.*`), migración aplicada en Cloud SQL dev y reachability verde. Alta fidelidad al HTML Claude Design aprobado aplica sólo al canvas interno de Hiring Desk; el chrome global Greenhouse no se reemplaza. PII se mantiene masked; reveal real sigue en TASK-1362. GVC PASS 1440/390 para las cuatro superficies + drawer/error/rollback + pulidos finales de Demand/Pipeline/tabs. Commit local `25c37dcd0`; release staging/production pendiente como paso separado.
- **Public Site Demo 35 blog layout candidate (2026-07-09):** el operador eligio
  `Demo 35: Blog Magazine` (`page_id=225984`, `/homedemo35-elementor/`) como
  base visual para la futura pagina principal del blog/content hub. Es una
  pagina Elementor/Ohio publicada, no `page_for_posts`: 55 containers, 58
  widgets, 15 `ohio_recent_posts`, hero + rails `75/25` + banners + features
  full-bleed + suscripcion. Auditoria read-only:
  `docs/audits/public-site/2026-07-09-demo35-blog-magazine-layout-review.md`.
  No usarla como hub final sin limpiar posts demo/attachments, CTAs `#`, links
  externos Ohio, rutas `/demo35/category/...` 404 y suscripcion CF7 sin HubSpot.
- **Public Site content hub/blog/search audit canon (2026-07-09):** el blog vivo de
  `efeoncepro.com` sigue en WordPress nativo (`post` + Gutenberg) con Ohio parent
  renderizando archivos/busqueda/singles. No hay `page_for_posts`; los permalinks
  usan `/%category%/%postname%/`, por lo que retaxonomizar posts publicados exige
  plan de URL/canonical/redirect. Search nativo mezcla posts, paginas, attachments,
  Elementor landings y portfolio, con Yoast `noindex, follow`; para refresh del
  content hub se debe planificar busqueda editorial `post` only, taxonomia canonica
  y limpieza de demo posts/tags/sidebar. SSOT:
  `docs/documentation/public-site/wordpress-blog-content-hub-search.md`; auditoria:
  `docs/audits/public-site/2026-07-09-wordpress-blog-content-hub-search.md`.
- **Release/careers operating learning (2026-07-09):** antes de cualquier paso a produccion, los agentes deben cargar `greenhouse-production-release` y releer runbook/playbook; no redescubrir approvals, workers lentos, Azure `no_infra_diff`, `ops-worker` change-gated ni `transition-released` queued como incidentes nuevos. Si el unico drift es `ops-worker`, validar diff runtime entre Cloud Run `GIT_SHA` y `target_sha`; si esta vacio y `Ready=True`, documentar residual de label y no redeployar solo por etiqueta. Vacantes publicas reales se crean por writers de Hiring (`createTalentDemand` -> `createHiringOpening` -> `updateHiringOpening` -> `publishOpening`) y se cierran registrando public IDs/URLs. **Publicar una nueva vacante NO requiere release** si careers/apply ya estan live y flags/Turnstile estan configurados; release solo para cambios de codigo/schema/flags/infra/renderer/contrato apply o cutover inicial. Banco de Talento solo puede ser decorativo si no captura datos; si captura leads, debe ser Growth Form/Hiring command gobernado.
- **Public Site footer Careers-only (2026-07-09):** el footer global de `efeoncepro.com` ya expone Careers como unico camino de postulacion desde el bloque `Unete a nuestro equipo`: `Ver vacantes y postular` -> `https://greenhouse.efeoncepro.com/public/careers`. No reintroducir `people@efeoncepro.com` en el footer publico salvo decision explicita del operador. Source of truth visible: Ohio child theme + sidebars/widgets (`ohio-sidebar-footer-3`, `widget_block[31]`), no `eoh_site_settings_footer_*`. Canon/evidencia/rollback: `docs/audits/public-site/2026-07-09-footer-careers-entry-readiness.md`; skill refs Codex/Claude `efeonce-public-site-wordpress/references/runtime-and-discovery.md`.
- **TASK-1371 complete y release productivo (2026-07-09; cierre documental 2026-07-13):** `docs/tasks/complete/TASK-1371-hiring-vacancy-publication-operator-command.md` documenta el operador backend-data `publishHiringVacancyFromBrief` (`dryRun|execute|publish`) sobre writers de Hiring, con campos publicos estructurados (`public_work_mode`, region/ubicacion, `public_area`, `public_skill_tags`, compensation band opcional), publish guards, idempotencia/audit via API Platform command ledger, CLI `pnpm hiring:publish-vacancy` y endpoint interno `POST /api/hiring/vacancy-publications`. Migraciones `20260709182000000` y `20260709183000000` aplicadas en Cloud SQL dev; smoke `publish` reutilizo `EO-OPN-0009` por `publication_source_ref` (`outcome=duplicate`) sin crear demand/opening nuevos; URL publica 200. El release PR #152 (`fa2581eaf5367f2c25b6fb5bd5b14add3335253c`) supersede la nota vieja de rollout pendiente. Regla operativa: cero release, cero SQL manual y cero UI-only flow por vacante nueva si el runtime live ya tiene el operador.
- **Production release timing ledger obligatorio (2026-07-09):** todo agente que ejecute, recupere o cierre un pase a produccion debe iniciar cronometro en su primera accion de release, incluyendo revisar/analizar/preparar, y actualizar `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md` antes de declarar cierre. KPI principal: **tiempo agente end-to-end** para evaluar eficiencia por agente. Campos obligatorios: agente, fecha, release ID, GitHub Actions run ID, target SHA, fases, workflow elapsed, manifest elapsed, runtime-green elapsed, bloqueo principal y aprendizaje. Si no hubo cronometro formal, registrar `no medido formalmente` + estimacion del operador si existe; no confundir manifest elapsed con tiempo real del agente.
- **Nexa Voice System V1 (2026-07-09):** Nexa ya tiene sistema verbal propietario, no solo voz base. Canon: `docs/architecture/nexa-intelligence/voice/nexa-voice-system-v1.md`. Tesis: **criterio tranquilo en movimiento**. Modelo verbal: **Aclara, Acompaña, Advierte, Activa**. Define relacion Efeonce/Greenhouse/Nexa, modos conversacionales, fraseologia propia, frases prohibidas, limite de humanidad, voz por estado, relacion con visual branding y QA de voz. `voice-tone-style-personality.md` queda como resumen del contrato ya parcialmente encodado en `voiceContract`; aplicar Nexa Voice V1 literalmente al chat runtime requiere cambio clase `voice`, bump de `NEXA_SYSTEM_PROMPT_V2_VERSION`, snapshot y QA. Skills `greenhouse-nexa-conversational` Codex/Claude sincronizadas.
- **Nexa Identity Canon V1 — rostro + branding propio (2026-07-09):** Nexa queda canonizada como alguien más del equipo Efeonce, no chatbot/asistente genérico: tiene nombre, personalidad, origen, rostro y sistema visual. SSOT: `docs/architecture/nexa-intelligence/voice/nexa-identity-canon.md`. Rostro/persona: `NexaFace` -> `public/images/avatar-nexa/nexa-face.webp`; assets de avatar: `public/images/avatar-nexa/nexa-avatar.png` y legacy `public/images/greenhouse/nexa/nexa-avatar.png`. Branding: `GreenhouseNexaBrandMark` + `public/images/nexa-mark/*`; unidad mínima arco + sparkle, nunca `tabler-sparkles` suelto para invocarla. Conversación: `NexaSenderMark` por-mensaje y `NexaPresenceMark` para online/pensando. Interacción: `NexaGlowBorder`, `GreenhouseShinyBorder palette='nexa'` y spectrum Nexa para prompts/CTAs gobernados. Skills `greenhouse-nexa-conversational` Codex/Claude sincronizadas.
- **Brand Voice v1.1 — Experiencia Efeonce (2026-07-09):** `docs/context/05_voz-tono-estilo.md` ahora suma la 8ª creencia narrativa: **el cliente no contrata entregables; entra a un ecosistema que lo vuelve más capaz**. La voz incorpora el rasgo `educador exigente / anfitrión de crecimiento`, un tono específico para thought leadership/aprendizaje/comunidad y una regla anti-humo: no usar "experiencia 360", "ecosistema integral", "comunidad exclusiva", "aprendizaje transformador" o "partner estratégico" sin mecanismo concreto (login, tool, sesión, benchmark, contenido, dato, historial, red, playbook o ritual). Skills `efeonce-agency` Codex/Claude sincronizadas.
- **Experiencia Efeonce (2026-07-09):** el cliente no solo entra a una agencia; compra su entrada a un ecosistema de crecimiento con operación, software, aprendizaje, networking, contenido/tools y memoria. Canon: `docs/context/10_experiencia-cliente.md`. Greenhouse es el command center que vuelve esa experiencia visible, medible y acumulable; no sustituye Think, blog `efeoncepro.com/blog`, YouTube, sociales, ebooks, webinars ni futuro podcast. Skills `efeonce-agency` Codex/Claude sincronizadas; PDR-003 actualiza el layering para ubicar adquisición (Think/blog/tools/media) y experiencia cliente (aprendizaje/comunidad alrededor del servicio).
- **Efeonce Operating Code V1 (2026-07-09):** el Why queda bajado a cultura operativa interna. Canon: `docs/operations/EFEONCE_OPERATING_CODE_V1.md`; guia People/Talent: `docs/documentation/hr/efeonce-operating-code-hiring-onboarding-performance.md`. Regla cultural: **en Efeonce se valora a quien deja al cliente mas capaz, deja el sistema con mas memoria y conecta su trabajo con crecimiento real**. Aplica a hiring, onboarding, performance reviews, rituales de proyecto y delivery. Skills sincronizadas: `efeonce-agency` y `greenhouse-talent-people-operator` Codex/Claude; templates de `job-brief` y `scorecard` ahora evaluan Operating Code con evidencia job-related, no "culture fit" vago.
- **Efeonce positioning — Growth Operating System global-ready (PDR-012, 2026-07-09):** el Why canónico sigue siendo `No te entregamos crecimiento. Lo construimos contigo —y te dejamos más capaz de sostenerlo`, pero queda reforzado como diferenciador de mercado: Efeonce es **LATAM-first, no LATAM-limited**. La categoría defendible para sitio público/GTM es **Growth Operating System / ASaaS**, no "agencia integral", "AI agency" ni proveedor de servicios sueltos. El diferencial no es "co-creación" como claim: es co-creación convertida en software, método, datos y memoria acumulada (Greenhouse/Kortex/Verk + Loop/ICO + Revenue Enabled + historial). SSOT del Why: `docs/context/09_marca-agencia.md`; decisión pública: `docs/public-site/decisions/PDR-012-growth-operating-system-global-positioning.md`; skills Codex/Claude `efeonce-agency` sincronizadas.
- **Vercel/GitHub docs-only skip vigente (2026-07-08):** `vercel.json` usa `ignoreCommand: node scripts/ci/vercel-ignore-build.mjs` para cancelar builds Vercel de `develop`/staging previews cuando el diff entre `VERCEL_GIT_PREVIOUS_SHA` y `VERCEL_GIT_COMMIT_SHA` es sólo documentación segura o contexto local de agentes (`docs/**`, root docs, Markdown, `.codex/**`, `.claude/**`, `.agents/**`). GitHub `ci.yml`, `ci-deep.yml` y `reliability-verify.yml` ignoran también `.agents/**` además de los docs/skills que ya ignoraban. El guard es fail-open: cualquier path runtime/ops desconocido, `src/**`, `app/**`, `public/**`, package/lockfiles, workflows, scripts, migrations, config/env o docs de control de release/deploy continúa el build. `main`/Production NO se ignora en Vercel todavía porque `production-release.yml` espera un Vercel deployment READY para el target SHA; modelar `vercel_skipped` queda como follow-up si se quiere ahorrar builds docs-only de production. Arquitectura: `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §7.
- **Hiring / ATS — Public Careers UI (TASK-354, production route live 2026-07-09):** `/public/careers/**` es la superficie pública Efeonce de vacantes, implementada con alta fidelidad al HTML local `~/Documents/carreers/Efeonce Carrers/Efeonce Careers.dc.html`. Listing/detalle consumen solo `PublicOpeningPayload` con ISR; apply es un Growth Form browser (`formKind='application'`, `efeonce-careers-application`, eventos `gh_form_*`) que postea al service de TASK-1367. El CV PDF opcional se adjunta por el asset pipeline privado (`hiring_application_cv_draft` -> `hiring_application_cv`) sin exponer URL pública. Flags `HIRING_PUBLIC_APPLICATIONS_ENABLED` y `NEXT_PUBLIC_TURNSTILE_SITE_KEY` están ON en Vercel staging/Production y producción sirve el bundle `915be02a86abfd49c71365af8a647f9fdfa35207` tras release acoplado PR #151. El 2026-07-09 se creó y publicó la vacante real `EO-OPN-0009` (`Account Manager / Especialista en Marketing`, demand `EO-TDM-0012`) usando los writers canónicos de Hiring, alineada al assessment `Account Manager L2`; detalle/apply responden 200. Smoke submit: browser headless no obtuvo token Turnstile y no disparó POST (fail-closed esperado); `POST /api/public/hiring/applications` sin token respondió `403 captcha_failed`; el command canónico `submitPublicHiringApplication` persistió QA `EO-APP-0007` (`happ-aa9857b4-ffce-471b-85ba-5af81804aac8`) con `source='public_careers'`, `stage='sourced'`, consent `granted` y CV asset privado `hiring_application_cv` attached. Queda pendiente solo una prueba browser con token humano/real si se exige validar el challenge completo. GVC reproducible: `scripts/frontend/scenarios/task354-careers-runtime-audit.scenario.ts`.
- **Hiring / ATS — Careers Apply Intake Service (TASK-1367, code complete 2026-07-08):** la puerta de entrada pública de candidatos (split backend de TASK-354). `POST /api/public/hiring/applications` (público, sin sesión) → `submitPublicHiringApplication` (`src/lib/hiring/public-careers/**`): resuelve el `opening_id` interno (published-gated) → reconcile Person (`createIdentityProfile` email-first) → `candidate_facet` (source=`public_careers`, consent granted, links portafolio/LinkedIn) → `hiring_application`. **MULTI-STEP IDEMPOTENTE** (3 commits; retry seguro por reconcile-email + upsert + dedupe `UNIQUE(opening_id, identity_profile_id)`), NO single-transaction. Anti-abuse: Turnstile + rate-limit vía `hiring_application_intake_events` (hashes, sin PII). Validación PURA (`parsePublicHiringApplication`, NO Zod). **Respuestas SIEMPRE genéricas** (duplicado → mismo `accepted`; nunca revela dedupe/estado/PII). **Flag `HIRING_PUBLIC_APPLICATIONS_ENABLED` default OFF** (404 invisible) — cutover requiere `TURNSTILE_SECRET` + sign-off consent (Ley 21.719). TASK-354 extendió este contrato con `multipart/form-data` para CV PDF opcional; portfolio-file/identidad/scan formal siguen en TASK-1362. Migración en dev; staging/prod vía release pipeline. Desbloquea TASK-354 (careers UI). Spec: `complete/TASK-1367-careers-apply-intake-service.md`.
- **Public Site / Growth CTA — HubSpot Scheduler native booking decision (2026-07-08):** `PDR-009` + `TASK-1366` fijan el camino transversal para "Agenda una reunión". El iframe oficial `HubSpotMeetingEmbed` sigue como fallback seguro; antes de reemplazarlo por UI propia, Greenhouse debe probar contra HubSpot Scheduler API en `agenda-discovery` que se conservan side effects nativos: `isOffline=false`, `calendarEventId`, Teams URL/ID, invite, bloqueo de calendario, contacto/timeline/meeting object y cancel/reschedule entendido. La task también debe cerrar el gap de atribución `hubspotutk`/UTM/content tracking con medición GTM/Greenhouse y, si aplica, Forms API `context.hutk`. No insertar UI nativa ni publicar GTM hasta veredicto.
- **Hiring / ATS — Assessment AI Assist (TASK-1361, code complete 2026-07-08):** capa IA gobernada sobre el motor de assessment. Genera borradores de preguntas + sugiere puntaje para respuestas abiertas, patrón `propose → confirm`: la IA propone EVIDENCIA en el ledger `hiring_assessment_ai_proposal`; **el LLM nunca escribe** el banco ni el score — solo `confirmAiProposal` (humano) aplica vía `createQuestion` (nace draft, gate SME) / `recordHumanScore`. Es **capa de dominio hiring** (`src/lib/hiring/assessment/ai/**`) que consume `src/lib/ai/*`, NO un tool de Nexa (espeja el AEO grader). Seam de modelo: grading `claude-sonnet-5` / generación `gemini-2.5-flash-lite` (override por env). Capability `hiring.assessment.ai_assist` + 4 rutas `/api/hiring/assessments/ai/**` + eventos `hiring.assessment.ai_{proposed,confirmed}`. **Flag `HIRING_ASSESSMENT_AI_ENABLED` default OFF** (gatea solo propose paths; el confirm/read de la cola no) — cutover requiere eval baseline verde (`scripts/hiring/assessment-scoring-eval.ts`) + sign-off HR/Legal (hiring-AI = alto riesgo EU AI Act). Boundary: nunca payroll/ICO/auto-rechazo; respuesta del candidato al LLM por allowlist de texto (nunca identity docs). Parity satisfecha a nivel contrato; actionKey de Nexa = follow-up. Spec: `complete/TASK-1361-assessment-ai-assist.md`.
- **Hiring / ATS — Assessment Engine (TASK-1360, code complete 2026-07-08):** el motor de evaluación por competencias vive en `greenhouse_hiring` (7 tablas: `hiring_competency`/`hiring_question`/`hiring_assessment_template`/`_module`/`hiring_assessment`/`hiring_assessment_response`/`hiring_competency_result`) + dominio `src/lib/hiring/assessment/**`. Ejes ortogonales `category`×`level`; dos métodos (`candidate_test` tokenizado + `interviewer_scorecard`). `answer_key`/`rubric` sensibles, nunca en el payload candidato (`buildPublicQuestion` allowlist). Scoring objetivo PURO (0-100) + cola humana; el resultado por competencia rueda a `hiring_application.score/match_score/explainability_json` vía el helper único `rollupCompetencyResultsToApplication` (**ADVISORY** — nunca auto-rechaza, nunca payroll/ICO). 3 capabilities `hiring.assessment.{read,author,score}` (roles internos, NUNCA `client_*`) + 7 rutas `/api/hiring/assessments/**` + eventos `hiring.assessment.*`. **Rollout:** migraciones en dev; staging/prod pendientes vía release pipeline; sin consumer UI hasta TASK-1363. Follow-ups: TASK-1361 (AI assist), TASK-1363 (UI), TASK-1364/1365 (validity+fairness). Spec: `complete/TASK-1360-assessment-engine-foundation.md`.
- **Hiring / ATS — Fairness Monitor (TASK-1365, staging sintetico live 2026-07-13):** self-ID voluntario se persiste en `greenhouse_hiring.hiring_demographic_selfid`, separado de score/decisión y anclado server-side a la application del token (sin IDs públicos, sin backfill histórico y sin raw self-ID en outbox). `assessment_fairness` expone solo buckets mensuales con k=10; `getSelectionFairness` exige ≥2 grupos reportables y calcula 4/5 + drift. Capability `hiring.assessment.fairness_read` role-only; audit sensible + evidence agregado append-only y signal agregado. SHA `242f8a5d8` esta live en staging con policy `efeonce-privacy-2025-04-19-staging-synthetic-v1`, retencion 30 dias y solo `synthetic_cohort`; reader autenticado y smoke DB verdes. Produccion sigue OFF/ausente. La policy publica de Efeonce no cubre categorias sensibles/finalidad fairness, por lo que self-ID real requiere notice/consent especifico antes de cualquier flip productivo.
- **Public Site `/servicios/redes-sociales/` — HubSpot Meetings embed live + medible (2026-07-08):** la card final de conversión ahora tiene tabs `Auditoría`/`Reunión`. `Auditoría` conserva el Growth Form y `Reunión` lazy-loadea el iframe oficial de HubSpot Meetings dentro del shell Efeonce, sin pegar snippet raw en Elementor. JS carga `MeetingsEmbedCode.js` una sola vez, evita duplicar UTMs del iframe, conserva fallback directo a HubSpot y emite eventos `dataLayer` sin PII: `gh_cta_clicked`, `gh_meeting_embed_viewed`, `gh_meeting_embed_loaded`, `gh_meeting_embed_failed`. Tags GTM/GA4 específicos quedan registrados como `pendiente` en `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` hasta publish gobernado. Backup remoto `/www/efeoncegroup_752/private/backups/eo-social-meetings-embed-before-20260708T104921Z.tar.gz`; evidencia live `/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-meetings-embed-final/` confirma desktop 1440/mobile 390/reduced-motion, iframe cargado, script único, eventos en dataLayer, consola limpia y `scrollWidth==clientWidth`.
- **Public Site `/servicios/redes-sociales/` — UGC + testimonio Motogas live (2026-07-08):** en `greenhouse_social_includes`, `UGC que se siente real` ya no debe mostrar el punto degradado de placeholder en `@cliente.real`; usa `assets/img/social/creators/creator-laura-makes.webp` como avatar ficticio. En `greenhouse_social_proof`, el placeholder quedó reemplazado por Mario Arroyo, `COO · Motogas`, con avatar representativo `assets/img/social/proof/mario-arroyo.webp` y cita basada en hechos provistos por el operador: 7 años de trabajo, 7 sucursales en Santiago, crecimiento, engagement y atención permanente. Backups remotos `/www/efeoncegroup_752/private/backups/eo-social-mario-testimonial-before-20260708T100900Z.tar.gz` y `/www/efeoncegroup_752/private/backups/eo-social-motogas-title-before-20260708T101707Z.tar.gz`; evidencia `/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-mario-testimonial-hotfix-final/` confirma desktop 1440/mobile 390/reduced-motion, avatares cargados, video UGC reproduciendo, texto Mario/COO/Motogas presente, consola limpia y `scrollWidth==clientWidth`. Si Motogas entrega foto aprobada, reemplazar sólo el WebP del avatar.
- **Public Site `/servicios/redes-sociales/` — Community/Listening hotfix live (2026-07-08):** en `greenhouse_social_includes`, `Community management` ya no debe usar el check genérico como marca: la burbuja de respuesta usa el isotipo blanco de Efeonce en `assets/img/creative-brand/isotipo-efeonce-negativo.svg` y un avatar ficticio para la usuaria. `Social listening y search` fue replanteado desde nube/tags abstractos hacia un tablero operativo con query social, pregunta repetida, señal de competidor y acción sugerida. Follow-up motion: la escena tiene coreografía CSS-only de 5.2s (`search beat -> query sweep -> señales -> acción sugerida`), scoped al estado activo y apagada en `prefers-reduced-motion`. Backups remotos `/www/efeoncegroup_752/private/backups/eo-social-community-listening-before-20260708T094923Z.tar.gz` y `/www/efeoncegroup_752/private/backups/eo-social-listening-motion-before-20260708T095553Z.tar.gz`; evidencia `/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-community-listening-hotfix-final/` y `/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-listening-motion-final/` confirma desktop 1440/mobile 390/reduced-motion, imágenes cargadas, old cloud ausente, 2 señales, 1 acción, animaciones activas en motion normal, `animationName=none` en reduced-motion, sin consola relevante y `scrollWidth==clientWidth`.
- **Public Site `/agencia-creativa-v2/` — selected work guides hotfix live (2026-07-08):** las guías/rectángulos de placeholder sobre `Trabajo seleccionado` y `Motor de producción` fueron diagnosticadas como DOM/CSS live viejo, no assets horneados. Hotfix CSS-only desplegado a Kinsta en `creative-landing.css`: cuando `.ghc-work-art` o `.ghc-output-art` tiene `.has-media`, los nodos guía/iconos de placeholder quedan ocultos y la media usa cover scoped. No se tocaron `Casos` ni binarios. Backup remoto `/tmp/eo-creative-guides-hotfix-before-20260708T092550Z.tar.gz`; evidencia `/Users/jreye/Documents/efeonce-public-site-runtime/.captures/creative-v2-guides-hotfix/` confirma desktop 1440/mobile 390/reduced-motion sin guías, media cargada, video correcto y `scrollWidth==clientWidth`.
- **Medición GTM/GA4 — dominio operativo (2026-07-07):** el tagging de los sitios públicos (`efeoncepro.com` + `think.efeoncepro.com`) llega a una sola propiedad GA4 `486264460`/`G-KYPPY57M14` vía el container `GTM-NGHPGRLZ` (SA `greenhouse-gtm-publisher@`). Al tocar `src/lib/growth/{gtm,ga4}/**`, medición, o al crear un form/CTA/landing/host: cargar la skill `greenhouse-gtm-ga4-operator` (auto-load por `.claude/rules/measurement-gtm-ga4.md`) + el reference canónico `docs/reference/measurement-gtm-ga4/` (empezar por `04` + `TRACKING-PLAN.md` + `LEARNINGS.md`). Mandato: todo host/superficie nuevo nace con el tag GA4 (Tracking Engine §19.2/§19.5). Pipeline genérico `generate_lead` (todos los Growth Forms por `form_slug`) ya live y verificado. Deployment: build agéntico + capa delgada (`pnpm gtm:snapshot`/`measurement:smoke`/`growth:forms-tracking-audit`), NO IaC — ADR `GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1`. NUNCA publicar al container sin preview + confirmación humana; NUNCA marcar key event un click/scroll/view (solo conversiones de negocio — criterio en `04 §3b`).
- **Public Site menu WordPress/Ohio — Visibilidad + Produccion Creativa live (2026-07-08):** no tratar el menu como HTML del masthead. Efeonce usa menu clasico WordPress: location `primary` -> term `nav_menu` `61` (`Menu 1`, count `25`), render desktop `#menu-primary` y mobile `#mobile-menu`; items = `nav_menu_item` + metas (`_menu_item_url` solo para custom links, paginas por `object_id`). Parents confirmados: `Soluciones=242525`, `Estrategia=244255`, `Experiencia=248605`, `Visibilidad=248628`, `Servicios Destacados=248629`, `Recursos=242524`. Items live clave: `Produccion Creativa=251313` -> page `251279` `/agencia-creativa-v2/`; `Diseño & Desarrollo Web=242916` -> page `250816` `/desarrollo-sitios-web/`; `Posicionamiento SEO=251312` -> page `251078` bajo `Visibilidad`; `AEO=250691` movido bajo `Visibilidad`; `Redes Sociales=251311` sigue bajo `Servicios Destacados`. Rollback update 2026-07-08: option `gh_backup_before_public_menu_visibility_creative_v2_20260708T154302Z` + post meta `_gh_backup_before_public_menu_visibility_creative_v2_20260708T154302Z` en page `251279`; backup RRSS previo `_gh_backup_before_menu_social_20260707T205950Z`. Para agregar otra URL futura: snapshot, `wp_update_nav_menu_item()` o WP-CLI oficial, purge Kinsta y verificacion desktop/mobile. Docs/skills: `docs/documentation/public-site/wordpress-ohio-elementor-layout.md`, `docs/manual-de-uso/public-site/wordpress-ohio-elementor-layout.md`, `docs/operations/discovery-public-website-wordpress-20260614.md`, `efeonce-public-site-wordpress` y `wordpress-router`.
- **Public Site mega menu Ohio — auditoria visual read-only (2026-07-08):** `Soluciones` (`item 242525`) ya usa el wide menu nativo de Ohio (`ohio_wide_menu_enabled=1`), no Elementor ni plugin externo. Todos los `nav_menu_item` tienen metas `icon_img` y `ohio_wide_menu_enabled`; `post_excerpt` funciona como descripcion/subtitulo. Medicion desktop 1440: panel `Soluciones` aprox. `1397x201px`, 6 columnas de `216x161px`, sin overflow; hoy no hay `wide-menu-image`, `wide-menu-description` ni `menu-link-icon-image`. Mobile: `Menu Images=true`, `Menu Descriptions=false`. Recomendacion vigente: enriquecer primero columnas/items existentes con iconos/imagenes livianas + descripciones cortas; no agregar imagen/descripcion al padre `Soluciones` sin prototipo porque Ohio inyecta una columna extra `wide-menu-parent-meta`. Docs: skill `runtime-and-discovery`, `docs/documentation/public-site/wordpress-ohio-elementor-layout.md`, manual y discovery WordPress.
- **Public Site `/servicios/redes-sociales/` — landing Elementor modular live noindex (TASK-1351, 2026-07-07):** nueva landing WordPress `https://efeoncepro.com/servicios/redes-sociales/` (`postId=251300`) publicada con `publish + noindex`, basada en el HTML final `/Users/jreye/Documents/social/Task 1351 execution/Redes Sociales.dc.html` y no en captures. Runtime repo `/Users/jreye/Documents/efeonce-public-site-runtime`, plugin `eo-elementor-widgets` v0.12.0, 12 widgets Elementor separados (`hero`, `trust`, `stakes`, `includes`, `wall`, `creators`, `metrics`, `greenhouse`, `bridge`, `proof`, `faq`, `cta`), sin monolito ni HTML completo. Header/footer nativos Efeonce/Ohio. Growth Form `efeonce-social-audit` v1 con Turnstile y delivery HubSpot `disabled` hasta cutover. Guardrails específicos: `greenhouse_social_includes` debe conservar las 8 escenas ricas del HTML final (content studio REC, variantes AI, UGC, chat, inbox/SLA, creador, trend chart, listening/sentiment), no volver al panel genérico; en las escenas `Social Care: atención por redes` y `Creadores e influencers`, los círculos con media real deben usar retratos ficticios existentes de `assets/img/social/creators/`, no dots abstractos ni aros/drop-zone punteados sobre foto cargada; `greenhouse_social_wall` debe conservar 8 slots equivalentes a `image-slot`, `data-muro-mask`, 3 columnas, auto-scroll y pausa hover/focus, no volver a cards sociales genéricas; `greenhouse_social_metrics` debe conservar la sección `Transparencia` con 4 métricas (`5×`, `38 s`, `70%`, `2 sem`) y disclaimer, no volver al waveform/3 cards; `greenhouse_social_greenhouse` debe conservar el dashboard completo del HTML final (topbar/logo, sidebar, 4 KPI cards, rendimiento por canal, top posts, social→negocio, revenue influido), no volver a la card compacta; `greenhouse_social_bridge` debe conservar el mapa radial con `data-system-stage`, SVG animado, hub y 4 nodos, no volver a chips lineales; `greenhouse_social_proof` debe conservar `no capturas fuera de lugar`; `greenhouse_social_creators` debe conservar chips + 5 perfiles de creador con aro gradiente, badge de red, handle/vertical y nota ilustrativa, no volver a una fila de íconos solamente. Evidencia: `.captures/task1351-live-desktop.png`, `.captures/task1351-live-mobile390.png`, `.captures/task1351-includes-html-parity/{desktop-final,mobile390-copy-final}-includes.png`, `.captures/task1351-greenhouse-dashboard-fix-v2/{desktop,mobile390}-greenhouse.png`, `.captures/task1351-creators-html-parity/{desktop-full,mobile390-full}-creators.png`, `.captures/task1351-metrics-bridge-proof-html-parity-clean/`, `.captures/task1351-wall-html-parity/` y `/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-includes-avatars-hotfix-final/`; Playwright desktop/mobile `scrollWidth==clientWidth`, todos los módulos visibles, form presente, FAQ JSON-LD, `includes` rico, muro con 8 slots y pausa/reanuda, métricas/bridge/proof fieles, dashboard completo, creadores completos y sin runtime de prototipo.
- **Public Site `/servicios/redes-sociales/` — stakes/source contrast live (TASK-1351, 2026-07-07):** `greenhouse_social_stakes` queda alineado al HTML final: párrafo completo de `El punto de partida`, dos cards comparativas (`El enfoque commodity` vs. Efeonce `Así lo trabajamos`), 8 bullets exactos sin puntuación agregada, logo Efeonce negativo + divisor en la card navy, wrapper `1100px`, título desktop en 3 líneas y mobile en 2. Backups rollback `/tmp/eo-social-stakes-html-parity-20260707T165416Z.tar.gz`, `/tmp/eo-social-stakes-width-rhythm-20260707T165656Z.css`, `/tmp/eo-social-stakes-title-rhythm-20260707T165831Z.css`, `/tmp/eo-social-stakes-title-rhythm-final-20260707T165937Z.css`; evidencia `.captures/task1351-stakes-html-parity-final/` confirma copy exacto, logo cargado, label genérico ausente, consola limpia y desktop/mobile sin overflow.
- **Public Site `/servicios/redes-sociales/` — muro social líquido live (TASK-1351, 2026-07-07):** `greenhouse_social_wall` queda reforzado contra el HTML final: 3 rieles, 8 placeholders poblables con `data-image-slot`/`data-media-kind`, 4 cards ricas de insight, badges de formato/plataforma, columnas visibles en desktop y stack completo en mobile. Motion: seno por riel con fases/periodos distintos, compositor-only, pausa hover/focus sin salto temporal y resume fluido. Backup rollback `/tmp/eo-social-wall-liquid-rails-20260707T163722Z.tar.gz`; evidencia `.captures/task1351-wall-liquid-rails-final/` + probe Playwright confirma `cols=3`, `slots=8`, `inners=8`, `notes=4`, `motionChanged=[true,true,true]`, `pauseHeld=true`, `resumedChanged=true` y desktop/mobile sin overflow.
- **Public Site `/servicios/redes-sociales/` — Growth Form CTA polish live (TASK-1351, 2026-07-07):** el formulario final debe conservar el renderer gobernado, pero la capa host `social-landing.css` aísla `.ghs-growth-form-host greenhouse-form` de `.ghs-audit-card p`. No volver a mostrar contadores de caracteres como párrafos flotantes en reposo; deben quedar ocultos hasta focus/value/near-limit y en escala utilitaria (`~11.5px`). `primaryObjective` debe ser full-width en desktop/mobile, con listbox del mismo ancho. Backup remoto `/tmp/eo-social-form-polish-20260707T162654Z.tar.gz`; evidencia `.captures/task1351-social-form-polish-final/` confirma CSS productivo con patch, desktop/mobile `visibleCounters=0`, select full-width, fondo blanco y `scrollWidth==clientWidth`.
- **Public Site `/servicios/redes-sociales/` — guardrail tipográfico live (TASK-1351, 2026-07-07):** se corrigió el drift conocido de `letter-spacing` en producción: `.gh-social` corta la herencia de tracking de Ohio/Elementor con `letter-spacing:0`; H1/H2 display y spans de acento computan el tracking compacto público aprobado `-.045em`; subtítulos, section copy, FAQ, proof, cards internas y helper copy del form computan `normal/0`; kickers/pills/labels uppercase conservan tracking positivo. Backup rollback `/tmp/eo-social-letter-spacing-20260707T152919Z.tar.gz`; Kinsta purgada. Evidencia `.captures/task1351-social-letter-spacing-fix/` (`probe.json`, desktop/mobile): `failureCount=0`, H1/H2 `-.045em`, subtítulos `normal`, kickers `0.14em`, desktop/mobile `scrollWidth==clientWidth`.
- **Public Site `/servicios/redes-sociales/` — retratos ficticios de creadores live (TASK-1351, 2026-07-07):** la sección `greenhouse_social_creators` dejó los placeholders de iniciales como fallback y ahora usa 5 retratos generados ficticios en WebP (`assets/img/social/creators/creator-*.webp`), no personas reales ni stock. Se preservaron aro gradiente, badges de red, handles/meta y micro-zoom con reduced-motion; el recorte final usa presets `soft`/`deeper` para bajar las caras al centro óptico del círculo sin huecos superiores ni pérdida de contexto creator. Backups `/tmp/eo-social-creator-portraits-20260707T154317Z.tar.gz`, `/tmp/eo-social-creator-portraits-crop-20260707T154843Z.tar.gz` y `/tmp/eo-social-creator-avatar-position-20260707T160234Z.tar.gz`; Kinsta purgada. Evidencia `.captures/task1351-creator-avatar-position-final/`: desktop/mobile con 5 imágenes `200`, `1024x1024`, 2 crop soft, 3 crop deeper, sin overflow y fallback oculto.
- **Public Site `/servicios/redes-sociales/` — patrón stories de creadores live (TASK-1351, 2026-07-07):** los perfiles de `greenhouse_social_creators` deben leerse como stories limpios: ring exterior gradiente, colchón blanco y retrato circular real. No dibujar aro punteado/segmentado encima de la foto cargada; la línea punteada del HTML pertenece al estado placeholder editable, no al estado con retrato. Backups: intento rechazado `/tmp/eo-social-creator-story-ring-20260707T164535Z.css`, estado limpio `/tmp/eo-social-creator-story-ring-clean-20260707T164903Z.css`; evidencia `.captures/task1351-creator-story-ring-clean-final/` confirma 5 imágenes, `::before` ausente y sin overflow.
- **Public Site `/servicios/redes-sociales/` — hero visual/motion guardrail (TASK-1351, 2026-07-07):** el hero `greenhouse_social_hero` no debe volver a una imagen/teléfono estático ni al mockup recargado con barras/play central. Debe preservar el equivalente del HTML final `data-hero-tilt`: `data-ghs-hero-tilt data-hero-tilt`, pointer tilt mouse/pen, parallax por pointer/scroll, chips flotantes, contador vivo `data-ghs-hero-likes`, heart beat, playbar animado y reduced-motion estático. La imagen derecha aprobada queda como phone/reel limpio: dark canvas full-phone, placeholder sutil `Reel o render 3D`, pill `Reel`, chip blanco `1.2M reproducciones`, chip verde en una línea `+2.4K guardados hoy`, social rail, bottom copy y chip frosted `creadores activos` con 3 ring avatars. Estado live verificado en `.captures/task1351-hero-visual-polish-final-v4/` (`desktop1440-hero.png`, `mobile390-hero.png`, `metrics.json`, `pointer-debug.json`): sin `.ghs-hero-play`/`.ghs-reel-line`, desktop visual `480px` con phone `360px` centrado, mobile sin truncar chip/texto, tilt `rotateX(1.95deg) rotateY(2.86deg)`, scroll parallax y desktop/mobile `scrollWidth==clientWidth`.
- **Public Site `/servicios/redes-sociales/` — hero video artístico vigente (2026-07-08 UTC):** el phone/reel del hero ahora reproduce el paquete `assets/video/social/art-macaws/v1/`, concepto `El mural que alza vuelo`: guacamaya mural azul/verde que cobra vida desde pared urbana. Keyframes creados con `gpt-image-2` (`ai-generations/2026-07-07_mural-guacamayas-hero/`), motion master con Google Cloud Vertex `gemini-omni-flash-preview`; públicos sólo WebM/MP4/poster (`art-macaws-v1-web-small.webm`, `art-macaws-v1-lite.mp4`, `art-macaws-v1-poster.jpg`). Rollback remoto `/tmp/eo-social-art-macaws-before-20260708T002902Z.tar.gz`; evidencia live `/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-hero-art-macaws-v1/` confirma desktop/mobile autoplay muted loop, source `art-macaws/v1`, no `travel-warp`, consola limpia y sin overflow.
- **Public Site `/servicios/redes-sociales/` — muro de trabajo con assets premium live (2026-07-08 UTC):** el bloque `Muestra de trabajo` ya no debe tratarse como placeholder vacío. Los 8 slots del wall (`muro-a1`, `muro-a3`, `muro-a4`, `muro-b2`, `muro-b3`, `muro-c1`, `muro-c2`, `muro-c4`) están poblados con WebP ficticios premium de campaña social-first, generados con `gpt-image-2` (`ai-generations/2026-07-08_social-wall-assets/`) y publicados bajo `assets/img/social/wall/v1/` (~940 KiB total). El widget usa `get_wall_tile_asset()` para mapear assets por slot y sólo muestra placeholder si falta el asset. Rollback remoto `/tmp/eo-social-wall-assets-before-20260708T011949Z.tar.gz`; evidencia live `/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-wall-assets-v1/` + `tmp/verify-social-wall-assets-v1.mjs` confirma desktop/mobile 8/8 imágenes cargadas, sin overflow ni errores, y paint correcto slot-by-slot en mobile.
- **Public Site media production learning (2026-07-08):** para placeholders visuales de landings, decidir imagen vs video por funcion del bloque, no por la etiqueta literal. En muros animados, WebP premium tipo cover/frame puede superar multiples autoplays por peso, control visual y QA. En este entorno usar `cwebp` para WebP; no asumir encoder `libwebp` en `ffmpeg` ni WebP writable en `sips`. Si una captura larga mobile parece mostrar lazy images oscuras/blancas, correr probe slot-by-slot con scroll/decode antes de cambiar produccion. Fuente canonica: `docs/operations/public-site-social-wall-media-production-20260708.md`.
- **Media web reusable tooling (2026-07-08):** no recrear comandos ad hoc para empaquetar assets generativos. Usar `pnpm media:web-video` (`scripts/media/pack-web-video.mjs`) para producir WebM VP9 + MP4 H.264 fallback + poster JPG, y `pnpm media:webp` (`scripts/media/pack-webp.mjs`) para WebP via `cwebp`. Runbook: `docs/operations/web-media-delivery-tooling.md`.
- **AI generations artifact policy (2026-07-08):** `ai-generations` permanece como bitacora versionable, pero no como storage de binarios pesados. Nuevos `png/jpg/webp/mp4/webm/mov` bajo `ai-generations` estan gitignoreados; `.vercelignore` excluye la carpeta del upload Vercel; `pnpm media:archive-ai-generation -- --run ai-generations/<run> --apply` sube binarios al bucket privado `gs://efeonce-group-greenhouse-private-assets-prod/ai-generations/<run>/` y escribe `artifacts.remote.json` con `gsUri`, tamano y SHA-256. Corridas 2026-07-07/08 de guacamayas, Agencia Creativa, Social Includes y Social Wall ya archivadas: 112 objetos, ~104.6 MiB. Cleanup pendiente si se quiere adelgazar repo historico: 23 binarios antiguos ya trackeados bajo `ai-generations` (~25 MiB).
- **Public Site `/servicios/redes-sociales/` — `Qué incluye` media v1 live (2026-07-08):** la sección `greenhouse_social_includes` ya tiene media real en las escenas clave. `Estudio de contenido` usa video corto en `assets/video/social/includes/v1/includes-studio-production-v1.*`; `UGC que se siente real` usa `includes-ugc-simple-v1.*`; `Producción escalada con AI` usa tres WebP bajo `assets/img/social/includes/v1/` en las celdas 1/3/5, mientras las celdas 2/4/6 conservan shimmer para representar generación activa. Fuente: `ai-generations/2026-07-08_social-includes-assets/`; screenshot live corregido en `/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-includes-media-v1/desktop-1440-includes-ai-variants-fixed.png`.
- **Public Site `/agencia-creativa-v2/` — portfolio media v1 live (2026-07-08):** los placeholders de `Motor de producción`, `Trabajo seleccionado` y `Casos` ya están poblados con 8 WebP y 1 spot corto WebM/MP4/poster bajo `assets/img/creative/portfolio/v1/` y `assets/video/creative/portfolio/v1/`. Fuente generativa: `ai-generations/2026-07-08_creative-landing-assets/` (GPT Image 2 + Gemini Omni/Vertex + helpers `pnpm media:webp`/`pnpm media:web-video`). Runtime `eo-elementor-widgets` usa helpers `get_portfolio_assets()`/`render_*_asset()`, overlays scoped y `[data-ghc-inline-video]` con viewport playback + reduced-motion hard pause. Backup remoto `/tmp/eo-creative-portfolio-media-v1-before-20260708T062208Z.tar.gz`; evidencia `/Users/jreye/Documents/efeonce-public-site-runtime/.captures/creative-portfolio-media-v1/` y `tmp/verify-creative-portfolio-media-v1.mjs` confirma desktop/mobile sin overflow, 8 imágenes cargadas, 1 video avanzando y reduced-motion `paused=true`.
- **Public Site `/agencia-creativa-v2/` — Elementor modular live index + menú Producción Creativa (TASK-1350, 2026-07-08):** URL `https://efeoncepro.com/agencia-creativa-v2/` (`postId=251279`) publicada con `index, follow`, canonical `https://efeoncepro.com/agencia-creativa-v2/` y expuesta en el menú como `Producción Creativa` (`item 251313`) bajo `Soluciones > Estrategia & Posicionamiento`; **no redirigir aún** la landing canónica `/agencia-creativa/` (`postId=249582`) sin aprobación del operador. Implementación real: runtime repo `/Users/jreye/Documents/efeonce-public-site-runtime`, plugin `eo-elementor-widgets` v0.11.0, widget `greenhouse_creative_landing_module`, 14 instancias Elementor (`hero`, `trust`, `problem`, `workflow`, `services`, `ai_engine`, `metrics`, `work`, `cases`, `testimonial`, `ecosystem`, `process`, `cta`, `faq`) y `0` widgets HTML. Fuente de verdad del diseño: `~/Documents/Creative/Ejecución de task 1350/TASK-1350 Landing Agencia Creativa.dc.html`; no usar screenshots de iteraciones como fuente. Header/footer deben seguir siendo nativos Efeonce/Ohio; no publicar el header/footer custom del HTML fuente. Header guardrail: como el hero es oscuro, el primer container Elementor `ghcroot` debe conservar `css_classes="gh-creative-elementor-shell clb__dark_section"` para que Ohio active su variante dark nativa (`#masthead.header-3.light-typo`, menú/logo claros) igual que Home y `/desarrollo-sitios-web/`; no forzar con CSS de header. Hero rail guardrail: `.ghc-hero-wrap` usa top padding `clamp(140px, 10vw, 184px)` para mantener `[ 01 ] Agencia creativa - Efeonce` / `Design Engineer` debajo del masthead en desktop ancho y mobile; no reducirlo sin medir header→rail. Statement guardrail: el pill `Tu equipo dirige...` debe replicar el HTML fuente como `<span>` flexible + `<i aria-hidden>` al borde derecho; no volver a pseudo-element junto al texto porque se lee como cursor. Motion contract: `docs/ui/motion/TASK-1350-landing-agencia-creativa-motion.md`. Guardrail gutter: Ohio desktop fuerza `left: calc((var(--clb-container-side-gutter) - var(--clb-grid-gutter)) * -1) !important` sobre `.page-container.-full-w .elementor > .e-con-full.e-parent`; en esta landing el custom CSS page-scoped debe mantener `.gh-creative-elementor-shell` con `left=0`, `min-width=100vw` y `.page-container.-full-w` sin padding para evitar la franja blanca. Evidencia final: `.captures/task1350-header-variant-2026-07-07T08-23-24-152Z/`, `.captures/task1350-hero-offset-2026-07-07T08-28-52-018Z/`, `.captures/task1350-statement-bar-2026-07-07T08-33-07-290Z/` y `.captures/task1350-creative-v2-2026-07-07T08-33-34-683Z/`; desktop/mobile `headerClass` incluye `light-typo`, root dark section, menú desktop blanco, header→rail `35px/45px/31px` en 1440/2048/390, statement bar flush-right, desktop/wide/mobile `scrollWidth==clientWidth`, consola limpia, 14 módulos, FAQ schema, HubSpot Meetings UTM, sin runtime prototipo; auditoría de motion confirmó colores fuente, keyframes, hover de servicios/bento y reduced-motion. Últimos backups runtime: `/tmp/greenhouse-eo-creative-landing-widget-20260707T075816Z.tar.gz`, `/tmp/greenhouse-eo-creative-landing-widget-20260707T075825Z.tar.gz`, backup remoto CSS `/www/efeoncegroup_752/public/wp-content/plugins/eo-elementor-widgets/assets/css/creative-landing-before-hero-offset-20260707T082724Z.css`, y backups statement `creative-landing-before-statement-bar-20260707T083224Z.css` / `class-eo-creative-landing-module-widget-before-statement-bar-20260707T083224Z.php`; backups Elementor/post meta `_gh_backup_before_task1350_creative_v2_20260707T074806Z`, `_gh_backup_before_task1350_creative_v2_20260707T075017Z`, `_gh_backup_before_task1350_creative_v2_gutter_20260707T081255Z`, `_gh_backup_before_task1350_creative_v2_dark_section_20260707T082312Z`.

- **Public Site `/agencia-creativa-v2/` — header first-paint guardrail (2026-07-07):** además de `clb__dark_section`, la variante dark correcta depende del meta Ohio `page_header_menu_text_typo` guardado como JSON string exacto `{"color":"rgba(255,255,255,0.75)"}` junto con `page_header_logo_style=light_variant`, `page_header_menu_style=inherit` y `page_header_menu_style_settings=custom`. No guardarlo como array PHP: produce flash de menú oscuro hasta que Ohio JS agrega `light-typo`. Fix live aplicado sólo en `postId=251279`, backup `_gh_backup_before_task1350_header_typo_meta_20260707T091025Z`; evidencia `.captures/task1350-header-first-paint-2026-07-07T09-11-03-691Z/` confirma no-JS/first paint `rgba(255,255,255,0.75)` y post-JS blanco. Smoke completo vigente: `.captures/task1350-creative-v2-2026-07-07T09-11-03-691Z/`.

- **Public Site headers Ohio — playbook canonico (2026-07-07):** antes de tocar headers, usar `docs/documentation/public-site/wordpress-ohio-elementor-layout.md#playbook-variantes-de-header-ohio` y el runbook relacionado. Tipos vigentes: `header-3` overlay oscuro para heroes navy (`light_variant` + `clb__dark_section` + first-paint menu claro), `header-3` claro/inherit para heroes blancos, `with-header-sidebar` para rails legacy como `/blog`, `page-headline featured` para heroes nativos de Ohio con `_thumbnail_id`, y `elementor_canvas/custom header` sólo con aprobación explícita. Regla dura: no resolver un header con CSS global si el problema es variante/meta.

- **Public Site `/agencia-creativa-v2/` — guardrail KPI metrics (2026-07-07):** en `[ 06 ] Operación creativa medible`, los KPI spans deben conservar `white-space:nowrap`; las métricas negativas (`-35%`, `-40%`) usan la escala menor `clamp(3rem, 4.85vw, 5.05rem)` para que el count-up no parta `%` a segunda línea ni desbalancee las cards. Evidencia live vigente: `.captures/task1350-metrics-wrap-2026-07-07T08-59-44-613Z/` y smoke completo `.captures/task1350-creative-v2-2026-07-07T09-11-03-691Z/`; backup runtime `/tmp/greenhouse-eo-creative-landing-widget-20260707T085846Z.tar.gz`.

- **Public Site `/agencia-creativa-v2/` — guardrail scroll-bound motion (2026-07-07):** el reveal general de la candidata usa el equivalente namespaced del HTML fuente (`data-ghc-reveal`, `.ghc-rv`, `.ghc-rvc`), y las animaciones de backlog/proceso (`backlogFill`, `procFill`, `procToken`) deben esperar a `[data-ghc-reveal].is-in`; no deben dispararse desde page load. Estado live: top de página computa `width=0`/`animationName=none`, al entrar al viewport corren `backlogFill`/`procFill`/`procToken`, y reduced-motion deja barras final/static con token oculto. Backup remoto: `/www/efeoncegroup_752/public/wp-content/plugins/eo-elementor-widgets/assets/css/creative-landing-before-scroll-motion-fix-20260707T104605Z.css`.

- **Public Site `/agencia-creativa-v2/` — guardrail CTA hover/focus (2026-07-07):** Ohio/global puede inyectar `background-image` blanco en anchors al hover; la landing debe mantener overrides page-scoped para `.ghc-btn-primary`, `.ghc-link-underline` y links fallback, con estados idle/hover/focus/active/reduced-motion propios. Estado live: `creative-landing.css` desplegado con primary azul/texto blanco, secondary transparente con underline naranja→purple, fallback underline por `currentColor`, reduced-motion sin lift; backup remoto `/www/efeoncegroup_752/public/wp-content/plugins/eo-elementor-widgets/assets/css/creative-landing-before-cta-hover-20260707T110557Z.css`; evidencia `.captures/task1350-cta-hover-audit-after/` (`failures=0`, consola limpia, mobile overflow `0`).

- **Public Site `/agencia-creativa-v2/` — guardrail trust proof + logo marquee (2026-07-07):** la franja bajo el hero debe reutilizar la primitiva pública `greenhouse_logo_marquee` de AEO dentro del módulo `trust` de `greenhouse_creative_landing_module`; no volver a una fila estática de 4 logos. Estado live: proof group con países `Chile · Colombia · México · Perú` + chip `+90 empresas`; no restaurar `120+ empresas`, `4 países`, `80% renovación` ni `HubSpot Solutions Partner` en ese strip ni en el FAQ/schema de la candidata. `get_style_depends()` encola `eo-logo-marquee`; `.ghc-trust-marquee` aplica skin compacto con logos a color (`filter:none`), 7 logos únicos (`sky`, `anam`, `gobierno-santiago`, `berel`, `carozzi`, `bresler`, `marca-chile`), 3 sets idénticos, edge fade, hover pause, breakpoint `980px` y reduced-motion sin animación ni duplicados. Backups remotos: `class-eo-creative-landing-module-widget-before-trust-logo-marquee-20260707T112826Z.php`, `creative-landing-before-trust-logo-marquee-20260707T112826Z.css`, `creative-landing-before-trust-logo-marquee-reduced-motion-20260707T113012Z.css`, `class-eo-creative-landing-module-widget-before-trust-countries-20260707T114111Z.php`, `creative-landing-before-trust-countries-20260707T114111Z.css`, `class-eo-creative-landing-module-widget-before-trust-90-companies-20260707T114517Z.php`, `creative-landing-before-trust-90-companies-20260707T114517Z.css`; evidencia `.captures/task1350-trust-90-companies-20260707T114517Z/` con desktop/mobile/reduced-motion, `+90 empresas`, hover chip lift, marquee hover `paused`, `filter=none`, `scrollWidth==clientWidth`.

- **Public Site sticky editorial lane pattern (2026-07-07):** el patrón reutilizable para próximas landings WordPress/Ohio/Elementor queda canonizado en `docs/documentation/public-site/wordpress-ohio-elementor-layout.md#patron-reutilizable-sticky-editorial-lane` y reflejado en las skills Codex/Claude `efeonce-public-site-wordpress`. Usar la clase nativa Ohio `-sticky-block` sobre la lane/columna completa, no sobre un inner pequeño; dar altura de viewport, centrar el inner, mantener ancestros `overflow:visible`, mobile estático y verificar con Playwright muestras activas + release final. Evitar `site-content` u otros wrappers con `overflow-y:auto` alrededor de la landing, porque convierten el wrapper en scroll container y rompen sticky. Implementación de referencia: SEO `#grader` con backup `_gh_backup_before_task1343_seo_landing_20260707T063508Z` y evidencia `.captures/task1343-seo-growth-form-motion-v1-2026-07-07T06-39-59-496Z/`.

- **Public Site `/servicios/posicionamiento-seo/` — Growth Form SEO live end-to-end (TASK-1343, 2026-07-07):** la landing live `https://efeoncepro.com/servicios/posicionamiento-seo/` (`page_id=251078`) ahora embebe el Growth Form gobernado `efeonce-seo-diagnostic` en `#grader`, después de `[data-capture="bridge"]` y antes de `[data-capture="faq"]`. Contrato: `<greenhouse-form form-key="7772dcf4-e2ca-4f5b-b386-2db92659b050" surface="fhsf-48a4b95f-5f2a-453a-88d7-af3257e7c417" locale="es-CL" color-scheme="light" appearance="bare">`, version `3` (`fver-af974bcd-2e20-45ea-9c3e-a897eeb27d2e`), `diagnostic_premium`, 11 campos de captura, Turnstile obligatorio y delivery HubSpot `disabled` hasta cutover. La v3 mantiene `website` como `type=text` + `inputMode=url` + `validator=url` + `maxLength=160`, para que `Empresa` y `Sitio web a diagnosticar` compartan fila en desktop y se apilen en mobile; elimina el select separado `CMS o plataforma`, agrega ayuda útil bajo `Nombre completo`/`Empresa`, reduce microcopy redundante bajo selects, oculta contadores visuales y corrige el CTA submit con texto/flecha blancos, gradiente azul AA y foco visible. La capa visual/motion del host se rige por `task-1343-seo-growth-form-motion-v1`: estación clara con orbit/halo, reveal `is-in-view`, status pills, card hover/focus-within, field polish, `.gh-form-ready` al montar el renderer y stack explícito para listboxes (`fieldZIndex=90`, `listZIndex=120`) para que los desplegables no queden bajo filas posteriores; el fix reusable del renderer usa `.ghf-field[data-overlay-open="true"]` y está documentado en `greenhouse-growth-forms` + docs Growth Forms; reduced-motion queda estático. Todos los CTAs diagnósticos van a `#grader`; `Ver AEO` sigue siendo el único CTA a `/aeo-2/`; el sticky `.mcta` se oculta al llegar al formulario para no tapar campos/consent. Backup rollback vigente de WordPress: `_gh_backup_before_task1343_seo_landing_20260707T063508Z`; evidencia live `.captures/task1343-seo-growth-form-motion-v1-2026-07-07T06-39-59-496Z/` con desktop/mobile `ok=true`, renderer mounted, widgets Ohio preservados, `scrollWidth==clientWidth`, consola limpia, sticky hidden at grader, sticky lane `stickyPosition=true`/`stableWhileFormScrolls=true`/`stopsAtEnd=true`, desktop `company+website sameRow=true`, mobile `stacked=true` y `mobileStatic=true`, `visibleCounters=0`, submit `rgb(255,255,255)`, `formReady=true`, hover/focus/reduced-motion OK, dropdown `mainGoal` abierto con `topElementInList=true` y `selectedOptionColor=rgb(15,33,53)`. API pública: GET contract CORS `200` version `3`, `fieldCount=11`, helpers correctos y sin `cmsPlatform`; POST sin Turnstile `403 captcha_failed/missing_token`.
- **Public Site `/servicios/posicionamiento-seo/` — metadata/schema SEO vigente (2026-07-07):** la landing live `page_id=251078` tiene Yoast title `Agencia SEO y posicionamiento web | Efeonce`, metadescription optimizada, excerpt explícito, focus keyphrase `agencia seo`, canonical final, robots `index, follow`, OG/Twitter alineados con imagen social institucional explícita attachment `243360` y JSON-LD combinado limpio: Yoast emite `WebPage`/`BreadcrumbList`/`WebSite`/`Organization`; el inline page-scoped emite sólo `Service` + `FAQPage` con 9 preguntas visibles. Backup rollback `_gh_backup_before_task1343_seo_meta_schema_20260707T072341Z`; verificado por WP-CLI, REST, head live y browser smoke desktop/mobile sin overflow ni consola.
- **Public Site `/servicios/posicionamiento-seo/` — landing SEO live + header Ohio light + gutter fix (TASK-1343, 2026-07-06):** la landing live `https://efeoncepro.com/servicios/posicionamiento-seo/` (`page_id=251078`) usa el header nativo Ohio `header-3` sobre hero claro, sin custom SEO sticky header, sin `elementor_canvas`, sin forzar variante dark y con widgets Ohio visibles. Invariante operativo: mantener `_wp_page_template=default`, Elementor `page_layout=default`, `page_header_logo_style=inherit`, `page_header_menu_style=inherit`, `page_header_menu_style_settings=inherit`, `page_full_width_margins_size=0px`, `page_add_wrapper=0`, `page_add_top_padding=0`. El gutter blanco señalado en E-E-A-T quedó corregido con CSS page-scoped que anula el offset de `.page-container.-full-w` + `.elementor-251078 > .e-con-full.e-parent.gh-task-1343-seo-landing-shell`; no convertirlo en regla global. Backup rollback vigente: `_gh_backup_before_task1343_seo_landing_20260706T212903Z`; evidencia live final: `.captures/task1343-seo-gutter-fix-final-2026-07-06T21-29-30-989Z/` con desktop/mobile `scrollWidth==clientWidth`, shell/hero/E-E-A-T `left=0`, widgets Ohio preservados e iconos OK.
- **Public Site `/servicios/posicionamiento-seo/` — marquee + scroll reveal parity (TASK-1343, 2026-07-06):** el Claude Design aprobado incluye un keyword marquee no-`section` entre hero y `stakes`; al regenerar la landing debe preservarse explícitamente como `[data-capture="keyword-marquee"].gh-seo-keyword-marquee`, porque una reordenación basada solo en `<section data-capture>` lo descarta. El scroll reveal vive en `.rv` + `IntersectionObserver`; no introducir reveal-all global tras carga, solo failsafe de elementos ya visibles en viewport. Backup rollback vigente para esta pasada: `_gh_backup_before_task1343_seo_landing_20260706T213858Z`; evidencia live `.captures/task1343-seo-marquee-motion-2026-07-06T21-39-37-247Z/` con desktop/mobile `hasMarquee=true`, track animado, reveal por scroll, reduced-motion correcto, `scrollWidth==clientWidth` e `invalidIcons=0`.
- **Public Site `/servicios/posicionamiento-seo/` — footer nativo, sin footer custom (TASK-1343, 2026-07-06):** no reintroducir `<footer>` dentro de `.gh-seo-landing`; el sitio ya renderiza el footer Ohio `#colophon` después del contenido Elementor. El CTA final `data-capture="final"` se conserva, pero el footer duplicado de la landing queda removido. Backup rollback vigente: `_gh_backup_before_task1343_seo_landing_20260706T214316Z`; evidencia live `.captures/task1343-seo-remove-custom-footer-2026-07-06T21-43-47-560Z/` con `.gh-seo-landing footer` ausente, `footerCount=1`, `nativeFooterSelector=#colophon`, desktop/mobile sin overflow e `invalidIcons=0`.
- **Public Site `/servicios/posicionamiento-seo/` — tracking compacto de títulos alineado con AEO/desarrollo (TASK-1343, 2026-07-06):** el drift de `letter-spacing` de títulos se corrige siguiendo el precedente aprobado: H1/H2 display y los H3 grandes del bloque `Qué incluye` en DM Sans computan `letter-spacing:-0.045em`; sus spans de acento heredan el tracking; copy interno, chips, cards, labels y proof text no deben recibir este tracking. Backup rollback vigente: `_gh_backup_before_task1343_seo_landing_20260706T224418Z`; evidencia `.captures/task1343-seo-letter-spacing-audit-2026-07-06T22-45-55-689Z/` con `17` display titles auditados, `failures=[]`, H3 `Qué incluye` a `-1.404px`/`31.2px`, focal `El SEO no termina en tráfico. Termina en negocio.` `-1.944px` a `43.2px`, desktop/mobile `scrollWidth==clientWidth`.
- **Public Site `/servicios/posicionamiento-seo/` — assets de marca Google/GPT/Perplexity/Greenhouse/Efeonce (TASK-1343, 2026-07-06):** ningún punto visible con marca nombrada debe usar un "Google dark" inventado, glyphs genéricos ni marcas tiny/mixed-size. Contrato vigente: `Indexado` usa el SVG multicolor local de Google (`public/images/greenhouse/SVG/icon-google.svg`); en E-E-A-T, `.gh-google-dark-mark.gh-eeat-brand-badge` y `.gh-chatgpt-mark.gh-eeat-brand-badge` son badges consistentes `24px` con SVG real `15px`; chips/filas `ChatGPT` y puente AEO usan el isotipo GPT local (`public/images/logos/axis/gpt-isotype.svg`); `Perplexity` usa `public/images/logos/axis/perplexity-icon.svg`; plataforma/dashboard usa logotipo azul e isotipo blanco locales de Greenhouse; comparativa usa `.gh-comparison-efeonce-logo` con `public/branding/logo-full.svg` seguido por `· método medible`. No reintroducir `ti-brand-google`, `ti-brand-openai`, `ti-sparkles` en wrappers de marca, `ti-plant-2`, ni texto visible viejo `Efeonce · método medible`. Backup rollback más reciente del barrido E-E-A-T: `_gh_backup_before_task1343_seo_landing_20260706T225431Z`; evidencia live `.captures/task1343-seo-eeat-brand-badges-2026-07-06T22-55-10-532Z/` + global `.captures/task1343-seo-brand-logo-audit-2026-07-06T22-22-03-192Z/` (`ok=true`, desktop/mobile, SVGs reales confirmados) + focales `.captures/task1343-seo-comparison-efeonce-logo-final-2026-07-06T22-04-31-801Z/` y `.captures/task1343-seo-bridge-ai-icons-2026-07-06T22-16-47-922Z/`.
- **Public Site `/servicios/posicionamiento-seo/` — CTA/proof/Greenhouse polish (TASK-1343, 2026-07-06):** el último polish live cubre sólo los puntos pedidos `2,3,4,5,7`: hero móvil, lógica de CTAs, prueba comercial, protagonismo de Greenhouse y contraste de microtextos. No compactar `Qué incluye` ni recortar blancos globales como parte de este delta. Contrato vigente: `[data-capture="commercial-proof"].gh-commercial-proof` debe seguir en el carril narrativo de prueba, después de `[data-capture="prueba"]` y antes de `[data-capture="plataforma"]`, con copy `Evidencia del método` / `La diferencia se demuestra cuando puedes auditar el trabajo.`, logos reales locales (`docs/assets/public-site/aeo-brand-logos/{sky,anam,berel,carozzi,bresler,marca-chile}.svg`) y sin métricas inventadas; no devolverlo entre marquee y contexto. La prueba comercial ya no debe sentirse como card: mantener `.gh-proof-shell` transparente sin borde/radio/sombra, logos en `.gh-proof-wall` con divisores finos y tres pruebas en `.gh-proof-ledger` abierto. CTAs: `task-1343-cta-hover-system-v1` gobierna hover/focus/active/reduced-motion de `.btn-primary`, `.btn-ghost`, `.btn-light` y `.lnk`; no depender de estilos inline/Ohio para estados. `Habla con el equipo`/`Hablar sobre Greenhouse` van a mailto SEO, `Ver AEO` es el único CTA a `/aeo-2/`, y diagnósticos van a `#grader`. Greenhouse conserva `.gh-greenhouse-operating-row`, badge `Reporte vivo` y CTA `Diagnostica tu baseline`. Backup rollback vigente: `_gh_backup_before_task1343_seo_landing_20260707T000629Z`; evidencia `.captures/task1343-seo-final-polish-2026-07-06T23-29-34-593Z/` + `.captures/task1343-seo-final-check-2026-07-06T23-31-49-943Z/` + `.captures/task1343-seo-commercial-proof-reflow-2026-07-06T23-41-50-507Z/` + `.captures/task1343-seo-commercial-proof-editorial-2026-07-06T23-52-56-893Z/` + `.captures/task1343-seo-cta-hover-system-final-2026-07-07T00-07-18-007Z/` con mobile `390` y desktop `1440` sin overflow, `.mcta` oculta al inicio y visible tras scroll, `proofLogoCount=6`, `commercialProof=1`, `operatingRows=1`, orden `prueba -> commercial-proof -> plataforma`, shell sin card chrome, CTA hover audit `failures=[]`, reduced-motion `transform:none` y consola limpia.
- **Public Site `/desarrollo-sitios-web/` — landing premium completa + Growth Form real + content rail full-bleed (TASK-1345, 2026-07-06):** la landing live `https://efeoncepro.com/desarrollo-sitios-web/` (`page_id=250816`) ya tiene polish premium/enterprise desde hero hasta FAQ y cierre. El contenido vive bajo el contenedor Elementor owned `wdrest`; contrato vigente: `content_width=full` y padding/margin explicitos en `0` para que `.gh-v11` pinte full-bleed sin exponer gutters blancos del body/Ohio. La sección final es `final final-premium final-growth-form` (`id="cotizar"`, CSS `task-1345-final-growth-form-v1` + proximity overlay `task-1345-final-conversion-proximity-v1`) y embebe el Growth Form real `efeonce-desarrollo-web-cotizacion` (`formKey=00231d6c-e1a0-4857-ae5b-a27262ae8b69`, `surface=fhsf-2d4b97ad-7076-4958-8e0f-daf1c995e430`, v2 `fver-6fc638de-5948-407d-be0b-31954fe29877`, `diagnostic_premium`, Turnstile invisible). La pasada vigente hace al formulario protagonista: reduce el top dead space, baja la competencia visual de la izquierda, acerca el panel en wide (gap útil 238px -> 151px), deja form panel 740px/radio 26px desktop y 350px/radio 24px mobile, conserva H2 balanceado sin corte con tracking de display, halo pointer/focus, estados hover/focus/error/CTA, densidad compacta del form (controles 52px, textarea 124px) y `Empresa` + `Sitio actual` en la misma fila desktop/tablet, apilados en mobile. Contrato tipográfico final: H2 y título interno `Describe el proyecto` usan `letter-spacing:-.045em`; body/form/labels/CTA/trust quedan normal/0. Los CTAs de conversión apuntan a `#cotizar`; `/contacto/` queda como navegación/fallback. Sistema de hover/focus de CTAs activo: marker page-scoped `task-1345-button-hover-system-v1`, corrige el bleed global de link hover sobre botones oscuros y cubre hero, `.gh-v11 a.btn`, `.model-link` y submit del Growth Form sin tocar header/nav/wrappers. HubSpot direct delivery sigue `disabled` y gated por TASK-1264/operator cutover. Backups recientes: `_gh_backup_before_task1345_final_growth_form_v1_20260706T112124Z`, `_gh_backup_before_task1345_rest_container_gutter_20260706T113415Z`, `_gh_backup_before_task1345_button_hover_system_v1_20260706T115304Z`, `_gh_backup_before_task1345_final_conversion_proximity_v1_20260706T132015Z`. Evidencia live: API/CORS v2 OK, POST sin captcha `403 captcha_failed/missing_token` sin crear submissions, Playwright desktop/wide/mobile 390 sin overflow, header Ohio nativo, `wdrestLeft=0`, `ghLeft=0`, `.gh-v11` width=viewport, auditoría hover completa en `.captures/task-1345-all-page-button-hover-audit/`, capturas `.captures/task-1345-final-spacing-probe/` y `.captures/task-1345-rest-gutter-and-final-v9/`.
- **Public Site `/desarrollo-sitios-web/` — header/hero nativo Ohio + Hero Factory v17 con motion original (TASK-1345, 2026-07-05/06):** la landing live `https://efeoncepro.com/desarrollo-sitios-web/` (`page_id=250816`) usa Elementor `Document::save()` con hero nativo `wdhero` estilo AEO/Home y contenido `wdrest`. Invariante operativo: el header queda gobernado por Ohio (`with-header-3`, `#masthead.header-3.light-typo`) y no por CSS/JS custom; no reintroducir reglas propias contra `#masthead`, `#content`, `.page-container`, `.elementor-250816`, `#site-navigation` ni wrapper resets. El CSS de contenido `.gh-v11` sigue permitido scoped a la landing. El visual estatico `wdans` ya fue retirado; `wdvis` ahora contiene la animacion Hero Factory premium (`whfd06a1`, `.ghf-slot ghf-slot-premium-v2 ghf-slot-right-v17`) basada en `ai-generations/2026-07-05_task-1345-hero-interface/hero-factory-embed-gsap.html`. No reintroducir `ghf-sweep`, tween `[data-sweep]`, scan pass ni fondo local/grain de animacion (`ghf-field`, `ghf-floor`, `ghf-glow`, `ghf-grain`): el widget debe vivir directamente sobre el degradado global del hero. CSS activo: `task-1345-hero-factory-original-motion-v17`; restaura el sentido original de produccion continua con path `M110 92 C 210 170, 110 310, 300 430`, mini-sites clonados que se ensamblan/viajan desde debajo del motor y badges finales `Humano`/`Agente`. La estacion fija, signal pills y process nodes se quitaron del DOM para que no parezca una linea desconectada. Visual equilibrado contra el bloque izquierdo (desktop `541x634`, mobile `310x347`), sin header/wrappers. Backups recientes: `_gh_backup_before_task1345_hero_factory_detail_v15_20260706T123435Z`, `_gh_backup_before_task1345_hero_factory_detail_v16_20260706T124314Z`, `_gh_backup_before_task1345_hero_factory_original_motion_v17_20260706T125330Z`; evidencia live en `.captures/task-1345-hero-factory-original-motion-v17/`.
- **Public Site `/desarrollo-sitios-web/` — seccion `dos visitantes` premium compacta (TASK-1345, 2026-07-05):** la seccion post-hero `sig` vive como `sig-premium` con `data-capture="two-visitors"` y comunica el doble lector humano/agente. Contrato visual: CSS solo scoped a `.gh-v11 .sig...`; no usar la seccion para controlar header/wrappers Ohio. Contrato tipografico: solo el H2 display usa tracking compacto `letter-spacing:-.045em` y el `em` teal lo hereda; body/chips/cards/labels/proof quedan `normal/0`. Backups recientes de rollback: `_gh_backup_before_task1345_premium_two_visitors_section_20260705T221607Z` y `_gh_backup_before_task1345_premium_two_visitors_section_20260705T221818Z`; evidencia live en `.captures/task-1345-two-visitors-premium/`.
- **Public Site `/desarrollo-sitios-web/` — seccion `como trabajamos` premium enterprise (TASK-1345, 2026-07-06):** la seccion `how` vive como `how-premium` con `data-capture="method"` y CSS `task-1345-method-premium-v1`. Corrige el contraste del bloque oscuro (H2 blanco), deja tracking `normal/0` en titulo y cards, y presenta el metodo IDD como sistema enterprise con cards de fase + callout `La sala de maquinas`. CSS solo scoped a `.gh-v11 .how.how-premium...`; no usar la seccion para controlar header/wrappers Ohio. Backup rollback: `_gh_backup_before_task1345_method_premium_v1_20260706T023637Z`; evidencia live en `.captures/task-1345-hero-method-premium-v8/`.
- **Public Site `/desarrollo-sitios-web/` — CTA intermedio + niveles AI-ready premium (TASK-1345, 2026-07-06):** el CTA vive como `strip-premium` con `data-capture="architecture-cta"` y la seccion de madurez como `levels-premium` con `data-capture="ai-ready"` y CSS `task-1345-levels-premium-v1`. Mantiene el framework Efeonce de cinco niveles (`Be Found`, `Be Readable`, `Be Correct`, `Be Actionable`, `Be Intrinsic`) como maturity model, con guardrail de copy: `Be Intrinsic` es trayectoria/preferencia ganada, no garantia inmediata. CSS solo scoped a `.gh-v11 .strip.strip-premium...` y `.gh-v11 .levels.levels-premium...`; mobile reserva gutter interno derecho para que el switcher flotante Ohio no tape microcopy, sin tocar widgets globales/header/wrappers. Backups recientes: `_gh_backup_before_task1345_levels_premium_v1_20260706T040046Z`, `_gh_backup_before_task1345_levels_premium_v1_20260706T040351Z`, `_gh_backup_before_task1345_levels_premium_v1_20260706T041019Z`; evidencia live en `.captures/task-1345-levels-premium-v1-final/`.
- **Think UI pattern docs (2026-07-05):** `docs/think/` queda como paquete canonico para patrones publicos del satelite Think. Documenta el patron de la landing Brand Visibility: hero inmersivo, form dock gobernado por Growth Forms, framework Efeonce por capas, preview de informe, jerga SEO/AEO equilibrada y checks visuales local/live. Regla dura: Think presenta; Greenhouse calcula. No crear form local, proxy CORS, validacion ni submit paralelo en Think.
- **AI image generation durable workflow (2026-07-05):** `pnpm ai:image` soporta edición con referencia por `--image` para consistencia de personaje/asset, y `pnpm ai:image:rmbg` remueve fondo con matting AI local. Las generaciones durables versionables viven en `ai-generations/` con README + manifest + índice; `.captures/` queda para evidencia efímera. Skills Codex/Claude `greenhouse-ai-image-generator` documentan el patrón y el primer ejemplo versionado es `ai-generations/2026-07-05_nexa-fallback-characters/`.
- **TASK-1327 Brand Visibility live end-to-end (2026-07-05):** `https://think.efeoncepro.com/brand-visibility` usa el Growth Form real `formKey=69cd5269-5f97-4d32-99c4-0b23f41aa2f5`, `surface=fhsf-ai-visibility-grader`, sin formulario local ni proxy Astro. Contrato operativo: submit gobernado → `gh_form_submission_accepted` con `status_url` → outbox `growth.forms.submission_accepted` → consumer `growth_grader_run_from_submission` crea `grader_lead`/`grader_run` → status CORS devuelve `reportToken` → Think abre `/brand-visibility/r/<token>`. Root causes cerrados: Turnstile `size:"invisible"` inválido, status CORS y categoría pública no mapeada (`Agencia o consultoria de crecimiento`) que bloqueaba el consumer.
- **TASK-1341 DataForSEO / Google AIO runtime guard pendiente (2026-07-05):** el modo público `light` solicita `google_ai_overview`, pero runs recientes pueden quedar `partial` porque `ops-worker` es el runtime async efectivo y puede faltar `DATAFORSEO_API_LOGIN`; Vercel env por sí solo no basta. `missing_secret` es drift de configuración; `no_ai_overview_block` es skip honesto válido. Claude/Anthropic no aparecer en public `light` no implica fallo: esa policy lo excluye por costo/UX.
- **Growth CTA & Popup Engine direction accepted (2026-07-04):** Greenhouse tendrá un motor enterprise de CRO bajo `growth.cta` para CTAs, banners, slide-ins, popups, floating CTAs y embeds en Greenhouse, sitio público, Think y superficies futuras. Contrato: Greenhouse owns definitions/versioning/targeting/suppression/priority/action routing/event ledger; renderer portable no-iframe por defecto para preservar `dataLayer`/GTM del host; Growth Forms/ebooks/Think tools/HubSpot Meetings/CRM son actions/destinations, no source of truth; telemetry sin PII y experimentación con guardrails estadísticos. Docs canónicos: `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md` y `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`; programa formal `docs/epics/to-do/EPIC-023-growth-cta-popup-cro-engine.md`. No hay runtime/tasks/deploy todavía.
- **AI Visibility public report final (TASK-1331/TASK-1334, released 2026-07-04):** el informe user-facing vive en `efeonce-think` (`https://think.efeoncepro.com/brand-visibility/r/<token>`) y Greenhouse es SSOT del view-model. Contrato productivo: `GET /api/public/growth/ai-visibility/report/[token]` devuelve `modelVersion="1.1.0"` + `model.viewFacts` para Share of Model/engine coverage, citation totals globales, benchmark competitivo, sentiment/readiness/dimension/share facts y `levels[].isNext`; `citationSourceBreakdown.classificationTotals` mantiene totales globales aunque el render muestre top-N. Think sólo renderiza y mantiene fallback para snapshots viejos; no debe reconstruir semántica del informe. Desde TASK-1334, Think renderiza `categoryTaxonomySummary` con estados `mapped|needs_review|unknown|legacy/malformed`, sin labels internos, sin `NaN` y con smoke productivo real mapped/unknown en 1440/1280/390. Precedente documentado en manual, ADR, docs funcionales y skills Codex/Claude relacionadas con mockup, SEO/AEO, growth/CRO y QA.
- **Public Site About `/about-us-efeonce/` — fixed-widget gutter fixes live (2026-07-03):** la landing `page_id=249770` quedó registrada en las skills Codex/Claude de `efeonce-public-site-wordpress` (`references/landings/about-us-efeonce.md`). Diagnóstico: varias secciones reutilizan composiciones full-bleed/off-home del Home, pero sus reglas base están scopeadas a `body.home/front-page`; el switcher fijo Dark/Light y el buscador Ohio podían tapar contenido en desktop. Fix versionado y publicado en Kinsta desde `efeonce-public-site-runtime/wp-content/themes/ohio-child/assets/css/global-fixes.css`: (1) módulo Loop Marketing `59385ab` con gutter izquierdo `clamp(60px, 4.5vw, 80px)`, gutter derecho `clamp(24px, 3vw, 56px)` + `overflow-x: clip`; (2) módulo "Ecosistema tecnológico" `af43bed`, gutter solo al carril izquierdo `eb5c55f` para no mover el sticky derecho `d93f52c`. Kinsta cache purgada; Playwright live sin CSS inyectado confirmó `overlap=false` en desktop y mobile 390 sin heredar gutters.
- **Public Site About `/about-us-efeonce/` — hero copy refresh live (2026-07-03):** hero Elementor `6e46dcc` actualizado por `Document::save()` para alinear el About de la agencia a la tesis de marca: video `Ver cómo operamos`, H1 `El crecimiento real / no se compra por partes. / Se orquesta.`, bajada sobre creatividad/medios/CRM/data/tecnología como sistema operativo de crecimiento, y proof point `120+ Empresas atendidas`. Backup de rollback `_gh_backup_before_about_hero_copy_20260703T042409Z`; protegidos `_thumbnail_id=249769` y Ohio featured background; Kinsta cache purgada; Playwright live desktop/mobile confirmó copy nuevo y ausencia de `hola`/`Play Video`.
- **Public Site About `/about-us-efeonce/` — hero proof strip from AEO live (2026-07-03):** el bloque de counters del hero (`831f50d`) fue reemplazado por el componente de prueba de AEO (`greenhouse_logo_marquee` + `BrandProofAvatarGroup`) como `abproof`/`abplogo`/`abpmeta`, sin el título AEO. Se agregó variante dark page-scoped en `efeonce-public-site-runtime/wp-content/themes/ohio-child/assets/css/global-fixes.css`: logos claros/ice sobre fondo azul, pill frosted, respiración inferior desktop y mobile safe area. En mobile About, solo `body.page-id-249770 .elementor-element-abproof` oculta el marquee y deja el pill compacto para no chocar con el CTA ni con el widget Ohio fijo; AEO `/aeo-2/` conserva marquee y pill base. Backup Elementor `_gh_backup_before_about_hero_proof_strip_20260703T043325Z`; backups CSS remotos `global-fixes-before-about-hero-proof-strip-20260703T043541Z.css`, `global-fixes-before-about-hero-proof-dark-20260703T043711Z.css`, `global-fixes-before-about-hero-proof-bottom-space-20260703T044125Z.css`, `global-fixes-before-about-hero-mobile-safe-20260703T044948Z.css`, `global-fixes-before-about-hero-mobile-safe-tune-20260703T045056Z.css`, `global-fixes-before-about-hero-mobile-pill-only-20260703T045217Z.css` y `global-fixes-before-about-hero-mobile-pill-width-20260703T045332Z.css`; Kinsta cache purgada; hash CSS live/local final `181e90eb28299adc2c8465c6c456dd49ac0094bc836632068d837e22e515dbc1`. Playwright live confirmó 21 logos/counters removidos en desktop About, mobile About sin overlap con CTA/widget, AEO mobile+desktop sin cambios de marquee/pill. `BrandProofAvatarGroup` ya tiene segundo consumidor; graduación a widget/opción gobernada queda recomendada si se expande.
- **Kortex HubSpot CMS / ANAM Content Hub (2026-07-02):** el acceso OAuth de Kortex al portal ANAM `19893546` esta activo y documentado en `docs/architecture/kortex/hubspot-cms/anam-portal-access.md`. Para landing pages, CMS Pages API, modulos, CMS React, Developer Projects y CLI, usar `docs/architecture/kortex/hubspot-cms/` como carpeta canonica. Frontera obligatoria: no usar/rotar `hubspot-access-token` del bridge Greenhouse para CMS Kortex; Pages API siempre draft-first; publish/schedule/archive/delete/reemplazos solo con aprobacion explicita. Si se requiere subir assets con HubSpot CLI, agregar un perfil ANAM adicional sin reemplazar el perfil Efeonce.
- **Kortex / ANAM chat landing CMS React live (2026-07-03):** la landing `https://anam-2.hubspotpagebuilder.com/agente-anam` esta live desde HubSpot Developer Project `kortex-cms-react` (`projectId=103589049`, `deployedBuildId=19`) y documentada en `docs/architecture/kortex/hubspot-cms/anam-chat-landing.md`. UX final: canal oficial de atencion, CTA `Iniciar chat`, categorias `Cotizar / Consultar servicio / Enviar requerimiento / Revisar seguimiento`, navy ANAM como primario y teal como acento; no usar copy visible tipo `widget de HubSpot`. Operacion: usar `hs project validate/upload --profile anam`, mantener default CLI en Kortex/Efeonce; publish por API requiere scopes `content` + `content.landing_pages.write`.
- **Growth Forms `tokenized_report` submit→report handoff (TASK-1336, 2026-07-04, code-complete/rollout-pendiente):** el `successBehavior.kind='tokenized_report'` es un **handoff auto-descriptivo** hacia un reporte servido por token (lead magnet EPIC-020). Config browser-safe `successBehavior.tokenizedReport.statusPathTemplate` (ruta relativa bajo `/api/public/` con `{handle}`, validada como leak boundary en `successBehaviorSchema`) viaja en el render contract; al aceptar el submit el renderer resuelve la URL absoluta contra `api.baseUrl` y emite `run_handle`+`status_url` (escalares allowlisted) en `gh_form_submission_accepted`. El host hace poll a `GET /api/public/growth/ai-visibility/run/[handle]` (bounded, read-only) → `reportToken` sólo en `ready` → `/brand-visibility/r/<token>`. Reusa todo el backbone (submissionId como handle async-safe, `readPublicGraderRunStatus`); el submit NUNCA trae status/token. Activación gobernada reversible `pnpm growth:forms:activate-grader-tokenized-report` (dry-run + guard runtime, clone→publish→deprecate). Contrato transversal en `docs/architecture/growth-public-forms-runtime-contract.md` → §Tokenized Report Handoff. Desbloquea el contrato de TASK-1327; smoke browser real pendiente de rollout (activación del form + renderer bundle en prod + TASK-1335 CORS Think). NO toca scoring/probes/normalizer.
- **Growth Forms Success Card renderer (TASK-1320/AEO v16, 2026-07-03):** el renderer portable soporta `successBehavior.presentation='success_card'` para reemplazar el form tras `accepted` por una card in-card con foco accesible, support note, actions, telemetry allowlisted y CSS `ghf-success-card`. La capacidad es transversal a TODO Growth Form; AEO `/aeo-2/` es primer consumidor, NO owner. Estado operativo actual: AEO publica v16 `fver-bfc40c59-8d95-4d38-8ae5-0da7dc4ab468` con `steps=[]`, copy `Tu informe de visibilidad va en camino.`, CTA `Agenda una reunión`, party-popper SVG generado con Recraft V4.1 y renderer source con mark/motion/calendar schedule icon. Los markers live `gh-aeo-success-card-*` y `gh-aeo-readiness-centered-v1` son bridge WordPress temporal; no copiarlos a otros forms sin graduar el patrón al renderer.
- **Public Site AEO `/aeo-2/` — aprendizaje operacional documentado (2026-07-02):** la sesion de polish/copy/CTA/form quedó codificada en `.codex/skills/efeonce-public-site-wordpress/references/landings/aeo.md`, `.claude/skills/efeonce-public-site-wordpress/references/landings/aeo.md`, `references/elementor-mutation.md` y `docs/documentation/public-site/aeo-landing-elementor.md`. Invariantes clave: diagnosticar visualmente marquees/logos con capturas y bounding boxes, no solo DOM/gap; `_element_id=diagnostico` es el anchor real del formulario; `heroans` sigue protegido por hash; `wp_unslash()` solo como fallback al leer Elementor JSON; title accent spans heredan tracking solo en H1/H2; no acumular margenes header+contenido; FAQ visible y JSON-LD se actualizan juntos; `convers` usa Growth Forms v16 y todos los CTAs externos van a `#diagnostico`.
- **Public Site primitives registry (2026-07-02):** las primitives reutilizables del sitio publico ya tienen registro canónico propio en `docs/architecture/public-site/PRIMITIVES.md`, separado del UI Platform privado (`docs/architecture/ui-platform/PRIMITIVES.md`). El registro cubre `ComparisonTable`, `GrowthFormEmbed`, `LogoMarquee` y el pattern AEO `BrandProofAvatarGroup`. Para `efeoncepro.com`, usar ese registry antes de crear HTML/CSS local repetible; runtime owner principal = `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets`; si `BrandProofAvatarGroup` se reutiliza fuera de AEO, debe graduar a widget `greenhouse_brand_proof_group` o a opción gobernada de `greenhouse_logo_marquee`.
- **Public Site AEO `/aeo-2/` — conversion form v16 live (TASK-1318/TASK-1320 follow-ups, 2026-07-03):** el widget `convers` usa `<greenhouse-form form-key="b120566a-dd1a-43c8-956a-4e0121e805b8" surface="fhsf-efeonce-aeo-diagnostic">` con Growth Forms v16 `fver-bfc40c59-8d95-4d38-8ae5-0da7dc4ab468`, `style_variant=diagnostic_premium`, CTA submit `Empezar con mi diagnóstico →`, field visible `fullName` label `Nombre completo` con placeholder `ej. María González`, `autocomplete=name`, placeholders `Selecciona tu país` / `Selecciona un rango`, Turnstile/destino preservados y Success Card `presentation='success_card'`. `submitForm` deriva server-side `firstName`/`lastName` mediante `validation_schema.namePolicy.split_full_name` antes de entregar a HubSpot (`firstname`/`lastname`) y no expone mapping al browser. El root de conversión renderiza `id="diagnostico"` y los CTAs Ohio externos al formulario (`herobut`, diagnóstico y FAQ) apuntan a `#diagnostico`; el submit del renderer sigue como `<button type="submit">`. El card público empieza directamente con los campos; no restaurar el H3 interno `Solicita tu diagnóstico AEO` salvo pedido explícito. Gates vigentes: `pnpm public-website:verify-aeo-live-contract`, `pnpm public-website:verify-aeo-wordpress-guards` y guard server-side `pnpm growth:forms:verify-aeo-full-name-destination-contract` cuando ADC esté disponible.
- **Public Site AEO `/aeo-2/` — why proof/logo marquee y tracking guard (2026-07-02):** en `Por qué nosotros`, el bloque vigente `why5421` mantiene el proof `Marcas que ya confían en nosotros` separado del panel navy, con `greenhouse_logo_marquee` (`whylogom`) usando 7 logos únicos (`sky`, `anam`, `gobierno-santiago`, `berel`, `carozzi`, `bresler`, `marca-chile`) en 3 sets idénticos/21 nodos, viewport desktop 1160px dentro de wrapper 1200px, set ~1218px, gap visual/fase ~55px, fades laterales y reduced-motion sin animación/duplicados. El meta inferior es un proof row tipo `TeamAvatarGroup` con discos solapados en color de Berel, Sky y Bresler + un cuarto disco claro/frosted `+90` detrás de Bresler, con count slate renderizado por `::after` en DM Sans para que quede legible en la porción visible del disco, y `Chile · Colombia · México · Perú` con ícono flat de mundo; no volver a `+120 marcas - 4 países`, mono/dashed boxes, fondo navy para el count ni texto grande pegado al borde. Guardrail tipográfico: los acentos internos de títulos display (`herotit`, `levelsh`, `serviceh`, `whyhead`) deben heredar el tracking del H1/H2 padre; no dejar spans de acento en `letter-spacing: normal`. H3 internos, labels, proof y body quedan `letter-spacing: normal/0`. Verificar con captura desktop 2048/mobile 390 y fases pausadas, no solo DOM/gap CSS.
- **Codex TASK hook + goal preflight + subagentes explícitos (2026-06-29):** antes de ejecutar una `TASK-###`, si el operador no dio `/goal` explícito, Codex debe proponer un `/goal` recomendado y esperar confirmación; con `/goal` ya entregado, continúa al hook. `pnpm codex:task-hook` acepta `--subagents` (combinable con `--develop`) para registrar autorización explícita del operador a usar subagentes. El prompt canónico `docs/operations/CODEX_EXECUTION_PROMPT_V1.md` ahora incluye `GOAL PREFLIGHT` y `SUBAGENT TOOLING`: durante Discovery Codex debe decidir `sequential` vs `fork`; si el operador autorizó subagentes, cargar `multi_agent_v1` vía `tool_search`, delegar sólo slices independientes con ownership exclusivo y consolidar/verificar; si la task amerita fork pero no hay autorización/tooling, registrar `fork recomendado, no autorizado/no disponible` en Audit/Plan. `pnpm codex:task-hook:check` valida que este contrato no desaparezca.
- **Skill `seo-aeo` vigente en Codex (2026-06-28):** Codex ahora tiene espejo local de la skill global Claude `/Users/jreye/.claude/skills/seo-aeo` en `.codex/skills/seo-aeo/`. Usarla para trabajo SEO + AEO/GEO/AI Visibility: SEO técnico, contenido/topical authority, E-E-A-T/entity, Query Fan-Out, citabilidad, `llms.txt`, Share of Voice IA, exactitud/alucinación, medición y el framework Efeonce de 5 niveles (`Be Found · Be Readable · Be Correct · Be Actionable · Be Intrinsic`). La copia Codex mantiene módulos/templates/overlay Efeonce y agrega nota operativa: Semrush MCP solo si está callable; para frescura usar browsing Codex/WebSearch y fuentes primarias.
- **UI Wireframes + Flow + Motion + Readiness Contracts como gate de diseño (2026-06-27):** todo trabajo de UI nuevo/material debe crear o registrar un wireframe en `docs/ui/wireframes/` antes de JSX cuando la surface sea nueva, visible, reutilizable, client/public/executive-facing, tenga copy/estados relevantes, charts/reportes/PDF/email o venga de Product Design. El wireframe es contrato de contenido/interacción (asset visual, layout skeleton, copy ids, estados, a11y/chart fallbacks, GVC markers y primitive/adapters mapping), no segundo diseño visual. Si la UI abre sidecar/drawer/modal/popover o conecta pantallas/rutas, crear un flow contract en `docs/ui/flows/` (secuencia, routing, foco, comandos y recovery). Si introduce motion/microinteracciones no triviales, crear un motion contract en `docs/ui/motion/` (timing, feedback, reduced motion y evidencia micro). Tasks UI deben declarar `UI ready: no|yes|n/a`: `no` por defecto; `yes` solo cuando el wireframe y `## UI/UX Contract` tienen implementation mapping, GVC scenario plan y design decision log, y `pnpm task:lint --task TASK-###` pasa sin findings. Templates: `docs/ui/wireframes/WIREFRAME_TEMPLATE.md`, `docs/ui/flows/FLOW_TEMPLATE.md`, `docs/ui/motion/MOTION_TEMPLATE.md`. Tasks UI deben declarar `Wireframe`; tasks `UI impact: flow` deben declarar `Flow`; tasks `UI impact: motion` deben declarar `Motion`. `pnpm task:lint --changed`, `pnpm ui:wireframe-check --task TASK-###`, `pnpm ui:flow-check --task TASK-###`, `pnpm ui:motion-check --task TASK-###` y `pnpm ui:readiness-check --task TASK-###` validan existencia/readiness. Regla canonizada en `AGENTS.md`, `CLAUDE.md` y skills UI/task-planner locales.
- **Growth Search Console connection — OAuth multi-tenant per-org (TASK-1282, 2026-06-28, code-complete dev; rollout pendiente):** nuevo dominio backend `src/lib/growth/search-console/**` para que cada organización cliente conecte SU propiedad Google Search Console vía **OAuth 3-legged**, **token por-org** (el token ES el scope, mirror Notion per-cliente). El refresh token vive en **Secret Manager** (`search-console-token-<org>`), NUNCA crudo en PG; metadata + `token_secret_ref` en `greenhouse_growth.search_console_connections` (UNIQUE por org); state OAuth firmado **single-use** anclado a la org server-side (`search_console_oauth_states`) anti-CSRF/confused-deputy. Primitive gobernado (Full API Parity): commands `start/complete/disconnect` + reader canónico `readSearchConsoleAnalytics(orgId, …)` con honest degradation (`invalid_grant`/403 → `revoked` + signal `growth.search_console.token_unhealthy`). Routes admin `oauth/{start,callback}` (dual-gate + capability `growth.search_console.connect`); lane admin v1 conecta en nombre del cliente (org horneada en el state, NUNCA del browser); client-portal self-service = TASK-1283. Flag `GROWTH_SEARCH_CONSOLE_ENABLED` default OFF. **NUNCA** persistir el token crudo en PG ni leerlo sin scope por `organization_id`; **NUNCA** pedir scopes de escritura (sólo `webmasters.readonly`). Rollout pendiente (out-of-band): OAuth client + verificación consent screen Google + ampliar grant IAM secret-write de `greenhouse-portal@` al prefijo `search-console-token-*`. Invariantes/patrón en `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` §Delta 2026-06-28 (TASK-1282).
- **Growth AI Visibility Grader — async run execution worker (TASK-1234, 2026-06-24, code complete dev; rollout pendiente):** la ejecución de un run pasó de inline-en-route Vercel a un **worker async Cloud Run** (patrón TASK-773). El run-engine se descompuso en `enqueueGraderRun` (crea `pending` + `execution_prompts` persistidos) → claim atómico `claimPendingGraderRuns` (`FOR UPDATE SKIP LOCKED`, la transición `pending→running` ES el claim, sin doble ejecución) → `executeClaimedGraderRun` (**persistencia incremental por observación** → crash/timeout mid-run no pierde evidencia) → `drainPendingGraderRuns` (worker) + `recoverStuckRunningRuns` (huérfanos `running` recomputados desde sus observations). Endpoint worker `POST /growth/grader/drain` (ops-worker) + Cloud Scheduler `ops-growth-grader-drain` (*/5, batchSize=1); worker `TIMEOUT` 540→3600s (el run `full` corre dentro del request). El endpoint admin hace cutover inline→enqueue (202+runId) detrás del flag `GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_ENABLED` (default OFF); `GET /runs/[runId]` = poll. Migración aditiva `grader_runs.execution_prompts`. 2 signals nuevos (`run_execution_lag`/`run_stuck_running`). **NUNCA** ejecutar runs lentos/grandes inline; **NUNCA** persistir observations en bloque; **NUNCA** importar `@core` en el código worker-bundled. Invariantes en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` §Delta 2026-06-24 (TASK-1234). Rollout pendiente: deploy ops-worker staging + flip flags + smoke real `full`.
- **Growth AI Visibility Grader — normalization + scoring engine (TASK-1227, 2026-06-24, complete dev):** 2.º bloque del motor sobre la fundación de 1226. `provider_observations` → `normalized_findings` (normalizer **determinista-first** con desambiguación por dominio + hook LLM aislado `generateStructuredAnthropic` flag `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED` default OFF) → `grader_score` v1 (`ai_visibility_score_v1`, 7 dims, pesos arch V1 hipótesis). **NUNCA un LLM asigna el score** (determinista, versionado, recomputable desde findings). Gates: `insufficient_data` (cobertura) + `review_required` (riesgoso/negativo-baja-confianza, conservador); `auto_releasable` siempre false. Tablas `greenhouse_growth.{normalized_findings,grader_scores}`; primitive `scoreGraderRun`; endpoint admin interno `POST /runs/[runId]/score` (sin ruta pública). DTO public-safe sin raw text. Golden eval (1228) de no-regresión + 5 signals. Invariantes en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` §Delta. Desbloquea report builder / admin review / HubSpot handoff (follow-ups).
- **Growth AI Visibility Grader — provider adapter foundation (TASK-1226, 2026-06-24, code complete dev; rollout real-provider pendiente):** nació el dominio backend `growth.ai_visibility` (`src/lib/growth/ai-visibility/**`) con **Full API parity de nacimiento**. El primitive canónico server-side es `executeGraderRun`/`runGraderDiagnostic`; TODO consumer (UI pública, admin, Nexa/MCP, report builder, HubSpot handoff) lo invoca — **NUNCA** llama providers directo. Provider set: OpenAI/Anthropic/Perplexity/Gemini tras flags `GROWTH_AI_VISIBILITY_*_ENABLED` (default OFF), reusando los clientes canónicos `src/lib/ai/*` (nuevos `openai.ts`/`perplexity.ts`; `anthropic.ts`/`google-genai.ts` extendidos) — **NUNCA** SDK paralelo ni fetch crudo en el dominio. Fake adapter determinista = default sin secretos (skip limpio: `grader_disabled`/`provider_disabled`/`missing_secret`). Schema `greenhouse_growth` (grader_profiles/prompt_packs/grader_runs/**provider_observations append-only**); evidence ≠ business truth (score/report = TASK-1227). Capability `growth.ai_visibility.{run.execute,observation.read}`; 4 reliability signals; endpoint interno `/api/admin/growth/ai-visibility/runs`; smoke `pnpm growth:ai-visibility:smoke`. Rollout pendiente: secrets de provider + flags staging (uno por vez) + smoke real (gcloud auth). Invariantes en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`.
- **Growth SEO Module — "Search Visibility 360" (EPIC-022, 2026-07-01, PLAN autorado; NO implementado):** módulo SEO **complementario** al AEO grader — dominio `growth.seo`, hermano de `growth.ai_visibility`. Responde el lado clásico (Google orgánico: rankeo, click, evolución en el tiempo) que el AEO no mide, apalancando **DataForSEO** (ampliar `src/lib/ai/dataforseo.ts`, hoy candado a `/v3/serp/`, a un **allowlist cerrado de 5 familias** serp/labs/onpage/backlinks/domain con breaker+cost por familia) + **Search Console per-org** (TASK-1282, Berel ya conectado). Serie temporal **append-only por `capture_date`** (PG ventana caliente ~180d + BQ historia; de paso materializa GSC, que hoy es read-through sin historia >16 meses). **Boundary duro contra AEO:** se cruzan SOLO por `organization_id` en un derived read (`readSeoAeoGap` → quadrant 360), **NUNCA** merge de tablas/FK cross-motor ni promedio de métricas (rankear #1 y ser citado 0× por IA es señal, no bug). Entitlement `growth.seo.*` **per-org via `module_assignments`** (NO por rol — lección TASK-1248), 4 puertas, chokepoint `enforceSeoRunEntitlement` con **quota cap por-org** (gate de costo DataForSEO = riesgo #1). Feature ancla = **evolución de URLs en el tiempo**. Comercial: capacidad-del-servicio + puerta contratada (NO standalone); AEO=punta de embudo, SEO=profundidad recurrente (NRR bowtie). Programa: 12 tasks `TASK-1299..1310` (backend-data 1299-1305 → ui-ux 1306-1310); camino min-costo/max-valor `1299→1302→1306→1307` (dashboard temporal casi sin gasto DataForSEO). Todo gated por `GROWTH_SEO_ENABLED` (default OFF). Docs: ADR `GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md` + `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` + `EPIC-022`. Gotchas para implementar: **ECharts no instalado** (repo usa ApexCharts+Recharts; instalar `echarts-for-react` = Slice 0 de TASK-1307); anti-mutation trigger de 1299 vs UPSERT de rank de 1303 → resolver con `ON CONFLICT DO NOTHING` (first-write-wins por `capture_date`); `CustomChip`/`CustomAutocomplete` no existen → `GreenhouseChip` + `@core/components/mui/Autocomplete`.
- **Growth Public Forms Engine (2026-06-24 arquitectura aceptada; runtime VIVO desde 2026-06-25):** Greenhouse debe controlar formularios públicos/lead magnets desde el dominio `growth`, con form definitions/versiones/render contracts/submissions/consent/destination attempts como SoT Greenhouse y HubSpot como destination adapter. V1 nace con `hsforms-v3-secure-submit` porque al 2026-06-24 no se validó un endpoint date-versioned estable para submissions; queda encapsulado como `endpointStatus=legacy_supported` + `migrationTarget=date_versioned_forms_submission_api_when_available`. Astro/WordPress/public site consumen Greenhouse (`/api/public/growth/forms/**` futuro), nunca HubSpot directo. Cada versión publicada declara `form_kind`, `risk_profile`, `data_classes`, `destination_policy`, `persistence_policy`, `analytics_policy`, `upload_policy` cuando aplique y boundary de acción de negocio; `quote_request`, `pricing_simulation`, `document_upload`, `diagnostic_intake` y `preference` no pueden colarse como writes comerciales/financieros implícitos. Backend = `policy compiler + submission orchestrator` que emite `render_contract`, `submission_contract` y `destination_plan`; la UI se condiciona por policy/propósito, no por HubSpot/vendor/destino. WordPress/Astro/Greenhouse Next.js son `host_surface`/`render_surface` consumidores; HubSpot es `destination`. Primer consumer WordPress con core portable Web Component/custom element y wrapper fino; Astro debe poder renderizar la misma definición/versión sin cambiar mapping/destinos. El renderer NO nace como iframe: debe vivir en el DOM del host para que GTM/dataLayer mida en la pagina padre; iframe solo fallback `measurement_degraded` con bridge `postMessage` allowlisted y sin PII/raw values. Full API parity es requisito de nacimiento: public render/submit APIs, Product APIs, commands/readers, Nexa/MCP/CLI/ops path plan antes de declarar completa cualquier UI/wrapper. Docs: `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md` + `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`. **Runtime ya existe:** backend/API parity (TASK-1229) + adapter HubSpot secure-submit (TASK-1230) + **renderer portable + 3 host surfaces (TASK-1231)** + **Turnstile `captchaToken` parity del renderer (TASK-1294)** + **identidad estable `formKey` (TASK-1297)** + **AEO renderer premium live (TASK-1298)**. El renderer es el Web Component `<greenhouse-form>` en `src/growth-forms-renderer/**` (vanilla TS, light DOM + ElementInternals; build `pnpm renderer:build` → `public/growth-forms/renderer-<channel>.js`); host surfaces = preview Greenhouse `/design-system/growth-forms-renderer`, widget Elementor WordPress (`efeonce-public-site-runtime`) y wrapper Astro (`efeonce-web`). Wrappers = adapters finos: NUNCA alteran campos/validación/destinos. Público gated por `GROWTH_FORMS_PUBLIC_API_ENABLED` (ON staging; producción activa para AEO `/aeo-2/`). AEO live usa `<greenhouse-form form-key="b120566a-dd1a-43c8-956a-4e0121e805b8">`, versión v6 `fver-9ec43a66-5372-45b7-829d-2c9e6381e27d`, `styleVariant=diagnostic_premium`, `copy.submit`, placeholders/listbox premium, `corporate_email`, `emailPolicy.block_field` y `ui_policy_json.security.captcha`. Gate durable: `pnpm public-website:verify-aeo-live-contract`.
- **Growth Forms en WordPress Ohio — host layer compartida (2026-07-01, live scoped rollout):** para no pelear cada landing contra estilos globales Ohio, Kinsta ya carga la capa child-theme compartida `wp-content/themes/ohio-child/assets/css/growth-forms-host.css`, enqueued como `ohio-child-growth-forms-host` desde `inc/enqueue-and-layout.php`. Rollout acotado aplicado a esos dos archivos; backup remoto `/tmp/greenhouse-growth-forms-host-layer-20260701T103729Z`; hashes repo/live sincronizados y `pnpm public-website:verify-aeo-live-contract` verde. Scope: `.eo-growth-form`, `.gh-growth-form-host`, `.gh-aeo-growth-form-host`, `.gh-aeo-growth-form-card` + `<greenhouse-form>`. La capa solo da contencion, tokens genericos y hardening de controles `.ghf-*`; NUNCA contiene fields, validacion, mapping HubSpot, Turnstile, destinos ni copy contractual. El control-plane de public site ahora incluye `eo-elementor-widgets` en export/binding gobernado; reporte vigente `docs/operations/public-site-drift/drift-2026-07-01T10-54-46-557Z.json` queda `fullRepoDeploySafe=true` (`content_drift=0`, `repo_pending_release=0`, `live_untracked_file=0`) y runtime repo limpio en `1d36d51`. Las skills Codex/Claude `efeonce-public-site-wordpress` y `greenhouse-growth-forms` ya reflejan este estado y los nuevos guardrails (`form-key`, no HubSpot `formGuid` en browser, AEO strict gate, gates proporcionales, Turnstile/copyRefs/HubSpot form-definition sync). Un deploy productivo completo igual requiere decision/release explicita.
- **Public Site AEO conversion renderer visual contract (2026-07-01):** en `/aeo-2/`, la separación visual del bloque de conversión vive en `.gh-aeo-conversion` como banda clara propia; `.gh-aeo-form-card` es solo host Elementor transparente y `.gh-aeo-growth-form-card` es la única card visible. No exponer kickers o metadata interna tipo `Growth Forms · Diagnóstico AEO` en la landing pública. TASK-1298 quedó live: WordPress `convers` contiene `<greenhouse-form>` por `form-key`, no bridge; `heroans` estable; backup `_gh_backup_before_aeo_1298_premium_renderer_20260701T065707Z`; Kinsta purgada. El renderer `diagnostic_premium` usa pares desktop `Nombre`/`Email` y `País`/`Tamaño`, campos largos full-width, single-select combobox/listbox custom, shadow/focus/CTA hover tokenizados, first-click submit protegido contra blur layout shift y mobile 390 one-column. Gate durable: `pnpm public-website:verify-aeo-live-contract`, que valida WordPress, API v6, tipografía, visual desktop/mobile, dropdowns, focus/ARIA, email gate, Turnstile `captchaToken` boundary y dataLayer no-PII.
- **Public Site AEO post-hero visual contract (2026-06-30):** en `/aeo-2/`, no tocar el hero para corregir ritmo de secciones. De `market` a `FAQ`, los eyebrows son widgets Ohio `ohio_badge` (`.gh-aeo-eyebrow-badge` → `.ohio-widget.badge.-outlined`), sin líneas/pseudo-elementos. En conversión, el H2 y el título interno `Solicita tu diagnóstico` deben computar `letter-spacing:-0.045em`; lead/labels/inputs/CTA/trust quedan `normal/0`. Este drift es frecuente cuando se toca el bridge porque reglas `!important` o `.gh-aeo-growth-form-card *{letter-spacing:0}` pueden pisar el título; verificar computed style desktop/mobile, no solo CSS estático. Gate durable: `pnpm public-website:verify-aeo-prelive-contract`. Contrato y evidencia: `docs/documentation/public-site/aeo-landing-elementor.md`.
- **Public Site landing Playwright/Webwright operating rule (2026-06-30):** para cualquier trabajo visual en landings WordPress/Elementor públicas, cargar `greenhouse-gvc-playwright` aunque no haya ruta GVC local. Se importa la disciplina de Microsoft Webwright (observación antes de autorar, locators reales, timeouts por capas, graceful degrade y computed-style probes). En el entorno Codex local quedó instalado `webwright@webwright-local` + runtime Python Playwright Firefox/Chromium; úsalo cuando aporte exploración browser multi-step o scripts de observación reutilizables. Mutaciones siguen por WordPress/Elementor gobernado; evidencia obligatoria desktop/mobile 390 + overflow + computed styles/estados relevantes vía GVC/Playwright durable.
- **Growth Forms Admin Cockpit (TASK-1232, 2026-06-25 code-complete / migración AEO pendiente):** existe la ruta interna `/admin/growth/forms` y navegación top-level **Growth** → **Forms** con `viewCode=administracion.growth_forms`. Es un command center enterprise sobre `getGrowthFormsCockpitAdmin()` + APIs admin del motor: author draft low-risk, review/publish/deprecate/archive, dispatch, surfaces, destinations, submissions, consent y delivery evidence. UI usa `CompositionShell`, `AdaptiveSidecarLayout`, `GreenhouseBreadcrumbs`, `GreenhouseButton`, `GreenhouseChip`, `Motion`, `surfaceHeroTitle`, copy canónica `GH_GROWTH_FORMS` y GVC desktop/mobile (`.captures/2026-06-25T13-56-54_growth-forms-admin-cockpit`). Migration `20260625184500000_task-1232-growth-forms-admin-cockpit-view` aplicada; no hay migraciones pendientes. Primeros forms reales observados: `AI Visibility Grader` como anchor interno y `efeonce-aeo-diagnostic` como primer submit productivo público en `/aeo-2/` vía host bridge Turnstile. Desde TASK-1294 el renderer genérico `<greenhouse-form>` puede emitir `captchaToken`; lo pendiente no es token, sino migrar el bridge AEO de vuelta al renderer y ejecutar smoke WordPress/dataLayer sin crear leads falsos.
- **Public Site / Ohio + Elementor `Document::save()` guardrail (2026-06-23):** al mutar paginas Ohio publicadas via `Document::save()`, los agentes deben proteger metas fuera del arbol Elementor. En especial, si `page_header_title_background_type=featured`, el hero depende de `_thumbnail_id`; snapshot antes/despues `_thumbnail_id`, `get_the_post_thumbnail_url()`, `page_header_title_background_type` y `page_header_title_background_*`, y verificar `elementorFrontendConfig.post.featuredImage`. Incidente fuente: `/agencia-creativa/` (`page_id=249582`) perdio su imagen destacada durante una mutacion del widget `greenhouse_comparison_table`; valor correcto restaurado `attachment_id=249672` (`EO_Landing-GiroAgencia.webp`). Docs/skills actualizadas: `docs/documentation/public-site/wordpress-ohio-elementor-layout.md`, `docs/manual-de-uso/public-site/wordpress-ohio-elementor-layout.md`, `.codex/.claude` `efeonce-public-site-wordpress`.
- **TASK-1225 Comparison Table manifest governance (2026-06-23, code-complete Slices 1-3, rollout pendiente):** greenhouse-eo expone el contrato programático gobernado del widget `greenhouse_comparison_table`. `comparisonTable.v1` (Zod `src/lib/public-site/comparison-table/manifest-schema.ts` + validador) + command `authorComparisonTable` (validate-before-write → request HMAC firmado; **dry_run default sin red**, **execute gated** por `PUBLIC_SITE_COMPARISON_TABLE_WRITES_ENABLED` default OFF + secret) + endpoint `POST /api/admin/public-site/comparison-table` (capability `platform.public_site.comparison_table.author` → `efeonce_admin`, coverage verde). Bridge `greenhouse-wp-bridge` v0.5.0: `POST /drafts/comparison-table` + `GHWPB_Comparison_Table_Manifest` (validador defense-in-depth + node builder semántico→`c_*`) → draft vía eo-vibe `Document::save()` (nunca publica/toca live). Loop propose→confirm→execute, el LLM nunca muta directo. **Rollout pendiente** (write OFF): shared secret + `GREENHOUSE_WP_BRIDGE_WRITES_ENABLED` en Kinsta + flag + smoke firmado + sign-off (flag en `FEATURE_FLAG_STATE_LEDGER.md`). Slice 4 (persistencia/versión/diff/rollback + Nexa/MCP) diferido. Runtime repo Slice 3 commit `f5ce614` (local, sin push).
- **TASK-1224 Public Site Comparison Table widget CANONIZADO (2026-06-23):** complete con sign-off del operador. Primera primitiva custom canónica del sitio público en el plugin **contenedor multi-widget** `eo-elementor-widgets` v0.6.0 (runtime repo `efeoncepro/efeonce-public-site-runtime`, LIVE en `/agencia-creativa/`). Widget `greenhouse_comparison_table`: `<table>` semántica, degradados fieles a Figma `12479-18591`, ribbon corner-fold embebido en el header Globe, reflow responsive. **Autoadministrable + agent-ready:** `theme_schema()` (método público = SSOT key→CSS var) + controles de color/radio en Elementor + render de CSS vars inline + markers `data-gh-schema="comparisonTable.v1"`/`data-gh-plugin-version`; este contrato es el que **TASK-1225 (manifest governance) debe espejar** — TASK-1225 NO ejecutada, solo preparada. **Microinteracciones** (motion-design + microinteractions-auditor): cascada/check-pop scroll-driven `view()` (`@supports`-guarded), hover de fila, sheen del ribbon, cursor-glow (`assets/js/comparison-table.js`); todo compositor-only + `prefers-reduced-motion`. Para agregar otro widget al sitio público: NO crear plugin nuevo, agregar clase + entry en `EO_Widgets_Loader::$widgets`. Skill operativa: `efeonce-public-site-wordpress` (sección "Custom Elementor widget" + "Plugin contenedor multi-widget"). Docs: funcional/manual en `docs/{documentation,manual-de-uso}/public-site/comparison-table-widget.md`.
- **TASK-845 Node 24 app/test runtime (2026-06-22):** complete en `develop`. El portal declara Node.js `24.x` como runtime canonico de app/tests/builds via `package.json#engines.node`, `.nvmrc`, `.node-version` y workflows GitHub de CI/Playwright/reliability/design/task-contract. Evidencia final: local Node `v24.14.0`, install frozen/typecheck/build/task+ops/docs gates verdes; GitHub CI `27944195483` success; Playwright smoke `27944195467` success; Vercel staging `greenhouse-m9vyvzfnf-efeonce-7670142f.vercel.app` Ready y `/api/internal/health` ok con version `5cd3a1d`. Cloud Run workers `node:22-slim` son runtime container separado y follow-up opcional, no bloqueo del portal/Vercel.
- **Playwright CI smoke browser (2026-06-22):** los smokes GitHub usan el Chrome del runner (`PLAYWRIGHT_CHROMIUM_CHANNEL=chrome`), verifican `google-chrome --version` e provisionan `ffmpeg` del sistema y lo enlazan al path hermetico de Playwright para conservar video on failure sin descargar Chrome for Testing. No volver al install completo de Playwright salvo que un spec necesite el browser empaquetado y se agregue cache/timeout explícito.
- **ISSUE-100 local dev Nexa Insight skeleton stuck (2026-06-20):** resuelto como degradación de Turbopack local, no como bug de skeletons ni de GCP/Cloud SQL. `pnpm dev` usa `next dev --webpack` por estabilidad diaria; `pnpm dev:turbo` queda opt-in para diagnosticar Turbopack. Runbook: si `/nexa/insights/[id]` o rutas grandes quedan en skeleton + `Compiling...`, revisar `ps`/CPU y `pg:doctor`; los skeletons deben existir y desaparecer al llegar data real. Issue canónico: `docs/issues/resolved/ISSUE-100-local-dev-turbopack-nexa-insight-skeleton-stuck.md`.
- **TASK-1180 Design Handoff x Primitive Governance (2026-06-20):** code complete dev sobre TASK-1175/1176. `/design-system/handoff` ahora registra una decisión Design System por entry (`route_only`, `reuse_primitive`, `extend_primitive`, `new_primitive`, `variant_kind`, `research_required`) con primitive key, variant/kind, Lab, runtime, GVC, docs, rationale, owner y due date. Backend: migración additive `20260620023349220_task-1180-design-handoff-primitive-governance` aplicada en Cloud SQL dev, command/API `PATCH /api/design-system/handoff/[entryId]/primitive-decision`, capability `design_system.handoff.primitive_decision.manage`, evento `design_system.handoff.primitive_decision_updated`, state machine bloqueando `implemented` sin decisión resuelta y reliability signals `design_system.handoff.{primitive_decision_missing,primitive_lab_missing,runtime_without_gvc,route_only_reuse_suspect}`. UI: inspector suma `Primitive governance`; GVC local desktop/mobile vigente `.captures/2026-06-20T02-49-57_design-system-handoff-primitive-governance`. Rollout staging/prod pendiente de promoción.
- **TASK-1176 Design Handoff Operations Cockpit UI (2026-06-20):** complete local + runtime dev verificado sobre TASK-1175. La dirección visual aprobada **Evidence Ledger + Exception Command Center** quedó implementada en `/design-system/handoff`: ledger denso por acción/review/recent, métricas de excepción, tabs `Ledger/Nuevo nodo/Allowlist/Drift`, inspector lateral full-height, checklist readiness, Figma node health, links TASK/PR/deploy, evidencia y acciones command-backed. La UI consume solo APIs programáticas `/api/design-system/handoff/**` (Full API Parity), con copy canonizada en `src/lib/copy/design-handoff.ts`; el comando `create` ahora registra el handoff y crea el primer snapshot Figma en el mismo flujo. GVC desktop/mobile vigente: `.captures/2026-06-20T02-00-35_design-system-handoff-cockpit`.
- **TASK-1175 Design Handoff Control Plane V2 (2026-06-20):** code complete local; la migración additive `20260620003944557_task-1175-design-handoff-control-plane-v2.sql` fue aplicada en Cloud SQL dev durante TASK-1176 y `GET /api/design-system/handoff` responde HTTP 200 con `entries=[]`/`allowedFiles=[]`. TASK-1120 queda endurecida como control plane Full API Parity: ownership/planning/links/evidence/node snapshots + estado `in_review`; commands/readers en `src/lib/design-system/handoff/**`; APIs programáticas `/api/design-system/handoff/**` con `executeApiPlatformCommand`; capabilities finas `design_system.handoff.{allowlist.manage,owner.assign,planning.update,link,evidence.attach,verify,drift.read}`; eventos outbox V2; reliability signals `design_system.handoff.{missing_evidence,node_drift,orphan_surfaces}`. Pendiente operativo: aprobar/seedear un `file_key` Figma de producto y ejecutar smoke con nodo real create+initial snapshot -> link -> evidence -> in_review -> implemented en el target de rollout.
- **TASK-1120 Design Handoff Registry (2026-06-19):** code complete local, rollout pendiente. Greenhouse incorpora `/design-system/handoff` como carril interno producto->DEV para registrar nodos Figma de producto separados del linking AXIS-only de TASK-1072. Nuevo aggregate `greenhouse_core.design_handoff_entries` + allowlist `design_handoff_allowed_files`, eventos `design_system.handoff.{registered,transitioned,archived}`, capabilities `design_system.handoff.{read,create,transition}`, APIs `/api/design-system/handoff*`, señal Reliability `design_system.handoff.stale_entries` y UI con Composition Shell + Adaptive Sidecar. V1 es fail-closed: sin `file_key` producto aprobado, la allowlist queda vacia y el registro/preview real no se ejecuta. Pendiente operativo: aplicar migracion en Cloud SQL, sembrar/autorizar el primer archivo Figma de producto y smoke runtime con nodo real. Riesgo heredado: overflow mobile global del child shell de `/design-system/*` (`676 > 390`) tambien aparece en `/design-system/buttons`; corresponde a TASK-1168, no al handoff.
- **Ops Worker deploy drift guard (2026-06-18):** el deploy canónico del `ops-worker` sigue siendo GitHub Actions, no deploy local manual. El workflow `.github/workflows/ops-worker-deploy.yml` ahora separa HEAD documental de SHA operativo: en `workflow_dispatch` sin `expected_sha` resuelve el último commit que tocó el runtime surface del worker y, antes de construir Docker, compara la revisión Cloud Run actual por `GIT_SHA` y por diff de paths runtime. Si el worker servido es runtime-equivalente, salta build/deploy; si hay drift real, conserva Cloud Build + Cloud Run + Ready polling. No se tocó runtime (`services/ops-worker/server.ts`, Dockerfile, Scheduler). Evidencia vigente: último deploy real run `27753918151` success, revisión `ops-worker-00363-kd6`, Ready, 100% tráfico, `GIT_SHA=9703ae5d19225fd06ed75ab04d6244244f41a738`; guardrail commit `dfd85612d` pasó CI `27754869996` con `Worker runtime-deps gate` y no disparó nuevo Ops Worker Deploy. Docs canónicos: `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` y `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`. Nota operativa: lecturas locales directas de Cloud Run requieren reautenticar `gcloud`, pero la evidencia de GitHub Actions usa WIF independiente.
- **TASK-1155 Knowledge reactive embedding (2026-06-18):** complete local/runtime + staging/worker verified. La ingesta canónica `ingestOne` ahora embebe automáticamente la versión recién publicada con `embedKnowledgeDocumentVersion` después del commit de `publishKnowledgeDocumentVersion`; si Vertex falla, captura `knowledge/reactive_embedding` y el publish sigue `published`. `embed-corpus.ts` queda como backfill/guardrail global (`a embeber: 0` esperado en steady). Kill-switch operativo: `KNOWLEDGE_REACTIVE_EMBEDDING_ENABLED=false`. Verificado con CLI real repo-docs `--apply`: 2 docs publicados (`v2`), 20 chunks, query directa `20/20` embeddings. Notion real por CLI (`guia-automatizaciones v1`) publicó 14 chunks y quedó `14/14` embedded; `embed-corpus` posterior quedó `a embeber: 0` sobre `1486` chunks vigentes. Staging final `dpl_HxsAx3pfYpaHs17LJUh8zVnAuPjb` (`8d60bb0`) health HTTP 200. `ops-worker` staging run `27752682834` desplegó `ops-worker-00361-2vs`, Ready 100%, `GIT_SHA=8d60bb09f`, así que el webhook/projection worker ya carga el hook reactivo; no se disparó una edición real de wiki Notion en esta sesión.
- **TASK-1156 Nexa retrieval-first determinístico (2026-06-18):** complete / staging verified. `NEXA_FORCE_KNOWLEDGE_RETRIEVAL_ENABLED` existe default OFF; con `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED=true` + force flag ON, `NexaService` fuerza `search_knowledge` solo para `classifyNexaIntent === 'knowledge'` y los providers Gemini/Anthropic lo traducen a tool choice de primera pasada. No se tocó `nexa-system-prompt.ts` ni `searchKnowledge`. QA local con flags ON: K4/G1/K7 `3/3` y matriz completa `12/12`; tests/tsc/lint/build/docs verdes. Staging quedó ON en deploy `greenhouse-16fdbud5s` (`dpl_41GbySqdw4cRGxPaWuFnXR3dB16d`, `Ready`, aliases `dev-greenhouse.efeoncepro.com` / `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`): K4/G1/K7 `3/3` y matriz completa `12/12`; O1/O2 conservaron tools operativos. Production force-flag flip queda como decisión separada del operador/release.
- **TASK-1167 Public Site GitHub repo control plane (2026-06-17):** Greenhouse ya observa y gobierna el repo GitHub del rail Astro `efeoncepro/efeonce-web` mediante `public-site-github-control-plane.v1` (`src/lib/public-site/astro/github-control-plane/`), `GET /api/admin/public-site/github-control-plane`, adapter `public-site-github-command-adapter.v1` y `POST /api/admin/public-site/github-commands`. Commands default OFF: `PUBLIC_SITE_GITHUB_COMMANDS_ENABLED=false`, `PUBLIC_SITE_GITHUB_WORKFLOW_DISPATCH_ENABLED=false`, allowlists default `CI` y `main,develop`, `Idempotency-Key` + `executeApiPlatformCommand()`, repo hardcoded y cero proxy GitHub arbitrario. Signal nueva `public_site.astro_ci_failed` queda wired en Reliability (`platform`/cloud rollup). Staging verificado en `https://greenhouse-8arcw12v5-efeonce-7670142f.vercel.app` (`dpl_8sbZd3thkxFhaXSY79oS3RByFAn8`, Ready): reader HTTP 200 `confidence=high`, workflow `CI` rojo real en `main` (`run_id=27657858751`, SHA `4d050fb`, `conclusion=failure`), correlation `matched`; reliability severity `error`; command OFF HTTP 409 `public_site_github_command_disabled`; logs Vercel error 30m vacios. Sin deploy/rollback/cutover; production commands OFF por diseño.
- **TASK-1161 Public Site Astro binding reader (2026-06-17):** el repo ya tiene el reader del rail objetivo Astro/Vercel de `efeoncepro.com` mediante `public-site-astro-binding.v1` (`src/lib/public-site/astro/`) y `GET /api/admin/public-site/binding`, gated por `public_site.runtime_binding.read` + `public_site.route_ownership.read`. La migración `20260617185349908_task-1161-public-site-binding-capabilities.sql` siembra las capabilities y `public_site.astro_deploy_failed` queda en Reliability (`platform`/cloud rollup). Smoke local real: Vercel production/staging `READY` en SHA `4d050fb`; `gh api` confirmó `main`/`develop` en el mismo SHA; el reader degradó GitHub en esta shell por falta de token app/PAT, comportamiento esperado y honesto. Staging verificado en deploy `https://greenhouse-3jckt2aq4-efeonce-7670142f.vercel.app` (`dpl_6r6aKuS6P8eBWYrzJRR6thppmquw`): endpoint HTTP 200, `status=ok`, `confidence=high`, `degradedSources=[]`; Reliability signal `public_site.astro_deploy_failed` severity `ok`; logs de error vacíos. Cero production deploy/rollback/cutover; queda repetir smoke en production después de release/promoción aprobada.
- **Kortex operable desde Greenhouse (TASK-1164/TASK-1165, 2026-06-17):** Greenhouse tiene reader y command adapter gobernado para operar Kortex como sister platform. Docs por capas: `docs/architecture/kortex/README.md`. Binding vigente `EO-SPB-0002` conecta Greenhouse con Kortex portal `9b0a6e91-0e08-4642-bc42-54a4b5c83ad8` / HubSpot portal `48713323`. El adapter `POST /api/admin/kortex/commands` cubre 21 comandos via registry (`src/lib/kortex/commands/registry.ts`) sin proxy arbitrario: audit, strategy ops, conversations/chat/extract, hub profile, release dry-run/execute variants y admin breakglass. Staging quedo full ON por aprobacion del operador (`adapter`, `live_execute`, `admin_breakglass` y `KORTEX_COMMAND_ADMIN_TOKEN` sensitive) en deploy `greenhouse-dnr2e8c04`; smokes: safe normalize `200`, live dummy `409 kortex_preview_required`, admin bootstrap E2E `200`. Production live/admin sigue apagado por default; habilitar requiere aprobacion explicita, flags, confirmacion humana y smokes.
- **TASK-1158 Public Site Astro runtime strategy (2026-06-16):** `efeoncepro.com` queda arquitectónicamente recalibrado: Astro/Vercel (`efeoncepro/efeonce-web`) es el **frontend público objetivo** para landings, servicios, casos y eventualmente el sitio completo bajo el dominio principal; WordPress/Kinsta sigue siendo el **runtime live actual** hasta cutover y permanece como CMS/admin/origen editorial + bridge/content-factory rail. No se ejecutó DNS ni producción. `landing.efeoncepro.com` queda rechazado como carril SEO primario. Docs canónicos: `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md`, `docs/operations/public-site-route-ownership-matrix-20260616.md`, `docs/operations/public-site-astro-runtime-binding-20260616.json`. Cualquier implementación futura requiere route parity, canonical/redirect/sitemap preflight, GVC/Lighthouse, HubSpot attribution y aprobación humana de cutover.
- **TASK-1148 Backend/Data Task Execution Profile (2026-06-16):** las tasks Greenhouse siguen usando un solo sistema `TASK-###`, pero ahora pueden declarar `Execution profile: backend-data` y `Backend impact: none|api|db|migration|command|reader|sync|cron|webhook|integration`. Fuente canonica: `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md` + `docs/tasks/TASK_PROCESS.md`. Para API/DB/commands/readers/migrations/sync/cron/webhook/integrations/source-of-truth, el contrato exige source of truth, contract surface, data invariants, tenant/access boundary, idempotency/concurrency, migration/backfill/rollback, sensitive data/error posture y runtime evidence. `pnpm task:lint --changed` advierte (`backend-data-contract`) cuando una task template parece tocar backend/data y no incluye `## Backend/Data Contract`; es warning-first, legacy-exempt y no migra backlog historico. Skills alineadas: `.codex/skills/greenhouse-task-planner/SKILL.md` y `.claude/skills/greenhouse-task-planner/skill.md`.
- **TASK-1147 UI/UX Task Execution Profile (2026-06-16; wireframe/flow/motion gates endurecidos 2026-06-27):** las tasks Greenhouse siguen usando un solo sistema `TASK-###`, pero ahora pueden declarar `Execution profile: ui-ux`, `UI impact: none|copy|layout|interaction|motion|primitive|flow`, `Wireframe: docs/ui/wireframes/TASK-###-short-slug.md`, `Flow: docs/ui/flows/TASK-###-short-slug-flow.md|none` y `Motion: docs/ui/motion/TASK-###-short-slug-motion.md|none`. Fuente canonica: `docs/tasks/TASK_UI_UX_ADDENDUM.md` + `docs/tasks/TASK_PROCESS.md`. Para UI visible, el contrato exige wireframe existente, flow contract cuando hay múltiples superficies/rutas, motion contract cuando hay motion/microinteracciones no triviales, decidir experiencia, primitive/pattern, copy source, estados, reduced-motion y evidencia GVC antes de escribir JSX/copy. `pnpm task:lint --changed` bloquea (`ui-wireframe-contract` / `ui-flow-contract` / `ui-motion-contract`) cuando una task UI cambiada no declara los contratos requeridos; `ui-ux-contract` sigue warning-first para backlog historico. Skills alineadas: `.codex/skills/greenhouse-task-planner/SKILL.md` y `.claude/skills/greenhouse-task-planner/skill.md` deben cargar el addendum y generar `## UI/UX Contract` + wireframe/flow/motion cuando aplique.
- **Public Site editorial post tool disponible (2026-06-14):** `pnpm public-website:content-factory:post-tool -- edit-pullquote` es la via rapida para fixes editoriales pequenos en posts Gutenberg. Usa WP-CLI remoto, resuelve post por URL/id, selecciona un `core/pullquote` por H2/H3 cercano, clona el post publicado a `private|draft`, reemplaza solo el pullquote en el clon y conserva contexto no destructivo (thumbnail/taxonomias/Yoast). No muta el post publicado. Smoke real contra `248398` creo el draft privado `250136` (`que-es-loop-marketing-gh-quote-test-20260614-v2`) y la inspeccion verifico `path=58` con la nueva quote Gartner. Evidencia: `docs/operations/public-site-content-factory/post-tool-248398-2026-06-14T21-10-23+00-00.json` y `docs/operations/public-site-content-factory/post-deep-inspection-250136-2026-06-14T21-10-36+00-00.json`.
- **Existing post refresh draft plan + bridge clone endpoint disponible (TASK-1123/TASK-1116, 2026-06-14):** Greenhouse agrega `contentFactoryExistingPostRefreshDraftPlan.v1`, `src/lib/public-site/content-factory/existing-post-refresh-draft-plan.ts` y `pnpm public-website:content-factory:refresh-draft-plan -- --patch-plan <patch-plan.json>`. El plan toma un `contentFactoryPatchPlan.v1` `ready_for_draft_clone`, genera un request HMAC dry-run para `POST /wp-json/greenhouse-wp-bridge/v1/drafts/from-existing-post`, conserva `sendsWordPressWrite=false` y exige revalidar `sourceFingerprint` + fingerprints por bloque. El runtime repo `efeonce-public-site-runtime` sube `greenhouse-wp-bridge` a v0.4.0 con endpoint draft-only `from-existing-post`: lee el post fuente en WordPress, recalcula fingerprints, aplica solo `update_text` sobre bloques `safe_text_edit`, serializa Gutenberg y crea un draft/private Greenhouse-owned preservando contexto no destructivo. No está desplegado en Kinsta todavía; writes siguen apagados. Evidencia local para la quote de `248398`: `docs/operations/public-site-content-factory/refresh-draft-plan-248398-2026-06-14T20-44-17-868Z.json`.
- **Gutenberg block capability registry disponible (TASK-1123, 2026-06-14):** `src/lib/public-site/content-factory/gutenberg-capability-registry.ts` expone `gutenbergBlockCapabilityRegistry.v1` y el comando read-only `pnpm public-website:content-factory:capabilities`. Esta capa traduce bloques Gutenberg a capacidades semanticas de agente (`editorial_pullquote`, `navigation_toc`, `media_asset`, `conversion_cta`, etc.), operaciones libres/gobernadas (`refresh_editorial_pullquote`, `preserve_or_regenerate_toc`, `review_image_asset`) y compilacion segura hacia operaciones existentes de refresh/patch (`update_text`, `preserve`, `reconcile_media`, `review_link`). Es complementaria al pattern catalog: primero ayuda al agente a razonar con libertad sobre que quiere cambiar; luego el patch plan conserva `path + fingerprint`, draft clone y no-mutation published como guardrail final.
- **Gutenberg patch plan plan-only disponible (TASK-1123, 2026-06-14):** `src/lib/public-site/content-factory/patch-plan.ts` expone `contentFactoryPatchBrief.v1` y `contentFactoryPatchPlan.v1`; comando `pnpm public-website:content-factory:patch-plan -- --refresh-plan <refresh-plan.json> --brief <patch-brief.json>`. Valida propuestas concretas contra `sourceFingerprint`, `path + fingerprint`, candidatos del refresh plan y constraints `preservePublishedSource=true`/`requireDraftClone=true`. Smoke local sobre `248398` generó `docs/operations/public-site-content-factory/patch-plan-248398-2026-06-14T19-52-01-053Z.json` con 4 operaciones `ready_for_draft_clone`; sigue sin llamar WordPress, sin clonar y sin escribir.
- **Gutenberg refresh plan plan-only disponible (TASK-1123, 2026-06-14):** `src/lib/public-site/content-factory/refresh-plan.ts` expone `contentFactoryRefreshPlan.v1` y `pnpm public-website:content-factory:refresh-plan -- --inspection <post-deep-inspection.json>`. Lee evidencia local, no llama WordPress, no escribe, no clona y no modifica publicados. El plan registra `sourceFingerprint`, candidatos por `path + fingerprint`, gates de preserve/reconcile para TOC/listas/separadores/media y revisiones SEO/links. Smoke sobre `248398` generó `docs/operations/public-site-content-factory/refresh-plan-248398-2026-06-14T19-46-00-721Z.json` con `ready_for_brief` y warning esperado: cualquier write futuro debe ir a draft/private clone, nunca al post publicado.
- **Gutenberg post deep inspection disponible (TASK-1123, 2026-06-14):** `src/lib/public-site/content-factory/post-deep-inspection.ts` expone `contentFactoryPostDeepInspection.v1` y el comando read-only `pnpm public-website:content-factory:inspect-post-deep -- --post-id <id>`. Usa WP-CLI remoto + `parse_blocks()` para un post vivo y devuelve metadata, SEO Yoast, outline H2/H3/H4, block paths, fingerprints, attrs nativos, editability, links y media issues antes de refresh/fix. Smoke contra `248398` (`que-es-loop-marketing`) confirmo 400 bloques Gutenberg, TOC Yoast, quotes/pullquotes/listas/separadores, un SVG reconciliado y 0 media issues. No escribe WordPress.
- **Content Intelligence Map MVP disponible (TASK-1123, 2026-06-14):** `src/lib/public-site/content-factory/intelligence-map.ts` normaliza inspecciones reales del `greenhouse-wp-bridge` en `contentFactoryInspectionMap.v1` para agentes. Comando canonico read-only: `pnpm public-website:content-factory:inspect -- --write`, con defaults `249766` (post Gutenberg) y `244079` (landing Elementor/Ohio); si Secret Manager/GCP auth no esta disponible, usar `--from-bridge-inspection <path>` con reportes versionados. La salida vive en `docs/operations/public-site-content-factory-catalogs/content-intelligence-map-*.json` y cubre editor model, modulos `blockName`/`widgetType`/`themeMeta`/`hubspot`, freshness y fingerprint. No escribe WordPress, no publica y no limpia cache.
- **Gutenberg block pattern catalog disponible (TASK-1123, 2026-06-14):** `src/lib/public-site/content-factory/gutenberg-pattern-catalog.ts` expone `gutenbergBlockPatternCatalog.v1` para agentes/MCP futuros: cada `blockName` tiene rol, politica de generacion, politica de refresh, constraints y ejemplo seguro cuando aplica. Comando read-only: `pnpm public-website:content-factory:patterns` (`--write` guarda `block-pattern-catalog-*.json` en `docs/operations/public-site-content-factory-catalogs/`). Alineado con el validator: `core/freeform` y third-party no inspeccionados son `inspect_only`; imagen/gallery/embed requieren asset/source real.
- **Gutenberg draft validator + blogpost composition profile disponible (TASK-1123, 2026-06-14):** `src/lib/public-site/content-factory/gutenberg-validator.ts` expone `validateGeneratedGutenbergDraft()` y `EFEONCE_BLOGPOST_COMPOSITION_PROFILE`; `pnpm public-website:content-factory:validate -- --file <draft.json>` valida artifacts locales `contentFactoryGeneratedDraft.v1` con salida `contentFactoryValidation.v1`. Bloquea metadata invalida, unsafe markup, comentarios Gutenberg desbalanceados, bloques no gobernados, posts planos sin TOC/outline/enrichment, H1 dentro del body y saltos de jerarquia H2→H4; advierte `core/freeform` porque existe en legacy pero no debe ser patron de drafts nuevos. No llama WordPress ni muta runtime.
- **Gutenberg plan + golden example disponible (TASK-1123, 2026-06-14):** `src/lib/public-site/content-factory/gutenberg-planner.ts` expone `planGeneratedGutenbergPostDraft()` y `pnpm public-website:content-factory:plan -- --file <brief.json>` convierte un `contentFactoryBrief.v1` local en `contentFactoryGeneratedDraft.v1` validado. El planner ahora genera intro, TL;DR/list, `yoast-seo/table-of-contents`, H2/H3 outline, quote y separador; media/embed queda como slot recomendado hasta resolver assets reales. Golden example canonico: `docs/documentation/public-site/content-factory-golden-examples/gutenberg-post-ai-revops-draft.json` (`status=pass`). Receta canonica: `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`. Esto sigue sin llamar WordPress; el write draft/private queda para el smoke plan posterior.
- **Draft/private smoke plan disponible (TASK-1123, 2026-06-14):** `src/lib/public-site/content-factory/draft-smoke-plan.ts` expone `prepareGutenbergDraftSmokePlan()` y `pnpm public-website:content-factory:smoke-plan -- --file <draft.json> --private --write` prepara `contentFactoryDraftSmokePlan.v1` sin enviar writes. Valida el draft, construye el payload futuro `greenhouse-wp-bridge-draft.v1`, headers HMAC redacted, precondiciones de rollout y rollback por manifest id. Evidencia: `docs/operations/public-site-content-factory/smoke-plan-2026-06-14T19-00-28-113Z.json`; writes siguen deshabilitados hasta aprobación explícita.
- **Content Factory debe crear y refinar existentes (2026-06-14):** `TASK-1123` se amplió para que la fabrica soporte `create`, `refresh` y `fix`, no solo generación desde cero. Requisito nuevo: Content Intelligence Map por objeto WordPress antes de editar, con post/page id, editor model, blocks/widgets, Ohio/theme metas, Elementor settings, assets, SEO/Yoast, HubSpot/CTA, anchors, ownership, freshness y fingerprint. Refresh/fix trabaja primero sobre clone/draft/private; patch directo sobre published requiere task/release explícita.
- **Greenhouse AI Content Factory Agent Kit task creada (TASK-1123, 2026-06-14):** la fabrica de contenido para Public Site se define como AI-native y agent-first, pero no chat-first. El objetivo es dotar a Codex/Claude/Nexa/futuros agentes de recursos, recipes, catalogos, golden examples, validators y primitives Full API Parity para crear drafts Gutenberg y landings Elementor/Ohio gobernadas. MCP queda explicitamente downstream de API Platform/primitives, no como source of truth ni bypass.
- **Public Site content factory priority + Kinsta staging posture (2026-06-14):** exploracion Kinsta actual indica que Standard Staging esta documentado como incluido por WordPress install salvo restriccion de plan, mientras Premium Staging es add-on pago de USD 20/mes por entorno; disponibilidad real de la cuenta Efeonce sigue pendiente sin MyKinsta/API. Para escalar produccion de contenido, no bloquear el diseño por Premium Staging: priorizar fabrica de contenido con dos carriles (`post_draft_gutenberg` para posts y `landing_draft_elementor` para landings). Posts Gutenberg primero, porque el sitio ya los usa y el primer smoke draft/private es menos riesgoso que mutar Elementor.
- **Public Site bridge v0.3.1 signed draft foundation desplegado/provisionado (2026-06-14):** el repo runtime agrega contrato HMAC para Greenhouse (`X-Greenhouse-Timestamp`, `Request-Id`, `Actor`, `Environment`, `Body-Sha256`, `Signature`), canonical request `GHWPB-HMAC-SHA256`, replay guard y rutas draft-only `POST/GET/PATCH /wp-json/greenhouse-wp-bridge/v1/drafts...`. Default fail-closed: requiere Application Password, shared secret, request id unico y `GREENHOUSE_WP_BRIDGE_WRITES_ENABLED`; solo permite `draft|private` Greenhouse-owned, sin publish/delete/cache/backups. v0.3.1 evita editar `wp-config.php`: soporta constants/env primero y fallback por WP options `autoload=no` con `wp greenhouse-bridge status/config/secret`. Se desplego manualmente a Kinsta; GCP Secret Manager `public-website-wordpress-bridge-shared-secret-production` y WordPress option quedaron provisionados por stdin; writes siguen `false`. Smoke firmado GET devuelve `404 ghwpb_draft_not_found`; POST devuelve `503 ghwpb_writes_disabled`. Drift live-vs-repo `0`.
- **Public Site bridge read-only ACTIVO en Kinsta (2026-06-14):** `greenhouse-wp-bridge` v0.1.0 ya no es solo repo-only: fue subido y activado manualmente via SSH/WP-CLI en `/www/efeoncegroup_752/public/wp-content/plugins/greenhouse-wp-bridge` desde el repo runtime `efeoncepro/efeonce-public-site-runtime` commit `f4c8a33`. Smoke productivo: anónimo `GET /wp-json/greenhouse-wp-bridge/v1/health` => `401 ghwpb_auth_required`; autenticado con Application Password => health `200` (`mode=read_only_inspection`, `writesEnabled=false`, `greenhouse_write_routes=false`, Kinsta/cache/backup flags false), Elementor inspection page `244079` `200` y Ohio widget catalog `200` (`253` widgets Elementor, `37` Ohio, `2` HubSpot). Se actualizó `pnpm public-website:export-live-code` para incluir `wp-content/plugins/greenhouse-wp-bridge`; evidencia nueva: drift `docs/operations/public-site-drift/drift-2026-06-14T16-13-03-406Z.json` (`54` in sync, `2` ignored live backups, `0` drift), status `docs/operations/public-site-runtime-status/status-2026-06-14T16-13-15-103Z.json`, dry-run `docs/operations/public-site-deploy-dry-runs/dry-run-2026-06-14T16-13-03-124Z.json` (`noop=54`, `would_create=0`, `would_update=0`). `TASK-1116` sigue bloqueada para writes: falta HMAC/shared secret, replay guard, Abilities registration, staging/preview target y reducir privilegios del usuario tecnico.
- **Public Site bridge v0.2.0 block inspection (2026-06-14):** el plugin activo agrega `GET /wp-json/greenhouse-wp-bridge/v1/inspection/block-document/{id}` para posts/contenido Gutenberg. Smoke real con post `249766` confirma que los posts editoriales recientes usan Gutenberg (`hasBlocks=true`, `elementorDataPresent=false`) y que Greenhouse debe modelar módulos por `blockName`; las landings Elementor siguen modeladas por `widgetType`. Greenhouse reader/API/CLI incluye `blockDocument`, `includeBlocks=false`/`--no-blocks` y cache-buster para evitar snapshots stale. Evidencia: `docs/operations/public-site-bridge-inspections/inspection-page-249766-2026-06-14T16-46-47-906Z.json`; drift post-deploy `docs/operations/public-site-drift/drift-2026-06-14T16-47-57-837Z.json` (`55` in sync, `0` drift).
- **Public Site bridge inspection API (2026-06-14):** `src/lib/public-site/bridge-inspection.ts` es el reader server-side compartido entre CLI y Greenhouse. API interna nueva: `GET /api/admin/public-site/bridge-inspection?pageId=<id>` (`includeCatalog=false` opcional), gated por `requireAdminTenantContext()` + `platform.public_site.bridge.inspect` (`read`, `all`). Devuelve `public-site-bridge-inspection.v1` y no habilita writes/drafts/publish; si falta secret plumbing en el runtime Greenhouse responde `503 public_site_bridge_auth_not_configured`.
- **Public Site bridge inspection helper (2026-06-14):** nuevo comando read-only `pnpm public-website:bridge-inspect -- --page-id <id> [--write]` llama health, inspeccion Elementor y catalogo Ohio del bridge activo usando Application Password desde Secret Manager sin imprimir secretos. Evidencia inicial: `docs/operations/public-site-bridge-inspections/inspection-page-244079-2026-06-14T16-22-05-591Z.json`.
- **Public Site repo/control-plane discovery (2026-06-14):** `efeoncepro/efeonce-web` existe, pero es un rebuild Astro/headless historico y **no** el source of truth del runtime live actual de `efeoncepro.com`. El runtime actual sigue siendo WordPress/Kinsta con Ohio + Elementor + `ohio-child`. El repo local mas cercano al codigo WordPress es `/Users/jreye/Documents/efeonce-sp` (remote `cesargrowth11/efeonce-sp`), pero no esta reconciliado con Kinsta live ni bajo el org `efeoncepro`. Discovery nuevo: `docs/operations/public-site-repository-control-plane-discovery-20260614.md`. `TASK-1122` esta in-progress/code-complete para binding sin Kinsta API: repo privado runtime `efeoncepro/efeonce-public-site-runtime` creado con baseline `0fa6bfd` / tag `baseline-2026-06-14-live`; binding en `docs/operations/public-site-runtime-repository-binding-20260614.json`. Greenhouse sera la UI/control plane; GitHub queda como rail versionado/deployable detras de escena. Helpers vigentes: `pnpm public-website:export-live-code` exporta read-only el codigo live gobernable a `tmp/public-site-code-baselines/<timestamp>/` + manifest SHA-256 sin mutar Kinsta; `pnpm public-website:diff-runtime` compara el ultimo export contra el repo runtime y falla si hay drift/missing; `pnpm public-website:runtime-status` lee binding + repo head + drift; `pnpm public-website:deploy-dry-run` produce plan no-mutante repo->Kinsta export. Evidencia: drift `docs/operations/public-site-drift/drift-2026-06-14T14-13-37-068Z.json` (`47` in sync, `2` ignored live backups, `0` drift), status `docs/operations/public-site-runtime-status/status-2026-06-14T15-43-17-969Z.json`, dry-run `docs/operations/public-site-deploy-dry-runs/dry-run-2026-06-14T15-43-57-874Z.json` (`noop=47`, `would_update=0`, `would_create=7` por skeleton repo-only `greenhouse-wp-bridge`). Kinsta API token sigue pendiente para cache/backups/deploy apply.
- **Public Site bridge skeleton (2026-06-14):** el repo runtime `/Users/jreye/Documents/efeonce-public-site-runtime` contiene `wp-content/plugins/greenhouse-wp-bridge` version `0.1.0` como foundation read-only activa. Rutas actuales: `GET /wp-json/greenhouse-wp-bridge/v1/health`, `GET /wp-json/greenhouse-wp-bridge/v1/inspection/elementor-document/{id}`, `GET /wp-json/greenhouse-wp-bridge/v1/inspection/ohio-widget-catalog`; requieren usuario autenticado con `edit_posts`. Estado honesto: PHP lint verde local, instalado/activado en Kinsta, sin HMAC/replay guard, sin Abilities registration y sin endpoints de draft write/publish/cache.
- **Public Site extensibility (2026-06-14):** si Ohio/Elementor no cubren un modulo reusable, el camino aprobado es widget custom de Elementor en plugin propio versionado en `efeoncepro/efeonce-public-site-runtime`, no tocar Ohio parent ni montar React frontend. React en WordPress queda acotado a carriles nativos: admin/editor con `@wordpress/element`, Gutenberg blocks y frontend ligero con Interactivity API. Doc canonico: `docs/documentation/public-site/wordpress-custom-widgets-react-strategy.md`; primer piloto recomendado: `Greenhouse Partner Proof`.
- **Public Site HubSpot services hero restored + child-theme headline helper (2026-06-14):** en `efeoncepro.com/servicios-contratar-hubspot/` (`page_id=244079`) el headline Ohio usa `page_header_title_background_type=featured`; el fondo real depende de `_thumbnail_id`. Se restauro la imagen correcta con attachment `248703` (`EO_Hubspot_Hiro2-2.webp`, `2001x801`) + `page_header_title_background_size=cover`. Falso positivo documentado: attachment `243106` (`Hubspot-headline-1.webp`, `221x65`) es un logo inline dentro de Elementor partner proof, no un hero. Nueva regla: backups Elementor-only no bastan para page headline; incluir `_thumbnail_id`, URL/dimensiones del attachment y metas `page_header_title_background_*`. Como Ohio no permite titulo visual distinto del `post_title`, el override vive en `ohio-child/parts/elements/page_headline.php` y usa meta `gh_page_headline_display_title` solo para el H1 visual. Mobile CSS vive en `ohio-child/assets/css/global-fixes.css`; el radius moderno pertenece a la superficie blanca `#content > .page-container`, no al `.page-headline`/background. Backup live: `/www/efeoncegroup_752/public/wp-content/uploads/greenhouse-backups/page-244079-hero-real-image-before-20260614111638.json`; capturas: `.captures/public-site-hubspot-hero-incident-20260614/after-real-hero-image*.png` y `.captures/public-site-hubspot-hero-design-pass-20260614/mobile-white-surface-radius/mobile-390.png`.
- **Public Site visual foundations (2026-06-14):** el inventario Ohio/Elementor ahora cubre color, tipografia, hover y motion, no solo ancho/layout. Runtime computado de `efeoncepro.com`: `--clb-color-primary=#023c70`, `--clb-color-link-hover=#024c8f`, footer `#161519`, body/parrafos `Inter`, headings/botones `DM Sans`, gutter `1rem`, container `86vw`. Elementor active kit `7` existe, pero su CSS generado conserva defaults de Elementor (`#6EC1E4`, `#61CE70`, Roboto), asi que no es source of truth confiable sin computed-style. Para landings, inspeccionar widget settings + Ohio globals + CSS generado + computed CSS antes de CSS hardcodeado; los controles nativos de Ohio ya cubren color/hover/border/shadow/radius/motion en widgets clave (`ohio_button`, `ohio_service_table`, `ohio_recent_projects`, `ohio_recent_posts`, `ohio_gallery`, `ohio_carousel`, `ohio_video`). Motion custom tipo aurora requiere `prefers-reduced-motion`, performance check y QA visual porque no se encontro un guardrail consistente en Ohio.
- **Public Site Ohio/Elementor widget inventory (2026-06-14):** existe inventario funcional completo del stack visual de `efeoncepro.com` en `docs/documentation/public-site/wordpress-ohio-elementor-widget-inventory.md` y playbook operativo en `docs/manual-de-uso/public-site/wordpress-ohio-elementor-landing-playbook.md`. Discovery read-only en Kinsta observo WordPress `7.0`, theme `ohio-child` sobre Ohio `3.7.0`, Elementor `4.1.3`, Elementor Pro `4.1.1`, Ohio Extra `3.7.0`, 253 widgets Elementor registrados, 37 widgets Ohio, 246 documentos Elementor y 67 templates. Antes de crear/clonar/editar landings, consultar ese inventario: usar primero controles nativos Ohio/Elementor (`layout`, `content_width`, padding/gap, metas Ohio) y widgets maduros (`ohio_heading`, `ohio_service_table`, `ohio_icon_box`, `ohio_button`, `ohio_counter`, `ohio_clients_logo`, `ohio_testimonial`, `ohio_recent_projects`); evitar layout basado en `spacer` y CSS hardcodeado si existe control nativo.
- **Public Site WP-CLI remoto canonico (2026-06-14):** para ejecutar PHP via WP-CLI en Kinsta no usar heredocs/inline PHP dentro de SSH. Nuevo comando `pnpm public-website:wpcli -- --eval-file ./tmp/patch.php --wp-user 12` (`scripts/public-website/wpcli-remote.ts`) carga `.env.local`/`.env`, sube el PHP por `scp`, ejecuta `wp eval-file` en `PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH` y limpia el temporal. Esto corrige la fuente recurrente de fallas por quoting y por el detalle `ssh -p` vs `scp -P`. `Document::save()` en Elementor borra CSS generado; verificar despues renderizando la pagina/capturando, no con `grep` inmediato al archivo CSS.
- **Public Site Elementor partner proof module (2026-06-14):** en `efeoncepro.com/servicios-contratar-hubspot/` (`page_id=244079`) las tres legacy sections del modulo "Efeonce tu Partner certificado" quedaron gobernadas sin CSS hardcodeado: `83d3781`, `ebe0037`, `5b75db1` comparten `layout=boxed`, `content_width=1560px`, padding lateral `24px` y clases semanticas `gh-section-hubspot-partner-proof` + `gh-partner-proof-*`. Verificacion URL publica normal: desktop 2048px con contenedor interno 1560px y mobile 390px con contenedor 342px a 24px, cards apiladas. Backup: `/www/efeoncegroup_752/public/wp-content/uploads/greenhouse-backups/page-244079-elementor-before-partner-proof-module-20260614100340.json`.
- **Public Site Elementor live fix — HubSpot services section (2026-06-14):** `efeoncepro.com/servicios-contratar-hubspot/` (`page_id=244079`) tenia la seccion dark "Efeonce tu Partner certificado" demasiado pegada a los margenes. Discovery confirmo que la fila de cards es una legacy section Elementor `id=ebe0037`, no un container moderno ni un problema de CSS global. Fix live aplicado con `Document::save()`: `settings.layout='boxed'` + `settings.content_width={unit:'px', size:1560, sizes:[]}`. Resultado: fondo azul full-width preservado, `.elementor-container` interno limitado a 1560px. Backup: `/www/efeoncegroup_752/public/wp-content/uploads/greenhouse-backups/page-244079-elementor-before-partner-cards-width-20260614095038.json`. Captura de verificacion: `.captures/public-site-hubspot-section-20260614/servicios-contratar-hubspot-partner-section.png`.
- **Public Site discovery env bootstrap (2026-06-14):** `pnpm public-website:discover` ahora carga automaticamente `.env.local` y luego `.env` desde el repo, sin sobrescribir variables ya exportadas por shell/CI y sin imprimir valores secretos. Otros agentes ya no deben usar prefijos inline largos ni `source .env.local` para authenticated/WP-CLI discovery; el comando canonico es `pnpm public-website:discover -- --authenticated --wpcli`.
- **Public Site Elementor manipulation discovery (2026-06-14):** nuevo reporte `docs/operations/discovery-public-website-elementor-20260614.md`. Aprendizaje clave: no manipular Elementor desde DOM/CSS como source of truth. El contrato editable es `_elementor_data` + `_elementor_page_settings` + meta Ohio cuando aplique, guardado por APIs internas de Elementor (`Document::save`) desde un bridge WordPress propio. El sitio mezcla modelos: home `page_id=2791` usa containers modernos; `/blog` `page_id=18456` mezcla sections/columns legacy + containers; `/contacto` `page_id=20729` usa legacy sections/columns. Tooling futuro debe soportar `container|section|column|widget`, seleccionar nodos por `element.id` + `elType` + `widgetType` + fingerprint semantico, y agregar clases `gh-*` en landings Greenhouse-owned. Skills sincronizadas Codex/Claude actualizadas.
- **Skill router Efeonce Public Site WordPress (2026-06-30):** `.codex/skills/efeonce-public-site-wordpress/SKILL.md` y `.claude/skills/efeonce-public-site-wordpress/SKILL.md` quedaron como router compacto para evitar truncamiento/carga excesiva. El detalle operativo vive en `references/`: `landing-workflow.md`, `landing-registry.md`, `elementor-mutation.md`, `growth-forms-wordpress.md`, `content-factory-gutenberg.md`, `custom-elementor-widgets.md`, `layout-incidents.md`, `runtime-and-discovery.md` y fichas por landing (`landings/aeo.md`, `landings/agencia-creativa.md`, `landings/hubspot-services.md`). Usarla cuando el trabajo toque Public Site, `EPIC-019`, `TASK-1111`, `TASK-1116`, `TASK-1123`, discovery autenticada, fixes Ohio/Elementor, Growth Forms embeds, AI Content Factory/Gutenberg, custom widgets o diseño del bridge; cargar solo las referencias necesarias y sincronizar ambas copias tras nuevos incidentes/discoveries/decisiones sin incluir secretos. Arquitectura/manual: `docs/architecture/GREENHOUSE_PUBLIC_SITE_SKILL_ROUTER_ARCHITECTURE_V1.md` + `docs/manual-de-uso/public-site/operar-public-site-skill-router.md`.
- **Public Site WordPress layout ops (2026-06-14):** `efeoncepro.com/blog` (`page_id=18456`) tuvo un fix live de contenedor Ohio + Elementor. Causa raiz: `page_full_width_margins_size=20px` vs `--clb-grid-gutter=16px`, dejando 4px residuales en full-width; se actualizo el meta a `16px` y se limpio cache. Regresion introducida/corregida en la sesion: Ohio agregaba `.light-typo` al sidebar sobre secciones oscuras y lavaba hamburguesa/logo aunque el rail seguia blanco; se agrego override page-scoped en `wp-content/themes/ohio-child/assets/css/global-fixes.css` solo para `body.page-id-18456.with-header-sidebar:not(.dark-scheme)`. `efeoncepro.com/contacto` (`page_id=20729`) no tenia el mismo problema: la discontinuidad venia de `breadcrumb-holder` + `page-container.bottom-offset` de Ohio fuera de Elementor; se corrigio con metas page-scoped `page_breadcrumbs_visibility=0` y `page_add_top_padding=0`, no con CSS global. Aprendizaje: si una franja visual nace de estructura del theme, resolver primero el meta/setting de Ohio; CSS page-scoped solo para presentacion. Backups runtime: `blog-page-meta-backup-20260614015717.txt`, `global-fixes.css.bak-20260614020413-before-blog-sidebar-header-fix`, `contacto-page-meta-backup-202606140-bg-continuity.json` y `global-fixes.css.bak-202606140-contacto-bg-continuity`. Canon operativo: `docs/documentation/public-site/wordpress-ohio-elementor-layout.md` + `docs/manual-de-uso/public-site/wordpress-ohio-elementor-layout.md`; no resolver estos sintomas con CSS global de `#masthead`, footer o hero.
- **TASK-1111 Public Website read-only discovery (2026-06-13/14):** primer slice operativo de `EPIC-019` en curso. `pnpm public-website:discover` (`scripts/public-website/discover-wordpress.ts`) inventaria `efeoncepro.com` en modo publico por defecto y ahora tambien soporta `--authenticated` + `--wpcli` de forma opt-in/read-only; no imprime secretos ni headers de Authorization. Reporte vigente: `docs/operations/discovery-public-website-wordpress-20260614.md`. Hallazgos: REST `wp/v2` disponible, `wp-abilities/v1` anunciado, `application-passwords` anunciado, 40 paginas, 32 posts, CPT `landing`, Elementor/Yoast/Jetpack/HubSpot (`leadin`) visibles como namespaces y headers Cloudflare/Kinsta presentes. WordPress auth verificada con Application Password en Secret Manager (`public-website-wordpress-application-password`); el `user_login` correcto es `Greenhouse INTEGRATION` (`slug=greenhouse-integration`, display `Greenhouse`, rol actual `administrator`). Abilities autenticadas responden 200 con 33 abilities; plugins endpoint/editable REST types/pages edit inventory responden 200. Kinsta SSH/WP-CLI read-only verde contra `/www/efeoncegroup_752/public`: theme activo `ohio-child`, parent `ohio`, Elementor/Elementor Pro, Yoast SEO/Premium, HubSpot/Leadin, custom plugins `eo-headless-content` y `eo-vibe-coding-api`, AI providers, CPT privado `landing`. `TASK-1116` creada para `greenhouse-wp-bridge` draft-only foundation. Bloqueo restante: token Kinsta read-only para ambiente/cache/backups; no hay publish/cache clear todavia.
- **Public Website Landing Control Plane propuesto (2026-06-13):** nueva propuesta de arquitectura para que Greenhouse gobierne landing pages del sitio publico Efeonce (`efeoncepro.com`) sin reemplazar WordPress/Kinsta. ADR propuesto: `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`; arquitectura: `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`; epic: `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`. Contrato recomendado: Greenhouse es SoT de manifests/versiones/aprobaciones/deployments/drift para landings Greenhouse-owned; WordPress es runtime publico; Kinsta opera hosting/cache; HubSpot conserva atribucion CRM. Update: el bridge debe ser Abilities-first cuando WordPress runtime lo soporte (`wp_register_ability`, schemas, permissions, audit) y degradar a REST-only si no. Se vendorearon las 17 skills oficiales `WordPress/agent-skills` en `.codex/skills/` y `.claude/skills/` para Codex/Claude. No hay runtime implementado ni credenciales creadas todavia.
- **Public Website React/Interactivity boundary (2026-06-14):** WordPress puede usar React, pero EPIC-019 no debe convertir `efeoncepro.com` en SPA. Fuentes oficiales revisadas: WordPress Developer Blog junio 2026, Make/Core React 19 revert y WordPress Interactivity API. Contrato vigente: Greenhouse sigue como control plane; WordPress usa React solo en carriles nativos (`@wordpress/element`, Gutenberg blocks/admin/editor tooling del bridge) y frontend con server-rendered blocks + Interactivity API para interacciones acotadas. React 19 queda como watch item hasta probar compatibilidad real en Kinsta/WordPress/Gutenberg/plugins.
- **ISSUE-095 Sentry source-map upload token 403 (2026-06-13, open):** residual separado de `ISSUE-093`. Vercel staging ya no queda colgado por Sentry, pero `sentry-cli` degrada con `403 You do not have permission to perform this action`; los deploys quedan `Ready` y los source maps/artifact bundles no se suben. Cierre robusto: token dedicado CI/source maps con permisos de release/source-map upload y acceso al proyecto, rotado/publicado sin exponer valores, verificado con deployment staging sin `403` y artifacts visibles en Sentry. No desactivar Sentry/source maps como workaround permanente.
- **ISSUE-093 Sentry source-map upload build guard (2026-06-13, resolved):** `next.config.ts` envuelve el `runAfterProductionCompile` de `@sentry/nextjs` con `runSentrySourcemapUploadWithTimeout()` para que Vercel no quede 45m colgado si Sentry/source-map upload se cuelga. Default 60s; override `SENTRY_SOURCEMAP_UPLOAD_TIMEOUT_MS` clamp 5s-240s; Vercel `staging` quedó con `30000` ms para reducir costo de builds. Si Sentry responde, source maps se suben igual; si falla/cuelga, warning `[sentry-build]` y deploy continúa. Verificado remoto: `greenhouse-clbkbt7o6` (`a9dcb389c`) quedó `Ready` en 7m; el hook completó en 13686ms pese a 403 de Sentry. Follow-up separado: corregir permisos de `SENTRY_AUTH_TOKEN` para recuperar source maps sanos.
- **QA Release Auditor skill vigente (2026-06-13):** `greenhouse-qa-release-auditor` existe en Codex (`.codex/skills/greenhouse-qa-release-auditor/SKILL.md`) y Claude (`.claude/skills/greenhouse-qa-release-auditor/SKILL.md`) como gate final de QA/closure. Antes de cerrar implementaciones no triviales o trabajos donde tests verdes no prueben runtime real, usar `pnpm qa:gates --changed` para clasificar dominios y luego la skill para inyectar skills especializadas por namespace de agente; Codex y Claude no comparten necesariamente nombres ni cobertura (ej. finance/accounting existe como auditor fuerte en Codex y fallback explícito en Claude). La CLI es advisory; la skill decide. Si falta evidencia runtime, el estado correcto sigue siendo `code complete, rollout pendiente` u `operativamente bloqueado`.
- **Nexa core agentic platform direction (ADR accepted, 2026-06-13):** Nexa debe vivir en el core de Greenhouse como capability agentica para colaboradores, clientes y operadores, no como chat local de Knowledge ni widget paralelo. ADR canónico: `docs/architecture/GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md`; arquitectura operativa: `docs/architecture/GREENHOUSE_NEXA_MOMENT_FABRIC_ARCHITECTURE_V1.md`. Ecuación: `Nexa Moment = context + evidence + permission + intent + next step`. `TASK-1095` = substrate/fabric/adapters/autonomy/reliability; `TASK-1096` = experiencia percibida por dominio usando `NexaAnswersCanvas`; `TASK-1101` = Knowledge runtime. Rollouts reales no-Knowledge deben nacer como child tasks de dominio.
- **Codex QA Stop hook opt-in (2026-06-13):** `.codex/hooks/qa-release-stop-hook.mjs` existe como guardrail local, pero el `Stop` automático queda **desregistrado por defecto** en `.codex/hooks.json` para evitar prompts out-of-band al cerrar una conversación. El script solo bloquea si se reactiva explícitamente con `GREENHOUSE_QA_STOP_HOOK_MODE=enforce` / `GREENHOUSE_QA_STOP_HOOK_ENFORCE=1` o payload `enforce_qa_stop_hook=true`; el gate canónico sigue siendo manual: `greenhouse-qa-release-auditor` + `pnpm qa:gates --changed` y verdict `PASS | CONDITIONAL PASS | BLOCK`. Verificación: `pnpm codex:qa-hook:test`.
- **Roadmap Timeline primitive vigente (2026-06-13):** `GreenhouseRoadmapTimeline` (`src/components/greenhouse/primitives/GreenhouseRoadmapTimeline.tsx`) trae el patrón `RoadmapCard` al Design System sin shadcn/Tailwind ni `/components/ui`. Variants `horizontal|stacked|compact`; kinds `productRoadmap|releasePlan|implementationPlan|clientOnboarding|custom`; estados canónicos `complete|active|pending|blocked` con aliases compatibles del prompt `done|in-progress|upcoming`. Uso: roadmaps, release plans y horizontes de producto/onboarding. No reemplaza `GreenhouseActivityTimeline` ni `GreenhouseStepperProgressMicro`. Lab interno `/design-system/roadmap-timeline`; scenario GVC `design-system-roadmap-timeline`.
- **Border Beam primitive vigente (2026-06-13):** `GreenhouseBorderBeam` (`src/components/greenhouse/primitives/border-beam/`) trae los patrones de borde perimetral animado y rainbow border button al Design System sin shadcn/Tailwind literal. `GreenhouseSpectrumBeam` extrae el efecto spectrum como primitive fina reusable. `GreenhouseShinyBorder` trae el patrón shiny-borders-button como surface/CTA tokenizada con highlight radial, glow inferior y contenido elevado. `GreenhouseSpotlightCard` trae el patrón spotlight-card como card con spotlight atado al puntero; familia de marca Nexa: `nexaBrand`, `nexaBrandCore`, `nexaBrandSignal`, `nexaBrandGlass`. Effects `beam|spectrum`; spectrum palettes `axis|nexa`; variants `ambient|interactive|progress`; kinds `nexaSurface|promptDock|evidencePeek|approvalCard|asyncOperation|custom`; intensities `subtle|medium|strong`; colores desde `theme.axis.*`/`theme.palette.*` y `GREENHOUSE_NEXA_BRAND_COLORS`, overlay decorativo con `border-radius: inherit`, CSS motion con `prefers-reduced-motion`. `effect='spectrum'` reproduce el anillo completo animado + aura blur amplia para botones/CTAs especiales y cajas tipo Nexa glow; `spectrumPalette='nexa'` es la variación con colores de marca. Lab interno `/design-system/border-beam`; scenario GVC `design-system-border-beam`. La variación lab-only del composer con spectrum vive en `/design-system/nexa-chat` junto a los otros composer: inicia inactive/sin texto y cambia al estado activo cuando el usuario escribe. El FAB global de Nexa reutiliza `GreenhouseSpectrumBeam` en paleta Nexa solo en hover/focus, detrás del botón y con animación pausada en idle.
- **Knowledge lenses vigente (TASK-1090, 2026-06-12):** `/knowledge` es una ruta única con lentes persistentes **Humano | Nexa | MCP**. Humano = Workbench documental; Nexa = Answer Trace runtime usando `NexaKnowledgeAnswerSurface` (idle limpio estilo Google AI Mode con solo composer glow; al preguntar: burbuja, avatar después de la pregunta, composer descendido, proof panel); MCP = paquete/resource/evidence para agentes. El mockup `/knowledge/mockup/answer-trace` sigue como baseline visual protegido. `NexaKnowledgeAnswerSurface.showModeSelector` default `true`; `/knowledge` lo oculta porque el shell gobierna el selector común. `showTraceRail` default `false`; trace/retrieval vive en proof panel salvo opt-in explícito. GVC vigente: `.captures/2026-06-12T19-42-38_knowledge-lenses` + `.captures/2026-06-12T19-42-37_knowledge-answer-trace`.
- **Nexa Knowledge evidence vigente (TASK-1085/1089, 2026-06-12):** `NexaKnowledgeAnswerSurface` sigue siendo la composition primitive transversal props-only para respuestas Nexa con evidencia (mockup/overview/Answer Trace). La experiencia real del thread ya renderiza el tool `search_knowledge` debajo de la respuesta vía `NexaToolRenderers.tsx`, validando `raw.packet.contractVersion='knowledge-search.v1'` y derivando trace/fuentes desde el packet; no consultar tablas de Knowledge desde UI. Flag productivo `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` sigue default OFF hasta rollout.
- **Conversational Evidence V1 vigente (TASK-1093, 2026-06-12):** el packet `knowledge-search.v1` se adapta a `ConversationalEvidencePacket` (`nexa-evidence.v1`) en `src/lib/nexa/conversational-evidence.ts`. `NexaEvidencePanel` es el renderer compartido para chat `search_knowledge` y `NexaKnowledgeAnswerSurface`; `NexaComposer kind='inlineFollowUp'` gobierna follow-ups descendidos y `mapThreadMessagesToInitial()` rehidrata tool-calls persistidos cuando existen.
- **Nexa Provenance Trace vigente (TASK-1103/1108, 2026-06-13):** `NexaProvenanceTrace` es la primitive SoT del grounding conversacional. Variants `inline|expandable|panel`; kinds `knowledgeGrounded|signalPromoted|computed|custom`; `inline` renderiza trust cue compacto, `expandable` reasoning, `panel` proof/evidencia y `panel tabs` agrega built-ins packet-driven (`sources|trace|packet`) + slot de dominio. `NexaAnswersCanvas` delega reasoning/proof, `NexaAnswerBubble` delega trust cue y `/knowledge`/Answer Trace usa el proof tabbed. `signalPromoted` queda contract-ready; rollout real por dominio sigue fuera de TASK-1103.
- **Nexa Answers primitives vigentes (TASK-1096, 2026-06-13):** `NexaAnswersCanvas` es la primitive transversal para answers embebidos multi-surface (`renderPlan|runtime`, `embedded|sidecar|inline`) y delega bloques `conversationBubble`/`answerBubble`/`compactAnswer` desde un render plan gobernado por `surfaceContext.allowedRenderers`. `NexaExpressiveText` habilita voz expresiva serializable (`string | segment[]`) con estilos semánticos cerrados (`strong`, `emphasis`, `soft`, `metric`, `positive`, `warning`, `danger`, `emoji`, `break`) y sin HTML/CSS arbitrario. `NexaConversationBubble` cubre la conversación base con variants `userQuestion`, `assistantThinking`, `assistantText`, `assistantFollowUp`, `systemNotice`; reusa `NexaSenderMark`, `GreenhouseThinkingBeat`, `NexaExpressiveText` y `GreenhouseButton.kind`. La familia base no usa colas; las variantes assistant comparten la identidad aprobada de Nexa Chat (sender mark + wordmark inline Poppins fuera del contenido), `assistantThinking` agrega beat de 5 dots bajo el wordmark; Nexa usa esquina superior izquierda recta y la bubble enviada por usuario usa solo esquina inferior derecha recta. Las entradas usan motion CSS tokenizado (`opacity`/`translate3d`/`scale`), distinto por rol y con reduced-motion. `NexaAnswerBubble` es la primitive del answer-turn enriquecido con variants `explanation`, `chart`, `metricSummary` y `actionPlan`; charts/sparklines usan la paleta canónica `GH_COLORS.chart.categorical`, mientras que colores semánticos quedan para delta/riesgo/estado. `actionPlan` mantiene la evidencia en el trust/proof row, reserva CTAs para acciones de negocio y usa jerarquía de tesis + acción concreta con grupos neutros, rows y divisores horizontales. Lab/GVC: `/design-system/nexa-chat` con `.captures/2026-06-13T02-03-21_design-system-nexa-chat`.
- **Triple documentacion obligatoria (2026-06-11):** todo dominio, modulo, funcionalidad, feature, workflow, integration, tool, API o surface de Greenhouse debe tener tres capas: documentacion tecnica (`docs/architecture/`, `docs/api/`, ADR/spec), documentacion funcional (`docs/documentation/<dominio>/`) y manual de uso/runbook (`docs/manual-de-uso/<dominio>/`). La proporcionalidad cambia el tamano, no la obligacion: delta corto en docs existentes para cambios pequeños; docs nuevos para capacidades nuevas. No declarar `complete` si falta una capa requerida; si una capa no aplica todavia, documentar razon, owner y condicion de retiro en task/handoff. Fuente canonica: `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`.
- **Radius tokens en MUI `sx` — gotcha vigente (2026-06-10):** `theme.shape.customBorderRadius.*` almacena números en px, pero `borderRadius` numérico dentro de `sx` lo transforma MUI como multiplicador de `theme.shape.borderRadius`. En `sx`, usar siempre CSS length (`'4px'`, `'6px'`, etc.; o `9999px`/`50%` para pills/círculos). No volver a documentar `borderRadius: theme.shape.customBorderRadius.*` como ejemplo correcto dentro de `sx`; infla radios y hace superficies demasiado blandas.
- **GreenhouseBreadcrumbs primitive vigente (2026-06-10):** `GreenhouseBreadcrumbs` (`src/components/greenhouse/primitives/`) es la primitive canónica para navegación jerárquica basada en AXIS Figma `Breadcrumbs Greenhouse` (fileKey `yyMksCoijfMaIoYplXKZaR`, node `205:234905`). Variants oficiales: `default|compact`; kinds: `pageHierarchy|workbenchHierarchy|designSystemSpecimen|legacy|custom`; separators `slash|chevron`. Usa MUI Breadcrumbs como base semántica accesible, ancestors como links reales y current page con `aria-current='page'`; el wrapper legacy `Breadcrumb` delega en la primitive. Lab interno: `/admin/design-system/breadcrumbs`; scenario GVC: `design-system-breadcrumbs`. Regla: no duplicar breadcrumbs con botones "volver".
- **Efeonce Orbital Signature Lab (2026-06-09):** `EfeonceOrbitalLogoMark` (`src/components/greenhouse/primitives/`) es la primitive experimental/hardening para probar motion del wordmark institucional Efeonce sin tocar el asset principal. Variants: `static|orbitalSignature|ambient`; kinds: `institutionalWordmark|motionSpecimen`; usa `useGreenhouseGSAP` con reduced-motion baked-in. El SVG fuente canónico `public/branding/logo-full.svg` queda intacto; la copia editable vive en `public/branding/experiments/efeonce-logo-full-orbit-motion-copy.svg` con IDs para `#efeonce-orbit-top-bridge`, `#efeonce-orbiting-satellite-circle`, `#efeonce-orbit-rings` y nave. La órbita 360° recorre el óvalo que forma la O/nave; el bridge superior rellena la pista cuando el punto se mueve. Lab interno: `/admin/design-system/efeonce-brand`; scenario GVC: `design-system-efeonce-brand`.
- **Skill `efeonce-agency` vigente (Codex, 2026-06-09):** `.codex/skills/efeonce-agency/SKILL.md` enruta al context pack de negocio `docs/context/` antes de proponer/priorizar features, escribir copy visible, nombrar métricas/KPIs, tocar ICO/HubSpot/Account 360/onboarding/GTM/marca o razonar ASaaS/switching cost/tiers. Es un router doctrinal, no reemplaza `docs/context/*` ni arquitectura/runtime verificados; empieza por `docs/context/00_INDEX.md`.
- **Organization Brand Assets foundation (TASK-999, 2026-06-08):** `organizations.logo_asset_id` es el puntero final del logo canonico de una organizacion, servido como private asset via `logoUrl`. El flujo comercial aplica solo a `is_operating_entity=FALSE`; Efeonce/operating entities/legal logos quedan fuera y `attachOrganizationLogoAsset()` bloquea `is_operating_entity=TRUE` antes de tocar assets. Foundation dev: `organizations.website_url`, `organization_brand_asset_candidates`, `organization_360.logo_asset_id/website_url/is_operating_entity`, contexts `organization_logo_draft|candidate|logo`, capability `organization.brand_asset` (`review|update`) y API `POST /api/organizations/[id]/brand-assets/logo`. ADR: `docs/architecture/GREENHOUSE_ORGANIZATION_BRAND_ASSET_DECISION_V1.md`. Pendiente antes de cierre operativo: discovery worker, review queue, signals y rollout staging/prod.
- **GVC data-capture markers (2026-06-08):** para cualquier UI visible nueva o modificada que pueda necesitar evidencia GVC, agregar `data-capture` estable en el wrapper capturable de secciones, panels, cards revisables, design-system specimens, estados (`loading`/`empty`/`degraded`/`error`/`success`) y pasos repetibles de flujo. Usar nombres semánticos kebab-case (`home-nexa-insights-bento`), sin PII ni copy traducible; no marker-spam en cada botón/div salvo interacción/captura específica. Los scenarios deben preferir `[data-capture="..."]` para readiness, scroll, clip, requiredRegions e interacciones. Task de formalización cross-agent/docs: `TASK-1056`.
- **GVC micro sampler + GC (2026-06-09):** `pnpm fe:capture:micro --route=/path --selector='[data-capture="x"]'` es la lupa canónica para motion fino selector-scoped: genera frames PNG secuenciales, `recording.webm`, `contact-sheet.png`, `manifest.json`, `index.html` y `micro.gif` opcional, sin determinismo de baseline para preservar animaciones reales. `pnpm fe:capture:gc` sigue dry-run por defecto y ahora acepta `--days`, `--max-gb` y `--keep` para evitar llenar disco con `.captures/`.
- **Nexa Brand Mark + motion primitives vigentes (2026-06-09):** `GreenhouseNexaBrandMark` (`src/components/greenhouse/primitives/`) es el contrato canónico para la identidad visual de Nexa con kinds `askNexaBadge|badgeIcon|inlineMark|monoMark`. Source visual: `public/images/nexa-mark/*`; regla de marca: arco + sparkle siempre juntos, nunca `tabler-sparkles` solo como Nexa. `kind='askNexaBadge'` renderiza el badge Midnight Navy con label `Pregúntale a Nexa` y sigue siendo el default estático. `GreenhouseNexaAnimatedMark` suma runtime Rive (`@rive-app/react-canvas`) para reproducir un `.riv` cuando exista y fallback GSAP para `autoBlink` + `ambientMoments` (`arcSparklePlay` / `signalCatch`, scheduler sin solapar momentos); animar de verdad en Rive requiere export desde Rive Editor, no el SVG crudo en runtime. `GreenhouseNexaAnimatedAskBadge` es la primitive separada del badge `Pregúntale a Nexa` con el blink del FAB; se activa en greetings mediante `askBadgeVariant='animated'` y V1 consumer oficial es `GreenhouseFunnelChartCard` (`GreenhouseNexaGreeting kind='funnelStageAdvisor'`). `NexaFloatingButton` consume el mark animado y su hover/focus usa `GreenhouseSpectrumBeam` brand detrás del FAB, apagado en idle. Hoja viva: `/admin/design-system/nexa-brand`; scenario GVC: `design-system-nexa-brand`; lupa motion: `pnpm fe:capture:micro`.
- **Greenhouse Thinking Beat primitive vigente (2026-06-09):** `GreenhouseThinkingBeat` (`src/components/greenhouse/primitives/`) es el contrato canónico para los tres dots de pensamiento/actividad breve. Variants: `inline|cluster|standalone`; kinds: `nexa|assistant|sync|neutral`; controller `greenhouse-thinking-beat-controller.ts` gobierna timings, color mode y defaults. Usar `decorative` cuando vive dentro de una frase ya legible; dejar `role='status'`/`aria-label` cuando vive solo. No reemplaza `GreenhouseLoadingSurface` para procesos largos. Lab: `/admin/design-system/microinteractions`; scenario GVC: `design-system-microinteractions`.
- **Greenhouse Funnel Analysis Pattern vigente (2026-06-09):** `GreenhouseFunnelChartCard` (`src/components/greenhouse/primitives/`) es la composition oficial del **Funnel Analysis Pattern**: patrón para leer procesos por etapas con volumen, retención, SLA, caídas, bloqueos y asistencia Nexa. Extiende la familia de chart cards como composición de zona, no mega-componente opaco. Variants oficiales: `operationalPipeline|conversionPipeline|lifecyclePipeline`; kinds `cscPipeline|commercialLifecycle|quoteToCash|onboardingActivation|custom` resuelven a variant en `greenhouse-funnel-chart-controller.ts`. Zonas exportadas: `GreenhouseFunnelHeaderControls`, `GreenhouseFunnelKpiStrip`, `GreenhouseFunnelStageRail`, `GreenhouseFunnelStageSegment`, `GreenhouseFunnelDiagnosticsGrid`; nuevos kinds deben extender data/copy/mapping, no copiar JSX del rail. V1 usa renderer custom para el rail horizontal rico (etapas, SLA, retención, bloqueos, owner, freshness, insight y selección keyboard-accessible); `stageRole` define color de proceso y `health`/diagnostics definen salud operativa, con asistencia contextual de etapa vía `GreenhouseNexaGreeting kind='funnelStageAdvisor'` (prompt dock blanco centrado, `askBadgeVariant='animated'`, guía contextual en primera persona que rota lentamente con `GreenhouseThinkingBeat kind='nexa'`, input estable sin doble movimiento, título/foco en tooltip, sin duplicar owner/freshness), empty state honesto y normalización de valores inválidos. El rail usa fills por etapa, separadores internos clippeados con apex suavizado y un borde exterior único redondeado; no volver a strokes completos por segmento porque generan artefactos en caps/uniones. Recharts queda reservado para futuras variants verticales (`FunnelChart/Funnel`) sin forzar la geometría de pipeline. Lab: `/admin/design-system/charts`; scenario GVC: `design-system-charts`; micro evidence del badge animado `.captures/2026-06-09T20-57-11_micro-admin-design-system-charts-data-capture-nexa-ask-badge-animated`.
- **Disclosure text typography token vigente (2026-06-08):** `disclosureText` / `disclosure-text` es el token canónico para avisos compactos de IA, legales, seguridad o confianza escritos como oración. Geist 400, `0.75rem` (12px), `lineHeight=metadata(1.45)`, tracking metadata. Usar `Typography variant='disclosureText'`; no bajar `caption` con `fontSize` local, no usar `overline` para oraciones y no revivir microtexto de 8px.
- **TeamBot manual messages + mentions en Adaptive Cards (2026-06-08; delta Performance Report mensual 2026-07-01):** `pnpm teams:announce` soporta menciones reales con `--mention "Texto visible|entraObjectIdOrUpn|Nombre de perfil"` y CTA opcional. Para Adaptive Cards, `mentioned.id` debe ser Microsoft Entra Object ID puro o UPN; **no usar** `29:<aadObjectId>` (smoke real: renderizó texto plano). Tampoco agregar `activity.text` cuando se envía un card, porque Teams lo muestra como burbuja duplicada arriba. El **Performance Report mensual del Team Efeonce** se anuncia en `EO Team` desde Nexa el primer día de cada mes, o primer día hábil siguiente si cae inhábil; antes de redactar se debe pedir al operador el link de Notion del informe, leerlo, estructurar el card con 6 bloques máximo, scorecard On-Time/RpA y CTA `Abrir informe`. Delta visual del envío real de junio: el card quedó demasiado denso; próximos envíos deben priorizar aire/escaneo, bloques cortos, scorecard no-inline, y si hay 3+ personas conviene extender el helper gobernado para `FactSet`/`Container` antes de mandar otro reporte. Después del anuncio grupal, Nexa envía **follow-ups individuales 1:1** a cada integrante del scorecard con la misma cadencia, equilibrando insights positivos y oportunidades de mejora; usar `recipient_kind='chat_1on1'`, Entra Object ID crudo como `recipient_user_id`, dry-run previo y audit en `source_sync_runs`. El patrón canónico vive en `docs/operations/manual-teams-announcements.md`, arquitectura `GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md` v1.4 y skills `greenhouse-teams-message-operator` + `teams-bot-platform` (Codex + Claude). Paths nuevos: `.codex/skills/greenhouse-teams-message-operator/SKILL.md` y `.claude/skills/greenhouse-teams-message-operator/SKILL.md`.
- **ApexCharts wrapper canonico + diagnostico Turbopack (2026-06-07, ISSUE-085):** `src/libs/styles/AppReactApexCharts.tsx` es el **único owner** del `next/dynamic(..., { ssr:false })` para `react-apexcharts`. Los consumers deben importarlo directo; no envolver `AppReactApexCharts` con otro `dynamic()` ni importar el legacy `@/libs/ApexCharts` (retirado). Motivo: el doble dynamic dejó manifests de Turbopack apuntando a chunks huérfanos (`react-apexcharts_min_*.js` 404), causando `Compiling...` infinito y loop de CPU en local. Si localhost queda compilando, diagnosticar antes de limpiar: `ps`/CPU, `curl -I` vs browser real, Playwright console/network filtrando `_next/static/chunks`, y comparar `react-loadable-manifest.json` contra `.next/dev/static/chunks`. `pnpm clean` confirma, no sustituye el fix. Guardrail: `greenhouse/no-dynamic-app-react-apexcharts` en modo `error`.
- **Design System catalog canonico (2026-06-07):** `/admin/design-system` ya no es la pagina de color; es la home interna navegable de AXIS/Design System para encontrar tokens, primitives, patrones, labs y governance. Toda nueva incorporacion del Design System debe agregarse a `DesignSystemCatalogView` con ruta real, SoT/owner y tags buscables, declararse en `route-reachability-manifest.ts`, tener scenario GVC cuando sea visual/repetible y enlazar su contrato en `ui-platform/*`/arquitectura/ADR segun aplique. La paleta AXIS vive ahora en `/admin/design-system/colors` como pagina enfocada solo en color (mismo viewCode `administracion.design_system`, clientes redirigen a `/401`). Scenario GVC del catalogo: `design-system-catalog`.
- **Color como capa gobernada con guard mecanico (TASK-1053, 2026-06-08, en progreso):** el sistema de color adopto la direccion **Restraint v1** (ADR `GREENHOUSE_SEMANTIC_COLOR_SYSTEM_DECISION_V1`, en `DECISIONS_INDEX`). Fase A re-value shipped: semanticos AA (info `#1F6FD4`/success `#157F47`/error `#DC2E39` texto-blanco; warning `#FFB703` ink), secondary a verde coherente (`#4B8405` ink), y paleta categorica de charts (`GH_COLORS.chart.categorical` deriva de `axis-chart.ts`; orange `#FF6500` = serie #3). Primary `#0375DB`/gray/neutrales INTACTOS. **Contrato para agentes:** cambiar color = editar el SoT AXIS (`axis-tokens`/`axis-semantic`/`axis-secondary`/`axis-chart`), todo deriva, NUNCA override en mergedTheme ni hex inline; el color ahora es **capa guardada** (drift-guard `axis-semantic-drift.test` + contrast gate `axis-semantic-contrast.test` + paridad 3 capas DESIGN.md/V1, como typography/elevation). Charts: color-nunca-solo (legend/labels) + cashflow signo/icono obligatorio (CVD). Pendiente Fase B (sub-valores ink/tint/border/dark-fg + tonal/dot/KPI-inline + dark-fg). Valores: TASK-1053 §"Paleta APROBADA".
- **Geometry foundations AXIS/Greenhouse vigentes (TASK-1050, 2026-06-07):** `/admin/design-system/geometry` es la referencia interna viva para spacing/radius. Spacing AXIS `Gap/Padding-N` se consume como `theme.spacing(N)` / `Stack spacing={N}` / `sx={{ p/gap: N }}`; el lab renderiza `1..16 + 25`. Radius AXIS `xs/sm/md/lg/xl` vive en `theme.shape.customBorderRadius.*` (`2/4/6/8/10`). Greenhouse agrega `xxl=12` y `display=16` en el runtime + tipos MUI para superficies grandes con uso intencional; no son tokens AXIS upstream ni default para tablas, inputs, menus o cards operacionales densas. `Border-Round` Figma (`500`) se implementa como `9999px` para pills/capsules o `50%` para circulos. Scenario GVC: `design-system-geometry`; contrato: `DESIGN.md`, `GREENHOUSE_DESIGN_TOKENS_V1.md` §4-§5 y `ui-platform/STACK.md`.
- **UI Platform docs reestructurados (2026-06-07):** la referencia de plataforma UI vive en `docs/architecture/ui-platform/` (empezar por `README.md` + mapa "dónde vive X"): docs temáticos de estado vigente (`STACK`/`PRIMITIVES`/`STATE`/`FORMS`/`TABLES`/`MOTION`/`I18N`/`PATTERNS`/`GOVERNANCE`) + `HISTORIAL.md` (cronología append-only de las `## Delta`). El viejo `GREENHOUSE_UI_PLATFORM_V1.md` quedó como **router stub** (preserva referencias). **Regla anti-monolito:** un cambio vigente edita el doc temático; la entrada cronológica va a `HISTORIAL.md`; un contrato compartido va a su ADR + `DECISIONS_INDEX.md`; nunca volver a un monolito que mezcle vigente + historial. Enforcement: skill `greenhouse-documentation-governor` (Claude + Codex) + docs lint `scripts/check-documentation-closure.mjs` (findings `architecture_doc_monolith`, `ui_platform_stub_regrowth`). Naming `ui-platform/` neutro; **AXIS reservado para el lenguaje visual** (color/tokens/tipografía/motion). ADR: `docs/architecture/GREENHOUSE_UI_PLATFORM_RESTRUCTURE_DECISION_V1.md`.
- **Greenhouse Button primitive vigente:** `GreenhouseButton` (`src/components/greenhouse/primitives/`) es la primitive canonical para botones de producto basada en AXIS Figma `Buttons` (`yyMksCoijfMaIoYplXKZaR`, node `324:32923`). Variants oficiales: `solid`, `label`, `outlined`, `text` (mapeadas a MUI/Vuexy `contained`, `tonal`, `outlined`, `text`); tones: `primary`, `secondary`, `error`, `warning`, `info`, `success`; sizes: `large/medium/small`; kinds: `primaryAction`, `secondaryAction`, `destructiveAction`, `inlineAction`, `navigation`, `filter`, `custom`. El resolver `kind→variant/tone` vive en `greenhouse-button-controller.ts`; el lab interno vive en `/admin/design-system/buttons`; scenario GVC: `design-system-buttons`. `GreenhouseAsyncActionButton` compone esta primitive para emphasis/variant/tone/size/icon slots y conserva su capa propia de estados async.
- **Skill Codex de tipografia vigente (2026-06-07):** `.codex/skills/greenhouse-typography-accessibility/` es la skill especializada para auditar/implementar jerarquia tipografica, pesos, variantes MUI, contraste, espaciado accesible y frontera Poppins/Geist. Se creo solo para Codex (no para Claude) porque las skills de Product Design de Claude no tienen el mismo stack. Compone con `design-system-governance` si se cambian tokens/SoT, con `greenhouse-ui-orchestrator` si falta elegir patron y con `greenhouse-ui-enterprise-review` para el gate visual final.
- **Typography surface hero token vigente (2026-06-08):** `surfaceHeroTitle` / `surface-hero-title` es el token canónico para títulos primarios de surfaces full-page/workbench y headers de identidad principales. Poppins 600, `2.125rem` desktop/tablet, `1.75rem` mobile, `lineHeight=surfaceHero(1.15)`. Uso estricto: máximo uno por surface; nunca cards, tablas, listas, drawers, modals, dashboards, rows repetidas, headings genéricos ni marketing heroes; page titles densos/de detalle siguen en `h4/page-title`. Consumers validados: `/people/mockup/daniela-workforce` y título `Organizaciones` en `/agency/organizations/mockup`; GVC persona `.captures/2026-06-08T09-32-36_person-daniela-workforce-profile`. Contrato: `DESIGN.md`, `GREENHOUSE_DESIGN_TOKENS_V1.md`, `typographyScale`, `TYPOGRAPHY_VARIANT_BRIDGE`.
- **Greenhouse Chip primitive vigente:** `GreenhouseChip` (`src/components/greenhouse/primitives/`) es la primitive canonical para chips compactos basada en AXIS Figma `Chip` (`yyMksCoijfMaIoYplXKZaR`, node `369:92030`). Variants oficiales: `solid`, `label`, `outlined`; tones: `default`, `primary`, `secondary`, `error`, `warning`, `info`, `success`; sizes: `medium`/`small`; kinds: `status`, `attribute`, `input`, `action`, `identity`, `filter`, `metric`, `custom`. El Chips Lab interno vive en `/admin/design-system/chips`, usa el avatar Figma `Avatar/Greenhouse` (node `369:72301`) como asset de documentación (`public/images/greenhouse/design-system/axis-avatar-greenhouse.png`) y no altera el helper productivo `resolveAvatarUrl`.
- **Vercel staging / Next.js 16 Proxy vigente (2026-06-07):** el deploy de `develop` a Vercel `staging` fallo con `ENOENT .next/server/middleware.js.nft.json` despues de introducir un `middleware.ts` raiz para mantenimiento. Causa raiz: el repo ya tenia `src/proxy.ts` como entrypoint global Next.js; con Next 16 (`middleware.ts` deprecado, `proxy.ts` canonico) el doble entrypoint genero manifests mixtos que Vercel no pudo empaquetar. Contrato corregido: **NO crear `middleware.ts`**. Toda logica request-global vive en `src/proxy.ts`, encadenada por responsabilidad, default-OFF/fail-open, sin DB/IO por request. Responsabilidades actuales: security headers globales + maintenance gate (`src/config/maintenance.ts`). Guard mecanico: `pnpm next-global-entrypoint-gate` corre en `prebuild` y exige exactamente `src/proxy.ts`. Doc: `docs/documentation/plataforma/middleware-edge.md`.
- **Greenhouse Activity Timeline primitive vigente:** `GreenhouseActivityTimeline` (`src/components/greenhouse/primitives/`) es la primitive inicial de utilities para timelines de actividad/hand off/documentos basada en AXIS Figma `Activity Timeline` (`yyMksCoijfMaIoYplXKZaR`, node `6678:105154`). Variants oficiales: `card`, `embedded`, `compact`; kinds semanticos: `activityTimeline`, `auditTrail`, `handoffTimeline`, `documentTimeline`, `custom`. Usa MUI + Framer Motion via wrapper canonico y `useReducedMotion`; los clusters de equipo reutilizan `TeamAvatarGroup` para no duplicar microinteracciones/avatar behavior; GSAP queda reservado para timelines medidos/scroll/path complejos. Lab interno: `/admin/design-system/utilities`; scenario GVC: `design-system-utilities`.
- **Greenhouse chart primitives vigentes:** `GreenhouseMetricBreakdownChartCard`, `GreenhouseChartCard` y `GreenhouseStackedDistributionChartCard` (`src/components/greenhouse/primitives/`) son las primitives iniciales para chart cards enterprise basadas en Recharts. V1 adapta AXIS Figma `Earning Reports` semanal (`yyMksCoijfMaIoYplXKZaR`, node `6717:211725`) con KPI hero + delta + bar chart semanal + metric meters, `Earning Reports` anual (node `6717:214469`) con tabs de metrica + bar chart mensual, y `Vehicles overview` (node `6717:215195`) con distribucion apilada horizontal + filas operativas. Lab interno: `/admin/design-system/charts`; scenario GVC: `design-system-charts`. No usar tablas sr-only grandes para estas primitives: el fallback accesible debe permanecer como caja 1x1 via `aria-describedby` para evitar layout phantom en mobile.
- **Greenhouse Operating Loop vigente:** nombre canonico del ciclo operativo `intake -> taxonomy -> plan -> execution -> verification -> closure -> handoff`. Fuente: `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`. Enforcement mecanico V1: `pnpm task:lint` cubre `TASK-###`; `pnpm epic:lint` cubre `EPIC-###`; `pnpm mini:lint` cubre `MINI-###`; `pnpm ops:lint` orquesta los tres. Para cambios en `docs/tasks/`, `docs/epics/` o `docs/mini-tasks/`, usar `pnpm ops:lint --changed` como primera pasada. V1 valida estructura, lifecycle/carpeta, registry, next ID y checkboxes; cierre semantico/end-to-end sigue en el protocolo de cada artefacto + `pnpm docs:closure-check`. Deuda historica: epics previos a `EPIC-018` y mini-tasks previas a `MINI-005` quedan exentos en barridos globales/active, pero si se modifican o revisan con `--item` deben normalizarse.
- **Hook pre-ejecucion TASK-* vigente para Codex solamente:** cualquier pedido del operador a Codex que mencione `TASK-###`, `[TASK-###]`, una ruta `docs/tasks/**/TASK-###-*.md` o un alias slash-style (`/implement-task TASK-###`, `/implement-task ###`, `/task TASK-###`, `/task ###`) obliga a ejecutar `pnpm codex:task-hook TASK-###` antes de implementar y aplicar el prompt que imprime. El hook acepta ids numericos (`pnpm codex:task-hook 1033`) y los normaliza a `TASK-1033`. Si el operador dice `mantente en develop`, usar `pnpm codex:task-hook TASK-### --develop`. Aplica solo a Codex y solo a tasks formales `TASK-*`; no obliga automaticamente a Cursor, Claude u otros agentes, ni aplica a preguntas generales, brainstorming, mini-tasks o issues salvo pedido explicito. La excepcion de rama debe documentarse en Audit/Plan/Handoff. Para tasks UI/UX o cualquier UI visible, el prompt impreso exige un `UI/UX Goal Guard`: en Claude Code se fija `/goal TASK-### UI enterprise-ready`; en Codex se usa el mecanismo nativo equivalente o se replica como hard gate en Audit/Plan. Ese goal debe cubrir skills product design, primitive decision, tokens/copy canónicos, GVC desktop+mobile revisado, `scrollWidth==clientWidth` desktop+390px, sin overlaps/console errors y docs/gates sincronizados. Codex no debe crear `git worktree`/folders clon por defecto; solo con pedido o aprobacion explicita del operador, y debe limpiarlos al cerrar si por excepcion se crean. Skill Codex local: `.codex/skills/greenhouse-task-execution-hook/SKILL.md`. Drift guard: `pnpm codex:task-hook:check` valida prompt/hook/aliases/entrypoints y debe correrse cuando cambien hook, prompt, skills, commands/gates o entrypoints TASK. Versionamiento: cambios compatibles se mantienen en `CODEX_EXECUTION_PROMPT_V1.md`; cambios estructurales de trigger/fases/formato/branch policy/worktree policy/source-of-truth requieren `CODEX_EXECUTION_PROMPT_V2.md`.
- **Hook pre-ejecucion ISSUE-* vigente para Codex solamente:** cualquier pedido del operador a Codex que mencione `ISSUE-###`, `[ISSUE-###]`, una ruta `docs/issues/**/ISSUE-###-*.md` o un alias slash-style (`/fix-issue ISSUE-###`, `/fix-issue ###`, `/issue ISSUE-###`, `/issue ###`) obliga a ejecutar `pnpm codex:issue-hook ISSUE-###` antes de escribir codigo y aplicar el prompt que imprime. El hook acepta ids numericos (`pnpm codex:issue-hook 045`), bloquea issues resueltos salvo `--review-resolved`, y si el operador dice `mantente en develop` se usa `--develop`. La primera decision obligatoria del prompt es `issue-only fix` vs `issue + TASK` vs `blocked`: los issues localizados se cierran con causa raiz + evidencia; remediaciones amplias pasan a task. Todo cierre exige identificar consumidores/contratos vecinos y dejar evidencia de no-regresion o riesgo residual. Skill Codex local: `.codex/skills/greenhouse-issue-execution-hook/SKILL.md`; prompt canonico `docs/operations/CODEX_ISSUE_EXECUTION_PROMPT_V1.md`; drift guard `pnpm codex:issue-hook:check`.
- **Dashboard Floating Action Dock vigente (TASK-1035):** las acciones flotantes persistentes del dashboard viven en `ShellFloatingActionDock` (`src/components/greenhouse/primitives/ShellFloatingActionDock.tsx`) y se montan desde `src/app/(dashboard)/layout.tsx`. V1 consumers: `NexaFloatingButton` y `ScrollToTop`. El dock publica `--gh-floating-actions-*` (`inline-offset`, `bottom`, `gap`, `trigger-size`, `stack-size`, `safe-inline-size`, `safe-block-size`) para que sticky bars/footers reserven espacio sin hardcodes locales. No crear nuevos fixed bottom-right globales fuera del dock; no confundir con `GreenhouseFloatingSurface` (`TASK-1033`), que cubre popovers/tooltips/menus anclados con Floating UI, ni con `AdaptiveSidecar`, que cubre carriles contextuales full-height.
- **Greenhouse microinteraction primitives V1/V1.1 vigentes:** `GreenhouseAsyncActionButton` (`src/components/greenhouse/primitives/GreenhouseAsyncActionButton.tsx`) es la primitive para commands puntuales con estados `idle/loading/success/error`, aria-live, `aria-busy` en loading, reduced-motion y proteccion contra doble submit; compone `GreenhouseButton` para no duplicar contrato de button base. `GreenhouseCommandFeedback` cubre resultado persistente post-accion (`success/error/warning/info/retrying`). `GreenhouseStateTransition` cubre cambios visibles de estado en rows/cards/panels (`surface/inline`). `GreenhouseInlineValidation` cubre validacion local/async (`field/section/summary/asyncCheck`). V1.1 agrega `GreenhouseFieldProvenancePeek` (procedencia/confianza/frescura de campos; compone `GreenhouseFloatingSurface` como `evidencePeek/fieldProvenance`), `GreenhouseStepperProgressMicro` (progreso operativo compacto 3-5 pasos), `GreenhouseEvidenceAttachmentDropzone` (adjunto/evidencia con upload/scanning/verified/rejected) y `GreenhouseInlineDecisionPrompt` (decisiones inline de riesgo controlado). Usar en vez de botones locales con `submitting ? <CircularProgress /> : ...`, feedback local improvisado, cambios de estado invisibles, validaciones planas, popovers de procedencia por dominio, steppers compactos ad-hoc, dropzones pobres o prompts inline locales. Lab interno: `/admin/design-system/microinteractions`. Nuevas variants deben iterarse en estas primitives + lab antes de crear componentes paralelos. No reemplazan procesos largos multi-step, timelines de auditoria completos, maker-checker, Dialog destructivo/legal/financiero ni adapters server-side de upload/vault/scan.
- **Greenhouse Loading Surface vigente (TASK-1037, Slice 1 + enterprise expansion):** `GreenhouseLoadingSurface` (`src/components/greenhouse/primitives/GreenhouseLoadingSurface.tsx`) es la primitive inicial para elevar loading states mas alla de spinners/skeletons locales. Variants V1/V1.1: `pageSkeleton`, `panelSkeleton`, `tableSkeleton`, `inlineAction`, `brandSplash`, `aiThinking`, `progressRail`, `documentPipeline`, `externalHandoff`, `secureAction`, `uploadVerification`, `reconciliationMatching`. Cada variant tambien tiene componente nombrado reusable exportado desde `@/components/greenhouse/primitives` (`GreenhouseDocumentPipelineLoader`, `GreenhouseExternalHandoffLoader`, etc.); consumers productivos deben preferir esos nombres cuando el job sea conocido. El Loading Lab interno vive como child route en `/admin/design-system/loaders` y se valida con GVC desktop+mobile separado del canon de color AXIS. Reutilizar stack no significa limitar capacidad visual: Framer/CSS/MUI/AXIS son el chasis; si una route/panel/IA/documento/proveedor/evidencia/conciliacion necesita loader moderno, extender la primitive antes de crear otro loader local.
- **CI/deploy hardening vigente — Secret Manager IAM bindings con retry:** los deploys Cloud Run que otorgan `roles/secretmanager.secretAccessor` deben usar `services/_shared/gcloud-secret-iam.sh`. El helper revisa binding existente antes de mutar, reintenta `409 concurrent policy changes`/`ABORTED` con backoff acotado y no imprime valores secretos. Aplica ya a `ops-worker`, `commercial-cost-worker` y `hubspot_greenhouse_integration`. Causa fuente: fallo GitHub Actions `Commercial Cost Worker Deploy` del 2026-06-06 por carrera IAM en Secret Manager; arquitectura: `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`.
- **Ops Health route vigente:** la superficie canónica de incidentes operativos es `/admin/ops-health`. `/admin/operations` se mantiene solo como alias legacy redirect-only hacia `/admin/ops-health` para bookmarks, docs antiguos y links externos; nuevas referencias runtime deben usar `/admin/ops-health`.
- **Playwright staging vigente:** usar `pnpm test:e2e:staging` para smokes contra staging. El entrypoint `scripts/playwright-staging.mjs` reusa `scripts/lib/vercel-staging-access.mjs` para resolver `STAGING_URL`/`PLAYWRIGHT_BASE_URL`, `AGENT_AUTH_SECRET`, `AGENT_AUTH_EMAIL` y `VERCEL_AUTOMATION_BYPASS_SECRET` desde env, `.env.local` o Vercel API sin imprimir valores sensibles. `scripts/playwright-auth-setup.mjs` carga `.env.local`/`.env` cuando corre standalone; no hace falta `source .env.local` para `pnpm test:e2e:setup` o el suite Playwright.
- **Floating UI / Greenhouse Floating Surface vigente:** Greenhouse usa `@floating-ui/react` como engine canonico para superficies contextuales ancladas, expuesto via `GreenhouseFloatingSurface` + `floating-surface-controller`, no imports ad-hoc en views de producto. Usos permitidos: rich tooltips, action menus, evidence peeks, inline editors, validation bubbles y command previews. No usarlo para sidecars full-height (`AdaptiveSidecar`), decisiones destructivas/legales/financieras (`Dialog`) ni workflows largos. ADR: `docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md`.
- **Design System Lab tokens vigente:** los labs internos `/admin/design-system/**` pueden renderizar specimen chrome, pero no deben dispersar color/tipo/motion/layout literals en views. Para el museo de Floating Surface se creó `src/views/greenhouse/admin/design-system/design-system-lab-tokens.ts` como namespace reusable de layout/opacidad/focus/sombra/icon specimen; el view consume además `typographyScale`, `motionCss`, `GreenhouseButton`, `GreenhouseChip` y la primitive que documenta. Extender ese namespace antes de introducir números visuales locales en otros labs.
- **Error surfaces como brand/recovery moments vigente:** las skills UI (`greenhouse-ux-content-accessibility`, `greenhouse-product-ui-architect`, `greenhouse-ui-enterprise-review`) declaran que 404, 401, access denied, coming soon, maintenance y unavailable routes no deben tratarse como template errors desechables. Pueden capitalizarse con microcopy creativo si cada variante mantiene causa probable, salida funcional, accesibilidad y recovery actions estables. Variantes curadas (ej. 5) deben seleccionarse **una vez al entrar**, no rotar mientras el usuario lee, y vivir en `src/lib/copy/*`; validar con GVC cuando cambie la surface.
- **Primitive + Variants + Kinds vigente (metodologia UI canonica):** Greenhouse adopta `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md` como método para desarrollar UI reusable: una **primitive** estable owns layout/a11y/responsive/motion/shell/state/GVC; las **variants** son modos funcionales oficiales (no skins); los **kinds** son casos semanticos de dominio/workflow que deben mapear a una variant. Shape canonico: `<Primitive variant='inspector' kind='contractReview' />`. Cuando una UI se repite o es platform-level, no crear familias paralelas de drawers/cards/inspectors/assistants: extender la primitive y validar variants con GVC.
- **Adaptive Sidecar UI Platform vigente (runtime primitive en progreso):** Greenhouse adopta `Adaptive Sidecar` como capacidad UI platform multiuso, no Nexa-only, para asistencia, inspeccion, review, preview, edicion contextual, reconciliacion, evidencia/procedencia y runbooks operacionales que deben preservar el contexto de trabajo. Primitive canonica: `AdaptiveSidecarLayout`, `ContextualSidecar`, `ContextualSidecarBlocks`, `adaptive-sidecar-controller` y `AdaptiveSidecarShellProvider` desde `@/components/greenhouse/primitives`; variants oficiales: `inspector`, `composer`, `assistant`, `reconciler`, `evidence`, `runbook`. Incluye `reduceAdaptiveSidecarState()` para open/close/replace/dirty idempotente y resize desktop opcional con splitter accesible (`role=separator`, `aria-valuemin/max/now`, ArrowLeft/ArrowRight). Desktop preferente = sidecar in-flow full-height del canvas con push/reflow; para carriles top-to-bottom que ocupan el appbar, usar `sidecarExtent="viewport"` + `viewportShellReflow="greenhouse-vertical-navbar"` para publicar una reserva al shell. El navbar se adapta desde el provider; no usar CSS global route-local ni `!important` para tapar/pelear el appbar. Los sidecars viewport no deben ocultar el footer global ni crear scroll vertical de pagina: el workbench debe presupuestar header/footer/padding y mantener scroll containment interno. Mobile/tablet = Drawer temporal; Dialog modal sigue obligatorio para decisiones destructivas, irreversibles, legales, financieras o maker-checker. No crear drawers/modals desktop custom para este patron. TASK-1028 ya tiene mockup no-Nexa + GVC; piloto Nexa global sigue pendiente por collision model. ADR: `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md`; arquitectura: `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md`; implementacion en curso: `docs/tasks/in-progress/TASK-1028-adaptive-sidecar-ui-platform.md`.
- **Local-first development workflow vigente:** Greenhouse adopta `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md` para cortar gasto innecesario de GitHub Actions/Vercel/GCP bajo Vibe Coding sin perder calidad. Los comandos canónicos son `pnpm local:check` (`lint` + `tsc`), `pnpm local:check:ui` (`local:check` + `design:lint` + `build`) y `pnpm local:check:full` (`local:check` + `test` + `build`). Para diagnosticar costo remoto antes de tocar gates, usar `pnpm actions:cost:audit --from YYYY-MM-DD --to YYYY-MM-DD`; entrega hotspots estimados por workflow/job y no reemplaza `cloud.billing.github`. Por defecto, agentes iteran en local, levantan `pnpm dev` y entregan URL localhost para UI visible, y esperan confirmación humana antes de push remoto a `develop`/branch, salvo instrucción explícita o hotfix/release documentado.
- **Full API parity vigente:** Greenhouse adopta como principio transversal que toda capacidad ejecutable dentro del portal debe tener o planificar un equivalente programatico gobernado. La UI no es source of truth de logica de negocio: consume primitives server-side, commands/readers/projections y contratos API/app/MCP/CLI cuando el dominio requiera automatizacion o integracion. ADR canonico: `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`; decision indexada en `docs/architecture/DECISIONS_INDEX.md`; regla operativa corta en `AGENTS.md` y `CLAUDE.md`.
- **My Performance self-service activity vigente (TASK-1027):** `/my/performance` queda formalizada como surface colaborador para metricas ICO + Nexa insights propios, comparable en calidad a Person 360 Activity pero self-scoped. Contrato: sujeto siempre desde `requireMyTenantContext()`, DTO redacted sin costo/compensacion, Nexa advisory-only y menciones access-aware antes de linkear a People/Agency. ADR: `docs/architecture/GREENHOUSE_MY_PERFORMANCE_SELF_SERVICE_ACTIVITY_V1.md`; task ejecutable: `docs/tasks/to-do/TASK-1027-my-performance-rich-self-service-activity.md`.
- **Documentation Governor vigente:** Codex y Claude tienen la skill local invocable `greenhouse-documentation-governor` para el cierre documental posterior a implementaciones, incidentes, rollouts, cambios de arquitectura/workflow y skills locales. Debe usarse antes de declarar completo un cambio que afecte comportamiento, runtime, agentes, operaciones, releases, acceso, data, UI, integraciones o contratos compartidos. El helper mecanico `pnpm docs:closure-check` (`scripts/check-documentation-closure.mjs`) inspecciona diffs y emite hallazgos advisory sobre docs faltantes; puede acotarse con pathspecs cuando haya cambios paralelos. Paths canonicos: `.codex/skills/greenhouse-documentation-governor/SKILL.md` y `.claude/skills/greenhouse-documentation-governor/SKILL.md`.
- **macOS timeout vigente:** este workspace tiene `coreutils` instalado via Homebrew; usar `gtimeout` como equivalente canonico de GNU `timeout` en comandos locales (`gtimeout 30s <cmd>`). No usar `timeout` crudo en instrucciones para agentes en macOS; para scripts portables detectar `gtimeout || timeout` o implementar timeout en Node.
- **Browser diagnostics hook vigente:** Codex tiene la skill local `.codex/skills/greenhouse-browser-diagnostics/SKILL.md`. Cualquier pedido de revisar/abrir/diagnosticar/capturar/testear una ruta Greenhouse debe usar automáticamente Agent Auth + `scripts/playwright-auth-setup.mjs` + Playwright/Chromium, eligiendo la persona agente de menor privilegio que represente el caso: superadmin `agent@greenhouse.efeonce.org` para admin/permisos/diagnóstico transversal, collaborator `agent-collaborator@greenhouse.efeonce.org` para `/my`/self-service, y client `agent-client@greenhouse.efeonce.org` para portal cliente general. Para `dev-greenhouse.efeoncepro.com`, automatizar contra la URL staging `.vercel.app` con bypass; no pedir login al usuario ni usar navegación anónima como primer intento.
- **Greenhouse Visual Capture vigente:** `pnpm fe:capture` es la CLI de **Greenhouse Visual Capture** (`GVC`), herramienta canónica para evidencia visual con Playwright + agent auth. Cuando una tarea toca UI visible, microinteractions, responsive, screenshots, secuencias de frames, design QA o revisión visual, la evidencia primaria debe pasar por `pnpm fe:capture` / `pnpm fe:capture:review` y relacionados (`fe:capture:diff`, `fe:capture:health`, `fe:capture:gc`). Si existe scenario, usarlo; si no, `pnpm fe:capture --route=<path> --env=staging --hold=3000` para evidencia rápida y crear scenario bajo `scripts/frontend/scenarios/` cuando el flujo sea repetible, interactivo o requiera scroll/captura de secciones. Para pantallas largas usar `scroll selector`, `scrollTo`, `mark fullPage` y `mark clipSelector`, preferentemente con `data-capture="<seccion>"`. Desde V1.4, scenarios críticos deben preferir `readiness`, `assertions`, `interaction`, `viewports` y metadata `baseline` cuando reduzcan evidencia falsa; cada run genera `index.html` y failure taxonomy. Playwright ad-hoc queda como complemento para consola/red/API payloads o DSL insuficiente, con artifacts igualmente bajo `.captures/` y explicación del bypass. Arquitectura: `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`.
- **AI Visual Asset Generator vigente:** `src/lib/ai/image-generator.ts` es el entrypoint canonico para assets visuales generados por agentes. Las skills `greenhouse-ai-image-generator` (Codex `.codex/skills/greenhouse-ai-image-generator/SKILL.md`, Claude `.claude/skills/greenhouse-ai-image-generator/SKILL.md`) son el carril operativo para direccion de arte, prompt engineering profesional, acabados, materiales, composicion, iteracion y QA de iconos, UI elements, empty states, banners, assets transparentes y reference edits. Guia compartida: `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md`. `generateImage()` soporta `google-imagen` y `openai-image`; `GREENHOUSE_IMAGE_PROVIDER=openai-image` quedo configurado en Vercel Production, Development y Preview `develop`, con key resuelta via `OPENAI_API_KEY_SECRET_REF=greenhouse-openai-api-key` en GCP Secret Manager. `src/lib/ai/openai-image.ts` agrega `generateOpenAIImage()` (text-to-image), `editOpenAIImage()` (referencias/mascara) y `runOpenAIImageTool()` (Responses API multi-turn). Para PNG transparente, pedir `background='transparent'`; como `gpt-image-2` no soporta transparencia, el helper aplica fallback a `gpt-image-1.5` y devuelve `modelFallbackReason`. Arquitectura: `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`.
- **Reactive replay scoped vigente:** `processReactiveEvents()` acepta `handlerKeys` + `replayFailedHandlers` para reprocesar filas activas `retry/dead-letter` sin drenar backlog global. La ruta admin `/api/admin/ops/replay-reactive` acepta `domain`, `batchSize`, `handlerKeys` y `replayFailedHandlers`. Usar este camino para recovery quirúrgico de proyecciones; no borrar/editar `outbox_reactive_log` a mano salvo corrección auditable de datos contaminados.
- **Journey Intelligence Layer vigente (arquitectura aceptada, runtime pendiente):** Greenhouse adopta `docs/architecture/GREENHOUSE_JOURNEY_INTELLIGENCE_LAYER_V1.md` como capa transversal read-only para trazar journeys y touchpoints cross-domain. La capa observa outbox, audit logs, Notification Hub, Email Delivery, Teams Bot y Webhooks para componer milestones, blockers, SLA, next expected event y touchpoints causales. V1 NO reemplaza sources of truth ni ejecuta workflows: no envia emails, no dispara Teams, no muta HR/Finance/Commercial; cualquier accion futura debe llamar al dominio owner. No guardar cuerpos completos de email/Teams por default; persistir evidencia redacted y `evidence_quality`.
- **TASK-637/TASK-931 GitHub Billing & Actions observability vigente:** Greenhouse lee GitHub Billing Usage en modo read-only via `/organizations/{org}/settings/billing/usage` + `/usage/summary` desde `src/lib/cloud/github-billing.ts`, sin persistencia PostgreSQL ni migraciones. El endpoint admin es `/api/admin/cloud/github-billing`; las surfaces son `/admin/integrations`, `/admin/ops-health` y Admin Center via signal `cloud.billing.github`. Env vars: `GREENHOUSE_GITHUB_BILLING_TOKEN_SECRET_REF` o `GREENHOUSE_GITHUB_BILLING_TOKEN`, `GREENHOUSE_GITHUB_BILLING_ORG` (scope canonico `efeoncepro`) y umbrales `GREENHOUSE_GITHUB_BILLING_MONTHLY_WARN_USD=100`, `GREENHOUSE_GITHUB_BILLING_MONTHLY_CRITICAL_USD=150`, `GREENHOUSE_GITHUB_ACTIONS_DAILY_SPIKE_PCT=100` en Vercel `production`, `staging` y `development`. `grossAmount` muestra consumo bruto y `netAmount` impacto facturable tras cuota/descuentos; workflow/job hotspots se diagnostican con `pnpm actions:cost:audit`. El contrato CI vigente evita duplicate build minutes en `push:develop`: GitHub mantiene lint/typecheck/tests como señal rápida y Vercel actúa como build gate de staging; GitHub conserva build en PRs, `main` y dispatch manual. El watchdog productivo queda manual-only en repo desde 2026-05-24 hasta TASK-920 por 72 fallos en los últimos 100 runs scheduled; runtime GitHub quedó `disabled_manually` como emergency stop hasta que `main` tenga el workflow sin `schedule`.
- **TASK-637 runtime token pendiente:** `GREENHOUSE_GITHUB_BILLING_ORG=efeoncepro` y thresholds existen en Vercel `production`, `staging` y `development`. Smoke local verificado con token `gh` contra org `efeoncepro`, pero no se persiste ese PAT amplio como secreto productivo. Produccion/staging deben usar un token dedicado least-privilege con permiso org `Administration: read` y guardado en Secret Manager como `GREENHOUSE_GITHUB_BILLING_TOKEN_SECRET_REF`.
- **TASK-636 Vercel Billing FOCUS observability vigente:** Greenhouse lee Vercel Billing en modo read-only via `/v1/billing/charges` JSONL FOCUS v1.3 desde `src/lib/cloud/vercel-billing.ts`, sin persistencia PostgreSQL ni migraciones. El endpoint admin es `/api/admin/cloud/vercel-billing`; las surfaces son `/admin/integrations`, `/admin/ops-health` y Admin Center via signal `cloud.billing.vercel`. Env vars: `GREENHOUSE_VERCEL_API_TOKEN_SECRET_REF` o `GREENHOUSE_VERCEL_API_TOKEN`, `GREENHOUSE_VERCEL_TEAM_ID` preferido, `GREENHOUSE_VERCEL_TEAM_SLUG` fallback, y umbrales opcionales `GREENHOUSE_VERCEL_BILLING_MONTHLY_WARN_USD`, `GREENHOUSE_VERCEL_BILLING_MONTHLY_CRITICAL_USD`, `GREENHOUSE_VERCEL_BILLING_DAILY_SPIKE_PCT`. Si faltan token/team, estado `not_configured`; si faltan umbrales, forecast `unconfigured`; nunca representar ausencia de datos como costo cero sano.
- **TASK-636 runtime env provisionado:** `GREENHOUSE_VERCEL_API_TOKEN_SECRET_REF=greenhouse-vercel-api-token`, `GREENHOUSE_VERCEL_TEAM_ID=team_gmNiF4YCHmc1wqsHUTCvqjmN` y `GREENHOUSE_VERCEL_TEAM_SLUG=efeonce-7670142f` existen en Vercel `production`, `staging` y `development`. El token vive en GCP Secret Manager `greenhouse-vercel-api-token` con acceso para `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`. Umbrales `GREENHOUSE_VERCEL_BILLING_MONTHLY_*` y `GREENHOUSE_VERCEL_BILLING_DAILY_SPIKE_PCT` siguen sin configurar hasta definir budget real.
- `AGENTS.md` y `CLAUDE.md` son los puntos de entrada operativos para agentes; ambos deben mantenerse alineados cuando cambie un contrato transversal.
- **Architecture Decision Records vigentes:** Greenhouse adopta ADRs distribuidos con modelo canonico en `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md` e indice maestro en `docs/architecture/DECISIONS_INDEX.md`. Las decisiones de dominio viven preferentemente embebidas en su spec `GREENHOUSE_*_V1.md`; las decisiones cross-domain pueden vivir como docs dedicados en `docs/architecture/`. Toda task que cambie source of truth, schema, access model, auth/session, finance/payroll/accounting semantics, events/outbox/webhooks, APIs externas, cloud/deploy/secrets, UI platform o runtime projections compartidas debe identificar/proponer ADR antes de implementar.
- **TASK-948 / Kortex SSO broker vigente:** Greenhouse actua como identity broker para Kortex con un carril authorization-code one-time + PKCE + exchange server-to-server. Runtime: `/api/auth/sister-platforms/authorize`, `/api/integrations/v1/sister-platforms/oauth/token`, `/api/integrations/v1/sister-platforms/oauth/userinfo`, `greenhouse_core.sister_platform_oauth_*` y reliability signals `identity.sister_platform_oauth.*`. Flags: `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED=false` por default, `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS=kortex`; Kortex usa `KORTEX_GREENHOUSE_SSO_ENABLED=false` por default. Boundary obligatorio: cambio aditivo; NO toca SSO core, SCIM, Microsoft Entra provisioning, Graph sync, callbacks de sesion, cookies ni lifecycle de identidad Greenhouse. Cualquier necesidad de tocar esos contratos bloquea TASK-948 y exige ADR/task separada. ADR: `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md` §17.
- **Compliance Exports Chile / TASK-812 vigente:** `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` declara que Previred y LRE son proyecciones compliance versionadas sobre payroll cerrado, no source of truth ni calculo paralelo. TASK-812 no puede asumir Previred posicional ni LRE XML/XSD: Slice 0 debe congelar fuente oficial vigente, variante, mapping y fixtures antes de implementar generadores. `TASK-707a` bloquea la paridad completa contra `payment_order` social_security; `TASK-784` ya esta resuelta para RUT canonico.
- **Professional Presence / TASK-786 vigente:** `GREENHOUSE_PERSON_COMPLETE_360_V1.md` declara que presencia profesional/contacto es una faceta gobernada de Person 360, separada de Person Legal Profile (TASK-784) y Workforce Role Title governance (TASK-785). `greenhouse_core.members` sigue siendo source V1 para links/contact/integration IDs; phone/contact_channel/contact_handle son internal-only por defecto; client-safe exposure debe pasar por policy compartida y Teams/Slack deben resolverse desde IDs de integracion/deep links, no URLs manuales.
- **TASK-789 relationship transition vigente:** Greenhouse ya tiene primitive runtime para employee -> contractor/honorarios en `src/lib/person-legal-entity-relationships/**` y `src/lib/workforce/relationship-transition/**`. La command cierra la relacion `employee` ejecutada y abre una relacion `contractor` separada bajo el mismo `identity_profile`, bloqueando overlaps activos. Honorarios V1 = `relationship_type='contractor'` + `metadata_json.relationshipSubtype='honorarios'`. No muta `members.contract_type`, no crea `compensation_versions`, no usa `payroll_adjustments` y no habilita `final_settlements`. People 360 muestra la timeline para separar `Relacion laboral cerrada` de `Relacion contractor/honorarios activa`.
- **TASK-874/TASK-876 Workforce Activation vigente:** la habilitación laboral de colaboradores pendientes vive como workspace primario HR en `/hr/workforce/activation` con view `equipo.workforce_activation` y routeGroup `hr`; `/admin/workforce/activation` queda como governance/transitional. El resolver canónico `resolveWorkforceActivationReadiness(memberId)` clasifica lanes de identidad, relación laboral, datos laborales, cargo, compensación, legal profile, payment profile, onboarding y contractor engagement. `complete-intake` consulta ese resolver antes de mutar `workforce_intake_status='completed'` y bloquea con `409 activation_readiness_blocked` salvo override auditado con capability `workforce.member.activation_readiness.override`. TASK-876 agrega el write path de remediacion `updateWorkforceMemberIntake()` + `PATCH /api/hr/workforce/members/[memberId]/intake` para datos laborales (`workforce.member.intake.update`) sin completar automaticamente casos reales. Payment profile activo bloquea solo `payroll_via='internal'`; Deel queda como warning.
- **TASK-875 WorkRelationship Onboarding Case vigente:** Greenhouse ya tiene foundation runtime para `WorkRelationshipOnboardingCase` en `greenhouse_hr.work_relationship_onboarding_cases` + eventos append-only. `completeWorkforceMemberIntake()` crea/activa el caso idempotentemente en la misma transacción del cierre de ficha; `resolveWorkforceActivationReadiness()` trata ausencia de caso como warning, caso abierto como warning y caso `blocked` como blocker de `operational_onboarding`. `greenhouse_hr.onboarding_instances.onboarding_case_id` deja los checklists HRIS como hijos opcionales. No agrega UI, routeGroups, views, entitlements ni startup policy.
- **TASK-893 Payroll Participation Window vigente como decision arquitectonica:** `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md` define que Payroll debe resolver `eligibleFrom/eligibleTo/policy/reasonCodes/prorationFactor` por colaborador y periodo para ingreso, salida y vigencia de compensacion. La regla anti-parche es explicita: un ingreso mid-month no es ausencia; no contaminar attendance para prorratear dias previos al inicio. La implementacion vive en `docs/tasks/complete/TASK-893-payroll-participation-window.md`, detras de `PAYROLL_PARTICIPATION_WINDOW_ENABLED=false`, y aplica a projected + official payroll componiendo TASK-890 para salida.
- **TASK-894 International Internal Contract Type vigente:** `international_internal` es contrato canonico first-class: `payRegime='international'`, `payrollVia='internal'`, sin Deel ID ni descuentos Chile. Requiere capability `payroll.contract.use_international_internal` + `legalReviewReference` por write path, audit log append-only y evento `member.contract_type.changed v1`. No hubo backfill automático de colaboradores reales; cualquier uso productivo requiere allowlist/revisión HR-Finance-Legal. Spec cerrada: `docs/tasks/complete/TASK-894-international-internal-contract-type.md`.
- **Mockups Greenhouse vigentes:** cualquier mockup/prototipo visual del portal debe usar la skill local `greenhouse-mockup-builder` y construirse como ruta real de Next.js con mock data tipada, Vuexy/MUI wrappers y primitives Greenhouse. Queda prohibido por defecto crear HTML/CSS aparte para surfaces del portal salvo pedido explicito de artefacto estatico externo. Paths canonicos: `.codex/skills/greenhouse-mockup-builder/SKILL.md` y `.claude/skills/greenhouse-mockup-builder/SKILL.md`.
- **AI Product Design Studio vigente (TASK-869):** para UI visible pedida como moderna, world-class, enterprise, Lovable/Stitch-like o con screenshot loop, usar `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`. Skills globales locales: `product-design-architect-2026`, `ai-ui-generation-director`, `microinteraction-systems-architect`, `frontend-product-implementation-reviewer`, `visual-regression-product-critic`. Overlays versionados del repo: `.codex/skills/greenhouse-product-ui-architect/`, `.codex/skills/greenhouse-ai-design-studio/`, `.codex/skills/greenhouse-ui-enterprise-review/`. `DESIGN.md` sigue siendo el contrato visual; el loop no autoriza crear un sistema visual paralelo.
- **Production release skill vigente:** cualquier promocion a produccion, preflight, approval, rollback, watchdog drift recovery o cambio del release control plane debe invocar `greenhouse-production-release`. Paths canonicos: `.codex/skills/greenhouse-production-release/SKILL.md` y `.claude/skills/greenhouse-production-release/SKILL.md`. Si cambia el flujo critico, actualizar ambas skills junto con arquitectura/runbooks/docs vivas.
- **Production release learning vigente (TASK-1328, 2026-07-03):** no inferir que Azure o un worker "skippeo" por nombre de job o intuicion. Azure `no_infra_diff` puede ser skip esperado si el job pasa health y termina success; un worker solo esta cerrado si Cloud Run reporta `Ready=True` y `GIT_SHA` del target o `pnpm release:watchdog --json` queda `aggregateSeverity: ok`. Preflight race por CI/smoke aun corriendo se resuelve esperando/disparando evidencia para el SHA exacto, no tocando gates.
- **Production worker deploys vigente:** workers Cloud Run (`ops-worker`, `commercial-cost-worker`, `ico-batch-worker`, `hubspot-greenhouse-integration`) ya no despliegan production por `push:main`. `push:develop` sirve staging; production normal vive en `production-release.yml` via `workflow_call`; `workflow_dispatch` queda solo como break-glass auditado. El reconciliador GitHub no debe abortar manifests por fallas de runs directos no canónicos.
- **Production preflight gate vigente:** `pnpm release:preflight --fail-on-error` debe fallar ante cualquier `readyToDeploy=false`; `DEGRADED` o `UNKNOWN` no son aceptables para production normal. El orquestador debe proveer GitHub, GCP, Azure y Sentry evidence sources para que el preflight pueda quedar realmente verde antes de deployar.
- **Sample Sprints runtime vigente:** EPIC-014 ya tiene foundation de `services.engagement_kind` (TASK-801), términos comerciales versionados (TASK-802), phases/outcomes/lineage (TASK-803), approval workflow con capacity warning soft (TASK-804), snapshots semanales de progreso (TASK-805), reclasificación gerencial GTM (TASK-806), ancla explícita `expense -> service` para gastos directos de cliente (TASK-815), audit/outbox (TASK-808), UI/API real en `/agency/sample-sprints` (TASK-809) y guard DB anti-zombie (TASK-810). `greenhouse_serving.commercial_cost_attribution_v2` ahora propaga `service_id`, deriva `attribution_intent` solo para costs service-linked con approval aprobado y guard TASK-813, y agrega lane `expense_direct_service` solo desde `greenhouse_finance.expense_service_allocations.review_status='approved'`; el residual sigue como `expense_direct_client`. `greenhouse_serving.gtm_investment_pnl` filtra `terms_kind='no_cost'` para management accounting, no auditoría cliente/fiscal. Las FKs a `services`, `assets`, `quotations` y `client_users` son `TEXT` en runtime real; los helpers bajo `src/lib/commercial/sample-sprints/` deben aplicar el guard TASK-813 para excluir services inactivos, `legacy_seed_archived` o `hubspot_sync_status='unmapped'`. `commercial.engagement.record_progress` es operator-friendly para routeGroup commercial/admin; `commercial.engagement.approve` queda admin-gated en V1. La surface visible usa `gestion.sample_sprints` como view y `commercial.engagement.*` como entitlements; reportes de outcome usan los contextos privados `sample_sprint_report_draft` y `sample_sprint_report`. `services_engagement_requires_decision_before_120d` es trigger, no CHECK: PostgreSQL no permite subqueries en CHECK, y el guard bloquea non-regular active >120d sin outcome ni lineage. No modelar approvals ni progress como view-only: son entitlements/capabilities finas que futuras APIs/UI deben consumir.
- **Commercial Health vigente:** TASK-807 formaliza `Commercial Health` como subsystem operativo del módulo reliability `commercial`. La primitive canónica `src/lib/commercial/sample-sprints/health.ts` centraliza conteos read-only para seis signals `commercial.engagement.{overdue_decision,budget_overrun,zombie,unapproved_active,conversion_rate_drop,stale_progress}`. `stale_progress` viene de TASK-805 y se reutiliza; `zombie` usa ausencia de `engagement_outcomes` + `engagement_lineage` porque no existe `transition_event`; `budget_overrun` lee actual cost desde `commercial_cost_attribution_v2`, no solo desde `gtm_investment_pnl`. Visible en `/admin/ops-health` y `getReliabilityOverview()`. No introduce migrations ni access nuevo.
- **Engagement audit/outbox vigente:** TASK-808 materializa `greenhouse_commercial.engagement_audit_log` append-only y publica 9 eventos `service.engagement.*` con `payload_json.version=1` (sin sufijo `_v1`). Los helpers `src/lib/commercial/sample-sprints/*` escriben audit + outbox dentro de la misma transacción de negocio. `service.engagement.converted` se consume via projection `engagement_converted_lifecycle` y llama `promoteParty()`; no hacer updates directos a `organizations`. `service.engagement.cancelled` crea notificación interna para follow-up manual y mantiene `automaticClientEmail=false`. No existe comando canónico service→HubSpot deal; no llamar directo al bridge Cloud Run desde engagement conversion hasta que exista esa primitive.
- **i18n/globalization vigente:** `docs/architecture/GREENHOUSE_I18N_ARCHITECTURE_V1.md` es el ADR canónico. Greenhouse usa `next-intl` para App Router desde TASK-430, mantiene el portal privado sin locale prefix por defecto, conserva `/api/*`/auth/staging automation sin prefijo, y desde TASK-431 resuelve locale con preferencia persistida de usuario → default de tenant/account → legacy `client_users.locale` → cookie `gh_locale` → `Accept-Language` → fallback `es-CL`. `en-US` esta activo para shell navigation y shared microcopy; `pt-BR` queda planned detrás de cobertura/piloto. `src/lib/format/` sigue gobernando valores; `src/lib/copy/` gobierna microcopy.
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` es el contrato transversal anti-parche: Greenhouse espera soluciones seguras, robustas, resilientes y escalables por defecto; workarounds solo temporales, reversibles y documentados.
- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md` gobierna la convivencia entre `project_context.md`, `Handoff.md` y `Handoff.archive.md`: no se pierde auditoria, se separa estado activo de historia.
- `project_context.md` debe leerse como estado vigente + deltas historicos. Si un delta antiguo contradice esta cabecera, `AGENTS.md`, arquitectura vigente o runtime real, prevalece el contrato vigente y debe documentarse el drift.
- `Handoff.md` sigue siendo util para construir: contiene contexto operacional rico. No debe recortarse ni archivarse agresivamente sin preservar texto completo y dejar referencias.
- `Handoff.archive.md` es la caja negra historica para auditoria de resoluciones; una entrada antigua no debe tratarse como source of truth vigente sin contrastar con task, issue, arquitectura, codigo y runtime.
- `docs/operations/CODEX_EXECUTION_PROMPT_V1.md` es el prompt robusto para ejecucion Codex de `TASK-###`; no reemplaza las reglas del repo, las comprime.
- `docs/tasks/TASK_PROCESS.md` sigue gobernando lifecycle de tasks; una task no esta cerrada si carpeta, `Lifecycle`, README y docs vivas no estan sincronizados.
- **RpA V2 / Notion raw alias vigente:** la propiedad Notion literal de writeback es `[GH] RpA v2`; su eco raw en BigQuery desde `notion-bq-sync` es `notion_ops.tareas.gh_rpa_v2`. El motor RpA V2 no lee ese eco: computa desde `task_status_transitions` -> `calculateRpaV2` -> `task_rpa_snapshots` y escribe de vuelta a `[GH] RpA v2`. `notion_ops.tareas.rpa` y `notion_ops.stg_tareas.rpa` siguen siendo legacy V1 (`RpA` formula).
- **Deprecated capabilities discipline vigente (TASK-840):** si una capability sale de `src/config/entitlements-catalog.ts`, debe acompañarse de migration que marque `greenhouse_core.capabilities_registry.deprecated_at`, nunca DELETE. La mutación canónica vive en `markCapabilityDeprecated()` y `/api/admin/entitlements/capabilities/[capabilityKey]/deprecate`, con pre-check de grants activos, audit log `capability_deprecated` y outbox `access.capability.deprecated` v1. `scripts/governance/find-deprecated-candidates.ts` solo reporta candidates en CSV.
- **View access governance vigente:** en la matriz admin de `/admin/views`, `roles.is_internal` describe pertenencia al tenant interno, no permiso broad sobre `route_group='internal'`. Cualquier fallback por rol debe derivar acceso interno desde `routeGroups.includes('internal')` o desde una fila explícita en `greenhouse_core.role_view_assignments`. Las migraciones `20260512080500000_seed-view-access-drift-sentry-remediation.sql` y `20260512093000000_seed-internal-route-fallback-denials.sql` cerraron el drift observado por Sentry `role_view_fallback_used`.
- Para verificar higiene de contexto sin modificar archivos, usar `pnpm docs:context-check`. El check es no destructivo por defecto y existe para avisar drift, no para borrar memoria.
- Preview/Staging/Production vigentes deben seguir lo declarado en `AGENTS.md` y `RELEASE_CHANNELS_OPERATING_MODEL_V1.md`; si un delta antiguo de Vercel contradice esos contratos, tratarlo como historia y revalidar con Vercel CLI/runtime.
- **Software Architect 2026 skill:** Codex ahora tiene la skill local invocable `software-architect-2026` en `.codex/skills/software-architect-2026/`. Se adapto desde el paquete Claude entregado por el usuario y conserva referencias, checklists, templates y overlay Efeonce. Uso esperado: decisiones de arquitectura, ADRs, C4, stack picks, auditorias, migraciones, threat models, cost estimates y handoff a TASK docs. En Greenhouse, `AGENTS.md`, `project_context.md`, `Handoff.md` y la task vigente prevalecen si alguna referencia del overlay queda stale.
- **GSAP adoption vigente:** Greenhouse adopta `gsap` + `@gsap/react` como carril especializado de motion avanzado, no como reemplazo del stack base. ADR canonical: `docs/architecture/GREENHOUSE_GSAP_ADOPTION_DECISION_V1.md`. Imports canonicos: `src/libs/GSAP.tsx` (`gsap`, `useGSAP`) y `src/libs/GSAPScrollTrigger.tsx` (`ScrollTrigger`). Framer Motion/CSS/auto-animate siguen siendo default para microinteracciones comunes; GSAP queda para timelines complejos, SVG/path/text y ScrollTrigger medido con reduced-motion y performance guardrails.
- **Roadmap work item index reader (TASK-1152) — runtime OFF:** el backlog operativo Markdown (`docs/epics/**`, `docs/tasks/**`, `docs/mini-tasks/**`, `docs/issues/**`) sigue siendo SSOT, pero el reader `src/lib/roadmap/work-item-index/` ya no esta en el grafo vivo del portal. `GET /api/roadmap/work-items*` responde `410 roadmap_disabled`; `docs/**` ya no se bundlea via `outputFileTracingIncludes`. El parser queda como referencia historica para una futura proyeccion externa/materializada/local-first.
- **Roadmap cockpit UI (TASK-1153) — retirado del portal:** `/roadmap` fue removido del App Router, menu y catalogo de vistas. La UI bajo `src/views/greenhouse/roadmap/` queda dormida como referencia; no crear consumidores nuevos del cockpit ni reimportar `buildRoadmapCockpitData` desde rutas Next sin redisenar primero la proyeccion fuera del runtime.
- **TASK-1154 Hybrid execution profile split guardrails:** las tasks Greenhouse siguen usando un solo sistema `TASK-###` y solo tres perfiles (`standard`, `ui-ux`, `backend-data`), pero cuando una capacidad combina backend/data reusable con UI visible significativa el default operativo es dividir en dos tasks dependientes: `backend-data` foundation primero y `ui-ux` consumer despues. Las tasks verticales hibridas siguen permitidas si son pequenas/reversibles/sin migracion o schema riesgoso, pero deben incluir `## Hybrid Execution Justification` con `Why not split`, `Primary execution profile`, `Contract boundary` y `Risk controls`. Fuente canonica: `docs/tasks/TASK_PROCESS.md` (`Hybrid Execution Profile Discipline`). `TASK_TEMPLATE.md`, las skills task-planner Codex/Claude, `AGENTS.md` y `CLAUDE.md` apuntan a esa fuente. `pnpm task:lint` agrega warning-first `hybrid-profile-justification` para tasks template activas con `UI impact != none` y `Backend impact != none` sin justificacion; legacy/historico no se bloquea.

## Delta 2026-07-08 Skill greenhouse-talent-people-operator

- Nueva skill invocable (Claude + Codex) **`greenhouse-talent-people-operator`**: operador world-class de Talent Acquisition + People Ops + Workforce para Efeonce/Greenhouse. Cubre reclutamiento full-cycle, inbound recruiting + employer brand, head hunting/executive search, **assessment + entrevista por competencias** (ciencia Schmidt-Hunter → revisión Sackett 2022: la entrevista estructurada es el predictor más fuerte), contratación nacional (Chile) y global/remota (EOR/contractor + LatAm #1 destino remote 2026), onboarding/desarrollo, engagement/wellbeing/retención (crisis Gallup 2026: 20% engagement) y workforce planning. Fundamentada en **investigación 2026 con fuentes** (EU AI Act hiring-AI alto riesgo desde ago-2026 + prohíbe reconocimiento de emociones; Pay Transparency Directive jun-2026; workforce de 5 generaciones). Estructura: `SKILL.md` + 7 `references/` load-on-demand + 4 `templates/`. **Frontera dura:** cede plata/tax a `greenhouse-payroll-auditor`, contratos a Workforce Contracting Studio/legal, costo a finance. Sinergia con product-design (careers/assessment UI), ICO (capacity/burnout), Nexa (parity). Invariantes: score advisory (nunca auto-rechaza), IA propone→humano confirma, PII candidato masked/reveal. Path: `.claude/skills/greenhouse-talent-people-operator/` + `.codex/`.

## Delta 2026-07-07 TASK-353 Hiring / ATS domain foundation

- Nuevo dominio canónico **`Hiring / ATS`** (fulfillment de talento; EPIC-011). Schema **`greenhouse_hiring`** con 4 aggregates person-first: `talent_demand` → `hiring_opening` → `candidate_facet` (anclada a `greenhouse_core.identity_profiles`, UNIQUE) → `hiring_application` (unidad del pipeline). Contrato durable para agentes: al tocar reclutamiento/vacantes/careers/candidatos, el store canónico es **`src/lib/hiring/**`** (SQL crudo + `HiringValidationError` + outbox v1 transaccional) y la API interna es **`/api/hiring/**`** (dual-gate `requireInternalTenantContext` + `can()`). El **opening público** es una proyección allowlist derivada del opening interno vía `buildPublicOpeningPayload()` — NUNCA leer/exponer columnas internas al público. **Boundary duro:** Hiring NO crea `member`/`assignment`/`placement`/payroll (el handoff downstream es TASK-356; el cierre `internal_hire`→colaborador es TASK-770). 8 capabilities `hiring.{demand,opening,application}.*` (grant a roles internos reales, NUNCA `client_*`). Observabilidad: `captureWithDomain(err, 'hiring', …)`. Careers público (TASK-354) y hiring desk interno (TASK-355) se construyen sobre esta foundation.

## Delta 2026-06-06 Maintenance gate + Proxy global canonico

- Se agregó el **gate de mantenimiento** env-driven sobre el **Proxy global canonico `src/proxy.ts`**. SSOT en `src/config/maintenance.ts`. Contrato durable para agentes:
  - **Default OFF**: sin `MAINTENANCE_MODE=true` el proxy es pass-through total (cero cambio de comportamiento). Activar = env + redeploy (Vercel lee env al desplegar, no en caliente).
  - **Fail-open**: cualquier excepción del gate degrada a `NextResponse.next()`. El único modo de falla aceptable es "el mantenimiento no se activó", NUNCA "el sitio se cae".
  - **Allowlist** que nunca se gatea: `/maintenance`, `/_next`, `/api/auth` (+agent-session), `/api/health`, `/branding`, `/images`, `/animations` + estáticos con extensión (excluidos por el matcher).
  - **Bypass de operador**: `MAINTENANCE_BYPASS_SECRET` vía `?gh_bypass=<secret>` → cookie httpOnly (compare constant-time, Edge-safe). Respuesta a visitantes: **503 + Retry-After + no-store**.
  - **Reglas duras**: NO crear `middleware.ts` ni un 2º entrypoint global (extender `src/proxy.ts` si emerge otra necesidad de request-gating); NO meter lecturas a PG/IO por request en el proxy; NO duplicar la lógica del gate fuera de `src/config/maintenance.ts`. La página `/maintenance` es de la familia canónica de error/recovery surfaces (ver bullet "Error surfaces como brand/recovery moments" arriba) con 5 variantes seleccionadas una vez al entrar.
- **Extensibilidad**: `src/proxy.ts` es de propósito general (capa request-global, singleton del framework). Hoy lleva security headers + maintenance gate, y es el lugar canónico para lógica request-level O(1) futura (geo/locale routing, rate limit, A/B por cookie, redirects masivos, bloqueo bot/IP). Toda responsabilidad nueva se **agrega a este mismo archivo** como función encadenada con su config SSOT, default-OFF + fail-open. NUNCA logica de dominio, auth fina ni IO/DB por request (eso vive en los guards por ruta). Doc canónica: `docs/documentation/plataforma/middleware-edge.md`.
- Docs: `docs/documentation/plataforma/pagina-mantenimiento.md` (funcional) + `docs/manual-de-uso/plataforma/modo-mantenimiento.md` (operador) + `docs/documentation/plataforma/middleware-edge.md` (capacidad de plataforma). **Rollout pendiente**: no se encendió en ningún ambiente.

## Delta 2026-05-24 SDD adoptado como práctica explícita (ADR aceptado)

- Greenhouse adopta **Spec-Driven Development** como práctica nombrada. Contrato operativo nuevo para agentes: todo invariante vive en un nivel de la **escalera de promoción L0 prosa → L1 revisado → L2 ejecutable**, y se promueve a L2 (check ejecutable + gate CI) solo si cumple el criterio explícito (drift recurrente / costo alto-irreversible / recurso cross-agente / verificación barata). NO promover por reflejo; NO mecanizar toda la prosa; NO code-gen.
- Patrón canónico de promoción: regla → check declarativo (lint rule / parity test / gate script) → rollout warn-first → legacy-exempt → gate CI. Generaliza lo ya probado en `design:lint`, lint rules y parity tests.
- ADR canónico: `docs/architecture/GREENHOUSE_SPEC_DRIVEN_DEVELOPMENT_V1.md` (Accepted, indexado en `DECISIONS_INDEX.md`). Primera implementación shipped: TASK-926 (`pnpm task:lint`, `.github/workflows/task-contract.yml`, `--active`, `--changed`, `--task`). Follow-ups: collision detector Files owned, parity tipos↔OpenAPI.

## Delta 2026-05-09 ISSUE-072 smoke-lane publisher hardening

- Los warnings `sync:smoke-lane <lane> failed (non-blocking)` en Playwright eran un incidente de plataforma, no ruido aceptable. Causas reales encadenadas: script sin `server-only` shim, secret ref `secret:version` inválido, WIF deployer sin `roles/cloudsql.client` y saturación transitoria Cloud SQL/Postgres (`53300`).
- Contrato vigente:
  - `pnpm sync:smoke-lane` carga `scripts/lib/server-only-shim.cjs`.
  - Playwright usa `GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF=greenhouse-pg-dev-app-password`, no `greenhouse-pg-dev-app-password:latest`.
  - `github-actions-deployer@efeonce-group.iam.gserviceaccount.com` tiene `roles/cloudsql.client`, versionado en `scripts/setup-github-actions-wif.sh`.
  - publishers CI livianos usan `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=1`.
  - `src/lib/postgres/client.ts` reintenta con backoff acotado errores transitorios de conexión (`53300`, `080xx`, `57P0x`, TLS/reset/too many connections) y sigue fallando loud si persisten.
  - desde 2026-05-12, el mismo cliente aplica backpressure por query con `GREENHOUSE_POSTGRES_QUERY_CONCURRENCY` (default 2 en Vercel, 4 fuera de Vercel, clamp a `GREENHOUSE_POSTGRES_MAX_CONNECTIONS`) y no resetea el pool ante errores puros de capacidad (`53300`/reserved slots/too many clients), porque cerrar un pool sano durante saturación amplifica carreras.
  - los checks de presencia de tablas deben usar `src/lib/db-health/table-presence.ts` para batch lookup; no reintroducir loops de `SELECT EXISTS (...)` por tabla.
- Verificación final: Playwright run `25605103310` publicó `finance.web`, `delivery.web` e `identity.web` con `36/36 passed`; CI run `25605103305` pasó lint, tests, coverage y build.
- Issue formal: `docs/issues/resolved/ISSUE-072-ci-smoke-lane-publisher-failed-non-blocking.md`.

## Delta 2026-05-03 TASK-777 expense distribution close gate

- Finance management accounting ya no debe consumir `expenses.economic_category` directo como decisión final de P&L. La primitive canónica es `greenhouse_finance.expense_distribution_resolution`.
- `shared_operational_overhead` es el único lane que alimenta overhead operacional compartido. Payroll/provider, regulatorio, tributario, financiero y treasury transit quedan fuera por contrato.
- `checkPeriodReadiness` ahora incluye un gate de distribución: un período no está listo si faltan resoluciones activas, existen resoluciones `manual_required`/`blocked`/`unallocated`, o el pool operacional está contaminado.
- IA de distribución vive solo como advisory layer en `src/lib/finance/expense-distribution-intelligence/*`, con kill-switch `FINANCE_DISTRIBUTION_AI_ENABLED=false` por defecto. Una sugerencia nunca escribe P&L ni cierra períodos; solo aprobación humana puede materializar una resolución `source='ai_approved'`.
- Superficies protegidas: `account_balances`, normalized payment readers, settlement legs, payment orders, bank reconciliation y saldos de caja siguen fuera del alcance de distribución económica.

## Delta 2026-05-03 Codex finance/accounting operator skill

- Codex ahora tiene una skill local y una global llamadas `greenhouse-finance-accounting-operator`.
- Paths canonicos:
  - repo local: `.codex/skills/greenhouse-finance-accounting-operator/SKILL.md`
  - global usuario: `/Users/jreye/.codex/skills/greenhouse-finance-accounting-operator/SKILL.md`
- La skill no se apoya solo en el runtime Greenhouse. Tambien obliga a contrastar decisiones con marcos externos y mejores practicas de mercado:
  - `IFRS Conceptual Framework`
  - `IAS 1`
  - `IAS 7`
  - `IFRS 7`
  - `IFRS 15`
  - `IFRS 16`
  - `COSO`
  - `AICPA/CIMA Global Management Accounting Principles`
  - `AFP` para treasury y payments controls
- Uso esperado:
  - auditoria de P&L, overhead, cashflow, payments, reconciliacion, tax/fiscal treatment, period close y cost attribution
  - diseño de fixes y recomendaciones guiadas por contabilidad financiera, cost accounting, treasury y controles, no solo por conveniencia del schema actual
- Regla operativa nueva:
  - si el runtime del repo discrepa de mejores practicas contables/financieras, el agente debe explicitar el drift y no normalizarlo silenciosamente como si fuera correcto por existir en codigo
  - la skill ahora incluye modos operativos y runbooks para `audit`, `recommend`, `execute`, `close_governance` y `reconcile`; no debe usarse solo como checklist teórico

## Delta 2026-05-03 Postgres TLS recovery cubre raw pg + Kysely

- Sentry production `JAVASCRIPT-NEXTJS-2N` reportó `ssl/tls alert bad certificate` en `POST /api/webhooks/hubspot-companies`, pero la investigación mostró que el patrón también golpeaba crons, SCIM y sync: no era un bug de HubSpot ni del webhook.
- La capa canónica ahora está en `src/lib/postgres/client.ts` + `src/lib/db.ts`:
  - `client.ts` exporta detección retryable, listeners de reset y sigue siendo el único owner de `Pool`/Cloud SQL Connector.
  - `db.ts` invalida Kysely cuando se resetea Postgres y usa un pool adapter dinámico para reintentar `connect()` una vez ante errores TLS retryable.
- Regla operativa nueva: ante errores Cloud SQL TLS en runtime, no parchear endpoints aislados. Endurecer primero la primitive común Postgres/Kysely y preservar el guardrail de no reintentar callbacks transaccionales ya ejecutados.

## Delta 2026-05-01 DESIGN.md adoption for agent-facing UI contract

- El repo ahora versiona `DESIGN.md` en la raiz como contrato visual legible por agentes.
- `DESIGN.md` no reemplaza `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`: la arquitectura/token doc sigue siendo la fuente canónica extensa; `DESIGN.md` funciona como capa portátil y compacta para herramientas y agentes que leen contexto de repo.
- La baseline declarada en `DESIGN.md` queda alineada al runtime actual:
  - `Poppins` para display controlado
  - `Geist Sans` para body, tablas, formularios, labels, KPIs, IDs y montos
  - máximo 2 familias activas por surface
  - `DM Sans`, `Inter` y familias monospace quedan fuera del baseline
- El CLI oficial `@google/design.md` queda integrado localmente via `package.json`:
  - `pnpm design:lint`
  - `pnpm design:diff`
  - `pnpm design:export:tailwind`
- Regla operativa nueva para trabajo UI: además de `AGENTS.md`, `CLAUDE.md`, `full-version`, Vuexy docs y arquitectura relevante, los agentes deben leer `DESIGN.md` antes de generar o refactorizar UI visible.
- Convencion de mantenimiento:
  - `DESIGN.md` evoluciona cada vez que cambia el contrato visual real del producto
  - primero cambia/decide runtime, luego se sincroniza `DESIGN.md`, luego se corre `pnpm design:lint`
  - si el cambio es estructural, tambien se sincroniza `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
  - `DESIGN.md` no debe contener estado especulativo o futuro no aprobado

## Delta 2026-05-01 Payment Orders como modulo de Tesoreria/Finance

- Se definio arquitectura nueva para `Payment Orders` en `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`.
- Decision canonica:
  - `Payroll` calcula y exporta obligaciones.
  - `Finance/Tesoreria` crea ordenes de pago, resuelve instrumentos, registra pagos, modela settlement legs y concilia.
  - `payroll_period.exported` no significa `paid`.
- El modulo pertenece a `greenhouse_finance`, no a `greenhouse_payroll`, porque debe servir tambien para proveedores, impuestos, anticipos, prestamos, reembolsos y cuenta corriente accionista.
- Se abrio programa de implementacion por tasks:
  - `TASK-747` umbrella Payment Orders Program
  - `TASK-748` Payment Obligations Foundation
  - `TASK-749` Beneficiary Payment Profiles + Routing Policies
  - `TASK-750` Payment Orders, Batches, Payment Calendar + Maker-Checker Runtime
  - `TASK-751` Payroll Settlement Orchestration + Reconciliation Integration
- Regla de rollout: primero obligaciones read-only/idempotentes, luego perfiles/routing, luego ordenes/batches/calendario, y finalmente integracion Payroll->settlement->conciliacion.

## Delta 2026-05-01 Claude skill invocable para auditoria de Payroll

- Claude ahora tiene la skill local invocable `greenhouse-payroll-auditor`.
- Vive en `.claude/skills/greenhouse-payroll-auditor/SKILL.md`, siguiendo la convencion oficial vigente de Claude Skills.
- Reutiliza el mismo criterio operativo de la skill Codex:
  - legislacion y formulas Chile en `references/chile-payroll-law.md`
  - runtime Greenhouse Payroll en `references/greenhouse-payroll-runtime.md`
  - trabajadores remotos/internacionales, Deel/EOR/contractor y KPI ICO en `references/international-remote-payroll.md`
- Nota de convencion: `AGENTS.md` y `CLAUDE.md` ya no indican que las skills nuevas deban nacer como `skill.md` minuscula; ese patron queda como compatibilidad legacy.

## Delta 2026-05-01 TASK-741 cierra MCP Remote Gateway V1

- Greenhouse ya expone el MCP read-only por HTTP remoto privado en `GET/POST/DELETE /api/mcp/greenhouse`.
- El gateway remoto vive en:
  - `src/mcp/greenhouse/remote.ts`
  - `src/app/api/mcp/greenhouse/route.ts`
- Transporte oficial: `WebStandardStreamableHTTPServerTransport` de `@modelcontextprotocol/sdk`.
- Modo V1: `stateless` + `enableJsonResponse`, pensado para App Router/Vercel sin guardar sesiones MCP en memoria.
- Auth V1: `Authorization: Bearer <GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN>`.
- Downstream preservado: el gateway reutiliza `createGreenhouseMcpServer()` y por lo tanto usa el mismo mapping read-only que `pnpm mcp:greenhouse`, bajando solo a `api/platform/ecosystem/*` con `GREENHOUSE_MCP_*`.
- Variables nuevas:
  - `GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN` — habilita/protege el gateway remoto HTTP.
  - `GREENHOUSE_MCP_REMOTE_MAX_BODY_BYTES` — budget opcional de request body; default `1000000`.
- `TASK-659` sigue siendo la dueña de OAuth/hosted auth multiusuario; `TASK-741` no introduce OAuth, refresh tokens ni user-delegated scopes.

## Delta 2026-05-01 TASK-744 Payroll compliance cerrada en staging

- `TASK-744` quedo cerrada en `docs/tasks/complete/TASK-744-payroll-chile-compliance-remediation.md` sobre `develop`.
- Abril 2026 fue recalculado en staging despues del deploy `418d3c9a` antes de aprobacion/export:
  - Humberly Henriquez y Luis Reyes: `contractTypeSnapshot=honorarios`, retencion SII `0.1525`, sin deducciones dependientes Chile.
  - Valentina Hoyos: `contractTypeSnapshot=indefinido`, calculo Chile dependiente con deducciones estatutarias.
  - Melkin Hernandez, Daniela Ferreira y Andres Carlosama: `payRegime=international`, `payrollVia=deel`, `kpiDataSource=ico`, sin deducciones Chile.
- `pnpm pg:connect:migrate` confirma que no quedan migraciones pendientes para esta task y regenera `src/types/db.d.ts` sin diff.
- `pnpm pg:doctor` vuelve a correr desde CLI sin arrastrar imports `server-only`; el doctor usa un cliente Postgres directo con perfil de herramientas y mantiene soporte para Cloud SQL Connector/Secret Manager.
- El coverage de CI ya no depende del mes calendario real en `space-360.test.ts`; se fija el reloj en abril 2026 para el caso que valida el período de insights Nexa.

## Delta 2026-05-01 Skill local invocable para auditoria de Payroll Efeonce

- Nueva skill local Codex invocable como `$greenhouse-payroll-auditor`.
- Vive en `.codex/skills/greenhouse-payroll-auditor/` y fue validada con `skill-creator`.
- Proposito:
  - auditar, revisar y proponer fixes robustos para Payroll Efeonce/Greenhouse
  - cubrir trabajadores dependientes Chile, honorarios, Deel/EOR/contractor internacional, KPI ICO, asistencia/licencias, PREVIRED/ImpUnico, impuestos, deducciones, costos empleador, readiness y exports
- La skill usa disclosure progresivo:
  - `SKILL.md` liviano para el workflow operativo
  - `references/chile-payroll-law.md` para reglas/fuentes oficiales Chile
  - `references/greenhouse-payroll-runtime.md` para formulas, paths y watchlist del runtime actual
  - `references/international-remote-payroll.md` para regimenes remotos/internacionales y limites de Deel/EOR
- Watchlist operacional incorporado:
  - verificar retencion SII honorarios 2026 contra fuente oficial antes de liquidar
  - revisar split trabajador/empleador de Seguro de Cesantia por tipo de contrato
  - verificar aplicacion de topes AFP/salud/cesantia/SIS/mutual en sueldos altos
  - no omitir KPI ICO para trabajadores internacionales con bonos OTD/RPA

## Delta 2026-05-01 Payroll readiness y roster borrador ya siguen el contrato real de calculo

- `sync-previred` ya no asume columnas inexistentes en `greenhouse_payroll.chile_afp_rates`: la tabla canónica desplegada persiste `total_rate` por AFP/período, mientras el split legacy (`worker_rate`) queda acotado a snapshots `previred_*`.
- Los fallbacks legacy de payroll Chile vuelven a ser operativos:
  - `previred_period_indicators` se lee por `indicator_date` y aliases reales del schema histórico
  - `previred_afp_rates` se lee por `indicator_date` preservando `worker_rate` cuando existe
- La verificación E2E canónica con el usuario agente quedó reprobadamente viva en staging:
  - `pnpm test:e2e:setup` genera `.auth/storageState.json`
  - `pnpm exec playwright test tests/e2e/smoke/hr-payroll.spec.ts --project=chromium` pasa contra `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`

- `Payroll` ahora separa explícitamente dos conceptos que antes se mezclaban en UI/runtime:
  - `colaboradores elegibles para cálculo`
  - `entries ya materializadas`
- En períodos `draft`, la UI puede mostrar roster elegible sin que existan todavía `payroll_entries`; esto evita el falso `0 colaboradores` cuando el borrador aún no se calculó.
- Se agregó la capa canónica `src/lib/payroll/compensation-requirements.ts` para decidir por compensación:
  - cuándo `KPI ICO` es realmente obligatorio
  - cuándo asistencia/licencias puede cambiar el monto pagado
  - cuándo Chile requiere tabla tributaria
- Regla nueva del cálculo oficial:
  - si falta `KPI ICO` para un colaborador con bono variable real, el cálculo bloquea antes de persistir entries
  - si falta asistencia/licencias para un colaborador cuyo pago depende de asistencia, el cálculo bloquea antes de persistir entries
  - `honorarios`, `Deel` y compensaciones sin exposición KPI dejan de contaminar readiness con falsos positivos
- Operación nueva:
  - `sync-previred` queda programado en `vercel.json`
  - cada corrida registra `greenhouse_sync.source_sync_runs`
  - el detector `previred_sync_freshness` vuelve a leer frescura real desde `finished_at`

## Delta 2026-04-30 TASK-694 aterriza Deep Link Platform Foundation

- Ya existe foundation runtime compartida en `src/lib/navigation/deep-links/**`.
- El runtime nuevo resuelve referencias semánticas a `href`, `absoluteUrl`, `canonicalPath`, fallback y metadata de acceso reutilizando:
  - `VIEW_REGISTRY`
  - `VIEW_ENTITLEMENT_BINDINGS`
  - `portalHomePath`
  - builders públicos existentes cuando aplica
- Definitions iniciales activas:
  - `home`, `ops_health`, `person`, `quote`, `income`, `expense`, `leave_request`, `payroll_period`, `public_quote_share`
- Regla de adopción nueva:
  - consumers nuevos o de bajo riesgo que hoy armen URLs internas manualmente deben preferir `resolveGreenhouseDeepLink()`
  - el output legacy `actionUrl` puede seguir existiendo como string derivado mientras Notification Hub, Home, API Platform app y Teams terminan su convergencia
- Alineaciones cerradas:
  - `payroll_period` canónico = `/hr/payroll/periods/:periodId`
  - `person` canónico = `/people/:memberId`
  - `home` interno sigue siendo startup-policy-first; no existe un `viewCode` único materializado para toda la surface
- Primeros consumers migrados:
  - `src/app/api/admin/teams/test/route.ts`
  - `src/lib/webhooks/consumers/notification-mapping.ts` (solo casos `person`, `income`, `expense`)

## Delta 2026-04-30 Manual Teams Announcement Helper

- Greenhouse ya tiene un helper canónico para anuncios manuales vía Greenhouse TeamBot.
- Artefactos principales:
  - `src/config/manual-teams-announcements.ts` — registry code-versioned de destinos manuales permitidos
  - `src/lib/communications/manual-teams-announcements.ts` — preview, validación, fingerprint y envío auditable
  - `scripts/send-manual-teams-announcement.ts` — CLI operativa
  - `docs/operations/manual-teams-announcements.md` — runbook
- Comando canónico:
  - `pnpm teams:announce`
- Guardrails operativos:
  - usar `--dry-run` para preview
  - usar `--yes` para envío real
  - body desde `--body-file` con párrafos separados por línea en blanco
  - CTA `https` obligatorio
  - destinos manuales salen del registry en código, no de texto libre
- Regla de reutilización:
  - ante solicitudes futuras de enviar mensajes por Greenhouse/TeamBot, preferir este helper antes de improvisar scripts temporales o usar el conector personal de Teams

## Delta 2026-04-30 Audits Folder Now Has Canonical Operating Status

- `docs/audits/` ya es una categoria documental formal del repo.
- Su propósito es versionar auditorias tecnicas y operativas reutilizables sobre sistemas, pipelines, contracts y runtime slices.
- Regla operativa nueva:
  - las auditorias deben consumirse frecuentemente como contexto cuando un trabajo toca la zona auditada
  - ninguna auditoria debe tratarse como vigente a ciegas
  - antes de apoyarse en una auditoria, hay que verificar si el codebase, el runtime y la arquitectura actual siguen reflejando sus hallazgos
  - si el sistema cambio de forma material o la auditoria ya no es suficientemente confiable, debe abrirse una auditoria nueva o un refresh versionado
- Fuentes canonicas de esta convención:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `docs/audits/README.md`
  - `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Delta 2026-04-28 Greenhouse Domains And Modules Architecture V1

- Nueva arquitectura canonica: `docs/architecture/GREENHOUSE_DOMAINS_MODULES_ARCHITECTURE_V1.md`.
- Decision: Greenhouse separa **Core Platform** de **Core Domains** y **Domain Modules**.
  - Core Platform = runtime base no instalable: auth, tenant, access, API, events, secrets, audit, object graph.
  - Core Domains = areas nativas de negocio/operacion como `payroll`, `finance`, `cost`, `agency`, `workforce`, `commercial`, `communications`.
  - Domain Modules = subcapacidades funcionales estables dentro de dominios, por ejemplo `finance.bank`, `finance.cash-signals`, `payroll.compliance`, `agency.public-discovery`.
- Regla nueva: un Domain Module no es automaticamente Plugin, App, Service Module, View ni Entitlement.
- Plugins expanden dominios/modulos; Apps enriquecen dominios/modulos/plugins conectando sistemas externos; Service Modules siguen siendo producto/capacidad comercial asignable a clientes.
- Decisiones cerradas antes de runtime:
  - Domain Registry primero: manifests read-only en `src/config/domains/<domainKey>.manifest.ts` cuando se implemente.
  - Dependency graph obligatorio entre domains, modules, apps, plugins, service modules, views, entitlements, workflows y tools.
  - Lifecycle base comun: `planned`, `available`, `active`, `paused`, `deprecated`, `archived`, `retired`.
  - Version compatibility debe declarar Core, Domains, Modules, APIs, eventos y migraciones requeridas; no basta con versionar el paquete.
  - Data ownership: Core Platform owns cross-cutting, Core Domain owns canonical business state, Plugins enrich/materialize/orchestrate, Apps aportan external signal/source/effect.
  - Admin control plane debe partir read-only/readiness antes de install/uninstall interactivo.
  - Naming canonico: `domain`, `domain.module`, `domain.plugin-package`, `appKey`, `viewCode`, `domain.capability.action`.
- `GREENHOUSE_CORE_PLATFORM_ARCHITECTURE_V1.md`, `GREENHOUSE_APPS_ARCHITECTURE_V1.md` y `GREENHOUSE_PLUGINS_ARCHITECTURE_V1.md` fueron ajustados para referenciar esta capa.

## Delta 2026-04-28 Greenhouse Core Platform Architecture V1

- Nueva arquitectura canonica: `docs/architecture/GREENHOUSE_CORE_PLATFORM_ARCHITECTURE_V1.md`.
- Decision: la definicion de **Core Platform** vive fuera de Apps y Plugins. Core es el runtime base no instalable que sostiene auth, tenant context, access governance, API Platform, grafo canonico, outbox/event spine, webhook base, secret resolution, audit/observability, notification foundation y Home shell base.
- Regla de clasificacion oficial:
  - si apagarlo rompe auth, tenant context, API base, events base, secret resolution, audit o grafo canonico, es **Core Platform**.
  - si entrega una capacidad funcional Greenhouse con UI/API/data/events/jobs propios, es **Native Plugin**.
  - si conecta un sistema externo, proveedor, canal, source, API, SaaS o dependencia infra gobernable, es **Connected App**.
- `GREENHOUSE_PLUGINS_ARCHITECTURE_V1.md` ahora solo referencia Core y no es owner de su definicion.

## Delta 2026-04-28 Greenhouse Plugins Architecture V1

- Nueva arquitectura canonica: `docs/architecture/GREENHOUSE_PLUGINS_ARCHITECTURE_V1.md`.
- Decision: Greenhouse debe modelar **Plugins** como paquetes funcionales Greenhouse instalables, versionables y gobernables, no como codigo externo dinamico ni marketplace.
- Separacion de planos:
  - Apps conectan dependencias externas.
  - Plugins empaquetan capacidades funcionales Greenhouse.
  - Tools ejecutan acciones puntuales.
  - Workflows orquestan procesos multi-step.
  - Service Modules describen producto/capacidad comercial.
  - Views y Entitlements gobiernan UI y permisos.
- Regla central: un Plugin instalado no concede permisos, no activa automaticamente views/sidebar y no reemplaza `service_modules`; debe declarar ambos planos de acceso cuando apliquen (`views` + `entitlements`).
- La definicion de Core queda delegada a `GREENHOUSE_CORE_PLATFORM_ARCHITECTURE_V1.md`; Plugins solo define paquetes funcionales sobre Core.
- V1 recomendado: manifests TypeScript code-versioned, runtime read-only sobre codigo/rutas actuales, sin dynamic loading ni install/uninstall interactivo hasta tener readiness y lifecycle probados.
- Candidatos iniciales para validar el modelo: `platform.health`, `communications.manual-announcements`, `finance.external-cash-signals`, `finance.bank-read-model`, `payroll.previred`, `commercial.public-tenders`, `capabilities.creative-hub`, `home.nexa`.

## Delta 2026-04-28 Greenhouse Apps Architecture V1

- Nueva arquitectura canonica: `docs/architecture/GREENHOUSE_APPS_ARCHITECTURE_V1.md`.
- Decision: Greenhouse debe evolucionar `integrations` hacia **Greenhouse Apps** gobernables, instalables, versionables y observables.
- V1 no reemplaza runtime existente: `greenhouse_sync.integration_registry` se conserva como estado operacional legacy mientras se introduce el modelo `Manifest + Catalog + Installation + Binding + Runtime State + Readiness + Events`.
- Regla central:
  - `App Manifest` = contrato esperado, code-versioned y sin secretos.
  - DB/runtime = estado instalado, health, readiness, bindings y ultima operacion.
  - Docs = explicacion humana derivada.
- Una App instalada no concede permisos, no activa vistas y no equivale a un `service_module`; deben mantenerse separados:
  - Apps para dependencias externas.
  - `service_modules` para producto/capacidad comercial.
  - `views` para surfaces visibles.
  - `entitlements` para acciones autorizadas.
- Integraciones actuales se adoptan gradualmente como `legacy_active` o `discovered`:
  - `notion`, `hubspot`, `nubox`, `frame_io` desde `integration_registry`.
  - `teams`, `mercado_publico`, `zapsign` como runtime/helper existente pendiente de manifest/managed state.
- Antes de crear nuevas integraciones productivas, revisar esta arquitectura y declarar manifest, scopes, secrets refs, data role, readiness, safe modes, data touched, ownership y access model cuando aplique.

## Delta 2026-04-30 TASK-647 cierra MCP read-only adapter V1

- Greenhouse ya tiene un runtime MCP local read-only downstream de `api/platform/ecosystem/*` en `src/mcp/greenhouse/**`.
- El server expone por stdio cinco tools base:
  - `get_context`
  - `list_organizations`
  - `get_organization`
  - `list_capabilities`
  - `get_integration_readiness`
- Regla de arquitectura preservada: el MCP no lee SQL directo, no hace writes y no duplica auth, scope, request logging ni rate limits; todo baja al carril ecosystem existente.
- Entry point operativo local:
  - `pnpm mcp:greenhouse`
  - `scripts/run-greenhouse-mcp.ts`
- Variables de entorno nuevas para operación local/controlada:
  - `GREENHOUSE_MCP_API_BASE_URL`
  - `GREENHOUSE_MCP_CONSUMER_TOKEN`
  - `GREENHOUSE_MCP_EXTERNAL_SCOPE_TYPE`
  - `GREENHOUSE_MCP_EXTERNAL_SCOPE_ID`
  - `GREENHOUSE_MCP_API_VERSION` (opcional; default `2026-04-25`)
- `.vscode/mcp.json` puede registrar el server local sin embutir secrets, usando `inputs` interactivos.
- `get_platform_health` queda explícitamente fuera del corte mínimo, pero el runtime ya quedó diseñado para agregar esa tool sobre el mismo cliente downstream sin romper la V1.

## Delta 2026-04-30 TASK-647 cierra follow-ups read-only desbloqueados

- El MCP read-only ya expone extensiones downstream seguras sobre el mismo cliente HTTP:
  - `get_platform_health`
  - `list_event_types`
  - `list_webhook_subscriptions`
  - `get_webhook_subscription`
  - `list_webhook_deliveries`
  - `get_webhook_delivery`
- Guardrails nuevos del client MCP:
  - timeout configurable `GREENHOUSE_MCP_REQUEST_TIMEOUT_MS` (default `15000`)
  - validación runtime del payload `platform-health.v1` antes de devolver `ok`
- Regla preservada:
  - event control plane por MCP sigue siendo solo lectura
  - `create/update subscription`, `retry delivery`, OAuth hosted (`TASK-659`) e ICO ecosystem surface (`TASK-648`) siguen como workstreams separados

## Delta 2026-04-26 Greenhouse Deep Link Platform documentada

- Nueva arquitectura canonica: `docs/architecture/GREENHOUSE_DEEP_LINK_PLATFORM_V1.md`.
- Decision: Greenhouse debe tratar deep links como referencias semanticas access-aware, no como strings de URL repartidos por menus, notificaciones, emails, Teams, search, API Platform o futuras apps.
- Contrato objetivo: `kind + id + action + scope` -> resolver central -> `href`, `absoluteUrl`, `label`, `viewCode`, `requiredCapabilities`, `fallback` y `preview` por audiencia.
- Regla de acceso: todo deep link gobernable debe explicitar ambos planos cuando apliquen:
  - `views` / `authorizedViews` / `view_code` para surface visible
  - `entitlements` / `capabilities` para autorizacion fina
- Hasta que exista runtime, cualquier nueva feature que emita links en notificaciones, Teams, email, search o API debe documentar URL, entidad canonica, `viewCode`, capability y fallback.

## Delta 2026-04-26 Mercado Publico licitaciones helper

- Greenhouse ya tiene un helper server-side para hidratar una licitacion Mercado Publico por codigo externo:
  - detalle oficial desde `api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=...`
  - referencias de adjuntos desde la ficha publica `DetailsAcquisition.aspx?idlicitacion=...`
  - descarga de documentos mediante postback WebForms de `VerAntecedentes.aspx`
- Runtime nuevo: `src/lib/integrations/mercado-publico/tenders.ts`.
- Contrato de secreto: `MERCADO_PUBLICO_TICKET` como fallback local directo; preferir `MERCADO_PUBLICO_TICKET_SECRET_REF=greenhouse-mercado-publico-ticket` en ambientes compartidos.
- El secreto canonico ya existe en GCP Secret Manager (`efeonce-group`) y debe consumirse como scalar crudo. No imprimir ni persistir el ticket en logs o documentos.
- Scope actual: helper puro sin persistencia. El siguiente slice debe decidir almacenamiento de metadata, assets privados y scheduling antes de exponerlo en UI o API Greenhouse.

## Delta 2026-05-30 Mercado Publico Compra Agil API v2 Beta validada

- ChileCompra publico la API Compra Agil v2 Beta en mayo 2026. Contrato oficial observado:
  - Base URL: `https://api2.mercadopublico.cl`.
  - Listado/busqueda: `GET /v2/compra-agil`.
  - Detalle: `GET /v2/compra-agil/{codigo}`.
  - Autenticacion: header HTTP `ticket: <ticket>`, no query param `ticket=...`.
- El mismo secreto canonico existente `greenhouse-mercado-publico-ticket` funciona contra Compra Agil v2. Smoke 2026-05-30:
  - API clasica licitaciones con query ticket: `HTTP 200`, `Cantidad=4210`.
  - API Compra Agil v2 con header ticket: `HTTP 200`, `success=OK`.
  - Rango publicado `2026-05-29..2026-05-30`: `total_resultados=3114`, `total_paginas=312`, `items_count=10`.
- Adjuntos Compra Agil v2:
  - el detalle oficial expone metadata `documentos[].id` y `documentos[].nombre` (ej. `1540510 / CARROS.pdf`, `68071 / ANEXO ADQUISICIÓN DE MATERIALES ELÉCTRICOS EXPO PATAGONIA.docx`);
  - la guia oficial no documenta endpoint de descarga de binarios;
  - rutas probables en `api2.mercadopublico.cl` devolvieron `403 Missing Authentication Token`;
  - endpoints internos del portal bajo `servicios-compra-agil.mercadopublico.cl/v1/*/descargar*` devolvieron `401 Unauthorized` o `503` sin sesion, por lo que no son contrato backend productivo.
- Implicacion operativa: `TASK-678` debe pivotear de watch a adapter spike/productization plan. `TASK-677` COT mensual queda como historico/backfill/benchmark/fallback, no como unica fuente live de Compra Agil.
- Guardrail: no imprimir el ticket, manejar `429`, paginacion (`tamano_pagina` 10..50), watermarks por `fechas.fecha_ultimo_cambio` y degradacion honesta si la Beta falla. Para documentos Compra Agil, modelar `discovered` metadata-only hasta que `TASK-679` resuelva descarga autorizada.

## Delta 2026-04-26 TASK-617 cerrado y TASK-647 abre MCP read-only

- `TASK-617` queda cerrado documentalmente: `TASK-617.1` a `TASK-617.4` ya cubren REST hardening, first-party app lane, event control plane y developer docs.
- El siguiente slice ejecutable de MCP es `TASK-647`:
  - MCP read-only
  - downstream de `api/platform/ecosystem/*`
  - tools iniciales para context, organizations, capabilities e integration readiness
  - sin SQL directo, sin routes legacy y sin writes
- Regla operativa: cualquier MCP write-safe futuro debe esperar idempotencia transversal en `src/lib/api-platform/**` y command endpoints maduros.

## Delta 2026-04-26 TASK-617.4 publica Developer API Documentation Portal

- `/developers/api` es ahora el entrypoint publico developer-facing de la API Platform.
- La pagina publica centra `api/platform/*` y separa cuatro lanes:
  - `ecosystem`
  - `app`
  - event control plane
  - legacy `integrations/v1`
- Artefactos developer-facing nuevos:
  - `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
  - `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`
  - `public/docs/greenhouse-api-platform-v1.md`
  - `public/docs/greenhouse-api-platform-v1.openapi.yaml`
- El OpenAPI de platform es preview en este corte; el OpenAPI estable de `integrations/v1` sigue en `GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`.
- Regla operativa: la documentacion publica no debe prometer API anonima, writes ecosystem-facing amplios ni idempotencia transversal hasta que existan runtime helpers dedicados.

## Delta 2026-04-26 API Platform recupera REST hardening y lane first-party app

- `TASK-617.1` y `TASK-617.2` quedaron recuperadas selectivamente desde rama/stash sobre `develop` actual.
- `api/platform/ecosystem/*` ya tiene paginación uniforme, headers rate-limit remaining/reset, freshness helpers y tests de contrato focalizados.
- `api/platform/app/*` existe como lane first-party user-authenticated para mobile/futuros clients propios:
  - `POST/PATCH /api/platform/app/sessions`
  - `DELETE /api/platform/app/sessions/current`
  - `GET /api/platform/app/context`
  - `GET /api/platform/app/home`
  - `GET /api/platform/app/notifications`
  - commands de notificaciones leídas
- Runtime nuevo:
  - `greenhouse_core.first_party_app_sessions`
  - `greenhouse_core.api_platform_request_logs`
- La implementación recuperada fue portada del diseño viejo con `jsonwebtoken` a `jose`, manteniendo HS256 y el secret canónico de auth.
- Regla operativa nueva: la futura app React Native debe usar `api/platform/app/*`; no usar `AGENT_AUTH`, `sister_platform_consumers` ni rutas web internas como contrato móvil.

## Delta 2026-04-26 Nubox Quotes Hot Sync

- Las cotizaciones Nubox (`COT` / DTE 52) tienen un carril incremental separado del ETL diario:
  - `GET /api/cron/nubox-quotes-hot-sync` cada 15 minutos
  - runtime `src/lib/nubox/sync-nubox-quotes-hot.ts`
  - script operativo `pnpm sync:nubox:quotes-hot -- --period=YYYY-MM`
- El carril conserva el contrato robusto source → raw BigQuery → conformed BigQuery → PostgreSQL; no inserta cotizaciones directo en `greenhouse_finance.quotes`.
- Observabilidad: `greenhouse_sync.source_sync_runs.source_object_type='quotes_hot_sync'`.
- Variable opcional: `NUBOX_QUOTES_HOT_WINDOW_MONTHS` controla la ventana caliente de meses (default 2, max 6).
- Credenciales Nubox: `NUBOX_BEARER_TOKEN` y `NUBOX_X_API_KEY` deben preferir Secret Manager via `NUBOX_BEARER_TOKEN_SECRET_REF` y `NUBOX_X_API_KEY_SECRET_REF`; las refs quedaron provisionadas para Development, Preview, Staging y Production.
- El script operativo acepta env explícito para replay controlado: `pnpm sync:nubox:quotes-hot -- --env-file=/path/to/env --period=YYYY-MM`.

## Delta 2026-04-26 API Platform incorpora Event Control Plane

- Greenhouse ya expone `webhooks / event delivery` como control plane ecosystem-facing bajo `api/platform/ecosystem/*`.
- Runtime reutilizado:
  - `greenhouse_sync.webhook_subscriptions`
  - `greenhouse_sync.webhook_deliveries`
  - `greenhouse_sync.webhook_delivery_attempts`
  - `greenhouse_sync.outbox_events`
- Regla operativa nueva:
  - `/api/webhooks/*` y `/api/cron/webhook-dispatch` siguen siendo transport boundary
  - `/api/platform/ecosystem/webhook-*` es el control plane oficial para subscriptions, deliveries, attempts y retry
  - las subscriptions de control plane deben tener owner/scope (`sister_platform_consumer_id`, binding y scope Greenhouse)
  - retries se reprograman para el dispatcher existente; no se entregan inline desde la route

## Delta 2026-04-25 Onboarding ya tiene arquitectura canónica propia

- Greenhouse ya no debe tratar onboarding como una suma implícita de provisioning SCIM + checklist HRIS + activación manual dispersa.
- Fuente canónica nueva:
  - `docs/architecture/GREENHOUSE_WORKFORCE_ONBOARDING_ARCHITECTURE_V1.md`
- Regla operativa nueva:
  - el agregado canonico es un caso de inicio de relacion de trabajo con snapshot contractual y legal
  - `SCIM` es signal source de identidad, no owner total del onboarding
  - el checklist legacy de onboarding en HRIS pasa a ser child object operativo del caso, no su source of truth
  - el onboarding de placement (`Staff Aug`) sigue siendo un agregado separado del onboarding workforce interno

## Delta 2026-04-25 Workforce ya tiene arquitectura canónica propia

- Greenhouse ya no debe tratar `Workforce` como una suma implícita de `People + HR + Payroll + SCIM`.
- Fuente canónica nueva:
  - `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- Regla operativa nueva:
  - `Workforce` es el dominio madre de lifecycle laboral-operativo, drift y orchestration sobre personas de trabajo
  - `Person360.workforce` es el target canónico de lectura por persona
  - `Workforce Workspace` es la shell operativa objetivo por encima de `People`, `HR` y `Payroll`
  - `Offboarding` queda como subdominio especializado bajo `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`

## Delta 2026-04-25 Offboarding ya tiene arquitectura canónica propia

- Greenhouse ya no debe tratar offboarding como una suma implícita de SCIM deactivation + checklist HRIS + cleanup manual en Payroll/People.
- Fuente canónica nueva:
  - `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- Regla operativa nueva:
  - el agregado canonico es un caso de salida de relacion de trabajo con snapshot contractual y legal
  - `SCIM` es signal source de identidad, no owner total del offboarding
  - el checklist legacy de offboarding en HRIS pasa a ser child object operativo del caso, no su source of truth
  - el dominio debe pensarse en ambos planos:
    - `views` (`People` como ficha canonica, `HR` como surface operativa)
    - `entitlements/capabilities` para create/review/approve/execute/cancel

## Delta 2026-04-25 API Platform ahora tiene arquitectura canónica propia

- Greenhouse ya no debe operar su capa API solo desde docs sueltos en `docs/api/*`.
- Fuente canónica nueva:
  - `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- Regla operativa nueva:
  - la arquitectura API se define como capability shared de plataforma
  - `docs/api/GREENHOUSE_API_REFERENCE_V1.md` y `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md` quedan como documentos derivados/transicionales
  - nuevos contratos ecosystem-facing deben preferir `api/platform/*` como namespace objetivo
  - `MCP` sigue siendo downstream de contratos API estables

## Delta 2026-04-23 Reactive projections ahora declaran writer privileges y clasifican fallos infra tipados

- Las projections que escriben tablas shared como excepción (`greenhouse_serving`) ya no deben depender solo de grants implícitos o del texto libre de un dead-letter.
- Contrato nuevo:
  - `ProjectionDefinition.requiredTablePrivileges`
  - helper `src/lib/sync/projection-runtime-health.ts`
  - helper `src/lib/sync/reactive-error-classification.ts`
- Regla operativa nueva:
  - toda projection que materializa tablas shared debe declarar explícitamente sus privilegios requeridos para que Ops Health pueda detectar drift antes de que llegue un evento real
  - los fallos reactivos de infraestructura ya no deben persistirse solo como texto libre; se tipifican con `error_class`, `error_family` e `is_infrastructure_fault` en `greenhouse_sync.outbox_reactive_log` y `greenhouse_sync.projection_refresh_queue`
- Primer consumidor:
  - `service_attribution` declara write privileges sobre `greenhouse_serving.service_attribution_facts` y `greenhouse_serving.service_attribution_unresolved`
- Operación nueva:
  - `POST /api/admin/ops/projections/requeue-failed` acepta filtros opcionales `projectionName`, `errorClass` y `onlyInfrastructure`

## Delta 2026-04-23 TASK-583 converge el contrato local de HubSpot quotes hacia publish/tax native

- El outbound de quotes ya no debe armar payloads create/update por carriles distintos.
- Nuevo helper canónico:
  - `src/lib/hubspot/hubspot-quote-sync.ts`
  - source of truth para `sender`, `senderCompany`, binding catálogo-first, billing semantics y metadata tributaria outbound
- Regla operativa nueva:
  - si una línea ya referencia catálogo Greenhouse (`product_id`, `product_code`, `service_sku`), el outbound exige `hubspot_product_id`
  - si falta ese binding, el carril falla explícitamente con `catalog_binding_missing:*` en vez de degradar silenciosamente a línea libre
- Tax binding native:
  - Greenhouse ya no debe hardcodear `hs_tax_rate_group_id`
  - el resolver canónico consulta `GET /tax-rates` del bridge `hubspot-greenhouse-integration`, filtra tasas activas y mapea por rate normalizada
- Observabilidad outbound nueva en `greenhouse_commercial.quotations`:
  - `hubspot_quote_status`
  - `hubspot_quote_link`
  - `hubspot_quote_pdf_download_link`
  - `hubspot_quote_locked`
  - `hubspot_last_synced_at`
- `create-hubspot-quote.ts` y `update-hubspot-quote.ts` ya convergen sobre el integration service autenticado; el cliente update degradado legacy no debe reintroducirse

## Delta 2026-04-23 Quote outbound HubSpot converge on canonical `organization`, not `space`

- El carril reactivo `quotation_hubspot_outbound` ya no debe asumir `space` como anchor para crear cotizaciones HubSpot.
- La ancla canonica del outbound comercial es:
  - `organization_id` -> `greenhouse_core.organizations.hubspot_company_id`
  - `hubspot_deal_id`
  - `contact_identity_profile_id` -> HubSpot contact
- `space` queda solo como bridge legacy para mirrors financieros locales cuando la organización ya es cliente; no puede bloquear la creación/sincronización de una quote HubSpot.
- El resolver canónico de contacto HubSpot para este lane es:
  - `greenhouse_serving.person_360.hubspot_contact_id`
  - fallback `greenhouse_crm.contacts.hubspot_contact_id`
  - fallback final `greenhouse_core.identity_profiles.primary_source_object_id` si el source es `hubspot/contact`
- El `ops-worker` debe publicar ambos valores de integración para writes reactivos a HubSpot:
  - `GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF`
  - `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL`

## Delta 2026-04-23 Quote Builder hydratea deals HubSpot de la company via read-through

- `GET /api/commercial/organizations/[id]/deals` sigue siendo el contrato canónico downstream del `organizationId`, pero ya no asume que `greenhouse_commercial.deals` contiene previamente todos los negocios de la company.
- Si la organization tiene `hubspot_company_id`, el endpoint ejecuta una hidratación live desde HubSpot y luego responde desde Greenhouse con el mirror actualizado.
- La lane canónica nueva vive en `src/lib/commercial/sync-organization-hubspot-deals.ts` y materializa todos los deals asociados a la company, incluyendo historicos, `closedwon` y `closedlost`; no filtra por etapa.
- La dependencia upstream es `GET /companies/{hubspotCompanyId}/deals` del servicio `hubspot-greenhouse-integration`, que devuelve metadata live de pipeline y stage desde HubSpot Pipelines API.

## Delta 2026-04-22 Quote Builder contact hydration converge via canonical read-through

- `GET /api/commercial/organizations/[id]/contacts` sigue siendo el contrato canónico downstream del `organizationId`, pero ya no asume que el mirror local de contactos está precargado.
- Si la organization tiene `hubspot_company_id` y todavía no existen `person_memberships` comerciales locales, el endpoint ejecuta una primera hidratación canónica desde HubSpot y luego responde desde Greenhouse.
- La lane admin `POST /api/organizations/[id]/hubspot-sync` quedó convergida sobre el mismo helper `src/lib/account-360/sync-organization-hubspot-contacts.ts`.

## Delta 2026-04-22 TASK-550 cierra los follow-ups enterprise del pricing catalog

- El Admin Pricing Catalog ya no tiene gaps abiertos respecto del cierre de TASK-471:
  - revert one-click para governance types (`role_tier_margin`, `service_tier_margin`, `commercial_model_multiplier`, `country_pricing_factor`, `employment_type`)
  - gate de impacto alto en los 4 tabs guardables del `EditSellableRoleDrawer`
  - notificaciones reactivas para la approval queue del catálogo
  - Excel import con proposal/apply split: `update` directo, `create/delete` vía approval workflow
- Contrato runtime nuevo:
  - route `POST /api/admin/pricing-catalog/import-excel/propose`
  - helper `src/lib/commercial/pricing-catalog-excel-approval.ts`
  - projection `src/lib/sync/projections/pricing-catalog-approval-notifier.ts`
  - eventos `commercial.pricing_catalog_approval.proposed` y `commercial.pricing_catalog_approval.decided`
- Flag nuevo:
  - `GREENHOUSE_PRICING_APPROVAL_NOTIFICATIONS`
  - default recomendado: `false` hasta validar entrega en el ambiente objetivo
  - cuando está apagado, la approval queue sigue operando normalmente; solo se omite el dispatch reactivo de email/Slack/in-app
- Aclaración arquitectónica vigente:
  - el tenant scope del pricing impact analysis ya no debe describirse como broad `space_id`
  - el scope canónico para quotations/commercial readers actuales es `organization_id`
  - `space_id` se conserva solo donde una proyección legacy aún lo exige (`deal_pipeline_snapshots`)

## Delta 2026-04-21 TASK-542 cierra la surface administrativa de Party Lifecycle

- Greenhouse ya tiene surface administrativa canonica para lifecycle comercial en Admin Center.
- Contrato nuevo:
  - navegación `Commercial Parties` en `/admin/commercial/parties`
  - detail `/admin/commercial/parties/:id`
  - projection `src/lib/sync/projections/party-lifecycle-snapshot.ts`
  - tabla `greenhouse_serving.party_lifecycle_snapshots`
  - store `src/lib/commercial/party/party-lifecycle-snapshot-store.ts`
  - comandos admin `override-party-lifecycle.ts` y `resolve-party-sync-conflict.ts`
  - endpoint `POST /party-lifecycle/sweep` en `services/ops-worker/server.ts`
- Reglas operativas:
  - la lectura de funnel/velocity debe consumir la snapshot, no queries ad-hoc
  - las transiciones manuales solo pasan por `promoteParty` con `source='operator_override'` y razón obligatoria
  - la resolución de conflictos vive sobre `greenhouse_commercial.party_sync_conflicts`
  - el sweep de inactividad corre en `ops-worker`, no en Vercel serverless

## Delta 2026-04-21 TASK-540 aterriza la foundation outbound de Party Lifecycle

- Greenhouse ya tiene carril reactivo local para devolver lifecycle comercial hacia HubSpot Companies.
- Contrato nuevo:
  - projection `src/lib/sync/projections/party-hubspot-outbound.ts`
  - helper `src/lib/hubspot/push-party-lifecycle.ts`
  - tabla `greenhouse_commercial.party_sync_conflicts`
  - helpers `src/lib/sync/field-authority.ts` y `src/lib/sync/anti-ping-pong.ts`
  - eventos `commercial.party.hubspot_synced_out` y `commercial.party.sync_conflict`
  - script `scripts/create-hubspot-company-custom-properties.ts`
- Reglas operativas:
  - el outbound solo escribe campos Greenhouse-owned; HubSpot sigue siendo owner de `name`, `domain`, `industry`, address y phone
  - `gh_last_write_at` es el anchor canónico del anti-ping-pong; el inbound `sync-hubspot-company-lifecycle.ts` ya lo consume para skippear loopbacks
  - el write HTTP usa `GREENHOUSE_INTEGRATION_API_TOKEN` contra el servicio externo `hubspot-greenhouse-integration`
  - el servicio externo `hubspot-greenhouse-integration` ya expone `PATCH /companies/:id/lifecycle`; `endpoint_not_deployed` queda como degraded path defensivo
  - la decisión V1 de compliance es exportar `gh_mrr_tier`; no se empuja monto bruto `gh_mrr_clp`

## Delta 2026-04-21 TASK-537 cierra la Fase C de party lifecycle con search/adopt backend-only

- Greenhouse ya tiene carril backend para buscar y adoptar parties comerciales antes de la UI unificada del Quote Builder.
- Contrato nuevo:
  - `GET /api/commercial/parties/search`
  - `POST /api/commercial/parties/adopt`
  - tabla `greenhouse_commercial.party_endpoint_requests`
  - helpers `party-search-reader`, `hubspot-candidate-reader`, `party-endpoint-rate-limit`
- Reglas operativas:
  - `greenhouse_crm.companies` sigue siendo el mirror local primario de HubSpot companies, pero `GET /api/commercial/parties/search` ahora suplementa con search live vía `hubspot-greenhouse-integration` cuando el mirror todavía no refleja una company existente
  - toda organization materializada se scopea por tenant usando `resolveFinanceQuoteTenantOrganizationIds()`
  - los `hubspot_candidate` no materializados solo se exponen a `efeonce_internal`, porque aun no existe anchor tenant-safe para mostrarlos a tenants externos
  - `/adopt` es idempotente por `hubspot_company_id` y, si el lifecycle mapea a `active_client`, completa tambien `instantiateClientForParty`
  - `TASK-538` debe consumir estos endpoints tal cual y no reimplementar merge/search inline

## Delta 2026-04-21 TASK-533 materializa libro IVA mensual y posicion fiscal por tenant

- Greenhouse ya puede consolidar IVA mensual por `space_id` sin calcular inline en UI.
- Contrato nuevo:
  - tablas `greenhouse_finance.vat_ledger_entries` y `greenhouse_finance.vat_monthly_positions`
  - helper `src/lib/finance/vat-ledger.ts`
  - projection reactiva `vat_monthly_position`
  - evento coarse-grained `finance.vat_position.period_materialized`
  - endpoint Cloud Run `POST /vat-ledger/materialize` en `ops-worker`
  - serving route `GET /api/finance/vat/monthly-position` con export CSV
- Reglas operativas:
  - el débito fiscal nace desde `income.tax_snapshot_json`
  - el crédito fiscal nace solo desde `expenses.recoverable_tax_amount`
  - `non_recoverable_tax_amount` queda separado y no incrementa crédito
  - toda lectura mensual debe filtrar por `space_id`

## Delta 2026-04-21 TASK-532 formaliza IVA de compras como contrato explícito de costo

- `greenhouse_finance.expenses` ya no debe leerse solo como `subtotal + tax_amount + total_amount`.
- Contrato nuevo:
  - `tax_code` + `tax_snapshot_json` + `tax_snapshot_frozen_at`
  - `tax_recoverability`
  - buckets `recoverable_tax_amount`, `non_recoverable_tax_amount`, `effective_cost_amount`
- Regla operativa:
  - IVA recuperable NO entra a costo operativo
  - IVA no recuperable SÍ entra a costo/gasto
  - consumers downstream de P&L/economics deben preferir `COALESCE(effective_cost_amount_clp, total_amount_clp)` sobre `total_amount_clp` bruto
- Nubox purchases y payroll-generated expenses ya escriben el mismo contrato.
- `TASK-533` debe consumir estos buckets como base del ledger mensual de IVA.

## Delta 2026-04-21 EPIC-003 formaliza Ops Registry como framework operativo repo-native y federable

- Greenhouse ya no debe pensar la operacion del framework documental solo como una colección de markdowns navegados manualmente.
- Decision canonica nueva:
  - nace `Ops Registry` como capa derivada para indexar, validar, relacionar y consultar `architecture`, `tasks`, `epics`, `mini-tasks`, `issues`, `project_context`, `Handoff` y `changelog`
  - la source of truth sigue en Git y en markdown local a cada repo
  - el sistema debe servir tanto a humanos como a agentes
  - el diseño base debe escalar a repos hermanos por federacion, no por centralizacion
  - el sistema debe exponer API HTTP y MCP para LLMs/agents
  - el sistema no solo lee: debe poder crear y actualizar artefactos mediante comandos write-safe materializados en markdown
  - el sistema debe ser template-aware y process-aware: respetar `TASK_TEMPLATE`, `TASK_PROCESS`, `EPIC_TEMPLATE`, `MINI_TASK_TEMPLATE` y el modelo de issues
- Mounting técnico objetivo:
  - `src/lib/ops-registry/**`
  - `scripts/ops-registry-*.mjs`
  - `.generated/ops-registry/**`
  - `src/app/api/internal/ops-registry/**`
  - `src/app/(dashboard)/admin/ops-registry/**`
  - `src/mcp/ops-registry/**`
- Stack recomendado:
  - `TypeScript + Node.js`
  - `unified + remark-parse`
  - `zod`
  - JSON derivados como contrato V1; base externa opcional solo como cache futura, nunca como truth primaria
- Artefactos derivados mínimos:
  - `registry.json`
  - `graph.json`
  - `validation-report.json`
  - `stale-report.json`
- Programa operativo:
  - `EPIC-003 — Ops Registry Federated Operational Framework`
  - child tasks iniciales: `TASK-558` a `TASK-561`

## Delta 2026-04-21 EPIC-002 formaliza la separacion canonica Comercial vs Finanzas

- Greenhouse ya no debe tratar `Finance` como owner primario de quotes, contracts, SOW, master agreements, products y pipeline comercial solo porque varias rutas legacy sigan bajo `/finance/...`.
- Decision canonica nueva:
  - `Comercial` y `Finanzas` pasan a ser dominios hermanos del portal
  - la primera separacion ocurre en `navegacion + surfaces + autorizacion`
  - la primera separacion **no** obliga a migrar paths legacy `/finance/...`
- Fuente especializada:
  - `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`
- Contrato operativo:
  - `Comercial` es owner de `pipeline`, `deals`, `cotizaciones`, `contratos`, `SOW`, `acuerdos marco` y `productos`
  - `Finanzas` conserva ownership de `ingresos`, `egresos`, `cobros`, `pagos`, `banco`, `posicion de caja`, `conciliacion`, `asignaciones` y `economia`
  - el access model objetivo requiere los dos planos:
    - `views` / `authorizedViews` / `view_code` con namespace `comercial.*`
    - `entitlements` / `routeGroup: commercial` con compat temporal a `finanzas.*`
- Implicacion de ejecucion:
  - este corte no cabe sanamente en una sola task
  - nace `EPIC-002 — Commercial Domain Separation from Finance`
  - child tasks iniciales: `TASK-554` a `TASK-557`

## Delta 2026-04-19 EPIC-001 introduce taxonomía canónica de epics y el programa documental transversal

- El repo ya no usa solo `umbrella task` para coordinar programas grandes: nace `docs/epics/` con `EPIC-###`, `EPIC_TEMPLATE.md` y `EPIC_ID_REGISTRY.md`.
- Regla nueva:
  - `EPIC-###` se usa para programas cross-domain o multi-task
  - las tasks siguen siendo la unidad ejecutable
  - una task puede declarar `Epic: EPIC-###` en `## Status`
- Fuente operativa canónica:
  - `docs/operations/EPIC_OPERATING_MODEL_V1.md`
- Primer epic creado:
  - `EPIC-001 — Document Vault + Signature Orchestration Platform`
  - child tasks oficiales: `TASK-489` a `TASK-495`
- Implicación arquitectónica:
  - la estrategia documental futura del repo deja de fragmentarse por módulo
  - GCS + `greenhouse_core.assets` sigue siendo la foundation binaria
  - ZapSign queda posicionado como provider de firma, no como source of truth documental
  - `TASK-027` (HR) y `TASK-461` (MSA) pasan a considerarse lanes convergentes de un mismo programa

## Delta 2026-04-19 TASK-461 introduce MSA, clause library y firma electrónica ZapSign para contratos marco

- Runtime nuevo:
  - migración `20260419170002315_task-461-msa-umbrella-clause-library.sql`
  - tablas `greenhouse_commercial.master_agreements`, `greenhouse_commercial.clause_library` y `greenhouse_commercial.master_agreement_clauses`
  - FK real `greenhouse_commercial.contracts.msa_id -> greenhouse_commercial.master_agreements(msa_id)`
  - stores `src/lib/commercial/master-agreements-store.ts`, `src/lib/commercial/master-agreement-clauses-store.ts`, `src/lib/commercial/contract-tenant-scope.ts`
  - integración `src/lib/integrations/zapsign/client.ts`
- Contrato operativo:
  - `contract` deja de depender solo de `space_id` para tenant scoping y resuelve un scope híbrido `organization_id OR space_id` mientras convive con contratos legacy
  - `master_agreement` pasa a ser el umbrella legal reusable para múltiples SOWs, con cláusulas versionadas y PDF firmado como asset privado
  - la chain documental de MSA usa `greenhouse_core.assets` con contextos `master_agreement_draft` y `master_agreement`
  - ZapSign queda integrado en modo productivo via API + webhook (`/api/webhooks/zapsign`); el runtime debe usar `ZAPSIGN_API_TOKEN` y `ZAPSIGN_WEBHOOK_SHARED_SECRET` desde env o Secret Manager, nunca desde `data/`
- Variables nuevas:
  - `ZAPSIGN_API_BASE_URL` (default `https://api.zapsign.com.br`)
  - `ZAPSIGN_API_TOKEN`
  - `ZAPSIGN_API_TOKEN_SECRET_REF`
  - `ZAPSIGN_WEBHOOK_SHARED_SECRET`
  - `ZAPSIGN_WEBHOOK_SHARED_SECRET_SECRET_REF`

## Delta 2026-04-19 TASK-477 formaliza role_modeled con provenance, confidence y batch worker

- Runtime nuevo:
  - migración `20260419151636951_task-477-role-modeled-cost-basis.sql`
  - tabla `greenhouse_commercial.role_modeled_cost_basis_snapshots`
  - helper `src/lib/commercial-cost-basis/role-modeled-cost-basis.ts`
- Contrato operativo:
  - `sellable_role_cost_components` sigue siendo el anchor editable del catálogo, pero ahora agrega `direct_overhead_pct`, `shared_overhead_pct`, `source_kind`, `source_ref`, `confidence_score` y columnas generadas `confidence_label`, `direct_overhead_amount_usd`, `shared_overhead_amount_usd`, `loaded_monthly_cost_usd`, `loaded_hourly_cost_usd`
  - `pricing-engine-v2` mantiene la precedencia `role_blended -> role_modeled`; cuando cae a `role_modeled`, ya expone provenance/confidence explícitos desde el reader nuevo
  - `commercial-cost-worker` scope `roles` deja de estar reservado y materializa snapshots `role_modeled` por período
  - `Admin > Pricing Catalog > Roles > Componentes de costo` ya puede editar overhead directo/compartido y mostrar loaded cost + confidence/origen sin crear otra UI paralela

## Delta 2026-04-19 TASK-479 agrega el bridge persona -> rol comercial y el snapshot role_blended

- Runtime nuevo:
  - migración `20260419141717643_task-479-people-actual-cost-blended-role-snapshots.sql`
  - tablas `greenhouse_commercial.member_role_cost_basis_snapshots` y `greenhouse_commercial.role_blended_cost_basis_snapshots`
  - helper `src/lib/commercial-cost-basis/people-role-cost-basis.ts`
- Contrato operativo:
  - `member_capacity_economics` sigue siendo la fuente factual reusable de `member_actual`
  - el bridge persona -> rol comercial ya no se resuelve inline en pricing; queda materializado con provenance/confidence por período
  - `commercial-cost-worker` scope `people` materializa costo factual por persona + bridge persona/rol + `role_blended` en batch
  - `pricing-engine-v2` prefiere `role_blended` antes de `role_modeled` cuando existe evidencia real reusable
  - `active_role_codes` de Identity Access no debe usarse como source de rol comercial

## Delta 2026-04-19 TASK-483 endurece el deploy del commercial-cost-worker con WIF

- `commercial-cost-worker` deja de depender solo de deploy manual y adopta workflow GitHub Actions con el baseline WIF del repo.
- Source of truth:
  - `.github/workflows/commercial-cost-worker-deploy.yml`
  - `services/commercial-cost-worker/deploy.sh`
  - `.github/DEPLOY.md`
- Contrato operativo:
  - reusar `github-actions-deployer@efeonce-group.iam.gserviceaccount.com`
  - no crear pool/provider/SA nuevos para este worker
  - el workflow observa tanto `services/commercial-cost-worker/**` como librerías compartidas que alteran su runtime efectivo

## Delta 2026-04-19 TASK-460 materializa contract como entidad canónica post-venta

- Greenhouse ya no debe tratar `quotation_id` como único anchor válido para todo el lifecycle comercial después de la aceptación.
- Runtime nuevo:
  - migración `20260419071250347_task-460-contract-sow-canonical-entity.sql`
  - tablas `greenhouse_commercial.contracts`, `greenhouse_commercial.contract_quotes`, `greenhouse_serving.contract_profitability_snapshots`, `greenhouse_commercial.contract_renewal_reminders`
  - columnas `contract_id` en `greenhouse_finance.purchase_orders`, `greenhouse_finance.service_entry_sheets` e `greenhouse_finance.income`
  - helpers `src/lib/commercial/contracts-store.ts`, `src/lib/commercial/contract-lifecycle.ts`
  - endpoints `GET/POST /api/finance/contracts`, `GET /api/finance/contracts/[id]`, `GET /api/finance/contracts/[id]/document-chain`, `GET /api/finance/contracts/[id]/profitability`
- Contrato operativo:
  - `quotation` sigue siendo el artefacto pre-venta y de pricing
  - `contract` pasa a ser el anchor canónico post-venta para document chain, profitability y renewals
  - durante la transición ambos anchors coexisten y los consumers nuevos deben preferir `contract_id` cuando el caso de uso sea ejecución/rentabilidad/renovación
  - `msa_id` queda reservado como referencia futura; no hay FK real hasta TASK-461
  - toda lectura portal sigue tenant-scoped por `space_id`

## Delta 2026-04-19 TASK-459 separa delivery model de quotation en dos ejes canónicos

- Greenhouse ya no debe tratar `pricing_model` como source of truth suficiente para leer cómo se vende una quote.
- Runtime nuevo:
  - migración `20260419012226774_task-459-delivery-model-refinement.sql`
  - helper `src/lib/commercial/delivery-model.ts`
  - columnas `greenhouse_commercial.quotations.commercial_model` y `staffing_model`
  - surfacing en `GET /api/finance/quotes`, `GET /api/finance/quotes/[id]`
  - extensions en `quotation_pipeline_snapshots`, `quotation_profitability_snapshots` y `deal_pipeline_snapshots`
- Contrato operativo:
  - `commercial_model + staffing_model` pasa a ser la verdad canónica del delivery contract del quote
  - `pricing_model` queda como alias legacy derivado para governance/templates/terms
  - este `commercial_model` NO debe confundirse con `CommercialModelCode` del pricing engine comercial
  - `sales_context_at_sent` ya preserva los tres campos para trazabilidad histórica

## Delta 2026-04-19 TASK-456 materializa forecasting comercial canónico a grain deal

- Greenhouse ya no debe usar `quotation_pipeline_snapshots` como aproximación del pipeline comercial real cuando la pregunta es forecasting por oportunidad.
- Runtime nuevo:
  - migración `20260419003219480_task-456-deal-pipeline-snapshots.sql`
  - tabla `greenhouse_serving.deal_pipeline_snapshots`
  - helper `src/lib/commercial-intelligence/deal-pipeline-materializer.ts`
  - projection reactiva `src/lib/sync/projections/deal-pipeline.ts`
  - endpoint `GET /api/finance/commercial-intelligence/deal-pipeline`
- Contrato operativo:
  - el grain canónico de forecasting comercial pasa a ser deal, no quote
  - `is_open` / `is_won` deben resolverse desde `greenhouse_commercial.hubspot_deal_pipeline_config`, no desde nombres literales de stage
  - `probability_pct` puede venir `NULL`; los agregados ponderados deben tratarlo como `0` sin inventar una probabilidad persistida
  - un deal con `0` quotes sigue siendo una oportunidad válida y debe existir en la projection

## Delta 2026-04-18 Iconify generated CSS queda endurecido para worktrees y gates locales

- El portal ya no debe asumir que `src/assets/iconify-icons/generated-icons.css` existe solo porque alguna vez corrió `postinstall`.
- Contrato operativo actualizado:
  - `src/assets/iconify-icons/generated-icons.css` sigue siendo un artefacto generado y no versionado
  - `pnpm dev`, `pnpm lint` y `pnpm build` ahora regeneran el bundle antes de ejecutar su comando principal vía `predev`, `prelint` y `prebuild`
  - esto evita drift en worktrees que reutilizan `node_modules` sin correr `pnpm install`
- Source of truth:
  - `src/assets/iconify-icons/bundle-icons-css.ts` sigue siendo la fuente canónica del bundle
  - `package.json` gobierna la regeneración automática

## Delta 2026-04-18 TASK-455 materializa snapshot histórico del contexto comercial en quotations

- Greenhouse ya no debe inferir ex post el contexto comercial de una quote enviada usando solo estado vivo del cliente o del deal.
- Runtime actualizado:
  - migración `20260418235105189_task-455-quote-sales-context-snapshot.sql`
  - columna `greenhouse_commercial.quotations.sales_context_at_sent`
  - helper `src/lib/commercial/sales-context.ts`
  - extensión de `POST /api/finance/quotes/[id]/send`
  - extensión del flujo `POST /api/finance/quotes/[id]/approve`
  - exposición en `GET /api/finance/quotes/[id]`
- Contrato operativo:
  - el snapshot es histórico e immutable
  - se construye solo con runtime local ya sincronizado
  - el campo `hubspot_lead_id` queda reservado pero hoy se persiste como `null` por falta de source canónico local
  - TASK-457 y cualquier classifier vivo deben seguir leyendo estado actual, no este snapshot

## Delta 2026-04-17 TASK-143 Agency Economics queda activada sobre serving canónico

- `Agency > Economía` ya no debe tratarse como una vista legacy client-first ni como placeholder.
- Runtime nuevo:
  - `GET /api/agency/economics`
  - `src/lib/agency/agency-economics.ts`
  - `src/views/greenhouse/agency/economics/EconomicsView.tsx`
- Contrato operativo:
  - la lane consume `greenhouse_serving.operational_pl_snapshots` como source principal
  - el drill-down por servicio no debe inventar métricas ni repartir revenue inline mientras `TASK-146` siga abierta
  - la expansión por Space puede mostrar solo contexto contractual/catálogo vía `services`
- Decisión UI:
  - la surface nueva reutiliza componentes Vuexy/MUI nativos del repo como referencia principal, no componentes inventados ad hoc

## Delta 2026-04-18 TASK-337 materializa la base runtime persona ↔ entidad legal

- Greenhouse ya no deja esta relación solo como semántica documental.
- Runtime nuevo:
  - migración `20260418020712679_task-337-person-legal-entity-foundation.sql`
  - tabla `greenhouse_core.person_legal_entity_relationships`
  - helper `src/lib/account-360/person-legal-entity-relationships.ts`
  - route `GET /api/people/[memberId]/legal-entity-relationships`
  - proyección reactiva `src/lib/sync/projections/operating-entity-legal-relationship.ts`
- Contrato operativo:
  - la raíz humana sigue siendo `identity_profiles.profile_id`
  - la contraparte legal v1 queda anclada explícitamente en `legal_entity_organization_id`, reutilizando `greenhouse_core.organizations`
  - `person_memberships` no reemplaza esta capa; sigue representando contexto organizacional y operativo
  - el backfill inicial solo materializa relaciones con fuente verificable en runtime actual: `employee` y `shareholder_current_account_holder`
  - las lecturas portal filtran por `space_id` cuando existe tenant scope

## Delta 2026-04-18 TASK-454 materializa lifecyclestage HubSpot como bridge runtime en clients

- Greenhouse ya no debe tratar `lifecyclestage` como dato disponible solo por live read a HubSpot o por el projection CRM detallado.
- Runtime actualizado:
  - migración `20260418232659019_task-454-hubspot-company-lifecycle-stage.sql`
  - columnas `greenhouse_core.clients.lifecyclestage`, `lifecyclestage_source`, `lifecyclestage_updated_at`
  - helper `src/lib/hubspot/company-lifecycle-store.ts`
  - sync `src/lib/hubspot/sync-hubspot-company-lifecycle.ts`
  - cron `GET /api/cron/hubspot-company-lifecycle-sync`
- Contrato operativo:
  - la raíz canónica de company sigue repartida entre `organizations`, `spaces`, `client_profiles` y `greenhouse_crm.companies`
  - `greenhouse_core.clients` solo materializa un bridge client-scoped de compatibilidad para downstreams que aún operan por `client_id`
  - el sync respeta `manual_override`, puede dejar `unknown` cuando HubSpot no informa stage y usa `nubox_fallback` solo para rows legacy con evidencia económica runtime
  - el evento `crm.company.lifecyclestage_changed` existe para follow-ons del pipeline comercial, pero este corte no agrega consumer reactivo

## Delta 2026-04-21 TASK-536 extiende HubSpot Companies inbound al Party Lifecycle

- Greenhouse ya no debe esperar `closed-won` para conocer una contraparte comercial de HubSpot.
- Runtime nuevo:
  - helper `src/lib/hubspot/sync-hubspot-companies.ts`
  - cron `GET /api/cron/hubspot-companies-sync`
  - schedule Vercel `*/10 * * * *` incremental + `0 3 * * *` full (`?full=true`)
  - rollout inicial detrás de `GREENHOUSE_PARTY_LIFECYCLE_SYNC` (removido luego por `TASK-543`)
- Contrato operativo:
  - el source-of-work local es `greenhouse_crm.companies`, pero el selector unificado de parties puede suplementar con search live contra Cloud Run para cerrar gaps operativos del mirror
  - `scripts/sync-source-runtime-projections.ts` ya no filtra HubSpot companies sin `client_id` al proyectar `greenhouse_crm.companies`; el mirror local vuelve a incluir prospects puros
  - toda alta de party sigue pasando por `createPartyFromHubSpotCompany`
  - toda promoción posterior sigue pasando por `promoteParty`
  - si HubSpot mapea a `active_client`, el pipeline instancia `client_id` con `instantiateClientForParty` para respetar el invariante del lifecycle
  - el tracking queda en `greenhouse_sync.source_sync_runs` + `greenhouse_sync.source_sync_watermarks`
  - `provider_only`, `disqualified` y `churned` quedan protegidos contra degradación inbound

## Delta 2026-04-22 TASK-543 cierra el rollout legacy del Party Lifecycle

- `QuoteBuilderShell` ya no lee `session.user.featureFlags` para el selector de organizations: create mode usa el selector unificado como carril default.
- `src/lib/hubspot/sync-hubspot-companies.ts` y `GET /api/cron/hubspot-companies-sync` quedan default-on sin `GREENHOUSE_PARTY_LIFECYCLE_SYNC`.
- Se elimina `src/lib/commercial/party/feature-flags.ts`; no queda helper runtime para `GREENHOUSE_PARTY_SELECTOR_UNIFIED`.
- Regla importante para futuros cambios: no intentar “limpiar” `GET /api/commercial/organizations/[id]/contacts` ni `GET/POST /api/commercial/organizations/[id]/deals` como si fueran legacy; siguen siendo el contrato canónico downstream del `organizationId`.

# project_context.md

## Delta 2026-04-20 TASK-452 formaliza la foundation canónica de service attribution

- Greenhouse ya no debe tratar el P&L por servicio como inferencia oportunista desde readers de Space, quotes o commercial cost.
- Runtime nuevo:
  - migración `20260420123025804_task-452-service-attribution-foundation.sql`
  - tablas `greenhouse_serving.service_attribution_facts` y `greenhouse_serving.service_attribution_unresolved`
  - helper `src/lib/service-attribution/materialize.ts`
  - projection reactiva `src/lib/sync/projections/service-attribution.ts`
  - evento `accounting.service_attribution.period_materialized`
- Contrato operativo:
  - revenue/direct cost/labor-overhead por servicio se resuelven `evidence-first` desde quotation / contract / PO / HES / deal cuando existe anchor suficiente
  - `commercial_cost_attribution` sigue siendo truth layer `member + client + period`; el split a `service_id` ocurre downstream y deja `method`, `confidence` y `evidence_json`
  - los casos ambiguos no se fuerzan; quedan en `service_attribution_unresolved`
  - `TASK-146`, `TASK-147` y profitability per service ya tienen foundation factual, pero la UI client-facing aún no debe fabricar `service_economics` mientras no exista el read model derivado

## Delta 2026-04-19 TASK-483 crea runtime dedicado para commercial cost basis

- Greenhouse ya no debe tratar `ops-worker` como destino por defecto de toda materializacion financiera/comercial pesada.
- Runtime nuevo:
  - migración `20260419120945432_task-483-commercial-cost-worker-foundation.sql`
  - tabla `greenhouse_commercial.commercial_cost_basis_snapshots`
  - helpers `src/lib/commercial-cost-worker/contracts.ts`, `run-tracker.ts`, `materialize.ts`
  - route fallback `POST /api/internal/commercial-cost-basis/materialize`
  - servicio Cloud Run `services/commercial-cost-worker/`
- Contrato operativo:
  - `commercial-cost-worker` es la topologia objetivo para cost basis comercial por `people`, `tools` y `bundle`
  - `ops-worker` mantiene su endpoint de `cost-attribution` como lane existente/fallback, pero no debe absorber el resto del programa de cost basis
  - toda corrida del worker escribe a `greenhouse_sync.source_sync_runs` con `source_system='commercial_cost_worker'`
  - la trazabilidad por periodo y scope vive en `greenhouse_commercial.commercial_cost_basis_snapshots`
  - endpoints `roles`, `quote repricing` y `margin feedback` quedan reservados como contrato de futuro, no implementados en este corte
  - cualquier worker Cloud Run nuevo que reuse `src/lib/` sin auth interactiva debe replicar el patron esbuild + shims ESM/CJS

## Delta 2026-04-19 TASK-478 agrega snapshots finos de costo comercial por herramienta/proveedor

- Runtime nuevo:
  - migración `20260419132037430_task-478-tool-provider-cost-basis-snapshots.sql`
  - tabla `greenhouse_commercial.tool_provider_cost_basis_snapshots`
  - helpers `src/lib/commercial-cost-basis/tool-provider-cost-basis.ts` y `tool-provider-cost-basis-reader.ts`
- Contrato operativo:
  - `provider_tooling_snapshots` sigue resolviendo el agregado provider-level
  - `tool_provider_cost_basis_snapshots` es la capa fina reusable para pricing y supplier detail
  - `commercial-cost-worker` scope `tools` materializa ambas capas en batch
  - el pricing engine v2 intenta primero snapshot fino por `toolSku + period`; solo si no existe vuelve al costo crudo del catálogo

## Delta 2026-04-17 TASK-345 materializa el bridge canónico de quotations

- `greenhouse_commercial` ya existe físicamente con:
  - `product_catalog`
  - `quotations`
  - `quotation_versions`
  - `quotation_line_items`
- Regla operativa nueva:
  - writers HubSpot/Nubox siguen entrando por el lane Finance por compatibilidad
  - el anchor canónico se mantiene sincronizado desde esos mismos writers
  - las APIs Finance de quotes ya leen vía façade canónica, preservando el payload legacy del portal
- Regla de tenancy actualizada:
  - el bridge materializa `space_id` en quotations con resolución derivada desde `organization_id` / `client_id`
  - la resolución queda auditada en `space_resolution_source`
- Regla de cutover:
  - `greenhouse_finance.*` deja de ser la única base de lectura del lane
  - `commercial.quotation.*` sigue siendo naming objetivo de eventos, no publisher runtime activo

## Delta 2026-04-17 Los docs operativos de agentes ya exigen pensar acceso en views + entitlements

- `AGENTS.md`, `CLAUDE.md` y `docs/tasks/TASK_PROCESS.md` ya no deben permitir que una solution proposal trate acceso como si solo existieran `views`.
- Contrato operativo actualizado para agentes:
  - `routeGroups` siguen definiendo acceso broad por workspace o familia de rutas
  - `authorizedViews` / `view_code` siguen definiendo surface visible, menú, tabs, page guards y otras proyecciones de UI
  - `entitlements` (`module + capability + action + scope`) son la dirección canónica de autorización fina
  - `startup policy` sigue siendo un contrato separado para entrypoint/Home
- Al diseñar arquitectura, redactar tasks o proponer una implementación que toque acceso, el agente debe dejar explícito si el cambio vive en `views`, `entitlements`, `startup policy`, `routeGroups` o en varios planos a la vez.

## Delta 2026-04-17 TASK-404 materializa la gobernanza operativa de entitlements en Admin Center

- Greenhouse ya no depende solo de runtime code-versioned o ajustes manuales de base para operar permisos granulares.
- Runtime actualizado:
  - migración `20260417044741101_task-404-entitlements-governance.sql`
  - tablas `greenhouse_core.role_entitlement_defaults`, `greenhouse_core.user_entitlement_overrides`, `greenhouse_core.entitlement_governance_audit_log`
  - rutas `GET /api/admin/entitlements/governance`, `POST /api/admin/entitlements/roles`, `GET /api/admin/entitlements/users/[userId]`, `POST /api/admin/entitlements/users/[userId]/overrides`, `PATCH /api/admin/entitlements/users/[userId]/startup-policy`
  - surfaces `Admin Center > Gobernanza de acceso` y `Admin Center > Usuarios > Acceso`
- Contrato operativo:
  - el catálogo de entitlements sigue siendo code-versioned; la persistencia gobierna overlays, no redefine el catálogo base
  - la precedencia efectiva es `runtime base -> role defaults -> user overrides`
  - la startup policy sigue siendo un contrato separado de permisos y se resuelve vía `resolvePortalHomePolicy()`
  - toda mutación de gobernanza se registra con auditoría y evento outbox
  - las nuevas tablas y queries administrativas deben seguir aisladas por `space_id`; cuando no existe tenant real se usa el sentinel `__platform__`

## Delta 2026-04-16 HR leave corrige accrual Chile de primer año y deja self-heal de balances

- El runtime de vacaciones Chile interno ya no debe sembrar `15` días completos por default cuando la persona aún no cumple su primer aniversario laboral.
- Runtime actualizado:
  - migración `20260416094722775_task-416-hr-leave-chile-accrual-hardening.sql`
  - `src/lib/hr-core/leave-domain.ts`
  - `src/lib/hr-core/postgres-leave-store.ts`
- Contrato operativo:
  - `policy-vacation-chile` se interpreta como accrual desde `hire_date` durante el primer ciclo laboral y no como anual fijo inmediato
  - la resolución de policy ya no depende del orden de lectura; prioriza especificidad laboral real (`employment_type`, `pay_regime`, `contract_type`, `payroll_via`)
  - la resemilla de `leave_balances` debe autocorregir balances ya sembrados cuando cambia la policy o el cálculo, sin tocar `used_days`, `reserved_days` ni `adjustment_days`

## Delta 2026-04-16 TASK-415 formaliza HR leave admin operations con backfill y ledger de ajustes

- Greenhouse ya no limita la gestión de vacaciones al autoservicio del colaborador; HR/admin ahora tiene una superficie operativa explícita para saldos, backfills y correcciones auditables.
- Runtime actualizado:
  - migración `20260416083541945_task-415-hr-leave-admin-backfill-adjustments.sql`
  - rutas `POST /api/hr/core/leave/backfills`, `GET/POST /api/hr/core/leave/adjustments`, `POST /api/hr/core/leave/adjustments/[adjustmentId]/reverse`
  - ledger `greenhouse_hr.leave_balance_adjustments`
  - `src/lib/hr-core/postgres-leave-store.ts`
  - `src/views/greenhouse/hr-core/HrLeaveView.tsx`
- Contrato operativo:
  - un periodo ya tomado con fechas reales se registra como backfill retroactivo y no como ajuste opaco de saldo
  - una corrección sin fechas exactas vive en `leave_balance_adjustments` con `delta_days`, razón obligatoria, actor, metadata y reversal explícito
  - la explicación de política visible de leave ya no depende solo de moneda o `employment_type`; debe resolver con `contract_type + pay_regime + payroll_via + hire_date`
  - el caso Chile interno indefinido pagado en CLP queda preparado bajo esa resolución canónica, reutilizable por surfaces admin y self-service
  - las capabilities runtime para este dominio incluyen `hr.leave_balance`, `hr.leave_backfill` y `hr.leave_adjustment`

## Delta 2026-04-15 TASK-403 materializa el bridge real entre entitlements y Pulse/Nexa

- Greenhouse ya no depende solo de checks locales para gobernar la Home moderna.
- Runtime nuevo:
  - `src/config/entitlements-catalog.ts`
  - `src/lib/entitlements/types.ts`
  - `src/lib/entitlements/runtime.ts`
  - `src/lib/home/build-home-entitlements-context.ts`
- Contrato operativo:
  - la primera layer de entitlements es code-versioned y no requiere tablas nuevas
  - deriva `module + capability + action + scope` desde `roleCodes`, `routeGroups` y `authorizedViews`
  - `GET /api/home/snapshot` y `POST /api/home/nexa` ya consumen el mismo bridge, evitando drift entre Pulse y Nexa
  - Pulse ahora recibe `recommendedShortcuts` y `accessContext` como surface mínima visible para audiencias mixtas
  - `CAPABILITY_REGISTRY` sigue resolviendo módulos capability-based por `businessLines/serviceModules`; no fue reemplazado por este corte

## Delta 2026-04-15 Service SLA/SLO runtime foundation materialized per service

- `TASK-156` ya no vive solo como intención documental: existe una foundation runtime para gobernar `SLI -> SLO -> SLA` por servicio.
- Runtime nuevo:
  - migración `20260415233952871_task-156-service-sla-foundation.sql`
  - tablas `greenhouse_core.service_sla_definitions` y `greenhouse_serving.service_sla_compliance_snapshots`
  - route `GET/POST/PATCH/DELETE /api/agency/services/[serviceId]/sla?spaceId=...`
  - helper canónico `src/lib/agency/sla-compliance.ts`
  - store `src/lib/services/service-sla-store.ts`
  - proyección reactiva `src/lib/sync/projections/service-sla-compliance.ts`
- Contrato operativo:
  - cada definición SLA queda aislada por `service_id + space_id`
  - el serving status se materializa por definición con evidencia (`evidence_json`) y estados explícitos (`met`, `at_risk`, `breached`, `source_unavailable`)
  - los indicadores v1 soportados son `otd_pct`, `rpa_avg`, `ftr_pct`, `revision_rounds` y `ttm_days`
  - `response_hours` y `first_delivery_days` siguen diferidos hasta tener una fuente canónica materializada; no se deben estimar inline
  - las métricas se consumen desde `ICO Engine / BigQuery`; la UI nunca debe recalcularlas por su cuenta

## Delta 2026-04-15 Email runtime multi-runtime contract hardened

- El sistema de correo transaccional ya no debe asumir que `RESEND_API_KEY` vive solo como env directo del runtime web de Vercel.
- Runtime actualizado:
  - `src/lib/resend.ts` ahora resuelve `RESEND_API_KEY` mediante el helper canónico `Secret Manager -> env fallback -> unconfigured`
  - `services/ops-worker/deploy.sh` ahora acepta `RESEND_API_KEY_SECRET_REF` y propaga `EMAIL_FROM` al worker
- Contrato operativo:
  - el secreto canónico de Resend puede declararse como `RESEND_API_KEY_SECRET_REF`
  - `RESEND_API_KEY` sigue permitido como fallback legacy para runtimes que aún dependan de env directo
  - cualquier runtime que procese proyecciones reactivas de email debe recibir el mismo contrato (`RESEND_API_KEY_SECRET_REF` o fallback explícito equivalente), no una configuración manual divergente
  - `EMAIL_FROM` deja de asumirse implícito en Cloud Run y debe propagarse también al worker cuando ese runtime emite emails

## Delta 2026-04-15 Production ops-worker deploy contract aligned to actual shared infrastructure

- El deploy del `ops-worker` ya no debe asumir una topología `production` separada que hoy no existe en GCP.
- Runtime actualizado:
  - `services/ops-worker/deploy.sh` usa defaults por ambiente pero ahora permite overrides explícitos para `NEXTAUTH_SECRET_REF`, `PG_PASSWORD_REF`, `PG_INSTANCE` y `RESEND_API_KEY_SECRET_REF`
  - el deploy `ENV=production` quedó alineado al contrato real:
    - `NEXTAUTH_SECRET` desde `greenhouse-nextauth-secret-production`
    - `RESEND_API_KEY` desde `greenhouse-resend-api-key-production`
    - `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` sigue apuntando a `efeonce-group:us-east4:greenhouse-pg-dev`
    - `GREENHOUSE_POSTGRES_PASSWORD` sigue resolviendo `greenhouse-pg-dev-app-password`
- Contrato operativo:
  - hoy existe **un worker Cloud Run compartido** (`ops-worker`) y **una única instancia Cloud SQL** (`greenhouse-pg-dev`)
  - `ENV=production` no significa “infra PostgreSQL separada”; significa `auth/email/secrets` de producción sobre la infraestructura compartida vigente
  - si en el futuro aparece una instancia o password dedicada de producción, el deploy debe hacerse por override explícito o actualizando los defaults, no inventando refs inexistentes

## Delta 2026-04-13 Entitlements modulares quedan formalizados como dirección canónica de autorización

- Greenhouse ya tiene una arquitectura explícita para evolucionar desde `roleCodes + routeGroups + authorizedViews` hacia una capa de entitlements modular, action-based y scope-aware.
- Runtime documental nuevo:
  - `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- Contrato operativo:
  - `roleCodes` siguen definiendo identidad base
  - `routeGroups` siguen definiendo superficies broad de navegación
  - la autorización fina debe evolucionar hacia `module + capability + action + scope`
  - `authorizedViews` debe tratarse como proyección derivada de UI, no como source of truth final
  - `startupPolicy` debe mantenerse separada de permisos para soportar Home universal adaptativa

## Delta 2026-04-13 Superadmin y perfiles mixtos ya no deben derivar startup home desde route groups especializados

- `resolvePortalHomePath()` ya no debe usar la mera presencia de `routeGroups` especializados para decidir el startup home de perfiles administrativos multi-workspace.
- Runtime actualizado:
  - `efeonce_admin` y usuarios con surface administrativa priorizan `internal_default`
  - el startup home efectivo de superadmin vuelve a `/home`
- Contrato operativo:
  - `routeGroups` siguen definiendo superficies autorizadas
  - el startup home no debe colapsar automáticamente a HR, Finance o My cuando el usuario es multi-módulo o administrativo
  - `/home` pasa a ser la entrada canónica para perfiles mixtos mientras se formaliza la Home universal adaptativa

## Delta 2026-04-13 Root redirect del portal vuelve a respetar la policy canónica de Home

- El repo ya no debe depender de redirects globales de Next para decidir el entrypoint autenticado del portal.
- Runtime actualizado:
  - `next.config.ts` ya no fuerza `source: '/' -> destination: '/dashboard'`
  - el root vuelve a resolverse en `src/app/page.tsx` usando `session.user.portalHomePath`
- Contrato operativo:
  - `/` debe respetar la policy canónica de Home por sesión/rol/surface
  - `/dashboard` puede seguir existiendo como compatibilidad o feature route, pero no como redirect estructural global
  - cualquier cambio futuro de startup home debe pasar por la policy de `resolvePortalHomePath()` y el App Router, no por redirects opacos en `next.config.ts`

## Delta 2026-04-13 Management Accounting queda formalizado como capability distinta de contabilidad legal

- Greenhouse ya tiene una decision arquitectonica explicita para el siguiente modulo financiero a institucionalizar.
- Runtime documental nuevo:
  - `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
  - `docs/README.md`
- Contrato operativo:
  - el modulo correcto a profundizar no es `financial accounting` legal, sino `Management Accounting`
  - su lectura funcional recomendada es `contabilidad de costos`
  - su surface product recomendada sigue bajo `Finance > Economia operativa`
  - la capability debe crecer sobre `Finance + Cost Intelligence`, no como modulo paralelo desconectado
  - para considerarse enterprise debe contemplar no solo `actual`, sino tambien `budget`, `variance`, `forecast`, `fully-loaded cost`, `P&L` por BU, cierre gobernado, explainability, overrides, RBAC, observabilidad, data quality y runbooks operativos
  - `factoring` y otros financial costs deben entrar al margen real como parte del actual consolidado, no quedar aislados como lanes de tesoreria sin impacto explicable en management accounting

## Delta 2026-04-13 Task lifecycle hardening para cierres reales

- El protocolo de tasks ya no considera "terminada" una task solo porque la implementación quedó lista.
- Runtime documental actualizado:
  - `docs/tasks/TASK_TEMPLATE.md`
  - `docs/tasks/TASK_PROCESS.md`
  - `docs/tasks/README.md`
  - `AGENTS.md`
  - `CLAUDE.md`
- Contrato operativo nuevo:
  - al tomar una task, el agente debe moverla a `docs/tasks/in-progress/` y sincronizar `Lifecycle: in-progress`
  - al cerrarla, debe cambiar `Lifecycle` a `complete`, moverla a `docs/tasks/complete/` y sincronizar `docs/tasks/README.md`
  - una task no puede reportarse como cerrada al usuario mientras el archivo siga en `in-progress/` o con `Lifecycle: in-progress`

## Delta 2026-04-13 Structured Context Layer ya tiene foundation runtime en repo

- `TASK-380` ya materializó la base runtime de la Structured Context Layer dentro del repo.
- Runtime nuevo:
  - migración `20260413113902271_structured-context-layer-foundation.sql`
  - módulo `src/lib/structured-context/`
  - piloto de replay context en `src/lib/sync/reactive-run-tracker.ts`
- Contrato operativo nuevo:
  - el schema sidecar ya no es solo propuesta arquitectónica; existe una foundation concreta para documentos, versiones y quarantine
  - el primer piloto de lectura/escritura sobre `source_sync_runs` deja trazabilidad reutilizable para replay reactivo
  - la validación del runtime nuevo se cerró con tests unitarios, eslint dirigido y `pnpm build`
- Limitación operativa detectada:
  - `pnpm pg:connect:migrate` contra el shared dev DB puede fallar si la rama local no trae una migración ya aplicada en esa base por otro frente de trabajo; el caso real observado fue `20260413105218813_reactive-pipeline-v2-circuit-breaker` de `TASK-379`

## Delta 2026-04-13 Multi-agent worktree operating model formalizado

- Greenhouse ya tiene un modelo operativo explícito para trabajo paralelo entre agentes sobre el mismo repo sin compartir el mismo checkout activo.
- Runtime documental nuevo:
  - `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`
- Contrato operativo:
  - si un agente ya está trabajando en el workspace actual, otro agente no debe cambiarle la rama
  - el checkout actual queda reservado para el agente owner de esa sesión
  - los agentes adicionales deben abrir `git worktree` propio en carpeta separada y rama separada
  - la sincronización con `develop` o `main` ocurre desde el worktree del propio agente, no desde el checkout ajeno
- convención recomendada:
  - carpetas: `<repo>-<agent>-<branch-slug>`
  - ramas: seguir `feature/*`, `fix/*`, `hotfix/*`, `docs/*` o `task/TASK-###-*`
- reversibilidad:
  - el esquema se puede desmontar eliminando worktrees cuando ya no hagan falta
- referencia corta en `AGENTS.md`:
  - coordinación entre agentes y branching ya apuntan al operating model nuevo

## Delta 2026-06-12 WIP untracked en worktree compartido queda protegido

- Lección operativa TASK-1085/TASK-1086: `git stash -u` sobre rutas nuevas de otro agente en el checkout compartido hace desaparecer su WIP del filesystem aunque sea reversible; eso rompe su loop.
- Contrato vigente: archivos `untracked`/unstaged que no pertenecen a tu task se tratan como estado vivo de otro agente/operador. No se stashean, limpian, restauran ni mueven para pasar hooks.
- Si un push propio queda bloqueado por WIP ajeno, coordinar con el owner, trabajar desde un worktree aislado o pedir autorización explícita para un bypass de hook ya verificado. Fuente canónica: `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`.

## Delta 2026-04-13 Structured Context Layer formalizada como foundation arquitectónica

- Greenhouse ahora tiene una decisión arquitectónica explícita para usar JSONB de forma gobernada sin degradar el modelo relacional.
- Runtime documental nuevo:
  - `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`
  - `docs/tasks/to-do/TASK-380-structured-context-layer-foundation.md`
- Contrato operativo:
  - la capa se llama `Structured Context Layer`
  - vive conceptualmente en el schema `greenhouse_context`
  - funciona como sidecar del modelo canónico, no como reemplazo de tablas relacionales
  - todo documento debe ser tenant-safe, tipado por `context_kind` y versionado por `schema_version`
  - se orienta a integraciones, replay reactivo, trazabilidad operativa y memoria estructurada para trabajo asistido por agentes
  - heurística explícita para agentes:
    - verdad canónica de negocio -> relacional
    - contexto estructurado reusable en PostgreSQL -> `JSONB`
    - representación cruda exacta sin semántica de DB -> `JSON` solo como excepción
- criterio de modelado:
  - si un dato se vuelve transaccional, consultable de forma intensiva o contractual para negocio, debe promocionarse a tabla relacional
  - JSONB queda reservado para contexto flexible, payloads normalizados, snapshots controlados y bundles de auditoría
- criterios enterprise añadidos:
  - la capa debe contemplar clasificación de datos, redacción, retention/lifecycle, access scope, idempotencia y límites de tamaño
  - secretos, tokens, cookies, credenciales y blobs binarios/base64 grandes no pertenecen a esta capa
- siguiente paso planificado:
  - `TASK-380` materializa schema, runtime tipado, taxonomía inicial y primeros pilotos

## Delta 2026-04-13 Lane formal de mini-tasks para mejoras chicas planificadas

- Greenhouse ya tiene una lane documental intermedia para cambios chicos que no deben ejecutarse "al vuelo" pero tampoco justifican una `TASK-###` completa.
- Runtime documental nuevo:
  - `docs/mini-tasks/README.md`
  - `docs/mini-tasks/MINI_TASK_TEMPLATE.md`
  - `docs/mini-tasks/MINI_TASK_ID_REGISTRY.md`
  - `docs/operations/MINI_TASK_OPERATING_MODEL_V1.md`
- Contrato operativo:
  - las mini-tasks usan `MINI-###`
  - viven en `docs/mini-tasks/{to-do,in-progress,complete}`
  - capturan mejoras chicas, locales y planificadas
  - si el hallazgo es una falla real de runtime, sigue siendo `ISSUE-###`
  - si el cambio crece de alcance o toca arquitectura/shared runtime, debe promoverse a `TASK-###`
- Primer brief sembrado:
  - `docs/mini-tasks/to-do/MINI-001-po-client-contact-selector.md`

## Delta 2026-04-11 Local Next build isolation para agentes y procesos concurrentes

- `pnpm build` ya no reutiliza `.next` por defecto en local/agent runtime fuera de Vercel y CI.
- Runtime nuevo:
  - helper `scripts/next-dist-dir.mjs`
  - `scripts/run-next-build.mjs` ahora genera un `distDir` aislado bajo `.next-local/build-<timestamp>-<pid>`
  - `scripts/run-next-start.mjs` resuelve el ultimo build exitoso desde `.next-build-dir`
  - `.next-build-meta.json` deja metadata minima del ultimo build exitoso
- Contrato operativo:
  - el puntero `.next-build-dir` ya no se escribe antes del build; solo se actualiza cuando el build termina bien
  - el output aislado evita locks y corrupcion de `.next` cuando Codex, Claude u otros procesos compilan el mismo repo en paralelo
  - se conservan solo algunos builds recientes bajo `.next-local/` para evitar crecimiento indefinido
- Rollback:
  - temporal: correr `GREENHOUSE_FORCE_SHARED_NEXT_DIST=true pnpm build`
  - hard rollback: revertir `scripts/next-dist-dir.mjs`, `scripts/run-next-build.mjs` y `scripts/run-next-start.mjs`

## Delta 2026-04-11 Surface read-only endurecida para sister platforms

- Greenhouse ya tiene un carril read-only endurecido para sister platforms bajo `/api/integrations/v1/sister-platforms/*`.
- Runtime nuevo:
  - migracion `20260411201917370_sister-platform-read-surface-hardening.sql`
  - tabla `greenhouse_core.sister_platform_consumers`
  - tabla `greenhouse_core.sister_platform_request_logs`
  - secuencia `greenhouse_core.seq_sister_platform_consumer_public_id`
  - helper `src/lib/sister-platforms/external-auth.ts`
  - rutas:
    - `/api/integrations/v1/sister-platforms/context`
    - `/api/integrations/v1/sister-platforms/catalog/capabilities`
    - `/api/integrations/v1/sister-platforms/readiness`
- Contrato operativo:
  - la credencial deja de ser un token compartido para este carril y pasa a ser por consumer
  - toda lectura sister-platform exige `externalScopeType` + `externalScopeId`
  - toda lectura sister-platform resuelve binding canonico activo antes de responder
  - toda lectura sister-platform deja request logging y aplica rate limiting
- Estado de infraestructura:
  - el código y la migración existen en repo
  - la migración quedó aplicada el 2026-04-11 vía `pnpm pg:connect:migrate`
  - `src/types/db.d.ts` quedó regenerado en el mismo lote

## Delta 2026-04-25 API Platform Foundation runtime ya existe

- Greenhouse ya no está solo en fase documental para `API platform`.
- Runtime nuevo:
  - `src/lib/api-platform/core/*`
  - `src/lib/api-platform/resources/*`
  - `src/app/api/platform/ecosystem/context/route.ts`
  - `src/app/api/platform/ecosystem/organizations/route.ts`
  - `src/app/api/platform/ecosystem/organizations/[id]/route.ts`
  - `src/app/api/platform/ecosystem/capabilities/route.ts`
  - `src/app/api/platform/ecosystem/integration-readiness/route.ts`
- Contrato operativo:
  - el lane nuevo es aditivo y read-only
  - el auth ecosystem sigue siendo binding-aware y consumer-scoped
  - el envelope ahora es uniforme (`requestId`, `servedAt`, `version`, `data`, `meta` / `errors`)
  - header de version vigente: `x-greenhouse-api-version`
  - version default inicial: `2026-04-25`
  - el scope canónico para isolation ya no se describe como “siempre `space_id`”; la lane ecosystem resuelve `organization`, `client`, `space` o `internal` según binding
- Convivencia explícita:
  - `/api/integrations/v1/*` y `/api/integrations/v1/sister-platforms/*` siguen vivos como lanes legacy/transicionales
  - `capabilities` en `api/platform/ecosystem` significa catálogo/asignación de tenant capabilities, no runtime data de módulos UI
  - `integration-readiness` significa health/readiness de integraciones; no readiness transversal genérica de toda la plataforma

## Delta 2026-04-11 Seed operativo para consumer piloto Kortex

- Greenhouse ya tiene una utilidad operativa para provisionar el primer consumer Kortex y su binding piloto sin SQL manual.
- Runtime nuevo:
  - helper `src/lib/sister-platforms/consumers.ts`
  - script `scripts/seed-kortex-sister-platform-pilot.ts`
  - comando `pnpm seed:kortex-pilot`
- Contrato operativo:
  - el seed crea o actualiza el consumer dedicado `Kortex Operator Console`
  - el seed crea o actualiza el binding `kortex` con `external_scope_type='portal'`
  - el token solo se imprime cuando se crea o rota; no se reexpone en ejecuciones normales
  - defaults seguros: binding `draft`, consumer `active`, scopes permitidos `client,space`

## Delta 2026-04-11 Foundation runtime para sister-platform bindings

- Greenhouse ya tiene una foundation runtime explícita para bindear sister platforms con scopes internos.
- Runtime nuevo:
  - tabla `greenhouse_core.sister_platform_bindings`
  - secuencia `greenhouse_core.seq_sister_platform_binding_public_id`
  - helper `src/lib/sister-platforms/bindings.ts`
  - rutas admin `/api/admin/integrations/sister-platform-bindings*`
  - visibilidad mínima en `/admin/integrations`
- Contrato operativo:
  - el binding soporta scopes `organization`, `client`, `space` e `internal`
  - el binding soporta lifecycle `draft`, `active`, `suspended`, `deprecated`
  - el binding publica eventos outbox propios para consumers posteriores
- Estado de infraestructura:
  - el código y la migración existen en repo
  - la migración quedó aplicada el 2026-04-11 vía `pnpm pg:connect:migrate`
  - `src/types/db.d.ts` quedó regenerado en el mismo lote

## Delta 2026-04-11 Contrato canónico para sister platforms del ecosistema

- Greenhouse ya no debe tratar plataformas hermanas como consumers informales del portal.
- Nuevas fuentes canónicas:
  - `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
  - `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- Contrato operativo nuevo:
  - Greenhouse y las sister platforms se integran como `peer systems`
  - runtime, DB, secrets e IAM compartidos no son el default
  - la foundation reusable se separa en:
    - institutional layer reusable
    - tenancy binding cross-platform
    - read-only external surfaces
    - MCP/agent adapter downstream
- Estado actual:
  - `Kortex` es la primera sister platform activa bajo este marco
  - `Verk` queda prevista como future sister platform, pero sin anexo propio hasta tener baseline real equivalente
  - el backlog nuevo `TASK-374` a `TASK-377` coordina la bajada desde contrato arquitectónico hacia foundation y primer consumer

## Delta 2026-04-11 Skill local para microinteracciones UI/UX en Greenhouse

- Nueva skill de Codex disponible:
  - `.codex/skills/greenhouse-microinteractions-auditor/SKILL.md`
- Propósito:
  - auditar e implementar microinteracciones de Greenhouse sobre el stack real del portal
  - cubrir motion, reduced motion, loading, empty, validation, hover/focus, toasts, alerts y live regions
- Contrato operativo:
  - reutiliza wrappers y primitives existentes (`FramerMotion`, `Lottie`, `useReducedMotion`, `AnimatedCounter`, `EmptyState`, `react-toastify`, MUI feedback states)
  - usa investigación externa canónica en `references/microinteraction-playbook.md` sin inflar el prompt base de la skill
  - sirve como puente entre `greenhouse-agent`, `greenhouse-ui-orchestrator` y `greenhouse-ux-content-accessibility` cuando el problema es calidad de interacción, no solo layout o copy
- Metadata UI/discovery agregada:
  - `.codex/skills/greenhouse-microinteractions-auditor/agents/openai.yaml`

## Delta 2026-04-27 Skill local para diseño digital de assets de marca

- Nueva skill de Codex disponible:
  - `.codex/skills/greenhouse-digital-brand-asset-designer/SKILL.md`
- Proposito:
  - guiar vectorizacion, limpieza, variantes positivas/negativas y QA visual de logos/isotipos usados por Greenhouse
  - evitar dibujos manuales aproximados de marcas y obligar a partir de fuentes oficiales o curadas con manifest auditable
- Contrato operativo:
  - usar `pnpm logos:payment:vectorize` + VTracer/Pillow para PNGs curados de alta resolucion
  - validar matriz `full-positive`, `full-negative`, `mark-positive`, `mark-negative`
  - renderizar SVG a PNG para inspeccion humana y para auditoria Gemini cuando aplique
  - mantener `full-positive` como fuente canonica del entry y `mark-positive` solo como `compactLogo`
- Metadata UI/discovery agregada:
  - `.codex/skills/greenhouse-digital-brand-asset-designer/agents/openai.yaml`

## Delta 2026-04-11 Equipo asignado ya tiene arquitectura canónica enterprise

- Greenhouse ya no debe pensar la surface cliente `/equipo` como roster simple.
- Regla operativa nueva:
  - `Equipo asignado` es la capability enterprise cliente-facing para visibilidad de talento contratado
  - su root de lectura es `Organization / Space + client_team_assignments`, no una tabla mutante nueva
  - combina tres capas:
    - assignments operativos
    - capability profile `client-safe`
    - health/capacity signals resumidas
- Alcance semántico nuevo:
  - composición del equipo
  - FTE contratada / asignada / activa
  - seniority, skills, certificaciones, idiomas
  - saturación y team health resumidas
  - lectura consolidada por cliente y drilldown por `space`
- Contrato de sinergia explícito:
  - `Equipo asignado` compone sobre `assignments`, `client-safe profiles`, `Team Capacity`, `Delivery/ICO`, `Organization/Space` e `Identity Access`
  - no absorbe ownership de `HRIS`, `Hiring / ATS`, `Staff Augmentation` admin, `Finance` ni `Payroll`
- Contrato UI nuevo:
  - la surface debe resolverse como `executive summary + operational drilldown`
  - el primer fold se compone de hero ejecutivo, KPI strip y roster inteligente
  - el detalle individual recomendado es `detail drawer` cliente-safe, no tabla admin ni HR profile externo
  - el modelo reusable queda dividido en:
    - `shared primitives`
    - `shared building blocks`
    - `module-local composites`
  - solo se promueve a `shared` lo que demuestre reuso cross-surface real
- Fuente canónica nueva:
  - `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`

## Delta 2026-04-11 Deel compensation now treats connectivity as canonical recurring allowance

- `Payroll > Compensaciones` ya no debe ocultar la conectividad para contratos gestionados por Deel.
- Regla operativa nueva:
  - `remoteAllowance` sigue siendo el haber recurrente canónico para conectividad
  - aplica a contratos internos elegibles y también a `contractor` / `eor` con `payroll_via = deel`
  - Greenhouse debe incluir esa conectividad en el bruto/neto referencial del registro Deel, aunque Deel siga siendo owner del pago final y compliance
- Consecuencia:
  - el drawer de compensación muestra `Bono conectividad` para contratos Deel
  - el motor de payroll ya no obliga a modelar conectividad Deel como `bono fijo` libre
  - la policy quedó centralizada en `src/types/hr-contracts.ts`

## Delta 2026-04-11 Canonical talent taxonomy materialized in PostgreSQL (TASK-315)

- `greenhouse_core` now owns the full professional taxonomy: `tool_catalog` + `member_tools` (29 seeded tools, 8 categories), `member_languages`, and `members.headline`. Combined with prior `skill_catalog`/`member_skills` (TASK-157) and `member_certifications` (TASK-313), BigQuery `member_profiles.skills[]`/`tools[]`/`aiSuites[]` are superseded for runtime reads.

## Delta 2026-04-11 ATS / Hiring ya tiene arquitectura canónica como capa de fulfillment

- Greenhouse ya no debe pensar `ATS` como un módulo de recruitment corporativo genérico ni como apéndice de `Staff Aug`.
- Regla operativa nueva:
  - el nombre arquitectónico preferido del dominio es `Hiring / ATS`
  - `TalentDemand` es el objeto raíz de demanda
  - `HiringApplication` es la unidad transaccional del pipeline
  - `HiringHandoff` es el contrato explícito de salida hacia:
    - `member` / onboarding HR
    - `assignment`
    - `placement`
    - lanes contractuales de contractor/partner
- Alcance semántico nuevo:
  - demanda interna y de cliente
  - trabajo `on_demand` y `on_going`
  - pool mixto de talento: internos, bench, externos, contractors y partners
- Regla de diseño:
  - el kanban del ATS debe mover `applications`, no personas sueltas ni openings sueltos
  - la landing pública de vacantes debe publicar openings derivados del mismo dominio `Hiring / ATS`, no otro pipeline paralelo
- Fuente canónica nueva:
  - `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`

## Delta 2026-04-11 Person vs Legal Entity relationships formalized

- Greenhouse ya deja explícito que una persona no debe modelarse como `user especial` ni como simple extensión de `member` cuando el caso es societario, contractual o financiero.
- Regla operativa nueva:
  - la raíz humana canónica sigue siendo `identity_profile`
  - la contraparte jurídica/económica primaria debe leerse como `legal entity`
  - `user`, `member`, `space` y `organization_type` pueden seguir actuando como facetas/scopes de runtime, pero no como sustitutos de la relación legal base
- Aplicación directa:
  - `Finance > Cuenta accionista` debe entenderse como instrumento derivado de `person ↔ legal entity`
  - el sueldo empresarial debe distinguirse conceptualmente de la CCA
  - `Payroll` sigue materializando nómina formal sobre `member_id`, pero ya no debe leerse como única raíz semántica de toda compensación ejecutiva
- Fuente canónica nueva:
  - `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`

## Delta 2026-04-11 Semántica canónica para estructura, equipos y capacidad extendida

- La arquitectura viva ya explicita que Greenhouse no debe tratar `equipo` como un concepto único.
- Quedan separadas cuatro capas de relación:
  - `estructura interna` — departamentos, supervisoría formal, subárbol
  - `equipos operativos` — squads/cuentas/clientes que mezclan áreas
  - `trabajo puntual` — proyectos e iniciativas concretas
  - `capacidad extendida` — freelancers/contractors/on-demand externos a la estructura formal
- Regla operativa nueva:
  - `departments` + `reporting_lines` describen solo estructura
  - `assignments` y roster operativo describen equipos de entrega
  - `staff_augmentation` y talento externo siguen siendo relación operativa, no organigrama ni adscripción estructural
  - surfaces como `Mi Perfil`, `People`, `Mi equipo`, `Org Chart` y directorios internos deben dejar explícita esa diferencia
- Consecuencia de diseño:
  - `Mi Perfil > Equipos` no debe usarse como sinónimo de departamentos liderados
  - `Colegas` no debe resolverse como una bolsa org-wide si el caso de uso real es `mi área`, `mis equipos` o `capacidad extendida`
- Fuente canónica:
  - `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`

## Delta 2026-04-11 Organigrama dual: estructura + liderazgo

- `HR > Organigrama` ya no se limita a una sola lectura del árbol:
  - `structure` mantiene departamentos como nodos y personas como adscripción visible
  - `leaders` agrupa por personas líderes y deja departamentos asociados como metadata del nodo
- Regla operativa nueva:
  - la vista por liderazgo no redefine la estructura canónica ni reemplaza `departments.parent_department_id`
  - la supervisoría entre líderes se usa solo para esa lectura alternativa y no debe contaminar el payload estructural
  - `Mi equipo` y `Aprobaciones` deben ser descubribles también para perfiles broad HR/admin con `memberId`, no solo para supervisor-limited

## Delta 2026-04-10 Organigrama structural-first over departments

- `HR > Organigrama` ya no debe entenderse como una vista visual de `reporting_lines`.
- Regla operativa nueva:
  - el organigrama estructural usa `greenhouse_core.departments.parent_department_id` como eje del árbol
  - los miembros se cuelgan de `greenhouse_core.members.department_id`
  - `departments.head_member_id` identifica liderazgo de área y además sincroniza la adscripción del responsable en el write lane de departamentos
  - si una persona todavía no tiene adscripción estructural directa, el grafo la mantiene dentro del área visible más cercana como `Contexto heredado`, sin convertir la supervisoría formal en edge estructural
  - si una persona lidera un área, el organigrama la representa dentro del nodo del departamento y no como hija-persona del mismo departamento
  - la supervisoría formal sigue visible como metadata del miembro, pero no define las aristas del grafo estructural
- Acceso:
  - broad HR/admin sigue viendo la estructura completa
  - supervisoría limitada sigue viendo solo las personas y áreas visibles de su scope, con ancestros estructurales incluidos para no romper contexto

## Delta 2026-04-10 Org chart explorer materialized on canonical reporting hierarchy

- La capability de jerarquía ya no se agota en la superficie admin `/hr/hierarchy`; ahora tiene una surface visual de lectura:
  - `/hr/org-chart`
  - `GET /api/hr/core/org-chart`
- Regla operativa nueva:
  - `HR > Organigrama` consume la jerarquía canónica ya materializada en `greenhouse_core.reporting_lines`
  - el explorer respeta el mismo modelo broad HR/admin vs supervisor subtree-aware
  - `HR > Jerarquía` sigue siendo la surface de cambios; el organigrama no habilita edición mutante
- Stack visual materializado:
  - `@xyflow/react`
  - `dagre`

## Delta 2026-04-10 Supervisor workspace materialized on top of subtree scope

- La capability de supervisor ya no vive solo como policy de acceso; ahora tiene surface operativa materializada:
  - `/hr` funciona como landing supervisor-aware
    - `hr_manager` / `hr_payroll` / `efeonce_admin` siguen viendo el dashboard HR amplio
    - un supervisor limitado ahora ve su workspace `Mi equipo`
  - nuevas routes:
    - `/hr/team`
    - `/hr/approvals`
  - nuevo handler agregado:
    - `GET /api/hr/core/supervisor-workspace`
- Regla operativa nueva:
  - el workspace de supervisor reutiliza la capability existente de `reporting_lines` + `approval_delegate` + `workflow_approval_snapshots`
  - no introduce un role code nuevo ni un modelo paralelo de approvals
  - `People` sigue siendo el drilldown canónico; la nueva surface solo compone señal operativa, cola y ausencias del subárbol visible
- Alcance actual:
  - approvals materializadas solo para `leave`
  - el calendario del workspace usa las ausencias ya visibles por scope
  - HR/admin conserva su experiencia amplia en `/hr` y `/hr/leave`

## Delta 2026-04-10 Shared icon foundation: Tabler + Flaticon + BrandLogo

- El portal tiene ahora una foundation compartida de iconografía en tres capas:
  - `tabler-*` sigue siendo la base semántica de producto para navegación, estados, CRUD y surfaces operativas
  - `@flaticon/flaticon-uicons` entra como fuente complementaria para brands y algunos tokens de talento/perfil
  - `BrandLogo` sigue siendo la primitive para logos reales de marca y ahora también cubre redes profesionales comunes
- Nuevo primitive reusable:
  - `src/components/greenhouse/GhIcon.tsx`
  - registry asociado: `src/components/greenhouse/gh-icon-registry.ts`
- Regla operativa nueva:
  - no introducir clases `fi-*` o `tabler-*` al voleo en surfaces nuevas cuando el caso caiga en la semántica ya modelada por `GhIcon`
  - `Tabler` para semántica de producto
  - `BrandLogo` para marca/logo real
  - `Flaticon` solo como fuente suplementaria, cargada selectivamente en `src/app/layout.tsx`
- Import selectivo activo:
  - `@flaticon/flaticon-uicons/css/brands/all.css`
  - `@flaticon/flaticon-uicons/css/regular/rounded.css`

## Delta 2026-04-10 GCP auth hardening for local vs Vercel runtime

- `Workload Identity Federation` sigue siendo el mecanismo preferido para runtimes reales en `Vercel`, pero deja de activarse en local solo porque exista un `VERCEL_OIDC_TOKEN` persistido en `.env*`.
- Regla operativa nueva:
  - `VERCEL_OIDC_TOKEN` es efímero y runtime-only
  - no debe guardarse en `.env.local`, `.env.production.local` ni archivos equivalentes
  - local/CLI/migraciones deben usar `GOOGLE_APPLICATION_CREDENTIALS_JSON(_BASE64)` o `ADC`, no un token OIDC reciclado
- Nuevo guardrail:
  - `pnpm gcp:doctor` audita los `.env*` operativos del repo y falla si detecta drift de `VERCEL_OIDC_TOKEN` o una resolución inconsistente de `WIF`
- Páginas admin que leen `getAdminAccessOverview()` quedaron dinámicas para evitar evaluación estática de una vista dependiente de credenciales runtime.

## Delta 2026-04-10 Agency skills matrix + staffing engine

- Agency ya tiene matriz canónica de skills en PostgreSQL:
  - `greenhouse_core.skill_catalog`
  - `greenhouse_core.member_skills`
  - `greenhouse_core.service_skill_requirements`
- Endpoints nuevos:
  - `GET /api/agency/skills`
  - `GET/PATCH /api/agency/skills/members/[memberId]`
  - `GET/PATCH /api/agency/skills/services/[serviceId]`
  - `GET /api/agency/staffing`
- Regla operativa vigente:
  - el acceso runtime a skills de miembro y requisitos de servicio se autoriza con `spaceId`
  - el primer corte del staffing engine evalúa cobertura y gaps sobre el equipo ya asignado al `space_id` canónico, reutilizando `member_capacity_economics` para disponibilidad
  - `member_profiles.skills` en HR Core y arrays de Staff Aug siguen siendo suplementarios, no source of truth
- Consumer visible:
  - `Space 360 > Team` ahora muestra coverage de skills, chips por persona y gaps/recomendaciones por servicio

## Delta 2026-04-09 Claude skill for creating Codex skills

- Nueva skill local de Claude:
  - `.claude/skills/codex-skill-creator/skill.md`
- Cobertura:
  - creación y mantenimiento de skills de Codex bajo `.codex/skills/`
  - estructura mínima con `SKILL.md`
  - criterio para agregar `agents/openai.yaml`
  - decisión de cuándo usar `references/`, `scripts/` y `assets/`

## Delta 2026-04-09 Claude skill creator available for Codex

- Nueva skill local de Codex:
  - `.codex/skills/claude-skill-creator/SKILL.md`
- Fuente normativa usada para construirla:
  - `https://code.claude.com/docs/en/skills`
- Contrato encapsulado:
  - Claude Skills canónicas viven en `.claude/skills/<skill-name>/SKILL.md`
  - `SKILL.md` lleva frontmatter + markdown body
  - supporting files son válidos y recomendados para mantener el archivo principal corto
- Drift local explicitado:
  - el repo todavía tiene ejemplos legacy en `.claude/skills/*/skill.md`
  - la skill enseña a reconciliar ese drift explícitamente en vez de seguir replicándolo sin revisión
- Documentación operativa derivada:
  - `AGENTS.md`, `CLAUDE.md` y `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` ya explicitan también cómo Claude debe crear skills de Codex dentro de este repo

## Delta 2026-04-09 Claude secret hygiene skill closed in repo

- Claude ya tiene la skill local:
  - `.claude/skills/greenhouse-secret-hygiene/skill.md`
- Decisión de integración:
  - se preserva la skill de Claude tal como fue creada por Claude
  - no se reescribe ese archivo desde Codex
- Estado del backlog:
  - `TASK-305` ya quedó cerrada en `docs/tasks/complete/`

## Delta 2026-04-09 Secret hygiene skill available for Codex

- Nueva skill local de Codex:
  - `.codex/skills/greenhouse-secret-hygiene/SKILL.md`
- Cobertura:
  - GCP Secret Manager
  - `*_SECRET_REF`
  - auth (`NEXTAUTH_SECRET`, OAuth client secrets)
  - webhooks
  - PostgreSQL passwords
  - provider tokens
- Regla operativa encapsulada en la skill:
  - auditoría `read-only` por defecto
  - no exponer secretos crudos
  - verificar el consumer real tras cada corrección o rotación
- Follow-on ya resuelto:
  - `docs/tasks/complete/TASK-305-claude-secret-hygiene-skill.md`

## Delta 2026-04-09 Secret Manager payload hygiene enforced after ISSUE-032

- `src/lib/secrets/secret-manager.ts` ahora sanea tanto payloads leídos desde GCP Secret Manager como fallbacks por env:
  - `trim()`
  - remueve comillas envolventes simples o dobles
  - remueve sufijos literales `\\n` / `\\r`
- El hardening es defensa en profundidad. La fuente canónica sigue siendo publicar secretos como scalar crudo, no como string serializado.
- Secretos saneados en origen con nueva versión limpia en GCP:
  - `greenhouse-google-client-secret-shared`
  - `greenhouse-nextauth-secret-staging`
  - `greenhouse-nextauth-secret-production`
  - `webhook-notifications-secret`
- Auditoría posterior: los secretos runtime críticos referenciados por `*_SECRET_REF` quedaron limpios en origen.
- Regla operativa nueva:
  - usar `printf %s "$VALOR" | gcloud secrets versions add <secret-id> --data-file=-`
  - no publicar secretos con comillas, `\\n` literal o whitespace residual
  - después de cada rotación validar el consumer real del secreto en el ambiente afectado
- Nota crítica:
  - rotar `NEXTAUTH_SECRET` puede invalidar sesiones activas y forzar re-login
  - no tratarlo como cambio inocuo de infraestructura
- Referencia del incidente: `docs/issues/resolved/ISSUE-032-secret-manager-payload-contamination-breaks-runtime-secrets.md`

## Delta 2026-04-08 Vercel Preview auth hardening

- Se confirmó que `Preview` puede quedar con drift de env respecto de local/shared y faltar al menos `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GCP_PROJECT` o `GOOGLE_APPLICATION_CREDENTIALS_JSON`.
- `src/lib/auth.ts` ya no debe resolver `NextAuthOptions` en import-time. La resolución canónica ahora es lazy via `getAuthOptions()` y `getServerAuthSession()`.
- Si `NEXTAUTH_SECRET` falta en `Preview`, el portal ya no debe romper el build:
  - server components y route handlers degradan a sesión `null`
  - `src/app/api/auth/[...nextauth]/route.ts` responde `503` controlado en vez de abortar `page-data collection`
- Regla operativa vigente:
  - el hardening evita que el deployment quede rojo por drift
  - pero un Preview que necesite login funcional sigue debiendo tener `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GCP_PROJECT` y credenciales Google válidas
- Cierre operativo 2026-04-08:
  - el baseline genérico de `Preview` ya quedó alineado en Vercel para ramas nuevas
  - auth, Google/Azure, PostgreSQL, media buckets y `AGENT_AUTH_*` no deben seguir dependiendo de overrides por branch como baseline compartido
  - validación runtime: un preview fresco ya responde `200` en `/api/auth/session` y `200` en `/api/auth/agent-session`
- Regla operativa nueva:
  - `Preview` debe tratarse siempre como baseline genérico para toda rama distinta de `develop` y `main`
  - `Preview (develop)` no puede seguir funcionando como source of truth del resto de previews
  - los overrides por branch quedan solo como excepción temporal y documentada
- Issue resuelto de referencia: `docs/issues/resolved/ISSUE-031-vercel-preview-build-fails-missing-nextauth-secret.md`

## Delta 2026-04-07 Account Complete 360 — serving federado por facetas (TASK-274)

### Account Complete 360 (TASK-274)
- Resolver federado analogo a Person 360, 9 facetas: identity, spaces, team, economics, delivery, finance, crm, services, staffAug
- API: `GET /api/organization/[id]/360`, `POST /api/organizations/360`
- Serving layer puro sobre tablas existentes, sin migraciones
- `getAccountComplete360(identifier, { facets: [...] })` es el unico entry point server-side para obtener datos completos de una organizacion/cuenta. Los consumidores NO deben hacer queries directas — deben usar el resolver.
- Scope resolver centralizado: org → spaces → clients resuelto una sola vez, compartido por todas las facetas.
- Regla: **nuevas facetas se agregan como modulos en `src/lib/account-360/facets/` + registro en FACET_REGISTRY**. No modificar el resolver core.
- Autorizacion per-facet: admin todo, operations sin finance, client limitado a identity+spaces+team+delivery+services.
- Cache in-memory per-facet con TTL + invalidacion por 22 eventos outbox. Preparado para Redis (TASK-276).
- Identifier resolver: acepta organization_id, public_id (EO-ORG-*), hubspot_company_id.
- Fuente canonica: `docs/architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md` (si existe) o el codigo en `src/lib/account-360/`.

## Delta 2026-04-07 AI Visual Asset Generator + Profile Banners (TASK-278)

- `generateImage()` y `generateAnimation()` en `src/lib/ai/image-generator.ts` son el entry point para generar assets visuales durante el desarrollo.
- Motor de imagenes: **Imagen 4** (`imagen-4.0-generate-001`), configurable via `IMAGEN_MODEL` env var.
- Motor de animaciones: **Gemini** (ultimo modelo via `resolveNexaModel()`), genera SVG con CSS keyframes + `prefers-reduced-motion`.
- Regla: **los banners de perfil se resuelven via `resolveProfileBanner(roleCodes, departmentName)`** en `src/lib/person-360/resolve-banner.ts`. No hardcodear paths de banner.
- Regla: **endpoints de generacion deshabilitados en production** por defecto. Override: `ENABLE_ASSET_GENERATOR=true`.
- 7 categorias de banner: leadership, operations, creative, technology, strategy, support, default.
- Fuente canonica: `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`.

## Delta 2026-04-07 Person Complete 360 — serving federado por facetas (TASK-273)

- `getPersonComplete360(identifier, facets[])` es el unico entry point server-side para obtener datos completos de una persona. Los consumidores NO deben hacer queries directas a tablas de persona — deben usar el resolver.
- 8 facetas: identity, assignments, organization, leave, payroll, delivery, costs, staffAug. Cada faceta es un modulo independiente en `src/lib/person-360/facets/`.
- Regla: **nuevas facetas se agregan como modulos en `facets/` + registro en FACET_REGISTRY**. No modificar el resolver core.
- Regla: **resolveAvatarUrl centralizado en `src/lib/person-360/resolve-avatar.ts`**. No crear copias locales.
- Regla: **resolucion `profile_id -> member_id` ocurre una sola vez** en el resolver. Las facetas reciben `FacetFetchContext` con ambos IDs pre-resueltos.
- Autorizacion per-facet en `facet-authorization.ts`: self ve todo, admin ve todo, collaborator ve identity+assignments+organization+delivery, HR ve todo menos costs, client ve identity+assignments+delivery.
- Cache in-memory per-facet con TTL (identity 5min, payroll 1h, leave 2min). Preparado para Redis (TASK-276).
- Endpoints: `GET /api/person/{id}/360?facets=...` y `POST /api/persons/360` (bulk).
- `_meta` en cada response: timing por faceta, cacheStatus, errores, deniedFacets, redactedFields.
- Fuente canonica: `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`.

## Delta 2026-04-06 Vuexy upstream documentado en repo ecosystem

- `pixinvent/vuexy-nextjs-admin-template` queda registrado como upstream de referencia del starter/theme Vuexy que Greenhouse adapta en este portal.
- No debe tratarse como source of truth funcional del producto ni como reemplazo de `greenhouse-eo`.
- Debe consultarse cuando el cambio toque layout base, shell, navegacion o comportamiento heredado de Vuexy.
- Fuente canonica: `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`.

## Delta 2026-04-05 Session resolution: paridad PG ↔ BQ cerrada (TASK-255)

- El contrato `TenantAccessRow` ahora tiene paridad completa entre el path PostgreSQL (`session_360`) y el path BigQuery (`getIdentityAccessRecord`): ambos retornan `member_id` e `identity_profile_id`.

## Delta 2026-04-07 labor_cost_clp separado en client_economics + type consolidation

- `client_economics` tiene nueva columna `labor_cost_clp` — costo laboral ya no se mezcla con `direct_costs_clp`.
- `sanitizeSnapshotForPresentation` requiere `laborCostClp` (no opcional) — TypeScript rechaza callers que no lo pasen.
- Tipos `OrganizationClientFinance` y `OrganizationFinanceSummary` consolidados en `src/views/greenhouse/organizations/types.ts` — single source of truth, backend importa de ahí.
- 360 economics facet expone `laborCostCLP` per client. Finance tab tiene columna "Costo laboral" dedicada.
- Trend chart de Economics tab ordenado cronológicamente (ASC).

## Delta 2026-04-07 TASK-279 ops-worker: cost attribution materialization endpoint

- Nuevo endpoint `POST /cost-attribution/materialize` en ops-worker Cloud Run.
- Mueve la materialización de `commercial_cost_attribution` (VIEW con 3 CTEs + LATERAL JOIN + exchange rates) fuera de Vercel serverless donde hace timeout.
- Acepta `{year, month}` para single-period o vacío para bulk. Opcionalmente recomputa `client_economics` snapshots.
- Revision activa: `ops-worker-00006-qtl`, 100% tráfico.
- Bug fix: `deploy.sh` usaba `--headers` en `gcloud scheduler jobs update` (flag inválido), corregido a `--update-headers`.
- Test fix: mock de `materializeCommercialCostAttributionForPeriod` actualizado para nuevo return type `{ rows, replaced }`.

## Delta 2026-06-17 TASK-254 ops-worker Cloud Run desplegado y operativo

- Los 3 crons reactivos del outbox (`outbox-react`, `outbox-react-delivery`, `projection-recovery`) ya no corren como Vercel cron.
- Ahora corren en Cloud Run como servicio dedicado `ops-worker` en `us-east4`, disparados por Cloud Scheduler.
- Revision activa: `ops-worker-00006-qtl`, 100% tráfico.
- Service URL: `https://ops-worker-183008134038.us-east4.run.app`
- Image: `gcr.io/efeonce-group/ops-worker` (Cloud Build two-stage esbuild).
- SA: `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con `roles/run.invoker`.
- 3 Cloud Scheduler jobs: `ops-reactive-process` (_/5), `ops-reactive-process-delivery` (2-59/5), `ops-reactive-recover` (_/15), timezone `America/Santiago`, auth OIDC.
- Las rutas API Vercel siguen existiendo como fallback manual pero ya no están scheduladas en `vercel.json` (16 → 13 crons).
- Regla ESM/CJS: servicios Cloud Run que reutilicen `src/lib/` sin necesitar NextAuth deben shimear `next-auth`, sus providers y `bcryptjs` via esbuild `--alias`. El ops-worker tiene 9 shims (server-only, next/server, next/headers, next-auth, 3 providers, next-auth/next, bcryptjs).
- Regla de health check: usar `gcloud run services proxy` en vez de `gcloud auth print-identity-token --audiences=` (el segundo requiere permisos de impersonation que no siempre están disponibles).
- Run tracking: cada corrida queda en `source_sync_runs` con `source_system='reactive_worker'`, visible en Admin > Ops Health como subsistema `Reactive Worker`.
- Fuente canónica: `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4.9 y §5.
- Regla vigente: todo campo nuevo que se agregue a `session_360` debe ir tambien en el SELECT/GROUP BY de BigQuery en `src/lib/tenant/access.ts`.
- La funcion `authorize()` de credentials en `src/lib/auth.ts` ahora incluye todos los campos de identidad en el user retornado (`memberId`, `identityProfileId`, `spaceId`, `organizationId`, `organizationName`). SSO ya los tenia porque lee `tenant.*` directamente.
- `/api/my/profile` es resiliente: intenta `person_360`, fallback a session data. Un usuario autenticado nunca ve "Perfil no disponible".

## Delta 2026-04-05 Vercel Cron no depende de CRON_SECRET

- Las routes protegidas con `requireCronAuth()` ya no deben bloquear corridas legítimas de Vercel Cron si `CRON_SECRET` falta en el entorno.
- Regla vigente:
  - requests con `x-vercel-cron: 1` o `user-agent` `vercel-cron/*` se autorizan como scheduler traffic válido
  - `CRON_SECRET` sigue siendo obligatorio para invocaciones bearer/manuales fuera de Vercel
  - si una request no es Vercel Cron y el secret falta, el runtime sigue fallando en cerrado con `503`
- Motivación:
  - cerrar `ISSUE-012` y evitar que la ausencia de `CRON_SECRET` vuelva a detener el carril reactivo u otras routes cron programadas

## Delta 2026-04-05 Reactive backlog hidden stage now surfaces in Admin Ops

- `Admin Center`, `Ops Health` y el contrato interno `/api/internal/projections` ya distinguen explícitamente el tramo reactivo oculto `published -> outbox_reactive_log`.
- Nuevo contrato runtime:
  - `getOperationsOverview()` expone `kpis.hiddenReactiveBacklog`
  - además expone `reactiveBacklog` con:
    - `totalUnreacted`
    - `last24hUnreacted`
    - `oldestUnreactedAt`
    - `newestUnreactedAt`
    - `lastReactedAt`
    - `lagHours`
    - `status`
    - `topEventTypes`
- Regla vigente:
  - `pendingProjections` ya no puede leerse como proxy suficiente de salud reactiva
  - `failedHandlers` ya no puede leerse como proxy suficiente de backlog reactivo real
  - la lectura correcta del control plane debe distinguir al menos:
    - publish lane
    - hidden reactive backlog
    - persistent queue backlog
    - handler degradation
- Motivación:
  - cerrar `ISSUE-009` para que el backlog reactivo no pueda seguir acumulándose sin visibilidad operativa

## Delta 2026-04-05 Finance schema drift now surfaces as degraded payload, not empty success

- Las routes Finance `purchase-orders`, `hes`, `quotes` y `intelligence/operational-pl` ya no responden vacío indistinguible cuando falta una relación o columna crítica.
- Regla vigente:
  - se preserva la shape de lista base
  - el payload agrega `degraded: true`, `errorCode` y `message`
  - el runtime debe distinguir ausencia real de datos versus schema drift
- Motivación:
  - cerrar `ISSUE-008` sin perder compatibilidad básica con consumers que esperan arrays

## Delta 2026-04-05 Finance create fallback now reuses a request-scoped canonical ID

- `POST /api/finance/income` y `POST /api/finance/expenses` ya no recalculan un segundo ID cuando el path Postgres-first alcanzó a generar uno antes del fallback BigQuery.
- Regla vigente:
  - si la request ya trae ID, se preserva
  - si PostgreSQL ya generó ID, BigQuery fallback reutiliza ese mismo valor
  - solo si nunca existió ID canónico previo, el fallback puede asignar uno nuevo
- Motivación:
  - cerrar el riesgo de duplicidad lógica cross-store detectado en `ISSUE-007`

## Delta 2026-04-05 Issue lifecycle protocol formalized

- El lifecycle formal de `ISSUE-###` ya vive en `docs/operations/ISSUE_OPERATING_MODEL_V1.md`.
- Regla operativa:
  - los issues documentan incidentes y regressions confirmados
  - pueden resolverse sin `TASK-###` si el fix es localizado y verificable
  - al resolverse deben moverse físicamente de `docs/issues/open/` a `docs/issues/resolved/` y actualizar `docs/issues/README.md` en el mismo lote

## Delta 2026-04-03 Internal roles and hierarchies canonical architecture

- Greenhouse ya distingue formalmente cuatro planos internos que antes aparecían mezclados entre HR, Identity y Agency:
  - `Access Role`
  - `Reporting Hierarchy`
  - `Structural Hierarchy`
  - `Operational Responsibility`
- La fuente canónica nueva vive en:
  - `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- Regla operativa:
  - `departments` no debe leerse como jerarquía universal de approvals ni de ownership comercial
  - `supervisor` sigue siendo una relación entre miembros vía `reports_to_member_id`
  - ownership de cuenta/space/proyecto debe converger a relaciones explícitas scoped, no inferirse desde el departamento del colaborador
- jerarquía visible recomendada para personas:
  - `Superadministrador`
  - `Responsable de Área`
  - `Supervisor`
  - `Colaborador`
  - esta jerarquía es de lectura humana y no reemplaza `role_code` ni ownership operativo
- Naming guidance:
  - `role_code` técnico estable en `snake_case`

## Delta 2026-04-10 Supervisor subtree-aware access

- Greenhouse ya materializa supervisoría limitada en runtime sin introducir un `role_code` `supervisor`.
- `/people` y `/hr/leave` pueden abrirse en modo supervisor derivado cuando el actor tiene:
  - reportes directos en `greenhouse_core.reporting_lines`, o
  - delegación activa `approval_delegate`
- Regla operativa:
  - `routeGroup: hr` sigue siendo acceso HR amplio; no debe reutilizarse como proxy de liderazgo formal
  - la visibilidad limitada de supervisor se deriva on-demand desde jerarquía + delegación
  - `HR > Jerarquía` sigue siendo una surface de RRHH/admin; supervisoría limitada actual no concede CRUD de jerarquía
  - nombre visible amigable y legible para UI/admin
- rol visible más amplio:
  - `Superadministrador`
  - código técnico actual: `efeonce_admin`
  - el runtime canónico ya debe resolverlo con acceso a todos los `routeGroups` y, por extensión, a todas las vistas posibles del portal
- Drift reconocido:
  - `employee` y `finance_manager` siguen existiendo como contracts legacy en partes del runtime y deben leerse como carriles de convergencia, no como taxonomía target

## Delta 2026-04-10 Reporting hierarchy foundation (TASK-324)

- La supervisoría formal ya no depende solo de `greenhouse_core.members.reports_to_member_id`.
- Nueva lane canónica:
  - `greenhouse_core.reporting_lines`
  - historial efectivo con `effective_from` / `effective_to`
  - metadata de origen, motivo y actor del cambio
- Compatibilidad obligatoria:
  - `greenhouse_core.members.reports_to_member_id` sigue vivo como snapshot actual y compat layer
  - triggers en `reporting_lines` sincronizan el snapshot hacia `members`
- Delegación temporal:
  - el supervisor efectivo puede resolverse con `greenhouse_core.operational_responsibilities`
  - `responsibility_type = approval_delegate`
  - `scope_type = member`
- Readers canónicos disponibles en `src/lib/reporting-hierarchy/*` para supervisor actual/efectivo, reportes directos, subárbol, cadena ascendente y miembros sin supervisor
- Guardrails mínimos:
  - no self-reporting
  - no ciclos
  - no múltiples relaciones vigentes solapadas para el mismo miembro

## Delta 2026-04-03 Finance visible semantics: Nubox documents are not cash events

- Las surfaces visibles `Finance > income` y `Finance > expenses` deben leerse como ledgers de documento/devengo, no como caja pura.
- Regla vigente:
  - `Nubox sales` se muestran como documentos de venta en `greenhouse_finance.income`
  - `Nubox purchases` se muestran como documentos de compra/obligación en `greenhouse_finance.expenses`
  - los cobros reales viven en `greenhouse_finance.income_payments`
  - los pagos reales viven en `greenhouse_finance.expense_payments`
- Implicación UX:
  - la navegación y copy visible de Finance debe evitar sugerir que una factura de venta ya es un cobro
  - o que una factura de compra ya es un pago
  - el P&L puede seguir leyendo devengo, pero la semántica visible debe distinguir documento vs caja

## Delta 2026-04-08 Payment Instruments Registry + FX tracking (TASK-281)

- `greenhouse_finance.accounts` evolucionada a Payment Instruments Registry: `instrument_category`, `provider_slug`, campos por tipo (tarjeta, fintech, procesador)
- FX tracking nativo: `exchange_rate_at_payment`, `amount_clp`, `fx_gain_loss_clp` en ambos payment tables
- `resolveExchangeRate()` bidireccional (CLP↔USD) reutilizando Mindicador dólar observado
- Catálogo estático de 20 proveedores con logos SVG en `src/config/payment-instruments.ts`
- `PaymentInstrumentChip` componente con logo + fallback a initials
- Admin Center CRUD: `/admin/payment-instruments` con TanStack table y drawer por categoría
- Selectores de instrumento en todos los drawers (CreateIncome, CreateExpense, RegisterCashIn, RegisterCashOut)
- Columna instrumento con logo en CashInListView y CashOutListView

## Delta 2026-04-08 Finance cash contract hardened around canonical ledgers

- Todo cobro/pago real debe existir en el ledger canónico y publicar outbox:
  - cobros: `greenhouse_finance.income_payments` + `finance.income_payment.recorded`
  - pagos: `greenhouse_finance.expense_payments` + `finance.expense_payment.recorded`
- `POST /api/finance/income/[id]/payment` queda solo como wrapper legacy-compatible del endpoint canónico `/api/finance/income/[id]/payments`; no puede volver a escribir por BigQuery fallback.
- El sync de movimientos bancarios Nubox ya debe registrar cobros usando `recordPayment()` para que `client_economics`, `operational_pl`, `commercial_cost_attribution` y otros consumers reactivos escuchen el mismo contrato que escucha la UI manual.
- Existe remediación operativa para histórico y drift:
  - `pnpm audit:finance:payment-ledgers`
  - `pnpm backfill:finance:payment-ledgers`
- Regla operativa:
  - si un documento aparece como `paid` o `partial`, debe existir al menos una fila en su ledger correspondiente o quedar explicitamente auditado como inconsistencia

## Delta 2026-04-03 Contrato_Metricas_ICO_v1 aligned to benchmark-informed thresholds

- `docs/architecture/Contrato_Metricas_ICO_v1.md` ya no usa los thresholds legacy `OTD >= 90`, `FTR >= 70`, `RpA <= 1.5` como si todos tuvieran el mismo respaldo.
- El contrato ahora separa explícitamente:
  - métricas con benchmark informado por referencias externas o análogos (`OTD`, `FTR`, `RpA`)
  - métricas con calibración interna por cuenta/tipo de pieza (`Cycle Time`, `Cycle Time Variance`, `BCS`)
- Regla operativa:
  - para `OTD`, `FTR` y `RpA` prevalecen las bandas documentadas en `docs/architecture/Greenhouse_ICO_Engine_v1.md` § `A.5.5`
  - para `Cycle Time`, `CTV` y `BCS` se mantiene calibración interna según baseline operativo por cuenta

## Delta 2026-04-05 Vercel Deployment Protection, bypass SSO y proyecto único

- **SSO habilitada** con `deploymentType: "all_except_custom_domains"` — protege todos los deployments excepto custom domains de Production.
- El custom domain de staging (`dev-greenhouse.efeoncepro.com`) **SÍ recibe SSO** — no es excepción (la excepción solo aplica a custom domains de Production como `greenhouse.efeoncepro.com`).
- Para acceso programático (agentes, Playwright, curl), usar:
  - URL `.vercel.app` del deployment: `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`
  - Header: `x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET`
- **REGLA CRÍTICA**: `VERCEL_AUTOMATION_BYPASS_SECRET` es auto-gestionada por el sistema (está en `protectionBypass` del proyecto con `scope: "automation-bypass"` e `isEnvVar: true`). NUNCA crear manualmente esa variable en Vercel — si se crea con otro valor, sombrea el real y rompe el bypass silenciosamente.
- Proyecto canónico: `greenhouse-eo` (`prj_d9v6gihlDq4k1EXazPvzWhSU0qbl`), team `efeonce-7670142f`. No debe existir un segundo proyecto vincualdo al mismo repo.
- **Incidente real (2026-04-05)**: se eliminó un proyecto duplicado en scope personal (`prj_5zqdjJOz6OUQy7hiPh8xHZJj8tA8`) que causaba failures constantes en GitHub — tenía 0 variables y sin framework.
- Variables de Agent Auth (`AGENT_AUTH_SECRET`, `AGENT_AUTH_EMAIL`) verificadas activas en Staging + Preview(develop).
- Agent Auth verificado funcional en staging: `POST /api/auth/agent-session` → HTTP 200, JWT válido para `user-agent-e2e-001`.

## Delta 2026-04-03 ICO Engine external benchmarks documented

- La arquitectura de `ICO Engine` ya documenta un bloque específico de benchmarks externos y estándar recomendado para Greenhouse.
- La fuente canónica ahora vive en:
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md` § `A.5.5 Benchmarks externos y estándar recomendado para Greenhouse`
- Ese bloque separa explícitamente:
  - métricas con benchmark externo fuerte (`OTD`)
  - métricas con benchmark por análogo (`FTR` vía `FPY` / `first-time error-free`)
  - métricas con benchmark parcial creativo (`RpA`, `cycle time`)
  - métricas que deben seguir tratándose como policy interna (`throughput`, `pipeline_velocity`, `stuck_assets`, `carry_over`, `overdue_carried_forward`)
- Regla operativa:
  - Greenhouse no debe presentar como “estándar de industria” una métrica que solo tenga benchmark parcial o interno
  - cualquier ajuste de thresholds productivos debe citar ese bloque de arquitectura y declarar si el criterio proviene de benchmark externo, análogo o policy interna

## Delta 2026-04-03 ICO Engine metrics inventory consolidated in architecture

- La arquitectura de `ICO Engine` ya documenta en un solo bloque el inventario canónico de señales y métricas.
- La fuente consolidada ahora vive en:
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md` § `A.5.4 Inventario canónico de métricas y señales del ICO Engine`
- Ese inventario separa explícitamente:
  - categorías funcionales de métricas ICO
  - señales base que ya vienen calculadas o normalizadas
  - señales derivadas a nivel tarea por `v_tasks_enriched`
  - métricas agregadas canónicas calculadas por `buildMetricSelectSQL()`
  - buckets/contexto operativo aditivo
  - rollups adicionales del `performance_report_monthly`
- además, cada métrica/rollup ya documenta:
  - en qué consiste el cálculo
  - qué pregunta de negocio responde
- Regla operativa:
  - si cambia una fórmula en `src/lib/ico-engine/shared.ts` o el catálogo en `src/lib/ico-engine/metric-registry.ts`, este bloque de arquitectura debe actualizarse en el mismo lote

## Delta 2026-04-03 ICO completion semantics now require terminal task status

- `ICO Engine` ya no trata `completed_at` como suficiente para considerar una tarea completada.
- Regla vigente:
  - una tarea solo cuenta como `completed` para `OTD`, `RpA`, `FTR`, `cycle time` y `throughput` si tiene:
    - `completed_at IS NOT NULL`
    - `task_status IN ('Listo','Done','Finalizado','Completado','Aprobado')`
  - `performance_indicator_code = 'on_time'` o `late_drop` ya no puede forzar completitud si el estado sigue abierto o intermedio
- Motivación:
  - se detectaron filas reales en `ico_engine.v_tasks_enriched` con `completed_at` poblado pero `task_status = 'Sin empezar'` o `Listo para revisión`
  - esas filas contaminaban `Agency > Delivery` y cualquier consumer del motor con `OTD 100%` y volumen completado artificial

## Delta 2026-04-03 Agency Delivery current-month KPIs now read live ICO data

- `Agency > Delivery` volvió a leer el mes en curso para `OTD` / `RpA`, pero ya no desde snapshots mensuales parciales.
- Regla vigente:
  - los KPIs de esa vista (`RPA promedio`, `OTD`, tabla por Space) se calculan live contra `ico_engine.v_tasks_enriched`
  - el período efectivo sigue siendo el mes calendario actual en timezone `America/Santiago`
  - el cálculo live reutiliza el filtro canónico `buildPeriodFilterSQL()` y las fórmulas canónicas de `ICO Engine`
  - los contadores operativos como proyectos, feedback y stuck assets siguen saliendo del estado actual
- Motivación:
  - el hotfix previo hacia `último mes cerrado` corregía números absurdos del snapshot abierto, pero cambiaba la semántica temporal visible de la surface
  - la decisión correcta para esta vista es `mes en curso + datos reales`, no `mes cerrado`
- Nota operativa:
  - esto deja explícito que `Agency > Delivery` consume live compute del mes actual
  - el carril `metric_snapshots_monthly` sigue siendo válido para surfaces mensuales cerradas y reportes históricos, no para este overview operativo

## Delta 2026-04-03 Agency Delivery now reads latest closed monthly ICO snapshot

> Superseded el mismo día por el delta `Agency Delivery current-month KPIs now read live ICO data`.

- `Agency > Delivery` ya no debe leer el mes abierto más reciente de `ico_engine.metric_snapshots_monthly` para `OTD` / `RpA`.
- Regla vigente:
  - los KPIs mensuales de esa vista (`RPA promedio`, `OTD`, tabla por Space) leen el último período mensual cerrado disponible
  - los contadores operativos como proyectos, feedback y stuck assets siguen saliendo del estado actual
- Motivación:
  - el mes abierto podía exponer snapshots parciales o inestables en `metric_snapshots_monthly`
  - eso produjo síntomas visibles como `Sky Airline` con `OTD 9.5%` y `RpA null` en abril 2026, aunque el período cerrado previo mostraba métricas sanas

## Delta 2026-04-03 Deel contractors projected payroll KPI bonuses

- `Payroll` y `Projected Payroll` ya no deben tratar a `payroll_via = 'deel'` como carril de bono KPI discrecional por defecto.
- Regla vigente:
  - `honorarios` sigue siendo discrecional para `OTD` / `RpA`
  - `Deel` sí calcula `bonusOtdAmount` y `bonusRpaAmount` automáticamente con la policy vigente de `payroll_bonus_config`
  - `Deel` sigue sin calcular descuentos previsionales locales ni prorrateos de compliance Chile dentro de Greenhouse
- Implicación runtime:
  - los contractors / EOR `international` pueden mostrar `OTD` y `RpA` visibles con payout real en payroll proyectado y oficial
  - la fuente `kpiDataSource` para Deel debe reflejar el origen real del KPI (`ico` cuando existe snapshot), no marcarse como `external` por default

## Delta 2026-04-03 TASK-209 conformed writer staged swap + freshness gate

- El writer `Notion raw -> greenhouse_conformed` ya no reemplaza `delivery_projects`, `delivery_tasks` y `delivery_sprints` con `WRITE_TRUNCATE` secuencial directo.
- Nuevo contrato runtime:
  - cada corrida stagea primero en tablas efímeras derivadas del schema canónico
  - luego hace swap transaccional sobre las tres tablas canónicas
  - si el conformed ya está tan fresco como `notion_ops` por tabla, la corrida se considera `succeeded` sin reescribir
- Motivación:
  - evitar el incidente observado en production donde `delivery_projects` avanzó pero `delivery_tasks` y `delivery_sprints` quedaron atrás por `Exceeded rate limits: too many table update operations for this table`
  - reducir consumo de quota de operaciones de tabla cuando el callback upstream re-dispara el cierre sobre un snapshot raw ya convergido
- Decisión operativa:
  - `greenhouse_conformed.delivery_*` sigue siendo la capa canónica de consumo
  - el staging efímero es solo carril técnico de swap atómico, no un nuevo contrato analítico visible
- Implicación:
  - la salud del conformed ya no debe evaluarse solo por `MAX(synced_at)` global; el baseline correcto es frescura por tabla (`projects/tasks/sprints`)

## Delta 2026-04-03 Production GCP auth fallback for Cloud SQL / BigQuery runtime

- Greenhouse runtime ya soporta una preferencia explícita de credenciales GCP vía `GCP_AUTH_PREFERENCE`.
- Valores soportados:
  - `auto` (default)
  - `wif`
  - `service_account_key`
  - `ambient_adc`
- Regla operativa nueva:
  - el baseline preferido sigue siendo `WIF`
  - pero un entorno puede forzar `service_account_key` cuando el runtime serverless no mantenga estable el carril OIDC/WIF
- Uso inmediato:
  - `production` puede fijar `GCP_AUTH_PREFERENCE=service_account_key` junto con `GOOGLE_APPLICATION_CREDENTIALS_JSON` para un fallback controlado de Cloud SQL Connector, BigQuery y Secret Manager
  - esto no cambia el default de `staging`, `preview` ni `development` mientras no se configure el override
- Motivación:
  - cerrar un incidente de `ERR_SSL_SSL/TLS_ALERT_BAD_CERTIFICATE` en Vercel production donde el runtime Postgres fallaba aunque el connector y la configuración WIF estuvieran presentes
  - mantener un switch explícito, reversible y documentado sin desmontar la postura WIF del resto de entornos

## Delta 2026-04-02 TASK-187 Notion governance formalization

- Notion ya tiene una lane formal de governance por `space` encima del binding existente `greenhouse_core.space_notion_sources`.
- Nuevos objetos de control plane en PostgreSQL:
  - `greenhouse_sync.notion_space_schema_snapshots`
  - `greenhouse_sync.notion_space_schema_drift_events`
  - `greenhouse_sync.notion_space_kpi_readiness`
- Nuevas APIs admin tenant-scoped:
  - `GET /api/admin/tenants/[id]/notion-governance`
  - `POST /api/admin/tenants/[id]/notion-governance/refresh`
- `POST /api/integrations/notion/register` ya no deja un `nextStep` roto:
  - apunta al control plane real `POST /api/admin/integrations/notion/sync`
  - intenta además refrescar governance best-effort tras persistir el binding
- `TenantNotionPanel` ya muestra:
  - KPI readiness por `space`
  - snapshots de schema por base
  - drift abierto por DB role
  - CTA admin para refrescar governance
- `scripts/notion-schema-discovery.ts` quedó reconciliado con el schema canónico actual:
  - lee `greenhouse_core.space_notion_sources`
  - ya no depende del join legacy roto a `sns.notion_database_ids` / `sns.client_id`
- Regla vigente:
  - el portal sigue usando `NOTION_PIPELINE_URL` para discovery UI/admin sample y verificación de DB access
  - el refresh de governance usa `NOTION_TOKEN` server-side para leer schema de Notion y persistir snapshots/drift/readiness
  - si `NOTION_TOKEN` no está disponible, el onboarding puede registrar bindings igual, pero governance queda pendiente de refresh explícito en un entorno con credenciales
  - el cron runtime `sync-notion-conformed` todavía no usa `space_property_mappings` como carril principal; la tabla permanece como fuente de overrides explícitos y contract governance, no como source of truth runtime definitivo

## Delta 2026-04-02 Finance Clients financial contacts org-first UI

- `Finance > Clients > Contactos` dejó de ser una pestaña read-only basada solo en `greenhouse_finance.client_profiles.finance_contacts`.
- La ficha ahora puede abrir el drawer shared de `organization memberships` directamente desde la pestaña de contactos, restringido a tipos `billing` / `contact`.
- `GET /api/finance/clients/[id]` ahora prioriza `person_memberships` de la organización canónica (`billing`, `contact`, `client_contact`) cuando existe `organization_id`; `finance_contacts` queda como fallback legacy.
- Regla vigente:
  - los contactos financieros de clientes deben converger al backbone `Person ↔ Organization`
  - el JSON embebido `finance_contacts` se mantiene solo como compatibilidad transicional y fallback cuando no exista org canónica o memberships

## Delta 2026-04-02 TASK-193 person-organization synergy activation

- `Efeonce` ya existe como `operating entity` persistida en `greenhouse_core.organizations` usando el flag `is_operating_entity = TRUE`; la org canónica quedó regularizada sobre el registro existente `Efeonce`.
- `greenhouse_serving.session_360` ya resuelve `organization_id` para ambos tenant types:
  - `client` por bridge `spaces.client_id -> organization_id` con fallback a primary membership
  - `efeonce_internal` por operating entity
- `greenhouse_serving.person_360` ya expone org primaria, aliases `eo_id` / `member_id` / `user_id` y `is_efeonce_collaborator`; consumers canónicos como `CanonicalPersonRecord` deben preferir este backbone antes de recomponer contexto org ad hoc.
- `Organization memberships` ya distinguen `internal` vs `staff_augmentation` como contexto operativo del vínculo cliente sobre `team_member`; la distinción vive en `assignmentType`/`assignedFte`, no en un `membership_type` nuevo.
- `People` ya consume `organizationId` compartido en los readers visibles para tenant `client`:
  - `finance`
  - `delivery`
  - `ico-profile`
  - `ico`
  - aggregate `GET /api/people/[memberId]`
- `HR` e `intelligence` quedan declarados como surfaces internas, no como follow-on client-facing del scope org-aware:
  - para tenant `client` responden `403`
  - exponen contrato, leave, compensación, costo y capacidad interna, por lo que no deben abrirse tal cual al carril cliente
- `Suppliers` ya puede sembrar contactos mínimos en Account 360:
  - `organizations/[id]/memberships` acepta crear `identity_profile` ad hoc con nombre + email
  - `finance/suppliers` create/update ya intenta sembrar `person_memberships(contact)` cuando el supplier tiene `organization_id`
  - `Finance Suppliers` detail/list ya prioriza esos contactos vía `organizationContacts` / `contactSummary`
  - `primary_contact_*` se mantiene como cache transicional para fallback BigQuery y suppliers sin memberships
- Operación DB validada nuevamente:
  - `pnpm migrate:up` sigue requiriendo Cloud SQL Proxy local (`127.0.0.1:15432`) cuando el wrapper deriva a TCP directo; la IP pública de Cloud SQL continúa no accesible.

## Delta 2026-04-01 Native Integrations Layer como arquitectura viva

- La `Native Integrations Layer` ya no vive solo en `TASK-188`; su fuente canónica ahora es:
  - `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- Regla vigente:
  - integraciones críticas como `Notion`, `HubSpot`, `Nubox` y `Frame.io` deben evolucionar bajo un marco común de plataforma
  - el patrón objetivo combina `API-led connectivity`, `event-driven architecture`, `contract-first governance` y `canonical core`
  - Greenhouse debe fortalecer foundations existentes antes de reemplazarlas
- Relación operativa:
  - `TASK-188` queda como lane/backlog paraguas
  - `TASK-187` es la primera implementación fuerte sobre `Notion`
  - `TASK-186` consume esa foundation para trust y paridad de métricas Delivery

## Delta 2026-04-01 HR departments head selector desacoplado de People

- El selector `Responsable` en `HR > Departments` ya no depende de `GET /api/people`.
- La vista ahora consume `GET /api/hr/core/members/options`, autorizado por `requireHrCoreManageTenantContext`.
- La fuente del dropdown es `greenhouse_core.members` vía reader liviano del módulo HR.
- Regla vigente:
  - selectors operativos de HR no deben depender del route group `people` para resolver miembros activos
  - cuando el write target sea `members.member_id`, preferir un reader HR liviano y local antes que el listado full de People

## Delta 2026-04-01 Vitest tooling coverage

- `Vitest` ya descubre también tests de `scripts/**`, no solo `src/**`.
- La fuente de verdad sigue siendo `vitest.config.ts`; el setup compartido continúa en `src/test/setup.ts`.
- Regla vigente:
  - tests unitarios de tooling/CLI local pueden vivir en `scripts/**/*.test.ts` o `scripts/**/*.spec.ts`
  - `pnpm test` y `pnpm exec vitest run <archivo>` ya deben encontrarlos sin workarounds
  - esto cubre carriles de DB/tooling como `pg:doctor`, migraciones y generación de tipos cuando tengan lógica testeable
- El helper `scripts/lib/load-greenhouse-tool-env.ts` ahora normaliza passwords vacías (`''`) como no definidas cuando un profile usa `*_PASSWORD_SECRET_REF`, para no contaminar `GREENHOUSE_POSTGRES_PASSWORD` con un valor vacío.

## Delta 2026-04-05 Test observability MVP

- Greenhouse ya tiene una lane mínima de observabilidad de tests basada en artifacts locales y de CI.
- Nuevos comandos canónicos:
  - `pnpm test:inventory`
  - `pnpm test:results`
  - `pnpm test:coverage`
  - `pnpm test:observability:summary`
  - `pnpm test:observability`
- Outputs canónicos:
  - `artifacts/tests/inventory.json`
  - `artifacts/tests/inventory.md`
  - `artifacts/tests/results.json`
  - `artifacts/tests/vitest.log`
  - `artifacts/tests/summary.md`
  - `artifacts/coverage/coverage-summary.json`
  - `artifacts/coverage/index.html`
- Regla vigente:
  - el source of truth del estado del suite vive en CI + artifacts
  - no existe admin backend ni persistence runtime para corridas de test en esta iteración
  - GitHub Actions publica artifacts reutilizables y un summary corto del suite

## Delta 2026-04-01 TASK-026 contract canonicalization

- `greenhouse_core.members` ya es el ancla canonica de contrato para HRIS:
  - `contract_type`
  - `pay_regime`
  - `payroll_via`
  - `deel_contract_id`
- `greenhouse_payroll.compensation_versions` conserva snapshot historico de contrato y regimen; no reemplaza el canon colaborador.
- `greenhouse_payroll.payroll_entries` ya publica `payroll_via`, `deel_contract_id`, `sii_retention_rate` y `sii_retention_amount`.
- `daily_required` sigue siendo el flag almacenado en Postgres; `schedule_required` solo debe tratarse como alias de lectura en views, UI y helpers.
- Las vistas `member_360`, `member_payroll_360` y `person_hr_360` quedaron alineadas para que HR, Payroll, People y cualquier consumer cross-module lean el mismo contrato base.
- Nota operativa: la migracion de TASK-026 requirio Cloud SQL Proxy local para CLI; la primera corrida detecto un timestamp anterior al baseline de `node-pg-migrate`, por lo que el archivo se regenero con un timestamp valido generado por la herramienta; `pnpm lint` y `pnpm build` quedaron verdes y `pnpm migrate:up` / `pnpm db:generate-types` siguen como cierre operativo pendiente del agente principal.

## Delta 2026-03-31 Operación GCP: cuenta preferida y carril ADC

- Preferencia operativa explícita del owner/admin del proyecto:
  - usar `gcloud` primero para operaciones GCP/Cloud SQL/BigQuery
  - la cuenta humana preferida es `julio.reyes@efeonce.org`
  - asumir que ese usuario es admin/owner salvo evidencia contraria del entorno
- Carril recomendado:
  - priorizar `Application Default Credentials (ADC)` para scripts y tooling local antes de depender de `.env` remotos o pulls de Vercel
  - validar al inicio:
    - `gcloud auth list`
    - `gcloud config get-value account`
    - `gcloud auth application-default print-access-token`
- Fallback operativo:
  - si `ADC` no está inicializado o no tiene alcance suficiente, documentarlo explícitamente
  - recién después usar env remoto (`vercel env pull` u otra vía equivalente) como workaround
- Regla de coordinación:
  - no asumir que el mejor carril para ejecutar backfills o scripts operativos es Vercel
  - intentar primero el carril `gcloud + ADC` y dejar nota en `Handoff.md` si no estuvo disponible
- Estado observado en esta máquina durante esta sesión:
  - `gcloud` sí estaba autenticado con `julio.reyes@efeonce.org` como cuenta activa
  - `ADC` no estaba inicializado, por lo que algunas operaciones terminaron requiriendo fallback temporal
  - esta situación debe corregirse antes de normalizar nuevos flujos operativos sobre GCP

## Delta 2026-03-31 Shared attachments and GCP bucket topology

- Alineación operativa de entorno:
  - ya existen buckets dedicados reales en GCP:
    - `efeonce-group-greenhouse-public-media-dev`
    - `efeonce-group-greenhouse-public-media-staging`
    - `efeonce-group-greenhouse-public-media-prod`
    - `efeonce-group-greenhouse-private-assets-dev`
    - `efeonce-group-greenhouse-private-assets-staging`
    - `efeonce-group-greenhouse-private-assets-prod`
  - Vercel ahora fija:
    - `development` -> `public-media-dev` / `private-assets-dev`
    - `staging` -> `public-media-staging` / `private-assets-staging`
    - `production` -> `public-media-prod` / `private-assets-prod`
    - `preview (develop)` -> `public-media-staging` / `private-assets-staging`
  - el helper legacy de media pública ahora prioriza `GREENHOUSE_PUBLIC_MEDIA_BUCKET`; `GREENHOUSE_MEDIA_BUCKET` queda alineado como compatibilidad transicional
  - en este proyecto `Preview` no funciona como carril totalmente shared porque Vercel ya tiene múltiples env vars branch-scoped; por eso el baseline operativo mínimo sigue amarrado explícitamente a `develop`
- Hotfix operativo:
  - los drafts de `leave` ya no dependen solamente de que la sesión exponga `tenant.memberId`
  - `/api/hr/core/meta` ahora entrega `currentMemberId` resuelto para superficies HR/My que necesiten ownership documental
  - `/api/assets/private` hace fallback server-side para `leave_request_draft` usando la resolución actual de colaborador antes de rechazar el upload
  - `LeaveRequestDialog` ahora propaga `ownerMemberId` tanto al upload como al `POST` final de la solicitud
- Nueva decisión arquitectónica activa:
  - la capability shared de adjuntos/archivos del portal vive en `TASK-173`
  - `leave`, `Document Vault` y `Expense Reports` pasan a leerse como consumers de esa foundation
- Topología aprobada:
  - `public media` por entorno para logos/avatars/assets no sensibles
  - `private assets` por entorno para documentos y adjuntos operativos
- Regla vigente:
  - el bucket legacy `${GCP_PROJECT}-greenhouse-media` no debe seguir creciendo como default de nuevas capacidades privadas
  - la separación fina debe vivir en prefixes, metadata, authorization y retention, no en un bucket por módulo
- Modelo de acceso aprobado:
  - `public media` puede servirse directo y cachearse agresivamente
  - `private assets` entra por control de acceso Greenhouse y no debe persistirse como signed URL estable en el dominio
- Baseline UI aprobado:
  - el uploader shared debe construirse sobre `react-dropzone` + `src/libs/styles/AppReactDropzone.ts`
- Estado operativo actualizado:
  - el repo ya incluye `src/lib/storage/greenhouse-assets.ts`, routes `/api/assets/private*`, `GreenhouseFileUploader` y el setup `pnpm setup:postgres:shared-assets`
  - `leave`, `purchase orders`, `payroll receipts` y `payroll export packages` ya convergen en código al contrato shared
  - el bootstrap remoto en GCP/Cloud SQL ya quedó aplicado sobre `greenhouse-pg-dev / greenhouse_app`
  - el drift de ownership en `purchase_orders`, `payroll_receipts` y `payroll_export_packages` quedó corregido hacia `greenhouse_migrator`
  - `greenhouse_migrator_user` ya puede reejecutar `pnpm setup:postgres:shared-assets` sin depender de `postgres`
  - el único pendiente operativo de `TASK-173` es smoke manual autenticado de upload/download en `staging`

## Delta 2026-03-31 HR profile hire-date editing

- `People > HR profile` ya expone edición visible de `hireDate` en la card `Información laboral`.
- La UI usa `PATCH /api/hr/core/members/[memberId]/profile` y refleja el valor guardado en la misma tab sin depender de un refresh posterior del contexto HR agregado.
- Esto cierra la brecha operativa detectada después de endurecer `leave`: el sistema ya podía usar `hire_date` para antigüedad/progresivos, pero RRHH no tenía una surface clara para mantener ese dato.
- Decisión explícita de runtime:
  - `hireDate` sigue escribiéndose en `greenhouse.team_members.hire_date` sobre BigQuery
  - `greenhouse_core.members.hire_date` no reemplaza todavía ese write path
  - mientras `HR profile` no tenga cutover formal a PostgreSQL, este dato debe mantenerse BigQuery-first en edición y Postgres como consumo/proyección
- Arquitectura leave documentada con reglas runtime explícitas:
  - cálculo de días hábiles
  - overlap
  - attachment
  - min/max de anticipación y continuidad
  - balance, carry-over y progresivos
  - matrix seed de policies por tipo
  - aclaración de que saldo disponible no anula validaciones de policy

## Delta 2026-03-31 TASK-169 Staff Aug bridge People -> Assignment -> Placement

- El bridge real de `Staff Augmentation` ya no debe interpretarse como `ghost slot -> placement`.
- Estado vigente:
  - `Vincular a organización` en `People` crea `person_memberships`
  - la proyección `assignment_membership_sync` asegura `assignment -> membership`
  - el placement sigue naciendo solo desde `client_team_assignments`
- Ajustes nuevos:
  - `Create placement` ahora usa `GET /api/agency/staff-augmentation/placement-options` en vez de `/api/team/capacity-breakdown`
  - `People 360` ya expone señales de assignment Staff Aug (`assignmentType`, `placementId`, `placementStatus`) para abrir o crear placement desde el pivot correcto
- Regla vigente:
  - `membership` da contexto organizacional
  - `assignment` da contexto operativo
  - `placement` da contexto comercial-operativo y económico
  - no promover `person_membership` a identidad canónica del placement

## Delta 2026-03-30 TASK-142 agency space 360 runtime

- `Agency Space 360` ya existe como surface operativa y no debe leerse como redirect pendiente.
- Surface visible vigente:
  - `/agency/spaces/[id]`
  - `GET /api/agency/spaces/[id]`
- Contrato runtime nuevo:
  - `src/lib/agency/space-360.ts`
  - resuelve `clientId` como key operativa actual y enriquece con `space_id` + organización cuando existe vínculo canónico
- Fuentes activas de la 360:
  - `greenhouse_core.spaces`
  - `greenhouse_serving.operational_pl_snapshots`
  - `agency-finance-metrics`
  - `greenhouse_core.client_team_assignments`
  - `member_capacity_economics`
  - `services`
  - `greenhouse_delivery.staff_aug_placements`
  - `greenhouse_sync.outbox_events`
  - ICO latest snapshot + project metrics + stuck assets
- Regla vigente:
  - `Health` y `Risk` visibles en la 360 siguen siendo heurísticas transicionales
  - scores materializados y eventos Agency propios quedan como follow-ons (`TASK-150`, `TASK-151`, `TASK-148`)

## Delta 2026-03-30 TASK-019 staff augmentation baseline closure

- `Staff Augmentation` ya existe como módulo runtime de `Agency`, no como brief futuro.
- Ancla canónica:
  - `greenhouse_core.client_team_assignments`
  - `assignment_type = 'staff_augmentation'`
- Tablas vigentes:
  - `greenhouse_delivery.staff_aug_placements`
  - `greenhouse_delivery.staff_aug_onboarding_items`
  - `greenhouse_delivery.staff_aug_events`
  - `greenhouse_serving.staff_aug_placement_snapshots`
- Wiring reactivo vigente:
  - eventos `staff_aug.*`
  - proyección `staff_augmentation_placements`
  - refresh entrante desde assignments, finance, providers, tooling y payroll
- Surface visible vigente:
  - `/agency/staff-augmentation`
  - `/agency/staff-augmentation/[placementId]`
  - `Agency > Team` ya expone signal de placement en assignments
- Regla vigente:
  - Staff Aug se monta sobre assignments existentes
  - providers, finance suppliers y AI tooling actúan como consumidores y referencias del placement, no como identidades paralelas

## Delta 2026-03-30 TASK-059 provider canonical object reactivo

- `Provider` ya no debe leerse como ancla parcial o solo documental.
- Estado vigente:
  - identidad canónica: `greenhouse_core.providers`
  - serving base: `greenhouse_serving.provider_360`
  - bridge Finance: `greenhouse_serving.provider_finance_360`
  - snapshot operativo mensual nuevo: `greenhouse_serving.provider_tooling_snapshots`
  - latest-state nuevo: `greenhouse_serving.provider_tooling_360`
- Wiring reactivo nuevo:
  - `provider.upserted`
  - `finance.supplier.created`
  - `finance.supplier.updated`
  - proyección `provider_tooling` en domain `finance`
  - evento saliente `provider.tooling_snapshot.materialized`
- Consumer ya alineado:
  - `/api/finance/analytics/trends?type=tools` ahora consume el snapshot provider-centric en vez de agrupar por `supplier_name` o `description`
- Surface visible ya alineada:
  - `Finance > Suppliers` expone cobertura `Provider 360` en el listado
  - `Finance > Suppliers > [id]` expone tab `Provider 360`
  - `Admin > AI Tooling` ahora acepta drilldown por `providerId` y `tab` vía query string para catálogo/licencias/wallets desde Finanzas
- Regla vigente:
  - no crear `tool_providers` ni mover licencias/ledger al core
  - `greenhouse_ai.*` sigue siendo el runtime transaccional de tooling
  - `greenhouse_finance.suppliers` sigue siendo extensión payable del provider

## Delta 2026-03-30 Finance staging verification + TASK-164 docs reconciled

- `staging` ya carga correctamente al menos dos surfaces críticas del carril Finance actual:
  - `/finance/income/[id]`
  - `/finance/clients`
- En la verificación manual asistida solo aparecieron errores de `vercel.live`/CSP embed, no fallos funcionales del runtime Greenhouse.
- `TASK-164` quedó alineada documentalmente a su estado real implementado; Purchase Orders y HES ya no deben interpretarse como diseño pendiente.

## Delta 2026-03-30 Finance staging smoke for PO/HES/Intelligence

- `staging` ya carga también las surfaces:
  - `/finance/purchase-orders`
  - `/finance/hes`
  - `/finance/intelligence`
- Durante la verificación:
  - `GET /api/cost-intelligence/periods?limit=12` respondió `200`
  - `GET /api/notifications/unread-count` respondió `200`
- Observación abierta pero no bloqueante:
  - `finance/intelligence` dispara un `OPTIONS /dashboard -> 400` durante prefetch; no impidió render ni la carga de datos principales del módulo
- El resto del ruido de consola observado sigue siendo el embed/CSP report-only de `vercel.live`.

## Delta 2026-03-30 proxy hardening para OPTIONS de page routes

- `src/proxy.ts` ahora responde `204` a requests `OPTIONS` sobre rutas de página del portal.
- Objetivo:
  - evitar `400` espurios durante prefetch/navegación de surfaces que siguen referenciando `/dashboard`
  - no intervenir el comportamiento de `/api/**`
- Cobertura:
  - `src/proxy.test.ts` ahora valida tanto el caso page-route como el guard explícito sobre API routes.

## Delta 2026-03-30 CSP report-only ajustada para Vercel Live fuera de production

- `src/proxy.ts` ahora arma `frame-src` de la CSP report-only según entorno.
- Regla vigente:
  - `production` no incorpora `https://vercel.live`
  - `preview/staging` sí lo incorporan para evitar ruido de consola del toolbar/bridge de Vercel Live
- Esto no cambia la política efectiva de negocio del portal; solo limpia señal observacional en entornos no productivos.

## Delta 2026-03-30 Finance/Nubox docs reconciled to runtime

- `docs/architecture/FINANCE_DUAL_STORE_CUTOVER_V1.md` ya no debe leerse como snapshot operativo actual; quedó explícitamente reclasificado como historial de migración.
- `TASK-163` y `TASK-165` quedaron alineadas al estado real ya absorbido por runtime para evitar que futuros agentes reabran lanes que ya cerraron en código.
- La lectura canónica del estado actual de Finance sigue concentrada en:
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `docs/tasks/complete/TASK-166-finance-bigquery-write-cutover.md`
  - `docs/tasks/complete/TASK-050-finance-client-canonical-runtime-cutover.md`

## Delta 2026-03-30 Nubox DTE download hardening

- `IncomeDetailView` ahora reutiliza `nuboxPdfUrl` y `nuboxXmlUrl` directos cuando el sync ya los materializó, en vez de forzar siempre el proxy server-side de descarga.
- `src/lib/nubox/client.ts` normaliza `NUBOX_API_BASE_URL`, resuelve `NUBOX_BEARER_TOKEN` y `NUBOX_X_API_KEY` por `Secret Manager -> env fallback`, y envía `Accept` explícito para descargas `pdf/xml`.
- Esto reduce fallos `401` en staging cuando el detalle intentaba descargar PDF/XML por el carril proxy aun teniendo URLs directas ya disponibles.

## Delta 2026-03-30 Finance read identity drift hardening

- `GET /api/finance/income` y `GET /api/finance/expenses` ahora resuelven filtros de cliente contra el contexto canónico antes de consultar Postgres o BigQuery fallback.
- `income` deja de depender internamente de la equivalencia ad hoc `clientProfileId -> hubspot_company_id`; el filtro usa anclas canónicas resueltas.
- Se preserva compatibilidad transicional para `GET /api/finance/income`: si un caller legacy sigue mandando `clientProfileId` usando en realidad un `hubspotCompanyId`, el handler reintenta esa lectura como alias legacy en vez de romperla.
- `expenses` ahora acepta `clientProfileId` y `hubspotCompanyId` como filtros de lectura, resolviéndolos a `clientId` canónico sin cambiar el modelo operativo de `expenses`.

## Delta 2026-03-30 Finance aggregates ya no usan client_profile_id como client_id

- `computeClientEconomicsSnapshots()` y `computeOperationalPl()` ya no agrupan revenue con `COALESCE(client_id, client_profile_id)`.
- El runtime ahora traduce ingresos legacy `profile-only` vía `greenhouse_finance.client_profiles` para resolver `client_id` canónico antes de agregar métricas financieras.
- Impacto: `client_economics` y `operational_pl` dejan de tratar `client_profile_id` como si fuera la llave de cliente comercial, pero siguen incorporando ingresos históricos cuando el profile mapea a un `client_id` real.

## Delta 2026-03-30 Finance clients and campaigns canonized on client_id

- `GET /api/finance/clients` y `GET /api/finance/clients/[id]` ya calculan receivables e invoices por `client_id` canónico, traduciendo incomes legacy vía `greenhouse_finance.client_profiles` cuando aplica.
- El fallback BigQuery de `Finance Clients` quedó alineado al mismo criterio, sin volver a tratar `client_profile_id` como llave comercial primaria.
- `getCampaignFinancials()` ya no usa `COALESCE(client_id, client_profile_id)` para revenue; ahora reancla ingresos al `client_id` canónico antes de calcular margen.

## Resumen

Proyecto base de Greenhouse construido sobre el starter kit de Vuexy para Next.js con TypeScript, App Router y MUI. El objetivo no es mantener el producto como template, sino usarlo como base operativa para evolucionarlo hacia el portal Greenhouse.

## Delta 2026-03-30 TASK-166 cerró el lifecycle real del flag de BigQuery writes en Finance

- `FINANCE_BIGQUERY_WRITE_ENABLED` ya no es solo documentación; ahora es un guard operativo real.
- Carriles cubiertos:
  - `POST /api/finance/income`
  - `POST /api/finance/expenses`
  - `PUT /api/finance/income/[id]`
  - `PUT /api/finance/expenses/[id]`
  - `POST /api/finance/income/[id]/payment`
  - `POST /api/finance/expenses/bulk`
  - `POST /api/finance/accounts`
  - `PUT /api/finance/accounts/[id]`
  - `POST /api/finance/exchange-rates`
  - `POST /api/finance/suppliers`
  - `PUT /api/finance/suppliers/[id]`
  - `POST /api/finance/clients`
  - `PUT /api/finance/clients/[id]`
  - `POST /api/finance/reconciliation`
  - `PUT /api/finance/reconciliation/[id]`
  - `POST /api/finance/reconciliation/[id]/match`
  - `POST /api/finance/reconciliation/[id]/unmatch`
  - `POST /api/finance/reconciliation/[id]/exclude`
  - `POST /api/finance/reconciliation/[id]/statements`
  - `POST /api/finance/reconciliation/[id]/auto-match`
- Regla vigente:
  - si PostgreSQL falla y `FINANCE_BIGQUERY_WRITE_ENABLED=false`, estas rutas responden `503` con `FINANCE_BQ_WRITE_DISABLED`
  - BigQuery queda como fallback transicional solo cuando el flag permanece activo
- Ajuste relevante:
  - `suppliers` ya es Postgres-first para writes y dejó de depender de BigQuery como path principal
  - `clients` ya es Postgres-first para `create/update/sync` vía `greenhouse_finance.client_profiles`
  - `GET /api/finance/clients` y `GET /api/finance/clients/[id]` también ya nacen desde PostgreSQL (`greenhouse_core`, `greenhouse_finance`, `greenhouse_crm`, `v_client_active_modules`)
  - BigQuery queda en `Finance Clients` solo como fallback explícito de compatibilidad, no como request path principal
- Guardrail nuevo:
  - `resolveFinanceClientContext()` ya no cae a BigQuery por cualquier excepción de PostgreSQL
  - el fallback solo se activa para errores clasificados como permitidos por `shouldFallbackFromFinancePostgres()`

## Delta 2026-03-30 UI/UX skill stack local reforzada

- Greenhouse ya no debe depender solo de skills globales de UI para frontend portal.
- Nuevo baseline canónico:
  - `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- La capa local de skills en `.codex/skills/*` ya debe tratar este baseline como fuente operativa para:
  - first-fold hierarchy
  - estado vacio/parcial/error
  - UX writing
  - accessibility basica
- Nueva skill local:
  - `greenhouse-ux-content-accessibility`
- Decisión operativa:
  - `greenhouse-ui-orchestrator` sigue resolviendo patron y target
  - `greenhouse-vuexy-ui-expert` y `greenhouse-portal-ui-implementer` ya deben endurecer copy, state design y accessibility con la baseline moderna

## Delta 2026-03-30 view governance ya forma parte de la arquitectura base

- El portal ya no debe interpretarse como acceso fino gobernado solo por `routeGroups`.
- Estado vigente:
  - broad access por `routeGroups`
  - fine-grained access por `authorizedViews` + `view_code`
- Persistencia canónica en `greenhouse_core`:
  - `view_registry`
  - `role_view_assignments`
  - `user_view_overrides`
  - `view_access_log`
- Superficie operativa:
  - `/admin/views`
- Regla para trabajo futuro:
  - nuevas superficies visibles del portal deberían evaluarse explícitamente como:
    - gobernables por `view_code`, o
    - rutas base transversales fuera del modelo
- Excepción explícita vigente:
  - `/home` queda fuera del modelo de `view_code`
  - sigue siendo landing base de internos vía `portalHomePath`

## Delta 2026-03-30 capability modules cliente ya forman parte del gobierno de vistas

- Los capability modules client-facing ya no deben leerse como navegación implícita derivada solo desde `routeGroups`.
- Nuevo access point gobernable:
  - `cliente.modulos`
- Regla operativa vigente:
  - menú de `Módulos` visible solo si la sesión conserva `cliente.modulos`
  - `/capabilities/[moduleId]` exige tanto ese `view_code` como la validación específica del módulo

## Delta 2026-03-30 person-first identity debe preservar carriles reactivos

- La institucionalización de identidad `person-first` no puede ejecutarse como reemplazo ciego de `client_user`.
- Contrato operativo vigente:
  - `identity_profile` = raíz humana canónica
  - `member` = faceta operativa para payroll, HR, ICO, capacity, People y serving por colaborador
  - `client_user` = principal de acceso para sesión, inbox, preferencias, overrides y auditoría user-scoped
- Carriles sensibles revisados:
  - outbox / webhook dispatch
  - notification recipients
  - projections de notifications
  - projections de finance / client economics
  - projections de ICO / person intelligence
- Regla para follow-ons como `TASK-141`:
  - no mutar silenciosamente payloads, recipient keys ni identifiers operativos (`identity_profile_id`, `member_id`, `user_id`)
  - resolver el grafo humano completo sin degradar consumers que hoy dependen de `member` o `user`

## Delta 2026-03-30 canonical person resolver ya tiene primer slice reusable

- `TASK-141` dejó de ser solo framing documental.
- Baseline técnica nueva:
  - `src/lib/identity/canonical-person.ts`
- El resolver shared ya puede publicar el grafo humano mínimo por:
  - `userId`
  - `memberId`
  - `identityProfileId`
- Shape institucional aplicada:
  - `identityProfileId`
  - `memberId`
  - `userId`
  - `eoId`
  - `displayName`
  - `canonicalEmail`
  - `portalAccessState`
  - `resolutionSource`
- Guardrail vigente:
  - esto no reemplaza stores `userId`-scoped ni serving `memberId`-scoped
  - expone el bridge canónico sin hacer cutover big bang

## Delta 2026-03-30 /admin/views ya expone bridge persona sin romper overrides

- `Admin Center > Vistas y acceso` sigue siendo compatible con:
  - `user_view_overrides`
  - `view_access_log`
  - `authorizedViews`
- Cambio aplicado:
  - el preview ya enriquece cada principal portal con:
    - `identityProfileId`
    - `memberId`
    - `portalAccessState`
    - `resolutionSource`
- Lectura operativa:
  - `/admin/views` todavía no es una surface persona-first cerrada
  - pero ya no depende ciegamente de leer `client_user` como si fuera la raíz humana
  - `TASK-140` queda como follow-on para el universo previewable y la UX completa de persona

## Delta 2026-03-30 TASK-141 ya tiene resolver shared conservador

- Greenhouse ya no depende solo de contrato documental para la lane `person-first`.
- Slice runtime nuevo:
  - `src/lib/identity/canonical-person.ts`
- Adopción inicial cerrada:
  - `src/lib/notifications/person-recipient-resolver.ts`
  - `src/lib/webhooks/consumers/notification-recipients.ts`
- Regla operativa de este slice:
  - el resolver shared expone simultáneamente `identityProfileId`, `memberId`, `userId`, `portalAccessState` y `resolutionSource`
  - notifications sigue privilegiando `userId` como recipient key efectiva cuando existe principal portal
  - el carril no cambia todavía `/admin/views`, outbox payloads ni projections member-scoped

## Delta 2026-03-30 TASK-134 ya comparte recipients role-based sobre el contrato persona-first

- Notifications ya no mantiene dos lecturas distintas de recipients role-based entre projections y webhook consumers.
- Nuevo baseline shared:
  - `src/lib/notifications/person-recipient-resolver.ts`
    - `getRoleCodeNotificationRecipients(roleCodes)`
- Adopción inicial cerrada:
  - `src/lib/sync/projections/notifications.ts`
  - `src/lib/webhooks/consumers/notification-recipients.ts`
- Guardrail vigente:
  - inbox, preferencias y notificaciones persistidas siguen `userId`-scoped
  - dedupe y `notification_log.user_id` siguen dependiendo de `buildNotificationRecipientKey()`
  - el cut elimina drift de mapping, no cambia recipient keys ni semántica de delivery

## Delta 2026-03-30 TASK-134 quedó cerrada como contrato transversal de Notifications

- Greenhouse Notifications ya no tiene deuda estructural abierta entre identidad humana y delivery portal.
- Contrato vigente:
  - resolución humana `person-first`
  - `identity_profile` como raíz humana
  - `member` como faceta operativa cuando el evento nace desde colaboración/payroll
  - `userId` preservado como llave operativa para inbox, preferencias, auditoría y recipient key efectiva
- Regla para follow-ons:
  - nuevos consumers UX-facing o webhook-based deben nacer sobre este contrato shared
  - no reintroducir mappings `client_user-first` ni reinterpretar `notification_log.user_id` como FK estricta a portal user

## Delta 2026-03-30 TASK-141 quedó cerrada como baseline institucional

- La lane `canonical person identity consumption` ya no queda abierta como framing.
- Estado resultante:
  - `identity_profile` queda institucionalizado como raíz humana canónica
  - `member` sigue siendo la llave operativa fuerte para payroll, capacity, finance serving, ICO y costos
  - `client_user` sigue siendo principal de acceso para sesión, inbox, preferencias, overrides y auditoría
- Los siguientes cortes ya no deben reabrir este contrato:
  - `TASK-140` consume el bridge para completar `/admin/views` person-first
  - `TASK-134` endurece notifications sobre el resolver shared
  - `TASK-162` construye costo comercial canónico encima de esta separación explícita

## Delta 2026-03-30 `/admin/views` ya consume persona previewable

- `Admin Center > Vistas y acceso` ya no selecciona conceptualmente solo un `client_user`.
- Slice vigente:
  - el universo previewable se agrupa por persona canónica cuando existe `identityProfileId`
  - el fallback sigue siendo un principal portal aislado cuando el bridge humano está degradado
- Invariante preservada:
  - `userId` sigue siendo la llave operativa para overrides, auditoría de vistas y `authorizedViews`
  - el cut es persona-first para lectura y preview, no un reemplazo big bang del principal portal

## Delta 2026-03-30 runtime Postgres más resiliente a fallos TLS transitorios

- `src/lib/postgres/client.ts` ya no deja cacheado indefinidamente un pool fallido.
- Cambios operativos:
  - si `buildPool()` falla, el singleton se limpia para permitir recovery en el siguiente intento
  - si `pg` emite errores de conexión/TLS, el pool y el connector se resetean
  - queries y transacciones reintentan una vez para errores retryable como `ssl alert bad certificate`
- Lectura práctica:
  - esto no reemplaza el diagnóstico de infraestructura si Cloud SQL o el connector siguen fallando
  - sí evita que un handshake roto quede pegado en un runtime caliente y multiplique alertas innecesarias

## Delta 2026-03-30 Cost Intelligence foundation bootstrap

- Greenhouse ya reconoce `cost_intelligence` como domain soportado del projection registry.
- Base técnica nueva:
  - schema `greenhouse_cost_intelligence`
  - `period_closure_config`
  - `period_closures`
  - serving tables `greenhouse_serving.period_closure_status` y `greenhouse_serving.operational_pl_snapshots`
- Event catalog ya reserva el prefijo `accounting.*` para:
  - `accounting.period_closed`
  - `accounting.period_reopened`
  - `accounting.pl_snapshot.materialized`
  - `accounting.margin_alert.triggered`
- Route nueva:
  - `/api/cron/outbox-react-cost-intelligence`
- Decisión operativa actual:
  - el dominio ya puede procesarse de forma dedicada
  - el smoke local autenticado del path dedicado ya responde `200`
  - el scheduling fino puede seguir temporalmente apoyado en el catch-all `outbox-react` mientras no existan projections registradas; ya no por un bloqueo técnico del runtime, sino por secuenciación de rollout
- Regla nueva de continuidad:
  - `TASK-068` y `TASK-069` deben mantenerse consistentes con `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - Cost Intelligence no debe redefinir un P&L paralelo; debe materializar y agregar la semántica financiera canónica ya definida en Finance

## Delta 2026-03-30 TASK-068 period closure status ya tiene primer slice real

- Cost Intelligence ya no tiene solo foundation; ahora existe un carril operativo inicial para cierre de período:
  - `checkPeriodReadiness()`
  - `closePeriod()` / `reopenPeriod()`
  - projection `period_closure_status`
  - APIs bajo `/api/cost-intelligence/periods/**`
- Decisión semántica actual para readiness mensual:
  - ingreso por `greenhouse_finance.income.invoice_date`
  - gasto por `COALESCE(document_date, payment_date)`
  - FX por `greenhouse_finance.exchange_rates.rate_date`
  - payroll gating por `greenhouse_payroll.payroll_periods.status`
- Ajuste de continuidad aplicado:
  - el período ya se resuelve además contra el calendario operativo compartido de Greenhouse
  - `checkPeriodReadiness()` expone timezone/jurisdicción, ventana operativa y último día hábil del mes objetivo
  - `listRecentClosurePeriods()` garantiza incluir el mes operativo actual aunque todavía no existan señales materializadas en Finance/Payroll
- Estado actual:
  - task cerrada para su alcance
  - smoke reactivo end-to-end validado con `pnpm smoke:cost-intelligence:period-closure`
  - el remanente real ya no es de wiring/runtime; cualquier mejora futura cae como follow-on semántico, no como blocker del carril

## Delta 2026-03-30 TASK-069 operational_pl ya tiene primer slice materializado

- Cost Intelligence ya no depende solo de `client_economics` on-read para economics agregada.
- Nuevo carril implementado:
  - `computeOperationalPl()` materializa snapshots en `greenhouse_serving.operational_pl_snapshots`
  - scopes soportados: `client`, `space`, `organization`
  - APIs:
    - `/api/cost-intelligence/pl`
    - `/api/cost-intelligence/pl/[scopeType]/[scopeId]`
- Contrato aplicado:
  - revenue por client = net revenue (`total_amount_clp - partner_share`)
  - labor cost desde `client_labor_cost_allocation`
  - overhead desde `member_capacity_economics`
  - `period_closed` y `snapshot_revision` desde `period_closure_status`
  - anti-doble-conteo: `direct_expense` excluye `expenses.payroll_entry_id`
- Integraciones nuevas:
  - projection reactiva `operational_pl` dentro del domain `cost_intelligence`
  - `notification_dispatch` ya escucha `accounting.margin_alert.triggered`
  - `materialization-health` ya observa `operational_pl_snapshots`
- Estado actual:
  - task abierta todavía
  - el remanente principal ahora son consumers downstream (`TASK-071`) y hardening semántico, no wiring base

## Delta 2026-03-30 TASK-069 smoke reactivo E2E validado

- `operational_pl` ya quedó validada también en runtime reactivo real.
- Nuevo smoke reusable:
  - `pnpm smoke:cost-intelligence:operational-pl`
- Evidencia real del carril:
  - evento sintético `finance.income.updated`
  - handler `operational_pl:finance.income.updated` sin error en `outbox_reactive_log`
  - snapshots materializados en `greenhouse_serving.operational_pl_snapshots`
  - eventos `accounting.pl_snapshot.materialized` publicados
- Estado actual:
  - el carril base `outbox -> operational_pl` ya no está pendiente
  - lo siguiente con más valor es consumers downstream y hardening semántico

## Delta 2026-03-30 Finance Intelligence ya usa Cost Intelligence como surface principal

- `/finance/intelligence` ya no usa `ClientEconomicsView` como portada principal del módulo.
- Nueva surface activa:
  - `FinancePeriodClosureDashboardView`
- Capacidades visibles ya integradas en la UI:
  - hero y KPIs de cierre operativo
  - tabla de últimos 12 períodos con semáforos por pata
  - P&L inline expandible por cliente
  - cierre manual y reapertura con control por rol
- Regla operativa:
  - `finance_manager` y `efeonce_admin` pueden cerrar períodos listos
  - solo `efeonce_admin` puede reabrir períodos cerrados
- Estado:
  - implementación técnica ya validada con `eslint`, `tsc` y `build`
  - validación visual todavía pendiente antes de declarar `TASK-070` cerrada

## Delta 2026-03-30 Cost Intelligence ya tiene baseline cerrada como módulo

- Cost Intelligence ya no debe leerse como una lane experimental separada, sino como módulo operativo con baseline implementada.
- Estado consolidado:
  - `TASK-067` cerrada: foundation técnica
  - `TASK-068` cerrada: cierre de período
  - `TASK-069` cerrada: P&L operativo materializado
  - `TASK-070` en implementación avanzada: UI principal de Finance ya sobre el módulo
- Contrato canónico vigente:
  - serving base:
    - `greenhouse_serving.period_closure_status`
    - `greenhouse_serving.operational_pl_snapshots`
  - auth:
    - lectura para `finance` y `efeonce_admin`
    - cierre para `finance_manager` y `efeonce_admin`
    - reapertura solo para `efeonce_admin`
- Siguiente ola explícita:
  - `TASK-071` como consumers distribuidos en Agency, Org 360, People 360 y Home/Nexa

## Delta 2026-03-30 TASK-071 ya tiene primer cutover de consumers distribuidos

- Cost Intelligence ya no vive solo en `/finance/intelligence`; el serving materializado empezó a alimentar consumers existentes del portal.
- Estado real del cutover:
  - Agency lee `operational_pl_snapshots` para el resumen financiero de `SpaceCard`
  - Organization 360 (`Rentabilidad`) ya es serving-first con fallback al compute legacy
  - People 360 ya expone `latestCostSnapshot` con closure awareness en `PersonFinanceTab`
  - `FinanceImpactCard` de People HR Profile ya muestra período y estado de cierre
  - Home ya puede resolver un `financeStatus` resumido para roles internos/finance y usarlo en `OperationStatus`
- Remanente explícito de la lane:
  - endurecer fallback semantics
  - validación visual real
  - el resumen ya también entra a Nexa `lightContext`
  - sigue pendiente solo validación visual/cierre limpio de la lane

## Delta 2026-03-30 Cost Intelligence documentado end-to-end

- La documentación viva del repo ya refleja Cost Intelligence como módulo operativo transversal, no como lane aislada.
- Capas ya explicitadas en arquitectura:
  - foundation técnica (`TASK-067`)
  - period closure (`TASK-068`)
  - operational P&L (`TASK-069`)
  - finance UI principal (`TASK-070`)
  - consumers distribuidos (`TASK-071`)
- Finance conserva ownership del motor financiero central.
- Cost Intelligence queda formalizado como layer de management accounting, closure awareness y serving distribuido hacia Agency, Organization 360, People 360, Home y Nexa.

## Delta 2026-03-30 Cost Intelligence visual validation found a display-only date bug

- La validación visual real de `/finance/intelligence` confirmó que `lastBusinessDayOfTargetMonth` sí viene del calendario operativo compartido.
- El bug detectado fue de render y timezone:
  - la UI parseaba fechas `YYYY-MM-DD` con `new Date(...)`
  - eso corría el “último día hábil” un día hacia atrás en algunos períodos
- El fix quedó aplicado en `FinancePeriodClosureDashboardView` con parseo seguro para display.
- Con ese ajuste, el carril `TASK-070` queda todavía más cerca de cierre funcional real; el remanente ya es principalmente visual/UX, no de datos ni semántica operativa.

## Delta 2026-03-30 Cost Intelligence ya excluye assignments internos de la atribución comercial

- Se consolidó una regla canónica shared para assignments internos:
  - `space-efeonce`
  - `efeonce_internal`
  - `client_internal`
- Esa regla ya se reutiliza en:
  - `Agency > Team`
  - `member_capacity_economics`
  - `auto-allocation-rules`
  - `client_labor_cost_allocation`
  - `computeOperationalPl()`
- Decisión operativa:
  - la carga interna sigue siendo válida para operación/capacity
  - no debe competir como cliente comercial en labor cost ni en snapshots de Cost Intelligence
- Ajuste técnico asociado:
  - `greenhouse_runtime` necesita `DELETE` acotado sobre `greenhouse_serving.operational_pl_snapshots`
  - se usa solo para purgar snapshots obsoletos de la misma revisión antes del upsert vigente

## Delta 2026-03-30 Commercial cost attribution queda definida como capa canónica

- Greenhouse ya no debe leer la atribución comercial de costos como lógica repartida entre Payroll, Team Capacity, Finance y Cost Intelligence.
- Decisión acordada:
- existe una capa canónica explícita de `commercial cost attribution`
- la fuente canónica del contrato vive en `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- primer slice shared ya implementado:
  - `src/lib/commercial-cost-attribution/assignment-classification.ts`
  - clasifica assignments en:
    - `commercial_billable`
    - `commercial_non_billable`
    - `internal_operational`
    - `excluded_invalid`
- estado actual del dominio:
  - `client_labor_cost_allocation` sigue siendo el bridge laboral histórico
  - `member_capacity_economics` sigue siendo la fuente reusable de labor cost cargado + overhead por miembro
  - `src/lib/commercial-cost-attribution/member-period-attribution.ts` ya actúa como capa intermedia canónica on-read por `member_id + período`
  - `src/lib/cost-intelligence/compute-operational-pl.ts` ya consume esa capa intermedia en vez de mezclar directamente labor bridge + overhead query local
  - `src/lib/finance/postgres-store-intelligence.ts` y `src/lib/account-360/organization-economics.ts` también ya consumen esa capa intermedia
  - `src/lib/commercial-cost-attribution/store.ts` ya materializa la truth layer inicial en `greenhouse_serving.commercial_cost_attribution`
  - `member-period-attribution.ts` hace serving-first con fallback a recompute
  - `materializeOperationalPl()` ya rematerializa primero esta capa y luego el P&L operativo
  - `src/lib/sync/projections/commercial-cost-attribution.ts` ya hace refresh reactivo dedicado y publica `accounting.commercial_cost_attribution.materialized`
  - `src/lib/commercial-cost-attribution/insights.ts` ya expone health semántico y explain por cliente/período
  - APIs disponibles:
    - `/api/cost-intelligence/commercial-cost-attribution/health`
    - `/api/cost-intelligence/commercial-cost-attribution/explain/[year]/[month]/[clientId]`
  - `/api/cron/materialization-health` ya observa freshness de `commercial_cost_attribution`
  - el siguiente remanente es endurecer policy/UX de observabilidad y decidir cierre formal de la lane
  - Payroll, Team Capacity y Finance siguen calculando sus piezas de dominio
  - la verdad consolidada de costo comercial sale de una sola capa shared
  - esa capa alimenta primero a:
    - Finance
    - Cost Intelligence
  - y desde ahí a consumers derivados:
    - Agency
    - Organization 360
    - People
    - Home
    - Nexa
    - futuros Service P&L / Campaign bridges
- Task canónica abierta:
  - `TASK-162`

## Delta 2026-03-30 TASK-162 queda cerrada como baseline canónica de atribución comercial

- La lane `commercial cost attribution` ya no queda abierta como framing o implementación parcial.
- Estado resultante:
  - `greenhouse_serving.commercial_cost_attribution` queda institucionalizada como truth layer materializada
  - `operational_pl_snapshots` sigue como serving derivado para margen/rentabilidad por scope
  - `member_capacity_economics` sigue como serving derivado para costo/capacidad por miembro
  - `client_labor_cost_allocation` queda acotado a bridge/input interno del materializer y provenance histórica
- Corte final aplicado:
  - `src/lib/person-360/get-person-finance.ts` ya no lee el bridge legacy
  - `src/lib/finance/payroll-cost-allocation.ts` ya resume la capa canónica/shared
- Regla para follow-ons:
  - lanes como `TASK-143`, `TASK-146`, `TASK-147` y `TASK-160` no deben reintroducir lecturas directas del bridge legacy
  - si necesitan explain comercial deben apoyarse en `commercial_cost_attribution`

## Delta 2026-03-30 Sentry incident reader hardening

- `Ops Health` ya distingue entre el token de build/source maps y el token de lectura de incidentes.
- Nuevo contrato soportado:
  - `SENTRY_INCIDENTS_AUTH_TOKEN`
  - `SENTRY_INCIDENTS_AUTH_TOKEN_SECRET_REF`
- `src/lib/cloud/observability.ts` intenta leer incidentes con `SENTRY_INCIDENTS_AUTH_TOKEN` primero y solo cae a `SENTRY_AUTH_TOKEN` como compatibilidad transicional.
- Si Sentry responde `401/403`, la UI mantiene degradación fail-soft pero con mensaje accionable:
  - el token no tiene permisos para leer incidentes
  - el reader requiere un token con scope `event:read`
- Decisión operativa:
  - `SENTRY_AUTH_TOKEN` sigue siendo el token principal de build/source maps
- `SENTRY_INCIDENTS_AUTH_TOKEN` pasa a ser el canal recomendado para `Ops Health`

## Delta 2026-03-30 Finance hardening ya conecta retry DTE con emisión real

- El carril de `TASK-139` ya no deja la cola DTE como stub operativo.
- Estado vigente:
  - `greenhouse_finance.dte_emission_queue` preserva `dte_type_code`
  - `/api/cron/dte-emission-retry` reintenta con `emitDte()` real
  - las rutas de emisión encolan fallos retryable para recuperación posterior
- Lectura operativa:
  - el retry DTE ya es un mecanismo real de resiliencia
  - `FINANCE_BIGQUERY_WRITE_ENABLED` sigue siendo un follow-on de lifecycle/cutover, no un bloqueo funcional del hardening base

## Delta 2026-03-30 arranca el cutover real de writes legacy de Finance

- El flag `FINANCE_BIGQUERY_WRITE_ENABLED` ya no queda solo documentado.
- Slice inicial activo:
  - `src/lib/finance/bigquery-write-flag.ts`
  - `POST /api/finance/income`
  - `POST /api/finance/expenses`
- Regla vigente:
  - si PostgreSQL falla y el flag está en `false`, esas rutas fallan cerrado con `FINANCE_BQ_WRITE_DISABLED`
  - si el flag está en `true`, el fallback BigQuery actual sigue disponible como compatibilidad transicional
- Lane nueva:
  - `TASK-166`

## Delta 2026-03-29 notifications identity model

- El sistema de notificaciones ya no debe leerse como `client_user-first`.
- Contrato canónico vigente:
  - `identity_profile` = raíz de persona
  - `member` = faceta operativa fuerte para HR/Payroll/Assignments
  - `client_user` = acceso portal, inbox y preferencias
- `src/lib/notifications/person-recipient-resolver.ts` centraliza la resolución compartida para:
  - `identityProfileId`
  - `memberId`
  - `userId`
  - fallback `email-only`
- `TASK-117` y `TASK-129` ya consumen este patrón; el follow-on transversal queda formalizado en `TASK-134`.

## Delta 2026-03-29 TASK-117 auto-cálculo mensual de payroll

- Payroll ya formaliza el hito mensual para dejar el período oficial en `calculated` el último día hábil del mes operativo.
- Contratos nuevos o endurecidos:
  - `getLastBusinessDayOfMonth()` / `isLastBusinessDayOfMonth()`
  - `getPayrollCalculationDeadlineStatus()`
  - `runPayrollAutoCalculation()`
  - `GET /api/cron/payroll-auto-calculate`
- `PayrollPeriodReadiness` ahora separa `calculation` y `approval`.
- `payroll_period.calculated` ya puede notificar a stakeholders operativos por el dominio reactivo `notifications` bajo la categoría `payroll_ops`.

## Delta 2026-03-29 TASK-133 observability incidents en Ops Health

- El dominio Cloud ya separa dos capas de observability:
  - `posture/configuración` en `getCloudObservabilityPosture()`
  - `incidentes Sentry abiertos/relevantes` en `getCloudSentryIncidents()`
- `getOperationsOverview()` ahora proyecta:
  - `cloud.observability.posture`
  - `cloud.observability.incidents`
- `GET /api/internal/health` expone también `sentryIncidents` como snapshot fail-soft machine-readable.
- `Ops Health` y `Cloud & Integrations` ya pueden mostrar errores runtime detectados por Sentry sin degradar el `overallStatus` base del health interno.
- Decisión arquitectónica explícita:
  - incidentes Sentry no reescriben la semántica del control plane health
  - siguen siendo señal operativa adicional, no fuente del semáforo runtime/posture

## Delta 2026-03-29 TASK-129 validada en production

- `main` ya incluye el consumer institucional de notificaciones via webhook bus.
- `production` quedó validada con delivery firmada real sobre:
  - `POST /api/internal/webhooks/notification-dispatch`
- Evidencia operativa confirmada:
  - `eventId=evt-prod-final-1774830739019`
  - notificación `assignment_change` persistida para `user-efeonce-admin-julio-reyes`
- Estado vigente del carril:
  - `staging` y `production` consumen el secreto de firmas vía Secret Manager
  - `production` ya no está bloqueada por ausencia del route en `main`

## Delta 2026-03-29 TASK-129 hardening final en staging

- `staging` ya opera `webhook notifications` sin `WEBHOOK_NOTIFICATIONS_SECRET` crudo en Vercel.
- Postura vigente del carril:
  - firma HMAC resuelta por `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF`
  - secreto canónico servido desde GCP Secret Manager
  - alias estable `dev-greenhouse.efeoncepro.com` como target del subscriber
- `src/lib/secrets/secret-manager.ts` ahora sanitiza secuencias literales `\\n` / `\\r` en variables `*_SECRET_REF`, endureciendo el contrato frente a drift de export/import de env vars.

## Delta 2026-03-29 TASK-129 iniciada

- Greenhouse inicia un segundo carril institucional de notificaciones:
  - `reactive notifications` sigue como control plane legacy para eventos internos existentes
  - `webhook notifications` nace como consumer UX-facing del bus outbound
- Contratos nuevos en repo:
  - `POST /api/internal/webhooks/notification-dispatch`
  - `POST /api/admin/ops/webhooks/seed-notifications`
  - env/secret:
    - `WEBHOOK_NOTIFICATIONS_SECRET`
    - `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF`
    - `WEBHOOK_NOTIFICATIONS_VERCEL_PROTECTION_BYPASS_SECRET`
- Decisión arquitectónica explícita:
  - `TASK-129` no reemplaza `notification_dispatch`
  - el ownership se define por `eventType` para evitar duplicados
  - el self-loop del subscriber de notificaciones soporta bypass opcional de `Deployment Protection`, igual que el canary

## Delta 2026-03-29 TASK-129 env rollout preparado en Vercel

- `staging` y `production` ya tienen `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF=webhook-notifications-secret`.
- Postura operativa vigente:
  - `staging` mantiene además `WEBHOOK_NOTIFICATIONS_SECRET` como fallback transicional
  - `production` ya queda preparada para consumir Secret Manager con el secreto canónico verificado
- El seed de subscriptions de webhooks ya no debe persistir `VERCEL_URL` efímero:
  - `seed-canary` y `seed-notifications` prefieren el alias real del request (`x-forwarded-host`) cuando existe
- Los target builders de webhooks sanitizan también secuencias literales `\n`/`\r`, no solo whitespace, para evitar query params contaminados en `greenhouse_sync.webhook_subscriptions`.
- Validación real ya ejecutada en `staging`:
  - `assignment.created` visible en campanita para un usuario real
  - `payroll_period.exported` crea notificaciones `payroll_ready` para recipients resolubles del período
- Gap de datos detectado durante la validación:
  - había `client_users` activos sin `member_id`; en `staging` se enlazaron los internos con match exacto de nombre para permitir la resolución de recipients del carril webhook notifications.

## Delta 2026-03-29 TASK-131 cerrada

- El health cloud ya separa correctamente secretos runtime-críticos de secretos de tooling.
- `src/lib/cloud/secrets.ts` ahora clasifica los secretos tracked entre:
  - `runtime`
  - `tooling`
- `src/lib/cloud/health.ts` dejó de degradar `overallStatus` solo porque `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` o `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` estén ausentes en el runtime del portal.
- La visibilidad operativa se conserva vía:
  - `secrets.runtimeSummary`
  - `secrets.toolingSummary`
  - `postgresAccessProfiles`
- Decisión institucional reforzada:
  - el portal productivo no debe recibir credenciales `migrator/admin` solo para mejorar un semáforo de health
  - esos perfiles siguen siendo tooling/operación, no dependencias de serving

## Delta 2026-03-29 TASK-125 cerrada

- `TASK-125` quedó cerrada con validación E2E real en `staging`.
- Baseline operativo vigente:
  - `POST /api/admin/ops/webhooks/seed-canary` registra una subscription interna self-loop
  - el target del canary soporta bypass opcional de `Deployment Protection`
  - `WEBHOOK_CANARY_SECRET_SECRET_REF` ya sirve el secreto desde Secret Manager en `staging`
  - el primer consumer canónico usa `finance.income.nubox_synced` como familia activa de bajo riesgo
- Validación real ejecutada:
  - `eventsMatched=1`
  - `deliveriesAttempted=1`
  - `succeeded=1`
  - canary receipt `HTTP 200`
- Ajuste estructural derivado:
  - `src/lib/webhooks/dispatcher.ts` ahora prioriza eventos `published` más recientes dentro de la ventana de 24h, para evitar starvation de subscriptions recién activadas

## Delta 2026-03-29 TASK-102 cerrada

- `TASK-102` quedó cerrada con verificación externa completa.
- Evidencia final incorporada:
  - `PITR=true`
  - `transactionLogRetentionDays=7`
  - `log_min_duration_statement=1000`
  - `log_statement=ddl`
  - `staging` y `production` con `postgres.status=ok`, `usesConnector=true`, `sslEnabled=true`, `maxConnections=15`
  - slow query real visible en Cloud Logging
  - restore test exitoso vía clone efímero `greenhouse-pg-restore-test-20260329d`
- El clone de restore se verificó por SQL y luego se eliminó; no quedaron instancias temporales vivas.

## Delta 2026-03-29 TASK-102 casi cerrada

- `TASK-102` ya no está bloqueada por postura de Cloud SQL ni por rollout runtime.
- Validaciones externas ya confirmadas:
  - `PITR=true`
  - `transactionLogRetentionDays=7`
  - `log_min_duration_statement=1000`
  - `log_statement=ddl`
  - `sslMode=ENCRYPTED_ONLY`
  - `staging` y `production` con `postgres.status=ok`, `usesConnector=true`, `sslEnabled=true`, `maxConnections=15`
- `Cloud Logging` ya mostró una slow query real (`SELECT pg_sleep(1.2)` con `duration: 1203.206 ms`).
- Ese remanente ya quedó resuelto con un restore test limpio y documentado.

## Delta 2026-03-29 TASK-099 cerrada

- `TASK-099` ya quedó cerrada para el alcance baseline de hardening seguro.
- `src/proxy.ts` ahora materializa:
  - headers estáticos cross-cutting
  - `Strict-Transport-Security` solo en `production`
  - `Content-Security-Policy-Report-Only` como capa de observación no bloqueante
- Decisión operativa vigente:
  - el baseline de seguridad headers ya no depende de introducir `CSP` enforce
  - cualquier tightening posterior de `CSP` se considera mejora futura, no blocker del track cloud

## Delta 2026-03-29 TASK-099 re-scoped to the validated baseline

- `TASK-099` sigue `in-progress`, pero ya no debe interpretarse como si el repo tuviera `Content-Security-Policy`.
- Estado real consolidado:
  - `src/proxy.ts` ya aplica headers estáticos cross-cutting
  - `Strict-Transport-Security` ya se limita a `production`
  - el matcher ya evita `_next/*` y assets estáticos
- Lo pendiente de la lane es solo `CSP`, que se mantiene diferida por riesgo sobre:
  - MUI/Emotion
  - OAuth
  - uploads/assets
- Decisión operativa vigente:
  - no cerrar `TASK-099` en falso
  - no introducir `CSP` sin rollout controlado tipo `Report-Only` o equivalente

## Delta 2026-03-29 Observability MVP cerrada

- `TASK-098` quedó cerrada tras validación en `staging` y `production`.
- `production` ya valida:
  - `observability.sentry.enabled=true`
  - `observability.slack.enabled=true`
  - `postureChecks.observability.status=ok`
- Deployment productivo validado:
  - commit `bcbd0c3`
  - deployment `dpl_5fyHqra7AgV865QmHSuZ2iqYWcYk`
  - `GET /api/auth/session` responde `{}` sin regresión visible de auth
- La recomendación pendiente es solo operativa:
  - rotar el webhook de Slack expuesto en una captura previa

## Delta 2026-03-29 Observability MVP operativa en staging

- `TASK-098` ya quedó validada end-to-end en `staging`.
- Señales confirmadas:
  - `GET /api/internal/health` devuelve `observability.summary=Sentry runtime + source maps listos · Slack alerts configuradas`
  - `observability.sentry.enabled=true`
  - `observability.slack.enabled=true`
- Validación operativa adicional ya ejecutada:
  - smoke real de Slack con respuesta `HTTP 200`
  - smoke real de Sentry con issue visible en el dashboard del proyecto `javascript-nextjs`
- El remanente real de `TASK-098` ya no está en repo ni en `staging`, sino en replicar el rollout a `production/main`.

## Delta 2026-03-29 Slack alerts Secret Manager-ready

- `TASK-098` extendió el patrón de `TASK-124` a `SLACK_ALERTS_WEBHOOK_URL`.
- Nuevo contrato soportado:
  - `SLACK_ALERTS_WEBHOOK_URL`
  - `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`
- `src/lib/alerts/slack-notify.ts` ahora resuelve el webhook vía helper canónico y `GET /api/internal/health` ya refleja esa postura real.
- Decisión de borde explícita para mantener este lote seguro:
  - `CRON_SECRET` sigue `env-only`
  - `SENTRY_AUTH_TOKEN` sigue `env-only` en build
  - `SENTRY_DSN` se mantiene como config runtime/env

## Delta 2026-03-29 Sentry minimal runtime baseline

- `TASK-098` ya no está solo en posture interna: el repo ahora incluye el wiring mínimo de `@sentry/nextjs` para App Router.
- Archivos canónicos del slice:
  - `next.config.ts`
  - `src/instrumentation.ts`
  - `src/instrumentation-client.ts`
  - `sentry.server.config.ts`
  - `sentry.edge.config.ts`
- Contrato ambiental actualizado:
  - `SENTRY_DSN` o `NEXT_PUBLIC_SENTRY_DSN` habilitan runtime error tracking
  - `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` habilitan readiness de source maps
- El wiring es fail-open:
  - si no existe DSN, Sentry no inicializa
  - no cambia rutas ni contrato HTTP del portal
- `develop/staging` ya evolucionó desde ese baseline y hoy la observabilidad externa está operativa.
- El rollout externo pendiente ya quedó concentrado en `production/main`.

## Delta 2026-03-29 Observability posture baseline

- `TASK-098` quedó iniciada con un slice mínimo y reversible de contrato.
- `GET /api/internal/health` ahora proyecta también `observability`, con postura de:
  - `SENTRY_DSN`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SLACK_ALERTS_WEBHOOK_URL`
- La capa canónica vive en `src/lib/cloud/observability.ts`.
- El contrato del health interno ahora separa:
  - `runtimeChecks`
  - `postureChecks`
  - `overallStatus`
  - `summary`
- El payload también proyecta `postgresAccessProfiles` para distinguir:
  - credencial runtime del portal
  - perfiles `migrator` y `admin` de tooling/operación
- `503` sigue reservado para fallos reales de runtime; la postura incompleta solo degrada señal operativa.
- El wiring mínimo de `@sentry/nextjs` ya existe.
- El adapter `src/lib/alerts/slack-notify.ts` y los hooks base de cron ya existen; el remanente de Slack es cargar `SLACK_ALERTS_WEBHOOK_URL` y validar envíos reales.

## Delta 2026-03-29 Security headers proxy baseline

- `TASK-099` quedó iniciada con un `proxy.ts` mínimo de headers estáticos.
- La primera versión de `src/proxy.ts`:
  - no implementa auth
  - no centraliza guards de API
  - no aplica todavía `Content-Security-Policy`
- Objetivo del slice: sumar protección cross-cutting barata y reversible sin romper MUI, OAuth ni assets estáticos.

## Delta 2026-03-29 Secret Manager validado en staging + production

- `develop` absorbió `TASK-124` en `497cb19` y `main` absorbió el slice mínimo en `7238a90`.
- `staging` ya ejecuta `497cb19` y `/api/internal/health` confirmó resolución real por Secret Manager para:
  - `GREENHOUSE_POSTGRES_PASSWORD`
  - `NEXTAUTH_SECRET`
  - `AZURE_AD_CLIENT_SECRET`
  - `NUBOX_BEARER_TOKEN`
- `production` ya ejecuta `7238a90` y confirmó por `/api/internal/health`:
  - `GREENHOUSE_POSTGRES_PASSWORD`
  - `NEXTAUTH_SECRET`
  - `AZURE_AD_CLIENT_SECRET`
  - `NUBOX_BEARER_TOKEN`
- `greenhouse.efeoncepro.com/api/auth/session` respondió `200` con body `{}`.
- Estado transicional todavía explícito:
  - `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` y `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` no están proyectados en runtime `staging`
  - el fallback legacy a env var sigue existiendo por compatibilidad durante la transición

## Delta 2026-03-29 Secret Manager helper baseline

- `TASK-124` ya inició implementación real con un helper canónico en `src/lib/secrets/secret-manager.ts`.
- Nuevo contrato base para secretos críticos:
  - env var legacy: `<ENV_VAR>`
  - secret ref opcional: `<ENV_VAR>_SECRET_REF`
  - resolución runtime: `Secret Manager -> env fallback -> unconfigured`
- El helper usa `@google-cloud/secret-manager`, cache corta y no expone valores crudos en logs.
- Regla vigente ampliada tras `ISSUE-032`:
  - también sanea payloads quoted/contaminados (`\"secret\"`, `secret\\n`) antes de entregarlos al runtime
  - ese saneamiento no reemplaza la higiene operativa del secreto en origen; solo evita que un payload sucio vuelva a romper el consumer
- `GET /api/internal/health` ahora proyecta postura de secretos críticos bajo `secrets.summary` y `secrets.entries`, sin devolver valores.
- Primer consumer migrado al patrón:
  - `src/lib/nubox/client.ts` ahora resuelve `NUBOX_BEARER_TOKEN` vía helper con fallback controlado
- Postgres también quedó alineado al patrón:
  - `src/lib/postgres/client.ts` ahora acepta `GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF`
  - `scripts/lib/load-greenhouse-tool-env.ts` ya soporta refs equivalentes para `runtime`, `migrator` y `admin`
- Auth también quedó alineado al patrón:
  - `NEXTAUTH_SECRET`
  - `AZURE_AD_CLIENT_SECRET`
  - `GOOGLE_CLIENT_SECRET`
    resuelven vía `src/lib/auth-secrets.ts`
- Validación operativa local ya ejecutada:
  - `pnpm pg:doctor --profile=runtime`
- Estado pendiente explícito:
  - falta validación real en `staging` y `production` con secretos servidos desde Secret Manager

## Delta 2026-03-29 WIF preview validation + non-prod environment drift

- El preview redeployado de `feature/codex-task-096-wif-baseline` quedó validado en Vercel con health real:
  - `version=7638f85`
  - `auth.mode=wif`
  - BigQuery reachable
  - Cloud SQL reachable vía connector usando `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-group:us-east4:greenhouse-pg-dev`
- Para que ese preview fuera validable hubo que completar un env set mínimo de branch:
  - `GCP_PROJECT`
  - `GREENHOUSE_POSTGRES_DATABASE`
  - `GREENHOUSE_POSTGRES_USER`
  - `GREENHOUSE_POSTGRES_PASSWORD`
- Drift operativo verificado el 2026-03-29:
  - las env vars activas del rollout WIF/conector ya quedaron saneadas en `development`, `staging`, `production`, `preview/develop` y `preview/feature/codex-task-096-wif-baseline`
  - `dev-greenhouse.efeoncepro.com` quedó confirmado como `target=staging`
  - tras redeploy del staging activo, `/api/internal/health` respondió con `version=7a2ecec`, `auth.mode=mixed` y `usesConnector=true`
- Regla operativa derivada:
  - no desplegar la feature branch al entorno compartido solo para cerrar `TASK-096`
  - no endurecer Cloud SQL externo ni retirar la SA key hasta que `develop` absorba este baseline y `staging` quede validado con WIF final

## Delta 2026-03-29 Home landing cutover baseline

- `TASK-119` quedó cerrada sobre la policy de landing del portal.
- Nuevo contrato base:
  - usuarios internos/admin sin override explícito aterrizan por defecto en `/home`
  - roles funcionales siguen priorizando su landing especializada (`/hr/payroll`, `/finance`, `/my`) antes del fallback general
- `Control Tower` deja de funcionar como home implícito de internos y el patrón heredado queda absorbido por `Admin Center`.
- `portalHomePath` sigue siendo el contrato canónico de aterrizaje, pero su fallback institucional para `efeonce_internal` ya no es `/internal/dashboard`, sino `/home`.
- El runtime también normaliza sesiones legadas: si `NextAuth` o un registro viejo trae `'/internal/dashboard'` como home interno, el resolver canónico lo reescribe a `'/home'` antes de hidratar `session.user.portalHomePath`.

## Delta 2026-03-29 Nexa backend persistence and thread runtime

- `TASK-114` quedó cerrada con persistencia operativa para Nexa en PostgreSQL bajo `greenhouse_ai`.
- El runtime ahora materializa:
  - `nexa_threads`
  - `nexa_messages`
  - `nexa_feedback`
- `/api/home/nexa` ya persiste conversación, retorna `threadId` y genera `suggestions` post-respuesta.
- `src/lib/nexa/store.ts` valida readiness de las tablas, pero no intenta hacer DDL con el usuario `runtime`; la migración canónica vive en `scripts/migrations/add-nexa-ai-tables.sql`.
- Se agregaron endpoints dedicados para feedback e historial de threads que destraban la UI pendiente de `TASK-115`.

## Delta 2026-03-29 Release channels y changelog client-facing

- Greenhouse formalizo un operating model de release channels en `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`.
- Regla vigente:
  - el release se comunica principalmente por modulo o feature visible, no solo por plataforma completa
  - cada capacidad puede declararse `alpha`, `beta`, `stable` o `deprecated`
  - el canal no equivale automaticamente a disponibilidad general; tambien debe distinguirse el scope (`internal`, `pilot`, `selected_tenants`, `general`)
- Versionado vigente:
  - producto y modulos visibles usan `CalVer + canal`
  - APIs y contratos tecnicos versionados usan `SemVer`
- El changelog client-facing quedo separado del changelog interno del repo y nace en `docs/changelog/CLIENT_CHANGELOG.md`.
- `Preview`, `Staging` y `Production` siguen siendo los ambientes tecnicos; los canales de release se apoyan en ellos pero no los reemplazan.

## Delta 2026-03-29 Cloud governance operating model

- `Cloud` quedó institucionalizado como dominio interno de platform governance, no como módulo client-facing nuevo.
- La base canónica vive en `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`.
- El dominio ahora queda explícitamente separado en:
  - shell de governance (`Admin Center`)
  - surface de inventory/freshness (`Cloud & Integrations`)
  - surface de incidentes (`Ops Health`)
  - contracts/helpers/runbooks para posture, resiliencia, cron y costos
- La baseline mínima en código vive en `src/lib/cloud/*`:
  - `health.ts` para health checks compartidos
  - `bigquery.ts` para guards base de costo
  - `cron.ts` para postura mínima de scheduler secret
- La conexión UI ya quedó materializada vía `getOperationsOverview()`:
  - `Admin Center`
  - `/admin/cloud-integrations`
  - `/admin/ops-health`
    consumen el bloque `cloud` como snapshot institucional del dominio.
- `TASK-100` a `TASK-103` ya se interpretan como slices del dominio Cloud y no como hardening aislado.

## Delta 2026-03-29 Cloud SQL resilience baseline in progress

- `TASK-102` ya aplicó la baseline principal de resiliencia sobre `greenhouse-pg-dev`.
- Estado real verificado:
  - `pointInTimeRecoveryEnabled=true`
  - `transactionLogRetentionDays=7`
  - flags `log_min_duration_statement=1000` y `log_statement=ddl`
- El runtime del portal también quedó alineado al nuevo pool target:
  - `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=15` en `Production`, `staging` y `Preview (develop)`
  - fallback por defecto del repo subido a `15`
- Ese remanente ya quedó resuelto después en la misma fecha con un restore test limpio y documentado sobre `greenhouse-pg-restore-test-20260329d`.

## Delta 2026-03-29 Cloud layer robustness expansion

- La capa `src/lib/cloud/*` ahora incorpora posture helpers reutilizables para el siguiente bloque `TASK-096` a `TASK-103`.
- Nuevas piezas institucionales:
  - `src/lib/cloud/gcp-auth.ts` para postura de autenticación GCP (`wif | service_account_key | mixed | unconfigured`)
  - `src/lib/cloud/postgres.ts` para postura runtime de Cloud SQL (`connector`, `ssl`, `pool`, riesgos)
  - `GET /api/internal/health` en `src/app/api/internal/health/route.ts`
  - `src/lib/alerts/slack-notify.ts` como adapter base de alertas operativas
- `getOperationsOverview()` ahora refleja también la postura de auth GCP y la postura de Cloud SQL, no solo reachability y cost guard.
- Los crons críticos del control plane (`outbox-publish`, `webhook-dispatch`, `sync-conformed`, `ico-materialize`, `nubox-sync`) ya tienen hook base de alerting Slack en caso de fallo.

## Delta 2026-03-29 TASK-096 cerrada

- `TASK-096` ya quedó cerrada para su alcance útil.
- Estado consolidado:
  - WIF/OIDC validado en `preview`, `staging` y `production`
  - Cloud SQL externo endurecido
  - Fase 3 de Secret Manager absorbida y cerrada por `TASK-124`

## Delta 2026-03-29 GCP credentials baseline WIF-aware in progress

- `TASK-096` quedó iniciada en el repo con baseline real en código; esta sesión trabajó sobre el estado actual de `develop`.
- El repo ahora resuelve autenticación GCP con un contrato explícito en `src/lib/google-credentials.ts`:
  - `wif` si existen `GCP_WORKLOAD_IDENTITY_PROVIDER` y `GCP_SERVICE_ACCOUNT_EMAIL`, y el runtime puede obtener un token OIDC de Vercel
  - `service_account_key` como fallback transicional
  - `ambient_adc` para entornos con credenciales implícitas
- Consumers alineados:
  - `src/lib/bigquery.ts`
  - `src/lib/postgres/client.ts`
  - `src/lib/storage/greenhouse-media.ts`
  - `src/lib/ai/google-genai.ts`
- Scripts operativos que seguían parseando `GOOGLE_APPLICATION_CREDENTIALS_JSON` manualmente también quedaron migrados al helper canónico.
- Nuevas variables de entorno documentadas para el rollout real:
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`
  - `GCP_PROJECT_NUMBER`
  - `GCP_WORKLOAD_IDENTITY_POOL_ID`
  - `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID`
  - `GCP_SERVICE_ACCOUNT_EMAIL`
- Estado externo ya materializado:
  - GCP project `efeonce-group`
  - Workload Identity Pool `vercel`
  - Provider `greenhouse-eo`
  - service account runtime actual vinculada: `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
  - bindings por entorno Vercel para `development`, `preview`, `staging` y `production`
- Validación de transición ya ejecutada:
  - BigQuery respondió con WIF sin SA key
  - Cloud SQL Connector respondió `SELECT 1` con WIF sin SA key usando `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-group:us-east4:greenhouse-pg-dev`
  - preview Vercel real `version=7638f85` quedó sano con `/api/internal/health`
- Restricción vigente:
  - el runtime actual no hace bigbang ni retira la SA key por defecto
  - staging/production siguen en postura transicional hasta que Vercel + GCP WIF queden validados en preview/staging reales y se limpie un drift detectado en variables Vercel que hoy agregan sufijos literales `\n`

## Delta 2026-03-28 Admin Center governance shell

- `/admin` dejó de ser un redirect ciego y ahora funciona como landing real de `Admin Center`.
- La navegación administrativa ya separa explícitamente `Admin Center`, `Cloud & Integrations` y `Ops Health` como surfaces de gobernanza dentro del shell admin.
- La señal operacional para esas vistas se resuelve desde una capa compartida `src/lib/operations/get-operations-overview.ts`, reutilizada también por `GET /api/agency/operations`.
- `Admin Center` indexa la observabilidad operativa y la separa del uso diario del producto; no reemplaza `Agency > Operations`, sino que la contextualiza como vista extendida.

## Delta 2026-03-28 Centralized email delivery layer completed

- `TASK-095` quedó cerrada con `sendEmail()` como capa canónica sobre Resend, registro unificado en `greenhouse_notifications.email_deliveries` y resolver por suscripción en `greenhouse_notifications.email_subscriptions`.
- Auth, NotificationService y Payroll ya consumen esa capa; los envíos directos ad hoc y el plain text de notificaciones quedaron reemplazados por templates centralizados.
- El contrato operativo ahora distingue `sent`, `failed` y `skipped`, con la documentación de arquitectura y el índice de tasks ya alineados al runtime implementado.
- El retry cron `email-delivery-retry` quedó conectado a `delivery_payload` para reprocesar `failed` deliveries con hasta 3 intentos en 1 hora.

## Delta 2026-03-28 Payroll export package auto-bootstrap

- La capa de exportación de Payroll ahora materializa su propia tabla `greenhouse_payroll.payroll_export_packages` si el entorno de preview aún no la tiene aplicada.
- El objetivo es evitar que `Reenviar correo` y la descarga de artefactos queden bloqueados por un schema ausente en deployments viejos o incompletos.
- La migración canónica sigue siendo `scripts/migrations/add-payroll-export-packages.sql`; el runtime bootstrap solo actúa como red de seguridad operacional.

## Delta 2026-03-28 Payroll email delivery staging alias lesson

- `dev-greenhouse.efeoncepro.com` apunta al deployment `staging` de Vercel, no al `Preview (develop)`, así que la validación del correo de Payroll debe hacerse contra el entorno que realmente sirve ese alias.
- Para que `Reenviar correo` funcione en ese dominio, `RESEND_API_KEY` y `EMAIL_FROM` deben existir en `staging`; tenerlos solo en `Preview (develop)` no alcanza.
- El endpoint de reenvío no debe presentar `deliveryId: null` como éxito visible; a nivel de capa de delivery, ese caso debe distinguirse como `skipped` o `failed`.
- Como hardening futuro, la gestión de secretos transaccionales podría vivir en Google Secret Manager con service account de sincronización, pero la app desplegada seguirá consumiendo variables del entorno de Vercel.

## Delta 2026-03-28 Payroll export actions UX hardening

- `PayrollPeriodTab` ahora envuelve las acciones exportadas para que el CTA `Reenviar correo` no quede fuera de vista cuando el header tiene demasiados botones.
- La descarga de PDF del período cambió de `window.open` a una descarga explícita por `fetch -> blob -> anchor`, con lo que el browser debe iniciar un archivo real y no una navegación dependiente del pop-up handling.
- El contrato de negocio sigue igual: `Reenviar correo` y los artefactos descargables solo se exponen para períodos `exported`.

## Delta 2026-03-28 Payroll export package persistence completed

- `TASK-097` quedó cerrada: Payroll ahora persiste PDF/CSV de exportación en GCS, sirve descargas desde storage con fallback y permite reenvío del correo desde un período ya exportado.
- La implementación añade `greenhouse_payroll.payroll_export_packages`, la ruta `POST /api/hr/payroll/periods/[periodId]/resend-export-ready` y botones/CTAs en `PayrollPeriodTab` para reenvío.
- El contrato de negocio no cambia: `payroll_period.exported` sigue siendo el cierre canónico; el paquete documental es derivado y reutilizable.

## Delta 2026-03-28 Payroll export package persistence in progress

- `TASK-097` quedó en progreso para persistir el paquete documental de exportación Payroll en GCS y permitir reenvío del correo sin volver a cerrar el período.
- La implementación añade una tabla `greenhouse_payroll.payroll_export_packages`, rutas de descarga basadas en storage y `POST /api/hr/payroll/periods/[periodId]/resend-export-ready`.
- El cierre canónico sigue siendo `payroll_period.exported`; el paquete documental es un artefacto derivado y reutilizable.

## Delta 2026-03-28 Payroll export artifact persistence lane added

- Se documentó `TASK-097` como follow-up de Payroll para persistir PDF/CSV de cierre en GCS y habilitar reenvío del correo sin volver a cerrar el período.
- La lane se apoya en el contrato ya existente de `payroll_period.exported`, en el delivery de Resend y en la experiencia de recibos almacenados en bucket.
- El alcance explícito separa cierre canónico, reenvío de correo y descargas posteriores; el cierre sigue siendo `exported`, no el click de archivo.

## Delta 2026-03-28 Centralized email delivery lane added

- Se documentó `TASK-095` como lane paralela para centralizar el delivery de emails sobre Resend.
- La idea es que Payroll, Finance, Delivery, Permissions y Auth consuman una capa única de envío en vez de helpers ad hoc.
- La nueva task se apoya conceptualmente en la infraestructura de notificaciones existente, pero no cambia todavía el runtime de delivery.

## Delta 2026-03-28 Payroll close/export split completed

- Payroll separó el cierre canónico del período de la descarga del CSV.
- `POST /api/hr/payroll/periods/[periodId]/close` marca el período como `exported` y publica `payroll_period.exported`.
- `GET /api/hr/payroll/periods/[periodId]/csv` y el route legacy `export` quedaron como descarga de artefacto, sin mutar estado.
- La UI de `PayrollPeriodTab` ahora expone `Cerrar y notificar` y `Descargar CSV` como acciones distintas.
- La notificación downstream a Finance/HR sale desde `payroll_period.exported` vía Resend, con PDF/CSV adjuntos.
- La arquitectura y el catálogo de emails quedaron alineados con ese contrato.

## Delta 2026-03-28 Payroll export notification immediate flush

- El cierre de Payroll ahora intenta además un flush inmediato del dominio `notifications` después de exportar el período, para no depender exclusivamente del cron en entornos interactivos o staging.
- El flush inmediato sigue siendo best-effort: `outbox-publish` y `outbox-react` continúan como safety net operativo y la idempotencia se conserva por `outbox_reactive_log`.
- La mutación canónica sigue siendo `payroll_period.exported`; el cambio solo acelera la entrega del correo y de los recibos downstream cuando el entorno permite procesarlos en caliente.

## Delta 2026-03-28 Payroll operational calendar utility implemented

- La utilidad canónica de calendario operativo quedó implementada en `src/lib/calendar/operational-calendar.ts`.
- La hidratación pública de feriados quedó separada en `src/lib/calendar/nager-date-holidays.ts`.
- El contrato operativo sigue siendo timezone-aware, con base `America/Santiago`, feriados nacionales desde `Nager.Date` y overrides persistidos en Greenhouse.
- No se introdujo una API pública de cálculo temporal; la utility es de lectura y debe ser consumida por Payroll y otros dominios server-side.
- El mapa de consumidores actual quedó acotado a Payroll: `current-payroll-period`, `payroll-readiness`, routes de approve/readiness y las vistas `PayrollDashboard`, `PayrollPeriodTab`, `PayrollHistoryTab`, `MyPayrollView`, `PersonPayrollTab`, `PayrollPersonnelExpenseTab` y `ProjectedPayrollView`.
- No hay consumidores directos en otros módulos del producto todavía; Finance y Cost Intelligence solo ven estados derivados de nómina.
- Posibles futuros consumidores: `ICO`, `Finance`, `Campaigns` y `Cost Intelligence`, pero solo si esos dominios formalizan ciclos de cierre mensuales o ventanas operativas reales.

## Delta 2026-03-28 Payroll operational calendar timezone + jurisdiction

- El calendario operativo de Payroll quedó definido como una política timezone-aware con base en `America/Santiago`.
- La semántica de cierre debe separar:
  - `timezone` operativo de la casa matriz
  - `country/jurisdiction` del contrato de nómina
  - `holiday calendar` aplicado para contar días hábiles
- Regla operativa derivada:
  - el país de residencia de un colaborador no redefine el ciclo de cierre de una nómina cuya jurisdicción sea otra
  - el cambio de horario invierno/verano de Santiago afecta el offset, pero no el contrato mensual de cierre
  - la utilidad temporal debe seguir siendo pura y no publicar outbox events por sí misma

## Delta 2026-03-28 Payroll holiday source decision

- La timezone canónica del calendario operativo se resuelve con la base IANA del runtime, no con una API externa.
- La fuente pública de mercado recomendada para feriados nacionales es `Nager.Date`.
- Greenhouse puede persistir overrides corporativos o jurisdiccionales encima de esa fuente cuando la política local lo requiera.

## Delta 2026-03-28 Payroll operational calendar / current-period semantics split

- La semántica operativa de Payroll quedó partida en dos lanes explícitas para evitar mezclar calendario y UI:
  - `TASK-091` para una utilidad canónica de calendario operativo
  - `TASK-092` para la lectura de período actual, historial y cards KPI en `/hr/payroll`
- Regla operativa derivada:
  - el runtime actual aún no cambia; la semántica de período vigente seguirá siendo la previa hasta que ambas tasks se implementen
  - el helper temporal no debe seguir creciendo dentro de la vista de Payroll si el contrato se reutiliza en otros dominios

## Delta 2026-03-28 Payroll current-period semantics implementation started

- `TASK-092` empezó a mover la lectura del período actual hacia el mes operativo vigente resuelto por la utility compartida.
- `PayrollHistoryTab` dejó de contar `approved` como si fuera cierre final y ahora distingue `aprobado en cierre` de `cerrado/exportado`.
- La selección temporal de `current-payroll-period` ahora busca el período del mes operativo vigente, no solo el último periodo no exportado.

## Delta 2026-03-28 Payroll current-period semantics completed

- `TASK-092` quedó cerrada con la semántica operativa de período actual y la distinción visual de historial entre cierres reales y aprobaciones aún en cierre.
- El dashboard de Payroll mantiene KPI y copy atados al período activo, mientras el historial muestra los períodos aprobados en cierre como estado intermedio y los exportados como cierre final.

## Delta 2026-03-28 Payroll UX semantics and feedback hardening

- `TASK-089` cerró el endurecimiento de UX de Payroll sin alterar el dominio de cálculo:
  - el dashboard separa período activo e histórico seleccionado
  - las vistas críticas muestran error y retry visibles
  - los CTAs de descarga y los icon buttons del módulo tienen copy/labels accesibles más claros
  - `Mi Nómina` y `People > Nómina` ya no dependen de un orden implícito para definir el último período
- Regla operativa derivada:
  - el período histórico es navegación, no el nuevo contexto del período actual
  - los fallos de carga no deben verse como vacíos neutros
  - las descargas de recibos deben comunicar fallo y nombre humano del documento, no solo disparar una navegación o log interno

## Delta 2026-03-28 Operating Entity Identity — React context + API endpoint

- La identidad de la entidad operadora (razón social, RUT, dirección legal) ya no se resuelve ad hoc por cada consumer.
- Nuevo baseline:
  - `OperatingEntityProvider` + `useOperatingEntity()` hook en `src/context/OperatingEntityContext.tsx`
  - Hydration server → client: `Providers.tsx` llama `getOperatingEntityIdentity()` una vez y pasa al Provider
  - API endpoint `GET /api/admin/operating-entity` para consumers no-React (webhooks, integraciones, cron)
  - Payroll receipt card y PDF ya consumen la identidad del empleador desde el contexto
- Regla operativa derivada:
  - todo documento formal (recibo, DTE, contrato, propuesta, email) debe obtener la identidad del empleador desde `useOperatingEntity()` (client) o `getOperatingEntityIdentity()` (server), no hardcodearla
  - el Provider se resuelve una vez por layout render, no por componente
  - multi-tenant ready: si la operación se fragmenta por tenant, el layout resuelve el operating entity del scope de la sesión

## Delta 2026-03-28 Payroll reactive hardening complete

- `TASK-088` cerró la lane reactiva de Payroll sin cambiar la semántica funcional del módulo:
  - la cola persistente `greenhouse_sync.projection_refresh_queue` ya vuelve de forma observable a `completed` o `failed`
  - `reactive-consumer` completa best-effort después del ledger reactivo y no convierte un fallo de completion en fallo del refresh exitoso
  - el fallback BigQuery de export solo publica `payroll_period.exported` cuando la mutación realmente afecta una fila
  - `projected_payroll_snapshots` quedó documentado como serving cache interno; `/api/hr/payroll/projected` sigue resolviendo cálculo vivo + `latestPromotion`
- Regla operativa derivada:
  - `payroll_period.exported` sigue siendo el cierre canónico de nómina, independientemente del runtime Postgres-first o BigQuery fallback

## Delta 2026-03-28 Payroll hardening backlog documented

- La auditoría de Payroll dejó tres lanes explícitas para seguir endureciendo el módulo sin mezclar objetivos:
  - `TASK-087`: invariantes del lifecycle oficial y gate de readiness
  - `TASK-088`: cola reactiva, export parity y contrato de projected payroll / receipts
  - `TASK-089`: UX, copy, feedback y accesibilidad en HR, My Payroll y People
- La arquitectura de Payroll ahora documenta explícitamente:
  - la ventana operativa de cierre de nómina
  - `/hr/payroll/projected` como surface derivada
  - `payroll_receipts_delivery` como consumer downstream de `payroll_period.exported`
- Regla operativa derivada:
  - la nómina oficial y la proyectada siguen siendo objetos distintos; la proyección alimenta, pero no reemplaza, el lifecycle oficial

## Delta 2026-03-28 Payroll lifecycle invariants hardened

- `TASK-087` ya quedó cerrada para mover la semántica del lifecycle oficial desde los routes hacia el dominio.
- Nuevo contrato operativo:
  - `approved` solo se acepta desde `calculated`
  - la aprobación consulta readiness canónico y rechaza blockers antes de persistir
  - la edición de entries de un período aprobado reabre explícitamente el período a `calculated`
- Regla operativa derivada:
  - `approved` sigue siendo checkpoint editable, no cierre final; el cierre real sigue siendo `exported`

## Delta 2026-03-28 Compensation Chile líquido-first + reverse engine completo

- `TASK-079` a `TASK-085` cerradas en una sesión:
  - Motor reverse `computeGrossFromNet()` con binary search, piso IMM, convergencia ±$1 CLP
  - Regla de negocio: líquido deseado = neto con descuentos legales (7% salud, no Isapre)
  - Excedente Isapre mostrado como deducción voluntaria separada
  - AFP resuelta desde Previred, no desde compensación guardada
  - `desired_net_clp` persistido en `compensation_versions` (migration corrida)
  - Para Chile, el drawer siempre abre en modo reverse (sin switch) — el líquido es el punto de partida
  - Para internacional, salary base directo sin cambios
  - Preview enterprise con secciones semánticas (haberes/descuentos/resultado), monospace, accordion previsional
  - Error de guardado visible arriba del botón (no oculto en scroll)
  - Sección 24 agregada a `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- Regla operativa derivada:
  - toda nueva compensación Chile se crea desde un líquido deseado contractual
  - el sueldo base es siempre un resultado del motor reverse, nunca un input manual
  - el líquido a pagar varía mes a mes por ausencias, bonos, excedente Isapre, etc.

## Delta 2026-03-28 Reverse payroll engine (Slices 1-2 validados)

- `TASK-079` Slices 1-2 validados en staging contra liquidación real de Valentina Hoyos (Feb 2026).
- Motor `computeGrossFromNet()` en `src/lib/payroll/reverse-payroll.ts`: binary search sobre forward engine real, ±$1 CLP, 10 golden tests.
- Reglas de negocio Chile validadas:
  - **Líquido deseado = neto con descuentos legales solamente** (AFP + 7% salud + cesantía + impuesto). No incluye Isapre ni APV.
  - **Excedente Isapre** mostrado aparte como deducción voluntaria. "Líquido a pagar" = líquido deseado - excedente.
  - **Piso IMM**: el binary search arranca desde el Ingreso Mínimo Mensual ($539.000). Nunca calcula base inferior al mínimo legal.
  - **AFP desde Previred**: la tasa AFP se resuelve del período (Previred sync), no de la compensación guardada.
- Archivos: `reverse-payroll.ts`, `reverse-payroll.test.ts`, `reverse-quote/route.ts`, `CompensationDrawer.tsx`
- Hardening pendiente (Slice 3): persistir `desired_net_clp` en `compensation_versions`, sincronizar AFP rate al guardar, round-trip check, auto changeReason.
- No se introdujeron nuevos eventos ni cambios de schema (aún); el campo `desired_net_clp` requiere migration.

## Delta 2026-03-28 Reactive receipts projection log + queue fix

- El ledger reactivo ahora es projection-aware: `greenhouse_sync.outbox_reactive_log` quedó keyeado por `(event_id, handler)` para que un handler no bloquee al resto de proyecciones del mismo evento.
- La cola persistente `greenhouse_sync.projection_refresh_queue` recuperó su `UNIQUE (projection_name, entity_type, entity_id)` para que `enqueueRefresh()` deduzca intents sin caer en `ON CONFLICT` inválido.
- Esto destraba la materialización de `payroll_receipts_delivery` después de `payroll_period.exported`, que era el último bloqueo estructural del smoke de `TASK-077`.

## Delta 2026-03-28 Payroll receipts smoke complete

- `TASK-077` quedó cerrada en staging con smoke end-to-end real:
  - `outbox-publish` publicó el evento nuevo de `payroll_period.exported`
  - `outbox-react` materializó `payroll_receipts_delivery`
  - se generaron 4 recibos y se enviaron 4 correos
- Los PDFs quedaron almacenados en `gs://efeonce-group-greenhouse-media/payroll-receipts/2026-03/...`
- El flujo de recibos queda ahora validado no solo por código y docs, sino también por ejecución real sobre marzo 2026.

## Delta 2026-03-28 Payroll receipts registry + reactive delivery

- `Payroll` ya persistió un registry canónico de recibos en `greenhouse_payroll.payroll_receipts`.
- La generación batch de recibos al exportar período se ejecuta por `payroll_period.exported` a través de proyecciones reactivas, no por cron separado.
- La descarga de recibos por HR prioriza el PDF almacenado en GCS y cae a render on-demand solo como fallback.
- `My Nómina` ya expone descarga de recibo para el colaborador autenticado y `People > Person > Nómina` la expone para HR desde el mismo contrato de receipt.
- Quedan pendientes el pulido del layout de recibos y el smoke end-to-end con correo + descarga en staging.

## Delta 2026-03-28 Projected payroll snapshot grants

- `greenhouse_serving.projected_payroll_snapshots` es una materialización serving escribible por el runtime de Payroll projected, con grants explícitos para `greenhouse_app`, `greenhouse_runtime` y `greenhouse_migrator`.
- La promoción `Projected -> Official` usa ese snapshot como cache auditable, no como source of truth transaccional.
- El permiso denegado en staging se resolvió añadiendo el grant a la migration/bootstrap de Payroll, sin mover la tabla fuera de `greenhouse_serving`.

## Delta 2026-03-28 Payroll AFP split

- `Payroll Chile` ahora versiona y snapshottea `AFP` con split explícito de `cotización` y `comisión`, manteniendo también el total agregado para compatibilidad histórica.
- Las superficies de exportación y recibos deben mostrar ambos componentes cuando existan, pero el cálculo legal sigue consumiendo el total AFP para no alterar la paridad del período.
- La migration operativa quedó disponible en `scripts/migrations/add-chile-afp-breakdown.sql`.

## Delta 2026-03-28 Employer legal identity

- La razón social canónica de la organización operativa propietaria de Greenhouse es `Efeonce Group SpA`.
- El RUT canónico es `77.357.182-1`.
- La dirección legal canónica es `Dr. Manuel Barros Borgoño 71 of 05, Providencia, Chile`.
- Estos datos deben reutilizarse en liquidaciones, recibos, exportes legales, Finance y surfaces comerciales como identidad de la organización/empleador, no como dato de persona ni como identidad de cliente.

## Delta 2026-03-28 Chile employer cost base

- `Payroll Chile` ya calcula un breakdown de costos empleador (`SIS`, cesantía empleador y mutual estimado) y lo persiste junto a las entries.
- `member_capacity_economics.total_labor_cost_target` absorbe ese breakdown para que Cost Intelligence pueda ver el costo laboral cargado real sin inventar otra proyección.
- Esta base reutiliza la misma propagación reactiva de `compensation_version.created/updated` y `payroll_entry.upserted`.

## Delta 2026-03-28 Payroll Chile smoke validation

- Se validó contra la liquidación real de febrero 2026 de Valentina Hoyos que el núcleo legal de `Payroll Chile` ya calza con el PDF cuando existen los insumos correctos:
  - `IMM = 539000`
  - compensación Chile vigente con gratificación legal mensual
- El motor devuelve correctamente:
  - `baseSalary`
  - `gratificacionLegal`
  - `AFP`
  - `salud`
  - `cesantía`
  - `netTotal` imponible
- Regla operativa derivada:
  - la paridad completa con la liquidación impresa sigue pendiente mientras no se modelen `colación` y `movilización`
  - el helper/ruta de creación de compensación sigue requiriendo revisión separada, pero no invalida el cálculo core cuando la data está cargada

## Delta 2026-03-28 Chile payroll non-imponible allowances

- `Payroll Chile` ahora modela `colación` y `movilización` como haberes canónicos versionados en la compensación y en `payroll_entries`.
- El motor forward los incorpora al devengado y al neto, manteniendo su carácter no imponible.
- El cambio se expone por las superficies existentes de `compensation_version.created/updated` y `payroll_entry.upserted`; no se agregó un nuevo evento.
- Regla operativa derivada:
  - los consumidores de recibos, PDF, Excel, breakdown y projected payroll deben mostrar esos haberes cuando existan y tratarlos como parte del contrato de nómina Chile, no como un bono manual ad hoc

## Delta 2026-03-27 Payroll variable bonus policy recalibration

- `Payroll` ya no depende de una policy simple para bonos variables (`OTD >= threshold`, `RpA` lineal hasta un único umbral).
- Baseline nuevo materializado:
  - `OTD` con full payout desde `89%` y piso `70%`
  - `RpA` con bandas versionadas:
    - `<= 1.7` -> `100%`
    - `1.7 - 2.0` -> descenso suave hasta `80%`
    - `2.0 - 3.0` -> descenso hasta `0`
  - config canónica ampliada en `greenhouse_payroll.payroll_bonus_config` con:
    - `rpa_full_payout_threshold`
    - `rpa_soft_band_end`
    - `rpa_soft_band_floor_factor`
- Regla operativa derivada:
  - `Payroll` official, `projected payroll` y `recalculate-entry` deben leer exactamente la misma policy canónica
  - los cambios de payout variable deben versionarse por `effective_from`, no esconderse en fórmulas locales por consumer
  - `TASK-025` (`FTR`) deja de ser el siguiente paso obligatorio; pasa a ser una alternativa estratégica futura

## Delta 2026-03-27 Economic indicators runtime baseline

- Finance ya no queda limitado semánticamente a `exchange_rates` para datos macroeconómicos chilenos.
- Baseline nuevo materializado:
  - helper server-side común para `USD_CLP`, `UF`, `UTM`, `IPC`
  - endpoint `GET /api/finance/economic-indicators/latest`
  - endpoint `GET/POST /api/finance/economic-indicators/sync`
  - storage histórico previsto desde `2026-01-01`
  - cron diario movido a `/api/finance/economic-indicators/sync`
- Regla operativa derivada:
  - `USD/CLP` sigue manteniendo compatibilidad con `greenhouse_finance.exchange_rates`
  - indicadores no FX (`UF`, `UTM`, `IPC`) no deben modelarse como monedas ni reusar contratos de currency a la fuerza
- consumers que necesiten snapshots históricos de período deben leer desde la capa común de indicadores antes de pedir input manual al usuario
- `Payroll` ya no debe pedir `UF` manualmente por defecto al crear/editar períodos; debe autohidratarla desde indicadores usando el mes imputable

## Delta 2026-03-27 Payroll variable bonus policy recalibrated

- `Payroll` mantiene a `ICO` como fuente canónica de `OTD` y `RpA`, pero su policy de payout ya no es solo un threshold lineal simple.
- Regla operativa nueva:
  - `OTD` paga `100%` desde `89%`, con piso de prorrateo en `70%`
  - `RpA` usa bandas versionadas:
    - `<= 1.7` -> `100%`
    - `1.7 - 2.0` -> baja suavemente hasta `80%`
    - `2.0 - 3.0` -> baja desde `80%` hasta `0`
    - `>= 3.0` -> `0`
- La policy ya no depende solo de `rpa_threshold`; queda versionada en `greenhouse_payroll.payroll_bonus_config` con:
  - `rpa_full_payout_threshold`
  - `rpa_soft_band_end`
  - `rpa_soft_band_floor_factor`
- Impacto derivado:
  - `Payroll` oficial, `projected payroll` y `recalculate-entry` deben consumir exactamente la misma config canónica
  - cualquier fallback analítico debe tolerar esquemas viejos y rellenar defaults para no romper ambientes parcialmente migrados

## Delta 2026-03-26 Team capacity architecture canonized

- La arquitectura de capacidad/economía de equipo ya no vive solo en una task o en el código.
- La fuente canónica quedó fijada en:
  - `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`
- Regla operativa derivada:
  - futuros consumers de capacidad/economía por persona deben escalar desde:
    - helpers puros `src/lib/team-capacity/*`
    - snapshot reactivo `greenhouse_serving.member_capacity_economics`
  - no crear una segunda capa paralela de capacidad por miembro/período si el problema es solo un nuevo consumer o un nuevo campo del mismo dominio

## Delta 2026-03-26 TASK-056 reactive capacity economics slice

- Se materializó la nueva proyección reactiva `member_capacity_economics` en `greenhouse_serving.member_capacity_economics`.
- El snapshot quedó centrado en `member_id + period_year + period_month` y materializa:
  - capacidad contractual
  - carga comercial asignada
  - uso operativo derivado de ICO
  - economía laboral convertida a `CLP`
- La lane quedó wireada al projection registry y al event catalog con triggers para:
  - `member.*`
  - `assignment.*`
  - `compensation_version.*`
  - `payroll_period.*`
  - `payroll_entry.upserted`
  - `finance.exchange_rate.upserted`
  - eventos futuros de overhead/licencias/tooling
- Alcance deliberadamente no tocado:
  - `src/lib/team-capacity/*.ts`
  - routes UI
  - views
- Validación realizada:
  - `pnpm test src/lib/sync/projections/member-capacity-economics.test.ts src/lib/sync/projection-registry.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`

## Delta 2026-03-24 Task system normalization

- El sistema de tasks deja de nacer bajo el prefijo `CODEX_TASK_*` como convencion nueva.
- Regla operativa derivada:
  - toda task nueva debe usar un ID estable `TASK-###`
  - el numero no define prioridad mutable; el orden operativo vive en `Rank` y en `docs/tasks/README.md`
  - la plantilla copiable para crear tasks queda en `docs/tasks/TASK_TEMPLATE.md`; el protocolo completo de ejecucion (Plan Mode, Skill, Subagent, Checkpoint/Mode) queda en `docs/tasks/TASK_PROCESS.md`
  - la reserva de IDs bootstrap y el siguiente ID disponible quedan fijados en `docs/tasks/TASK_ID_REGISTRY.md`
  - la capa operativa de seguimiento para tasks activas queda definida en `docs/operations/GITHUB_PROJECT_OPERATING_MODEL_V1.md`
- Compatibilidad:
  - los `CODEX_TASK_*` existentes siguen vigentes como legacy hasta su migracion y no deben renumerarse de forma masiva sin una lane dedicada

## Delta 2026-03-24 GitHub Project materialized

- El Project operativo recomendado ya no es hipotetico: quedó creado en GitHub bajo `efeoncepro`.
- Estado real:
  - Project: `Greenhouse Delivery`
  - URL: `https://github.com/orgs/efeoncepro/projects/2`
  - issues bootstrap creadas: `#9` a `#18` en `efeoncepro/greenhouse-eo`
- Regla operativa derivada:
  - el repo queda enlazado al Project a traves de issues reales `[TASK-###] ...`
  - el campo custom `Pipeline` es la fase operativa del equipo
  - el `Status` built-in de GitHub queda como estado coarse (`Todo`, `In Progress`, `Done`)

## Delta 2026-03-22 Webhook architecture canonized

- La infraestructura de webhooks de Greenhouse ya no queda como idea difusa entre una ruta aislada de Teams, el outbox y la API de integraciones.
- La fuente canonica para webhook architecture quedo fijada en:
  - `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- Decision operativa derivada:
  - los futuros webhooks inbound y outbound deben montarse sobre una capa reusable encima de `greenhouse_sync`
  - `greenhouse_sync.outbox_events` sigue siendo la fuente de eventos operativos para delivery externo
  - la API `/api/integrations/v1/*` sigue viva para sync/pull/push explicito; webhooks no la reemplazan
- Lane derivada creada:
  - `docs/tasks/to-do/CODEX_TASK_Webhook_Infrastructure_MVP_v1.md`

## Delta 2026-03-22 Repo ecosystem canonized

- Ya no queda implícito qué repos externos son hermanos operativos de `greenhouse-eo`.
- La fuente canónica para ownership multi-repo y selección de upstream quedó fijada en:
  - `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- Repos hermanos documentados:
  - `efeoncepro/notion-bigquery` (transferido desde `cesargrowth11` el 2026-05-18; deprecated — sunset post TASK-908 GA)
  - `cesargrowth11/hubspot-bigquery` (post TASK-574 conserva solo `main.py` Cloud Function + HubSpot Developer Platform app — el write bridge ya vive en `services/hubspot_greenhouse_integration/`)
  - `cesargrowth11/notion-teams`
  - `cesargrowth11/notion-frame-io`
  - `efeoncepro/kortex`
- Regla operativa derivada:
  - si un cambio toca una integración o pipeline cuyo runtime vive fuera del portal, el agente debe revisar primero ese repo hermano antes de asumir que el fix o la evolución pertenece a `greenhouse-eo`

## Delta 2026-03-21 Payroll architecture canonized

- `Payroll` ya no depende solo de contexto distribuido entre tasks y código: su contrato completo de módulo quedó consolidado en `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`.
- Ese documento fija como canon:
  - compensación versionada por vigencia, no mensual
  - período imputable como mes calendario, no mes de pago
  - lifecycle `draft -> calculated -> approved -> exported`, con `approved` todavía editable y `exported` como candado final
  - KPI mensual de `On-Time` y `RpA` sourced desde `ICO`
  - `People 360` como ficha individual oficial del colaborador, dejando `/hr/payroll/member/[memberId]` como redirect operativo
- Regla documental derivada:
  - cambios futuros de semantics o ownership de `Payroll` deben actualizar primero `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`, y solo dejar deltas breves en `project_context.md`, `Handoff.md` y `changelog.md`

## Delta 2026-03-21 Payroll period lifecycle — approved is editable, exported is final

- Se ajustó la semántica operativa de estados de `Payroll` para alinearla con el flujo real de pago:
  - el período imputable sigue siendo el mes calendario (`2026-02`, `2026-03`, etc.)
  - la nómina puede aprobarse dentro del flujo de revisión y seguir ajustándose antes de su pago/exportación
- Regla operativa derivada:
  - `approved` ya no significa “cerrado final”; significa “listo para pago/revisión”
  - `exported` pasa a ser el candado final del período
  - por lo tanto, un período `approved` todavía puede:
    - recalcularse
    - editar entries manuales
    - reutilizar la compensación vigente para correcciones in-place
- Comportamiento derivado:
  - si un período `approved` se recalcula o se edita una entry, el sistema lo devuelve a `calculated`
  - después de eso, debe aprobarse nuevamente antes de exportar
  - solo los períodos `exported` quedan completamente congelados para recalcular, editar entries o bloquear cambios de compensación reutilizada

## Delta 2026-03-21 Payroll period correction — imputed month/year can be fixed before export

- Se detectó un caso operativo real: una nómina puede haberse creado como `2026-03` solo para prueba aunque en realidad corresponda al mes imputable `2026-02`.
- Regla operativa derivada:
  - `year` y `month` del período son la identidad del mes imputable, no del mes de pago
  - por lo tanto, deben poder corregirse mientras el período no haya sido `exported`
- Comportamiento derivado:
  - `Editar período` ahora permite corregir `year/month` además de `ufValue`, `taxTableVersion` y `notes`
  - si ese cambio altera la base de cálculo (`year`, `month`, `ufValue` o `taxTableVersion`), el período vuelve a `draft` y sus `payroll_entries` se eliminan para obligar un recálculo limpio
  - no se permite “renombrar” un período exportado ni moverlo encima de un `periodId` ya existente

## Delta 2026-04-30 Payroll tax table auto-resolution — operador no debe adivinar `gael-YYYY-MM`

- Se cerró una brecha de UX/robustez en `Payroll`: el modal de creación pedía implícitamente una `taxTableVersion` Chile que el operador no tenía por qué conocer y todavía mostraba un placeholder legacy `SII-*`.
- Regla operativa derivada:
  - la `taxTableVersion` canonica para Chile sigue siendo `gael-YYYY-MM`
  - pero el operador no debe memorizarla ni escribirla manualmente en el flujo normal
- Comportamiento derivado:
  - al crear o editar un período, Greenhouse intenta resolver automáticamente la tabla tributaria sincronizada del mes imputable
  - si existe una única versión sincronizada para ese mes, puede reutilizarla aunque no coincida exactamente con el nombre canónico esperado
  - si no existe tabla tributaria sincronizada para el mes, el período puede quedar en `draft`, pero `readiness`, `calculate`, `recalculate` y `reverse quote` bloquean con mensaje explícito antes de producir cálculo Chile inválido
  - el override manual de `taxTableVersion` sigue existiendo solo como camino avanzado y se valida contra versiones realmente disponibles del mes

## Delta 2026-03-21 Payroll KPI source cutover — ICO becomes the monthly source of truth

- Se confirmó una brecha entre la intención funcional de `Payroll` y su runtime real:
  - los montos de compensación (`salario base`, `bono conectividad`, `bono máximo On-Time`, `bono máximo RpA`) ya vivían correctamente versionados en `compensation_versions`
  - pero el cálculo mensual de `On-Time` y `RpA` todavía dependía de `notion_ops.tareas`
- Regla operativa derivada:
  - `Payroll` debe tomar los KPI mensuales de desempeño desde `ICO` por `member_id`, no directo desde Notion
  - la fuente preferida es `ico_engine.metrics_by_member` para el `year/month` del período
  - si ese mes aún no está materializado para un colaborador, el runtime puede hacer fallback live por miembro y congelar el snapshot resultante en `payroll_entries`
- Impacto práctico:
  - `Payroll` deja de depender del primer `responsable_id` de `notion_ops.tareas` para calcular bonos
  - el match de KPI queda alineado con la identidad canónica de colaborador (`member_id`) y con la capa `ICO`
  - períodos históricos con `kpi_data_source = notion_ops` se siguen leyendo por compatibilidad, pero los nuevos cálculos deben registrar `kpi_data_source = ico`

## Delta 2026-03-21 MUI live-region sizing pitfall — width/height numeric shorthand is unsafe for visually hidden nodes

- Se confirmó un bug real de layout en `People`: un `aria-live` oculto dentro de `PersonTabs` usaba `sx={{ width: 1, height: 1 }}`.
- Regla operativa derivada:
  - en MUI `sx`, para propiedades de tamaño (`width`, `height`, etc.), el valor numérico `1` significa `100%`, no `1px`
  - por lo tanto, **no usar** `width: 1` / `height: 1` para regiones visualmente ocultas, especialmente si además llevan `position: 'absolute'`
  - el patrón seguro para live regions visualmente ocultas debe usar strings explícitos (`'1px'`) más `clip`, `clipPath`, `whiteSpace: 'nowrap'` y `margin: '-1px'`
- Impacto práctico:
  - un `aria-live` aparentemente inocuo puede inflar `documentElement.scrollWidth` y `scrollHeight`, generando scroll horizontal y vertical a nivel de página aunque el resto del layout esté correcto
  - se corrigió `PersonTabs` y se saneó el duplicado equivalente en `OrganizationTabs`

## Delta 2026-03-20 HR Payroll — contraste arquitectónico confirma cierre completo

- Se contrastaron las 2 tasks de Payroll contra la arquitectura 360 real:
  - `CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1` — schema `greenhouse_payroll` materializado, 25+ funciones en postgres-store, 11/11 rutas Postgres-first
  - `CODEX_TASK_HR_Payroll_Module_v3` — 4 gaps UX cerrados (alta compensación, edición período, KPI manual, ficha colaborador)
- Backfill BQ → PG ejecutado: 0 rows transaccionales en BigQuery, módulo nunca usado en producción
- Regla operativa derivada:
  - Payroll está listo para primer uso real; el siguiente paso es onboarding de datos reales (compensaciones + primer período) directamente en Postgres
  - BigQuery queda como fallback pasivo; no debe recibir writes nuevos del módulo
- Ambas tasks cerradas y movidas a `docs/tasks/complete/`

## Delta 2026-03-20 BigQuery cron hardening — schema drift + streaming buffer

- Se confirmó que el readiness hacia producción no estaba bloqueado por `build`, sino por dos fallos de cron en BigQuery:
  - `GET /api/cron/ico-materialize` fallaba cuando `ico_engine.metrics_by_project` existía pero sin columnas nuevas como `pipeline_velocity`
  - `GET /api/cron/sync-conformed` fallaba por `streaming buffer` al ejecutar `DELETE` sobre `greenhouse_conformed.delivery_*` después de escribir con `insertAll`
- Regla operativa derivada:
  - en BigQuery, `CREATE TABLE IF NOT EXISTS` no migra tablas ya existentes; cuando una tabla analítica vive mucho tiempo, el runtime debe aplicar `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para cerrar drift de esquema antes de depender de columnas nuevas
  - para reemplazos completos de tablas `greenhouse_conformed.delivery_*`, no usar `DELETE + streaming insert`; usar `load jobs` o un patrón equivalente sin streaming buffer
- Runtime actualizado:
  - `src/lib/ico-engine/schema.ts` ahora aplica migraciones aditivas en tablas ICO existentes antes de recrear views
  - `src/lib/sync/sync-notion-conformed.ts` ahora reemplaza `delivery_projects`, `delivery_tasks` y `delivery_sprints` con load jobs `WRITE_TRUNCATE`

## Delta 2026-03-20 Sidebar navigation — reestructuración arquitectónica

- Se eliminó todo label en inglés del sidebar: `Updates`, `Control Tower`, `HR`, `Admin`, `AI Tooling` pasan a español.
- Se definió una regla explícita de cuándo usar cada patrón de menú:
  - **Flat MenuItem**: navegación primaria siempre visible (click directo)
  - **MenuSection**: frontera de dominio con 2+ hijos del mismo contexto (header uppercase, sin acordeón)
  - **SubMenu**: módulo funcional con 3+ rutas donde ocultar reduce ruido (acordeón colapsable)
- Se fusionaron las secciones `Equipo` (1 hijo: Personas) y `HR` (4 hijos: Nómina, Departamentos, Permisos, Asistencia) en una sola sección `Equipo` con lógica condicional: people+HR → sección unificada; solo people → flat item; solo HR → sección HR.
- Sección `Agencia` renombrada a `Gestión` (colisión con item `Agencia`).
- Sección `Servicios` renombrada a `Módulos` (ambigüedad).
- Sección `Operacion` eliminada (single-child anti-pattern).
- Regla de producto derivada:
  - Todo label de navegación del portal debe estar en español; los nombres de producto (`Pulse`, `Greenhouse`, `Creative Hub`) son excepciones por ser brand names
  - Las secciones de 1 solo hijo no deben existir; usar flat item en su lugar
  - Los hijos de SubMenu deben usar `NavLabel` con subtítulo, igual que los items de nivel superior

## Delta 2026-03-20 Nubox DTE staging runtime aligned + DTE labeling clarified

- `staging` / `dev-greenhouse.efeoncepro.com` no tenía cargadas las env vars Nubox aunque `Development`, `Preview` y `Production` sí.
- Se alineó `staging` con:
  - `NUBOX_API_BASE_URL`
  - `NUBOX_BEARER_TOKEN`
  - `NUBOX_X_API_KEY`
- Regla operativa derivada:
  - cualquier ambiente que deba emitir, refrescar estado o descargar PDF/XML de DTE desde Nubox debe tener las 3 `NUBOX_*` presentes; no basta con cargarlas solo en `Development`, `Preview` o `Production`
- Validación de documento real:
  - Nubox `sale 26639047` corresponde a `type.legalCode = 33` y `number = 114`
  - por lo tanto `33` es código SII del tipo de DTE y `114` es el folio real
- Ajuste de UX derivado:
  - `Finance > Ingresos > detalle` debe separar visualmente `Tipo de documento`, `Código SII` y `Folio DTE` para evitar interpretar `33` como número de factura

## Delta 2026-03-19 Nubox DTE integration — API discovery, org mapping, supplier seeding, income import

- Se descubrió y validó la New API de Nubox (Integraciones/Pyme) con credenciales productivas:
  - Base URL: `https://api.pyme.nubox.com/nbxpymapi-environment-pyme/v1`
  - Auth: `Authorization: Bearer <token>` + `x-api-key: <key>`
  - 4 dominios verificados: `/v1/sales`, `/v1/purchases`, `/v1/expenses`, `/v1/incomes`
- Mapeo de organizaciones Greenhouse ↔ clientes Nubox via RUT (`organizations.tax_id`):
  - 4 organizaciones existentes enriquecidas con RUT: Corp Aldea (65258560-4), DDSoft (76613599-4), Gobierno RM (61923200-3), Sky Airline (88417000-1)
  - 2 organizaciones nuevas creadas desde Nubox: SGI (76438378-8), Sika (91947000-3)
  - 2 clientes nuevos creados: `nubox-client-76438378-8`, `nubox-client-91947000-3`
- Proveedores sembrados desde compras Nubox:
  - 19 proveedores en `greenhouse_finance.suppliers` con RUT, categoría y datos fiscales
  - Categorías: banking, software, services, accounting, freelancer, hosting, travel, supplies, marketplace
- Ingresos importados desde ventas Nubox (15 meses):
  - 78 registros en `greenhouse_finance.income` — ID format: `INC-NB-{nubox_id}`
  - Total: $163,820,646 CLP
  - Tipos: `service_fee` (facturas), `credit_note` (notas de crédito negativas), `quote` (cotizaciones), `debit_note`
  - 0 huérfanos: todos los ingresos tienen `client_id` válido
- Credenciales runtime bajo contrato actual: `NUBOX_BEARER_TOKEN` y `NUBOX_X_API_KEY` deben vivir preferentemente en Secret Manager via `NUBOX_BEARER_TOKEN_SECRET_REF` y `NUBOX_X_API_KEY_SECRET_REF`; `.env.local` queda solo para desarrollo/fallback.
- Task brief creado: `docs/tasks/to-do/CODEX_TASK_Nubox_DTE_Integration.md` (8 fases, bidireccional)
- Script de descubrimiento: `scripts/nubox-extractor.py`
- Regla operativa derivada:
  - RUT es el bridge canónico entre Greenhouse y Nubox en ambas direcciones
  - `organizations.tax_id` debe estar poblado para cualquier cliente que emita DTE
  - Finance income de Nubox usa prefijo `INC-NB-` para evitar colisiones con income manual o HubSpot
  - Nubox New API es la única API activa; la Old API (`api.nubox.com`) NO se usa

## Delta 2026-03-15 Person 360 audit and serving baseline materialized

- Se materializó `greenhouse_serving.person_360` en Cloud SQL como primer serving unificado de persona sobre:
  - `greenhouse_core.identity_profiles`
  - `greenhouse_core.members`
  - `greenhouse_core.client_users`
  - `greenhouse_crm.contacts`
- También se agregó el comando:
  - `pnpm audit:person-360`
- Estado validado:
  - `profiles_total = 38`
  - `profiles_with_member = 7`
  - `profiles_with_user = 37`
  - `profiles_with_contact = 29`
  - `profiles_with_member_and_user = 7`
  - `profiles_with_user_and_contact = 29`
  - `profiles_with_all_three = 0`
  - `profiles_without_any_facet = 1`
- Gaps reales identificados:
  - `users_without_profile = 2`
  - `contacts_without_profile = 34`
  - `internal_users_without_member = 1`
- Conclusión operativa:
  - el principal bloqueo de `Person 360` ya no es de arquitectura sino de reconciliación CRM/contactos
  - `People` y `Users` ya tienen un backbone real al cual migrar, pero todavía no lo consumen

## Delta 2026-03-15 Person 360 formalized as canonical profile strategy

- Se fijó explícitamente que Greenhouse no debe seguir tratando `People`, `Users`, `CRM Contact` y `Member` como identidades distintas.
- Decisión de arquitectura:
  - `identity_profile` es el ancla canónica de persona
  - `member` es faceta laboral/interna
  - `client_user` es faceta de acceso
  - `crm_contact` es faceta comercial
- Regla de producto derivada:
  - `People` debe evolucionar hacia la vista humana/operativa del mismo perfil
  - `Users` debe evolucionar hacia la vista de acceso/permisos del mismo perfil
  - ambas superficies deben reconciliarse sobre `identity_profile_id`
- Se creó la lane activa:
  - `docs/tasks/to-do/CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1.md`
- Esto no reemplaza `Identity & Access V2`; lo complementa como capa de modelo y serving sobre persona.

## Delta 2026-03-15 AI Tooling runtime migrated to PostgreSQL

- `AI Tooling` ya no depende primariamente del bootstrap runtime de BigQuery para `catalog`, `licenses`, `wallets` y `metadata`.
- Se materializó `greenhouse_ai` en Cloud SQL con:
  - `tool_catalog`
  - `member_tool_licenses`
  - `credit_wallets`
  - `credit_ledger`
- `src/lib/ai-tools/service.ts` ahora opera en modo `Postgres first`, con fallback controlado al store legacy solo cuando PostgreSQL no está listo o no está configurado.
- `scripts/setup-postgres-ai-tooling.ts` ya no solo crea schema: también siembra el catálogo mínimo operativo en PostgreSQL.
- Estado validado tras setup:
  - `greenhouse_ai.tool_catalog = 9`
  - `greenhouse_ai.member_tool_licenses = 0`
  - `greenhouse_ai.credit_wallets = 0`
  - `greenhouse_ai.credit_ledger = 0`
  - `greenhouse_core.providers` visibles para AI Tooling = `10`
- Providers visibles validados en PostgreSQL:
  - `Adobe`
  - `Anthropic`
  - `Black Forest Labs`
  - `Freepik`
  - `Google DeepMind`
  - `Higgsfield AI`
  - `Kuaishou`
  - `Microsoft`
  - `Notion`
  - `OpenAI`
- Regla operativa derivada:
  - `AI Tooling` runtime vive en PostgreSQL
  - `BigQuery` queda como compatibilidad temporal y eventual fuente de backfill/histórico
  - no volver a depender de `ensureAiToolingInfrastructure()` como camino principal de request path

## Delta 2026-03-15 Performance indicators and source RpA semaphore identified and wired for runtime

- Se confirmó contra `notion_ops.tareas` que la fuente ya trae indicadores operativos explícitos, no solo señales derivadas:
  - `🟢 On-Time`
  - `🟡 Late Drop`
  - `🔴 Overdue`
  - `🔵 Carry-Over`
- También se confirmó que Notion ya trae `semáforo_rpa` como dato fuente separado de `rpa`.
- Decisión de modelado:
  - `rpa` y `semáforo_rpa` se tratan como datos distintos
  - Greenhouse debe preservar ambos:
    - `rpa_value`
    - `rpa_semaphore_source`
    - y puede seguir calculando un `rpa_semaphore_derived` para compatibilidad/guardrails
- `Project Detail > tasks` ya expone en runtime el set de indicadores fuente:
  - `rpaSemaphoreSource`
  - `rpaSemaphoreDerived`
  - `performanceIndicatorLabel`
  - `performanceIndicatorCode`
  - `deliveryCompliance`
  - `completionLabel`
  - `daysLate`
  - `rescheduledDays`
  - `isRescheduled`
  - `clientChangeRoundLabel`
  - `clientChangeRoundFinal`
  - `workflowChangeRound`
  - `originalDueDate`
  - `executionTimeLabel`
  - `changesTimeLabel`
  - `reviewTimeLabel`
- `Source Sync Runtime Projections` quedó ampliado para proyectar ese mismo set a:
  - `greenhouse_conformed.delivery_tasks`
  - `greenhouse_delivery.tasks`
  - además de señales fuente nuevas en `delivery_projects` y `delivery_sprints`
- Restricción operativa vigente:
  - el apply de BigQuery para estas nuevas columnas sigue bloqueado por `table update quota exceeded`
  - el consumer de `Project Detail` no depende de esperar ese apply porque lee estos campos directo desde `notion_ops.tareas`

## Delta 2026-03-15 Finance clients consumers migrated to canonical-first, live-compatible reads

- `Finance > Clients` ya no depende solo de `hubspot_crm.*` live para listar y detallar clientes.
- Las rutas:
  - `GET /api/finance/clients`
  - `GET /api/finance/clients/[id]`
    ahora usan patrón `canonical first + live fallback`.
- Fuente primaria nueva:
  - `greenhouse_conformed.crm_companies`
  - `greenhouse_conformed.crm_deals`
  - `greenhouse.client_service_modules`
- Compatibilidad conservada:
  - si una compañía o deal todavía no alcanzó a proyectarse por `Source Sync Runtime Projections`, el consumer cae a `hubspot_crm.companies` / `hubspot_crm.deals`
  - esto protege el flujo live donde HubSpot promociona un lead/empresa a cliente y Greenhouse lo crea en tiempo real
- Regla operativa derivada:
  - no cortar consumers a sync-only cuando el dominio todavía depende de provisioning live
  - el patrón correcto de transición es `canonical first, live fallback`, no `raw only` ni `projection only`

## Delta 2026-03-15 Admin project scope consumers now prefer delivery projections

- `Admin > tenant detail` y `Admin > user detail` ya no dependen solo de `notion_ops.proyectos` para resolver nombres de proyecto en scopes.
- Los consumers:
  - `src/lib/admin/get-admin-tenant-detail.ts`
  - `src/lib/admin/get-admin-user-detail.ts`
    ahora priorizan `greenhouse_conformed.delivery_projects.project_name`.
- `notion_ops.proyectos` queda temporalmente solo como fallback y para `page_url`, porque ese campo todavía no vive en `delivery_projects`.
- Regla derivada:
  - cuando la proyección canónica ya resuelve el nombre operativo, usarla primero
  - mantener source fallback solo para campos que aún no se materializan en el projection

## Delta 2026-03-15 Projects consumers now prefer delivery metadata first

- `Projects` ya no depende solo de `notion_ops.proyectos` y `notion_ops.sprints` para metadata base.
- Los consumers:
  - `src/lib/projects/get-projects-overview.ts`
  - `src/lib/projects/get-project-detail.ts`
    ahora priorizan:
  - `greenhouse_conformed.delivery_projects`
  - `greenhouse_conformed.delivery_sprints`
- Alcance de este corte:
  - `project_name`, `project_status`, `start_date`, `end_date`
  - `sprint_name`, `sprint_status`, `start_date`, `end_date`
- Boundary vigente:
  - `notion_ops.tareas` sigue siendo necesario para métricas finas de tarea (`rpa`, reviews, blockers, frame comments)
  - `notion_ops.proyectos` sigue aportando `page_url` y `summary`
  - `notion_ops.sprints` sigue aportando `page_url` y fallback operativo
- Regla derivada:
  - mover primero metadata estructural a `delivery_*`
  - dejar el cálculo fino en legacy hasta que esos campos también estén proyectados de forma canónica

## Delta 2026-03-15 HubSpot contacts + owners projected into canonical sync model

- `Source Sync Runtime Projections` ya materializa contactos CRM en:
  - `greenhouse_conformed.crm_contacts`
  - `greenhouse_crm.contacts`
- El slice respeta la boundary canónica acordada:
  - solo entran contactos asociados a compañías que ya pertenecen al universo Greenhouse
  - el sync modela y reconcilia CRM contacts, pero no auto-provisiona nuevos `client_users`
  - la provisión de acceso sigue siendo responsabilidad de la integración/admin live de HubSpot -> Greenhouse
- Reconciliación activa para `HubSpot Contact -> client_user / identity_profile`:
  - preferencia por `user-hubspot-contact-<contact_id>`
  - luego source link explícito
  - luego email único dentro del tenant
  - si existe user runtime enlazado y no hay profile todavía, el sync crea `profile-hubspot-contact-<contact_id>` y fija el bridge canónico
- `HubSpot Owner -> Collaborator / User` ya queda proyectado usando `greenhouse.team_members.hubspot_owner_id`:
  - `owner_member_id` queda poblado en `crm_companies`, `crm_deals` y `crm_contacts`
  - `owner_user_id` se resuelve cuando el colaborador también tiene principal en `greenhouse_core.client_users`
  - además se sincronizan source links reutilizables en `greenhouse_core`:
    - `entity_source_links` `member <- hubspot owner`
    - `entity_source_links` `user <- hubspot owner`
    - `identity_profile_source_links` `identity_profile <- hubspot owner`
- Estado validado después de rerun completo:
  - BigQuery conformed `crm_contacts = 63`
  - PostgreSQL runtime `greenhouse_crm.contacts = 63`
  - contactos con `linked_user_id = 29`
  - contactos con `linked_identity_profile_id = 29`
  - `identity_profile_source_links` HubSpot contact = `29`
  - `entity_source_links` HubSpot contact -> user = `29`
  - `crm_contacts.owner_member_id = 63`
  - `crm_contacts.owner_user_id = 61`
  - PostgreSQL runtime owner coverage:
    - companies: `owner_member_id = 9`, `owner_user_id = 9`
    - deals: `owner_member_id = 21`, `owner_user_id = 21`
  - source links de owner:
    - `member <- hubspot owner = 6`
    - `user <- hubspot owner = 1`
    - `identity_profile <- hubspot owner = 6`
- Regla operativa derivada:
  - no pedirle a la integración live que escriba directo a BigQuery
  - el source sync es quien replica a `raw` / `conformed`
  - la integración live sigue siendo la pieza de provisioning y reconciliación de accesos
  - la cobertura actual de `owner -> user` depende de cuántos colaboradores internos ya tengan principal en `client_users`; hoy solo `Julio` quedó resuelto en esa capa

## Delta 2026-03-15 Space model added to canonical 360 and delivery projections

- `greenhouse_core.spaces` y `greenhouse_core.space_source_bindings` ya existen en Cloud SQL como nuevo boundary operativo del 360.
- Regla arquitectónica ya documentada y aplicada:
  - `client` = boundary comercial
  - `space` = workspace operativo para Agency, delivery e ICO metrics
- `space-efeonce` ya no depende solo de ser un pseudo-cliente legacy:
  - vive como `internal_space`
  - `client_id = null`
  - conserva binding operativo a `project_database_source_id`
- `greenhouse_serving.space_360` ya expone el nuevo shape canónico.
- `Source Sync Runtime Projections` ahora publica `space_id` en:
  - `greenhouse_conformed.delivery_projects`
  - `greenhouse_conformed.delivery_tasks`
  - `greenhouse_conformed.delivery_sprints`
  - `greenhouse_delivery.projects`
  - `greenhouse_delivery.tasks`
  - `greenhouse_delivery.sprints`
- Estado validado:
  - `greenhouse_core.spaces = 11`
  - `client_space = 10`
  - `internal_space = 1`
  - `space_source_bindings = 69`
  - PostgreSQL delivery con `space_id`:
    - projects `57/59`
    - tasks `961/1173`
    - sprints `11/13`
  - BigQuery conformed delivery con `space_id`:
    - projects `57/59`
    - tasks `961/1173`
    - sprints `11/13`
- Transitional boundary que sigue viva:
  - el seed de `spaces` todavía nace desde `greenhouse.clients.notion_project_ids`
  - el target ya no es ese array, sino `space -> project_database_source_id`
- También se endureció la capa de acceso PostgreSQL:
  - `setup-postgres-access.sql` ahora intenta normalizar ownership de `greenhouse_core`, `greenhouse_serving` y `greenhouse_sync` hacia `greenhouse_migrator`
  - cuando un objeto legacy no puede transferirse, el script continúa con `NOTICE` en vez de bloquear toda la evolución del backbone

## Delta 2026-03-15 Data model master and source-sync runtime seed

- Se agregó la fuente de verdad del modelo de datos actual en:
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- Se agregó la guía operativa para evolucionar ese documento en:
  - `docs/operations/GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1.md`
- `AGENTS.md` y `docs/README.md` ya apuntan a ambos documentos cuando el trabajo toca modelado de datos, source sync, PostgreSQL o BigQuery.
- `Source Sync Runtime Projections` quedó ejecutado con datos reales:
  - BigQuery conformed:
    - `delivery_projects = 59`
    - `delivery_sprints = 13`
    - `delivery_tasks = 1173`
    - `crm_companies = 628`
    - `crm_deals = 178`
  - PostgreSQL runtime projections:
    - `greenhouse_delivery.projects = 59`
    - `greenhouse_delivery.sprints = 13`
    - `greenhouse_delivery.tasks = 1173`
    - `greenhouse_crm.companies = 9`
    - `greenhouse_crm.deals = 25`
- Regla 360 explicitada y ya aplicada al runtime:
  - `HubSpot Company` solo entra a `greenhouse_crm` si ya pertenece al universo de clientes Greenhouse
  - `raw` y `conformed` pueden conservar universo fuente completo
  - `greenhouse_crm` runtime mantiene solo companias cliente y sus relaciones comerciales relevantes
- `HubSpot Contacts` quedó declarado como slice obligatorio siguiente del modelo:
  - `HubSpot Contact -> client_user / identity_profile`
  - solo contactos asociados a companias cliente deben entrar al runtime Greenhouse
- Delivery quedó modelado con soporte explícito para:
  - `project_database_source_id`
  - binding tenant-level futuro del workspace de delivery en Notion

## Delta 2026-03-15 PostgreSQL access model and tooling

- Se formalizó la capa de acceso escalable a Cloud SQL en:
  - `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `AGENTS.md` ya documenta explícitamente cómo acceder y operar PostgreSQL para evitar que otros agentes vuelvan a usar el perfil incorrecto.
- Greenhouse ahora separa explícitamente tres perfiles operativos de PostgreSQL:
  - `runtime`
  - `migrator`
  - `admin`
- Nuevas variables documentadas:
  - `GREENHOUSE_POSTGRES_MIGRATOR_USER`
  - `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD`
  - `GREENHOUSE_POSTGRES_ADMIN_USER`
  - `GREENHOUSE_POSTGRES_ADMIN_PASSWORD`
- Nuevo tooling operativo:
  - `pnpm setup:postgres:access`
  - `pnpm pg:doctor`
- Scripts de setup y backfill PostgreSQL ahora cargan env local de forma consistente y pueden elegir perfil antes de abrir la conexión.
- Regla operativa derivada:
  - runtime del portal usa solo credenciales `runtime`
  - bootstrap de acceso usa `admin`
  - setup y migraciones de dominio deben correr con `migrator`
- Estado validado en Cloud SQL:
  - `greenhouse_runtime` existe y `greenhouse_app` es miembro
  - `greenhouse_migrator` existe y `greenhouse_migrator_user` es miembro
  - `greenhouse_hr`, `greenhouse_payroll` y `greenhouse_finance` ya exponen grants consumibles por ambos roles
- Alcance de esta pasada:
  - no se cambió el runtime funcional de `Payroll`
  - se dejó la fundación para que los siguientes cortes de dominio no dependan de grants manuales repetidos

## Delta 2026-03-15 Finance PostgreSQL first slice

- Se materializó el primer slice operacional de `Finance` sobre PostgreSQL en `greenhouse-pg-dev / greenhouse_app`.
- Nuevo schema operativo:
  - `greenhouse_finance`
- Objetos materializados:
  - `greenhouse_finance.accounts`
  - `greenhouse_finance.suppliers`
  - `greenhouse_finance.exchange_rates`
  - `greenhouse_serving.provider_finance_360`
- Se agregó el repository `src/lib/finance/postgres-store.ts` con validación de infraestructura, writes y lecturas `Postgres first`.
- Rutas ya cortadas o semi-cortadas a PostgreSQL:
  - `GET /api/finance/accounts`
  - `POST /api/finance/accounts`
  - `PUT /api/finance/accounts/[id]`
  - `GET /api/finance/exchange-rates`
  - `POST /api/finance/exchange-rates`
  - `GET /api/finance/exchange-rates/latest`
  - `GET/POST /api/finance/exchange-rates/sync`
  - `GET /api/finance/expenses/meta` para el subset de cuentas
- Se ejecutó backfill inicial desde BigQuery:
  - `accounts`: `1`
  - `suppliers`: `2`
  - `exchange_rates`: `0`
- Alineación 360 aplicada:
  - `suppliers.provider_id` referencia `greenhouse_core.providers`
  - el backfill de suppliers también materializa providers canónicos tipo `financial_vendor`
  - `greenhouse_serving.provider_finance_360` expone la relación `provider -> supplier`
- Permisos estructurales corregidos en Cloud SQL:
  - `greenhouse_app` recibió `USAGE` sobre `greenhouse_core`, `greenhouse_sync` y `greenhouse_serving`
  - `greenhouse_app` recibió `SELECT, REFERENCES` sobre tablas de `greenhouse_core`
  - `greenhouse_app` recibió `SELECT, INSERT, UPDATE, DELETE` sobre tablas de `greenhouse_sync`
- Boundary vigente:
  - `accounts` y `exchange_rates` ya tienen store operativo PostgreSQL
  - `suppliers` quedó materializado y backfilleado en PostgreSQL, pero el runtime principal todavía no se corta ahí para no romper `AI Tooling`, que sigue leyendo `greenhouse.fin_suppliers` en BigQuery
  - dashboards y reporting financiero pesado siguen en BigQuery por ahora

## Delta 2026-03-15 Source sync foundation materialized

- Se ejecutó el primer slice técnico del blueprint de sync externo sobre PostgreSQL y BigQuery.
- Scripts nuevos agregados:
  - `pnpm setup:postgres:source-sync`
  - `pnpm setup:bigquery:source-sync`
- En PostgreSQL (`greenhouse-pg-dev / greenhouse_app`) quedaron materializados:
  - schemas:
    - `greenhouse_crm`
    - `greenhouse_delivery`
  - tablas de control:
    - `greenhouse_sync.source_sync_runs`
    - `greenhouse_sync.source_sync_watermarks`
    - `greenhouse_sync.source_sync_failures`
  - tablas de proyección inicial:
    - `greenhouse_crm.companies`
    - `greenhouse_crm.deals`
    - `greenhouse_delivery.projects`
    - `greenhouse_delivery.sprints`
    - `greenhouse_delivery.tasks`
- En BigQuery (`efeonce-group`) quedaron materializados:
  - datasets:
    - `greenhouse_raw`
    - `greenhouse_conformed`
    - `greenhouse_marts`
  - raw snapshots:
    - `notion_projects_snapshots`
    - `notion_tasks_snapshots`
    - `notion_sprints_snapshots`
    - `notion_people_snapshots`
    - `notion_databases_snapshots`
    - `hubspot_companies_snapshots`
    - `hubspot_deals_snapshots`
    - `hubspot_contacts_snapshots`
    - `hubspot_owners_snapshots`
    - `hubspot_line_items_snapshots`
  - conformed current-state tables:
    - `delivery_projects`
    - `delivery_tasks`
    - `delivery_sprints`
    - `crm_companies`
    - `crm_deals`
- Regla operativa derivada:
  - el siguiente paso ya no es “crear estructura”, sino construir jobs de ingestión/backfill que llenen `raw`, materialicen `conformed` y proyecten `greenhouse_crm` / `greenhouse_delivery`

## Delta 2026-03-15 External source sync blueprint

- Se agregó `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` para formalizar cómo Greenhouse debe desacoplar cálculos y runtime de `Notion` y `HubSpot`.
- Dirección operativa definida:
  - `Notion` y `HubSpot` quedan como `source systems`
  - `BigQuery raw` guarda el backup inmutable y replayable
  - `BigQuery conformed` normaliza entidades externas
  - `PostgreSQL` recibe solo proyecciones runtime-críticas para cálculos y pantallas operativas
  - `BigQuery marts` mantiene analítica, 360 e histórico
- Datasets y schemas objetivo explícitos:
  - BigQuery:
    - `greenhouse_raw`
    - `greenhouse_conformed`
    - `greenhouse_marts`
  - PostgreSQL:
    - `greenhouse_crm`
    - `greenhouse_delivery`
    - `greenhouse_sync.source_sync_runs`
    - `greenhouse_sync.source_sync_watermarks`
    - `greenhouse_sync.source_sync_failures`
- Regla operativa derivada:
  - ningún cálculo crítico del portal debe seguir leyendo APIs live de `Notion` o `HubSpot` en request-time
  - el raw externo se respalda en BigQuery y el subset operativo se sirve desde PostgreSQL

## Delta 2026-03-15 HR leave preview rollout hardening

- El cutover de `HR > Permisos` a PostgreSQL en `Preview` quedó endurecido con fallback operativo a BigQuery para evitar que la vista completa falle si Cloud SQL no está disponible.
- El slice de `leave` ahora puede caer controladamente al path legacy para:
  - metadata
  - balances
  - requests
  - create/review
- Regla operativa derivada:
  - una rama `Preview` que use Cloud SQL connector debe tener el service account de `GOOGLE_APPLICATION_CREDENTIALS_JSON` con `roles/cloudsql.client`
  - sin ese rol, el error esperable es `cloudsql.instances.get` / `boss::NOT_AUTHORIZED`
- Este fallback no cambia la dirección arquitectónica:
  - PostgreSQL sigue siendo el store objetivo del dominio
  - BigQuery queda como red de seguridad temporal mientras se estabiliza el rollout por ambiente

## Delta 2026-03-15 HR leave runtime cutover to PostgreSQL

- `HR > Permisos` se convirtió en el primer dominio operativo del portal que ya usa PostgreSQL en runtime sobre la instancia `greenhouse-pg-dev`.
- Se agregó el dominio `greenhouse_hr` en Cloud SQL con:
  - `leave_types`
  - `leave_balances`
  - `leave_requests`
  - `leave_request_actions`
- El slice migrado ahora resuelve identidad desde el backbone canónico:
  - `greenhouse_core.client_users`
  - `greenhouse_core.members`
- Rutas que ahora prefieren PostgreSQL cuando el ambiente está configurado:
  - `GET /api/hr/core/meta`
  - `GET /api/hr/core/leave/balances`
  - `GET /api/hr/core/leave/requests`
  - `GET /api/hr/core/leave/requests/[requestId]`
  - `POST /api/hr/core/leave/requests`
  - `POST /api/hr/core/leave/requests/[requestId]/review`
- El resto de `HR Core` dejó de ejecutar `DDL` en request-time:
  - `ensureHrCoreInfrastructure()` queda como bootstrap explícito
  - runtime usa `assertHrCoreInfrastructureReady()` como validación no mutante
- Provisioning ejecutado en datos:
  - bootstrap único de `greenhouse_hr` en Cloud SQL
  - bootstrap único de `scripts/setup-hr-core-tables.sql` en BigQuery para dejar `HR Core` listo fuera del request path
- Infra compartida:
  - `src/lib/google-credentials.ts` centraliza las credenciales GCP para BigQuery, Cloud SQL connector y media storage
- Configuración Preview:
  - la rama `fix/codex-operational-finance` ya tiene env vars de PostgreSQL en Vercel Preview para este corte
- Boundary vigente:
  - sólo `HR > Permisos` quedó cortado a PostgreSQL
  - `departamentos`, `member profile` y `attendance` siguen en BigQuery, pero ya sin bootstraps mutantes en navegación normal

## Delta 2026-03-31 HR leave policy, calendar and payroll impact hardening

- `HR > Permisos` ya no depende de `requestedDays` enviado por el caller:
  - los días hábiles se derivan desde `src/lib/hr-core/leave-domain.ts`
  - esa capa se apoya en el calendario operativo canónico y en `Nager.Date` para feriados Chile
- El dominio `greenhouse_hr` suma `leave_policies` como capa explícita de policy para leave.
- `/api/hr/core/leave/calendar` queda disponible como source canónica del calendario de ausencias del equipo.
- `/api/my/leave` deja de ser solo balances y ahora devuelve también `requests` + `calendar`.
- El setup real del dominio quedó aplicado en `greenhouse-pg-dev / greenhouse_app`:
  - `pnpm setup:postgres:hr-leave`
  - `pnpm setup:postgres:person-360-contextual`
  - validación runtime posterior: `leave_policies=10`, `leave_types=10`, `leave_balances=4`
- El outbox de leave ahora emite:
  - `leave_request.created`
  - `leave_request.escalated_to_hr`
  - `leave_request.approved`
  - `leave_request.rejected`
  - `leave_request.cancelled`
  - `leave_request.payroll_impact_detected`
- Regla arquitectónica vigente:
  - leave no calcula costos ni provider/tooling directo
  - el carril canónico es `leave -> payroll -> cost projections`
- Cuando un permiso aprobado impacta un período de nómina no exportado:
  - se recalcula payroll oficial desde la proyección reactiva `leave_payroll_recalculation`
  - luego siguen reaccionando los consumers habituales de payroll/cost attribution
- Cuando el período ya está `exported`, el sistema no recalculea automáticamente:
  - emite alerta operativa para payroll/finance
  - el ajuste queda como downstream manual/diferido por política

## Delta 2026-03-15 Data platform architecture and Cloud SQL foundation

- Se agregó la arquitectura de datos objetivo en:
  - `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- La dirección formal del stack queda declarada como:
  - `PostgreSQL` para `OLTP` y workflows mutables
  - `BigQuery` para `raw`, `conformed`, `core analytics` y `marts`
- Se provisionó la primera base operacional de referencia en Google Cloud:
  - proyecto: `efeonce-group`
  - instancia Cloud SQL: `greenhouse-pg-dev`
  - motor: `POSTGRES_16`
  - región: `us-east4`
  - tier: `db-custom-1-3840`
  - storage: `20 GB SSD`
  - base inicial: `greenhouse_app`
  - usuario inicial: `greenhouse_app`
- Secretos creados en Secret Manager:
  - `greenhouse-pg-dev-postgres-password`
  - `greenhouse-pg-dev-app-password`
- Boundary vigente:
  - la app todavía no está conectada a Postgres en runtime
  - esta pasada deja lista la fundación de infraestructura y el backbone canónico 360, no el cutover runtime
  - la integración de aplicación debe hacerse vía repository/services, no con rewrites directos módulo por módulo contra Cloud SQL
- Materialización ejecutada sobre la instancia:
  - esquemas:
    - `greenhouse_core`
    - `greenhouse_serving`
    - `greenhouse_sync`
  - vistas 360:
    - `client_360`
    - `member_360`
    - `provider_360`
    - `user_360`
    - `client_capability_360`
  - tabla de publicación:
    - `greenhouse_sync.outbox_events`
- Scripts operativos agregados:
  - `pnpm setup:postgres:canonical-360`
  - `pnpm backfill:postgres:canonical-360`
- Backfill inicial ejecutado desde BigQuery hacia Postgres:
  - `clients`: `11`
  - `identity_profiles`: `9`
  - `identity_profile_source_links`: `29`
  - `client_users`: `39`
  - `members`: `7`
  - `providers`: `8` canónicos sobre `11` filas origen, por deduplicación real de `provider_id`
  - `service_modules`: `9`
  - `client_service_modules`: `30`
  - `roles`: `8`
  - `user_role_assignments`: `40`
- Variables nuevas documentadas:
  - `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`
  - `GREENHOUSE_POSTGRES_IP_TYPE`
  - `GREENHOUSE_POSTGRES_HOST`
  - `GREENHOUSE_POSTGRES_PORT`
  - `GREENHOUSE_POSTGRES_DATABASE`
  - `GREENHOUSE_POSTGRES_USER`
  - `GREENHOUSE_POSTGRES_PASSWORD`
  - `GREENHOUSE_POSTGRES_MAX_CONNECTIONS`
  - `GREENHOUSE_POSTGRES_SSL`
  - `GREENHOUSE_BIGQUERY_DATASET`
  - `GREENHOUSE_BIGQUERY_LOCATION`

## Delta 2026-03-15 Finance exchange-rate sync persistence

- `Finance` ahora tiene hidratación automática server-side de `USD/CLP` para evitar que ingresos/egresos en USD dependan de carga manual previa.
- Proveedores activos para tipo de cambio:
  - primario: `mindicador.cl`
  - fallback: `open.er-api.com`
- Superficie backend agregada:
  - `POST /api/finance/exchange-rates/sync`
    - uso interno autenticado por sesión `finance_manager`
    - también admite acceso interno por cron
  - `GET /api/finance/exchange-rates/sync`
    - pensado para `Vercel Cron`
  - `GET /api/finance/exchange-rates/latest`
    - ahora intenta hidratar y persistir si no existe ninguna tasa `USD -> CLP` almacenada
- Persistencia operativa:
  - se guardan ambos pares por fecha:
    - `USD -> CLP`
    - `CLP -> USD`
  - la tabla sigue siendo `greenhouse.fin_exchange_rates`
  - el `rate_id` sigue siendo determinístico: `${fromCurrency}_${toCurrency}_${rateDate}`
- Ajuste de runtime:
  - `resolveExchangeRateToClp()` ahora puede auto-hidratar `USD/CLP` antes de fallar cuando no encuentra snapshot almacenado
- Deploy/configuración:
  - se agregó `vercel.json` con cron diario hacia `/api/finance/exchange-rates/sync`
  - nueva variable opcional: `CRON_SECRET`
- Regla operativa derivada:
  - frontend no debe intentar resolver tipo de cambio desde cliente ni depender de input manual cuando el backend ya puede hidratar la tasa del día

## Delta 2026-03-14 Portal surface consolidation task

- Se documentó una task `to-do` específica para consolidación UX y arquitectura de surfaces del portal:
  - `docs/tasks/to-do/CODEX_TASK_Portal_View_Surface_Consolidation.md`
- La task no propone cambios de código inmediatos.
- Su objetivo es resolver con criterio explícito:
  - qué vistas son troncales
  - qué vistas se unifican
  - qué vistas se enriquecen
  - qué vistas deben pasar a tabs, drilldowns o redirects
- Regla operativa derivada:
  - no seguir abriendo rutas nuevas por módulo sin revisar antes esta consolidación de surfaces

## Delta 2026-03-14 People + Team capacity backend complements

- `People v3` y `Team Identity & Capacity v2` ya no dependen solo de contratos mínimos heredados.
- Complementos backend activos:
  - `GET /api/people/meta`
  - `GET /api/people` ahora también devuelve `filters`
  - `GET /api/people/[memberId]` ahora puede devolver `capacity` y `financeSummary`
  - `GET /api/team/capacity` ahora devuelve semántica explícita de capacidad por miembro y por rol
- Regla operativa derivada:
  - frontend no debe inferir salud de capacidad desde `FTE` o `activeAssets` si el backend ya devuelve `capacityHealth`
  - frontend de `People` debe usar `meta`, `capacity` y `financeSummary` como contratos canónicos de lectura 360

## Delta 2026-03-14 Team Identity & People task reclassification

- `Team Identity & Capacity` y `People Unified View v2` fueron contrastadas explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `FINANCE_CANONICAL_360_V1.md` en el caso de `People`
- Resultado operativo:
  - `People` sí está alineado con arquitectura y sí existe como módulo real
  - `People v2` ya debe tratarse como brief histórico porque el runtime avanzó más allá de su contexto original
  - `Team Identity & Capacity` sí cerró la base canónica de identidad sobre `team_members.member_id`
  - la parte de capacidad no debe tratarse todavía como cerrada
- Regla operativa derivada:
  - `docs/tasks/complete/CODEX_TASK_People_Unified_View_v2.md` queda como brief histórico
  - `docs/tasks/complete/CODEX_TASK_People_Unified_View_v3.md` queda como cierre fundacional de la surface
  - `docs/tasks/to-do/CODEX_TASK_People_360_Enrichments_v1.md` pasa a ser la task vigente para enrichments 360 del colaborador
  - `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` queda como brief histórico/fundacional
  - `docs/tasks/to-do/CODEX_TASK_Team_Identity_Capacity_System_v2.md` pasa a ser la task vigente para formalización de capacity

## Delta 2026-03-14 Creative Hub task reclassification

- `Creative Hub` fue contrastado explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_SERVICE_MODULES_V1.md`
  - `Greenhouse_Capabilities_Architecture_v1.md`
- Resultado operativo:
  - el módulo sí está alineado estructuralmente con arquitectura
  - `Creative Hub` sigue siendo una capability surface, no un objeto canónico nuevo
  - el cliente canónico sigue anclado a `greenhouse.clients.client_id`
  - el brief original no debe tratarse como completamente implementado
- Gaps detectados en runtime:
  - activación demasiado amplia del módulo por `businessLine = globe`
  - ausencia real de la capa `Brand Intelligence`
  - `CSC Pipeline Tracker` soportado hoy con heurísticas, no con un modelo explícito de `fase_csc`
- Regla operativa derivada:
  - `docs/tasks/complete/CODEX_TASK_Creative_Hub_Module.md` queda como brief histórico
  - `docs/tasks/to-do/CODEX_TASK_Creative_Hub_Module_v2.md` pasa a ser la task vigente para cierre runtime

## Delta 2026-03-14 Creative Hub backend runtime closure

- `Creative Hub v2` ya no depende solo del snapshot genérico de `Capabilities`; ahora tiene backend propio de enriquecimiento creativo para cerrar los gaps detectados.
- Complementos backend agregados:
  - `resolveCapabilityModules()` ahora exige match de `business line` y `service module` cuando ambos requisitos existen
  - `creative-hub` ya soporta activación por:
    - `agencia_creativa`
    - `produccion_audiovisual`
    - `social_media_content`
  - `src/lib/capability-queries/creative-hub-runtime.ts` agrega snapshot detallado de tareas con:
    - fase CSC explícita o derivada
    - aging real
    - FTR/RpA reales cuando existen columnas soporte
- Superficie runtime cerrada para frontend:
  - `GET /api/capabilities/creative-hub/data` ahora devuelve también:
    - sección `Brand Intelligence`
    - pipeline CSC por fase real
    - stuck assets calculados por tarea/fase
- Boundary vigente:
  - `Creative Hub` sigue siendo capability surface dentro de `Capabilities`
  - no crea objeto canónico paralelo de capability, asset o proyecto

## Delta 2026-03-14 HR core backend foundation

- `HR Core Module` fue contrastado explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- Resultado operativo:
  - `Collaborator` sigue anclado a `greenhouse.team_members.member_id`
  - `Admin Team` mantiene ownership del roster base
  - `People` sigue siendo la vista read-first del colaborador
  - `HR Core` queda como capa de extensión para estructura org, perfil HR, permisos, asistencia y acciones de aprobación
- Infraestructura backend agregada:
  - `ensureHrCoreInfrastructure()` extiende `team_members` con:
    - `department_id`
    - `reports_to`
    - `job_level`
    - `hire_date`
    - `contract_end_date`
    - `daily_required`
  - crea:
    - `greenhouse.departments`
    - `greenhouse.member_profiles`
    - `greenhouse.leave_types`
    - `greenhouse.leave_balances`
    - `greenhouse.leave_requests`
    - `greenhouse.leave_request_actions`
    - `greenhouse.attendance_daily`
  - seed del rol `employee` con `route_group_scope = ['internal', 'employee']`
- Superficie backend activa:
  - `GET /api/hr/core/meta`
  - `GET/POST /api/hr/core/departments`
  - `GET/PATCH /api/hr/core/departments/[departmentId]`
  - `GET/PATCH /api/hr/core/members/[memberId]/profile`
  - `GET /api/hr/core/leave/balances`
  - `GET/POST /api/hr/core/leave/requests`
  - `GET /api/hr/core/leave/requests/[requestId]`
  - `POST /api/hr/core/leave/requests/[requestId]/review`
  - `GET /api/hr/core/attendance`
  - `POST /api/hr/core/attendance/webhook/teams`
- Ajuste de identidad/acceso:
  - `tenant/access.ts` y `tenant/authorization.ts` ya reconocen `employee` como route group válido
- Variable nueva:
  - `HR_CORE_TEAMS_WEBHOOK_SECRET` para proteger la ingesta externa de asistencia

## Delta 2026-03-14 AI tooling backend foundation

- `AI Tooling & Credit System` fue contrastada explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
  - `FINANCE_CANONICAL_360_V1.md`
- Resultado operativo:
  - la task sí quedó alineada con arquitectura
  - `greenhouse.clients.client_id` sigue siendo el ancla canónica de cliente para wallets y ledger
  - `greenhouse.team_members.member_id` sigue siendo el ancla canónica de colaborador para licencias y consumos atribuibles
  - `greenhouse.providers.provider_id` ya existe en runtime como registro reusable de vendor/plataforma
  - `ai_tool_catalog`, `member_tool_licenses`, `ai_credit_wallets` y `ai_credit_ledger` quedan como tablas de dominio, no como identidades paralelas
- Infraestructura backend agregada:
  - `ensureAiToolingInfrastructure()` crea on-demand:
    - `greenhouse.providers`
    - `greenhouse.ai_tool_catalog`
    - `greenhouse.member_tool_licenses`
    - `greenhouse.ai_credit_wallets`
    - `greenhouse.ai_credit_ledger`
  - `scripts/setup-ai-tooling-tables.sql` queda como referencia SQL versionada del mismo bootstrap
- Superficie backend activa:
  - operación:
    - `GET /api/ai-tools/catalog`
    - `GET /api/ai-tools/licenses`
  - créditos:
    - `GET /api/ai-credits/wallets`
    - `GET /api/ai-credits/ledger`
    - `GET /api/ai-credits/summary`
    - `POST /api/ai-credits/consume`
    - `POST /api/ai-credits/reload`
  - admin:
    - `GET /api/admin/ai-tools/meta`
    - `GET/POST /api/admin/ai-tools/catalog`
    - `GET/PATCH /api/admin/ai-tools/catalog/[toolId]`
    - `GET/POST /api/admin/ai-tools/licenses`
    - `GET/PATCH /api/admin/ai-tools/licenses/[licenseId]`
    - `GET/POST /api/admin/ai-tools/wallets`
    - `GET/PATCH /api/admin/ai-tools/wallets/[walletId]`
- Regla operativa derivada:
  - frontend de AI Tooling no debe inventar catálogo, providers, enums ni balance derivado si el backend ya entrega esos contratos

## Delta 2026-03-14 Admin team backend complements

- `Admin Team Module v2` fue contrastado explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- Resultado operativo:
  - la task sigue alineada con arquitectura
  - `Admin Team` mantiene ownership de las mutaciones de roster y asignaciones
  - `People` sigue siendo read-first y no incorpora writes
  - `team_members.member_id` sigue siendo el ancla canónica del colaborador
- Complementos backend agregados para cerrar mejor el módulo:
  - `GET /api/admin/team/members` ahora devuelve metadata + `members` + `summary`
  - `GET /api/admin/team/members/[memberId]`
  - `GET /api/admin/team/assignments`
  - `GET /api/admin/team/assignments/[assignmentId]`
- Ajuste de alineación con identidad:
  - `Admin Team` puede seguir guardando snapshots útiles en `team_members`
  - cuando el colaborador ya tiene `identity_profile_id`, el backend ahora sincroniza best-effort `azureOid`, `notionUserId` y `hubspotOwnerId` hacia `greenhouse.identity_profile_source_links`

## Delta 2026-03-14 HR payroll v3 backend complements

- `HR Payroll v3` ya fue contrastado explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
- Resultado operativo:
  - la `v3` sí está alineada con arquitectura
  - `Payroll` sigue owning `compensation_versions`, `payroll_periods` y `payroll_entries`
  - el colaborador sigue anclado a `greenhouse.team_members.member_id`
  - no se movieron writes hacia `People` ni `Admin`
- Complementos backend agregados para desbloquear frontend:
  - `GET /api/hr/payroll/compensation` ahora devuelve `compensations`, `eligibleMembers`, `members` y `summary`
  - `GET /api/hr/payroll/compensation/eligible-members`
  - `GET /api/hr/payroll/periods` ahora devuelve `periods` + `summary`
  - `GET /api/hr/payroll/periods/[periodId]/entries` ahora devuelve `entries` + `summary`
  - `GET /api/hr/payroll/members/[memberId]/history` ahora incluye `member` además de `entries` y `compensationHistory`
- Regla operativa derivada:
  - frontend de `HR Payroll` debe consumir estos contratos como source of truth y no recomputar discovery de colaboradores o KPIs agregados si el backend ya los expone

## Delta 2026-03-14 Finance backend runtime closure

- `Finance` ya no debe tratarse solo como dashboard + CRUD parcial; ahora también expone una capa backend de soporte operativo para que frontend cierre conciliación y egresos especializados sin inventar contratos.
- Superficie backend agregada o endurecida:
  - `GET /api/finance/reconciliation/[id]/candidates`
  - `POST /api/finance/reconciliation/[id]/exclude`
  - `GET /api/finance/expenses/meta`
  - `GET /api/finance/expenses/payroll-candidates`
  - `POST /api/finance/expenses` ahora también acepta campos especializados de previsión, impuestos y varios
- Regla operativa vigente:
  - conciliación sigue siendo ownership de `Finance`; los writes siguen viviendo en `fin_reconciliation_periods`, `fin_bank_statement_rows`, `fin_income` y `fin_expenses`
  - la integración con `Payroll` sigue siendo read-only desde `Finance`; la nueva superficie de payroll candidates no convierte a `Finance` en source of truth de nómina
  - los contratos nuevos siguen anclados a `client_id` y `member_id` cuando corresponde
- Ajuste de consistencia relevante:
  - `auto-match`, `match`, `unmatch` y `exclude` ya no pueden dejar desacoplado el estado entre la fila bancaria y la transacción financiera reconciliada

## Delta 2026-04-08 Finance reconciliation settlement orchestration completed

- `Finance > Conciliación` ya opera sobre el mismo contrato ledger-first de `Cobros` y `Pagos`.
- Regla operativa vigente:
  - `income_payments` y `expense_payments` son la unidad canónica de caja
  - `matchedPaymentId` y `matchedSettlementLegId` forman parte del contrato operativo de conciliación
  - las routes de `match`, `unmatch`, `exclude` y `auto-match` no deben duplicar eventos de pago; el source of truth de publicación vive en el store Postgres
- Settlement orchestration disponible en runtime:
  - `GET/POST /api/finance/settlements/payment`
  - `SettlementOrchestrationDrawer` desde el historial de pagos/cobros
  - `RegisterCashOutDrawer` soporta `settlementMode`, `fundingInstrumentId`, `fee*` y `exchangeRateOverride`
  - `RegisterCashInDrawer` soporta `fee*` y `exchangeRateOverride`
- Conciliación operativa:
  - `ReconciliationDetailView` muestra snapshots del instrumento/proveedor/moneda del período
  - permite `Marcar conciliado` y `Cerrar período`
  - la transición a `reconciled` exige extracto importado, diferencia en cero y sin filas pendientes
- Eventos reactivos vigentes:
  - `finance.income_payment.reconciled|unreconciled`
  - `finance.expense_payment.reconciled|unreconciled`
  - `finance.settlement_leg.recorded|reconciled|unreconciled`
  - `finance.internal_transfer.recorded`
  - `finance.fx_conversion.recorded`
  - `finance.reconciliation_period.reconciled|closed`

## Delta 2026-04-08 Finance bank & treasury module completed

- `Finance` ya no expone solo `Cobros`, `Pagos`, `Posición de caja` y `Conciliación`; ahora también tiene la superficie `Banco` en `/finance/bank`.
- Regla operativa vigente:
  - el saldo por instrumento se lee desde `greenhouse_finance.account_balances`
  - `account_balances` se materializa reactivamente; no debe recalcularse inline en la UI salvo recovery puntual
  - transferencias internas entre cuentas propias viven como settlement orchestration (`internal_transfer` + opcional `fx_conversion`), no como gasto/ingreso
- Superficie backend agregada:
  - `GET/POST /api/finance/bank`
  - `GET/POST /api/finance/bank/[accountId]`
  - `POST /api/finance/bank/transfer`
- Helpers nuevos:
  - `src/lib/finance/account-balances.ts`
  - `src/lib/finance/internal-transfers.ts`
  - `src/lib/sync/projections/account-balances.ts`
- Integración transversal:
  - `Banco`, `Cobros`, `Pagos`, `Conciliación` y `Posición de caja` comparten el mismo contrato instrument-aware
  - los drawers de caja y settlement usan `/api/finance/accounts` para seleccionar instrumentos visibles al equipo de finanzas
  - `Banco` quedó restringido a `efeonce_admin`, `finance_admin` y `finance_analyst`; no debe asumirse como superficie general de cualquier usuario con route group `finance`

## Delta 2026-04-10 Finance shareholder account canonical traceability completed

- `Finance > Cuenta accionista` ya no usa IDs manuales como contrato primario para trazabilidad cross-module.
- Schema vigente:
  - `greenhouse_finance.shareholder_account_movements` incorpora `source_type` + `source_id`
  - compatibilidad legacy preservada con `linked_*`, pero el origen canónico pasa por `source_type` / `source_id`
- Reglas operativas:
  - toda resolución de origen CCA corre server-side y tenant-safe
  - `expense` se filtra por `space_id`
  - `income` se resuelve por `organization_id` / `client_id` / `client_profile_id` cuando no existe `space_id` directo
  - `settlement_group_id` no debe capturarse manualmente en la UI; backend lo deriva desde el origen real cuando aplica
- Superficie backend agregada:
  - `GET /api/finance/shareholder-account/lookups/sources`
- Integración transversal:
  - `GET/POST /api/finance/shareholder-account/[id]/movements` ahora devuelve `sourceType`, `sourceId` y `source` enriquecido
  - `ExpenseDetailView` e `IncomeDetailView` pueden abrir CCA precontextualizada con el documento real
  - los balances y métricas siguen dependiendo de settlement / `account_balances`, no de cálculos inline del módulo

## Delta 2026-04-08 Finance shareholder current account module completed

- `Finance` agrega la superficie `Cuenta accionista` en `/finance/shareholder-account` como carril bilateral empresa ↔ accionista, montado sobre el runtime de tesorería existente.
- Modelo vigente:
  - `greenhouse_finance.accounts.instrument_category` incluye `shareholder_account`
  - `greenhouse_finance.shareholder_accounts` extiende el instrumento con `profile_id`, `member_id` opcional, participación, estado, notas y `space_id`
  - `greenhouse_finance.shareholder_account_movements` persiste el ledger append-only de cargos/abonos
- Regla operativa:
  - cada movimiento manual crea `settlement_group` + `settlement_legs` reutilizando la misma base de settlement que `Banco`, `Cobros`, `Pagos` y `Conciliación`
  - el saldo visible se rematerializa en `account_balances`; no debe recalcularse inline en la UI
  - `credit` significa que la empresa debe al accionista; `debit` significa que el accionista debe a la empresa
- Superficie backend agregada:
  - `GET/POST /api/finance/shareholder-account`
  - `GET /api/finance/shareholder-account/people`
  - `GET /api/finance/shareholder-account/[id]/balance`
  - `GET/POST /api/finance/shareholder-account/[id]/movements`
- Integración transversal:
  - la creación de cuentas busca personas por nombre/email en Identity y autocompleta `profile_id` / `member_id`
  - soporta el caso donde un accionista también existe como usuario interno / superadministrador dentro de Greenhouse
  - acceso protegido por `finanzas.cuenta_corriente_accionista` con el mismo fallback operativo que `Banco`

## Delta 2026-03-14 Task board reorganization

- `docs/tasks/` ya no debe leerse como una carpeta plana de briefs.
- Regla operativa nueva:
  - las `CODEX_TASK_*` se ordenan en paneles `in-progress`, `to-do` y `complete`
  - `docs/tasks/README.md` es la vista maestra del board y la única entrada obligatoria para entender estado vigente de tasks
  - `complete` puede incluir tasks implementadas, absorbidas por una v2 o mantenidas como referencia histórica cerrada
- Regla de versionado nueva:
  - los briefs `CODEX_TASK_*` vigentes del proyecto deben vivir dentro de `docs/tasks/**`
  - el patrón ignorado `CODEX_TASK_*.md` ya no debe ocultar los documentos bajo `docs/tasks/`; queda reservado solo para scratch local en raíz
- Restricción operativa nueva:
  - mover una task entre paneles requiere contraste con repo real + `project_context.md` + `Handoff.md` + `changelog.md`, no solo intuición

## Delta 2026-03-14 Provider canonical object alignment

- La arquitectura 360 ya no debe tratar `provider`, `vendor` o `supplier` como conceptos intercambiables.
- Regla operativa nueva:
  - `Provider` pasa a reconocerse como objeto canónico objetivo para vendors/plataformas reutilizables entre AI Tooling, Finance, Identity y Admin
  - ancla recomendada: `greenhouse.providers.provider_id`
  - `fin_suppliers` debe tratarse como extensión financiera del Provider, no como identidad global del vendor
  - `vendor` libre puede existir como snapshot/display label, pero no como relación primaria cuando el vínculo de proveedor sea reusable entre módulos
- Impacto inmediato en diseño:
  - la task de `AI Tooling & Credit System` debe relacionar `ai_tool_catalog` con `provider_id`
  - futuras relaciones de licencias, wallets, costos y mapeos de identidad deben resolver contra `provider_id` cuando aplique

## Delta 2026-03-14 Greenhouse 360 object model

- El repo ahora formaliza una regla de arquitectura transversal: Greenhouse debe evolucionar como plataforma de `objetos canónicos enriquecidos`, no como módulos con identidades paralelas por silo.
- Documento canónico nuevo:
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- Regla operativa vigente:
  - si un módulo describe un objeto ya existente en Greenhouse, debe anclarse a su ID canónico
  - las tablas de dominio pueden existir, pero como `extension tables`, `transaction tables` o `event tables`, no como nuevos maestros del mismo objeto
  - las vistas 360 deben salir de read models enriquecidos sobre objetos compartidos
- Catálogo canónico actual explicitado:
  - `Cliente` → `greenhouse.clients.client_id`
  - `Colaborador` → `greenhouse.team_members.member_id`
  - `Producto/Capability` → `greenhouse.service_modules.module_id`
  - `Cotización`, `Proyecto` y `Sprint` quedan definidos como objetos canónicos objetivo aunque todavía necesiten mayor formalización de identidad en runtime

## Delta 2026-03-14 Finance canonical backend phase

- El módulo `Finance` mantiene sus tablas `fin_*` como capa transaccional propia, pero ya no debe modelarse como silo aislado:
  - `greenhouse.clients.client_id` queda como llave canónica de cliente
  - `greenhouse.team_members.member_id` queda como llave canónica de colaborador
  - `fin_client_profiles` actúa como extensión financiera del tenant, no como identidad primaria paralela
- Regla operativa vigente del backend financiero:
  - nuevas escrituras deben resolver referencias por `clientId` cuando sea posible
  - durante la transición se aceptan `clientProfileId` y `hubspotCompanyId`, pero el backend valida consistencia y responde `409` ante referencias incompatibles
  - egresos que vengan con `payrollEntryId` deben resolverse a `memberId` server-side
- Superficie backend relevante agregada o endurecida:
  - `src/lib/finance/canonical.ts` centraliza resolución cliente/persona
  - `GET /api/people/[memberId]/finance` agrega lectura financiera read-only para People sin introducir writes bajo `/api/people/*`
- Boundary de arquitectura:
  - `Finance` sigue owning cuentas, proveedores, tipos de cambio y conciliación
  - las vistas 360 deben salir de read-models enriquecidos, no de convertir `fin_*` en source of truth para roster o tenants

## Delta 2026-03-14 Admin team backend foundation

- El repo ya tiene la primera capa backend de escritura para `Admin Team Module v2` sobre rama de trabajo dedicada:
  - `src/lib/team-admin/mutate-team.ts`
  - `/api/admin/team/meta`
  - `/api/admin/team/members`
  - `/api/admin/team/members/[memberId]`
  - `/api/admin/team/members/[memberId]/deactivate`
  - `/api/admin/team/assignments`
  - `/api/admin/team/assignments/[assignmentId]`
- Regla operativa vigente:
  - `Admin Team` es la única capa de mutación de roster/asignaciones
  - `People` sigue siendo read-first y no debe incorporar writes bajo `/api/people/*`
  - todas las mutaciones nuevas se protegen con `requireAdminTenantContext()` y quedan reservadas a `efeonce_admin`
- Boundary de coordinación vigente:
  - Codex implementa backend de `Admin Team`
  - Claude implementa frontend de `Admin Team`
  - Claude puede avanzar en paralelo una vez exista el `mutation contract freeze` mínimo
- Ajuste de contrato para frontend:
  - `GET /api/admin/team/meta` expone metadata para drawers admin (`activeClients`, `roleCategories`, `contactChannels`)
  - `GET /api/admin/team/members` se mantiene como capability handshake compatible con la task para habilitar CTAs admin sin depender de `404/405`

## Delta 2026-03-14 People unified frontend

- Frontend completo de `People Unified View v2` implementado sobre los contratos backend:
  - `/people` → `PeopleList.tsx` (stats + filtros + tabla TanStack)
  - `/people/[memberId]` → `PersonView.tsx` (2 columnas: sidebar + tabs)
- Tabs dinamicos segun `detail.access.visibleTabs` del backend:
  - Asignaciones (read-only, ghost slot para futuro CRUD)
  - Actividad (3 KPI cards + breakdown por proyecto)
  - Compensacion (desglose vigente con seccion Chile condicional)
  - Nomina (chart ApexCharts + tabla detalle por periodo)
- Sidebar "Equipo > Personas" agregado al `VerticalMenu.tsx`:
  - visibilidad por `roleCodes`, no por route group
  - posicion: despues de Agencia, antes de HR
- Componentes reutilizables nuevos:
  - `CountryFlag.tsx` (banderas emoji por ISO alpha-2)
  - `IntegrationStatus.tsx` (check verde/gris por provider)
- La carpeta `views/greenhouse/people/drawers/` queda reservada para Admin Team Module (CRUD)

## Delta 2026-03-14 People unified backend foundation

- El repo ya tiene una primera capa backend read-only para `People Unified View`:
  - `GET /api/people`
  - `GET /api/people/[memberId]`
  - `src/lib/people/get-people-list.ts`
  - `src/lib/people/get-person-detail.ts`
  - `src/lib/people/get-person-operational-metrics.ts`
  - `src/types/people.ts`
- Regla operativa de acceso vigente:
  - `People` no introduce route group `people`
  - el backend valida `internal` y restringe por roles reales:
    - `efeonce_admin`
    - `efeonce_operations`
    - `hr_payroll`
- Regla operativa de arquitectura:
  - `People` es lectura consolidada, no CRUD
  - no se deben introducir writes bajo `/api/people/*`
  - el futuro `Admin Team Module` debe vivir bajo `/api/admin/team/*` y reutilizar la misma capa de datos
- Fuentes reales del backend `People`:
  - roster: `greenhouse.team_members`
  - assignments: `greenhouse.client_team_assignments`
  - identidad: `greenhouse.identity_profile_source_links`
  - actividad: `notion_ops.tareas`
  - HR: `greenhouse.compensation_versions` y `greenhouse.payroll_entries`
- Regla de modelado vigente:
  - usar `location_country`, no crear una columna redundante `country`
  - tratar `team_members.identity_profile_id` como identidad canonica de persona
  - tratar `client_users` como principal de acceso, no como ficha laboral
- Estado de integracion actual:
  - ya existen `/people` y `/people/[memberId]` en App Router
  - el sidebar ya expone `Personas`
  - el frontend consume el contrato backend consolidado
  - `pnpm build` ya incluye las dos rutas UI y las dos APIs del modulo
- Regla de acople frontend/backend:
  - el frontend no debe recalcular permisos de tabs desde la session si el backend ya entrega `access.visibleTabs`
  - el sidebar de persona debe usar `summary` del payload, no recomputar FTE u horas desde la tabla

## Delta 2026-03-14 HR payroll backend foundation

- El repo ya tiene una primera capa backend operativa de `HR Payroll` bajo el route group propio `hr`:
  - `src/app/(dashboard)/hr/layout.tsx`
  - `src/app/api/hr/payroll/**`
  - `src/lib/payroll/**`
  - `src/types/payroll.ts`
- La infraestructura de payroll no depende exclusivamente de una migración manual previa:
  - `ensurePayrollInfrastructure()` crea on-demand `greenhouse.compensation_versions`, `greenhouse.payroll_periods`, `greenhouse.payroll_entries` y `greenhouse.payroll_bonus_config`
  - el seed del rol `hr_payroll` también quedó incorporado en runtime y en SQL versionado
- Reglas backend vigentes del módulo:
  - solo períodos `draft` aceptan cambios de `uf_value`, `tax_table_version` o `notes`
  - la aprobación de nómina revalida server-side que los bonos respeten elegibilidad y rangos
  - la creación de `compensation_versions` ya no debe generar solapes de vigencia y distingue entre versiones actuales y futuras usando `effective_from` / `effective_to`
- Estado de validación actual:
  - `pnpm build`: correcto con las rutas `HR Payroll` incluidas
  - la validación runtime contra BigQuery real ya confirmó:
    - schema vivo de `notion_ops.tareas` con `responsables_ids`, `rpa`, `estado`, `last_edited_time`, `fecha_de_completado` y `fecha_límite`
    - bootstrap aplicado de `greenhouse.compensation_versions`, `greenhouse.payroll_periods`, `greenhouse.payroll_entries` y `greenhouse.payroll_bonus_config`
    - seed aplicado del rol `hr_payroll` en `greenhouse.roles`
- Ajuste operativo derivado del smoke real:
  - `fetch-kpis-for-period.ts` ya no debe asumir aliases sin acento como `fecha_limite`; en producción existen columnas acentuadas y deben citarse como identifiers escapados en SQL dinámico
  - el DDL versionado de payroll se endureció para no depender de `DEFAULT` literales en BigQuery, porque el runtime de la app ya setea esos valores explícitamente

## Delta 2026-03-14 GitHub collaboration hygiene

- El repo ahora incorpora una capa explicita de buenas practicas GitHub bajo `.github/`:
  - `workflows/ci.yml`
  - `PULL_REQUEST_TEMPLATE.md`
  - `ISSUE_TEMPLATE/bug_report.yml`
  - `ISSUE_TEMPLATE/feature_request.yml`
  - `ISSUE_TEMPLATE/config.yml`
  - `dependabot.yml`
  - `CODEOWNERS`
- La automatizacion minima esperada del repo queda formalizada:
  - `pnpm lint`
  - `pnpm build`
  - revision semanal de dependencias `npm` y GitHub Actions via Dependabot
- Se agregaron `.github/SECURITY.md` y `.github/SUPPORT.md` como documentos canonicos de reporte y soporte del repositorio.
- Regla operativa nueva:
  - Greenhouse es un repo `private` con licencia comercial declarada en `package.json`
  - no debe agregarse una licencia open source por defecto ni asumir permisos de redistribucion sin decision explicita de Efeonce
- Se removio la contradiccion de `.gitignore` respecto de `full-version/`; aunque siga siendo referencia local, hoy existe versionado en este workspace y no debe tratarse como artefacto ignorado.

## Delta 2026-03-14 Document structure reorganization

- La raiz documental del repo ya no debe usarse para mezclar specs, tasks y guias especializadas.
- Regla operativa vigente:
  - en raiz solo quedan `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `project_context.md`, `Handoff.md`, `Handoff.archive.md` y `changelog.md`
  - la documentacion canónica no operativa ahora vive en `docs/`
- Taxonomia activa:
  - `docs/architecture/`
  - `docs/api/`
  - `docs/ui/`
  - `docs/roadmap/`
  - `docs/operations/`
  - `docs/tasks/`
- `docs/README.md` es el mapa maestro y `docs/tasks/README.md` concentra el board de briefs `CODEX_TASK_*`.
- Estructura viva de tasks:
  - `docs/tasks/in-progress/`
  - `docs/tasks/to-do/`
  - `docs/tasks/complete/`

## Delta 2026-03-14 Agency data hydration correction

- La capa `agency` ya no debe asumir que toda la senal operativa vive solo en `notion_project_ids` ni filtrar `greenhouse.clients` por `tenant_type`.
  - `src/lib/agency/agency-queries.ts` ahora toma `clients.active = TRUE` como base canonica de spaces.
  - El inventario de proyectos agency se arma desde la union de:
    - `greenhouse.clients.notion_project_ids`
    - `greenhouse.user_project_scopes` via `greenhouse.client_users`
- Regla operativa nueva para `/agency/spaces`:
  - si un space tiene poca o nula senal en `notion_ops`, igual debe mostrar contexto util desde Greenhouse (`personas asignadas`, `FTE`, `usuarios`) y no quedar casi vacio.
- Regla operativa nueva para `/agency/capacity`:
  - la lista de capacidad debe reutilizar `TeamAvatar` y no un avatar ad-hoc, para heredar `avatarUrl` real y fallback cromatico consistente con el roster.

## Delta 2026-03-13 Agency operator layer

- El repo ahora tiene una primera capa agency para lectura ejecutiva interna a nivel transversal:
  - `/agency`
  - `/agency/spaces`
  - `/agency/capacity`
- Regla operativa de acceso:
  - hoy no existe un principal dedicado `agency`
  - la surface agency se habilita a usuarios `internal` o `admin` via `requireAgencyTenantContext()`
- La navegacion global ahora puede mostrar una seccion `Agencia` en `VerticalMenu` sin afectar el contrato cliente ni los flows de auth ya activos.
- La data agency sale de BigQuery real y no de mocks:
  - `greenhouse.clients`
  - `greenhouse.client_service_modules`
  - `greenhouse.service_modules`
  - `greenhouse.team_members`
  - `greenhouse.client_team_assignments`
  - `notion_ops.tareas`
  - `notion_ops.proyectos`
- Restriccion actual:
  - `/agency/spaces/[spaceId]` todavia no es una surface agency dedicada; redirige al dashboard del portal con `?space=<id>`
  - si se necesita una lectura agency por space mas profunda, debera implementarse como modulo posterior y no asumirse ya resuelto por esta iteracion

## Delta 2026-03-13 Pulse team view correction

- `Pulse` ya no debe tratar la seccion de equipo como una lectura primaria de capacidad operativa.
  - La surface del dashboard cliente ahora consume roster asignado (`getTeamMembers`) como fuente principal para `Tu equipo asignado`.
  - La columna derecha queda limitada a resumen contractual visible: FTE, horas, linea de servicio y modalidad.
- Regla operativa nueva para `Pulse`:
  - la Vista 1 (`Tu equipo asignado`) es roster-first y no depende de queries de carga operativa para renderizar
  - la Vista 2 (`Capacidad operativa`) queda fuera de la card principal y solo debe aparecer despues como detalle/expandible o en otra ubicacion
- El `view-as` admin del dashboard ahora tambien hidrata esta seccion server-side con roster del tenant para evitar errores por fetch cliente fuera del contexto `client`.

## Delta 2026-03-13 Canonical team identity hardening

- La capa de equipo/capacidad ya no debe tratar `azure_oid`, `notion_user_id` o `hubspot_owner_id` como la identidad canonica.
  - `greenhouse.team_members.identity_profile_id` pasa a ser el enlace canonico de persona para el roster Efeonce.
  - Los providers externos se resuelven y enriquecen desde `greenhouse.identity_profile_source_links`.
- `scripts/setup-team-tables.sql` ahora tambien actua como bootstrap de reconciliacion canonica para el roster de equipo:
  - agrega `identity_profile_id` y `email_aliases` si faltan en `greenhouse.team_members`
  - siembra o actualiza perfiles canonicos usados por el roster
  - siembra source links para `greenhouse_team`, `greenhouse_auth`, `notion`, `hubspot_crm` y `azure_ad`
  - archiva el perfil duplicado de Julio anclado en HubSpot y deja un solo perfil canonico activo para su identidad
- Regla operativa nueva:
  - `greenhouse_team` representa la identidad Greenhouse del roster
  - `identity_profile_source_links` es la capa preparada para sumar futuros providers como `google_workspace`, `deel`, `frame_io` o `adobe` sin redisenar `team_members`
- La lectura runtime de providers en `src/lib/team-queries.ts` ya no debe inferir Microsoft desde `greenhouse_auth`; `greenhouse_auth` es un principal interno, no un provider externo.
- Las 4 surfaces live del task tuvieron una pasada visual adicional con patrones Vuexy compartidos:
  - `Mi Greenhouse` y `Pulse` ya muestran badges de identidad mas robustos
  - `Equipo en este proyecto` y `Velocity por persona` ahora usan `ExecutiveCardShell`, resumenes KPI y cards por persona con mejor jerarquia visual

## Delta 2026-03-13 Team profile taxonomy

- `greenhouse.team_members` ya no modela solo roster operativo; ahora tambien soporta perfil profesional y atributos de identidad laboral:
  - nombre estructurado: `first_name`, `last_name`, `preferred_name`, `legal_name`
  - taxonomia interna: `org_role_id`, `profession_id`, `seniority_level`, `employment_type`
  - contacto y presencia: `phone`, `teams_user_id`, `slack_user_id`
  - ubicacion y contexto: `location_city`, `location_country`, `time_zone`
  - trayectoria: `birth_date`, `years_experience`, `efeonce_start_date`
  - perfil narrativo: `biography`, `languages`
- Se agregaron catalogos nuevos en BigQuery:
  - `greenhouse.team_role_catalog`
  - `greenhouse.team_profession_catalog`
- Regla operativa nueva para talento:
  - `role_title` sigue siendo el cargo visible en la operacion actual
  - `org_role_id` representa el rol interno dentro de Efeonce
  - `profession_id` representa la profesion u oficio reusable para staffing y matching de perfiles
- El runtime cliente de `/api/team/members` ahora deriva ademas:
  - `tenureEfeonceMonths`
  - `tenureClientMonths`
  - `ageYears`
  - `profileCompletenessPercent`
- Se decidio no inventar PII faltante en seed:
  - si ciudad, pais, telefono, edad o experiencia real no estaban confirmados, quedan `NULL`
  - el modelo ya existe y la UI lo expresa como `en configuracion`

## Delta 2026-03-13 Team identity and capacity runtime

- Se implemento una primera capa real del task `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` dentro de este repo:
  - `GET /api/team/members`
  - `GET /api/team/capacity`
  - `GET /api/team/by-project/[projectId]`
  - `GET /api/team/by-sprint/[sprintId]`
  - `scripts/setup-team-tables.sql`
  - componentes cliente para dossier, capacidad, equipo por proyecto y velocity por persona
- La fuente real inspeccionada en BigQuery para `notion_ops.tareas` no expone `responsable_nombre` ni `responsable_email` como columnas directas.
  - El runtime nuevo usa el schema real detectado en `INFORMATION_SCHEMA`:
    - `responsables`
    - `responsables_ids`
    - `responsables_names`
    - `responsable_texto`
  - El match operativo prioriza `notion_user_id` ↔ `responsables_ids[SAFE_OFFSET(0)]`, con fallback a email/nombre.
- `scripts/setup-team-tables.sql` quedo endurecido como bootstrap idempotente via `MERGE` y ya fue aplicado en BigQuery real:
  - `greenhouse.team_members`: `7` filas seed
  - `greenhouse.client_team_assignments`: `10` filas seed
- La validacion local ya corrio con runtime Node real:
  - `pnpm lint`: correcto
  - `pnpm build`: correcto
- El repo externo correcto del pipeline es `notion-bigquery`, no `notion-bq-sync`.
  - Ese repo no existe en este workspace.
  - Desde esta sesion no hubo acceso remoto util a `efeoncepro/notion-bigquery`, por lo que no se modifico ni redeployo la Cloud Function externa.
- El task `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` ya no debe asumirse contra columnas ficticias `responsable_*` en BigQuery.
  - La especificacion se alineo al contrato real verificado en `notion_ops.tareas`:
    - `responsables_names`
    - `responsables_ids`
    - `responsable_texto`
  - Los derivados operativos `responsable_nombre` y `responsable_notion_id` se resuelven en runtime desde esos campos.
- `/settings` ya no depende de `getDashboardOverview()` solo para el roster; consume el endpoint dedicado de equipo.
- `/dashboard` reemplaza la card legacy de capacity por una surface cliente que consume la API dedicada.
- `/proyectos/[id]` ahora incorpora una seccion `Equipo en este proyecto`.
- El repo no tenia `/sprints/[id]`; se habilito una primera ruta para hospedar `Velocity por persona` y enlazarla desde el detalle de proyecto.
- Cierre literal del task en UI:
  - Vista 1 ya no muestra FTE individual por persona
  - Vista 3 ya usa `AvatarGroup` + expandible tabular por persona
  - los semaforos visibles del modulo usan primitives basadas en `GH_COLORS.semaphore`
  - los textos visibles que faltaban en las 4 vistas se movieron a `GH_TEAM` / `GH_MESSAGES`

## Delta 2026-03-13 Preview auth hardening

- `src/lib/bigquery.ts` ahora acepta un fallback opcional `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` para evitar fallos de serializacion de secretos en Preview de Vercel.
- Si una Preview de branch necesita login funcional y el JSON crudo falla por quoting/escaping, la opcion preferida pasa a ser cargar `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` junto con `GCP_PROJECT`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL`.
- El repo ahora versiona una skill local para operaciones Vercel:
  - `.codex/skills/vercel-operations/SKILL.md`
  - cubre CLI, dominios protegidos, `promote`, `rollback`, env vars y el mapa operativo `Preview` / `Staging` / `Production` del proyecto
  - debe usarse como criterio operativo cuando el trabajo requiera verificar previews, dominios custom o promociones entre ambientes
- Regla operativa adicional para previews OAuth:
  - si una branch preview necesita login real, no asumir que hereda los secrets de otra preview
  - cargar un bloque explicito `Preview (<branch>)` con `GCP_PROJECT`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`
  - para pruebas humanas de Google SSO, preferir el dominio autorizado `pre-greenhouse.efeoncepro.com` sobre aliases estables de branch si esos aliases no fueron agregados en GCP como redirect URI

## Delta 2026-03-13 Branding lock and nav hydration

- El shell autenticado ahora debe inyectar la sesion inicial al `SessionProvider` para evitar flicker entre menu cliente e interno/admin durante la hidratacion.
- La capa de nomenclatura ya no debe mezclar portal cliente con internal/admin:
  - `GH_CLIENT_NAV` queda reservado para la navegacion cliente normada por `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`
  - `GH_INTERNAL_NAV` queda como nomenclatura operativa separada para `/internal/**` y `/admin/**`
- Regla operativa nueva para theming runtime: Greenhouse no debe honrar cookies legacy de `primaryColor`, `skin` o `semiDark` que reintroduzcan branding Vuexy; esas preferencias quedan bloqueadas al baseline Greenhouse y solo se preservan `mode`, `layout` y widths compatibles.
- `src/@core/utils/brandSettings.ts` y `getSettingsFromCookie()` son ahora el boundary de saneamiento para cookies de settings antes de SSR o hidratacion cliente.

## Delta 2026-03-13 Greenhouse nomenclature portal

- Ya existe `src/config/greenhouse-nomenclature.ts` como fuente unica de nomenclatura visible para la capa cliente:
  - `GH_CLIENT_NAV`
  - `GH_LABELS`
  - `GH_TEAM`
  - `GH_MESSAGES`
  - `GH_COLORS`
- `src/config/greenhouse-nomenclature.ts` tambien versiona `GH_INTERNAL_NAV`, pero solo como capa operativa para superficies `internal/admin`; no como parte del contrato del portal cliente definido en `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`.
- La navegacion cliente y las superficies principales `/login`, `/dashboard`, `/proyectos`, `/sprints` y `/settings` ya empezaron a consumir esa capa centralizada en vez de labels hardcodeados.
- El rollout ya no es solo copy-level: la marca Efeonce ahora entra por el wiring oficial del starter kit sin crear un theme paralelo:
  - `src/components/theme/mergedTheme.ts`
  - `src/components/theme/index.tsx`
  - `src/configs/primaryColorConfig.ts`
  - `src/app/layout.tsx`
- `layout.tsx` ahora carga `DM Sans` + `Poppins`, y el sidebar branded queda encapsulado en `src/styles/greenhouse-sidebar.css` con logo negativo para el nav vertical.
- El dashboard cliente activo ahora tambien consume la nomenclatura centralizada en sus componentes secundarios de experiencia:
  - `ClientPortfolioHealthAccordion`
  - `ClientAttentionProjectsAccordion`
  - `ClientEcosystemSection`
  - annotations, tooltips y totals de `chart-options.ts`
- Regla operativa ratificada para theming: Greenhouse no debe reescribir el theme de Vuexy desde cero; cualquier ajuste global de tema debe pasar por `src/components/theme/mergedTheme.ts`, `@core/theme/*` o la configuracion oficial de Vuexy.

## Delta 2026-03-13 Branding SVG rollout

- `public/branding/SVG` pasa a ser la carpeta canonica para isotipos y wordmarks SVG de `Efeonce`, `Globe`, `Reach` y `Wave`.
- `src/components/greenhouse/brand-assets.ts` centraliza el mapping reusable de esos assets para shell, business lines y futuras cards que necesiten logos propios.
- `src/components/layout/shared/Logo.tsx` y `src/app/layout.tsx` ya no deben depender del PNG `avatar.png` como marca primaria; el shell y el favicon salen desde esa capa SVG.
- `src/components/greenhouse/BrandWordmark.tsx` y `src/components/greenhouse/BusinessLineBadge.tsx` son ahora los componentes canonicos para renderizar `Efeonce`, `Globe`, `Reach` y `Wave` en contextos `inline`, footer, hero, tabla o chip sin hardcodes de imagen dispersos.

## Delta 2026-03-13 Tenant and user media persistence

- El runtime ya soporta subir y persistir logos/fotos reales para identidades visibles del portal en lugar de depender solo de iniciales o fallbacks.
- Capa server-side nueva:
  - `src/lib/storage/greenhouse-media.ts` para upload/download autenticado contra GCS
  - `src/lib/admin/media-assets.ts` para leer/escribir `logo_url` y `avatar_url` en BigQuery
- Endpoints internos nuevos:
  - `POST /api/admin/tenants/[id]/logo`
  - `POST /api/admin/users/[id]/avatar`
  - `GET /api/media/tenants/[id]/logo`
  - `GET /api/media/users/[id]/avatar`
- Regla operativa:
  - el carril canónico de media pública ahora debe leerse desde `GREENHOUSE_PUBLIC_MEDIA_BUCKET`
  - `GREENHOUSE_MEDIA_BUCKET` queda como fallback legacy para superficies que todavía no hayan sido reconciliadas
  - si ninguna env está configurada, el fallback final sigue siendo `${GCP_PROJECT}-greenhouse-media`
  - los assets se guardan como `gs://...` en BigQuery y se sirven via proxy autenticado del portal, no via URL publica del bucket
- El uploader UI reusable para admin ahora vive en `src/components/greenhouse/IdentityImageUploader.tsx`.
- `greenhouse.clients` no traia `logo_url` en el DDL base; el runtime agrega la columna on-demand con `ALTER TABLE ... ADD COLUMN IF NOT EXISTS logo_url STRING` antes de persistir logos de tenant.
- La sesion NextAuth ya propaga `avatarUrl`, permitiendo que el dropdown autenticado refleje la foto guardada del usuario.

## Delta 2026-03-13 Promote and deploy closeout

- La iniciativa de alineacion de nomenclatura + branding + media persistente ya quedo promovida a:
  - `develop`
  - `main`
- Estado actual de aliases Vercel confirmado al cierre:
  - `pre-greenhouse.efeoncepro.com` apunta al preview vigente del branch `fix/google-sso-develop-safe`
  - `dev-greenhouse.efeoncepro.com` apunta al deployment de `staging` generado desde `develop`
  - `greenhouse.efeoncepro.com` apunta al deployment productivo generado desde `main`
- Regla operativa ratificada:
  - si `pre-greenhouse` no refleja una rama activa, no asumir fallo de codigo; primero revisar `vercel inspect`, alias asignado y estado del ultimo deployment del branch
  - si Preview falla por duplicados `* (1).ts(x)`, `tsconfig.json` ya los excluye para que el deploy no quede atascado por copias accidentales del workspace

## Delta 2026-03-13 Capabilities runtime foundation

- La spec `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md` ya tiene una primera ejecucion real sobre el runtime actual del repo, sin volver al modelo legacy de resolver capabilities directo desde `greenhouse.clients`.
- El runtime nuevo toma `businessLines` y `serviceModules` desde la sesion tenant-aware actual, que ya deriva de `greenhouse.client_service_modules` + `greenhouse.service_modules`.
- Se agregaron:
  - `GET /api/capabilities/resolve`
  - `GET /api/capabilities/[moduleId]/data`
  - `/capabilities/[moduleId]`
- El sidebar vertical ahora incorpora una seccion dinamica `Servicios` cuando el tenant cliente tiene modules activos en el registry.
- La primera implementacion incluye registry versionado para:
  - `creative-hub`
  - `crm-command-center`
  - `onboarding-center`
  - `web-delivery-lab`
- La data inicial de cada modulo reutiliza el contrato real de `/dashboard` para entregar una lectura ejecutiva coherente mientras los query builders dedicados siguen siendo una fase posterior.
- El admin ahora tiene una vista de validacion autenticada para modules en `/admin/tenants/[id]/capability-preview/[moduleId]`, separada del `view-as/dashboard`.
- La preview admin usa fallback controlado al registry para inspeccionar modules del tenant aunque la resolucion cliente estricta siga dependiendo de `businessLines` y `serviceModules`.
- El smoke operativo de capabilities queda automatizado en `scripts/run-capability-preview-smoke.ps1`, con JWT admin local y capturas Playwright sobre:
  - `/admin/tenants/space-efeonce/view-as/dashboard`
  - `/admin/tenants/space-efeonce/capability-preview/creative-hub`
- `tsconfig.json` ya no incluye validators historicos de `.next-local/build-*`; solo conserva tipos `dev` para evitar que caches viejos rompan `tsc`.
- La capa ahora ya no reutiliza `getDashboardOverview()` para `/capabilities/[moduleId]`; existe `src/lib/capability-queries/*` con query builders dedicados por modulo y snapshot BigQuery cacheada con `unstable_cache`.
- Se agrego `verifyCapabilityModuleAccess()` para centralizar el guard server-side y distinguir `404` de `403` en `/api/capabilities/[moduleId]/data`.
- El registry de capabilities ahora declara `dataSources` por modulo para dejar trazabilidad explicita entre cada surface y sus tablas BigQuery reales.
- `/capabilities/[moduleId]` ya no depende de una composicion hardcodeada; el route renderiza `data.module.cards` via `src/components/capabilities/CapabilityCard.tsx` y `src/components/capabilities/ModuleLayout.tsx`.
- El dispatcher declarativo actual ya no consume arrays globales de modulo; cada tarjeta usa `cardData` por `card.id`, dejando el runtime listo para ampliar el catalogo sin romper los modulos existentes.
- `Creative Hub` ya quedo consolidado como primer modulo mas rico del sistema declarativo, con:
  - `creative-metrics`
  - `creative-review-pipeline`
  - `creative-review-hotspots`
  - `creative-projects`
  - `creative-quality`
- La consolidacion visual de `Creative Hub` ya quedo alineada explicitamente con patrones de `full-version` en vez de una composicion ad hoc:
  - hero adaptado desde la logica de `WebsiteAnalyticsSlider`
  - KPI cards sobre `HorizontalWithSubtitle`
  - quality card compacta tipo `SupportTracker`
  - listas ejecutivas con jerarquia tipo `SourceVisits`
- El dispatcher declarativo actual cubre los card types reales del registry vigente:
  - `metric`
  - `project-list`
  - `tooling-list`
  - `quality-list`
  - `metric-list`
  - `chart-bar`

## Delta 2026-03-12 Internal Control Tower Redesign

- `/internal/dashboard` dejo de ser un hero estatico con lista plana de tenants y ahora funciona como `Control Tower` operativo para el equipo interno Efeonce.
- La landing interna ahora usa:
  - header compacto con subtitulo dinamico y acciones
  - 6 KPI cards con semaforos de activacion, inactividad y OTD global
  - tabla paginada con busqueda, filtros por estado, row actions y prioridad visual para `Requiere atencion`
- `src/lib/internal/get-internal-dashboard-overview.ts` ahora entrega senales adicionales por cliente:
  - `createdAt`
  - `updatedAt`
  - `lastLoginAt`
  - `lastActivityAt`
  - `totalUsers`, `activeUsers`, `invitedUsers`, `pendingResetUsers`
  - `scopedProjects`
  - `avgOnTimePct`
  - arrays de `businessLines` y `serviceModules`
- El rediseño sigue sin introducir mutaciones nuevas: `Crear space`, `Editar` y `Desactivar` quedan como affordances parciales hasta que exista workflow real.

## Delta 2026-03-12 Internal Identity Foundation

- Se agrego `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md` como contrato canonico para separar `auth principal` de `canonical identity` en usuarios internos Efeonce.
- La fundacion nueva usa:
  - `EO-USR-*` para el principal de acceso actual
  - `EO-ID-*` para el perfil canonico interno
- Se versiono `bigquery/greenhouse_internal_identity_v1.sql` para crear `identity_profiles`, `identity_profile_source_links` y `client_users.identity_profile_id`.
- Se agrego bootstrap operativo `scripts/backfill-internal-identity-profiles.ts`:
  - descubre candidatos internos por `tenant_type` o rol interno en `client_users`
  - descubre owners internos en `hubspot_crm.owners` por dominio `@efeonce.org` o `@efeoncepro.com`
  - crea perfiles canonicos y source links listos para enlazar Notion o Azure AD despues
- Estado real ejecutado:
  - `2` auth principals internos Greenhouse enlazados
  - `6` HubSpot owners internos sembrados como perfiles canonicos
  - `8` perfiles `EO-ID-*` creados en BigQuery

## Delta 2026-03-13 Google SSO foundation

- El login ahora soporta tres flujos paralelos sobre `greenhouse.client_users`:
  - `credentials`
  - Microsoft Entra ID (`azure-ad` en NextAuth)
  - Google OAuth (`google` en NextAuth)
- `client_users` extiende el contrato de identidad con:
  - `google_sub`
  - `google_email`
- `/login` ahora agrega Google como CTA secundaria debajo de Microsoft y antes del divisor de credenciales.
- `/settings` ahora muestra el estado de vinculo de Microsoft y Google, y permite iniciar cualquiera de los dos enlaces SSO cuando la sesion actual entro por credenciales.
- Infra ya aplicada fuera del repo:
  - `greenhouse.client_users` ya expone `google_sub` y `google_email` en BigQuery real
  - el proyecto `efeonce-group` ya tiene creado el OAuth client `greenhouse-portal`
  - Vercel `greenhouse-eo` ya tiene `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` cargados en `Development`, `staging`, `Production`, `Preview (develop)` y `Preview (feature/google-sso)`
- Regla operativa ratificada para auth:
  - Google SSO, igual que Microsoft SSO, solo vincula principals ya existentes en `greenhouse.client_users`
  - `allowed_email_domains` puede explicar un rechazo o servir de pista de provisioning, pero no auto-crea principals durante login

## Delta 2026-03-12 Microsoft SSO foundation

- El login ahora soporta dos flujos en paralelo sobre `greenhouse.client_users`:
  - `credentials`
  - Microsoft Entra ID (`azure-ad` en NextAuth)
- `client_users` extiende el contrato de identidad con:
  - `microsoft_oid`
  - `microsoft_tenant_id`
  - `microsoft_email`
  - `last_login_provider`
- `/login` prioriza Microsoft SSO como CTA principal y deja email + contrasena como fallback.
- `/settings` ahora muestra el estado de vinculo Microsoft y permite iniciar el enlace SSO cuando la sesion entro por credenciales.
- La ruta publica adicional `/auth/access-denied` cubre el rechazo de usuarios Microsoft sin principal explicito autorizado en Greenhouse.

## Documento Maestro de Arquitectura

- Documento maestro actual: `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- Resumen rapido de fases y tareas: `docs/roadmap/PHASE_TASK_MATRIX.md`
- Este documento debe leerse antes de cambiar arquitectura, auth, rutas, roles, multi-tenant, dashboard, team/capacity, campaign intelligence o admin.
- Si un agente necesita trabajar en paralelo con otro, debe tomar su scope desde las fases y actividades definidas en `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`.
- `docs/roadmap/BACKLOG.md` es el resumen operativo del roadmap; `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` es la explicacion completa.
- Documento tecnico de identidad y acceso: `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
- DDL de identidad y acceso: `bigquery/greenhouse_identity_access_v1.sql`
- Documento tecnico de modulos de servicio: `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md`
- DDL de modulos de servicio: `bigquery/greenhouse_service_modules_v1.sql`
- Bootstrap de modulos de servicio: `bigquery/greenhouse_service_module_bootstrap_v1.sql`
- Metodo canonico de validacion visual: `docs/ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md`
- Iniciativa tenant-especifica activa: `docs/ui/SKY_TENANT_EXECUTIVE_SLICE_V1.md`
- Contrato visual ejecutivo reusable: `docs/ui/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`
- Contrato canonico de orquestacion UI: `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- Catalogo curado de patrones Vuexy/MUI: `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- Brief canonico de intake UI: `docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`
- Seed operativo para benchmark interno del dashboard: `bigquery/greenhouse_efeonce_space_v1.sql`
- Plan UX actual para la siguiente iteracion del dashboard: `docs/ui/GREENHOUSE_DASHBOARD_UX_GAPS_V1.md`

## Especificacion Fuente

- Documento fuente actual: `../Greenhouse_Portal_Spec_v1.md`
- Ese markdown define el target funcional del portal y debe usarse como referencia primaria de producto.
- Si existe conflicto entre el estado actual del starter kit y la especificacion, prevalece la especificacion como norte de implementacion salvo decision documentada.

## Alcance del Repositorio

- Este repositorio contiene solo `starter-kit`.
- La carpeta `full-version` existe fuera de este repo como referencia de contexto, referencia visual y referencia funcional.
- `full-version` debe servir para entender hacia donde debe evolucionar `starter-kit`.
- No se debe mezclar automaticamente codigo de `full-version` dentro de este repo sin adaptacion y revision.
- Las referencias mas utiles de `full-version` para Greenhouse son dashboards, tablas y patrones de user/roles/permissions, no los modulos de negocio template.
- Orden recomendado para buscar referencia Vuexy:
- `../full-version/src/views/dashboards/analytics/*`
- `../full-version/src/views/dashboards/crm/*`
- `../full-version/src/views/apps/user/list/*`
- `../full-version/src/views/apps/user/view/*`
- `../full-version/src/views/apps/roles/*`
- `../full-version/src/libs/ApexCharts.tsx`
- `../full-version/src/libs/styles/AppReactApexCharts.tsx`
- `../full-version/src/libs/Recharts.tsx`
- `../full-version/src/libs/styles/AppRecharts.ts`
- y luego la documentacion oficial:
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/components/libs/apex-charts/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/components/styled-libs/app-react-apex-charts/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/user-interface/components/avatars/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/development/theming/overview/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/components/custom/option-menu/`
- Vuexy tambien trae `next-auth` con JWT y pantallas/patrones de permissions, pero eso debe leerse como referencia de template, no como el modelo de seguridad final de Greenhouse.
- En Greenhouse, JWT ya existe, pero la autorizacion real no depende del ACL demo del template; depende de roles y scopes multi-tenant resueltos server-side desde BigQuery.
- Las apps de `User Management` y `Roles & Permissions` si deben considerarse candidatas directas para `/admin`, pero solo reutilizando estructura visual y componentes; la data layer debe salir de BigQuery y no de fake-db.
- Para dashboards y superficies ejecutivas, la referencia correcta es la jerarquia de `full-version/src/views/dashboards/analytics/*`; el sistema reusable que la adapta a Greenhouse queda fijado en `docs/ui/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`.
- La seleccion de patrones Vuexy/MUI para cualquier solicitud nueva ya no debe salir de exploracion libre de `full-version`; debe pasar por el sistema definido en `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`.
- El intake de solicitudes UI puede venir de personas o de otros agentes; el brief canonico para normalizar pedidos de Claude, Codex u otros queda en `docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`.
- El repo tambien versiona una copia del skill operativo en `.codex/skills/greenhouse-ui-orchestrator/` para que el flujo no dependa solo del perfil local del agente.

## Stack Actual

- Next.js 16.1.1
- React 19.2.3
- TypeScript 5.9.3
- MUI 7.x
- App Router en `src/app`
- PNPM lockfile presente
- PostgreSQL via `pg` (Cloud SQL Connector + Secret Manager), conexión centralizada en `src/lib/db.ts`
- Kysely query builder tipado para módulos nuevos (`getDb()` de `@/lib/db`)
- node-pg-migrate para migraciones versionadas (`pnpm migrate:up/down/create/status`)
- kysely-codegen para generar tipos de DB (`pnpm db:generate-types`)
- `apexcharts` + `react-apexcharts` activos para charts ejecutivos
- El portal ya tiene un `space-efeonce` sembrado en BigQuery para validar el MVP del dashboard cliente sobre el portfolio interno con mayor densidad de datos.
- En producto, la label visible debe migrar a `space`; `tenant` se mantiene solo como termino interno de runtime y datos.
- El dashboard ya no se compone solo por `snapshot` vs `non-snapshot`; ahora existe `layoutMode = snapshot | standard | rich` para ajustar jerarquia y distribucion de cards segun la densidad real del space.
- `recharts` activo como segunda via de charting reusable alineada con `full-version`
- `keen-slider`, `@fullcalendar/*`, `react-datepicker`, `react-dropzone`, `react-toastify`, `cmdk`, `@tiptap/*`, `@tanstack/react-table`, `react-player`, `mapbox-gl`, `react-map-gl`, `react-hook-form`, `@hookform/resolvers`, `valibot`, `@formkit/drag-and-drop`, `emoji-mart` y `@emoji-mart/*` ya estan instalados en `starter-kit`
- `simple-icons` activo para logos SVG de marcas como fallback directo en runtime
- `@iconify-json/logos` activo para incorporar logos de marca al pipeline Iconify/CSS del repo
- `src/components/greenhouse/BrandLogo.tsx` ya consume ese stack para tooling cards, priorizando logos bundleados y usando fallback a Tabler o monograma
- `.gitattributes` fija archivos de texto en `LF` para estabilizar el trabajo en Windows

## Target Definido por la Especificacion

- Portal de clientes multi-tenant para Efeonce Greenhouse
- BigQuery como fuente principal de datos consumida server-side
- NextAuth.js para autenticacion
- API Routes en App Router para exponer datos filtrados por cliente
- Alias productivo actual: `greenhouse.efeoncepro.com`
- Dataset propio del portal: `efeonce-group.greenhouse`

## Posicion de Producto Actual

- Greenhouse debe ser un portal ejecutivo y operativo, no un segundo Notion.
- Notion sigue siendo el system of work.
- Greenhouse debe exponer visibilidad de entrega, velocidad, capacidad, riesgo y contexto por tenant.
- Greenhouse tambien debe componer vistas y charts segun linea de negocio y servicios contratados del cliente.
- Proyectos, tareas y sprints existen como drilldown explicativo, no como centro del producto.
- El centro actual del producto ya es `/dashboard`; las siguientes capas objetivo son `/equipo` y `/campanas`.

## Database Connection

- **Import `query` from `@/lib/db`** para raw SQL queries.
- **Import `getDb` from `@/lib/db`** para Kysely typed queries en módulos nuevos.
- **Import `withTransaction` from `@/lib/db`** para transacciones.
- **NUNCA** crear `new Pool()` fuera de `src/lib/postgres/client.ts`.
- **NUNCA** leer `GREENHOUSE_POSTGRES_*` directamente fuera de `client.ts`.
- Módulos existentes usando `runGreenhousePostgresQuery` de `@/lib/postgres/client` están bien — no migrar retroactivamente.
- Todo cambio de schema DDL debe ir como migración versionada: `pnpm migrate:create <nombre>`.
- Después de aplicar migraciones: `pnpm db:generate-types` para regenerar tipos Kysely.
- Spec completa: `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`.

## Comandos Utiles

- `npx pnpm install --frozen-lockfile`
- `npx pnpm dev`
- `npx pnpm build`
- `npx pnpm lint`
- `npx pnpm clean`

## Librerias visuales activas

- `apexcharts` y `react-apexcharts`: base actual para charts ejecutivos; wrappers locales en `src/libs/ApexCharts.tsx` y `src/libs/styles/AppReactApexCharts.tsx`.
- `recharts`: segunda via de charting disponible para cards compactas y visualizaciones de comparacion.
- `keen-slider`: sliders, carousels y hero cards con narrativa visual.
- `@fullcalendar/*`, `react-datepicker`, `date-fns`: calendario, planner y date UX.
- `@tanstack/react-table`, `@tanstack/match-sorter-utils`: tablas avanzadas, filtros y sorting.
- `react-hook-form`, `@hookform/resolvers`, `valibot`, `input-otp`: forms complejas, validacion y OTP UX.
- `@tiptap/*`, `cmdk`: rich text, editorial UX y command palette.
- `react-dropzone`, `react-toastify`, `emoji-mart`, `@emoji-mart/*`: upload, feedback y picker UX.
- `react-player`, `mapbox-gl`, `react-map-gl`: media, embeds y mapas.
- `@floating-ui/dom`, `@formkit/drag-and-drop`, `bootstrap-icons`: posicionamiento, reorder y soporte de iconografia.
- Ya no es necesario reinstalar este stack desde `full-version`; el inventario base de Vuexy ya vive en `starter-kit`.
- `simple-icons`: logos SVG de marcas y herramientas sin descargar assets manuales.
- `@iconify-json/logos`: logos de marca integrables al pipeline de iconos del repo en `src/assets/iconify-icons/bundle-icons-css.ts`.
- `recharts` y `keen-slider` ya estan disponibles en `starter-kit`; usarlos solo cuando una superficie lo justifique y manteniendo `apexcharts` como base actual del dashboard.

## Regla documental compacta

- La estrategia de documentacion liviana del repo queda en `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`.
- La regla es: detalle completo en una fuente canonica; deltas breves en `README.md`, `project_context.md`, `Handoff.md` y `changelog.md`.
- `Handoff.md` debe mantener solo el estado activo del turno o del frente abierto.
- `Handoff.archive.md` conserva el historial detallado cuando un handoff deja de ser operativo como snapshot rapido.
- Si un build local falla por rutas de otra rama, revisar el cache historico en `.next-local/**` antes de asumir un bug del cambio actual.

## Estructura Base

- `src/app/layout.tsx`: layout raiz
- `src/app/(dashboard)/layout.tsx`: layout principal autenticado o de dashboard
- `src/app/(dashboard)/dashboard/page.tsx`: dashboard principal actual
- `src/app/(dashboard)/proyectos/page.tsx`: vista base de proyectos
- `src/app/(dashboard)/proyectos/[id]/page.tsx`: detalle de proyecto
- `src/app/(dashboard)/sprints/page.tsx`: vista base de sprints
- `src/app/(dashboard)/settings/page.tsx`: vista base de settings
- `src/app/(blank-layout-pages)/login/page.tsx`: login actual
- `src/app/api/dashboard/kpis/route.ts`: primer endpoint real con datos de BigQuery
- `src/app/api/projects/route.ts`: listado real de proyectos por tenant
- `src/app/api/projects/[id]/route.ts`: detalle real de proyecto por tenant
- `src/app/api/projects/[id]/tasks/route.ts`: tareas del proyecto por tenant
- `src/components/layout/**`: piezas del layout
- `src/components/greenhouse/**`: componentes UI reutilizables del producto Greenhouse
- `src/configs/**`: configuracion de tema y color
- `src/data/navigation/**`: definicion de menu
- `src/lib/bigquery.ts`: cliente reusable de BigQuery
- `src/lib/dashboard/get-dashboard-overview.ts`: capa de datos server-side del dashboard
- `src/lib/projects/get-projects-overview.ts`: capa de datos server-side de proyectos
- `src/lib/projects/get-project-detail.ts`: capa de datos server-side del detalle de proyecto y sus tareas
- `src/views/greenhouse/dashboard/**`: configuracion y componentes especificos del dashboard Greenhouse
- `src/views/greenhouse/dashboard/orchestrator.ts`: orquestador de bloques ejecutivos reutilizables para el dashboard

## Estado de Rutas

- Existe `/dashboard`
- Existe `/capabilities/[moduleId]`
- Existe `/proyectos`
- Existe `/proyectos/[id]`
- Existe `/sprints`
- Existe `/settings`
- Existe `/login`
- Existe `/auth/landing`
- Existe `/internal/dashboard`
- Existe `/admin`
- Existe `/admin/tenants`
- Existe `/admin/tenants/[id]`
- Existe `/admin/tenants/[id]/view-as/dashboard`
- Existe `/admin/users`
- Existe `/admin/users/[id]`
- Existe `/admin/roles`
- Existe `src/app/page.tsx`
- La raiz `/` redirige segun `portalHomePath`
- `/home` y `/about` quedaron como rutas de compatibilidad que redirigen a la nueva experiencia

## Rutas Objetivo del Producto

- `/dashboard`: dashboard principal con KPIs ICO
- `/entrega`: contexto operativo agregado
- `/proyectos`: lista de proyectos del cliente
- `/proyectos/[id]`: detalle de proyecto con tareas y sprint
- `/campanas`: lista de campanas y relacion con output
- `/campanas/[id]`: detalle de campana con entregables y KPIs
- `/equipo`: equipo asignado, capacidad y carga
- `/sprints`: vista de sprints y velocidad
- `/settings`: perfil y preferencias del cliente
- `/internal/**`: visibilidad interna Efeonce
- `/admin/**`: gobernanza de tenants, usuarios, roles, scopes y feature flags

## Brecha Actual vs Objetivo

- El shell principal ya fue adaptado a Greenhouse con rutas reales y branding base.
- `next-auth` ya esta integrado, usa session JWT, protege el dashboard y autentica solo contra `greenhouse.client_users`.
- El JWT actual de Greenhouse ya carga `roleCodes`, `routeGroups`, `projectScopes` y `campaignScopes`; eso reemplaza el valor de negocio que podria aportar un ACL generico del template.
- `@google-cloud/bigquery` ya esta integrado con un cliente server-side reusable.
- `/internal/dashboard` ya fue reinterpretado como `Control Tower` en espanol, con foco en salud de activacion, onboarding trabado, inactividad y acceso rapido al detalle del space.
- `/dashboard` ya fue redisenado hacia una lectura cliente mas compacta en 3 zonas: hero + 4 KPI cards, 4 charts ejecutivos y detalle operativo bajo el fold.
- El dashboard cliente ya no expone la cocina anterior de `capacity`, tooling declarativo por modulo ni cards redundantes de calidad/entrega; esas piezas se movieron fuera de la vista principal del cliente.
- El contrato server-side del dashboard ahora tambien entrega cadencia semanal de entregas y `RpA` por proyecto sin cambiar la fuente de datos base en BigQuery.
- El CTA de ampliacion del equipo/ecosistema existe como modal de solicitud copiable; la notificacion real a owner o webhook sigue pendiente de una mutacion dedicada.
- El runtime del dashboard ya incorpora un orquestador deterministico de bloques ejecutivos para seleccionar hero, top stats y secciones por `serviceModules`, calidad de dato y capacidades disponibles.
- Ya existen `/api/dashboard/kpis`, `/api/dashboard/summary`, `/api/dashboard/charts` y `/api/dashboard/risks`.
- Ya existe `/api/projects` y la vista `/proyectos` consume datos reales filtrados por tenant.
- Ya existen `/api/projects/[id]`, `/api/projects/[id]/tasks` y la vista `/proyectos/[id]` con detalle real por tenant.
- Ya existe una fuente real multi-user en `greenhouse.client_users` y tablas de scopes/roles; el demo y el admin interno ya usan credenciales bcrypt.
- `/admin/tenants`, `/admin/users`, `/admin/roles` y `/admin/users/[id]` ya son el primer slice real de admin sobre datos reales.
- `/admin/users/[id]` reutiliza la estructura de `user/view/*` con tabs reinterpretados para Greenhouse:
- `overview` -> contexto del usuario y alcance
- `security` -> acceso y auditoria
- `billing` -> invoices y contexto comercial del cliente
- `/admin/tenants/[id]` consolida la empresa/tenant como unidad de gobierno y la relaciona con usuarios, modulos, flags y proyectos visibles.
- `/admin/tenants/[id]/view-as/dashboard` permite revisar el dashboard real del cliente desde una sesion admin sin cambiar de usuario.
- El login ya no muestra bloque demo y el mensaje de error de UI ya no expone detalles internos como `tenant registry`.
- Ya existen 9 tenants cliente bootstrap desde HubSpot para companias con al menos un `closedwon`, cada uno con un contacto cliente inicial en estado `invited`.
- Aun no existe `/api/sprints`.
- Aun no existen `/api/dashboard/capacity` ni `/api/dashboard/market-speed`; se pospusieron porque los tiempos operativos actuales no vienen en formato numerico confiable.
- Ya existe una capa multi-user real separada de tenants.
- La sincronizacion externa de capabilities debe venir por payload explicito desde una fuente canonica de empresa; no debe inferirse automaticamente desde `deals`.
- El runtime de auth y `getTenantContext()` ya exponen `businessLines` y `serviceModules`.
- La spec de capabilities ya no queda solo en documento: existe un registry runtime y una ruta generica `/capabilities/[moduleId]` alimentada por el tenant context actual.
- `/admin/tenants/[id]` ya no solo muestra business lines y service modules: ahora tambien dispone de un editor de capabilities y rutas API para guardar seleccion manual o sincronizar desde fuentes externas.
- `/admin/tenants/[id]` ahora tambien consulta un servicio HubSpot dedicado para leer `company profile` y `owner` bajo demanda, sin esperar a BigQuery.
- `/admin/tenants/[id]` ahora tambien consulta los `contacts` asociados a la `company` en HubSpot para comparar miembros CRM contra los usuarios ya provisionados en Greenhouse.
- `/admin/tenants/[id]` ya puede provisionar de forma segura los contactos CRM faltantes hacia `greenhouse.client_users`:
  - crea usuarios `invited` cuando no existen
  - reconcilia usuarios ya existentes del mismo tenant por email para reparar rol `client_executive` y scopes base si quedaron incompletos
  - evita falsos `already_exists` cuando el usuario existia pero su acceso no estaba completo
- ya existe una base documental para un orquestador UI multi-agente: `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`, `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md` y `docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md` fijan como Claude, Codex u otros asistentes deben normalizar solicitudes y seleccionar patrones Vuexy/MUI sin explorar `full-version` de forma ad hoc
- Regla de latencia actual:
  - `company profile`, `owner` y `contacts` pueden reflejar cambios de HubSpot con baja latencia cuando Greenhouse vuelve a consultar el servicio dedicado
  - `capabilities` siguen siendo sync-based hasta que exista una capa event-driven o webhook-driven
- Aun no existe una capa semantica de KPIs y marts para dashboard, team, capacity y campaigns.
- Ya existen rutas minimas de Efeonce interno y admin, y el modulo admin ya tiene tenants, lista de usuarios, roles y detalle de usuario; falta mutacion segura de scopes y feature flags.
- `serviceModules` ya extienden la navegacion cliente a traves de la seccion dinamica `Servicios`; sigue pendiente extenderlos a billing por servicio contratado.
- Para Sky Airline ya existe un diagnostico formal de factibilidad:
- `on-time` mensual, tenure y entregables/ajustes por mes ya quedaron implementados con la data actual
- ya existen en `/dashboard` secciones reusables de quality, account team, capacity inicial, herramientas tecnologicas y AI tools
- esas secciones mezclan señal real de BigQuery, nombres detectados desde Notion, defaults por `serviceModules` y overrides controlados por tenant
- sigue pendiente formalizar APIs y modelos fuente para que dejen de depender de fallback u overrides
- la siguiente iteracion de UI debe dejar de tratar cada seccion como una card aislada y converger hacia familias reusables de hero, mini stat, chart, list y table cards
- el switch de tema del shell Greenhouse ya esta operativo en navbar con soporte real para `light`, `dark` y `system`, incluyendo reaccion al cambio del tema del sistema mientras la sesion sigue abierta

## Deploy

- Hosting principal: Vercel
- Repositorio remoto: `https://github.com/efeoncepro/greenhouse-eo.git`
- Configuracion importante en Vercel:
  - `Framework Preset`: `Next.js`
  - `Root Directory`: vacio o equivalente al repo raiz
  - `Output Directory`: vacio
- Se detecto un problema inicial de `404 NOT_FOUND` por tener `Framework Preset` en `Other`. Ya fue resuelto.

## Estrategia de Ramas y Ambientes

- `main`:
  - rama productiva
  - su deploy en Vercel corresponde a `Production`
- `develop`:
  - rama de integracion compartida
  - debe usarse como entorno de prueba funcional del equipo
  - esta asociada al `Custom Environment` `staging` en Vercel
- `feature/*` y `fix/*`:
  - ramas personales o por tarea
  - cada push debe validarse en `Preview`
- `hotfix/*`:
  - salen desde `main`
  - sirven para corregir produccion con el menor alcance posible
  - deben volver tanto a `main` como a `develop`

## Logica de Trabajo Recomendada

1. Crear rama desde `develop` para trabajo normal o desde `main` para hotfix.
2. Implementar cambio pequeno y verificable.
3. Validar localmente con `npx pnpm build`, `npx pnpm lint` o prueba manual suficiente.
4. Hacer push de la rama y revisar su Preview Deployment en Vercel cuando el cambio afecte UI, rutas, layout o variables.
5. Mergear a `develop` cuando el cambio ya este sano en su preview individual.
6. Hacer validacion compartida sobre `Staging` asociado a `develop`.
7. Mergear a `main` solo cuando el cambio este listo para produccion.
8. Confirmar deploy a `Production` en Vercel.

## Regla de Entornos

- `Development`: uso local de cada agente
- `Preview`: validacion remota de ramas de trabajo
- `Staging`: entorno persistente controlado asociado a `develop`
- `Production`: estado estable accesible para usuarios finales

## Regla de Variables en Vercel

- Toda variable debe definirse conscientemente por ambiente.
- No asumir que una variable de `Preview` o `Staging` existe en `Production`, ni al reves.
- Si una feature necesita variable nueva, primero debe existir en `Preview` y `Staging` antes de promocionarse a `main`.
- Mantener `.env.example` alineado con las variables requeridas.
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` en `Preview` puede llegar en mas de una serializacion; el parser de `src/lib/bigquery.ts` ya soporta JSON minified y JSON legacy escapado.
- Si `Preview` rechaza un login que en BigQuery esta activo y con hash correcto, revisar primero alias del dominio y el parseo de `GOOGLE_APPLICATION_CREDENTIALS_JSON` antes de asumir fallo de credenciales.

## Variables de Entorno

- `.env.example` define:
  - `NEXT_PUBLIC_APP_URL`
  - `BASEPATH`
  - `GCP_PROJECT`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `AZURE_AD_CLIENT_ID`
- `AZURE_AD_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `RESEND_API_KEY`
- `RESEND_API_KEY_SECRET_REF`
- `RESEND_WEBHOOK_SIGNING_SECRET`
- `RESEND_WEBHOOK_SIGNING_SECRET_SECRET_REF`
- `EMAIL_FROM`
- `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL`
- `GREENHOUSE_INTEGRATION_API_TOKEN` — token compartido para autenticar writes Greenhouse → servicio externo `hubspot-greenhouse-integration` (`PATCH /companies/:id/lifecycle`, `/deals`, y futuros endpoints outbound).
- `AGENT_AUTH_SECRET` — shared secret para autenticación headless de agentes y E2E (generar con `openssl rand -hex 32`). Sin esta variable el endpoint `/api/auth/agent-session` responde 404.
- `AGENT_AUTH_EMAIL` — email del usuario a autenticar en modo headless. Debe existir en la tabla de acceso de tenants.
- `AGENT_AUTH_ALLOW_PRODUCTION` — `true` para permitir agent auth en production (no recomendado). Por defecto bloqueado cuando `VERCEL_ENV === 'production'`.
- `next.config.ts` usa `process.env.BASEPATH` como `basePath`
- Riesgo operativo: si `BASEPATH` se configura en Vercel sin necesitarlo, la app deja de vivir en `/`

## Variables de Entorno Objetivo

- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `GCP_PROJECT`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`
- `RESEND_API_KEY_SECRET_REF`
- `EMAIL_FROM`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` y `GCP_PROJECT` ya existen en Vercel para `Development`, `staging` y `Production`.
- `NEXTAUTH_SECRET` y `NEXTAUTH_URL` ya estan integradas al runtime actual.
- `AZURE_AD_CLIENT_ID` y `AZURE_AD_CLIENT_SECRET` habilitan Microsoft SSO multi-tenant en NextAuth y deben existir en cualquier ambiente donde se quiera validar ese flujo.
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` habilitan Google SSO en NextAuth y deben existir en cualquier ambiente donde se quiera validar ese flujo.
- `RESEND_API_KEY` y `EMAIL_FROM` quedan reservadas para el sistema de emails transaccionales; no deben commitearse con valores reales y deben existir al menos en `Development`, `Preview`, `Staging` y `Production` si ese flujo se habilita.
- `RESEND_API_KEY_SECRET_REF` es el contrato canónico recomendado cuando el mismo flujo de email puede correr en más de un runtime (por ejemplo Vercel + Cloud Run); el valor directo `RESEND_API_KEY` queda como fallback legacy.
- `RESEND_WEBHOOK_SIGNING_SECRET_SECRET_REF` es el contrato canónico recomendado para el webhook de Resend; el valor directo `RESEND_WEBHOOK_SIGNING_SECRET` queda como fallback legacy.
- `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL` permite apuntar Greenhouse al servicio dedicado `hubspot-greenhouse-integration`; si no se define, el runtime usa el endpoint activo de Cloud Run como fallback.
- `GREENHOUSE_INTEGRATION_API_TOKEN` debe existir al menos en `Development`, `Preview`, `Staging` y `Production`; autentica los writes outbound de Greenhouse hacia el servicio externo HubSpot y no debe quedar solo en overrides por branch.
- Cuando una branch requiera login funcional en `Preview`, tambien debe tener `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `GCP_PROJECT`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL` definidos en ese ambiente.
- `tsconfig.json` excluye `**/* (1).ts` y `**/* (1).tsx` para evitar que duplicados locales del workspace rompan `tsc` y los builds de Preview en Vercel.

## Multi-Tenant Actual

- Dataset creado: `efeonce-group.greenhouse`
- Tabla creada: `greenhouse.clients`
- Tenant bootstrap cargado: `greenhouse-demo-client`
- Documento de referencia: `docs/architecture/MULTITENANT_ARCHITECTURE.md`
- Documento maestro de evolucion: `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- Documento de Fase 1 para identidad y acceso: `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
- DDL versionado: `bigquery/greenhouse_clients.sql`
- DDL propuesto para evolucion multi-user: `bigquery/greenhouse_identity_access_v1.sql`
- DDL multi-user ya aplicado en BigQuery: `client_users`, `roles`, `user_role_assignments`, `user_project_scopes`, `user_campaign_scopes`, `client_feature_flags`, `audit_events`
- DDL de bootstrap real desde HubSpot: `bigquery/greenhouse_hubspot_customer_bootstrap_v1.sql`
- DDL de bootstrap de scopes por mapeo conocido: `bigquery/greenhouse_project_scope_bootstrap_v1.sql`

## Decisiones Actuales

- Mantener cambios iniciales pequenos y reversibles.
- Usar `full-version` como fuente de contexto y referencia para construir la version Greenhouse dentro de `starter-kit`.
- Usar `../Greenhouse_Portal_Spec_v1.md` como especificacion funcional principal.
- No versionar `full-version` como parte de este repo.
- Favorecer despliegues frecuentes y verificables en Vercel.
- Usar `develop` como rama de `Staging` y `main` como rama de produccion.
- Documentar toda decision que afecte layout, rutas, deploy o variables de entorno.
- Mantener la politica de finales de linea en `LF` y evitar depender de conversiones automaticas de Git en Windows.
- En local fuera de Vercel/CI, `build` usa un `distDir` dinamico bajo `.next-local/` para evitar locks, colisiones y fallos de filesystem al reutilizar la misma salida.
- Evitar comandos Git mutantes en paralelo para no generar `index.lock`.
- La estrategia de IDs de producto ya no debe exponer prefijos de origen como `hubspot-company-*`; usar `docs/architecture/GREENHOUSE_ID_STRATEGY_V1.md` y `src/lib/ids/greenhouse-ids.ts` como referencia.
- Capability governance no debe derivarse desde `deals` ni `closedwon`; el sync externo solo es valido cuando llega con payload explicito desde el registro de empresa u otra fuente canonica equivalente.
- La capa verbal Greenhouse ya no vive en un unico archivo. `src/config/greenhouse-nomenclature.ts` queda para navegacion, labels institucionales de shell, product nomenclature (`GH_NEXA`, `GH_PIPELINE_COMMERCIAL`) y `GH_COLORS` transicional; el microcopy funcional shared vive en `src/lib/copy/` via `getMicrocopy()`, y el microcopy reutilizable de dominio vive en modulos type-safe `src/lib/copy/*` (`agency`, `client-portal`, `admin`, `pricing`, `workforce`, `finance`, `payroll`). Ver `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`, `docs/documentation/plataforma/microcopy-shared-dictionary.md` y `docs/manual-de-uso/plataforma/microcopy-shared-dictionary.md`.
- La navegacion cliente vigente para el portal Greenhouse contempla `Pulse`, `Proyectos`, `Ciclos`, `Mi Greenhouse` y `Updates`.
- `Mi Greenhouse` concentra el modulo relacional `Tu equipo de cuenta`; `Pulse` mantiene `Capacidad del equipo` como lectura operativa separada.
- La capa `GH_INTERNAL_MESSAGES` ya gobierna tambien partes grandes de `admin/tenants/[id]`, `view-as/dashboard`, governance de capabilities y tablas operativas del detalle de space.
- La supervisoría formal sigue teniendo precedencia manual en Greenhouse: Entra solo puede abrir propuestas de drift auditables en `greenhouse_sync.reporting_hierarchy_drift_proposals`; no debe sobreescribir `greenhouse_core.reporting_lines` sin aprobación humana explícita.
- La capa `greenhouse_conformed.nubox_*` debe tratarse como append-only snapshots: cualquier consumer nuevo de ventas, compras o movimientos Nubox debe resolver explícitamente el latest snapshot por ID (`nubox_sale_id`, `nubox_purchase_id`, `nubox_movement_id`) en vez de asumir una sola fila viva por documento.
- La frescura visible de documentos Nubox en PostgreSQL debe derivarse del `ingested_at` real del raw snapshot fuente; `NOW()` en una proyección downstream no es señal válida de que el documento se haya refrescado desde Nubox.
- Los conectores `source-led` críticos de Greenhouse deben converger al patrón runtime `source adapter -> sync planner -> raw append-only -> conformed snapshots -> product projection -> status/readiness -> replay/runbook`; no deben quedar como crons aislados con semántica implícita por conector.

## Deuda Tecnica Visible

- El proyecto ya tiene shell Greenhouse, pero aun no refleja la identidad funcional final.
- La autenticacion runtime ya no depende de `greenhouse.clients`; esas columnas quedaron como metadata legacy de compatibilidad.
- El demo y el admin interno ya usan `password_hash` reales; los contactos cliente importados desde HubSpot permanecen `invited` hasta onboarding.
- Faltan sprints reales, `capacity`, `market-speed` y los data flows restantes definidos en la especificacion.
- Tenant metadata y user identity ya quedaron separados.
- Falta definir la capa semantica de KPIs y capacidad.
- Falta relacion campanas con proyectos, entregables e indicadores.
- Falta aterrizar completamente el sistema ejecutivo reusable en runtime para que `/dashboard`, `/equipo`, `/campanas` e internal/admin compartan un mismo lenguaje visual.
- Sigue pendiente decidir cuando persistir `public_id` en BigQuery; por ahora el runtime puede derivarlos sin romper `client_id` y `user_id`.
- La nueva referencia para conectores externos es `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`; la API de integraciones debe mantenerse generica para HubSpot, Notion u otros sistemas.
- `GET /api/integrations/v1/tenants` no debe enviar parametros `NULL` sin `types` a BigQuery; el runtime vigente usa strings vacios como sentinel y tipos explicitos para mantener estable la resolucion de tenants en integraciones externas.
- La nueva lectura operacional de HubSpot no reemplaza la API generica de integraciones:
  - `/api/integrations/v1/*` sigue siendo el contrato para sync bidireccional de capabilities
  - el servicio `hubspot-greenhouse-integration` es la fachada de lectura live para CRM company/owner
- Sigue pendiente barrer copy residual interna en superficies grandes como `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`.
- Existe un bloqueo de tipos ajeno al plan actual por el archivo duplicado `src/config/capability-registry (1).ts`, que hoy impide usar `tsc` como verificacion integral limpia.

## Supuestos Operativos

- El repo puede estar siendo editado por varios agentes y personas en paralelo.
- `Handoff.md` es la fuente de continuidad entre turnos.
- `AGENTS.md` define las reglas del repositorio y prevalece como guia operativa local.

## Delta 2026-04-29 — TASK-723 reconciliation intelligence advisory-only

- Conciliacion bancaria ahora tiene una capa AI consultiva detras de `FINANCE_RECONCILIATION_AI_ENABLED` (default `false` en `.env.example`).
- El storage canonico es `greenhouse_finance.reconciliation_ai_suggestions` y siempre persiste `space_id`, `period_id` y `account_id`.
- Las APIs `/api/finance/reconciliation/[id]/intelligence*` solo listan/generan/revisan sugerencias. No aplican matches, no escriben `account_balances`, no rematerializan saldos y no cierran periodos.
- El CTA de UI abre el dialog existente de conciliacion con candidato preseleccionado; el usuario sigue confirmando el match con el flujo humano normal.
- Cualquier extension futura debe mantener el filtro por `space_id` y `account_id`, preferir `settlement_legs` canonicas y tratar payment-only legacy como baja confianza.

## Delta 2026-04-29 — Manual de Uso como capa documental

- Se agrega `docs/manual-de-uso/` como capa separada para guias practicas de uso del portal por dominio.
- Diferencia canonica:
  - `docs/architecture/` = contratos tecnicos.
  - `docs/documentation/` = explicacion funcional y reglas de negocio.
  - `docs/manual-de-uso/` = pasos concretos para usar una capacidad, permisos, cuidados y troubleshooting.
- `AGENTS.md` y `CLAUDE.md` ahora exigen revisar/crear manuales tras implementar capacidades visibles que el usuario deba operar.
- Primer manual: `docs/manual-de-uso/finance/sugerencias-asistidas-conciliacion.md`.
## Delta 2026-04-21 TASK-548 cierra el loop operativo de Product Catalog Sync

- Greenhouse ya tiene detección nocturna de drift para `product_catalog` frente a HubSpot Products.
- Runtime nuevo:
  - `src/lib/commercial/product-catalog/drift-reconciler.ts`
  - `src/lib/commercial/product-catalog/drift-run-tracker.ts`
  - `src/lib/commercial/product-catalog/conflict-resolution-commands.ts`
  - `services/ops-worker/product-catalog-drift-detect.ts`
  - APIs admin `/api/admin/commercial/product-sync-conflicts/**`
  - surface `/admin/commercial/product-sync-conflicts`
- Contrato operativo:
  - el scheduler canónico es `ops-product-catalog-drift-detect` a las `03:00` `America/Santiago`
  - los runs se registran en `greenhouse_sync.source_sync_runs` con `source_system='product_catalog_drift_detect'`
  - si el servicio externo aún no expone `GET /products/reconcile`, el lane degrada a `endpoint_not_deployed`/`cancelled` sin crear conflicts falsos
  - las resoluciones admin (`adopt_hubspot_product`, `archive_hubspot_product`, `replay_greenhouse`, `accept_hubspot_field`, `ignore`) dejan audit trail en `pricing_catalog_audit_log`
  - `accept_hubspot_field` solo aplica a productos `manual` o `hubspot_imported`
- Restricción explícita:
  - `greenhouse_commercial.product_catalog` y `greenhouse_commercial.product_sync_conflicts` siguen sin `space_id` en el schema vigente; este slice se aísla por access surface admin + capability `commercial.product_catalog.resolve_conflict`, no por FK tenant-aware a nivel tabla
## Delta 2026-04-22 — HubSpot custom properties now use a canonical declarative reconcile layer

- Greenhouse ya no debe manejar custom properties HubSpot con scripts aislados por task.
- Contrato nuevo:
  - manifest canónico: `src/lib/hubspot/custom-properties.ts`
  - reconcile live/idempotente: `scripts/ensure-hubspot-custom-properties.ts`
  - wrappers por objeto:
    - `pnpm hubspot:company-properties`
    - `pnpm hubspot:contact-properties`
    - `pnpm hubspot:deal-properties`
    - `pnpm hubspot:product-properties`
    - `pnpm hubspot:service-properties`
    - `pnpm hubspot:properties` para multi-objeto
- Objetos soportados hoy:
  - `companies` (`gh_*` party lifecycle)
  - `deals` (`gh_deal_origin`)
  - `products` (`gh_*` product catalog)
  - `services` (`ef_*`)
  - `contacts` soportado por el engine pero sin suite activa todavía
- Regla operativa:
  - si una property HubSpot nueva pertenece al contrato Greenhouse, debe declararse primero en el manifest canónico y no en un script ad-hoc
  - cuando HubSpot no refleje un atributo de metadata de forma confiable (ej. `readOnlyValue`), el manifiesto debe converger contra el estado verificable live y la restricción queda documentada como policy operativa

## Delta 2026-06-19 — TASK-1171 inclusión ICO de clientes data-driven + onboarding gobernado

- **Contrato operativo:** la inclusión de un cliente en ICO (cálculo, reportes, activación, verificación) es **data-driven y gobernada — cero código por cliente nuevo**. Prohibido hardcodear listas de clientes en rollups / agency report / consumers ICO; el período vigente nunca se materializa con incremental-delta (full siempre).
- **Activar ICO de un cliente** = acción gobernada `POST /api/delivery/ico/enable-sync` (capability `delivery.ico.sync.enable`, command `enableClientIcoSync`, outbox `space_notion_source.ico_sync_enabled` → reactive consumer en ops-worker propaga a BigQuery; Vercel es BQ read-only). Reemplaza el path admin-coarse `/api/integrations/notion/register` (queda solo backward-compat).
- **Verificar ICO de un cliente** = `GET /api/delivery/ico/sync-status` (capability `delivery.ico.sync.read`, escalera `not_connected→connected_not_enabled→enabled_not_calculating→calculating`).
- Nexa-operable por construcción (Full API Parity). Spec: `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md` § ICO Client Inclusion. Pendiente: UI affordance interna.

## Delta 2026-06-30 — Growth Forms embeds usan gates proporcionales

- TASK-1298 AEO produjo salvaguardas reutilizables para `<greenhouse-form>` en hosts WordPress/Ohio: renderer hardening, preview live-safe en memoria, captura de estados y frame review pixel-aware.
- Ese esfuerzo no se debe repetir completo para cada formulario. Nuevos Growth Forms usan flujo proporcional: identidad por `form-key`, smoke API, captcha/email gate cuando aplique, desktop/mobile 390 sin overflow y frame review visual.
- `pnpm public-website:verify-aeo-prelive-contract` queda como gate estricto de AEO por su bridge restaurado, `heroans` protegido y rollback previo; para otros formularios se escala el patrón solo si el host/superficie lo justifica.

## Delta 2026-06-30 — HubSpot Forms field upsert gobernado

- Para agregar campos a un HubSpot form destino, usar `pnpm hubspot:forms:upsert-fields -- --config <json> [--apply]`.
- El script lee la definición del form por HubSpot Forms API `2026-09-beta`, asegura CRM properties existentes o las crea solo si el config trae `createProperty`, y actualiza `fieldGroups` preservando el resto del form.
- Después de aplicar en HubSpot, aún hay que actualizar `form_destination.mapping_json.fieldMapping` en Greenhouse y correr smoke de secure-submit; HubSpot puede rechazar fields enviados si no están en la definición del form.

## Delta 2026-07-03 — AEO Growth Forms meeting CTA + chevron guard

- En `/aeo-2/`, el link directo bajo el formulario debe decir `Agenda una reunión` y usar icono de calendario; no volver a `Agenda una conversación`.
- Ese link debe mantener separación visual del texto previo: marker `gh-aeo-meeting-link-spacing-v1`, row flex con gap, icono calendario 16px y gap interno icono/texto.
- El hover de `Agenda una reunión` y `política de privacidad` debe ser visible pero limpio: cambio navy→teal, sin underline, fondo, borde ni sombra. `Agenda una reunión` puede mover/escala sutilmente el icono calendario; reduced-motion lo apaga. Marker final live `gh-aeo-link-hover-signal-final-v1`.
- La Success Card de AEO usa el mismo label en su acción schedule; versión publicada vigente `fver-bfc40c59-8d95-4d38-8ae5-0da7dc4ab468` (v16) usa copy event-driven (`Tu informe de visibilidad va en camino.`), declara `steps=[]` y conserva `fullName.placeholder="ej. María González"`.
- En success, el host AEO oculta trust/direct/privacy externos y pasos fallback para evitar CTA/texto duplicado bajo la card. Markers live `gh-aeo-success-card-polish-v1`, `gh-aeo-success-card-compact-steps-v1`, `gh-aeo-success-card-recraft-popper-v1` y `gh-aeo-success-card-borderless-v1`; el popper inserta temporalmente el party-popper SVG de Recraft V4.1 sin fondo/borde mientras el renderer source despliega el mark nuevo, y `borderless` quita el marco teal/línea superior/focus frame persistente de la card estática.
- El readiness `Todo listo para solicitar el diagnóstico` queda centrado bajo el submit CTA por source + marker live `gh-aeo-readiness-centered-v1`; backup `_gh_backup_before_aeo_readiness_centered_20260703T122245Z`.
- Los chevrons de los dropdowns premium no deben heredar transforms del select nativo: el renderer limita el focus transform al hijo directo, y el host WordPress mantiene el marker `gh-aeo-calendar-meeting-chevron-v1` como resguardo live hasta el próximo release.

## Delta 2026-07-08 — Public Site Redes Sociales living wall media

- En `/servicios/redes-sociales/`, el muro `Muestra de trabajo` queda como paquete híbrido live: `Carrusel` y `Post` son WebP editoriales bajo `assets/img/social/wall/v1/`; `Reel`, `Historia`, `UGC`, `Creador`, `Reel trend` y `Reel final` son clips 4s WebM/MP4/poster bajo `assets/video/social/wall/v3/`.
- Aprendizaje operativo: para placeholders animados por naturaleza, "vivo" no significa aplicar pan/zoom a una imagen. Debe existir acción contextual del formato: UGC con persona/cámara/handheld, Historia con mano/teléfono/reflejo, Creador con BTS/gimbal/set, Reel con cuerpo/arte/VFX/settle. Mantener estáticos los formatos editoriales cuando el craft del feed lo pide.
- Producción fuente: `ai-generations/2026-07-08_social-wall-assets/`, script `render-omni-motion-v3.mjs`, carpeta `motion-v3/`, generación Gemini Omni/Vertex desde frames `gpt-image-2`, exports web con `ffmpeg`.
- Verificación live canónica: `tmp/verify-social-wall-motion-v3.mjs` confirma desktop `1440` y mobile `390` con 8 medios, 6 videos vivos, 2 imágenes estáticas, pausa hover, reduced-motion correcto, sin overflow ni errores. Skills actualizadas: Codex/Claude `efeonce-public-site-wordpress`, `motion-design-studio` y `social-media-studio`.

## Delta 2026-07-11 — Pilotos de video requieren compatibilidad de estado fuente

- La producción `ai-generations/2026-07-11_glitch-microphone-intro/` queda congelada sin master: el 4K canónico ya muestra contacto y señal, pero el brief exigía hover inicial y señal sólo tras un segundo tap.
- Regla reusable: antes de generar image-to-video, validar `estado visible del source ↔ estado requerido al frame 0`; usar preflight del producto, asignar roles explícitos a referencias y no resolver contradicciones visuales con prompts. Máximo dos fallos equivalentes por arquitectura.
- Auditoría canónica: `ai-generations/2026-07-11_glitch-microphone-intro/review/source-state-and-creative-video-workflow-audit.md`.
