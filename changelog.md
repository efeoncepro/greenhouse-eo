# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-07-19 — Surface Recipes adopta planos de lectura sin degradar CTA

- `SurfaceRecipe` convierte los recipes oficiales en composición ejecutable sobre `CompositionShell`; el canvas gris queda como gutter y la lectura sostenida vive en work planes equilibrados.
- `/growth/ctas` consume el recipe conservando sus paneles maduros como benchmark de no regresión; se redujo card-on-card, se tokenizaron títulos/sombras/colores y Growth usa un icono semántico.
- El Lab de recipes y sus contratos técnico, funcional y operativo declaran el antipatrón de texto flotando sobre `background.default`. El baseline visual anterior no se promovió automáticamente: requiere aprobación humana de la nueva dirección.
- La segunda pasada corrige accesibilidad en sus dueños compartidos: navegación con botones nativos y Escape, Search/Notifications con microcopy ARIA canónico, Settings con `listbox→option`, footer interno correcto para Growth y contraste tokenizado en CTA. El shell desktop/mobile queda verificado; authoring profundo y nuevos baselines siguen como checkpoint pendiente.

## 2026-07-19 — EPIC-028 completa credits operations y Design System propio de Globe

- `TASK-1468` queda como kernel append-only; `TASK-1482` administra pools, grants, project budgets, policies
  y forecast sin crear un segundo saldo ni un pre-check fuera de la reserva transaccional.
- `TASK-1483` define el Runway Control Plane y separa credits operations del workbench creativo `TASK-1474`.
- `TASK-1480` debe emitir un decision record firmado; `TASK-1484` implementa después
  packages/pricing/billing/tax/revenue/payments y permanece bloqueada sin habilitar cobros/clientes.
- `TASK-1485` formaliza Design System Globe: Greenhouse gobierna decisions/registry/lifecycle/QA/evidence;
  Globe posee tokens seleccionados, patterns, components, motion y runtime sin heredar Greenhouse UI.

## 2026-07-19 — Worker builds adoptan inputs determinísticos y toolchain único

- Los cuatro workers Cloud Run copian `vendor/` antes de cada instalación, y sus workflows observan package,
  lockfile, Docker/Cloud Build ignores y `vendor/**`; `ico-batch` deja de omitir esos cambios.
- `pnpm worker:build-contract-gate` verifica pnpm SoT, existencia/Git/SHA-512 de dependencias `file:`, orden
  Docker, contextos y triggers. El runtime-deps gate cubre ahora también Artifact Worker y detectó/corrigió su
  import directo de `playwright` que dependía accidentalmente de un transitive.
- El registry privado definitivo permanece gobernado por `TASK-1473`; no se improvisaron tokens ni se saltaron
  sus blockers. El vendoring temporal queda reproducible y con condición explícita de retiro.

## 2026-07-19 — EPIC-028 adopta ejecución paralela bajo el harness de Greenhouse

- Model Lab/craft, plataforma gobernada y validación comercial avanzan en paralelo; probar una ruta bajo sandbox
  ya no espera al ledger/workbench completo, mientras su promoción a UI/MCP conserva un gate enterprise aparte.
- Greenhouse registra `TASK-1456…1485` y conserva tasks, hooks, lint, QA, planes, lifecycle, handoff y cierre
  cross-repo. Globe posee código/runtime/evidencia y mantiene un execution plan referencial, no un backlog paralelo.
- La primera wave prepara gobierno, sandbox/fixtures e IaC simultáneamente; el primer motion comercial es un
  Sample Sprint Efeonce-managed, no Studio Access ni créditos comerciales.
- Full API Parity queda convertida en gate de nacimiento, no follow-up de UI/MCP: `TASK-1481` crea el API
  Contract Spine/trusted context/conformance antes del primer provider call; `TASK-1457` prueba el primer
  canary por API/SDK→command→adapter→runner y `TASK-1473` queda como packaging/certificación sin business logic.

## 2026-07-19 — Globe ya existe como producto interno visible

- TASK-1455 convirtió el callback técnico de Globe en una shell branded live: raíz anónima, OAuth Greenhouse,
  callback `303 /studio`, sesión/revalidación, logout y recovery/revocación sin exponer tokens al browser.
- El runtime `globe-studio-internal-00006-445` sirve 100% del tráfico no productivo desde Node 24, min 0/max 1;
  build `fd79b83e-eafc-4fb1-93c9-ddf6309c4c17`, digest `sha256:7b213f7d…c8f4a`.
- Dirección `Orbital Threshold` usa los SVG/font assets canónicos con proveniencia. GVC premium live pasó
  1440×1000 y 390×844, teclado, reduced motion, axe, layout, runtime, performance y rubric enterprise;
  scorecard 4,73/5, floor 4,5 y cero overflow.
- Continúa internal-only y sin Production, clientes, projects, runs, providers, DB ni asset bucket. El siguiente
  slice funcional debe especificar el workbench real sin reabrir identidad o brand foundation.

## 2026-07-19 — Creative Studio formaliza el primer Business Model del repo

- Nace `docs/business-models/` con índice, lifecycle, fronteras y template canónico; Strategy conserva
  doctrina, Services el alcance operable, Commercial las transacciones y Finance/CPQ los precios por cliente.
- Creative Studio separa tres ejes que antes estaban mezclados: modelo de delivery (`Managed Squad`, `Staff
  Augmentation`, `Studio Access`), forma de engagement (`On-Going`, `On-Demand`, `Sample Sprint`) y modo
  operativo por run (`efeonce-managed`, `co-operated`, `client-operated`).
- Studio Credits quedan definidos como operaciones generativas gobernadas, no horas, piezas, tokens, moneda ni
  derechos. El modelo está aprobado para shadow ledger/pilotos; pricing público, checkout, top-ups, impuestos y
  acceso externo siguen bloqueados por Finance/Legal/EPIC-028.
- Provider-neutral deja explícitamente de significar provider-oculto: estimate, approval e historial muestran
  provider/modelo/version, readiness y fallbacks reales; siguen privados costo vendor, margen, keys y prompt/IP.
- El modelo se propagó a 20 skills en ambos runtimes: doctrina comercial/agencia; diseño, imagen, social,
  contenido, copy, decks y Digital Marketing; motion, audio y HyperFrames; Finance, Legal/IP, Talent, Tenders, GTM y Research.
  Nuevos módulos operativos cubren lifecycle, retries/refunds, derechos, ejemplos por pieza y finishing
  determinístico a cero credits sin convertirlo en costo cero. La matriz `EFEONCE_CREATIVE_STUDIO_SKILL_ADOPTION_V1.md`
  registra ownership, cobertura, validación y skills auditadas sin cambio.

## 2026-07-19 — Routing HubSpot de email y secuencias por API canonizado

- Las skills `hubspot-as-a-service` y `hubspot-solutions-partner`, espejadas para Codex/Claude, distinguen
  marketing directo, automatización legítima por formulario, email de ventas 1:1 y enrollment de secuencias.
  Marketing Starter no obtiene Single-Send; Sales Hub Professional sí puede inscribir contactos vía API bajo
  seat, inbox, permisos, scopes, consentimiento y límites de envío verificados.

## 2026-07-19 — Changelog interno adopta ventana activa e historia verificable

- `changelog.md` deja de ser un monolito append-only de 11.256 líneas y conserva hasta 60 entradas recientes;
  el estado completo previo al corte quedó preservado byte-for-byte con manifest SHA-256 bajo
  `docs/changelog/internal/legacy/`.
- `pnpm docs:context-rotate --apply` rota Handoff y changelog de forma independiente, mueve entradas completas
  a shards mensuales con hash, actualiza sus índices y aborta la reescritura ante edición concurrente.
- `pnpm docs:context-check:strict` y el workflow de governance ahora aplican budget, formato, orden, pointers e
  integridad; el prompt operativo de Codex y `implement-task` de Claude declaran explícitamente la ventana,
  archivo, rotación y gate del changelog, y CI verifica esos pointers. `docs/changelog/CLIENT_CHANGELOG.md`,
  `CLAUDE.md` y su CI permanecen fuera de este cambio.

## 2026-07-19 — Creative Studio: portfolio enterprise y routing agentic gobernado

- Una flota auditó documentación oficial de Google Cloud, Fal y la arquitectura de control para definir un
  portafolio profesional de imagen, video, audio, localización, post, capas y 3D. Google nativo queda directo
  por GCP; Fal sólo cubre rutas no-Google exactas; OpenAI se mantiene directo.
- Se añadieron el portfolio enterprise y un registry JSON de research para agentes. Separan capability estable,
  route candidate, tier, lifecycle y readiness; ninguna ruta ejecuta hasta `production_approved`.
- La skill `design-studio` en Codex/Claude incorpora routing enterprise, tres carriles Gemini Image, endpoints
  Seedream/FLUX/Ideogram/Kling/PixVerse/ElevenLabs/Bria exactos, Seedance 2.5 bloqueado y workbenches externos
  en `watch`.
- Se endurecieron los contratos de costo, privacidad, derechos, aprobación single-use, no-double-spend,
  observabilidad, DR y agent permissions. No se creó runtime, adapter, credencial ni gasto; EPIC-028 sigue siendo
  la frontera de implementación.

## 2026-07-19 — Efeonce Globe inicia construcción como Creative Studio hermano

- Se fijó **Efeonce Globe** como nombre canónico interno del Creative Studio y EPIC-028 pasó a `in-progress`.
- Se creó el repositorio privado `efeoncepro/efeonce-globe` y el único proyecto GCP inicial `efeonce-globe`,
  aislado de Greenhouse, con billing y APIs base pero sin workloads, datos, buckets, secretos ni gasto de providers.
- El monorepo foundation en Node 24 incorpora contratos UI/MCP, dominio de runs, provider boundary, media QC,
  runner async, CI y gobernanza. CI remota verde; IAM/WIF, budgets, IaC y primer vertical slice siguen pendientes.

## 2026-07-19 — Globe queda alcanzable desde Greenhouse como piloto interno

- TASK-1454 generalizó el broker OAuth de sister platforms mediante policy validada por client, preservó Kortex y
  registró Globe con audiencia `efeonce_internal`, capability namespaced y claims mínimos sin roles Greenhouse.
- Se aplicó la migración aditiva aprobada, se desplegaron callback web y API privada en Cloud Run y se verificaron
  PKCE/replay, acceso humano interno, denegación de tenant cliente, revocación convergente, correlación y audience
  exacto/incorrecto. El bridge Vercel OIDC → WIF → Google ID token opera sin service-account keys.
- Globe permanece activo sólo como piloto interno no productivo. No se habilitaron clientes externos, Production,
  providers creativos, DB ni buckets. La UI/branding con logo canónico continúa en una task `ui-ux` separada.

