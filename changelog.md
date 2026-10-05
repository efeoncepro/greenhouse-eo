# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-10-05 — TASK-2007: primitivas de producto AXIS (local)

Select/Combobox con opciones enriquecidas y grupos, recuperación remota y reset cancelable; feedback, disclosure, dialog y complementary con foco diferenciado; selección múltiple, tabs/paginación, fechas/rango y archivo nativos. Catálogo distingue releases observadas de exports locales. Composición `/references/product/`, pruebas y coste de bundle documentados en el repo AXIS. Sin publicar ni migrar consumidores. [Task](docs/tasks/in-progress/TASK-2007-axis-product-primitives.md).


## 2026-10-05 — TASK-2002: calendario de activaciones v3 en producción (sólo lectura)

- Studio `main` `d0ec7e0`: `studio.efeonce.org/calendar` sigue la dirección v3 aprobada en Mes, Semana, Día, Línea de tiempo, Paid, Hoja, Popover del día, estados, filtros móvil y preview por formato, con barra inferior propia de evidencia de ejecución. Diálogos de escritura (planificar, editar, reprogramar, cancelar, vincular, crear desde ejecución) verificados en local; en producción no se montan hasta que exista login (TASK-1898). [Task](docs/tasks/in-progress/TASK-2002-marketing-studio-activations-calendar-ui.md).

## 2026-10-05 — TASK-2001: lectores de hojas email y landing

- Local: API 1.9.0 amplía ActivationDto con email literal/límites/audiencias/métricas y web con destinos/Growth Forms validado. UI intacta, null ausente, sin series ni SQL entre productos. Postgres/check/build/CLI PASS; rollout pendiente. [Contrato y evidencia](docs/audits/marketing-studio/TASK-2001-activation-reader-sheets-2026-10-05.md).

## 2026-10-04 — TASK-2002/2004: calendario de activaciones (lectura) e isotipos de plataforma en AXIS

- Studio (local): el calendario pasa a ser de activaciones — vistas Mes, Semana, Día, Línea de tiempo y Pauta, filtros por dimensión en la URL, hoja con evidencia y tracking URL, bandeja «Ejecución sin activación», móvil y teclado. Las escrituras se muestran bloqueadas con su razón hasta que exista autoridad de escritura.
- AXIS: `@efeoncepro/axis-brand-assets` 0.4.20 publica negativos de Instagram, LinkedIn, Meta, ChatGPT, TikTok y Threads, isotipos de Facebook y Threads y los logos de herramientas; `axis-tokens` 0.5.1.

## 2026-10-04 — TASK-2001: conexiones owned locales

- Resend/HubSpot con puerto Greenhouse autorizado por binding y evidencia completa/parcial; WordPress público paginado y cacheado. Marketing Cloud separado sin lector. API 1.8.0/catálogo aditivo, 288+7 Studio con PG, build y CLI/GVC básico PASS; navegación móvil en QA. Sin push ni rollout nuevo. [Evidencia](docs/audits/marketing-studio/TASK-2001-owned-connections-2026-10-04.md).

## 2026-10-04 — TASK-2001: rollout de activaciones de Studio

- Studio `aa6fa07` desplegado, API 1.7.0; cinco migraciones staging/prod, seis planes CL con evidencia legacy y eventos persona. Descubrimiento real62/replay0 cambios, scheduler OIDC, CLI y44 thumbs PASS. Email multiproveedor, owned y MCP delegado pendientes. [Evidencia](docs/audits/marketing-studio/TASK-2001-release-2026-10-04.md).

## 2026-10-04 — TASK-1899 retirada por el operador

- Implementación local de escritura MCP revertida en Greenhouse y Studio; sin cambios de runtime desplegados. Se retira como requisito previo al desarrollo de Studio; futura federación pendiente de nueva decisión.

## 2026-10-04 — AXIS: recursos, agentes, tipografía y botones

- [Entradas especializadas y Growth Forms](docs/audits/2026-10-04-axis-specialized-inputs.md): AXIS `a0c6130`/`6fff346` subido; teléfono/correo/URL/documentos/decimales, 245 países con búsqueda y filas alineadas. Adapter Greenhouse opt-in y skills Codex/Claude sincronizadas. Primitives 0.5.0 pendiente de publicación; sin cambio de pins ni activación en hosts.

- Colores y ramps de La órbita, siete compactos y diez familias de formularios distribuidos desde AXIS; foco continuo, iconos de apoyo y selectores enriquecidos. Docs y skills Codex/Claude sincronizados con tres subagentes. [Estado de publicación, instalación y límites](docs/audits/2026-10-04-axis-forms-release.md). Adopción y pins consumidores separados.

- Familia portable de botones: contexto heredado, radio/toolbar, menús controlados y top layer modal; 52 recorridos en cuatro perfiles y 32 referencias visuales. Lab desplegado; VoiceOver/NVDA manual y zoom nativo pendientes. La adopción mantiene sus pins. [Release y evidencia](docs/audits/2026-10-04-axis-buttons-release.md).

- Iconos AEO/SEO/Autoridad, logos propios y terceros, búsqueda, navegación, capacidades para agentes y Bricolage editorial centralizados en AXIS. `aee99d2` pushed y Lab desplegado; `graphic-line@0.17.0` publicado, nueva API `/logos` pendiente de release. Docs y skills Codex/Claude reconciliados sin cambiar pins consumidores. [Cierre, evidencias y alcance](docs/audits/2026-10-04-axis-documentation-closure.md).

## 2026-10-04 — Marketing Studio: catálogo en producción y CLI HTTP local

- Delta TASK-2001: email con Resend (volumen principal), HubSpot, Marketing Cloud Engagement y Next; contrato común, adapters separados y evidencia/completitud por envío. Registrado en task/ADR/plan; implementación pendiente, el QA anterior no certifica esta ampliación.

- Studio separa plan y ejecución: ocho estados, cuentas/mercado/hora local, versiones exactas, tracking congelada, calendario/avisos/eventos, blog por CMS cliente y draft Notion sólo como referencia. Backfill preserva posts y exige revisión personal. API/MCP parity y CLI HTTP verificados con PostgreSQL real; flags OFF, sin push. [QA, commits y pendientes de runtime](docs/audits/marketing-studio/TASK-2001-local-verification.md).

- Cierre documental con tres subagentes: arquitectura/operación/skills y routers reconciliados; estado local/desplegado separado, MCP futuro no bloquea API/CLI/UI. [Mapa completo y gates](docs/audits/marketing-studio/2026-10-04-session-documentation-closure.md).

- CLI HTTP local `pnpm studio`: descubrimiento de 59 operaciones de negocio, cargas verificadas, dryRun/If-Match/idempotencia y credenciales privadas. [Manual](docs/manual-de-uso/marketing-studio/operar-por-cli-api.md) · [QA](docs/audits/marketing-studio/2026-10-04-studio-api-cli.md).

- TASK-1905: catálogo versionado, 52 canales, validación transaccional, backfill revisable, audiencias/ICP y API 1.6.0/59 tools desplegados en Studio (`74073de`). [Release y límites](docs/audits/marketing-studio/TASK-1905-release-2026-10-04.md); backfill humano, ICP y federación pendientes.

- [TASK-1998](docs/tasks/complete/TASK-1998-marketing-studio-video-playback-rendition.md): derivado `playback` (MP4 H.264, lado corto ≤ 720 px, faststart) en el worker con backfill por el barrido (6/6 videos de producción), `302` a URL firmada V4 (GCS atiende `Range`; ningún video pasa por Vercel), `Asset.playback`, API 1.5.0.
- [TASK-1999](docs/tasks/complete/TASK-1999-marketing-studio-video-player-ui.md): reproductor nativo en el panel de la pieza (feed y story, sin autoplay); el tablero muestra todas las piezas de un formato (la versión con intro para Instagram era invisible) y la duración.

## 2026-10-04 — Build de fuentes independiente de Google Fonts

- ISSUE-178: Geist/Poppins y Bricolage del login pasan a `next/font/local`, WOFF2 con origen/licencia/hash fijados. El build comprueba los archivos y bloquea la reintroducción de loaders remotos; roles y variables CSS preservados. Build completo, 90 tests y GVC en tres tamaños PASS; staging READY y fuentes/login/sesión verificados; producción sin promover.

