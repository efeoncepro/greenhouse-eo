# TASK-2047 — EO Portfolio: plugin «eo-portfolio», documento del proyecto y tres puertas

## Delta 2026-10-29 — implementación de los Slices 1 a 4

Decisiones tomadas al construir (`efeonce-public-site-runtime` ede185a):

- **Fixtures en el repo del runtime** (`tests/fixtures/portfolio/{sky,pabellontogo,anam}.json`), no en
  `scripts/public-website/portfolio/fixtures/`: las pruebas que los usan viven ahí y duplicarlos abre deriva. Llevan la
  marca `[fixture]` en aprobación, cifras y testimonio, y nunca se aplican en producción.
- **Catálogo de servicios** `schema/services.v1.json`: las 9 líneas de servicio de `docs/services/`; `sky-blog-seo` queda
  fuera porque es una instancia de cuenta, no un servicio.
- **Guardar un proyecto publicado** que lo deja sin aprobación con alcance falla (`eop_publish_gate`): hay que
  despublicarlo antes. La compuerta vive en el servicio, así que la cumplen admin, WP-CLI y restaurar.
- **Sin plantilla todavía**, una entrada publicada responde 404, su `post_content` (el JSON) nunca sale como contenido y
  el tipo queda fuera del sitemap de Yoast. Se enciende cuando `TASK-2048` engancha `eo_portfolio_render_entry`.
- **Adivinanza de 404 de WordPress** apagada bajo `/project/` y `/portafolio/` (`do_redirect_guess_404_permalink`).
- **Historial**: revisiones nativas de WordPress con meta `_eop_revision`, `_eop_hash`, `_eop_message` y `_eop_author`,
  igual que `eo-site-nav`; las publicaciones quedan en `_eop_publication` (quién, cuándo, revisión, referencia y alcance
  de la aprobación) y salen por `wp eo-portfolio log`, nunca por la REST.
- **`apply` todo o nada**: valida y revisa conflictos de todo el archivo antes de escribir; si falla a medias, vuelve
  los existentes a su revisión anterior y manda los nuevos a la papelera. `--snapshot` guarda el estado previo.
- **Proyección pública**: lista blanca de campos; agrega `format` (derivado de las dimensiones), `formats` del proyecto
  y `measure` (el primer porcentaje, sólo con alcance `metrics`). La lista `GET /eo/v1/portfolio` usa el contrato
  `portfolio-index.v1` con `cover` y `measure` según el alcance.
- **Despliegue**: `scripts/public-website/build-portfolio-plugin-package.cjs` y `deploy-portfolio-plugin-package.php`;
  el despliegue se niega si `/portafolio/` tiene páginas hijas.

## Delta 2026-10-29 — desde el cierre de TASK-2046

- WordPress adivina destinos para URLs 404 (`redirect_guess_404_permalink`) antes de que Yoast entregue un 410: por eso
  `/project/lifestyle-app/` responde 301 a la entrada real de Eusari. El plugin debe apagar esa adivinanza al menos bajo
  `/project/` y `/portafolio/` (`do_redirect_guess_404_permalink`) para que los 410 de los proyectos retirados se cumplan.
- Al duplicar entradas, WordPress copia `_wp_old_slug`; un proyecto nuevo nacido de un duplicado hereda redirecciones
  ajenas. El servicio de guardado no debe copiar ese meta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `interaction`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-2047-eo-portfolio-admin.md`
- Flow: `docs/ui/flows/TASK-2047-eo-portfolio-editing-flow.md`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-056`
- Status real: `Slices 1–4 code complete en local (2026-10-29, runtime ede185a): plugin, esquema, servicio, WP-CLI, REST y compuertas probadas sobre tres fixtures (121 comprobaciones en PHP puro, 53 en Playground y 21 por WP-CLI, con la estructura de enlaces de producción). Paquete y despliegue escritos; nada desplegado. Precheck de producción en solo lectura: 247116 sin páginas hijas ni reglas con «portafolio». Pendiente: OK del operador al diseño del admin (Slice 5) y autorización para desplegar`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop para docs; el codigo vive en efeonce-public-site-runtime con su contrato de rama y release acotado por SSH; sin worktrees`

## Summary

Crea el plugin `eo-portfolio` en el runtime de WordPress: el tipo de contenido `eo_project`, un documento JSON validado
por proyecto (esquema propio del plugin), taxonomías controladas y un solo servicio de guardado con tres puertas
(admin, `wp eo-portfolio` y JSON público de lectura). El servicio hace cumplir en las tres puertas la compuerta de
aprobación del cliente y la fuente obligatoria de cada cifra. Es la base de datos de la portada y la entrada de
`TASK-2048` y de la migración de `TASK-2049`.

## Why This Task Exists

El portafolio vive hoy en `ohio_portfolio` (plugin Ohio Portfolio 1.1.3): campos de texto libre en inglés en ACF
privado que la REST no expone, un solo video por iframe, sin proporción por pieza y 44 entradas demo mezcladas con 15
reales. PDR-028 decidió reemplazarlo por un contenido propio con el patrón de PDR-027 (documento validado, tres
puertas, render del servidor). Sin este plugin no hay dónde guardar «para quién», reto, idea, ejecución, resultados
con fuente, capítulos de piezas mixtas imagen/video ni la aprobación del cliente que PDR-020 §4.3 exige y que hoy sólo
es una regla editorial.

## Goal

- Un proyecto es un documento validado contra `schema/portfolio-entry.v1.json`; ningún guardado inválido llega a la base.
- Admin, WP-CLI y REST son clientes del mismo servicio de guardado y lectura; ninguna puerta tiene lógica propia.
- Sin aprobación del cliente con alcance no se publica, y cada elemento visible respeta su alcance; falla cerrado.
- La REST pública expone sólo proyectos publicados y nunca datos internos (aprobación, enlace a Greenhouse, revisiones).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md` (decisión rectora; §2 contenido, §3
  invariantes, §4 medios)