## 2026-07-19 — Contexto de agentes migra a router con preservación verificable

- `AGENTS.md`, `project_context.md` y `Handoff.md` dejan de operar como monolitos append-only: ahora separan
  reglas transversales, estado vigente y continuidad activa con carga por dominio.
- Los cuatro archivos anteriores al corte quedaron preservados byte-for-byte con manifest SHA-256 bajo
  `docs/operations/agent-context-history/2026-07-19/`; `Handoff.archive.md` pasa a ser índice.
- `pnpm docs:context-check:strict` aplica budgets, máximo 20 sesiones, targets y hashes; la rotación futura usa
  `pnpm docs:context-rotate --apply`, conserva por fecha, indexa shards con hash y aborta ante ediciones
  concurrentes; un workflow CI independiente evita reacreción.
- `CLAUDE.md` y su CI no fueron modificados; su pointer existente abre el operating model y los entrypoints
  `.claude/commands/implement-task.md` + documentation governor aplican el nuevo protocolo, verificado por CI.

## 2026-07-19 — Campaign Layout Compiler V1 ejecutable

- Se añadió `pnpm creative:layout` con modos `plan|compile|check` para convertir contratos YAML/JSON en fuentes
  SVG editables, underlays, masters, manifests/hashes, contact sheet y QA, sin llamadas a modelos.
- El compiler bloquea inputs faltantes y checkpoints de anchor/layout/finish; el release humano sigue separado.
  Paths relativos y SHA-256 hacen portable el relevo, y un baseline MAE opcional protege migraciones de masters.
- High Frequency se recompiló en `16:9`, `4:5` y `9:16` sin nueva inferencia: QA `3/3`, desviación normalizada
  `0,001096–0,001155` contra los masters previos, bajo el gate `0,002`.
- Sus 84 binarios (`148861636` bytes) se archivaron en el bucket privado canónico de GCP; Git conserva el
  manifiesto remoto con tamaño/SHA-256, contratos, QA, scripts y SVG editables, sin sumar esos assets a Vercel.
- Se sincronizaron contrato técnico, documentación funcional, manual y skills Codex/Claude. Es tooling
  out-of-band: no cambia runtime, IAM, secretos, despliegue ni activación en medios.

## 2026-07-19 — Layout Design & Finishing canonizado para producción estática premium

- El método `anchor → layout contract → clean plate por ratio → bounded finish → composición determinística
→ mastering → QA` se incorporó al canon multimodal, con documentación funcional y manual operativo.
- `design-studio` suma el módulo 13 y un contrato YAML reusable; `greenhouse-ai-image-generator` adopta el
  mismo routing. Codex y Claude quedaron espejados.
- Regla dura: Seedream Pro termina material/luz/color/atmósfera; GPT Image 2 corrige geometría/safe zones o
  regiones protegidas; copy, logo, CTA, legal y locale nunca se devuelven al modelo después de componerlos.
- El piloto High Frequency produjo `16:9`, `4:5` y `9:16`, pasó QA `3/3`, obtuvo `47/50` y registró costo
  incremental estimado de `USD 0,27`. Es benchmark observado, no SLA. No cambia runtime, IAM ni despliegue.

## 2026-07-18 — Worked example E2E de campaña visual multimodal

- Se produjo y versionó `ai-generations/2026-07-18_high-frequency-campaign-e2e/`: brief, fuentes,
  prompts, scripts, contratos de relevo, lineage, costo, QA, review board y paquete final.
- El routing validado usa Seedream 5 Lite para divergencia, Seedream 5 Pro para el mundo visual,
  GPT Image 2 para plates directos y Gemini Omni Flash para clean motion; Sharp/fontkit/FFmpeg resuelven
  copy, marca, end cards y exports. La topología es estrella, sin derivados en cadena.
- Se entregaron 18 stills (digital, A2 y OOH), 2 heroes motion de 15 s, 2 masters de 10 s y 2 bumpers
  de 6 s. Los heroes combinan el clean shot aprobado con claims exactos, una pared de formatos reales
  y end card determinísticos; agregarlos no requirió nueva inferencia. El clip Omni inicial de 3 s queda
  como technical probe y no como asset. QA `18/18 + 6/6`, audio de heroes medido en `-16.3/-16.4 LUFS`
  y true peak `-2.0/-2.2 dBFS`, score `47.4/50`, ZIP V3 reproducible y costo generativo release estimado
  de `USD 2.9650`. La auditoría endurecida mide los seis MP4 y deja masters/bumpers explícitamente pendientes
  de normalización por destino; Seedance 2.0 queda como fallback sólo para una nueva toma, ángulo o continuidad
  física ausente. La entrega
  queda aprobada como creative release; media activation sigue fuera de alcance hasta definir
  audience, offer, landing, tracking, presupuesto, legal, escucha humana y experimento.

## 2026-07-18 — Secondary Tidal Teal tokenizado y validado

- Se reemplazó el secondary lime/green por una familia Tidal Teal propia: ramp `100→900`
  `#DDF9F5→#083F3D`, anchor `500 #12AFA2`, opacidades derivadas y aliases semánticos por modo.
  Light usa `700 #0B726C` + blanco (5.77:1); dark usa `400 #3BCBBD` + Midnight (7.25:1).
- `mergedTheme` resuelve secondary por modo; Colors, Buttons, Chips, nomenclatura/chart secondary y
  Careers consumen el SoT. La antigua cláusula verde de TASK-1053 queda supersedida por
  `GREENHOUSE_SECONDARY_TEAL_COLOR_DECISION_V1.md`; AXIS Figma requiere reconciliación upstream.
- El Colors Lab ahora expone el mapping funcional, corrige 142 atributos ARIA inválidos y 53
  contrast findings preexistentes. Nuevo GVC `design-system-colors` desktop/mobile con accessibility,
  layout y runtime gates; baseline durable de cuatro frames, rerun con drift `0.00%`. Buttons y Chips
  también pasaron sus escenarios desktop/mobile y fueron inspeccionados.
- `ui:code-lint` permite HEX sólo en fuentes canónicas de color y fixtures de drift, manteniendo el
  bloqueo en consumers. El kill-switch canónico es `NEXT_PUBLIC_GREENHOUSE_SECONDARY_TEAL_ENABLED=false`;
  unset/default = Tidal Teal. El flag lime anterior queda retirado.

## 2026-07-18 — Método híbrido Seedream 5 ↔ GPT Image 2 para campañas still

- `design-studio` y `greenhouse-ai-image-generator` ahora diseñan una secuencia de manos:
  Seedream Lite para divergencia, Seedream Pro para materialidad/atmósfera, GPT Image 2 para
  estructura/reparación/adaptación y composición determinista para copy/logo/legal.
- Se agregaron módulo de producción, referencia técnica y contrato YAML de relevo, espejados para
  Codex/Claude. El flujo usa anchors aprobados, topología estrella, gates representativos por lote y
  un executor destino explícito; evita cadenas de derivados y comparaciones uno-a-uno sin operación.
- Dos pruebas reales validaron ambos sentidos. Los assets permanecen en `.captures` (gitignored);
  no se cambió runtime, IAM, secretos ni deploy. El puente GPT local → Fal usa upload temporal
  `fal-cdn-v3`, sin bucket público ni expansión de permisos GCP.

## 2026-07-18 — TASK-1453: Premium Agentic UI Platform

- Se cerró la causa sistémica de la UI genérica: nuevas interfaces `ui-standard`/`ui-platform` parten de Visual Direction + surface recipe + Composition Shell, no de un grid MUI. MUI/Vuexy quedan como foundation accesible, no como autor visual.
- Se incorporaron seis recipes y ocho primitives compuestas, Lab `/design-system/surface-recipes`, semántica `data-ui-surface`, presupuesto de máximo tres superficies `contained` en el first fold y blockers explícitos para card-on-card, mobile serializado y ausencia de impacto visual.
- Cuatro gates separan contrato, código, evidencia y calidad. GVC premium revisa desktop/390 px, enterprise rubric y dossier de catorce dimensiones; aceptación: media ≥4.5/5, piso ≥4 y cinco dimensiones críticas ≥4.5. ADR y reglas de Codex/Claude sincronizados.
- Hardening posterior al repro cross-agent: `ui:code-lint` reconoce `customShadows` como
  compatibilidad Vuexy sólo fuera de primitives, exime tamaños ópticos de glyphs Tabler
  y preserva números de línea reales en `--changed`; sombras literales y tipografía
  inline siguen bloqueadas.

## 2026-07-18 — TASK-1430: cockpit operator de CTAs (autoría gobernada + métricas + kill switches) — code complete

- `/growth/ctas` evoluciona a cockpit master-detail (CompositionShell `split` con nueva prop
  `splitTemplateColumns`): inventario con filtros/teclado + detalle con lifecycle completo, kill
  switches global/surface operables (reason auditado), preview del renderer canónico, superficies,
  supresión y versiones. Autoridad visual: proyecto Claude Design «Cockpit de CTAs» (instrucción
  del operador), traducido a tokens del theme.
- Autoría gobernada de 8 pasos en drawer (intención→…→revisión) consumiendo la metadata del Action
  Registry TASK-1431 (cero enum paralelo); preview harness con scrubber de density (umbrales reales
  560/400), claro/oscuro, hosts Think/WordPress y matriz pairwise; el mount degradado bloquea la
  revisión. Dirty-close con confirmación; submit server-confirmed.
- Métricas de marketing pedidas por el operador, resueltas SERVER-side: `getCtaMarketingMetrics`
  (impresiones Tier B viewed, clics, conversiones solo `server_confirmed`, CTR/tasa + deltas
  ventana-a-ventana, guard `impressions_undercounted` que evita % imposibles) wired a
  `CtaDetailVm.metrics`; `authorDraftCta` acepta `suppressionPolicy`. SQL vivo verificado (gate
  TASK-893). GETs admin + POST author des-gateados de `GROWTH_CTA_ENGINE_ENABLED` (el flag gobierna
  exposición pública). GVC desktop+mobile mirados. Arch §28 + skill actualizada (ambos espejos).
  Rollout pendiente: push + smoke staging.

## 2026-07-18 — ISSUE-123: staging access resuelve el deployment vigente (alias env-staging des-pinneado)

- Causa raíz identificada del bug class recurrente (3 veces en 2 días): un `vercel alias set` manual
  FIJA el alias `greenhouse-eo-env-staging-….vercel.app` y cada deploy posterior lo deja rezagado —
  los agentes validaban staging contra código viejo en silencio. El "fix" manual era la causa.