## 2026-10-04 — AI Visibility Report: hero, ancho y hover

- Hero con demostración interactiva y pausa directa; shell/escena acotados en pantallas amplias. Think `6aab907`/`56a300a` publicados y verificados en producción a 1710/2560 px. Hover primario azul profundo `06449ca` validado y comprometido sólo local, pendiente de push.
- [TASK-1966 y evidencia](docs/tasks/complete/TASK-1966-ai-visibility-report-landing-la-orbita.md): docs funcionales, motion, wireframe y skill espejo alineados. Contrato Marca primero sin activar; producción conserva Entrega primero. Sin envío real ni cambios de backend/PDF.

## 2026-10-04 — Discovery de población cliente SEO

- TASK-1690: [discovery](docs/audits/seo/2026-10-04-task-1690-discovery.md) de contratos, fixtures y UX con tres subagentes; decisión GSC clics/CTR y rank independiente, cobertura/null/cero y cola canónica documentados. Estado `Diseno`; selección visual e implementación pendientes. Baseline: 53 tests PASS. Sin código ni cambios runtime.

## 2026-10-04 — Ownership editorial y de informes SEO

- El flujo editorial pertenece a Marketing Studio: TASK-1667/1669 → EPIC-049; TASK-1668 conserva medición/outcomes en EPIC-022. La auditoría técnica y su distribución especializada pertenecen a Insights: TASK-1672/1673 → EPIC-045, reusando renderer y transporte existentes.
- [Mapa vigente y tareas pendientes](docs/audits/seo/2026-10-04-epic-022-ownership-and-remaining-work.md), arquitectura, criterios e índices reconciliados. GA4 TASK-1284 y referrals TASK-1787 distinguen código/evidencia histórica existente de sus pendientes reales. TASK-1284 pasa a in-progress con evidencia fechada y pendientes explícitos. Sin código, tareas nuevas, cierre de implementación ni cambio de runtime.

## 2026-10-04 — SEO: reconciliación documental de EPIC-022

- Censo de 84 hijas (43 complete, 3 en curso, 38 to-do), estados TASK-1655/1670/1671/1672/1805 e índices conciliados. Flag de hallazgos y selectores Improved ETV revalidados en worker activo; pendientes conductuales conservados.
- [Evidencia y límites](docs/audits/seo/2026-10-04-epic-022-documentation-reconciliation.md). Sin cierres de tasks, cambio de configuración, calls pagadas, backfill ni emisión de informes.

## 2026-10-04 — Spot «Los Sparks»: Studio, Metricool y naming «Efeonce | AEO»

- Spot cargado en Marketing Studio como CMP001-08 de CMP-001 (orgánico) y programado en Metricool: IG lun 05-oct 14:00 (portada 4:5), LinkedIn jue 08-oct 11:00; media re-alojada con SHA-256 idéntico.
- Operador: la marca es Efeonce y el servicio «Efeonce | AEO» (con barra). Regla en el [ADR de naming](docs/architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md), skills de copy/AEO/social y `docs/context/`; recetas de Studio y Metricool documentadas.

## 2026-10-04 — Insights: reconciliación de estado y revisión de cierre

- EPIC-045 sincronizado a `in-progress`; 24 hijas (7 complete, 6 en curso, 11 to-do). Contratos TASK-1957/1962 desplegados, modelo vigente 1.4 y ocho flags Production exactos ON. Índices, arquitectura y skill espejo actualizados; historial conservado.
- [Auditoría](docs/audits/insights/2026-10-04-epic-045-closure-review.md): 116 pruebas PASS; sin planes post-release en la lectura acotada. TASK-1962 candidata a cierre tras verificación productiva; las seis hijas en curso conservan sus pendientes. Sin cierres de tasks, cambios runtime ni envíos.

## 2026-10-03 — Efeonce Insights: figuras nuevas en producción y cierre de TASK-1974

- Release `36a73e7b7e19`: el planificador elige la figura por la pregunta; PDF y deck tienen página de cifras, cascada,
  waffle, dona y barras apiladas; tarjeta con isotipo del canal; Think `0c5701a`; AXIS `v0.3.42`.
- Verificación con GA4 real de Berel: apiladas y dona correctas. Dos correcciones: una parte que redondea a 0 % se lee
  «<1 %» y la cifra queda unida a «%»/«pp» con espacio duro en los slots del PDF y el deck. El blanco del disco de canal
  pasa al rol `channelDisc`. TASK-1974 complete; TASK-1975 espera la revisión del operador.

## 2026-10-03 — AI Visibility Report PDF: refresh local

- TASK-1938: mismo motor y snapshot; seis páginas Engine con órbita, logos oficiales y cierres de cliente/prospecto, en ES/EN/PT-BR. Texto largo conserva contenido con continuación; fuentes registradas de forma aditiva. Las RRSS oficiales se muestran completas a su escala y el eslogan mantiene sus tres pesos.
- [Dossier](docs/ui/reviews/TASK-1938-ai-visibility-report-pdf-la-orbita/README.md): diez PDFs auditados, 24 comparaciones color/gris, 108 pruebas focales, TypeScript y build PASS. Fallo de metadata Manzanitas corregido en un commit separado; siete tests y sincronización PASS. Code complete local; rollout, revisión del adjunto real y paridad web/print pendientes. Sin push ni envío real.

## 2026-10-03 — Elenco 2D de Efeonce canonizado

- [Canon](docs/operations/brand-characters/EFEONCE_2D_CAST_V1.md): Tomás, Camila, Renata y Mateo, ficticios y
  dibujados, representan al grupo de compra del cliente y supervisan a los Sparks; estilo «vector con volumen» con
  sello Efeonce (línea de luz azul + objeto azul).
- Hojas de giro y expresiones en `ai-generations/_identidad-elenco-2d/`, selladas en el lock (catálogo `ELENCO_2D`,
  rol `ilustracion-2d`, 560 assets) y publicadas en el canon. GPT Image 2.5 Sunburst, ≈ USD 0,78.
- Primer uso: spot animado Sparks × Efeonce AEO aprobado (49,6 s). Método transversal de video y workflow del spot 2D
  documentados: [método](docs/operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md),
  [retrospectiva](docs/operations/social/2026-10-03-sparks-aeo-spot-animado-production-method.md),
  [funcional](docs/documentation/creative/spot-animado-2d.md), [manual](docs/manual-de-uso/creative/producir-spot-animado.md);
  `motion-design-studio`, `audio-studio`, guía de modelos, SPARKS_V1 e identidad sonora al día.

## 2026-10-03 — Video con IA: taxonomía, producto e interfaces y pipelines por plan (EPIC-051)

- [Taxonomía de video](docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md) por fase, tipo, look,
  dificultad y fidelidad, neutral de motor y con «propio primero, proveedor como puente»; [anexo de producto e
  interfaces con personas](docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCT_AND_INTERFACE_V1.md); matriz operación × motor
  y presupuestos por toma en la guía (§4.3, §7.4).
- [ADR-025 aceptada](docs/architecture/creative-studio/EFEONCE_VIDEO_PRODUCTION_PIPELINE_ARCHITECTURE_V1.md): plan
  declarativo por toma, ejecutores y compuertas; ningún video generativo con referencias sin aprobar.
- EPIC-051 con TASK-1979…1989 (runner TASK-1989); capas funcional y manual; sin runtime ni gasto.

## 2026-10-03 — Decisiones de marca convertidas en capacidad de ejecución escalable

- [Dirección estratégica aceptada](docs/architecture/EFEONCE_BRAND_DECISIONS_SCALABLE_EXECUTION_DECISION_V1.md): hacer operables, automatizables y escalables
  decisiones creativas para acelerar salida al mercado preservando calidad, consistencia e identidad; recorrido
  completo o tramo delimitado. Visión, modelo corporativo, oferta, método y skills/routing enlazados; validación
  económica/comercial permanece por oferta. Cambio documental local, sin alterar runtime ni publicar.

## 2026-10-03 — Elenco de marca, vistas puestas elegidas por el comando y Nexa con expresiones reales

- Elenco ficticio en `ELENCO` (Hum, Karo, Sophia, Isabella, Antonio) con su biblia; grupos de 3 a 5 entre elenco, Nexa
  y Julio (sin elenco obligatorio). Julio: 37 con canas prematuras en su bloque.
