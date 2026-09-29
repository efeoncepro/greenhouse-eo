# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

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
- Gate visual `--catalog=manzanitas`: 18 frames congelados. Aprobación visual del operador pendiente.

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

## 2026-09-28 — Ruta gobernada para producir piezas de marca en la plataforma (TASK-1921) y Grader por mercado (TASK-1863)

- Catálogo compartido LATAM/PR/ES/US y packs es/en/pt-BR/fr; Google AI Mode usa location_code e idioma
  explícitos, sin fallback US. Canary real: 22 éxitos y Cuba skip por falta de ubicación.
- Mercados/competidores versionados, snapshots, lotes atómicos y matriz sin promedio; ubicación nativa
  declarada por proveedor, presupuesto total y cobertura honesta de motores en informe/PDF.
- Staging verificado en Vercel y worker `d86edb784`: 11 informes, Google 66/66; Sky PE parcial por
  Perplexity. Migraciones/backfill aplicados, históricos preservados y main en espera. [Evidencia de TASK-1863](docs/audits/platform/2026-09-28-task-1863-verification.md).
- Nueva cola `greenhouse_brand` (pedidos, jobs y eventos append-only). El command `requestBrandRender` valida el
  contrato AXIS y la receta aprobada antes de encolar, exige cada fuente como asset del uploader y es idempotente. Lo
  llaman el lane App, el lane ecosystem y tres tools MCP (`request_brand_render`, `get_brand_render_request`,
  `list_brand_render_requests`).
- Tercer consumer del `artifact-worker` (La órbita y Glitch, seis catálogos), con despacho en el ops-worker, la señal
  `brand.render.stuck_job` y `sharp` como dependencia de runtime. Flag `BRAND_RENDER_ENABLED` OFF en los tres runtimes:
  code complete, rollout pendiente. En `develop`, sin promover a main.

## 2026-09-28 — El plan de un deck se valida contra el catálogo de recetas (TASK-1929)

- `pnpm brand:deck-plan -- --plan plan.json` valida el plan (recetas del catálogo por id): AXIS valida el documento
  (portada, cierre, página de servicio, alternancia de foto) y el catálogo agrega pareja portada↔cierre, variantes
  seguidas, plate repetido, slots y ritmo, sin duplicar códigos. `--propose` le pide al agente un plan validado que
  falla cerrado; una persona confirma (TASK-1932 lo expone por API, Nexa y MCP). El catálogo de runtime se genera con
  `pnpm brand:deck-recipes`.

## 2026-09-28 — Las 69 recetas de deck de «La órbita» componen (TASK-1928)

- El catálogo `graphic-line-deck` suma 34 plantillas para las 38 recetas pendientes: propuestas sobrias, método,
  cotización y próximos pasos, prueba (clientes, partners, caso, gráfico, testimonio), secciones y «quiénes somos», y
  contenido y día a día. Todas se componen con `pnpm brand:compose` y entran al gate visual (66 frames a 0 px).
- Greenhouse sube a AXIS `v0.3.21` (tokens 0.3.21, ui-contracts 0.3.19). El compositor gana logos de terceros
  normalizados, capas pintadas con foto adentro y recorte dirigido; el test de paridad exige que cada slot de la
  receta tenga campo en su plantilla. La portada de brochure con la selección de Nexa compone con
  la composición `document-selection` (el operador relajó la regla el 2026-09-28).
  Aprobado por el operador; `pnpm build` verde, en `develop`.

## 2026-09-27 — Una edición de Glitch se compone con `pnpm glitch:compose` (TASK-1923)

- Tres catálogos de Glitch sobre una carpeta (`glitch-carousel`, `glitch-stills`, `glitch-overlays`, 26 plantillas
  aprobadas): el carrusel de LinkedIn, los banners del blog (16:9, 1:1 y de noticia), la portada del reel, la miniatura
  del vlog y los overlays del video en PNG con alfa.
- El comando lee `GlitchEditionManifest`, elige la portada por rotación, valida cada lámina con `efeonce.glitch-line`,
  desarma las fotos en bytes sin tocar rostros y verifica los límites de LinkedIn. El contrato de plantilla del motor
  suma `render.minInkTileRatio` (aprobado). Detalle: [manual](docs/manual-de-uso/creative/componer-una-edicion-de-glitch.md).
  Local en `develop`; la ruta productiva es TASK-1921.

## 2026-09-27 — El deck y el brochure de «La órbita» se componen con `pnpm brand:compose` (TASK-1927)

- Greenhouse consume `efeonce.surface-composition` 0.1.2 (AXIS `v0.3.14`). El catálogo `graphic-line-deck` pasa de 6 a
  16 plantillas: portadas y contraportadas aprobadas de brochure y propuesta, composiciones `hero` y `lines`, la
  sección partida por la izquierda con tres composiciones y el tríptico de una palabra por toma.
- `pnpm brand:compose` acepta un documento (`pages`) y entrega un PDF multipágina con su manifest y procedencia.
  Detalle: [norma de superficie §2.1 y §4.6](docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) y
  [manual](docs/manual-de-uso/creative/componer-por-superficie-con-axis.md). Local en `develop`, sin runtime productivo.

## 2026-09-27 — Glitch en AXIS: token `glitchLine`, contrato `efeonce.glitch-line` y archivos publicados (TASK-1922)

Los valores de Glitch dejaron de vivir como literales en el Lab, la norma y el canvas. AXIS `v0.3.12` (`29a40b5`, push y
tag autorizados por el operador) publica `axis-tokens` 0.3.12 con el token de franquicia `glitchLine` (lo heredado de La
órbita, por referencia), `axis-ui-contracts` 0.3.10 con el contrato `efeonce.glitch-line` 0.1.0 candidate (23 códigos
estables con mensaje es-CL, falla cerrado; `pnpm glitch:resolve`), `axis-brand-assets` 0.3.5 con el wordmark y la
manzana aparte de la familia, y `axis-graphic-line` 0.7.0 con 5 glifos Plastilina nuevos y su volumen (84 glifos, 48
volúmenes). El Lab lee el token. Greenhouse los fija en `4dfb147f7`; visual gate de graphic-line a 0 px. Decisión del
operador durante la task: los íconos de acción de Glitch van en Plastilina plana, nunca en volumen.