- Tooling resiliente: `resolveStagingAccess()` ahora resuelve el **último deployment staging READY
  vía Vercel API** (alias solo como fallback con warning); nuevo `pnpm staging:url` para componer
  (`STAGING_URL=$(pnpm --silent staging:url) pnpm fe:capture … --env=staging`); GVC con
  `STAGING_URL` + storageState por host (cookies no cruzan subdominios). Picker unit-testeado con
  el shape real de la API v6 (`customEnvironment.slug === 'staging'`, `target: null`).
- Alias des-pinneado (`vercel alias rm`, autorizado por el operador). Regla anti-recurrencia en la
  spec: NUNCA re-apuntar con `alias set`. ISSUE-123 queda open hasta verificar el re-atado
  automático en 2 deploys. Specs: `GREENHOUSE_STAGING_ACCESS_V1.md` §10 + ISSUE-123.

## 2026-07-18 — EPIC-032: Notion Work Management Control Plane planificado

- Se registraron `EPIC-032` y cuatro tasks compactas (`TASK-1449…1452`) para convertir la delegación y consulta
  de trabajo Notion en una capability multi-space por commands/readers y CLI: registry+Enhanced Markdown,
  jerarquía recursiva, estado/resultados/historia observada y rollout de agentes.
- El plan exige reconciliar `TASK-880` y `TASK-577` antes de implementar para conservar un solo cliente seam y
  un solo write bridge. Cambio sólo documental: no habilita runtime, flags, migrations ni writes Notion.

## 2026-07-18 — TASK-1431: Growth CTA Action Registry + navegación gobernada (code complete, rollout pendiente)

- El action router monomórfico del motor de CTAs se reemplazó por un **Action Registry tipado**
  (`src/lib/growth/ctas/action-registry.ts`, server-only): un entry por kind con policy schema,
  resolver y proyección browser-safe; `resolveCtaAction` queda como fachada estable y publish/render
  fallan closed ante kinds sin entry. Metadata read-only browser-safe por kind
  (`CTA_ACTION_KIND_METADATA`) para cockpit (TASK-1430)/preview/tests sin server-only. Taxonomía
  canónica de fallo `action_policy_invalid|action_kind_unsupported|action_destination_invalid|action_destination_unavailable`.
- Nuevas acciones de **navegación gobernada**: `link_url` (root-relative o https; anti open-redirect,
  sin credenciales ni protocol-relative), `open_think_tool` (path sobre hub Think gobernado + campaign
  context UTM-allowlisted strict) y `book_meeting` (hosts `meetings*.hubspot.com` + env
  `GROWTH_CTA_BOOKING_URL_HOSTS`; navegación-only, cero write CRM). `open_growth_form` sin cambios.
- Renderer `1.2.0`: executor por familia `growth_form|navigate` — navigate renderiza **`<a href>` real**
  (middle-click/historial/copy-link/a11y de link; `rel='noopener noreferrer'` externo, `target=_blank`
  opt-in + affordance sr-only), telemetría `clicked` ANTES de navegar (ingest keepalive), pending
  single-dispatch accesible con recovery 4s, fail-closed ante kind desconocido. Sin migración; SoT de
  telemetría intacta (`action_kind` porta 4 valores). Evidencia: 9728 tests verdes + build prod +
  GVC `task-1431-growth-cta-actions` 1440/390 mirado. Docs: arch §27, funcional 1.6, manual 1.3,
  TRACKING-PLAN §CTAs, skill `greenhouse-growth-ctas` (2 espejos). **Rollout pendiente**: push/release +
  bundle 1.2.0 en hosts antes de publicar cualquier CTA con action nueva + smoke staging.

## 2026-07-18 — notion-platform V1.1: delegación y seguimiento gobernados

- Se versionó la skill `notion-platform` para Codex y Claude con gramática canónica de Notion Enhanced Markdown, renderer/linter determinista y templates de proyecto, tarea, subtarea recursiva, cierre y snapshot de estado.
- Se añadió el contrato multi-space `alias → space_id → data sources/token ref/property IDs/schema fingerprint`; los proyectos permanecen planos y las subtareas son una relación autorreferencial sin límite de profundidad de dominio, con ciclos y límites operativos controlados.
- Se canonizaron consultas live de vencimiento/progreso/resultado, ledger observado para historial y cierre incompleto cuando falta resultado o evidencia. También se retiró la inferencia insegura por prefijo de ID y se actualizó el inventario MCP/async.

## 2026-07-18 — RELEASE: TASK-1428 + TASK-1429 en producción + enforcement ON (d5db8b568)