- `foto:prompt` elige la vista puesta por silueta, giro (45°/70°, frente y espalda), cámara baja y oclusión, e imprime
  las alternativas; 126 vistas puestas nuevas en bomber, softshell, polo, hoodie y gorra; el macro viaja con la prenda.
- `foto:isotipo` compone por detrás de los oclusores, con pliegues y escorzo; `canon-sync` baja del canon GCP lo
  sellado que falta o está viejo; `pnpm foto:rostro` mide la proporción del rostro.
- Nexa: la expresión va detrás del ancla frontal (la pose sale de la escena), ancla v2 con la proporción del canon y 25
  expresiones casi de frente aprobadas. Exploración archivada (> 1,3 GB liberados).

## 2026-10-03 — Técnicas de edición sobre el pipeline de inpainting (TASK-1973)

- Nuevo `pnpm ai:layers` (Seedream Layerize sobre cualquier imagen: capas con nombre, máscara por elemento y clean plate
  = base + las demás capas; la base se cobra como una capa) y `pnpm ai:inpaint erase|move|place|background|expand` +
  `--zone-resolution`. `place` incorpora un elemento de una foto en otra y el modelo sólo hace el acabado.
- Canario real (≈ USD 0,90): la sombra proyectada se mide contra el plate y nunca se toma la de un vecino; borrar con
  el plate y Sunburst por instrucción borran limpio (Flare con máscara y Flux Fill dibujaron otra taza; el residuo se mide contra el fondo);
  `expand` usa Flux Fill por defecto (Flare reencuadra, Sunburst copia el relleno en espejo). Herramienta out-of-band.
- Slice 2 (`foto:expandir` sobre el núcleo) pasa a TASK-1925; BFL FLUX Tools (Outpainting, Erase) queda como follow-up.

## 2026-10-02 — Login V4 premium y novedades del login (TASK-1963, TASK-1964)

- Novedades del login gobernadas: tabla `greenhouse_core.login_announcements` (migración aplicada en la instancia
  compartida), reader `listActiveLoginAnnouncements` (hasta 3 publicadas y vigentes por prioridad), `GET
  /api/public/login-announcements` y API admin con `login_announcements.manage`. Vigentes: Engine, Brand y Growth.
- `/login` pasa al V4 premium en develop/staging: formulario sobre papel con Efeonce como marca principal, escenario con
  fotos producidas, lente reconstruida al canon de AXIS y anclada al sujeto, voz con anillo y esfera, transición «La
  lente te lleva adentro» y mejoras de contraste en avisos y alertas. No está en producción; `pnpm test` completo pendiente.
- Canon de foto y skills: la referencia de cara del equipo pasa al avatar con la bomber; personajes de casting con retrato ancla (piel v3) antes de la escena; casebook cine (fallas 14–20, `LG1`/`LG2e` como recetas), registro cine (excepción del login), guía de modelos, regla `brand-photography` y `efeonce-graphic-line` (lecciones, ledger, aplicación §A12) actualizados.
- Docs: [funcional](docs/documentation/identity/novedades-del-login.md) y [manual](docs/manual-de-uso/identity/administrar-novedades-del-login.md).

## 2026-10-02 — Inpainting de imagen y video en los CLIs (TASK-1965)

- Nuevos `pnpm ai:mask` (máscara canónica con fuentes, operaciones y guardas de cobertura) y `pnpm ai:inpaint image|video`:
  recorte con contexto, generación por adaptador (OpenAI, `fal:flux-pro-fill`, Seedream edit; video `fal:flux3-edit`),
  recomposición obligatoria y verificación del archivo en delta máximo 0, dry-run, caché por hash y manifiesto.
- Medido: Sunburst con máscara devuelve un panel negro plano (3 de 3) → default Flare con máscara y Sunburst sin máscara
  con corrección de color en anillo; modo boceto y referencias (como el Markup de ChatGPT). `ai:image --mask` avisa que
  no recompone. Canario en `ai-generations/2026-10-02_task-1965-canary/`. Herramienta out-of-band: no toca runtime.
- Cerrada el 2026-10-03: en producción con el release `fe261ca27`; siguiente paso, TASK-1973 (expandir, capas, borrar, fondo y detalle).

## 2026-10-02 — Marketing Studio: commands del catálogo verificados en staging (TASK-1894, Entregable B)

- Studio suma escrituras gobernadas del catálogo: máquinas de estado (revisión, creativo, medios, lanzamiento),
  campaña, brief literal, conceptos, piezas, derechos, copy byte a byte, anuncios, flight, líneas de presupuesto
  (sólo `proposed`; aprobar crea la `approved`) y posts planificados (Studio nunca publica). Las aprobaciones son T2:
  sólo una persona por la CLI `pnpm studio:write … --apply --confirm`; por API, 403 `confirmation_required` hasta
  TASK-1899.
- Autoridad por campaña (`source_of_truth`): escribir en una campaña de OneDrive responde 409
  `campaign_not_studio_owned`; el importador salta las campañas `studio`. API 1.4.0, 44 tools, permisos proyectados y
  `ETag`. Migración `1790967435017` aplicada en staging y producción (aditiva); sandbox `CMP-900` en staging.
- **No está en producción:** Studio `a8c7886` sin empujar a `main`; Greenhouse `9d0d698d4` (capabilities
  `marketing_studio.asset.write` y `.campaign.write`) sólo en `develop`; gateway con filtro de sólo lecturas preparado
  sin sincronizar. Entregable C diferido.

## 2026-10-02 — CMP-004 completa: 44 piezas aprobadas, horizontales 1,91:1 y grilla de Studio corregida

- Las 11 horizontales 1,91:1 (LinkedIn 1200×628 y Meta horizontal) se hacen desde la escena 1:1 aprobada:
  `pnpm foto:expandir` gana `--lienzo`, `--ancla`, `--fundido` y `--reponer no` (`2ff39fe96`); la escena va a la
  derecha al 80 % del alto y el modelo extiende sólo la columna de texto. Concepto reducido aprobado por el operador:
  la bajada va en el titular del anuncio (CDR-012, `ec9e8a00d`). `foto:cta:gate --reproducir` exit 0 en las 11.
- Entregadas en canvas, OneDrive Finales (`CONTROL-DE-PIEZAS` 44 filas), Marketing Studio y AXIS Lab (`25f1b40`).
  En Studio se subieron con `--ratio 191x100` (la API exige `^\d+x\d+$`) y se aprobaron: 44 piezas, 0 pendientes.
- La grilla de piezas de Studio tenía columnas fijas y escondía las 1,91:1 cargadas y aprobadas; ahora muestra las
  proporciones presentes en la campaña y rotula `191x100` como «1,91:1» (Studio `23e5787`, verificado en el navegador).
  Commits de este repo sin push.

## 2026-10-02 — Marketing Studio: puerta de ingreso de originales en producción (TASK-1894, Entregable A)

- Studio 1.3.0 recibe finales por una sola puerta: `studio.asset.upload.request` (URL firmada V4 directo al bucket)
  y `studio.asset.version.create` (confirmación; el worker recalcula sha256, tamaño, tipo y proporción antes de crear
  la versión en `pending_review`). Kernel de commands con autoridad, `riskTier`, idempotencia y `dryRun`; CLI
  `pnpm studio:upload` (cliente de API `studio:assets:write`) y CLI de operador `pnpm studio:review`.
- Migración `1790956839977_asset-ingest-door` aplicada en staging y producción; `STUDIO_UPLOADS_ENABLED` y
  `MEDIA_WORKER_UPLOAD_VERIFY_ENABLED` ON. 33 piezas de CMP-004 cargadas en producción, pendientes de revisión.
  Capability en Greenhouse y sync del gateway quedan pendientes.
  [Task](docs/tasks/in-progress/TASK-1894-marketing-studio-write-commands-authority-cutover.md).

## 2026-10-02 — Kortex profundamente hibernado y forecast GCP reconciliado