## 2026-09-27 — Glitch: motion, sonido y música listos para producir desde el taller (docs, manuales, skills)

Con motion, sonido B y música aprobados, se sincronizó todo lo que un editor humano o agente necesita para producir una
edición: norma de Glitch v1.8 con §13.13 como referencia única de comandos y argumentos (`--sound`, `--music`,
`--deliver`, `--skip-render`…), manual nuevo `producir-motion-glitch.md` (runbook del taller) y manual del editor al día
(mapa de la edición, pre-roll, cama y cortina, podcast), TASK-1924/1925/1922/1923 y EPIC-031, ADR del taller v1.1,
AGENTS.md y skills graphic-line, motion-design-studio, audio-studio y hyperframes (+espejos). En el taller: la cama de la
última noticia ya no suena bajo el cierre del host (`7ed6219`, kit re-entregado 95/95) y el comando `sonido`, declarado
pero inexistente, quedó implementado. Pendiente abierto: si el reel abre con el pre-roll (rompe el bucle exacto).

## 2026-09-27 — Glitch: música aprobada, publicada e integrada (tema B + cama post-punk), sólo Glitch

El operador aprobó la música de Glitch: tema B (intro, cortina y salida: «Me parecen bien todas») y la cama post-punk bajo
la noticia («Post-punk definitivamente»), que reemplaza «la voz sola bajo las noticias». Los 7 másteres (más versiones web)
están en el bucket público `glitch/music/v1` con `index.json` y sha256 verificados; AXIS los publica en
`/references/glitch/#musica` y `glitch.json → music` (PR #10, `87c3298`); el taller los integra con `music.mjs` y un pre-roll
animado elegido por el operador (`2c8f36c`, `ed89a0b`). Lección medida: lo «arcade» es falta de medios (13 % entre 300 Hz y
3 kHz contra 45 %); nunca síntesis pura ni recortar medios, el espacio para la voz lo da el ducking. Documentado con sus
argumentos en la norma de Glitch (§13.12 «Por qué»), el ADR, DECISIONS_INDEX, la documentación funcional, el manual del
editor, la identidad sonora de Efeonce (sólo punteros), la guía de selección de modelos (ficha §5.9) y las skills
graphic-line, audio-studio, motion-design-studio, ai-model-selection y axis-design-system (+espejos). Único pendiente:
probar la mezcla con la voz real del host.

## 2026-09-27 — AXIS `axis-tokens` 0.3.10: `color.info`, motion de un solo valor y tokens CSS que existen

AXIS corrigió el Lab, que usaba `var(--efeonce-spacing-5)` y `-7`: no existen (la escala publicada es `1/2/3/4/6/8`), y
un `var()` de un token inexistente no avisa, porque la declaración entera vuelve a su valor inicial (`main@ed97c0b`).
También reemplazó `color-error` por `color-danger` y `color-border-strong` por `color-border`, y quitó `shadow-sm`; un
test nuevo del Lab (`design-tokens.test.ts`) falla si reaparece un token inexistente (`main@0a6da3b`). Publicó
`@efeoncepro/axis-tokens` `0.3.10` (tag `v0.3.10`, `main@aa1a638`, run `36324516573` en verde; los demás paquetes no
cambian): `--efeonce-color-info` (#1f6fd4), `efeonceTokens.motion` como alias de `axisMotion.duration` (`standard` pasa de
220 a 200 ms en TS; el CSS ya emitía 200) y un build que falla si una propiedad sale con dos valores. Greenhouse sigue
fijando `axis-tokens` 0.3.8: al subir a ≥ 0.3.10, `axis-package-drift.test.ts` falla hasta agregar
`info: axisSemanticHex.info` a `COMPATIBILITY_ROLES`. Documentado en el runbook de consumo AXIS (Delta 2026-09-27 c), el
mapa de continuidad, TASK-1927 (nota de dependencia), el registro cine, TASK-1926 y la skill `axis-design-system`
(+espejo `.claude`), que ahora trae la regla de tokens CSS y corrige los pines de Greenhouse. Sin cambios de código en
Greenhouse.

## 2026-09-27 — Registro cine con documento propio, pruebas publicitarias, repo taller y AXIS 0.3.9

El operador pidió documentar «con altísimo nivel de detalle» el estilo cinematográfico: nace
[`EFEONCE_PHOTO_REGISTER_CINE_V1.md`](docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) (cámara,
luz de la línea como fenómeno, color por línea, vestuario, emblema compuesto, robots agentes, reservas, ficha comentada,
trampas, barra de juicio y evidencia), con punteros en el canon, la regla auto-load y diez skills (+espejo `.codex`).
Primera tanda publicitaria 9:16 y 4:5 en prueba: la firma caía sobre el sujeto con el contraste pasando hasta usar un
primer plano oscuro como lecho. Se creó el repo taller `efeoncepro/efeonce-brand-workshop` (ADR
`EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1`, TASK-1925) para sacar la producción de marca de Greenhouse sin reactivar
Globe. AXIS publicó `v0.3.9`: `efeonce.surface-composition` 0.1.2 (uso propuesta/brochure, portada y cierre, layouts de
`proposal-cinematic`, documento brochure).

## 2026-09-27 — Iconografía: IA, social y staff (D26)

El operador aprobó 19 íconos nuevos de la línea gráfica («Subelos todos a excepción del hoodie de trazo que no parece
un hoodie»): 9 de Trazo (ia, composer, buscador, influencer, prensa, social, multimedia, assets, staff-gorra) y 10 de
Plastilina con su volumen (chispa, prompt, barra-busqueda, aro-de-luz, television, like, galeria, biblioteca, hoodie,
gorra). El Trazo `staff-hoodie` no entró. El set queda en 36 Trazo + 43 Plastilina = 79 glifos y 43 volúmenes, publicados
en AXIS con el tag `v0.6.0` (`axis-graphic-line` 0.6.0, `axis-brand-assets` 0.3.4); Greenhouse fija axis-graphic-line
0.6.0 y axis-brand-assets 0.3.4. Documentado en el ADR (delta D26), el manual §14, la doc funcional 1.11, el manual de
uso 1.9 y las skills `efeonce-graphic-line` y `axis-design-system`.

## 2026-09-27 — «La órbita» por superficie en el Artifact Composer (TASK-1919) y `foto:isotipo` (TASK-1920)

Las 20 recetas aprobadas de la línea gráfica por superficie son plantillas del Artifact Composer en tres catálogos
nuevos: `graphic-line-deck` (PDF 16:9, seis láminas), `graphic-line-stills` (heros web, el teléfono por ancho, caminero,
último cuadro del loop y storyboard de motion) y `graphic-line-overlays` (capas de video en PNG con alfa). Una pieza sale
entera de un intent con `pnpm brand:compose` (mapper puro `src/lib/brand-surfaces`: exige receta aprobada y valida con el
contrato AXIS); opciones y pendientes fallan con `recipe-not-approved` y el video queda en motion
(`recipe-outside-composer`). Motor domain-free: fondo transparente por plantilla, gate de tinta ponderado por alfa y fix
de slots anidados; pintores de selección y CTA inyectados. `pnpm brand:tokens [--check]` y gate propio
`pnpm composer:visual-gate --catalog=graphic-line` (22 frames a 0 px; la deriva global de 60 frames es previa,
ISSUE-122). Greenhouse fija AXIS `v0.3.8` (`efeonce.surface-composition` 0.1.1) y depende de `axis-graphic-line`.
`pnpm foto:isotipo` compone el isotipo oficial sobre la prenda cuando `foto:emblema` muestra otro (TASK-1920). Local en
`develop`, sin push; ruta productiva en TASK-1921. Docs: ADR del composer, runbook del gate, norma por superficie §2.1,
índice de la línea, runbook AXIS, doc funcional 1.10, manual de uso 1.1 y skills `efeonce-graphic-line`, `deck-studio`,
`motion-design-studio` y `efeonce-advertising-creative`.

## 2026-09-27 — Iconografía: 30 íconos de oficio (D25)

El operador aprobó 30 glifos nuevos, producidos con el método de alta de cada voz y revisados en el canvas «Íconos de
La órbita» (sección 7): 15 de Trazo (correo, `llamada`, calendario, reunión, objetivo, presentación, contrato, checklist,
código, base de datos, nube, integración, seguridad, ubicación, reloj) y 15 de Plastilina (lápiz a estrella), éstos
también en volumen. El set queda en 27 Trazo + 33 Plastilina = 60 glifos y 33 PNG de volumen, publicados en AXIS con el
tag v0.5.0 (`axis-graphic-line` 0.5.0, `axis-brand-assets` 0.3.3; `axis-tokens` sigue en 0.3.7); el Lab muestra el
catálogo completo. Reglas nuevas: claves únicas entre voces y Trazo sin arcos elípticos. Documentado en la skill
`efeonce-graphic-line` (iconography §13, ledger, lecciones), manual §14, ADR, doc funcional 1.9 y manual de uso 1.8;
Greenhouse ya fija `axis-graphic-line` 0.5.0 y `axis-brand-assets` 0.3.3.

## 2026-09-27 — Línea gráfica de Glitch: sub-línea de «La órbita», sólo para Glitch

Nace la norma [`GLITCH_GRAPHIC_LINE_V1.md`](docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md) y su
ADR [`GLITCH_GRAPHIC_LINE_DECISION_V1.md`](docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md). Aplica **sólo a
Glitch**, el magazine semanal: hereda de La órbita la gramática, la esfera única, el fondo, Bricolage + Poppins, la firma
de Efeonce y los íconos, y agrega lo exclusivo de Glitch (manzana, verde `#6ec207`, falla en bytes, Guttery, cabecera
«EDICIÓN #N»), que nunca va en piezas de Efeonce. El operador aprobó el sistema de portada A/B/C con regla de rotación,
la lámina interior con su variante de noticia 1 y la contraportada; lente, blog, vlog, reel y tarjetas finales quedan en
propuesta. El flujo de composición (valores en AXIS, catálogo `glitch-edition` del Artifact Composer, overlays
HyperFrames con alfa) queda `Proposed`, sin tasks. Doc funcional y manual de uso nuevos; remisión en el manual de La
órbita §7. AXIS en rama `feat/glitch-line`, sin publicar; sin cambios de código en Greenhouse.

## 2026-09-27 — Iconografía: Plastilina en volumen canónica (D24) y el Trazo sin rasgo propio (D23)

El operador canonizó la tercera capa de la iconografía: **Plastilina en volumen**, cada glifo de Plastilina en arcilla
mate inflada, generado desde su vector aprobado (GPT Image 2.5 Sunburst editando el ícono plano) y entregado como PNG
con alfa. Complementa al plano: sólo en momentos protagonistas, uno por pieza, desde 160 px; nunca en listas, contenido
de deck, dashboards ni UI. En AXIS `main` (c18e3d3): tokens `efeonceGraphicLine.icons.volume` (axis-tokens 0.3.7),
los 18 PNG sellados en `@efeoncepro/axis-brand-assets` 0.3.2 (`volumeIconUrl`), `pnpm icons:volume -- refs|key|check|publish`
y la sección `#volumen` del Lab con su bloque en `/references/iconography.json`; publicados con el tag v0.3.7 (tokens 0.3.7, brand-assets 0.3.2).
Lecciones: el extruido en Blender quedó plano y se rechazó; `ai:image:rmbg` rellena los calados, así que el alfa se saca
por color contra el fondo liso; el QA compara silueta, calados y piezas con el plano y avisa sin rechazar. D23: «El corte»
en el Trazo se descartó; el Trazo queda funcional y la distinción la carga Plastilina. Skill `efeonce-graphic-line`,
skills vecinas, manual, ADR, doc funcional y manual de uso al día. Corrida: `ai-generations/2026-09-27_plastilina-3d-gpt/`.

## 2026-09-27 — La órbita se compone por superficie

Nace la norma [`EFEONCE_SURFACE_COMPOSITION_V1.md`](docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md):
recetas aprobadas, opciones, rechazos, firma y reglas para web, DOOH, pDOOH, motion, producción audiovisual y deck, más
la tabla de contradicciones del inventario y cómo quedaron. El operador aprobó las recetas de deck `proposal-cinematic`
(servicios creativos, web, carrera de Nexa, RevOps, AEO y líneas de servicio con Nexa, cuyas cinco esferas son luz de
la foto) y `method-staircase` (BeX), amplió el registro cine a `proposal-cinematic` con personas del equipo en su
uniforme por registro, dejó el acento fuera del texto menor de 24 px y aprobó el 1:1 ajustado en el canvas (su salida
de `sinValidar` va con TASK-1918). El canvas del equipo se separó en una página por superficie, cada una con su lámina
guía. Manual de la línea §10.0, lenguaje fotográfico v1.6, doc funcional 1.7, manual de uso nuevo y skills
`efeonce-graphic-line`, `deck-studio`, `motion-design-studio`, `efeonce-advertising-creative` y `design-studio` al día.
El contrato AXIS `efeonce.surface-composition` 0.1.0 (`candidate`, `pnpm surface:resolve`, tokens
`efeonceGraphicLine.surfaces`) está en `main` de AXIS (Lab `/references/surfaces/` publicado; paquetes sin publicar en npm); sin cambios de
código en Greenhouse.

## 2026-09-27 — Glitch: diseño sonoro aprobado (versión B), sólo Glitch (AXIS /references/glitch/#sonido)

El operador aprobó la versión B: «La b me encanta más. Sus sonidos están aprobados». Es **sólo de Glitch**: no forma
parte de la identidad sonora de Efeonce ni se mezcla con su kit. Idea: «el sonido de Efeonce, con un bug». El motivo
Mi · Mi · Mi → La hace fallar la tercera nota, que se rompe en bytes y se rearma como la manzana, el único golpe grave. Es
diseño sonoro, no música, amarrado cuadro a cuadro al piloto de motion. Incluye un WAV por cada `.mov` del kit (lower
third y transición «manzana en bytes» incluidos) y una pista por transición entre escenas, calculada desde la misma
programación de celdas que la imagen: una lluvia de clics, nunca un whoosh. Motor determinístico
que ya vive en el taller (`tools/glitch-motion/src/sound.mjs` + `tools/brand-sound`, `2d411b8`): cada render deja su WAV
junto al `.mov`. Publicado en AXIS (PR efeoncepro/axis-design-system#8): sección `#sonido`, campo `sound` en
`glitch.json` y 38 archivos en el bucket `glitch/sound/v1`. La página de sonic brand saca a Glitch de su kit. Canon:
norma de Glitch §13.11, Delta del ADR, doc funcional, manual de edición, reglas y skills `efeonce-graphic-line`,
`audio-studio` y `motion-design-studio`.

## 2026-09-26 — Identidad sonora de Efeonce recomendada: «Tres puntos que se vuelven uno» (AXIS /references/sonic-brand/)

El operador aprobó como recomendada (no canon) la identidad sonora de la marca: el logo sonoro Mi · Mi · Mi → La traduce
la gramática de La órbita (el anillo pregunta, tres notas piensan, la esfera responde con el único golpe), con dos
registros del mismo ADN —fondo (96 BPM, síntesis propia) y energía (120 BPM, rock: maqueta propia re-grabada con Stable
Audio 2.5 y la esfera propia encima)—, el timbre de la esfera por línea de servicio (Growth campana, Brand marimba, Engine
FM, Voice eco, Revenue campana grave) y la etiqueta «Empower your <Línea>» con la voz de Brian (ElevenLabs v3). Re-sonoriza
reveal, apertura y sting V1.1 sin tocar la imagen, en 16:9 y 9:16. Publicado en AXIS (PR efeoncepro/axis-design-system#4):
página `/references/sonic-brand/`, JSON para agentes con URL y SHA-256 por archivo y guía `docs/agent-composition/sonic-brand.md`;
65 archivos en el bucket público `sonic/v1`. Valores fuera de `axis-tokens` hasta canonizar. Pendiente: licencias,
prueba de reconocimiento sin logo y reemplazo del sonido de los masters V1.1 (Glitch tiene su sonido propio: entrada del 27/09). Canon
[`EFEONCE_SONIC_IDENTITY_V1.md`](docs/operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md), ADR Proposed, doc funcional,
manual, regla `.claude/rules/brand-sonic.md` y skills `audio-studio`, `efeonce-graphic-line`, `axis-design-system`,
`motion-design-studio` y `efeonce-brand-studio`. Producción: `ai-generations/2026-09-26_branding-sonoro/`.

## 2026-09-26 — Iconografía de La órbita canónica: Trazo y Plastilina (AXIS v0.3.6)

El operador canonizó la iconografía de la línea (D16–D22) en dos voces de una familia: **Trazo** (lo que se mide;
Growth, Engine, Revenue) y **Plastilina** (lo que se crea; Brand), con la esfera como estado (reposo o respuesta, en el
acento de la línea de la pieza), fondo `#001a33` en todas las líneas y la órbita sesgada como firma de Plastilina.
AXIS publicó con el tag `v0.3.6` los tokens `efeonceGraphicLine.icons` (`axis-tokens` 0.3.6) y
`@efeoncepro/axis-graphic-line` 0.4.0 con el subpath `/icons` (30 glifos; `resolveIcon`, `auditIconGroup`,
`skewedOrbitHeroSvg`), los comandos `pnpm icons:export|check|vectorize` para dar de alta glifos nuevos y la página
`/references/iconography/` del Lab (PR efeoncepro/axis-design-system#3). Dos pruebas a ciegas con agentes sin contexto
validaron la documentación; lo que tuvieron que adivinar se corrigió (gesto en tinta, medición real en `icons:check`).
Greenhouse todavía no consume `/icons`. Skill `efeonce-graphic-line`, ADR delta (f), manual §14 y las skills y docs
vecinas al día. Pendientes del operador: voz de Voice, aire del Trazo a 20 px, opacidad del anillo sesgado y el
reemplazo de Tabler en las firmas.

## 2026-09-26 — Línea gráfica: decisiones del operador sobre contraste, halo, logo y fotografía (AXIS 0.3.5)

El operador aprobó las recomendaciones pendientes de la línea «La órbita». El acento pide 3:1 contra su fondo como
gráfico o en texto de 24 px o más y nunca va en texto menor (Engine y Voice conservan su color); el magenta de
Revenue-HubSpot queda aprobado; la burbuja URL pide 4,5:1; el halo sobre papel va a la mitad; el anillo propio de la
esfera significa «en vivo»; el logo va dentro de la órbita sólo en los cierres de marca; «Growth» va en el acento en
el cierre del deck. AXIS publicó el juego `v0.3.5` (tokens y contracts 0.3.5 con el contrato de la órbita 0.3.1,
registry y brand-assets 0.3.1, graphic-line 0.3.2) y el Lab reproduce el banner, la story y el fondo de Teams con un
solo anillo y el reverso de la tarjeta con el logo solo. Se aprobaron las 12 reglas de sinergia con la fotografía y se
resolvieron sus 9 conflictos; lo que necesita código quedó en TASK-1918. Manual v1.8, ADR delta (e), lenguaje
fotográfico v1.4 y la skill `efeonce-graphic-line` al día.

## 2026-09-26 — Skill viva `efeonce-graphic-line` y la órbita junto a la foto

Nace la skill dueña de la línea gráfica «La órbita» (Claude y Codex, espejo byte-idéntico): el criterio de cada elemento
(anillo, arco, esfera, halo, lente, foco, voces, eslogan, firma), todo lo que existe en AXIS (tokens, contratos y
recetas de `axis-graphic-line`), cada aplicación (post, story, banner de LinkedIn, deck, informe, firma de correo,
oficina, merch, eventos, video), el motion del logo, la convergencia con el lenguaje fotográfico, el QA, un registro de
decisiones y pendientes del operador, y un contrato de mantenimiento. El manual de la línea suma §9.1 (la foto en la
línea) y fija «Revenue» como palabra del eslogan de RevOps; el lenguaje fotográfico suma §11 (la línea en la foto). El
router de CLAUDE.md y AGENTS.md apunta a la skill nueva.

## 2026-09-26 — Marketing Studio: capa de estrategia y operación híbrida con agentes (ADR aceptados)

Quedaron aceptadas tres decisiones de EPIC-049. Studio + un bucket GCP son la fuente única de los archivos de campaña, con
ingesta por CLI, MCP y agentes sobre un solo command. La capa de estrategia suma catálogo de canales, referencia al ICP
de la organización, plan de campaña, plan SEO/AEO sobre Search Visibility 360, IA con procedencia y medición de solo
lectura, todo operable por agentes con niveles de riesgo (T0 lectura, T1 borradores reversibles, T2 aprobar/publicar/
gastar con confirmación humana). La operación híbrida reparte cada campaña en work items asignables a personas o a roles
de agente (planificador de medios, SEO/AEO, copywriter, QA creativo, analista), con un despachador en Studio y
adaptadores Claude y OpenAI detrás de flags. Tasks TASK-1905–1916 en to-do; sin cambios de runtime todavía.

## 2026-09-26 — Firma de correo v3.1 aprobada: zona de partners y contrato `efeonce.email-signature`

El operador aprobó la firma de correo en sus dos versiones (A sobre papel, B tarjeta navy). La línea que termina en la
esfera va una vez; los partners (HubSpot, Salesforce, Adobe, Microsoft, AWS, Google Cloud, Claude, OpenAI y BytePlus)
abren su propia zona con una regla fina sin esfera, en logos oficiales de un solo tono y el mismo peso óptico. Sin
«Quedo atento» y todo el texto que no es el nombre en Poppins. AXIS `c7717ef`: tokens
`efeonceGraphicLine.emailSignature`, contrato `efeonce.email-signature` 0.3.0 (`stable`) con `pnpm signature:resolve`,
guía para agentes y lámina 4.5 del Lab. Greenhouse: manual §10.2, ADR, documentación funcional, manual de uso y las
skills `efeonce-brand-studio` y `axis-design-system`. Después: paquetes AXIS publicados (0.3.2 y 0.3.4), imágenes en
el bucket público `email-signature/v3.1/`, HTML listo para Outlook y **firma de equipo** aprobada (Talent, Finance,
Commercial: sin foto, la órbita rodea el ícono del área; variante `team`). Pendiente: instalar en Outlook.

## 2026-09-26 — Línea gráfica «La órbita»: AXIS 0.3, recetas fieles al canvas y motion V1.1

AXIS publicó 0.3.0 (tokens, contratos, registro y assets) y el paquete nuevo `@efeoncepro/axis-graphic-line` 0.3.1,
que pinta la órbita y sus recetas. Cada pieza de formato fijo (lente, foco, deck, firma de correo) quedó medida en el
canvas y la receta la reproduce; la órbita genérica usa las medidas del canvas (arco centrado, 200°–250°). Reglas nuevas
de contrato: la lente lleva arco y esfera, el foco siempre su anillo, un solo anillo alrededor del contenido y la esfera
final es parte del texto (también en la selección colaborativa 0.3.0). Greenhouse adoptó 0.3.0 en develop: el
compositor de campañas pinta la lente y el deck según el contrato nuevo (suite completa en verde). El motion del logo
V1.1 (reveal 3,6 s, apertura 2,4 s, sting 1,6 s) quedó aprobado y documentado; sus masters se sirven desde el bucket
público `gs://efeonce-group-axis-public-media` y el Lab muestra versiones web con su ficha, junto a la animación de la
órbita sola. El lenguaje de movimiento quedó como norma (`EFEONCE_ORBIT_MOTION_LANGUAGE_V1`) y sus valores en los tokens
`efeonceGraphicLine.motion` (`axis-tokens` 0.3.3), que el render lee: los 90 cuadros clave y los tres sonidos salen
idénticos byte a byte. Rollback: fijar de nuevo los paquetes en 0.2.7.

## 2026-09-26 — Marketing Studio: originales en GCS, worker de medios y restauración probada (TASK-1893, TASK-1896)

Studio guarda en GCS una copia verificada (sha256 + crc32c, deduplicada) de los finales aprobados: 30 versiones por
ambiente; las 24 imágenes de CMP-002 siguen en OneDrive porque el catálogo no trae su huella. Un worker de Cloud Run
genera miniatura, preview, portada de video y recortes al llegar cada original, repara faltantes con un barrido horario
y lee de Metricool la evidencia real de publicación. Un cliente autorizado descarga un original por URL firmada de
10 min, auditada, con su estado de derechos (`STUDIO_ORIGINAL_DOWNLOADS_ENABLED` sólo en production). Studio además
tiene Sentry propio, uptime check con email, health profundo, registro de corridas y una restauración lógica ensayada
contra producción (job 49 s) con ensayo mensual programado; Greenhouse lo observa con la señal
`platform.marketing_studio.health` y avisa a Teams «EO - Admin» en `error`. Release Greenhouse `92002873ced9` (PR #243).
Pendientes en los Follow-ups de cada task. Rollback: flags a `false` + redeploy, pausar schedulers, `media:ingest
--revert-provider`.

## 2026-09-26 — Efeonce Insights: diseño premium en producción (TASK-1889)

Los informes A4 y los decks de Insights salen con el diseño premium aprobado por el operador: portada blanca o navy
con el logo del cliente, índice, «Lo esencial», capítulos, páginas de gráfico por familia, tabla de respaldo, límites y
contraportada; el diseño anterior se retiró del código. Las variaciones muestran la dirección del valor con el triángulo
y, con el tono, si el cambio es mejor o peor para esa métrica (posición y RpA: menor es mejor). Código en los releases
`0e87c7a443a2` y `f9257b9c94af`. Verificado en producción con las primeras ediciones internas de Berel (A4 16 páginas +
deck 15 láminas) y Sky (A4 12 + deck 10), los cuatro PDF al primer intento. Emisión y compartir siguen OFF en
producción. Rollback: revert del código de catálogos y release.

## 2026-09-26 — Efeonce Insights: contrato editorial v2 encendido en producción (TASK-1888)

Los informes nuevos de Insights salen con el contrato v2: lectura por figura (cifra principal, conclusión, próximo
paso), «Lo esencial» sólo con hallazgos, líneas de alcance, tabla «<módulo>: todas las cifras» y portada sellada por
organización (`auto`/navy/blanca; navy sólo con logo apto para fondo oscuro). Superlativos sólo con máximo único (con
empate se dice el empate). Código en los releases `0e87c7a443a2` y `f9257b9c94af`; gateway efeonce-mcp v1.9.0 con
`get/set_insight_cover_preference`; `INSIGHTS_EDITORIAL_V2_ENABLED` ON en Vercel staging/Production y en el
`ops-worker`. Verificado con un canary sintético en producción que sella el plan v2. Emisión, sharing y correo siguen
OFF en producción. Rollback: flag OFF en los dos runtimes.

## 2026-09-26 — La órbita 0.2.0: firma por regla, assets oficiales y la oficina en foto

Regla del operador: una pieza gráfica firma con el logo de Efeonce centrado; la burbuja URL lo reemplaza sólo si el
logo ya está en la imagen (centrada, fusión de luminosidad, lecho muy oscuro). La órbita se usa en casos puntuales y no
sustituye la composición fotográfica. AXIS 0.2.7: contrato `efeonce.graphic-line-orbit` 0.2.0 (`signature`, `slogan`,
`state`, `brand-close`; checks de firma y de sujeto), tokens nuevos y paquete `@efeoncepro/axis-brand-assets` (19 SVG
sellados); el Lab sincroniza los archivos, suma la sección 4.9 «Oficina en foto» y el banco de tipografía firma con el
logo. Greenhouse pinnea 0.2.7: `creative:orbit:render` pinta y mide la firma; `creative:layout` acepta la capa
`graphic_line` y `brand.signature`; `foto:componer:cta` tramo 17 (`marcaEnEscena`, gate `firma-burbuja`, P11, 3
mutantes) sólo en piezas nuevas, sin recertificar las aprobadas (el gate las muestra 3 hasta recomponer; ningún CI lo
corre). La oficina de 4.3 se fotografió con IA (9 fotos, 4 corregidas por edición); canvas 40 láminas, PDF 56 hojas.
Pendiente: umbral de contraste de la burbuja (4,5:1 hoy, al límite) y la atribución sin logo.

## 2026-09-26 — Marketing Studio por MCP en producción (release 0e87c7a443a2)

Release develop→main PR #240 (run `36222331450`, released): canje RFC 8693 `efeonce-mcp-marketing-studio`, capability `marketing_studio.campaign.read`, manual MCP `marketing-studio` servido por el lane de skills (canary 200) y contrato editorial v2 de Insights con flag OFF (canary `cover-preference` 200). Gateway `efeonce-mcp` `958c9de30` con el provider `marketing-studio` encendido (`00061-sbc`). TASK-1890 y TASK-1891 complete: una sesión MCP real devolvió datos de producción, tras la migración correctiva `20260926071321910` (política del cliente de canje) y el fix `efeonce-mcp#20` (montaje del secreto). [Ledger de tiempos](docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md).

## 2026-09-25 — La órbita se compone por intención (AXIS 0.2.6)

Contrato candidate `efeonce.graphic-line-orbit` 0.1.0 en `@efeoncepro/axis-ui-contracts` 0.2.6: un agente declara órbita, medida (con fuente o sin arco), progreso de deck, lente, foco, mapa de familia, burbuja de URL, voz o logo en frase, y AXIS valida las reglas y resuelve cada valor desde los tokens. Adapter de Greenhouse: `pnpm creative:orbit:resolve` y `pnpm creative:orbit:render` (SVG, PNG y `qa.json`; falla si un texto cruza el anillo). Pines AXIS a 0.2.6. [Manual](docs/manual-de-uso/creative/usar-linea-grafica-efeonce.md) · [skill](.claude/skills/efeonce-brand-studio/references/graphic-line-orbit.md).

## 2026-09-25 — Línea gráfica «La órbita»: banco de fotos y canon en AXIS

Banco propio de 8 fotos para la lente, hecho con el lenguaje fotográfico (`pnpm foto:generar`, 11 generaciones, ~USD 0,55; tres rehechas por el lenguaje). Reemplaza a las tres fotos repetidas con emblema en canvas, estímulos de la prueba sin logo, PDF y AXIS. ADR de canonización y tokens `efeonceGraphicLine` pasados a `canonical` en AXIS. [ADR](docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md) · [manual](docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md). Atribución sin logo sin medir.

## 2026-09-25 — Insights: el diseño aprobado llega al informe y al deck (TASK-1889)

Los catálogos `insights-report` (A4) e `insights-deck` (16:9) componen sólo con el canvas aprobado el mismo día: portada navy o blanca con el logo privado del cliente (sellado como referencia, bytes autorizados por el worker), índice, «Lo esencial» con el folio real de su evidencia, aperturas de capítulo, una página de figura por familia (comparación de períodos, columnas por canal, metas con banda del registro ICO, tendencia), tabla, límites y contraportada desde el SSOT de marca. Se retiraron la página analítica y la lámina de evidencia v1. Fidelidad al canvas 20/21 ≤ 1 % (Deck-Agrupadas con excepción aprobada); gate visual de Insights a 0 px; ediciones reales de Berel y Sky compuestas en local, que revelaron y corrigieron cinco defectos. Code complete en develop, sin push; rollout pendiente. [Dossier](docs/ui/reviews/TASK-1889-efeonce-insights-premium-catalogs/README.md).

## 2026-09-25 — Marketing Studio listo para agentes y federado en el gateway (TASK-1890/1891)

Studio publica un registro único de operaciones del que se derivan su OpenAPI (1.1.0) y el manifiesto `studio-tool-manifest.v1` (12 tools de lectura `studio.*` + 5 exclusiones con razón, `manifestHash`, leak test y paridad con los route handlers). La API acepta bearer de `api_client` con organizaciones permitidas (`organizationId` nunca amplía), las campañas usan el id canónico de organización de Greenhouse y hay detalle y preview por pieza. Imágenes por enlace firmado sin consulta a la base (incidente de conexiones del mismo día). En Greenhouse: capability `marketing_studio.campaign.read` y manual MCP `marketing-studio` (manuales con `provider` externo). Toolchain de Studio al día (TypeScript 7, React 19.3, catálogo único de versiones). [Arquitectura §4.1](docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md). Gateway `efeonce-mcp` 1.8.0 con provider `marketing-studio` (12 tools, canje RFC 8693 por persona en Greenhouse, guard de manifiesto) desplegado con el flag OFF hasta el release de Greenhouse. Skill `efeonce-marketing-studio`.

## 2026-09-25 — Efeonce Marketing Studio: fundación en producción

Nuevo producto `studio.efeonce.org` (EPIC-049 / TASK-1887). Repo `efeoncepro/efeonce-marketing-studio`, solo código, con docs en este repo. Next.js en Vercel con `/api/v1` (OpenAPI 3.1, 12 rutas) y dominio sin framework. Bases `marketing_studio` y `marketing_studio_staging` en `greenhouse-pg-dev`, con roles propios. Renditions WebP en buckets privados servidas por la API. UI aprobada en claro y oscuro con tema generado desde `@efeoncepro/axis-tokens`. Import idempotente de CMP-001 a CMP-005 aplicado en prod. Acceso abierto de solo lectura; el login es task aparte y el CNAME del dominio está pendiente. [Arquitectura](docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md) · [runbook](docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md).

## 2026-09-25 — CTA: política cromática por campaña

Política optativa con archivo/hash, paleta AXIS y tratamientos explícitos; compositor y gate validan la decisión y conservan contraste/guardas. Legacy mantiene comportamiento: 13 piezas idénticas frente a HEAD. 39 tests, 14 verificaciones de integración y cuatro candidatas CMP-004 reproducidas; aprobación creativa pendiente. [Contrato](docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md#20-política-cromática-por-campaña-optativa) · [ADR](docs/architecture/EFEONCE_ADVERTISING_CAMPAIGN_COLOR_POLICY_DECISION_V1.md) · [evidencia](docs/audits/social/2026-09-25-cmp004-typography-grouping-review.md). Sin modificación del motor tipográfico/espacial, commit o publicación.

## 2026-09-24 — ANAM: foto oficial de Emma, avatar de chat y cargo comercial

La landing pública sirve `kortex-cms-react/30` con el retrato PNG enviado por María Paz y el cargo `Ejecutivo comercial ANAM`. El avatar derivado con fondo menta se guardó en la identidad de Customer Agent y en el chatflow `96601133`; el widget público mostró la nueva imagen sin enviar mensajes. Se actualizaron el [caso ANAM](docs/architecture/kortex/hubspot-cms/anam-chat-landing.md), la documentación funcional, el manual y las referencias espejo de `hubspot-as-a-service`. La QA completa móvil y conversacional del build #30 no se repitió.

## 2026-09-24 — Insights: renderer local de familias de gráficos

Los catálogos `insights-deck` e `insights-report` componen line, pie, donut y scatter desde `ChartSpec`; las suites dirigidas pasan (114/114) y un PDF sintético A4 de 30 páginas valida fuentes embebidas, pie/folio 30/30 y lectura en grises. Evidencia y gates pendientes en [TASK-1847](docs/tasks/in-progress/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs.md); sin deploy ni release.

## 2026-09-24 — SKY: producción, correcciones y método de video

Profundización con tres subagentes: [método completo](docs/operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md), companions de preproducción/cámaras/piezas, posproducción/sonido y 13 aciertos/20 fallas; dos plantillas. Incluye preparación con Claude, corrige reglas universales de planos/tramos y límites estimados, y conecta skills espejo Motion/Audio. Motion/Audio incorporados al gate de espejos. Sin nuevos renders ni gasto.

[CDR-008](docs/campaigns/decisions/CDR-008-cmp003-cartelas-postproduccion-y-audio-separado.md) registra aprobación de punch-v3 y su alcance: cartelas/cierre, película generativa. Fuentes y hashes congelados; guion/cámaras/audio/costos en el plan V10 de OneDrive. Skills motion/audio espejadas incorporan alpha, URL Luminosidad, música instrumental limpia y controles actuales de ElevenLabs/Omni. [Método y evidencia](docs/operations/social/2026-09-24-sky-generative-film-title-overlay-method.md). Tras autorización condicionada, un piloto Omni de 9,5 s fue rechazado por discontinuidad (228 cuadros revisados, ~USD 1,54 estimados desde uso). Master sin integrar; audio posterior al cierre de imagen. No se encadenaron intentos. V11 posterior: un intento completo 1080p rechazado tras 713 cuadros; costo individual confirmado USD34,162558 excedió USD25 autorizados. Informe en CDR-008. V12 posterior rescata fuentes existentes y compone cartelas/cierre: 30 s/1080p/720 cuadros, música/SFX originales sincronizados, USD0 adicionales. V13 corrige portal, URL, morado y recupera música V7; export y QA en CDR-008. Escucha y aprobación final pendientes. V14 integra Omni localizado y Heroic Ascent Music2.5 elegido por el operador, tras rechazar el puente local genera Heroic Ascent Finale con referencia nativa, sin empalmes, y mezcla cinco SFXv2; master30s/1080p revisable, escucha pendiente. Costos y errores en CDR-008. V15 adopta el rock aportado por el operador; V16 reemplaza el acento de marca y restaura metraje con Topaz, luego recompone capas aprobadas. Entregas30s/4K restaurado y1080p verificadas; coste de restauraciónUSD5,59944 dentro deUSD5,60. V17 posterior, autorizado: reduce lectura0,5s y corrige la flecha del logo blanco; entregas29,5s/4K restaurado y1080p revisadas, música sin empalmes, USD0. Escucha/aprobación pendientes; evidencia en CDR-008. [Retrospectiva integral](docs/operations/social/2026-09-24-sky-retrospectiva-produccion-v17.md): historia, fuentes finales, errores, aciertos, herramientas y límites de costos.

## 2026-09-24 — Gemini Omni 1.1 en la CLI local de video

`pnpm ai:omni` conecta Cloud Interactions API con ADC y GCS privado para generar desde texto, imagen, cuadros o referencias, editar y extender video. Los seis modos completaron canaries reales a 360p/16:9; se verificaron MP4 y tests locales. La operación requiere confirmación de gasto, estima el componente de salida y permite retomar por ID/estado local. [ADR](docs/architecture/GREENHOUSE_GEMINI_OMNI_CLI_DECISION_V1.md) · [manual y evidencia](docs/manual-de-uso/ai-tooling/gemini-omni-1-1-cli.md). Sin cambios en Globe ni despliegue. Resoluciones/ratios superiores y política de ciclo de vida GCS siguen pendientes.

## 2026-09-23 — Compositor de piezas con CTA: tramo 16 y corte de la novena auditoría

`pnpm foto:componer:cta` y `pnpm foto:cta:gate`, auditados nueve veces por pares de subagentes adversariales (diseño y
arquitectura) y robustecidos sin cambiar ninguna pieza aprobada (regresión: 132 de 132 idénticas):

- el gate distingue falla (1) de **no certificable (3)** y certifica por reproducción (`--reproducir`);
- contraste sobre el trazo; CTA a 4,5:1 siempre, con APCA y daltonismo bloqueantes; `placement` sólo endurece;
  el dominante es la voz mayor;
- excepciones con aprobador del registro (`scripts/foto/aprobadores.json`), sha256 del plate y tope (`hasta`);
- firma automática sólo en la banda del pie; firma externa declarada y leída de `signatureY` (v03–v07 la declaran);
- entradas con errores que nombran pieza y campo; texto alternativo con el rol del CTA siempre;
- proceso: bloqueo sin carreras, regresión que compara el veredicto del gate, mutantes contra corrida base y canarios.

Docs: [contrato §18–§19](docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md), funcional y manual en `creative/`,
skill `efeonce-advertising-creative`. La novena auditoría no emitió informes por límite semanal de Claude; no habrá
más rondas por instrucción del operador. La segunda corrida completa de 175 mutantes se detuvo con 81 detecciones
registradas, sin puntuación final. Persiste la intermitencia de P10; decisiones y cobertura faltante en §19.10.
CMP001-04 se reemplazó en la carpeta local sincronizada de OneDrive con respaldo y hash de lectura posterior;
sin readback del servidor, publicación ni pauta.

## 2026-09-22 — ISSUE-177 resuelto: ninguna función de Vercel vuelve a cargar el motor de PDF

Tres deploys de staging cayeron en tres semanas por funciones de Vercel de más de 250 MB (397, 434 y 441 MB),
siempre con el gate local en verde. Desde ahora:

- la entrada liviana `@/lib/artifact-composer/pure` y la regla ESLint `greenhouse/no-worker-only-module-in-vercel-code`
  impiden importar como valor el motor de composición (Playwright, pdf-lib, catálogos) desde `src/`;
- `pnpm vercel:reachability-gate` (pre-push y CI, ~2 s, sin build) recorre el grafo de imports de las 1.519 entradas
  del App Router y falla ante la denylist o una ruta de runtime variable nueva;
- `pnpm vercel:function-size-gate` mide el tamaño trazado de cada función tras el build de CI (falla sobre 200 MB);
- las rutas de lectura de Insights ya no cargan comandos ni render.

Reglas en `OPS_RELIABILITY_AGENT_INVARIANTS.md` §Tamaño de las funciones de Vercel.