- Release develop→main (PR #159 + fix CI #160; orquestador `29651461496`, manifest `released`):
  suppression/Tier B/kill switches (TASK-1428) y slide_in/Experience System (TASK-1429) LIVE en
  producción. `GROWTH_CTA_SUPPRESSION_ENFORCEMENT_ENABLED` ON en staging y Production —
  verificado E2E post-release con visitante sintético (dismiss → exclusión; fresco → ve).
- Incidente cazado y cerrado de raíz durante el release: los timeouts del CI (Test 8 min /
  Coverage 10 min) mataban runs SANOS exactamente en el techo — la suite creció a ~9.8k tests.
  Subidos a 14/17 (job deep 25) y validados en el mismo release. Dos releases previos ya habían
  rozado el mismo patrón.
- Ambas tasks movidas a `complete/`. Ventana de monitoreo 7d de `growth.cta.*` hasta 2026-07-25.
  La primera campaña interruptiva real (superficie/mensaje/momento) queda como decisión de negocio.

## 2026-07-18 — EPIC-030: Greenhouse Link Hub Control Plane

- Se aceptó la dirección arquitectónica para una capacidad link-in-bio multi-marca controlada íntegramente desde Greenhouse: aggregate/versiones/dominios/audit como SSOT y renderer público limitado a una proyección allowlisted.
- El MVP parte con `links.efeoncepro.com/efeonce` para Instagram y TikTok; luego extiende `links.efeoncepro.com/<slug>` y custom domains opcionales de clientes sobre el mismo `link_page_id`. Comprar un dominio corto no es precondición.
- Se crearon `EPIC-030` y las tasks `TASK-1433…1439` para foundation/API, renderer, cockpit, dominios, medición, piloto Efeonce y productización cliente. Cambio sólo documental: no modifica runtime, DNS, Vercel ni perfiles sociales.

## 2026-07-18 — TASK-1429: slide_in interruptivo + CTA Experience System del renderer (code complete)

- Primer placement interruptivo oficial del motor CTA: `slide_in` no modal (`role=complementary`,
  sin focus trap), trigger gobernado del bundle (8s en página o 35% de scroll), apertura pasiva sin
  robar foco, Escape + focus return, dismiss persistido antes de la salida visual (mecánica
  `@starting-style` + `allow-discrete`, cero dependencia de animationend). Density
  `full|condensed|peek` derivada del contenedor propio; appearances `default|spotlight|minimal`
  tokenizadas con fallback seguro.
- El renderer ahora envía la identidad pseudónima del visitante (session siempre; visitor durable
  solo con `consent-state="granted"`) — activa el loop real de suppression de TASK-1428 — y
  `greenhouse_cta_viewed` pasa a visibility-gated (corte de semántica registrado en TRACKING-PLAN).
- Tokens del bundle al piso 2026 (`light-dark()`, `color-mix(in oklch)`, `linear()`) con fallbacks
  `@supports` y nombres `--gh-cta-*` intactos. Preview `/growth/ctas` con matriz de density + demo
  vivo del overlay. GVC desktop+mobile mirado; 90 tests verdes. Sin campaña interruptiva publicada
  aún (decisión del operador).

## 2026-07-18 — TASK-1428: suppression + Tier B + kill switches del motor CTA (code complete, shadow)

- Migración aditiva `greenhouse_growth`: `cta_visitor_state` (estado pseudónimo por sujeto visitor/session,
  hash-only, consent-aware), `cta_exposure_rollup` (Tier B agregado por hora — la exposición jamás entra al
  ledger OLTP de conversión) y `cta_kill_switch_event` (append-only). Aplicada a la instancia; tablas dormidas
  hasta el deploy del código.
- Suppression/frequency capping server-side con taxonomía estable de razones y policy por versión
  (`suppression_policy_json`, defaults conservadores, fail-closed): dismiss cooldown, conversión verificada
  contra Growth Forms, caps per-CTA y global interruptivo con claim atómico multi-tab. Integrado al arbiter en
  **shadow** (`GROWTH_CTA_SUPPRESSION_ENFORCEMENT_ENABLED` default OFF; registrado en el ledger de flags).
- Kill switches global/per-surface operables **sin redeploy** (estado en DB, capability `growth.cta.pause`,
  API `GET/POST /api/admin/growth/ctas/kill-switch`, outbox `growth.cta.kill_switch_changed`, respuesta pública
  `engineState ok|killed`). Signals nuevos: `growth.cta.kill_switch_active`, `growth.cta.priority_collision`,
  `growth.cta.event_ingest_backpressure`.
- Evidencia: full suite 9684 tests verdes + build prod + SQL vivo contra PG real. Rollout pendiente
  (push → shadow-compare staging → enforcement → prod gradual); la task sigue `in-progress` por diseño.

## 2026-07-18 — EPIC-023: CTA Experience System incorporado al plan V1

- El renderer portable se gobierna como una sola primitive con ejes ortogonales: placement, experience kind,
  appearance (`style_variant`), density `full|condensed|peek` derivada por container query y `variant_id`
  reservado para experimentación futura. Se canonizaron anatomía contextual, evidencia visual real, estados,
  motion, reduced motion, asset failure, long content, overflow/CLS y paridad preview↔Think↔WordPress.
- `TASK-1429` ahora entrega el sistema de presentación y un único interruptivo `slide_in`; `TASK-1431` define el
  contrato perceptible por action kind sin action-driven skins; `TASK-1430` incorpora authoring secuencial y
  preview con el renderer real, sin WYSIWYG/page builder; `TASK-1428` explicita dismiss/re-entry/caps/kill
  semantics y `TASK-1427` conserva el baseline productivo.
- El ADR aclara que `slide_in` es no modal: no usa `aria-modal` ni focus trap; sí exige Escape, dismiss accesible,
  focus return tras interacción, suppression y safe-area. No hubo cambio de código, runtime, flags ni lifecycle.

## 2026-07-18 — Pillar Web agéntica publicado y enlazado bidireccionalmente

- Publicado el post WordPress `249387`, cuyo título final es `El fin de la web “solo para humanos”: cómo preparar tu sitio para los agentes de IA`, en
  `https://efeoncepro.com/aeo/web-agentica-agentes-ia/`: 99 bloques gobernados, 14 H2 + 6 H3,
  TOC de 20 destinos y siete infografías SVG art-directed light/dark y desktop/mobile.
- La portada `WAG-V01-C15` quedó integrada como featured `251553` y OG/Twitter `251554`; schema, canonical,
  robots, sitemap, archive card, media y caché fueron verificados en vivo.
- La relación pillar–servicio quedó bidireccional: tres enlaces del artículo a `/desarrollo-sitios-web/` y un
  enlace contextual de la landing hacia el artículo. QA Playwright en 1440 y 390 px confirma visibilidad,
  recuentos exactos y ausencia de overflow. No se inventó tracking `gh_cta_clicked`; su gobernanza sigue pendiente.
- Riesgo residual ajeno: Related Posts aún solicita una variante inexistente de la portada de Surround Discovery.
  El body y la portada de este artículo no tienen recursos rotos. Cierre durable:
  `docs/audits/public-site/2026-07-18-web-agentica-pillar-publication.md`.
- El H1 se amplió post-publicación para conservar la tesis original y sumar una promesa práctica explícita. El
  slug `web-agentica-agentes-ia` y el SEO title específico de Yoast permanecen estables; `og:title` y schema
  heredan el nuevo título editorial. Yoast 28 no imprime `twitter:title`, por lo que X/Twitter usa el OG fallback
  correcto y no se dejó metadata inerte. Snapshot: `/tmp/gh-post-249387-before-title-v2-20260718.json`.
- AEO (`156`) fue promovida de hija de Loop Marketing a categoría raíz por `wp_update_term()`. Yoast SEO Premium
  gestiona cuatro 301 explícitos —tres posts y el archive—; canonical, breadcrumbs, cards y sitemaps ya usan
  `/aeo/`. El enlace recíproco de la landing fue actualizado al canonical mediante `Elementor\Document::save()`.
- El cierre de canonización distribuyó y consolidó los aprendizajes en las skills espejo de WordPress, Content,
  Design e Image Generator, el runbook agentic, los operating models visuales y `PDR-015`. El manifest general
  ahora deriva WAG-V01 del submanifest C15 y no puede reintroducir la portada anterior; el template reusable
  incorpora los arquetipos v7 y separa `indexed_observed` del estado de entrega. Los dos enlaces internos del
  post que todavía dependían de 301 fueron reconciliados a sus canonicals, con snapshot, purge y nueva inspección
  final `post-deep-inspection-249387-2026-07-18T11-37-13+00-00.json`.

## 2026-07-18 — Método de portadas editoriales Efeonce y piloto Web Agéntica

- La portada del pillar privado `El fin de la web “solo para humanos”` llegó a su candidato seleccionado
  `WAG-V01-C15`: composición humano–interfaz–agente producida con `gpt-image-2`, calidad `high`, master
  `2048×1152` y un degradado continuo blanco cálido → azul luminoso → azul nave que reemplaza los planos
  triangulares. La topología de la mano robótica fue validada con referencia anatómica explícita para asegurar
  que el gesto corresponde al índice y no al dedo medio o meñique.
- Se generaron derivados featured `1600×900`, Open Graph `1440×756` y card cuadrada `1152×1152`, con score
  editorial `49/50`, hashes y provenance reproducible. Posteriormente se integraron y verificaron en vivo como
  media `251553` y `251554` del post WordPress `249387`.
- El aprendizaje quedó canonizado en `EDITORIAL_COVER_KEY_VISUAL_OPERATING_MODEL_V1.md` y enlazado desde las
  skills espejo de Content Marketing, Design Studio y AI Image Generator: metáfora editorial, roles de
  referencia, modelo exacto, iteración de una variable, gradientes narrativos, anatomía/cultura, scorecard,
  derivados, metadata y frontera de publicación. La metodología es estable; el lenguaje visual de la serie
  seguirá provisional hasta validarlo en dos portadas adicionales.

## 2026-07-18 — Artículo Agent Skills publicado

- Publicado `«I Know Kung Fu»: el momento Matrix de los Agent Skills` en el sitio público, preservando la voz de
  Julio Reyes y la tesis sobre convertir criterio organizacional en capacidades reutilizables.
- La pieza incluye tres infografías editoriales (dos con variantes desktop/mobile), featured/OG `1200×630`,
  metadescripción Yoast, focus keyphrase, metadata Open Graph/Twitter, canonical propio, robots indexables y
  disclosure editorial. El cierre live confirmó `200`, schema Article/Person, sitemap, archivos multimedia,
  fuentes y ausencia de duplicado WordPress/Think.
- Compatibilidad móvil: la variante KFU-V02 usa un fallback PNG `1000×1500` bajo `600px` después de detectar que
  un navegador móvil/in-app no interpretaba el SVG trazado. El SVG editable y la variante desktop permanecen;
  el render live quedó verificado por `currentSrc`, dimensiones naturales, captura y ausencia de overflow.
- La portada inicial fue reemplazada por la pieza aprobada `HI-YAAH!`: lluvia binaria, figura marcial y golpe de
  energía en formato `1200×630`. WordPress media `251552` quedó sincronizado como featured, Open Graph, Twitter
  y `primaryImage` del schema; caché purgada y readback público verificado.

## 2026-07-18 — Sistema editorial de infografías Efeonce y entrega SVG directa

- `content-marketing-studio` incorpora un canon Efeonce basado en siete precedentes SVG propios y benchmark
  Semrush: shell de marca estable, arquetipo variable por relación, paleta auditada, shareability y sello
  `efeoncepro.com` consumido desde Artifact Composer. La regla está espejada en Codex/Claude y enlazada desde
  `design-studio` y el carril Gutenberg/WordPress.
- El pillar privado `El fin de la web “solo para humanos”` aplica el sistema en siete infografías y 28 variantes
  SVG: la firma completa —fuente/fecha, wordmark oficial y URL— vive en el footer, nunca en el header. El draft
  `249387` quedó integrado con art direction light/dark y desktop/mobile, sin cambiar su estado a publicado.
- El pipeline deja de imponer PNG/WebP: separa source SVG de delivery SVG saneado y rasteriza solo por contenido,
  destino, seguridad o comparación de peso. Se agregaron contrato reusable, preset JSON y auditor CLI. En la
  muestra histórica, el SVG comprimido resultó ~2.1×–5.6× más liviano que WebP 1200 comparable. Comando canónico:
  `pnpm content:editorial-svg:audit -- <delivery.svg...>`.
- Se promovió el aprendizaje a un operating model reusable, documentación funcional y manual; las skills
  Content Marketing, Design Studio, SEO/AEO y Public Site WordPress ahora comparten footer-only, source/delivery,
  SEO de SVG, alternativas largas, legibilidad CSS, CLS, shareability por canal y raster social-safe.
- Una auditoría posterior corrigió el estado v7: el PASS existente cubre archivo/seguridad, pero no demuestra
  todavía legibilidad al ancho CSS, geometría del delivery trazado ni CLS/currentSrc. El draft sigue privado y
  queda `contextual_v7_qa_pending`; no se declara listo para publicación.

## 2026-07-18 — TASK-1340: Growth CTA Portable Renderer + capa GTM + gobernanza en Growth (code complete, shadow)

- Renderer portable `<greenhouse-cta>` (`src/growth-cta-renderer/**`, vanilla TS 22,6KB, hermano del
  forms-renderer): light DOM + ElementInternals, espejo del contrato v1 con parity test, capa visual
  rica y versátil (tokens `--gh-cta-*` re-tematizables, 3 style variants por dato
  default/spotlight/minimal, slot visual, dark/bare, container queries, skeleton anti-CLS,
  reduced-motion), action `open_growth_form` montando el `<greenhouse-form>` gobernado (carga lazy +
  join submission), fail-closed en público. Build esbuild → `public/growth-cta/renderer-<canal>.js`
  (prebuild). El loop GVC atrapó un drift real de paridad preview↔público → selectores unificados
  `:is(greenhouse-cta, .ghc-scope)` (paridad por construcción).
- **Capa GTM** (nota del operador): familia `greenhouse_cta_*` → dataLayer del host con allowlist
  dura sin PII (SoT server + espejo renderer + parity test), fila TRACKING-PLAN §CTAs con spec
  turnkey de tags GA4 para el flip y deslinde del rail legacy `gh_cta_clicked`; publish al container
  SOLO gobernado (workspace→preview→confirmación humana).
- **Gobernanza en el menú Growth** (nota del operador): `/growth/ctas` (viewCode
  `gestion.growth_ctas` + seed aplicada; roles operador growth) con inventario + lifecycle
  (publish/pause/resume, estado honesto con flag OFF) + surfaces + preview de variantes; GVC
  desktop/mobile mirado. Island Think `GrowthCtaDock.astro` commiteada en rama local de
  `efeonce-think` (PR a señal); embed WP documentado. Master flow EPIC-023 creado. Flag
  `GROWTH_CTA_ENGINE_ENABLED` sigue OFF: flip turnkey documentado en el ledger.

## 2026-07-18 — Contrato operativo GSC API, Platform Properties e indexación

- `seo-aeo` documenta capacidades/scopes reales de Search Console API, el retiro del sitemap ping, el límite de
  Indexing API y el canary obligatorio antes de asumir paridad API para Platform Properties.
- El runbook y las skills espejo del sitio público separan el gate de publicación (URL rastreable + sitemap con
  `lastmod` honesto) del seguimiento asíncrono de indexación. `TASK-1426` conserva la implementación pendiente.

## 2026-07-18 — Pillar privada de web agéntica preparada para revisión

- El post WordPress `249387`, `El fin de la web “solo para humanos”`, quedó actualizado como pillar de 4.448 palabras para soportar la landing de desarrollo web: definición citable, cuatro tipos de sitio, arquitectura compartida, matriz WebMCP/MCP/API, estado real de Chrome/WebMCP y del mercado, evals por capas, cadena de autoridad, doce pruebas de readiness, reconstrucción y FAQ.
- Content Factory pasa con 99 bloques semánticos, TOC de 20 destinos, featured/OG separados y siete diagramas de cuerpo. WAG-V04 agrega identidad, representación, alcance, confirmación y evidencia a WAG-V02/V03; el gate automático de geometría y la QA SVG light/dark desktop/mobile pasan sin texto fuera de superficie, imágenes rotas ni overflow. El artículo sigue en `draft`; publicación, enlace recíproco, purge y QA live requieren autorización humana separada.

## 2026-07-17 — TASK-1339: Growth CTA & Popup Engine — foundation `growth.cta` (code complete, shadow)

- Fundación server-side de la primera rebanada vertical de EPIC-023: schema `greenhouse_growth.cta_*`
  (definition/version con state machine + published inmutable por trigger; surface bindings con embed key;
  conversion ledger Tier A append-only con `trust_level`/`consent_source` + rechazos sin PII), primitive
  canónico `src/lib/growth/ctas/` (contracts `greenhouse-growth-cta-popup.v1`, arbiter server-side 0–1
  interruptivo, render-contract compiler browser-safe, action router SOLO `open_growth_form` vía el reader
  de Growth Forms sin duplicar schema/validación/consent, ingest forjable-hardened con cross-check
  `cta_version↔surface` + rate-limit + idempotencia), API pública render/events (CORS data-driven) y
  admin list/author/lifecycle/surfaces (capability fina por acción).
- Capabilities `growth.cta.{read,author,publish,pause}` (catalog + registry + grants espejo growth.forms +
  coverage verde; `pause` separada = freno de emergencia sin autoridad de publish). 4 reliability signals
  `growth.cta.*` cableadas al overview. Outbox `growth.cta.version_lifecycle_changed` + `surface_registered`
  v1 in-tx (EVENT_CATALOG delta). Primer CTA real `ai-visibility-report-followup` publicado con bindings
  `wordpress` + `think`; smoke e2e verde contra PG dev (render sin leak de policy, ingest idempotente,
  forja rechazada y persistida). Flag `GROWTH_CTA_ENGINE_ENABLED` default OFF (ledger); flip coordinado
  con TASK-1340 (renderer), que queda desbloqueada por el contrato publicado.

## 2026-07-17 — TASK-1276: AEO Operator View (Growth + Account 360) — code complete local

- Vista operador del programa AEO (nodos S8-S12 del EPIC-020), implementada desde el mockup aprobado de
  Claude Design "AEO Operator View": cockpit `/growth/aeo` (KPIs + tabla score/tier/último run + filter
  pills por motion + targets de cross-sell), detalle `/growth/aeo/[organizationId]` (banda de cliente +
  reuso del workbench masterDetail de TASK-1248 vía extensiones aditivas `chrome`/`plan`), control de
  estado del Plan AEO (5 estados TASK-1275, reason obligatorio en blocked/dismissed, a11y completo),
  picker de run operador agrupado por motion (TASK-1277), composer de envío + Lead HubSpot con consent
  gate (TASK-1279, flag OFF) y facet "AEO" en el Organization Workspace (Account 360).
- viewCode `gestion.growth_aeo` + seed migration (roles operador; NUNCA client\_\*) + nav Growth; el facet
  reusa la capability `report.read_operator` (sin capability nueva). Bugfix raíz en el store del grader
  (timestamptz llegaba como `Date` bajo cast `as string` → 500 con data real; normalizado a ISO — también
  cubría a `/aeo` cliente). GVC desktop+mobile mirado con data real (Sky Airlines/Grupo Berel), scroll
  horizontal 0. Estado: code complete, rollout pendiente (push/staging/prod por instrucción del operador).

## 2026-07-17 — Cierre de aprendizaje editorial del Customer Agent ANAM

- El runbook agentic de blogposts incorpora un scan de lenguaje de lifecycle, clasificación explícita del alcance
  de cada claim, gate problem-aware del primer viewport y el estado honesto del tooling de publicación/QA todavía
  acotado por caso.
- El manifest y el sistema visual del artículo quedaron sincronizados con los assets v2 y la publicación live.
  `content-marketing-studio` añade `explanatoryDelta` como gate ejecutable para evitar infografías decorativas o
  redundantes; la regla se sincronizó para Codex/Claude sin convertir la estética HubSpot en default.

## 2026-07-17 — Gate de entrega para sistemas visuales editoriales

- `content-marketing-studio` exige ahora un `deliveryContract` machine-readable por `conceptId`: viewport,
  tratamiento light/dark, canvas transparente/opaco, origen del skin y justificación. La regla quedó sincronizada para Codex y
  Claude; decisiones como una sola composición o un único tema siguen permitidas, pero ya no pueden ser defaults
  silenciosos.
- El comando compartido `pnpm content:visual-manifest:lint -- <manifest.json>` bloquea art direction sin variantes
  desktop/móvil, contratos light/dark incompletos y transparencia sin verificación técnica de alpha. El manifest
  del Customer Agent de ANAM ya pasa el gate con hero opaco y tres diagramas transparentes en cuatro variantes.
- Los skins se clasifican como Efeonce core, contextual de plataforma/cliente o específico de campaña. El
  vinotinto/coral de esta portada queda limitado al contexto HubSpot y no se convierte en default editorial.

## 2026-07-17 — Mantenimiento directo de plugins del sitio público WordPress

- Se actualizaron en `efeoncepro.com` AI 1.2.0, Contact Form 7/Mailchimp 0.9.81.03, Elementor 4.1.5,
  Elementor Pro 4.1.3, HubSpot 11.3.65, Jetpack 16.0.1, Spectra 2.20.0 y SVG Support 2.5.17. Se verificaron
  arranque de WordPress, plugins críticos activos, ausencia de mantenimiento/error PHP y rutas públicas clave.
- Essential Addons for Elementor 6.7.0 produjo un paquete incompleto sin `autoload.php`; se restauró de inmediato
  la versión 6.6.10 desde el snapshot previo. Su actualización queda pendiente hasta que el proveedor publique
  un paquete íntegro o pueda probarse fuera de producción.

## 2026-07-17 — Publicación del caso ANAM con portada product-story V6

- El artículo `Un dashboard no arregla un proceso comercial` quedó publicado en la categoría HubSpot con autor
  Julio Reyes, canonical estable y contenido preservado. La portada SVG product-story usa media `251415` como
  featured y `251416` como Open Graph/Twitter.
- La publicación tuvo snapshot/rollback, guards de identidad, fingerprint, taxonomía y media, purge Kinsta y QA
  live desktop/móvil. Pasaron robots, schema, social metadata, TOC, imágenes, links, overflow y el crop cuadrado
  real del archivo.

## 2026-07-17 — ANAM: backlog operativo y criterios de cierre

- Se consolidó en una fuente canónica el trabajo abierto posterior al rollout comercial: automatizaciones y QA
  de pipeline, Calidad de Datos, Service/renovación, KPI oficiales, Customer Agent, facturación y Tickets/SLA.
  Cada frente explicita owner, dependencias, aprobación y exit gate; el cambio es documental y no autoriza ni
  ejecuta nuevos writes en HubSpot.

## 2026-07-17 — Borrador privado del artículo Customer Agent de ANAM

- El segundo artículo de la serie ANAM quedó integrado como post privado `251432`, con autor Julio Reyes,
  categoría HubSpot, `noindex`, featured/OG y tres diagramas responsive light/dark desde Media Library.
- La validación autoral, inspección profunda, acceso anónimo `404` y QA visual desktop/móvil pasaron. La revisión
  autenticada del template Ohio y cualquier publicación continúan pendientes y requieren un paso separado.

## 2026-07-17 — Escenas editoriales de producto: método agnóstico y skin contextual

- `design-studio` suma un módulo espejo Codex/Claude para auditar referencias desde sus assets originales,
  construir escenas de producto con gráficos determinísticos, gobernar referencias positivas/negativas y validar
  `16:9`/`1:1`/responsive. `content-marketing-studio`, `greenhouse-ai-image-generator` y el runbook editorial
  consumen el mismo contrato.
- La gramática de dashboards/escenas queda agnóstica al tema. Las paletas de plataforma se tratan como skins
  locales: vino/lavanda/naranja puede contextualizar un artículo sobre HubSpot, pero no se convierte en branding
  Efeonce ni default para RevOps, CRM o futuros artículos.
- La portada ANAM V6 quedó registrada con source, master, derivados, crop y auditoría; después fue seleccionada
  e integrada en la publicación con QA live.

## 2026-07-17 — ANAM: gobierno de pipelines Growth y Renovación

- En el portal ANAM `19893546`, Deal ahora exige Company al crear y ya no recibe fecha de cierre automática a
  60 días. Growth sólo se crea ordinariamente en `Potencial 10%`; las etapas posteriores exigen `Paso siguiente`,
  datos quote-to-award y motivo de cierre según corresponda. `Radar 0%` y sus diez Deals permanecieron intactos.
- Renovación conservó IDs/probabilidades y adoptó siete etapas semánticas desde `Por revisar` hasta los resultados
  `Renovado`, `No renovado` y `No aplica / Desestimado`; creación y requiredness quedaron gobernados sin mover
  registros históricos. Las ocho tareas de acompañamiento por entrada futura a etapa siguen diseñadas pero no
  publicadas, evitando una ola retrospectiva sin contrato de owner/vencimiento/notificación.

## 2026-07-17 — Método de infografía editorial determinística

- `content-marketing-studio` incorpora una referencia reusable para producir infografías con copy, datos y marca
  exactos mediante `contrato -> SVG accesible -> Chromium/PNG master -> WebP -> QA original/contextual -> manifest`.
  Incluye art direction responsive/light-dark, espera de fuentes y assets, hashes, provenance, accesibilidad y
  separación explícita entre producción visual completa e integración/publicación.
- `design-studio` enruta estas piezas al método y conserva la dirección de composición; `dataviz-design` sigue
  siendo dueño del encoding analítico complejo. La estética de ANAM queda como precedente local, no como regla
  global. Referencia y routing quedaron espejados para Codex/Claude.

## 2026-07-17 — ANAM: geografía de ejecución LATAM en Deal

- El portal ANAM `19893546` incorporó `Países de ejecución` (`ef_paises_de_ejecucion`) como multiselección Deal
  de 20 países LATAM, creada mediante release gobernado de Kortex y verificada por readback directo de HubSpot.
  Complementa `Región` (`zona`) para ejecución chilena y mantiene separada la sede de Company.
- El cambio fue estrictamente aditivo: una propiedad, cero errores y ningún workflow, pipeline, formulario,
  reporte, record o backfill. Al cierre existen cero Deals poblados; adopción, requiredness por etapa y reporting
  deduplicado son slices futuros approval-gated, no capacidades declaradas como listas.

## 2026-07-17 — Firma de marca para el sistema visual editorial

- `content-marketing-studio` incorpora una política reutilizable para firmar hero/OG, diagramas y capturas con
  activos oficiales, contraste y espacio de respeto, sin convertir el logo en watermark ni mezclarlo con marcas
  de clientes o plataformas. Los mirrors Codex/Claude quedaron sincronizados.
- El sistema visual del caso ANAM aplica la regla con el wordmark oficial de Efeonce; `ANAM-V02` fue regenerado,
  revisado a resolución original y registrado con nuevos hashes. Una medición del tema Ohio descartó usar el
  master vertical en desktop (`1483 px` de alto a ancho de columna): ahora existe variante horizontal `3:2` para
  desktop/tablet y vertical `3:4` para móvil. La skill canoniza `<picture>` para art direction; su soporte en el
  renderer sigue pendiente. No se subió a WordPress ni se publicó el post.
- Se aclaró la frontera estilística: la regla reusable es una experiencia editorial integrada, no fondos ni
  formas universales. El retiro de círculos/gradiente conserva el estilo de las infografías ANAM y queda limitado
  a `ANAM-V02`–`V04`; otros artículos pueden usar sistemas visuales completamente distintos.
- `ANAM-V02` ya materializa esa corrección: cuatro derivados determinísticos —desktop/mobile × light/dark—,
  sin círculos ni gradiente de canvas, con cards y composición preservadas y logos oficiales positivo/negativo.
  Masters y WebP fueron inspeccionados; la integración WordPress continúa pendiente.
- `ANAM-V03` quedó producido como cuatro variantes determinísticas —horizontal `1600×900` y vertical
  `1200×1600`, ambas light/dark—. La gráfica mantiene una escala íntegra `0–100%`, muestra el cambio real de
  `2,75 pp`, explicita `611` Deals pendientes y sitúa el gate de KPI en `≥95%`. Los logos oficiales se verificaron
  desde los masters finales; todavía no se cargó ni integró en WordPress.

## 2026-07-17 — Prospecting Agent: contrato reusable de implementación

- `hubspot-solutions-partner` incorpora una referencia client-agnostic para evaluar e implementar Prospecting
  Agent con separación explícita entre superficie general y beta Buying Signals/Contact Sourcing. Canoniza
  readiness, plays/perfiles, sourcing, outreach, exclusiones, créditos, piloto, KPIs y gobierno humano. También
  distingue entrenamiento comercial/grounding de fine-tuning y autoaprendizaje, comparándolo con las content
  sources y el coaching del Customer Agent.
- Los mirrors Codex/Claude y `SOURCES.md` quedan sincronizados para esta capacidad. No hubo cambios en portales,
  enrollments, automatizaciones, créditos ni envíos.

## 2026-07-17 — Método de traducción editorial de metadata

- `content-marketing-studio` suma un contrato load-on-demand para traducir una tesis técnica a H1, SEO/OG,
  excerpt, descriptions, slug, categoría y tags con trabajos distintos. El método prioriza el problema que el
  lector reconoce, somete la jerga a un gate explícito, evita taxonomía de una sola pieza y exige snapshot,
  rollback y readback al mutar runtime.
- La referencia quedó espejada para Codex/Claude; `copywriting` incorpora el sistema de titulares por superficie
  y `seo-aeo` enlaza el método desde su contrato editorial manteniendo autoridad sobre intent/canonical/robots.

## 2026-07-17 — Método de utilidad citable para contenido enlazable

- `content-marketing-studio` incorpora un contrato reusable para link earning/citación: identificar usuario y
  trabajo de la cita, diseñar un objeto reutilizable, sostenerlo con evidencia/límites, publicarlo como pasaje
  HTML enlazable, validarlo con pares y medir su circulación a 30/60/90 días. Se agregó template y mirror
  Codex/Claude; `seo-aeo` consume el método desde off-page y mantiene la regla de no garantizar backlinks.
- El brief del caso ANAM es la primera aplicación: Escala de confianza `KPI oficial / Diagnóstico / Piloto`,
  checklist público, evidencia negativa y Definition of Done de citabilidad. No hubo write en WordPress.

## 2026-07-17 — Customer Agent: canon de Workflows y bots

- Las skills espejo de HubSpot as a Service distinguen `Deployment > Workflows and bots` como enrutamiento
  selectivo de conversaciones, separado de knowledge, acciones del Customer Agent y `Run Agent` en workflows.
  Se agregó el contrato de diseño/QA y el patrón ANAM por intención sin afirmar ni activar un despliegue live.
- Se canonizó además el mapa 2026 de capacidades no exploradas —reply recommendations, permisos Contact, acciones
  API, QA contextual, analítica/coaching, rollout escalonado y multicanal— con estados de evidencia, límites de
  seguridad y un backlog ANAM que mantiene betas, writes y publicación bajo aprobación separada.

## 2026-07-17 — Catálogo de servicios Efeonce y dos servicios HubSpot as a Service

- Se creó `docs/services/` como capa canónica para definir resultados, alcance, entregables, responsabilidades,
  evidencia y continuidad de servicios operables, sin confundirlos con arquitectura, manuales, propuestas,
  catálogos runtime u objetos CRM.
- Customer Agent gestionado y arquitectura RevOps/automatización/paneles quedaron registrados como dos servicios
  separados y reutilizables, con ANAM `19893546` como implementación de referencia y los informes Word como
  evidencia detallada.

## 2026-07-17 — Backpressure de webhooks Notion con Cloud Tasks

- Se agregó un path asíncrono opt-in para `notion-tasks-demo` y
  `notion-status-transitions`: HMAC antes del ACK, Cloud Tasks como recibo durable,
  worker OIDC y procesamiento posterior reutilizando el inbox/handlers canónicos.
- Cloud Tasks quedó provisionado en `us-east4` con concurrencia global 5 y queue
  activa (`RUNNING`). Vercel staging/production tiene la configuración no
  sensible; el kill-switch quedó `true` en Production y `false` en staging.
- La capacidad fue desplegada a producción en el release `416b12ad140c` y pasó
  health/control-plane. El rollout posterior quedó activo en el deployment
  `dpl_DkdnLEUFwY3MvxyD9VncYwqzQNj1`: canary OIDC deduplicado, prueba pública
  firmada `queued:true`, backlog cero, health `200` y PostgreSQL estable en 10
  conexiones observadas. Con esto los bursts se absorben sin comprar PgBouncer.

## 2026-07-17 — ANAM Customer Agent: source pack live independiente

- Se retiró la excepción documental del Customer Agent con un source pack Markdown independiente bajo
  `docs/architecture/kortex/hubspot-as-a-service/anam-customer-agent-source-pack/`: 23 fuentes privadas en uso,
  seis documentos de dominio, 17 respuestas cortas completas y catálogo técnico de 356 registros/métodos/plazos.
- El pack separa knowledge de identidad, directrices, handoff, canales y acciones; incorpora IDs de archivo,
  fechas de sincronización, reglas de sincronización y checks de republicación. No se mutó HubSpot.
- El readback autenticado del portal ANAM `19893546` reveló drift de continuidad: HubSpot muestra término de
  acceso gratuito, agente pausado, nuevas conversaciones pausadas y `Reanudar` deshabilitado, pese a la compra y
  30.000 créditos confirmados el día anterior. Configuración, 23 fuentes y chatflow 24/7/100% siguen presentes;
  la cuenta sí muestra 33.000 créditos mensuales, pero está vencida por la factura `#760627868` (venció el
  2026-06-07). Dos intentos confirmados de activar el uso fallaron en HubSpot; facturación ANAM debe regularizarla
  antes del retry y readback. No se pagó ni cambió la suscripción.

## 2026-07-16 — TASK-1422: UI de redacción del aviso con IA en el Publication Desk

- El Publication Desk (`/agency/hiring/publication`) gana el CTA `✨ Redactar con IA` en la columna
  pública del diff (variantes ready / locked con tooltip por flag / pendiente por ledger) y un
  **drawer propose→confirm**: bloque "Lo que la IA verá" (rol + hechos + skills reales de la demanda,
  con candado de exclusiones), template de assessment opcional, progreso honesto del LLM
  (con "seguir en segundo plano"), formulario editable prefilled y Aplicar/Descartar. Cliente
  delgado de TASK-1385: cero endpoints nuevos; el confirm humano escribe, el publish sigue aparte.
- Además: selector de vacante en el header (la vista fijaba `openings[0]`) y copy bilingüe
  `hiringDesk.publication.vacancyAi` (es-CL + en-US).
- Diseño con contratos robustos (wireframe + flow que extiende el nodo N-publish del master
  EPIC-011 + motion con reuso íntegro de `ghHiring*`), y **GVC en loop de 5 iteraciones** hasta
  0 findings error + enterprise rubric PASS (desktop + mobile + teclado + reduced-motion), con
  fixes reales salidos del loop (región scrolleable accesible, overlap mobile, generate enriquecido).
- Rollout: gobernado por `HIRING_VACANCY_AI_ENABLED` (OFF; ledger de 1385). Dev local ON.

## 2026-07-16 — TASK-1385: redacción asistida por IA del copy público de vacantes (propose→confirm)

- La IA propone los campos `public_*` del aviso de una vacante desde inputs **allowlist-safe**
  (demanda + competencias del template de assessment + voz Efeonce es-CL); NUNCA ve presupuesto,
  tarifas, notas internas ni referencias de cliente (test negativo con sentinels). Propone COPY,
  no hechos: ubicación/modalidad/compensación jamás se inventan.
- El confirm humano aplica vía `updateHiringOpening` (writer canónico, ahora acepta client externo
  para atomicidad); el LLM no tiene write path al opening y el publish sigue siendo acción humana
  con su gate 422 (TASK-355/1371).
- Reusa el ledger auditado de TASK-1361 con kind nuevo `opening_public_copy` (dedupe por digest,
  state machine terminal-once). Capability nueva `hiring.opening.ai_assist` (propose, tier operador
  hiring); el confirm exige `hiring.opening.write`. API: `POST /api/hiring/openings/[id]/ai/propose-public-copy`.
- Prompt con checklist anti-sesgo de avisos (género/edad/proxies/solo job-related) + voz de marca
  (context pack 05/09); provider Anthropic `claude-sonnet-5` con adapter honest-degrade.
- Flag `HIRING_VACANCY_AI_ENABLED` default OFF (hermano deliberado del flag de assessment — no
  hereda su gate regulatorio), registrado en el ledger. Migración aplicada en dev; live E2E PG
  verde (propose no muta → confirm aplica → doble confirm idempotente → terminal-once 409).

## 2026-07-16 — HubSpot as a Service: skill gestionada, QA ANAM y discovery RevOps

- Se completó la triple documentación ANAM: canon técnico, overview funcional end-to-end y manual operativo.
  Se canonizó Data Quality como cola por owner/cadencia, con causas separadas entre schema/plataforma,
  fuente/migración, integración y captura/adopción; “disciplina comercial” exige evidencia y no autoriza inferir.
  Las skills Codex/Claude quedaron equivalentes con matching acotado, cobertura cross-object, snapshots
  inmutables, geografía multi-select no aditiva y moneda explícita. Excepción registrada: falta localizar/crear el
  source pack Markdown ANAM independiente antes del próximo cambio de knowledge de Customer Agent.
- Se reconcilió live el slice KPI de sector, mercado y región contra Notion, los adjuntos de María Paz/Pablo y
  el portal ANAM `19893546`. Tras aprobación explícita, se creó Company `segmento_de_mercado_anam` con label
  `Segmento de mercado` y 22 opciones. Un guard más fuerte de duplicidad del lado HubSpot dejó 471 Companies
  seguras: import `77871653` actualizó segmento+región en 471/471 e import `77871743` actualizó 65/65 sectores
  estratégicos directos, ambos con 0 errores, sin nuevos records, asociaciones, enriquecimiento ni merges.
- Se retuvieron 22 Companies bajo 11 claves normalizadas duplicadas, 3 casos ambiguos de fuente y 527 no
  emparejados. El readback completo verificó los 471 IDs y la evidencia previa quedó inmutable y separada del
  snapshot posterior para rollback. Las ventas por segmento/sector/región siguen sin ser KPI oficial porque la
  cobertura Deal→Company es sólo 629/1.240 (`50,73%`) y los TAM/SAM del workbook se contradicen.
- El dry run read-only de asociación Deal→Company encontró 34 candidatos high-confidence por cadena explícita
  Deal→Contact→Company, 113 candidatos de dominio para revisión manual y 498 held. Ninguno de los 34 apunta a
  las Companies duplicadas conocidas. Tras aprobación exacta, import `77872707` ejecutó esos 34 pares como
  Primary con 0 errores y 0 registros nuevos; el readback verificó 34/34, una Company por Deal y type ID `5`.
  HubSpot reportó 68 asociaciones direccionales para los 34 pares. Los 113 candidatos por dominio y 498 held
  quedaron intactos. El conector activo correspondía al portal `48713323` y se descartó antes de operar; toda la
  ejecución se guardó contra ANAM `19893546`.
- Se publicó y verificó en `Calidad de Datos Comercial` (`21144697`) el reporte reversible `DQ - Negocios sin
empresa asociada por responsable`, con baseline 645 Deals previo a la remediación. El schema, los dos backfills
  y el primer slice exacto de 34 asociaciones están cerrados; los KPI oficiales y cualquier remediación adicional
  de asociaciones/duplicados siguen approval-gated en
  `anam-sector-geography-kpi-slice-change-set-2026-07-16.md`.
- Con aprobación explícita se agregaron a Growth `19708354` tres diagnósticos históricos parciales: valor
  comercial ganado por segmento `340896790` (14 categorías, CLF 41.830,35), sector estratégico `340897291`
  (2 categorías, CLF 34.204,13) y región de sede `340897635` (12 regiones, CLF 41.830,35). Todos filtran
  `Ganado` exacto y dimensión Company conocida. No se modificaron records, schema, asociaciones, workflows ni
  reportes existentes. Son valor comercial cubierto, no facturación/revenue/penetración ni KPIs oficiales;
  el gate >=95% sigue incumplido con Deal→Company en 629/1.240.
- El relevo ANAM ahora exige comenzar con un readback live y read-only de reuniones/tareas en Notion y una matriz
  decisión/owner/fase/evidencia/gap/aprobación antes de nuevos writes. La síntesis local queda explícitamente como
  índice, no autorización. También se corrigió drift del roadmap: Fase 3 y Fase 5 tienen pilotos live con siete
  reportes, pero siguen no oficiales porque sus cinco Services usan activación sintética marcada pendiente de ANAM.
- Se crearon y verificaron los paneles cliente `ANAM — Retención (PILOTO)` (`21152855`) y `ANAM —
Fidelización (PILOTO)` (`21152950`). Retención contiene el Portafolio de cinco Services (`340874128`) y un
  radar de atención/renovación (`340874425`), más summaries de cohorte recurrente elegible (`340877391` = `2`)
  y ARR elegible (`340877588` = `22` UF). Fidelización contiene la cola de atención (`340874258`) y summaries
  de seguimiento (`340877942` = `2`) y retrasos (`340878184` = `1`). Los action reports aplican `delivery delayed
OR renewal upcoming` y muestran Härting + Hidrogistica. Los inputs de
  activación son sintéticos y están marcados en cada registro; `fields_ready` valida la fórmula, no aprobación
  cliente. No se declararon GRR/NRR, NPS ni health score; ese slice piloto no modificó Growth, aunque el slice
  diagnóstico posterior sí agregó los tres informes históricos parciales descritos arriba.
- Se probó automation v4 beta y el action nativo `Create record → Service`. La definición compila, pero un Deal
  workflow no puede garantizar el grain one-Service-per-line-item; queda descartado como materializer productivo.
  Tres probes runtime no enrolaron por API y limpiaron todos sus Deals/line items/workflows temporales.
- Se creó el workflow de revisión `1852406585`, limitado a los cinco pilotos, con una task de alta prioridad y
  cero emails/notificaciones/writes de propiedades. El API-only enable no fue evidencia suficiente; la QA posterior
  en editor autenticado validó Gasmar como positivo y Nestlé como negativo, activó sin enrolar existentes y ejecutó
  rollout manual 1+4. Las cinco ejecuciones completaron y crearon exactamente cinco tasks asociadas; re-enrollment
  sigue OFF. La creación forward requiere materializer/custom action Kortex idempotente por line item.
- Con aprobación separada se ejecutó el piloto controlado de cinco native Services en el portal ANAM: Gasmar,
  Hidrogistica, Härting, Golden Omega y McDonald's. Cada uno quedó en `New`, con Company única, Deal de origen,
  source line item, owner heredado, CLF/TCV/ARR preservados y readiness `incomplete_core`; por ello siguen fuera
  de KPIs oficiales. También quedaron live los pares `Negocio de origen/Servicio adjudicado`, `Negocio de
renovación/Servicio renovado` y `Renovado por/Renovación de`. No hubo workflows, backfill masivo ni reports.
- El readback documentó dos guardrails reutilizables: una etiqueta pareada debe verificarse en ambas direcciones
  y un search miss inmediato no prueba ausencia, porque el índice puede rezagarse mientras la unique constraint
  ya está activa. Ledger y rollback: `anam-phase-3-forward-pilot-execution-2026-07-16.md`.
- **Checkpoint de diseño previo al piloto (superado por las ejecuciones registradas arriba):** la Fase 3 quedó reconciliada para captura forward: Portafolio usa TCV por moneda original, Retention usa ARR
  sólo en cohorte recurrente/renovable revisada, billing cadence no se confunde con delivery cadence y un award
  propone Service `New` sin declarar activación. Backfill histórico continúa `NO-GO`; esquema y primer piloto
  de 3–5 line items requerían aprobaciones separadas. En ese corte no hubo writes; schema y piloto fueron
  posteriormente aprobados y ejecutados como documentan los bullets anteriores.
- Las skills espejo agregan una matriz de propiedades HubSpot que separa storage type, field type, mecanismo de
  población y gobierno, y decide entre native/custom/unique/calculation/rollup/sync/score/workflow/smart. Smart
  queda como evidencia AI con créditos y revisión humana, nunca como identidad, dinero, lifecycle o elegibilidad.
- El schema preview de Service incorpora una fórmula calculada de readiness con cuatro salidas accionables:
  core incompleto, revisión humana pendiente, ARR faltante para modelos recurrentes/mixtos y campos preparados.
  La fórmula no suplanta los gates de asociaciones; su aceptación por el parser requiere create/readback aprobado.
- Con autorización del operador se ejecutó el schema native Service en ANAM: grupo visible `Contrato y renovación
ANAM`, nueve propiedades escalares y una calculada. Readback de definición pasó; HubSpot normalizó orden y
  paréntesis sin cambiar semántica. Readiness propagó a `incomplete_core` sobre el sample sin tocar el registro.
  Cero records/workflows/associations/reports.
- **Dry run histórico previo a la ejecución posterior:** cinco adjudicaciones recientes de Companies distintas validaron la proyección de award
  (identidad, Company, Product/familia, owner, moneda, TCV y ARR) y bloqueó correctamente activación por ausencia
  de fechas, revenue model, renewal facts y delivery status. En ese corte no fueron creados; luego el lote exacto
  fue aprobado, creado y marcado como piloto sintético según la evidencia de ejecución anterior.
- Se incorpora un modelo de datos ANAM vivo con diagrama, grain y source-of-truth por objeto, matriz de
  asociaciones, proyecciones permitidas/prohibidas y sinergias comerciales, Service, Loyalty, Tickets y billing.
  El reconciliation fechado queda como evidencia con aviso de drift, evitando ejecutar propuestas superadas.
- Se registra `TASK-1423` y la spec `client-billing-intake-data-model-spec-v1.md` para la foundation tenant-scoped
  del workbook ANAM: modelo reusable `client_billing_*`, assets/scan compartidos, parser versionado y profiler
  no-write. Se fija la frontera correcta: ANAM es cliente y dueño de source/CRM data; Greenhouse sólo opera el
  control plane y no proyecta estas filas a su CRM, Finance, Income o Account 360. UI queda como `TASK-1424` futura.
- Se reemplaza SharePoint como dependencia preferida del intake mensual ANAM por una UI administrada: superficie
  autenticada en Greenhouse, upload firmado a GCS privado, validación/ledger en Cloud Run + Cloud SQL y aprobación
  explícita antes de sincronizar HubSpot mediante Kortex OAuth. SharePoint queda como adaptador opcional y Cloud Run
  - IAP como fallback de acceso. Arquitectura en `anam-managed-billing-intake-ui-2026-07-16.md`; no se provisionó
    infraestructura ni se realizaron writes HubSpot.

- Nace la skill espejo `.codex/.claude/skills/hubspot-as-a-service` como capa de delivery gestionado: intake,
  inventario, diseño RevOps, change sets, Customer Agent, conocimiento Markdown, landing/chat, QA, handoff,
  medición y reporting; mantiene fronteras explícitas con `hubspot-solutions-partner`, Kortex CMS y el bridge.
- Greenhouse suma y gobierna `docs/architecture/kortex/hubspot-as-a-service/` como canon visible del modelo
  operativo, el seam de la landing ANAM y el discovery combinado de seis hilos RevOps corporativos + tareas
  Notion. Las skills Codex/Claude y la evidencia cliente permanecen en Greenhouse; Kortex conserva sólo su
  implementación ejecutable y referencia este canon sin duplicarlo. No se ejecutaron properties, backfills,
  workflows ni otros writes CRM durante el discovery.
- Se corrige el estado operativo de la landing ANAM a build `#22` y tres intents. El informe cliente de QA queda
  versionado en `docs/audits/ANAM_CUSTOMER_AGENT_QA_REPORT_2026-07-16.md`, con conteo de escenarios/turnos,
  resultados y limitaciones nativas. ANAM confirmó Customer Agent y 30.000 créditos comprados; el aviso de un
  día correspondía al inicio del consumo pagado, no a expiración o desactivación.
- El readback de schema del portal `19893546` inventaría Deal/Company/Contact, asociaciones y pipelines accesibles,
  mide cobertura de propiedades clave y documenta drift de opciones, duplicidades y límites de scope sin ejecutar
  escrituras CRM.
- El inventario ampliado reconcilia native Lead (291), line items (506; 501 asociados a Deals), Quote (10), Service
  (1), Ticket (18), Invoice (0) y custom schemas (0). Los 10 Quotes no forman una base histórica: ninguno tiene line
  items, seis tienen monto cero y sólo dos están asociados al mismo Deal. Se documenta el contrato final en
  `anam-revops-schema-reconciliation-2026-07-16.md`.
- `anam-commercial-catalog-dry-run-2026-07-16.md` reduce los 506 line items a 20 nombres normalizados y propone un
  seed Product/Service gobernado; `M&A - Integral` concentra 331. El RUT duplicado de la propia Company ANAM se
  conserva sólo como anomalía observada y fuera de alcance; no se corregirá ni fusionará en este trabajo.
- Kortex despliega builds `#12/#13` para Product Library con `crm.objects.products.read` requerido y write
  condicional. En el corte inicial HubSpot rechaza tres consentimientos antes del callback; la instalación ANAM
  permanece activa con 109 scopes y Product API `403`, sin recurrir al scope obsoleto `e-commerce`.
- Developer Monitoring identifica la causa de esos tres grants: `Please provide a valid recaptcha value`. También
  se detecta drift en el control plane desplegado, cuyo authorization URL omitía Product read pese al build `#13`.
  Con autorización explícita, el operador completa un consent corregido: callback/activation success, 110 scopes,
  Product properties/search HTTP 200, 65 propiedades y 22 Products. No hubo Product writes, deploy ni rotación.
- Se versiona un change set approval-ready para Service: data dictionary, asociaciones de renovación/Deals y
  migración idempotente de Closed Won line items. Ningún schema/record write fue ejecutado.
- El dependency audit confirma que Workflows, Forms, Lists, Ticket v3 y reglas de pipeline requieren scopes de
  lectura adicionales. Se versiona un change set dividido: reconciliación reversible de dos propiedades pendiente
  de aprobación y cambios estructurales bloqueados hasta observar consumidores y cerrar decisiones de negocio.
- La revisión RevOps posterior pausa ese Slice A antes del cambio objetivo: `Down-sell` permanece oculto y
  `variacion_contrato` permanece intacto. El nuevo governance de propiedades clasifica Deal/Company/Contact en
  `KEEP / CHANGE / DEFER / RETIRE`, separa movimiento de ingreso de mecanismo de expansión y define como primer
  entregable analítico un dashboard de calidad de datos; GRR/NRR quedan bloqueados hasta contar con contratos,
  períodos, moneda y montos comparables.
- El portal autenticado confirma uso efectivo de `tipo_de_ingreso` en 9 recursos (4 informes, 2 workflows,
  formulario de creación, lógica condicional y property card); `variacion_contrato` y `tipo_de_servicio` no tienen
  consumidores declarados. Estos conteos reemplazan la incertidumbre API para esas propiedades, no autorizan retiros.
- Fase 1 RevOps queda cerrada con dos propiedades calculadas Deal API-managed y tres informes de outcome en
  `Dashboard de Crecimiento`: count por Ganado/Perdido/No adjudicado (`340844496`), valor actual por outcome
  (`340844919`) y tasa de adjudicación (`340845240`) con filtro obligatorio Ganado+Perdido. Readback al corte real:
  13 ganados, 0 perdidos, 1 no adjudicado y 100% sobre denominador 13.
- `Radar 0%` no fue corregido ni se movieron sus 10 Deals; la dimensión calculada los resuelve como `Abierto` y
  evita los flags nativos basados en probabilidad. No hubo record writes, backfill, cambios de pipeline ni cambios
  sobre las Companies ANAM duplicadas. Las skills espejo registran límites, propagación y semántica de fórmulas
  calculadas, además del cutoff exacto de `current quarter to date`.
- La lectura completa de reuniones de Maria Paz y José Pedro establece el modelo Contact -> Lead -> Company ->
  Deal -> Service, con Ticket como caso/SLA. El objeto estándar Service (`0-162`) ya está activo: 43 properties,
  dos custom sin cobertura, un registro de prueba y pipeline inglés sin reglas. Se documenta la síntesis en
  `anam-revops-meeting-synthesis-2026-07-16.md`; el próximo cambio estructural exige data dictionary y dry-run.
- Con autorización explícita se ejecuta Slice A por UI autenticada: `Down-sell` queda visible sin cambiar orden ni
  internal value; `variacion_contrato` pasa a `Variación vs. cotizado`, descripción de adjudicación y labels
  `Igual/Mayor/Menor`, preservando `Mismo valor/Mayor valor/Menor valor`. Readback API confirma 1.240 Deals y la
  misma distribución 446/141/87/234/0, con variación en 0; no se tocaron records, workflows, requiredness ni pipelines.
- **Corrección inmediata:** el operador aclara que Down-sell fue retirado porque no es tipo de ingreso. Se revierte
  su visibilidad; readback final `tipo_de_ingreso.updatedAt=2026-07-16T09:13:40.908Z`, `Down-sell.hidden=true`,
  sin cambios de records, valores internos u orden. `Variación vs. cotizado` permanece aplicada. El canon
  `anam-commercial-first-operating-model-2026-07-16.md` fija la doctrina: contracción/Down-sell es movimiento de
  Retención sobre Services comparables; implementación comercial primero y Operaciones después.
- La skill espejo incorpora `references/report-design.md` como contrato obligatorio de diseño y QA de informes:
  pregunta, periodo, denominador, matriz de visualizaciones, capas del dashboard y readback. Codex y Claude pasan
  validación y permanecen idénticos.
- `Dashboard de Crecimiento` suma siete informes verificados para el cohort Growth de Q3: dos KPI, dos donuts,
  columnas por línea, tabla exacta y pivot responsable x línea. Los activos reconcilian 29 Deals y CLF 2.443,89;
  no se alteraron informes legacy ni registros CRM. Tendencias, funnel y gauges se aplazan hasta que sus contratos
  de serie temporal, estado Radar y denominador dinámico sean válidos.
- Los 12 adjuntos no-agent de ANAM quedan clasificados sin modificar los originales: dos candidatos de migración
  aún `NO-GO`, tres insumos de configuración, cinco referencias y dos exclusiones. La vista Finder usa enlaces y
  el dictamen documenta granularidad, destino HubSpot, calidad y gates. Las skills espejo incorporan la regla de
  no confundir adjunto útil, registro importable, insumo de configuración y evidencia administrativa.
- La reconciliación cruzada de `Segmentación clientes` y `Ticket facturación` reemplaza la hipótesis de Código
  ANAM único en Company por un custom object propuesto `Cuenta/Unidad ANAM`: 2.882 códigos fuente, 772 compartidos
  con billing y 7.971 eventos cubiertos. Billing Event enlaza por código exacto a la Unidad y sólo después a Company
  revisada; 106 códigos con múltiples RUT quedan en cuarentena. ADR/schema preview se mantienen `Proposed`.
- Se define el operating model mensual: file drop SharePoint full-snapshot como MVP, target Graph/List incremental,
  raw y run ledger inmutables, staging/crosswalk/exceptions, batch upsert/readback HubSpot y métricas por grano y
  moneda. El ETL es un servicio de integración y no crea Services por fila; promedio de factura agrega primero
  eventos por invoice+currency y la mediana acompaña al mean por outliers severos.

## 2026-07-16 — Tender Proposal Studio: motor de chapter-authors servicio-agnóstico (TASK-1415)

- El Studio ahora puede AUTORAR la lámina de diagnóstico (antes se escribía a mano en el `deck-plan.json`): nuevo
  motor `src/lib/commercial/tenders/proposals/authoring/**` — interface `ChapterAuthor` servicio-agnóstica en el
  molde propose→confirm (el LLM sólo enmarca; las cifras y `evidenceRef` se inyectan desde hechos derivados
  determinísticamente; una cifra o URL huérfana rechaza la propuesta completa; confirm exige actor member).
- Primera implementación completa: **diagnóstico (SEO/AEO)** — mapper `Grader → hechos` que reusa el mapeo canónico
  dim→peldaño del Report Artifact, verificado contra el run real `EO-GRUN-00046` (reproduce el golden SKY
  40/70/37/8/76 exacto). Segundo author (`credenciales`, otro servicio) prueba que el motor no está AEO-fitted.
- Eval baseline determinista en CI (golden frozen = láminas SKY autoradas a mano) + corrida REAL end-to-end en
  local: propose (claude-sonnet-5) → confirm → `composeArtifact` renderizó las 2 láminas (PNG+PDF, 0 warnings).
- Flag `TENDER_CHAPTER_AUTHOR_ENABLED` default OFF (registrado en el ledger); capability reusa
  `commercial.proposal.manage`. Orquestador y verifier de §5-ter siguen pendientes (tasks hermanas).

## 2026-07-16 — HubSpot Solutions Partner: narrativa Agentic Customer Platform sincronizada

- Las skills de Codex y Claude incorporan la lectura ejecutiva 2026 de HubSpot: Growth Context, workspaces,
  agentes/MCP/Agent CLI, motion comercial por outcomes y cinco wedges de prospección para Efeonce.
- El motion de prospección queda definido como Champion-led: entrada por el dueño operativo uno o dos niveles
  bajo C-Level, escalamiento al sponsor económico, multithreading de 3–5 roles y gate de sponsor antes de propuesta.
  La distribución 70/20/10 es una hipótesis inicial de Efeonce sujeta a métricas, no un benchmark de HubSpot.
- Outbound/ABM incorpora enriquecimiento obligatorio de tres pasadas: HubSpot aporta historial y campos raw;
  el sitio oficial confirma identidad/contexto; Internet público corrobora mercados y triggers. `country` vacío
  o discrepante ya no excluye una cuenta, y sede, mercados operativos, evidencia y confianza se separan.
- El ledger de fuentes queda verificado al 2026-07-16 e incorpora State of Ecosystems, incentivos H2 2026,
  Marketing Studio, Sales Workspace, Customer Success Workspace y límites explícitos de las betas.

## 2026-07-16 — ANAM: botones enrutan chatflows por `anam_intent` y logo ajustado

- La landing ANAM queda en Developer Project build `#22`: cada botón de categoría actualiza la URL con `anam_intent` (`cotizar`, `seguimiento_servicio`, `requerimiento_calidad`) y ejecuta `HubSpotConversations.widget.refresh({ openToNewThread: true })` antes de abrir el chat.
- El CTA general limpia `anam_intent` y abre el chat sin forzar branch. El logo se redujo/subió para dejarlo separado de la línea inferior del header en desktop y mobile.
- Pendiente operativo fuera del Developer Project: configurar en HubSpot Chatflows las target rules/branches para consumir esos query params; el composer no se prellena en esta configuración porque el iframe actual descarta `setInputText`.