- Kortex queda reversible y sin compute productivo: Vercel pausado, Cloud Run internal/IAM/min0, Cloud Tasks
  pausado/vacío y SQL `STOPPED/NEVER`. Septiembre registró CLP 10.480,64 netos; el residual ~CLP 3.500/mes y el
  forecast consolidado CLP 237.068,14/mes (rango 230k–245k) siguen modelados hasta contar con ventanas completas
  post-corte. [Estado, método y evidencia](docs/audits/cloud-cost/CLOUD_COST_AND_KORTEX_HIBERNATION_2026-10-02.md).

## 2026-10-02 — CMP-004 reorientada por servicios y voz con el acento de la línea (CDR-012)

CMP-004 pasa de cuatro conceptos a un ad por servicio de Creative Services (S01–S08). Los ocho pilotos 4:5 se regeneraron con geometría nativa de ad (banda oscura continua arriba, objeto negro mate al pie para la firma) y pasan `foto:cta:gate --reproducir`. El compositor de CTA suma `graphicLine`: el anillo y la esfera de la voz toman el acento de la línea desde AXIS (sin el campo, growth, idéntico a antes; regresión 183/184 iguales, mutante `voz-acento-de-linea`). El CTA queda en contorno naranja tras comparar 40 composiciones.

## 2026-10-02 — Registro cine: siete decisiones del operador, segunda prueba ciega y barra de luz recalibrada (TASK-1926)

El operador aceptó siete decisiones (aros de Nexa dorados, destacado «Agents» intacto, escala vertical por encuadre, mirada al panel en la sección partida, vestuario por persona real o por rol, luces prácticas como bokeh frío en cine, una sección partida por deck vía el validador del plan); `foto:prompt` aplica en cine las tres de toma. Segunda prueba ciega: tres sesiones nuevas llegaron solas usando `cine-reviewer`. Un experimento de luz mostró que las fotos aprobadas también llevan luz suave de frente: la barra del revisor quedó calibrada contra el plate de la receta. Además: hoodie royal en cine, restos documentales fuera, `__revisar` en `foto:cine:nueva` y revisor más barato. Demás registros sin cambio.

## 2026-10-02 — El registro cine se opera sin consultor (TASK-1926, delta b)

Ninguna sesión llegaba sola a una foto cine aprobable. La ficha cine gana cinco campos propios (`llave`, `primerPlano`, `fondo`, `fenomeno`, `alcance`) que `foto:prompt` compila y avisa cuando faltan; `pnpm foto:cine:nueva` parte de una de las diez fotos aprobadas (`scripts/foto/cine-recetas.json`) y `foto:generar` no gasta con la escena de la receta; `pnpm foto:validar:cine` mide sombra y reserva vertical (calibrado: stickers, relleno y azul rey bajo luz azul no se separan en píxeles y los revisa el agente `cine-reviewer`); casebook, manual y punteros en canon, regla y skills. Los demás registros no cambian: `scripts/foto/regresion-prompt.mjs` compara todas las fichas en disco (0 no cine cambiadas). AXIS: sección «Registro cine» en el banco fotográfico (commit local).

## 2026-10-02 — Traje biónico de Nexa: kit, catálogo y escena cine con Sparks (TASK-1940)

El traje de ficción de Nexa deja de describirse a mano: kit de 10 vistas desde `NX5b` (aisladas, puestas en Nexa A, macro de la placa y lentes biónicos), entradas `traje-bionico-nexa` y `lentes-bionicos-nexa` en `foto:prompt` con la guarda `validarTrajeNexa` (sólo Nexa, sólo `"registro": "cine"`), marcas armadas en la referencia (isotipo incrustado en el pecho y logo completo serigrafiado en la espalda, con `foto:isotipo --marca logotipo`) y la escena aprobada `NX7d`, canonizada en el registro cine 1.7.

## 2026-10-01 — Sparks: los agentes de Efeonce como personajes del kit (TASK-1941)

Diseño elegido por el operador (el Spark de «Agents» alejado de Astro Bot: flota, chispa del Nexa Mark, órbita y tres ventanas de la nave). Spark base en 26 vistas + 4 escenas con Nexa, plantel de cinco con accesorio y gesto, entradas `spark-*` en `foto:prompt` con la guarda `validarRobots` (robots sólo como Sparks; nunca documental) y canon [`SPARKS_V1.md`](docs/operations/brand-characters/SPARKS_V1.md) con revisión de colisión del nombre. Kits en OneDrive `13- Branding/Sparks/`. Plantel aprobado; task cerrada.

## 2026-10-01 — La órbita: perfiles sociales de Efeonce aprobados y documentados