- `docs/public-site/decisions/PDR-027-navegacion-global-del-sitio-portable.md` §2 (patrón de tres puertas)
- `docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md` §4.3 (casos con compuerta de cliente)
- `docs/public-site/decisions/PDR-024-axis-en-el-sitio-publico-composicion-agentica.md` (AXIS en versión fija)
- `docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md` (servicio de guardado de `eo-site-nav`, modelo a
  replicar)

Reglas obligatorias:

- El esquema vive en el plugin; no se crea contrato en AXIS hasta que exista un segundo consumidor real (PDR-028 §2).
- Ninguna regla del servicio ni del render se decide por nombre de cliente, campaña o slug (PDR-028 §3.5).
- El plugin nunca guarda credenciales de GCP: el video se referencia por URL del bucket público de AXIS (PDR-028 §4).
- No se edita el tema padre Ohio ni el plugin Ohio Portfolio; `ohio_portfolio` sigue intacto hasta `TASK-2049`.

## Normative Docs

- `.claude/skills/efeonce-public-site-wordpress/SKILL.md` y sus referencias `runtime-and-discovery.md` y
  `native-navigation.md` (carril SSH, paquetes con `previousSha256`, purga de Kinsta)
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/services/README.md` (catálogo de servicios que alimenta la taxonomía `eo_service`)

## Dependencies & Impact

### Depends on

- PDR-028 aceptado (2026-10-23).
- Plugin modelo `eo-site-nav` en `efeonce-public-site-runtime/wp-content/plugins/eo-site-nav/`
  (`includes/class-eosn-store.php`, `class-eosn-validator.php`, `class-eosn-cli.php`, `class-eosn-rest.php`,
  `class-eosn-cache.php`, `schema/`).
- Carril de despliegue de plugins: `scripts/public-website/build-site-nav-plugin-package.cjs` y
  `deploy-site-nav-plugin-package.php` como modelo para el paquete de `eo-portfolio`.

### Blocks / Impacts

- `TASK-2048` (portada y entrada) lee del servicio de lectura de este plugin.
- `TASK-2049` (migración) usa `wp eo-portfolio apply|publish` para cargar las 15 entradas reales.
- `TASK-2046` corre en paralelo y no toca este plugin.

### Files owned

- `efeonce-public-site-runtime/wp-content/plugins/eo-portfolio/**` (nuevo)
- `scripts/public-website/build-portfolio-plugin-package.cjs` y `deploy-portfolio-plugin-package.php` (nuevos, en
  greenhouse-eo)
- `scripts/public-website/portfolio/fixtures/*.json` (nuevos: Sky, PabellonToGo, ANAM)
- `docs/ui/wireframes/TASK-2047-eo-portfolio-admin.md`
- `docs/ui/flows/TASK-2047-eo-portfolio-editing-flow.md`

## Current Repo State

### Already exists

- `eo-site-nav` resuelve el mismo problema para el menú: guardado en orden permiso → validar → idempotencia por hash →
  conflicto por revisión base → revisión con mensaje (`class-eosn-store.php`, meta `_eosn_revision`), WP-CLI, REST con
  `ETag` y purga de caché.
- `eo-axis-video` (bloque `efeonce/axis-video`, v0.2.0, no activo) define el modelo del reproductor que `TASK-2048`
  consumirá; este plugin sólo guarda los datos del medio.
- `eo-headless-content` registra un tipo `landing` no público (`includes/class-eoh-cpt.php`): precedente de tipo propio
  del runtime.
- `ohio_portfolio` publica 59 entradas (15 reales, 44 demo); sus campos viven en ACF privado del tema.
- Página Elementor 247116 sirve hoy `/portafolio/` con el widget `ohio_recent_projects`.
- Catálogo de servicios en `docs/services/` (creative-services, creative-studio, hubspot-as-a-service,
  media-distribution, revenue-operations-crm, salesforce, wave, channel-commerce, entre otros).

### Gap

- No existe un tipo de contenido que guarde el contexto del proyecto ni medios mixtos con dimensiones.
- No existe un esquema ni un validador del proyecto.
- La aprobación del cliente no está modelada en ningún sistema.
- No existe una lectura pública del portafolio en JSON.
- No hay pantalla para que una persona del equipo edite un proyecto con su estructura.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeonce-public-site-runtime/wp-content/plugins/eo-portfolio/` (WordPress en Kinsta)
- Future candidate home: `public`
- Boundary: servicio PHP de guardado y lectura del documento `portfolio-entry.v1`; consumidores autorizados: pantalla
  del admin, `wp eo-portfolio`, REST `GET /wp-json/eo/v1/portfolio` y las plantillas de `TASK-2048`
- Server/browser split: validación, compuertas, guardado y proyección pública corren en el servidor de WordPress; el
  navegador del visitante nunca escribe; la pantalla del admin sólo llama al servicio
- Build impact: plugin nuevo sin dependencias de terceros; esquema JSON versionado dentro del plugin
- Extraction blocker: `none` — la puerta JSON permite que Think o un sitio en Astro lean el contenido sin WordPress

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: persona del equipo con capability `eo_manage_portfolio` o `manage_options`, no técnica
- Momento del flujo: cargar un proyecto nuevo, completar su contexto y piezas, registrar la aprobación del cliente y
  publicarlo
- Resultado perceptible esperado: editar con la estructura real del proyecto, ver qué falta para publicar y no poder
  publicar sin aprobación
- Friccion que debe reducir: hoy el proyecto se edita en el formulario de Ohio con campos en inglés, sin galería de
  video ni forma de saber si el cliente aprobó
- No-goals UX: constructor visual de la entrada, edición de la portada, subida de video al bucket desde el admin

### Surface & system decision

- Surface: WordPress admin → «Portafolio» (menú propio del tipo `eo_project`) → pantalla de edición estructurada
- Nav placement: `none` — pantalla del admin de WordPress, no del portal Greenhouse
- Composition Shell: `no aplica` — admin de WordPress
- Primitive decision: `reuse` — componentes nativos del admin de WordPress; ningún componente de Greenhouse
- Adaptive density / The Seam: `no aplica`
- Floating/Sidecar/Dialog decision: selector de medios nativo de WordPress (`wp.media`) para imágenes; confirmación de
  publicar y de restaurar en línea, sin diálogos propios
- Copy source: `local one-off` — textos del plugin con su dominio de traducción `eo-portfolio`; el contenido del proyecto
  es dato del documento
- Access impact: `entitlements` — capability propia `eo_manage_portfolio` en WordPress (no es una capability de
  Greenhouse); `eo_publish_portfolio` separada para publicar

### State inventory

- Default: proyecto con su estado (borrador, listo para aprobar, publicado), revisión, autor y fecha
- Loading: guardando, con botón deshabilitado y «Guardando…»
- Empty: proyecto nuevo → secciones vacías con su ayuda; listado sin proyectos → «Todavía no hay proyectos. Crea el
  primero.»
- Error: validación fallida → no guarda; resumen de errores arriba con enlace a cada campo y error en línea
- Degraded / partial: URL de video que no responde o sin dimensiones → aviso en el medio y no se puede publicar
- Permission denied: sin `eo_manage_portfolio` el menú no aparece; sin `eo_publish_portfolio` el botón «Publicar» no
  existe y se explica quién puede publicar
- Long content: secciones colapsables; capítulos con muchos medios hacen scroll propio
- Mobile / compact: el admin no tiene objetivo móvil; sólo se verifica que no rompa en 390
- Keyboard / focus: secciones y medios navegables con teclado; foco al primer error tras un guardado fallido
- Reduced motion: sin animaciones propias

### Interaction contract

- Primary interaction: completar secciones, agregar medios a capítulos, guardar, registrar aprobación y publicar
- Hover / focus / active: nativos del admin
- Pending / disabled: «Guardar» deshabilitado mientras guarda o sin cambios; «Publicar» deshabilitado sin aprobación
  con alcance o con errores, con la razón visible
- Escape / click-away: aviso de cambios sin guardar al salir de la página
- Focus restore: al campo editado tras guardar; al primer error tras fallar
- Latency feedback: «Guardado como revisión N» o «Sin cambios»
- Toast / alert behavior: avisos estándar del admin de WordPress

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: sin animación propia
- Layout morph: ninguno
- Stagger: ninguno
- Timing / easing token: no aplica
- Reduced-motion fallback: no aplica, sin motion
- Non-goal motion: arrastre animado de medios

### Implementation mapping

- Route / surface: `wp-admin/post.php?post=<id>&action=edit` del tipo `eo_project` (editor clásico reemplazado por la
  pantalla estructurada) y `wp-admin/edit.php?post_type=eo_project`
- Primitive / variant / kind: componentes nativos del admin y `wp.media`
- Component candidates: secciones (Cliente y contexto, Reto/idea/ejecución, Resultados, Capítulos y piezas, Testimonio y
  equipo, Enlaces, SEO), panel lateral de estado y aprobación, historial de revisiones
- Copy source: textos del plugin (`eo-portfolio`)
- Data reader / command: servicio PHP `EOP_Store` (mismo que WP-CLI y REST)
- API parity: admin y `wp eo-portfolio apply|publish` usan el mismo servicio; la REST sólo lee
- Access / capability: `eo_manage_portfolio` (editar) y `eo_publish_portfolio` (publicar)
- States to implement: los del inventario de arriba

### GVC scenario plan

- Scenario file: Playwright sobre el admin local o de staging (nombre final en el discovery); el GVC del portal no aplica
- Route: `wp-admin/post-new.php?post_type=eo_project`
- Viewports: 1440×900 y 1280×800 (390×844 sólo para no romper)
- Quality profile: `premium`
- Required steps: crear proyecto → error de validación → agregar video con dimensiones → registrar aprobación →
  publicar → restaurar una revisión
- Required captures: un frame por paso
- Required `data-capture` markers: `eo-portfolio-sections`, `eo-portfolio-media`, `eo-portfolio-approval`,
  `eo-portfolio-history`
- Assertions: lo guardado es igual a `wp eo-portfolio export`; sin aprobación «Publicar» queda deshabilitado; restaurar
  crea revisión nueva
- Scroll-width checks: sin scroll horizontal de página en 1280
- Reduced-motion / focus evidence: foco al primer error
- Review dossier: adjunto a la task
- Baseline decision / surface ID: baseline nueva, `wp-admin-eo-portfolio`

### Design decision log

- Decision: pantalla estructurada propia sobre el mismo servicio que WP-CLI, con la aprobación en un panel lateral
  siempre visible
- Alternatives considered: campos de ACF (repite el problema de Ohio: datos invisibles para la REST y sin validación de
  conjunto); editar JSON crudo (no sirve para personas); editor de bloques de Gutenberg (mezcla presentación con datos y
  no valida el documento entero)
- Why this pattern: respeta el esquema, da paridad a personas y agentes y hace visible por qué no se puede publicar
- Reuse / extend / new primitive: reuse de componentes nativos de WordPress
- Open risks: no hay dirección visual aprobada para la pantalla; se aprueba antes del Slice 4

### Visual verification

- GVC scenario: ver plan de arriba
- Viewports: 1440×900 y 1280×800
- Required captures: los del plan
- Required `data-capture` markers: los del plan
- Scroll-width check: 1280
- Accessibility/focus checks: secciones con teclado, foco al error, etiquetas en todos los campos
- Before/after evidence: no aplica, pantalla nueva
- Known visual debt: diseño visual por aprobar
- Visual scorecard: `docs/ui/reviews/TASK-2047-eo-portfolio-admin.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: documento `portfolio-entry.v1` guardado en el tipo de contenido `eo_project` de WordPress
- Consumidores afectados: plantillas de `TASK-2048`, migración de `TASK-2049`, agentes por WP-CLI, REST pública (Think a
  futuro)
- Runtime target: `production` (WordPress en Kinsta)

### Contract surface

- Contrato existente a respetar: patrón del servicio de `eo-site-nav`; modelo de medio del reproductor `eo-axis-video`
  (`aspectRatio`, `poster`, pistas) [verificar campos exactos en `eo-axis-video.php`]
- Contrato nuevo o modificado:
  - esquema `schema/portfolio-entry.v1.json` (dentro del plugin);
  - servicio PHP `EOP_Store` (guardar, leer, publicar, restaurar) y `EOP_Validator`;
  - `wp eo-portfolio export|validate|apply|publish|unpublish|revisions|restore`;
  - `GET /wp-json/eo/v1/portfolio` y `GET /wp-json/eo/v1/portfolio/<slug>` (sólo lectura, `ETag`).
- Backward compatibility: `not applicable` (contrato nuevo; `ohio_portfolio` no se toca)
- Full API parity: admin y WP-CLI son clientes del mismo servicio; una herramienta de Greenhouse o MCP podrá llamar a
  `wp eo-portfolio` por el carril gobernado sin lógica paralela

### Data model and invariants

- Entidades/tablas/views afectadas: tipo `eo_project` (`wp_posts`, `wp_postmeta` con meta `_eop_document`,
  `_eop_revision`, `_eop_hash`) y taxonomías `eo_line`, `eo_service`, `eo_industry` [verificar nombres finales en el
  discovery]
- Invariantes que no se pueden romper:
  - todo documento guardado pasa `portfolio-entry.v1`; un guardado inválido no escribe nada;
  - no se publica sin `clientApproval` con `ref`, `date` y al menos un `scope`; la regla vive en el servicio y la
    cumplen las tres puertas;
  - la proyección pública omite lo que el alcance no cubre: sin `metrics` no hay `results`, sin `logo` no hay
    `logoMediaId`, sin `testimonial` no hay testimonio, sin `pieces` no hay medios;
  - toda cifra de `results` tiene `source`; sólo un `percent` con fuente habilita la órbita de medida;
  - todo medio tiene `width` y `height` reales y `alt`; todo video con voz tiene `captionsVtt`; el formato se deriva de
    las dimensiones;
  - ningún campo ni regla depende del nombre del cliente o de la campaña;
  - cada guardado crea una revisión con autor, fecha y mensaje; restaurar crea una revisión nueva y nunca borra historia;
  - un documento que deja de validar con una versión nueva del esquema no se sirve: se sirve la última revisión válida;
  - la REST pública nunca expone `clientApproval`, `client.greenhouseOrganizationId`, borradores ni revisiones.
- Write-target allowlist: `N/A` — dominio fuera de Greenhouse; las escrituras se limitan al tipo `eo_project`, sus
  taxonomías y la purga de caché
- Tenant/space boundary: un documento por proyecto en un solo sitio; `greenhouseOrganizationId` es un enlace opcional y
  no autoriza nada
- Idempotency/concurrency: `apply` con el mismo contenido no crea revisión (hash del documento sin campos asignados por
  el plugin); guardado con revisión base para detectar conflictos y no pisar en silencio, como `eo-site-nav`
- Audit/outbox/history: revisiones con autor y mensaje en el post; `publish` y `unpublish` registran quién, cuándo y con
  qué referencia de aprobación; exportación de respaldo al repo del runtime

### Migration, backfill and rollout

- Migration posture: `additive` (tipo de contenido y taxonomías nuevos; nada existente se modifica)
- Default state: plugin activo sin proyectos publicados; ninguna página lo consume hasta `TASK-2048`
- Backfill plan: no hay backfill en esta task; la carga de las 15 entradas es `TASK-2049`. Aquí sólo se aplican los tres
  fixtures en local o staging para probar las compuertas
- Rollback path: desactivar el plugin (sin consumidores, sin efecto visible); restaurar una revisión de un proyecto
- External coordination: operador aprueba el diseño del admin antes del Slice 4; registro de reglas de reescritura al
  activar (ver §Rollout)

### Security and access

- Auth/access gate: `eo_manage_portfolio` o `manage_options` para editar; `eo_publish_portfolio` o `manage_options`
  para publicar; REST pública de sólo lectura; WP-CLI sólo por el carril SSH gobernado
- Sensitive data posture: sin PII de visitantes; `clientApproval.ref` es una referencia opaca a dónde está registrada la
  aprobación (no copia el correo ni el nombre del contacto) y nunca sale por la REST
- Error contract: errores de validación legibles por campo en el admin y en WP-CLI (`--format=json`); la REST devuelve
  404 si el proyecto no está publicado
- Abuse/rate-limit posture: REST con caché (`ETag`, `Cache-Control` corto) detrás de Kinsta; sin escritura pública

### Runtime evidence

- Local checks: pruebas del plugin (validación, compuertas por alcance, idempotencia, conflicto, restaurar, proyección
  pública) sobre los tres fixtures
- DB/runtime checks: `wp eo-portfolio export <slug>` igual al documento aplicado; `wp eo-portfolio revisions <slug>` con
  autor y mensaje
- Integration checks: `curl` a `/wp-json/eo/v1/portfolio` (sólo publicados, `ETag`, sin campos internos)
- Reliability signals/logs: log de PHP ante documento inválido servido desde la última revisión válida; sin señal de
  Greenhouse
- Production verification sequence: ver §Production verification sequence

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime evidence (WP-CLI, REST, fixtures) is listed and captured.
- [ ] The public projection has no internal fields (approval, Greenhouse link, revisions).

## Hybrid Execution Justification

- Why not split: la pantalla del admin no tiene lógica propia; es un cliente delgado del mismo servicio que WP-CLI.
  Separarla duplicaría contexto, igual que en `TASK-2041` (precedente aprobado en EPIC-055).
- Primary execution profile: `backend-data`
- Contract boundary: el servicio `EOP_Store` es el contrato; la pantalla sólo lo llama y no se construye antes de que el
  servicio, WP-CLI y las compuertas estén verdes
- Risk controls: orden de slices obligatorio (servicio → WP-CLI → REST → compuertas probadas → admin); plugin sin
  consumidor hasta `TASK-2048`; diseño visual del admin aprobado antes del Slice 5

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Plugin, tipo de contenido, esquema y servicio de guardado

- `eo-portfolio.php`, registro de `eo_project` (`public`, `show_in_rest=false` para la REST genérica, `has_archive=false`,
  `rewrite=['slug'=>'portafolio','with_front'=>false]`) y de las taxonomías `eo_line`, `eo_service`, `eo_industry`.
- `schema/portfolio-entry.v1.json` y `EOP_Validator` (esquema + reglas de conjunto: aprobación, fuentes, dimensiones,
  alt, subtítulos).
- `EOP_Store`: guardar en orden permiso → validar → idempotencia por hash → conflicto por revisión base → revisión con
  mensaje; leer documento vigente y última revisión válida.
- Pruebas del servicio con los tres fixtures.

### Slice 2 — WP-CLI

- `wp eo-portfolio export|validate|apply|publish|unpublish|revisions|restore` sobre `EOP_Store`, con `--dry-run`,
  `--message` y salida `--format=json`.
- `apply` todo-o-nada con foto previa del estado; `publish` exige aprobación con alcance.

### Slice 3 — REST pública de lectura

- `GET /wp-json/eo/v1/portfolio` (lista de publicados con su contexto mínimo) y `GET /wp-json/eo/v1/portfolio/<slug>`
  (proyección pública del documento), con `ETag` y purga de caché en cada guardado.
- La proyección aplica el alcance de la aprobación y omite campos internos.

### Slice 4 — Compuertas probadas sobre tres fixtures

- Fixtures en `scripts/public-website/portfolio/fixtures/`: Sky (completo: video, capítulos, porcentaje con fuente,
  testimonio), PabellonToGo (mínimo: sin video ni cifras) y ANAM (sólo texto, sin medios, enlace al caso del blog).
- Pruebas que derivan lo esperado del propio fixture (qué alcance tiene, qué cifras tienen fuente), no de literales por
  cliente: sin aprobación no publica; quitar `metrics` del alcance oculta resultados en la proyección; una cifra sin
  fuente no valida; un video sin dimensiones no valida.

### Slice 5 — Pantalla del admin

- Pantalla estructurada del wireframe `TASK-2047-eo-portfolio-admin.md` sobre `EOP_Store`, con panel de aprobación y
  publicación, historial y restaurar.
- Capabilities `eo_manage_portfolio` y `eo_publish_portfolio` asignadas al rol administrador.

## Out of Scope

- Plantillas públicas de la portada y la entrada (`TASK-2048`).
- Carga de las 15 entradas reales, redirecciones, subida de video al bucket y desactivación de Ohio Portfolio
  (`TASK-2049`).
- Despublicar los demos de Ohio (`TASK-2046`).
- Contrato `efeonce.portfolio-entry` en AXIS (sólo con segundo consumidor, PDR-028 §2).
- Subir video desde el admin (el plugin no tiene credenciales de GCP).

## Detailed Spec

### Documento `portfolio-entry.v1`

```json
{
  "schema": "portfolio-entry.v1",
  "slug": "sky-airline-un-ano-de-campanas",
  "revision": 3,
  "client": { "name": "Sky Airline", "industry": "aerolinea", "logoMediaId": 1234, "greenhouseOrganizationId": null },
  "title": "Un año de campañas en cinco mercados",
  "audience": "Viajeros de cinco mercados, con ofertas que cambian por país",
  "need": "Lanzar campañas comerciales en días sin descuidar la marca",
  "line": "brand",
  "services": ["creative-services"],
  "period": { "from": "2025-09", "to": "2026-09" },
  "markets": ["[mercado]"],
  "steps": {
    "challenge": { "title": "…", "body": "…" },
    "idea": { "title": "…", "body": "…" },
    "execution": { "title": "…", "body": "…" }
  },
  "results": [
    { "value": "88", "label": "de las piezas, entregadas a tiempo", "kind": "percent", "source": "Caso «Un año con Sky», 2026" }
  ],
  "hero": { "mediaRef": "black-sky-spot", "lensFocus": { "x": 0.24, "y": 0.5 } },
  "chapters": [
    { "name": "Black Sky", "note": "1 campaña · video, reel y feed", "media": [
      { "id": "black-sky-spot", "kind": "video", "src": "https://storage.googleapis.com/efeonce-group-axis-public-media/portfolio/v1/sky/ultimo-llamado.mp4",
        "poster": "https://…/ultimo-llamado.poster.webp", "width": 1156, "height": 650, "alt": "Spot Black Sky, último llamado",
        "caption": "«Último llamado», spot", "hasVoice": false, "captionsVtt": null, "focus": { "x": 0.5, "y": 0.5 } }
    ] }
  ],
  "testimonial": { "quote": "…", "name": "…", "role": "…" },
  "credits": [ { "name": "…", "role": "Dirección creativa" } ],
  "links": { "canonicalCase": "https://…", "relatedServices": ["agencia-creativa"] },
  "clientApproval": { "ref": "[referencia opaca]", "date": "2026-10-23", "scope": ["logo", "pieces", "metrics", "testimonial"] },
  "seo": { "title": "…", "description": "…", "ogMediaId": 5678 }
}
```

- Medio: `kind` `image` (con `mediaId` de la biblioteca) o `video` (con `src`, `poster`, `captionsVtt` del bucket);
  `width` y `height` obligatorios; el formato (`9:16`, `4:5`, `1:1`, `16:9`, `3:1` u `otro`) lo calcula el servicio con
  tolerancia de redondeo y lo expone la proyección; no se guarda.
- `line` es un enum (`growth|brand|engine|voice|revenue`); `services` sólo acepta claves del catálogo de
  `docs/services/` copiado al plugin con versión [verificar formato del catálogo].
- `results[].kind`: `number|percent|text`; `source` obligatorio en todos.
- `hero.mediaRef` apunta a un `id` de medio existente; `lensFocus` en fracciones 0–1.
- Campos opcionales: `testimonial`, `credits`, `links.canonicalCase`, `client.logoMediaId`,
  `client.greenhouseOrganizationId`, `markets`, `chapters` (ANAM no tiene medios).

### Reglas de conjunto del validador

1. `publish` exige `clientApproval.ref`, `date` y `scope` no vacío.
2. Cada `results[]` exige `source`; `percent` exige `0 ≤ value ≤ 100`.
3. Cada medio exige `width`, `height`, `alt`; video exige `poster`; `hasVoice=true` exige `captionsVtt`.
4. `hero.mediaRef` existe en algún capítulo.
5. `slug` único entre `eo_project` y sin colisión con páginas hijas de `/portafolio/`.

### Decisión de URL y reescritura

- `eo_project` usa `has_archive=false` y `rewrite.slug=portafolio`: las entradas viven en `/portafolio/<slug>/`.
- `/portafolio/` sigue siendo la página 247116; `TASK-2048` reemplaza su contenido por la portada del portafolio. Se
  descarta tomar el archivo del tipo porque obligaría a borrar o mover la página que enlazan el menú, la Home y el pie.
- Las reglas de reescritura se registran en la activación del plugin (`flush_rewrite_rules` una sola vez en el hook de
  activación), nunca en cada carga.
- Antes de activar se verifica que 247116 no tenga páginas hijas cuyo slug choque con un proyecto [verificar].

### Revisiones

Se replica el esquema de `eo-site-nav` (`_eosn_revision`, hash sin campos asignados por el plugin, revisión base,
`force` sólo para restaurar) con prefijo `_eop_` [verificar si `eo-site-nav` guarda el historial en revisiones nativas de
WordPress o en meta propia, y replicar lo mismo].

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- El Slice 4 (compuertas probadas) cierra antes de que `TASK-2049` cargue un solo proyecto real.
- El Slice 5 no empieza sin el servicio, WP-CLI y las compuertas en verde y sin el diseño del admin aprobado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se publica un proyecto sin aprobación del cliente | Sitio público / relación con clientes | low | Compuerta en el servicio, no en la UI; prueba sobre los tres fixtures; `eo_publish_portfolio` separada | `wp eo-portfolio export` con `clientApproval` vacío y estado publicado |
| La REST expone campos internos | Sitio público | low | Proyección pública explícita (lista blanca de campos) con prueba | `curl` a la REST muestra `clientApproval` o `greenhouseOrganizationId` |
| La reescritura `portafolio/<slug>` rompe páginas existentes | Sitio público | medium | `has_archive=false`; verificar páginas hijas de 247116 antes de activar; flush sólo en activación | 404 en `/portafolio/` o en una página hija tras activar |
| Persona y agente se pisan | Contenido del sitio | medium | Revisión base con conflicto visible en el admin y error en WP-CLI | Revisiones con la misma base y autores distintos |
| Cambio de esquema invalida documentos ya publicados | Sitio público | low | Se sirve la última revisión válida y se registra en el log | Log de PHP «documento inválido, se sirve revisión N» |
| Caché de Kinsta sirve la versión vieja | Sitio público | medium | Purga en cada guardado; `ETag` | Diferencia entre `export` y lo servido |

### Feature flags / cutover

- Sin flag propio: el plugin no tiene consumidor visible hasta `TASK-2048`. Activarlo en producción sólo registra el
  tipo, las taxonomías, la REST y la pantalla; no cambia ninguna página pública.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Desactivar el plugin; las reglas de reescritura se limpian en la desactivación | < 10 min | si |
| Slice 2 | Igual que Slice 1 | < 10 min | si |
| Slice 3 | Desactivar el endpoint o el plugin | < 10 min | si |
| Slice 4 | Sin efecto en producción (fixtures sólo en local o staging) | inmediato | si |
| Slice 5 | Ocultar la pantalla; WP-CLI sigue operando | < 10 min | si |

### Production verification sequence

1. `pnpm public-website:ssh-check`.
2. Verificar páginas hijas de 247116 y reglas de reescritura actuales.
3. Export del código vivo y paquete con guarda `previousSha256`; deploy del plugin desactivado; activar.
4. `curl -I` a `/portafolio/` (200, la página de siempre) y a `/portafolio/no-existe/` (404).
5. `wp eo-portfolio validate --file` con el fixture de PabellonToGo; `apply --dry-run`; no se publica nada real en esta
   task.
6. `curl` a `/wp-json/eo/v1/portfolio` (200, lista vacía, `ETag`).
7. Admin: crear un borrador de prueba, verificar que «Publicar» queda deshabilitado sin aprobación y eliminar el borrador.

### Out-of-band coordination required

- Operador: aprobar el diseño visual del admin antes del Slice 5.
- Kinsta: purga de caché tras activar.
- Sesiones que estén tocando el runtime (`TASK-2042`, `TASK-2044`, `TASK-2045`): coordinar el deploy del paquete.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El plugin `eo-portfolio` registra `eo_project` con `has_archive=false` y entradas en `/portafolio/<slug>/`, y
      `/portafolio/` sigue sirviendo la página 247116. (Verificado en Playground con la estructura de enlaces de producción; falta en producción tras el despliegue.)
- [x] `schema/portfolio-entry.v1.json` existe en el plugin y `wp eo-portfolio validate` rechaza un documento inválido sin
      escribir nada. (Archivo `schema/portfolio-entry.v1.schema.json`; Playground + WP-CLI, 2026-10-29)
- [ ] `wp eo-portfolio publish` falla sin `clientApproval` con `ref`, `date` y `scope`, y la pantalla del admin muestra
      «Publicar» deshabilitado con la razón. (La mitad de WP-CLI y el servicio, verificada; la pantalla es el Slice 5.)
- [x] Una cifra sin `source` no valida, y un video sin `width`, `height` o `poster` no valida. (`tests/eo-portfolio.test.php`)
- [x] La proyección pública omite resultados, logo, testimonio o medios cuando el alcance de la aprobación no los cubre. (PHP puro y REST en Playground)
- [ ] `GET /wp-json/eo/v1/portfolio` devuelve sólo proyectos publicados, con `ETag`, y nunca `clientApproval`,
      `greenhouseOrganizationId` ni revisiones. (Verificado en Playground; falta el `curl` en producción.)
- [x] `apply` del mismo documento no crea revisión nueva, y un guardado con revisión base vieja devuelve conflicto. (Playground y WP-CLI)
- [x] Las pruebas corren sobre los fixtures de Sky, PabellonToGo y ANAM, y lo esperado se deriva de cada fixture. (`tests/fixtures/portfolio/` del runtime)
- [x] Ningún archivo del plugin compara contra nombres de cliente, campaña o slug. (Guarda en `tests/eo-portfolio.test.php` sobre los nombres, slugs y capítulos de los fixtures)
- [ ] El wireframe y el flujo del admin existen y el diseño visual fue aprobado antes del Slice 5.
- [ ] `UI ready` permanece `no` hasta que el wireframe y el `## UI/UX Contract` tengan implementation mapping, GVC
      scenario plan y design decision log aprobados.

## Verification

- Pruebas del plugin (PHP) sobre los tres fixtures [verificar runner: el modelo de `eo-site-nav` o los scripts
  `verify-*.php` del carril]
- `node scripts/public-website/build-portfolio-plugin-package.cjs` y deploy por el carril SSH
- `curl` a la REST y `wp eo-portfolio export` en producción
- Playwright del admin según el GVC scenario plan
- `pnpm task:lint --task TASK-2047`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Arquitectura del portafolio documentada (`docs/architecture/public-site/`) con el esquema, las compuertas y las
      tres puertas, y la skill `efeonce-public-site-wordpress` actualizada (`.claude` y `.codex`).
- [ ] Manual de uso en `docs/manual-de-uso/` para cargar, aprobar y publicar un proyecto.

## Follow-ups

- Contrato `efeonce.portfolio-entry` en AXIS cuando exista un segundo consumidor (Think o el sitio en Astro).
- Herramienta de Greenhouse o MCP que llame a `wp eo-portfolio` por el carril gobernado.

## Open Questions

- Dónde se registra la aprobación del cliente que `clientApproval.ref` referencia (HubSpot, documento en
  `docs/commercial/` u otro); lo decide el operador antes de `TASK-2049` (PDR-028, pendiente 2).
- Si `eo_publish_portfolio` se asigna además a un rol de editor de contenido.