Portadas de LinkedIn (página y perfil personal), Facebook y YouTube, avatar de redes y nueve destacados de Instagram con su historia completa 9:16, aprobados por el operador; kit del equipo con «Tu portada de LinkedIn» y aviso 1:1. [Línea gráfica §10.1.1](docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#1011-perfiles-sociales-de-efeonce-aprobados-el-2026-10-01) · [manual de uso](docs/manual-de-uso/creative/usar-portadas-y-destacados-sociales-efeonce.md). Publicación en las redes pendiente.

## 2026-10-01 — Workbench: producción modular y Lab premium integral documentados

PR15 integra producción modular SKY e identidad Git; PR16/17 integran el Lab premium completo, superficies equilibradas, coreografía de scroll y menús de familias/tokens con teclado y fallback nativo. Snapshot v6 publicado inicialmente protegido; [acceso sin login autorizado y verificado](docs/operations/creative-production/WORKBENCH_LAB_ACCESS_STATE.md) para compartir el Lab. Skills espejo, [continuidad vigente](docs/operations/creative-production/WORKBENCH_CURRENT_STATE.md), funcional y manuales enlazan contratos/evidencia del repo Workbench. Base documental PR246 integrada en develop; contratos 0.2, Metric/onboarding/IA y Efeonce ID conservan sus pendientes independientes. Este cierre documental no cambia runtime ni CLIs de Greenhouse.

Colección candidata de 101 familias / 1.919 variantes nativas y 303 originales, selección exacta por kind/tamaño y página `/iconos/` enlazada desde Recursos. Código/docs Workbench en commit local `af6f5e2`; skills Codex/Claude y manuales/continuidad sincronizados. [Cierre y evidencia](docs/audits/creative-workbench/2026-10-01-sky-icons-documentation-closure.md). Sin push/deploy ni admisión nueva a jobs; CLIs Greenhouse intactas.

Corrección SKY local: contenido 1.5.0/destino 1.2.0, los 76 badges tarifarios LEFT, pie legal por función y relaciones de destino/promoción revisadas. Export v6 de 24 adaptaciones y 394 pruebas PASS; docs y ocho referencias de la skill sincronizadas con subagentes. [Cierre documental](docs/audits/creative-workbench/2026-10-01-sky-layout-feedback-closure.md). Aceptación visual pendiente; sin push/deploy ni cambios de motores Greenhouse.

## 2026-09-30 — Efeonce: demostración contextual como diferenciador comercial

El operador reconoce «hacer que el cliente experimente nuestra capacidad antes de comprarla» como diferenciador. [Metodología](docs/commercial/EFEONCE_VENTA_CON_DEMOSTRACION_CONTEXTUAL_V1.md) documenta Berel, SKY y Pichincha; canon de marca y estrategia, skills Agency/Brand/SEO con espejos y referencias actualizados. Intensidad, presupuestos y métricas siguen propuestas; no se promete conversión ni se cambia el pipeline.

## 2026-09-30 — AEO X-Ray: demo multipieza aceptada, publicada y documentada

- Think conserva y extiende el X-Ray original: landing y artículo por manifiesto, cuatro etapas, radiografía acoplada, oportunidad evidenciada, banners y derivados sociales/video, marcas oficiales, footer, iconografía, transiciones nativas, selector y telón de 1400 ms. Fix productivo de unidades CSS optimizadas `s`/`ms`; 44 checks de apertura pasaron también en producción.
- Think `be8d484`, deployment `dpl_7AEWYHEiiWWUyCiwrcTj1US1e3vB` READY con alias; entrega comercial autónoma `sample_` aceptada. Foundation Greenhouse/contrato AXIS preparados y probados; migración/grant/runtime compartido pendientes, sin promoción Greenhouse. [Dossier](docs/think/aeo-xray-implementation-dossier-2026-09-30.md), triple documentación, kit multicliente y skills espejo actualizados.
- HubSpot: deal 65352884246 → Presentación de soluciones por instrucción y readback; brochure alojado en HubSpot, correo previo a reunión redactado con enlaces X-Ray e Insights. Envío del correo no verificado.

## 2026-09-30 — Deck SEO/AEO (Search Visibility 360) aprobado y en el catálogo de recetas (TASK-1949)

- El operador aprobó el deck SEO/AEO de «La órbita» en tres documentos (completo 33, brochure 24, propuesta 29; cinco capítulos, línea Engine). Catálogo `efeonce.deck-slide-recipes.v1` a 100 recetas: seis nuevas sin plantilla todavía (`content-brand-family`, `content-service-mockups`, `content-report-formats`, `content-committee-deck`, `content-industries`, `content-markets`), `productMark` opcional (lockups de submarca), eyebrow de `proposal-cinematic-seo`/`-aeo` con `requiredUnless: productMark`, `section-cine-team.body` opcional y 27 usos aprobados; tres planes golden validados e intents de documento de ejemplo.
- Reglas: anotaciones fuera del deck, una sola sección partida, casos con imagen de ambiente puesta en escena y el logo del cliente compuesto, logos de clientes con autorización. Por decisión del operador, las cifras de los casos, su fuente, los formatos de Insights, las industrias y la cifra de Bresler quedan tal cual, sin marca de «provisional» («asumo la responsabilidad»). Norma §4.6, catálogo, manual, doc funcional, arquitectura y skills al día. Plantillas del Composer (Slice 2) y AXIS (Slice 3) en curso.

## 2026-09-30 — Keywords relevantes por URL en DataForSEO CLI 1.1.0 (TASK-1948)

- `site-keywords` y `quick keywords-for-site` aceptan dominio, subdominio o URL con tipo explícito. Conservan path/query y entregan relevancia con categorías, tendencias y métricas Ads en JSON/CSV; no declaran rankings. Paginación acotada, entitlement SEO, techo progresivo y checkpoint bloquean recompra silenciosa tras fallo o costo desconocido.
- [Manual](docs/manual-de-uso/growth/dataforseo-cli.md) y [auditoría](docs/audits/seo/2026-09-30-task-1948-site-keywords-cli-verification.md): 96 tests verdes, dry-runs y SemVer verificados; typecheck sin WIP ajeno pasa, global conserva 17 errores en deck HubSpot. Implementación local sin POST pagado, commit/push ni deploy.
- Validación posterior autorizada en Berel **MX**: 20 keywords en dos páginas, JSON/CSV coincidentes, scope `matched` y resume de ambas páginas sin recompra; USD 0,0284 reconciliados. Manual/ADR y skills DataForSEO, SEO/AEO y Berel incorporan selección editorial del ruido, mercado explícito y límites de `total_count` y atribución de dominios. La captura CL anterior queda separada del resultado mexicano aplicable al cliente.

## 2026-09-30 — Creative Workbench: rutas nativas selladas y `creative:status` por REST

- Delta documental posterior: skill `efeonce-creative-workbench` completa y espejada Codex/Claude,
  ADR de aislamiento, planes y evidencia SKY, TASK-1945/1946/1947 y TASK-1952 (Efeonce ID diferido).
  Routers y [continuidad fechada](.codex/skills/efeonce-creative-workbench/references/state-continuity.md)
  apuntan al harness activo en Workbench. Lotes PR 11 y contornos PR 12 integrados allí; referencias
  corregidas con `--native-previews`, corridas antiguas requieren una ejecución nueva. Sólo docs en
  Greenhouse: sin engines, auth nueva, sync total, broker deploy ni IA habilitada.
- `export-manifest.json` gana `native.paths` (harness propio del workbench) y `native.reserved` (gates, workflow
  `gates`, `CODEOWNERS`, `.workbench/**`). Lo nativo sale del plan; el sync lo **entrega** (lo suelta del sello sin
  borrarlo), sella la lista en `sync.lock.json → native` y aborta si una ruta del plan ya existe en el workbench sin
  estar sellada. Si `pnpm-lock.yaml` es nativo, no se regenera.
- El gate `managed-drift` de la plantilla lee `native` **sólo del sello**: `.workbench/native-ownership.json` (PR #3 del
  workbench, de Codex) deja de eximir. `creative:status` usa sólo REST, verifica la integridad del sello recalculando el
  plan de su commit, marca PRs que tocan lo gestionado y lista dependencias que faltan en el `package.json` nativo.
- Gate nuevo `native-policy` (reglas selladas para lo nativo): prueba el guardarraíl con sondas, exige denegaciones y
  hook en `settings.json` y rechaza código fuera del broker que llame a un proveedor de IA. Sobre el estado del PR #3
  sólo marca `tools/provider-doctor.ts` (llama a OpenAI directo con la llave de Secret Manager).
- Tras una revisión adversarial con subagentes (y una segunda revisión con acceso a GCP) se endureció todo: `native-policy`
  detecta además imports que llegan a los engines históricos, `import 'openai'`, `*_API_KEY`, `gcloud secrets` y Secret
  Manager; el guard corre al final y en una copia con sondas
  aleatorias, se detectan SDKs e imports del adaptador del broker, `disableAllHooks`, sellos sin commit, PRs que
  cambian el sello sin ser sync (CI compara contra la base) y rutas nativas no canónicas.
- Nota «En el Workbench»: el sync la inserta al inicio del `SKILL.md` de las 12 skills que mencionan `foto:*`, `ai:*`
  o `assets:pull`, con sus equivalencias en el harness (`marca:*`); la fuente de la skill no cambia (ADR §8.7).
- `creative:sync` y `creative:status` trabajan en un clon temporal del workbench: el checkout local (donde trabajan
  la persona o Codex) no se toca; `--in-place` es opt-in y se niega si no está limpio, en `main` y al día (§8.8).
- `control.json → clientesPorDefecto: "todos"`: por decisión del operador, todo el equipo produce para todas las
  marcas (ADR §8.6).
- Cierre de la revisión (tercera pasada): el guardarraíl debe bloquear también el push a `main` escondido (`/usr/bin/git`,
  `sh -c`, `$(…)`, `+main`, `xargs`, `remote.origin.push`, `--mirror`) y, en la plantilla, cualquier push estando en
  `main`; `native-policy` sigue imports con backticks y marca un archivo que nombra la ruta de un engine que llega al
  proveedor (se ejecuta sin import). `clients/brands.json` queda nativo con riesgo residual documentado (§8.5). Sobre el
  head `289a12e` del PR #3 la política nueva no da falsos positivos y sólo marca las seis formas de push que su guard
  todavía deja pasar: el sync de transición espera a que el PR #3 las porte.
- 37 pruebas del plano de control; sync simulado sobre `main` y sobre el PR #3: 11 rutas entregadas sin borrar y tests
  del harness de Codex iguales antes y después. Decisión: §8 de
  [EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md](docs/architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md).

## 2026-09-29 — Glitch y Marketing con Manzanitas estables como sub-líneas de La órbita (AXIS `v0.3.37`)

- El operador aprobó Manzanitas para usar y fijó su lugar: «no sustituye a la orbita es una sublinea dentro del design
  system de la orbita igual que glitch». Con su autorización, AXIS `v0.3.37` pasa `glitchLine` y `manzanitasRegister` a
  `canonical` y los contratos `efeonce.glitch-line` 0.2.0 y `efeonce.manzanitas-register` 0.3.0 a `stable`, sin cambio de
  valores ni render. Greenhouse fija `axis-tokens` y `axis-ui-contracts` 0.3.37 y regenera los tokens compilados; los
  catálogos del Artifact Composer siguen `candidate` hasta la ruta productiva (TASK-1921).

## 2026-09-29 — HubSpot Agent CLI y MCP como carriles de operación directa

- Agent CLI 0.15.0 instalada y OAuth de Efeonce/Kortex `48713323` verificado con una lectura CRM real. El conector MCP y la CLI se eligen por portal, capability y forma del trabajo; comparten change set, aprobación y readback, no credenciales. Límites OAuth y comandos sin `--dry-run` registrados en el [runbook](docs/operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md); skills Codex/Claude sincronizadas.

## 2026-09-29 — `foto:isotipo --acabado`: el modelo termina el isotipo compuesto

- `pnpm foto:isotipo … --acabado [--superficie "…"] [--lado px]` aplica la regla del operador del 2026-09-28: recorta
  512 px alrededor de la marca, pide a `gpt-image-2.5-sunburst` (high, 1024×1024) sólo materia y luz y devuelve la
  edición sólo sobre la silueta del isotipo, con el color corregido por el desplazamiento de la media. Escribe
  `<plate>-isotipo-acabado.png`, el recorte, la edición, la hoja antes/después al 300 % y la procedencia (modelo,
  prompt, hashes, conteos) en el `.json` de `foto:isotipo`.
- Falla si cambia un píxel fuera de la marca (silueta + 8 px) y deja el resultado como `.rechazado.png`; exige el
  archivo de la edición porque `ai:image` sale con 0 aunque falle. La silueta se mide contra la placa ya limpia: con la
  limpieza encendida, la zona limpiada no recibe la luz del modelo. `--out` sin `.png` ahora se rechaza (el `.json`
  pisaba la imagen).
- Reinyectando la edición original, reproduce byte a byte las salidas de `MC1h` y `MC4g`. 10 pruebas nuevas con
  `ai:image` simulado; las mutaciones halo, sin corrección de color y silueta contra el original las rompen. La regla
  de fotografía y las skills `greenhouse-ai-image-generator` y `design-studio` apuntan al comando.

## 2026-09-29 — Deck Salesforce aprobado completo; insignia «Salesforce Partner» autorizada y por defecto (TASK-1942)

- El operador aprobó todo el deck y declaró la insignia «Salesforce Partner» autorizada por Salesforce: va por defecto
  en la portada y en la contraportada de propuesta (intents de ejemplo y planes golden con
  `partnerMark.readbackRef: salesforce-partner-authorization-2026-09-29`); «Operamos sobre» queda de respaldo y el
  composer sigue fallando cerrado para otros partners (test con HubSpot).
- SF20 aprobada como cierre del brochure, con intent de ejemplo (0 px contra la lámina aprobada); máximos de
  `proposal-cinematic-revops.question` (30) y del nombre de paso de `proposal-service-revops` (28) subidos sin cambio de
  render (gate `graphic-line` a 0 px); costo de color de los íconos de producto aprobado.
- Registro de partnerships, oferta Salesforce (§Claims), norma §4.6, manual, doc funcional, arquitectura y skills al día.
  AXIS `axis-brand-assets` con el estado nuevo, preparado sin publicar (las referencias del Lab exigen tokens 0.3.36).
- Cierre de TASK-1942: AXIS `v0.3.36` (`302f7f7`) publicado y fijado en Greenhouse; develop `814255694` con CI 9/9 en verde; `pnpm test` completo y `pnpm build` de producción en verde; PDF de propuesta y de brochure con insignia.

## 2026-09-29 — Deck de práctica Salesforce componible y documentado (TASK-1942)

- Las 16 recetas del deck de práctica Salesforce tienen plantilla (familia `line-stage`): 94 de 94 recetas del
  catálogo componen con `pnpm brand:compose` sobre AXIS 0.3.33 y `axis-brand-assets` 0.4.4; baseline `graphic-line`
  sellado (sección (s), 89 frames a 0 px).
- Marcas de terceros desde `AXIS_PARTNER_ASSETS` con procedencia y estado de autorización; la insignia de partner es un
  claim (`partnerMark` falla cerrado sin `readbackRef`); mascota y co-marcas exigen `authorizationRef`.
- `reservesByLine` (columna 190 sólo en la portada Salesforce) y `sloganBlock` (eslogan en bloque, logo 700 px sólo
  en la contraportada Salesforce). PDF de la propuesta sin insignia (`render-src/pdf-propuesta.mjs`).
- Barrido de skills (`efeonce-graphic-line`, `deck-studio`, Salesforce ×3, `hubspot-solutions-partner`,
  `axis-design-system`) y de las tres capas de docs. Rollout pendiente: test/build de cierre, visto bueno de SF20,
  autorizaciones escritas y readback de la insignia.

## 2026-09-29 — Creative Workbench: repo del equipo creativo gobernado desde Greenhouse

- Nuevo repo privado `efeoncepro/creative-workbench` para el equipo creativo (Claude y Codex; clientes Efeonce, Berel
  y SKY). Recibe por `pnpm creative:sync` 17 skills espejadas, los CLIs `foto:*`/`ai:*` (cierre de imports calculado
  con esbuild, falla si alcanza dominios prohibidos), docs de marca por allowlist y brand packs; todo sellado por
  sha256 con gate `managed-drift` y hook `PreToolUse` de Claude.
- El sync exporta un **ref de git**, nunca el working tree (el bootstrap arrastró trabajo sin commitear de otra
  sesión; corregido el mismo día).
- Acceso declarativo en `scripts/creative-workbench/control.json` (`creative:access`); infraestructura idempotente en
  un proyecto GCP propio con llaves de IA dedicadas (`creative:provision`, aún sin aplicar).
- ADR [EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md](docs/architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md).
- TASK-1945/1946: preflight neutral con snapshots por corrida (14 pruebas Node y 13 Vitest); tres paquetes
  SKY `0.1.0` candidatos con 108 tokens, logo sellado y contrato Always On (4 pruebas, build determinista).
  ZIP Metric del operador verificado: 14 OTF fuera de repos; metadata portable sin fuentes binarias.
  Sin publicación, sync o deploy; wrappers IA e identidad autenticada siguen pendientes.

## 2026-09-29 — Efeonce AI Visibility Report canonizado en AXIS (TASK-1938)

- AXIS `v0.3.30` (`26097c5`, registro verificado): `axis-tokens` 0.3.30 (`aiVisibilityReport` y
  `efeonceGraphicLine.measureSeverity`, color de gravedad sólo para un puntaje con escala publicada),
  `axis-ui-contracts` 0.3.30 (contrato `efeonce.ai-visibility-report` 0.1.0 `candidate`; `efeonce.graphic-line-orbit`
  0.4.0), `axis-graphic-line` 0.12.0 (`/report`), `axis-brand-assets` 0.4.3 y `axis-ui-registry` 0.3.2. Lab
  `/references/ai-visibility-report/`.
- Greenhouse sigue en 0.3.29 y el renderer del PDF no cambió; TASK-1938, la dirección, el wireframe, el manual de La
  órbita (1.19) y el runbook de AXIS apuntan al canon nuevo.

## 2026-09-29 — Naming canónico de Efeonce AEO

- [ADR](docs/architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md): **Efeonce AEO** (capacidad), **Efeonce AEO Assessment** (diagnóstico público) y **Efeonce AI Visibility Report** (salida); aliases Grader preservados para trazabilidad y contratos. Se actualizaron docs y skills; el runtime visible requiere migración y verificación propias.

## 2026-09-29 — Avatares oficiales y firmas del equipo

- Seis avatares nuevos (bomber sobre polo piqué, fondo oscuro con el halo de la órbita) en GCP `team/avatars/v1/`, en el Kit media de OneDrive y en el repo (800 px: `squad/` y `public/images/greenhouse/team/`).
- Firmas v3.1 para el equipo con esos avatares (`build-firmas.mjs`), fotos publicadas en `email-signature/v3.1/people/` y paquetes en `Kit media/Firmas/`.
- Luis sale del roster de fotos y del dashboard de Efeonce; nombres, cargos y avatar de Julio corregidos ahí. Referencias de identidad en `ai-generations/_identidad-equipo/`.
- El avatar de la firma pasa a 130 px (la marca de área, a 106 px), a la altura del bloque de texto de al lado: AXIS `axis-tokens` y `axis-ui-contracts` 0.3.35 (tag `v0.3.35`), fijados en Greenhouse. Las 9 firmas, sus páginas y los zip de OneDrive quedaron regenerados; en pantallas angostas el correo se parte antes de la «@».
- Nueve fondos de Teams aprobados en la oficina moderna de Efeonce (formato `teams` y logo 3D de letrero/escritorio en el catálogo de `foto:prompt`); la página del kit de cada persona suma los fondos. Portadas de redes: exploración parqueada.
- Página «Tu avatar nuevo» por persona (`…/team/kit/<nombre-apellido>.html`, descarga en un clic y dónde cambiar la foto) y del equipo; avatar y zip de firma en la carpeta de cada persona del Kit media; aviso por TeamBot 1:1 y en EO Team.

## 2026-09-29 — Manzanitas sin decisiones abiertas: AXIS v0.3.29 y el equipo real en las fotos

- AXIS `v0.3.29` (`f722a6f`): `axis-tokens` 0.3.29 (`closeCopy`, `teamPeople`, `slogan.widthEmByWord`, órbita del paso;
  sin `sloganPx`), `axis-ui-contracts` 0.3.29 (contrato 0.3.0: `close-copy-too-long`, `chart-labels-invalid`, eslogan desde
  el logo en el manifiesto), `axis-graphic-line` 0.11.0 (Trazo `republicar` y `enviar`, 88 glifos; `/charts` lee los rótulos
  del dato). Lab con la contraportada nueva y sin decisiones abiertas.
- Greenhouse (`2c95e60b2`): pins, tokens recompilados sin drift, gate a 0 px; el catálogo lee eslogan y órbita del token.
- Roster del equipo en la fotografía de marca y seis identidades nuevas en `foto:prompt`, aprobadas por el operador.
- El vestuario del equipo lo decide la línea de la pieza (hoodie en Servicios creativos; bomber o softshell en las líneas
  de negocio): `foto:prompt` lo exige con `linea` en la ficha, y el polo debajo de la chaqueta ya no cuenta como mezcla de registros.

## 2026-09-29 — Marketing con Manzanitas en el Artifact Composer (TASK-1939)

- `1050036e8`: catálogos `manzanitas-carousel` (PDF) y `manzanitas-stills` (PNG), 18 plantillas para las 26 piezas
  aprobadas; `pnpm manzanitas:tokens [--check]` (49 salidas desde `manzanitasRegister`) y `pnpm manzanitas:compose`
  (intent del contrato `efeonce.manzanitas-register` 0.2.0 → PDF, PNG y procedencia sin reloj). Gráficos pintados con
  `manzanitasChartSvg` y sus chequeos; Lente y órbita del paso con `axis-graphic-line`.
- Fallan cerradas (el motor mide el recorte): respuesta en una línea y sin pisar «Desliza»; pregunta en una línea donde
  hay contenido fijo bajo la voz. Eslogan de los cierres debajo del logo al 64 % de su ancho (regla del 2026-09-29).
- Gate visual `--catalog=manzanitas`: 18 frames congelados. Carruseles aprobados por el operador; TASK-1939 cerrada el
  2026-09-29 con `pnpm test` completo y `pnpm build` en verde sobre `814255694`.

## 2026-09-28 — Marketing con Manzanitas publicado en AXIS (TASK-1936)

- AXIS `v0.3.26` (`aca07c2`): `axis-tokens` 0.3.26 exporta `manzanitasRegister` (registro que complementa La órbita,
  hereda por referencia, aislado de Glitch); `axis-ui-contracts` 0.3.24 exporta `efeonce.manzanitas-register` 0.1.0
  (`pnpm manzanitas:resolve`, 45 códigos, `pending-decision`); `axis-graphic-line` 0.10.0 agrega `/charts` (9 gráficos
  calculados desde el dato); `axis-brand-assets` 0.4.1 sella `AXIS_MANZANITAS_ASSETS`. Lab `/references/manzanitas/`.
- AXIS `v0.3.27` (`6a1a912`): contrato 0.1.1, el carrusel empieza con su portada y termina con su contraportada.
- Greenhouse: ADR, norma §14, doc funcional, manual y skills (`efeonce-graphic-line`, `axis-design-system`, espejo
  `.codex/`) al día. Greenhouse no fija estas versiones todavía.

## 2026-09-28 — Glitch: pendientes del Flash cerrados (ruta productiva, muletilla, licencia, numeración, Content Factory)

- TASK-1921 (`c43862008`): `planBrandRender` despacha con `planGlitchManifest`; el Flash sale por la ruta productiva
  (carrusel de 3 láminas + sueltas; nunca overlays) con `BRAND_RENDER_ENABLED`, sin cambio de schema ni worker.
- Composer (`05e75f0ed`): `video.closingLine` → slot `closingLine` de los overlays CTA; `license.kind: press` sólo en
  el Flash con aprobación por pieza (`approvers.json`) y `licenseExceptions` en la procedencia; `pnpm glitch:editions`
  y `glitch:compose --check-published` leen el blog: la próxima semanal es la **#18**. Gate visual sección (q).
- Content Factory (`c6f076e9f`): `kind: glitchDrop` (serialización idéntica a WordPress), `buttons`, `embed.caption`,
  `table.style: stripes`; fix del write path con `wp_slash()`.
- AXIS 0.3.25 (estela por contexto + decisiones resueltas) y motion del Flash en el taller: commits locales, sin
  publicar.

## 2026-09-28 — Glitch Flash en AXIS v0.3.24 y en el Artifact Composer

- AXIS tag `v0.3.24` (`5b3056f`): `glitchLine.editions` (semanal | Flash) y contrato `efeonce.glitch-line` 0.2.0
  (Flash sin número ni avance; 0.1.0 resuelve igual). Lab con la sección «El Glitch Flash».
- Greenhouse fija `axis-tokens` 0.3.24 / `axis-ui-contracts` 0.3.22 (`53002b352`). El CI de ese commit falló en
  `graphic-line-tokens-sync.test.ts`: el bump exige `pnpm brand:tokens` además de `pnpm glitch:tokens` (arreglo
  `609353e83`). Lección registrada en las skills `axis-design-system` y `efeonce-graphic-line` y en el runbook.
- Artifact Composer (`24e4c72ee`): `GlitchFlashManifest`, seis plantillas `flash-*`, estela de bytes determinista,
  `pnpm glitch:compose` despacha semanal/Flash; chip «PORTADA» → «LA NOTICIA» en las portadas semanales; gate
  visual Glitch 32/32 a 0 px (BASELINE_DELTAS (p)).
- Docs y skills al día (graphic-line, axis-design-system, motion, contenido, deck, advertising, AGENTS.md) y
  deltas en TASK-1921/1922/1923/1924/1337/1441–1444/1448. Pendiente: la ruta productiva (TASK-1921) no conoce el
  Flash; tres medidas de la estela sin token; numeración #17 abierta.

## 2026-09-28 — Primer Glitch lanzado con la nueva línea: Glitch Flash · Claude Sonnet 5.5

- Glitch tiene dos formatos: edición semanal (lunes, numerada) y **Glitch Flash** (noticia puntual, sin número;
  cabecera «NO ESPERA AL LUNES» + estela de bytes + «FLASH»; chip «LA NOTICIA»; sin avance n/8; muletilla Guttery
  variable por edición). Registrado en la skill `efeonce-graphic-line` (glitch.md §14), la norma v1.13 y el ADR.
- Lanzado de punta a punta: canvas de diseño, LinkedIn página y personal, Instagram y Threads vía Metricool, y post
  del blog 251941 (`/glitch/glitch-flash-claude-sonnet-5-5/`) con callout `efeoncepro/glitch-drop` y banners propios.
  Bitácora: `docs/operations/social/2026-09-28-glitch-flash-sonnet-55-production-method.md`.
- Skills `social-media-studio` y `efeonce-public-site-wordpress` actualizadas (receta de 4 redes, reemplazo en su
  lugar en Metricool, inventario live de bloques Gutenberg y brecha de Content Factory, receta del Glitch Drop).
- AXIS: rama local `feat/glitch-flash` (token `glitchLine.editions`, contrato `efeonce.glitch-line` 0.2.0, Lab) con
  gates verdes; sin push ni release (pendiente de autorización del operador).
- Abierto: numeración de ediciones (el blog ya publicó «#16» y «#17»), plantillas Flash en el Composer, chip
  «LA NOTICIA» en las plantillas `CoverPhoto`/`BlogBannerPhoto`/`BlogSquarePhoto`, licencia de imágenes de terceros.

## 2026-09-28 — Informe live de Efeonce Insights en Think y muestra pública para clientes (TASK-1875)

- `think.efeoncepro.com/insights/r/<token>` está en producción (Think `bbf8522`): el informe compartido de Insights
  en dirección «tablero de respuestas» (portada con la respuesta y una órbita, hallazgos que se abren como evidencia,
  escenas narradas, las 15 familias de gráfico, plan, modo presentación, impresión de respaldo, es-CL/en-US).
- Muestra pública para clientes en `think.efeoncepro.com/insights/muestra`: mismo render con datos de ejemplo y una
  marca ficticia, aviso visible, sin descargas ni llamadas a Greenhouse, `noindex`.
- Greenhouse (staging): `InsightWebModelV1` 1.1 aditivo (editorial v2, tasas del embudo, logo del cliente por
  `/api/public/insights/shared/[token]/logo`) y excepción del guard del borde para Think por `x-efeonce-think-key`.
- Verificado: canary sintético en staging (200 con cabeceras, PDF por el proxy, 410 tras revocar, 404 desconocido);
  contraste AA y teclado en 1440/390. Producción de Greenhouse y `INSIGHTS_SHARING_ENABLED` siguen pendientes del
  operador.

## 2026-09-28 — Rutas públicas: guard en el Firewall de Vercel y conexiones de Vercel acotadas (TASK-1876, staging verificado)

- Reglas versionadas del Firewall de Vercel para `/api/public/**` (20 req/10 s por IP; enforce en staging/preview,
  observe en producción) en `src/lib/security/public-burst-guard/firewall-rules.ts`, sync con `pnpm security:public-burst-guard`.
- Las sesiones PostgreSQL de Vercel piden `idle_session_timeout=60s`; el rol `greenhouse_app` conserva 5 min por
  los workers. La señal de saturación lee el pico de 24 h de `num_backends` de Cloud SQL. Staging verificado con ráfaga controlada (`pnpm security:public-burst-guard:verify`); alerta
  `num_backends > 85` activa. Producción en `observe` hasta el cutover (ISSUE-174 mitigado).

## 2026-09-28 — Los slots de datos del deck «La órbita» se ligan desde Greenhouse (TASK-1930, parcial)

- `bindDeckSlots(plan, context)` (`src/lib/brand-surfaces/deck-recipes/bindings/`) llena logo del cliente (Account
  360, variante oscura), cifras con evidencia `measured`, casos, testimonios y logos de terceros sólo con evidencia
  `attested` y documento, y las láminas de muestra SEO/AEO; deja rastro por slot y falla cerrado. Montos siguen en
  `[MONTO]` y equipo sin ligar hasta TASK-1417/TASK-1418. CLI: `pnpm brand:deck-plan -- --bind`.
- `validateDeckPlan` acepta una lista de cifras en un slot `metric` (antes rechazaba las cuatro de `decision-case.stats`).

## 2026-09-28 — El `--freeze` del composer sólo acepta la sección nueva sin sellar del ledger

- Antes buscaba el nombre del frame en todo `BASELINE_DELTAS.md`, así que una declaración vieja de otra task lo
  autorizaba para siempre (TASK-1928 re-promovió 10 frames sin declararlos). Ahora exige una sola sección `## ` sin el
  marcador `sealed-by-freeze`, acepta sólo los frames que ella nombra, falla cerrado listando los demás y la sella al
  promover. Regla en `scripts/artifact-composer/baseline-deltas-ledger.ts` (+ test);
  [runbook §5](docs/operations/runbooks/composer-visual-gate.md). Las 44 secciones previas quedan `legacy-2026-09-28`.

## 2026-09-28 — Las nueve láminas SEO/AEO del deck «La órbita» componen (TASK-1934)

- El catálogo de recetas pasa de 69 a 78, todas con plantilla en `graphic-line-deck` sobre AXIS `axis-tokens` 0.3.23 /
  `axis-ui-contracts` 0.3.21 (releases aditivos `v0.3.22` y `v0.3.23`). Siete plantillas nuevas y dos propuestas SEO sobre
  plantillas existentes; gate de La órbita en 73 frames a 0 px, aprobados a ojo por el operador.
- `validateDeckPlan`: `variant-both-in-deck` reemplaza a `variant-adjacent` (dos variantes nunca en el mismo deck),
  `figure-source-missing` nuevo y `next-steps-after-diagnosis` por familia. Cifras con fuente, datos de muestra marcados e
  interfaz de IA genérica quedan cubiertos por tests.
- La portada «Tu squad.» tiene plate propio (CR4) y un brochure de Creative Services ya no repite plate; la plantilla
  cine recupera la nota «Sin promesas de ranking».

## 2026-09-28 — DataForSEO tiene CLI diaria y catálogo oficial reproducible (TASK-1935)

- La CLI llega a `1.0.0` con SemVer propio, historial append-only, digest de fuentes gobernadas, `version` visible
  y un bump automatizado. `local:check` bloquea mejoras sin versión y registro; los recibos JSON llevan
  `cliVersion`. [Contrato técnico](docs/architecture/GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md).
- `serp-compare` compara cualquier marca o entidad mediante aliases y múltiples dominios sobre una sola captura
  por query/dispositivo. Exporta raw + JSON/CSV y separa orgánico, mención, enlace AI, cita AI y Shopping opcional;
  explicita depth y frescura sin fabricar posiciones. `quick organic` ya transmite target/depth/AI Overview.
- Organic Live Advanced se serializa a una task por request. El artefacto agrega diagnóstico por request, omite
  filas de tasks fallidas y separa carga AI solicitada de frescura realmente devuelta. El canary desktop/mobile
  completó dos tasks `20000` por USD 0,0055 reales frente a USD 0,016 estimados.

- Delta: `pnpm dataforseo -- research` encadena minería Labs, gobernanza explícita de finalistas, enriquecimiento
  SERP Standard y una matriz JSON/CSV con intención, cobertura, competidores, features, PAA, citas y procedencia.
  Pagina y reanuda por checkpoint sin recomprar pasos; `keyword_ideas` y AI Overview quedan opt-in.

- `pnpm dataforseo -- ai-research` ejecuta paneles versionados para Responses, Scraper, AI Keyword Data y Mentions,
  separa API de consumer surface y normaliza citas, fan-out, entidades, modelos, costo y evidencia.

- TASK-1651-A amplía el allowlist gobernado a `ai_optimization`: 53 rutas de LLM Responses, LLM Scraper,
  AI Keyword Data y LLM Mentions quedan operables desde la CLI. GET de modelos/catálogos/polling es gratuito
  y no exige organización; todo POST real exige organización, entitlement, estimación, ceiling y ledger AEO.
  El CHECK quedó aplicado y validado. Un canary API con techo USD 0,012 costó USD 0,0101 y dejó una llamada
  `consumer=aeo` en el ledger; repetirlo con `--resume` tuvo costo incremental cero y no elevó `call_count`.

- `pnpm dataforseo` descubre 545 endpoints oficiales y separa los 320 ejecutables bajo el allowlist vigente de los
  que sólo se pueden consultar en catálogo. Incluye presets diarios, payload por archivo/JSON/stdin, lifecycle async,
  preview por defecto, techo de costo, salida machine-readable y el transporte canónico para GET/POST.
- Un registro generado documenta las 225 rutas `catalog_only` sin habilitarlas: 216 rutas de producto con propósito
  eventual y gate por familia, más 9 rutas de infraestructura/plantillas que no son capabilities. Prioriza Content
  Analysis para brand monitoring y Business Data acotada para SEO local/reputación; Keywords Data queda condicional
  y Merchant/App Data esperan un caso real.
- Smokes reales: catálogo AI Mode gratuito (USD 0), AI Mode Perú con `location_code=2604` (USD 0,004) y Organic Chile
  (USD 0,002), todos con task `20000`; `serp-compare` reutilizó cada captura para dos entidades y completó el panel
  desktop/mobile por USD 0,0055, manteniendo separados orgánico, mención, enlace, cita y frescura. Commit local;
  sin push, deploy ni cambio de flags.
- La [auditoría transversal](docs/audits/seo/2026-09-28-dataforseo-cli-production-validation.md) consolida además
  las pruebas de Falabella, Paris, `agencia seo en chile`, `agencia creativa en chile` y el research productivo de
  servicios creativos. Registra task IDs, USD 0,25402 conocidos incluyendo reintentos, defectos corregidos y una
  corrección de evidencia: las corridas de categoría no declararon `efeoncepro.com` como target y no prueban
  presencia o ausencia propia.
