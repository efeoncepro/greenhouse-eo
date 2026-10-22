# TASK-2041 — Navegación global: plugin «EO Navegación», documento del menú y fotos

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
- Wireframe: `docs/ui/wireframes/TASK-2041-eo-navegacion-admin.md`
- Flow: `docs/ui/flows/TASK-2041-eo-navegacion-editing-flow.md`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-055`
- Status real: `Slices 1 a 3 code complete y probados. Slice 4: plugin 0.1.0 desplegado y activo en efeoncepro.com (2026-10-22, sin documento: sitio sin cambios) y 51 fotos en el bucket; falta el apply del documento inicial (con autorización). Slice 5: diseño del admin`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop para docs; el codigo vive en efeonce-public-site-runtime con su contrato de rama y release acotado por SSH; sin worktrees`

## Summary

Crea la fuente de verdad del menú global.

- **Qué es:** un plugin propio de WordPress, «EO Navegación». Guarda el menú como un solo documento `site-nav.v1`
  validado, con revisiones nativas.
- **Puertas:** tiene tres sobre el mismo command de guardado:
  - una pantalla del admin para personas;
  - comandos `wp eo-nav` para agentes;
  - una REST pública de sólo lectura para otros sitios.
- **Fotos:** sube las del menú al bucket público de AXIS (`site-nav/v1/`) con nombres versionados y caché inmutable.
- **Contenido inicial:** carga el documento con lo aprobado en el canvas.

## Why This Task Exists

Hoy el contenido del menú vive en dos lugares que no se hablan: los ítems del término 61 de WordPress, que no guardan
líneas ni fotos por recorte, y un `nav.ts` escrito a mano en el sitio Astro antiguo. El canvas aprobado agrega
estructura (líneas, servicios, respuestas, fotos, contexto «Estás aquí», formatos de Recursos) que ningún lugar actual
puede guardar.

El operador pidió dos cosas:

- que el menú se administre desde WordPress y también por una vía que los agentes puedan actualizar;
- que no haya dos fuentes que se pisen.

## Goal

- Un documento único del menú, validado, con historial y vuelta atrás, que editan personas y agentes por el mismo
  command.
- Una copia pública que cualquier sitio puede leer sin depender del admin.
- Las fotos del menú servidas desde el bucket de AXIS y el documento inicial cargado con el contenido aprobado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md` (§Modelo de datos, §Datos dinámicos, §Plugin,
  §Fotos)
- `docs/public-site/decisions/PDR-027-navegacion-global-del-sitio-portable.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/PUBLIC_SITE_KINSTA_ACCESS_AGENT_INVARIANTS.md`

Reglas obligatorias:

- **Una sola fuente de verdad:** el documento del plugin. Ningún otro archivo editable compite con él; la exportación al
  repo es respaldo.
- **Admin y WP-CLI llaman al mismo servicio de guardado.** Cero validación o guardado duplicados en la pantalla.
- **Validación contra `site-nav.v1`** copiado del contrato de AXIS con versión fijada. Si falla, no se guarda nada.
- **El plugin no sube a GCP** ni guarda credenciales de GCP en Kinsta.
- **Escrituras en vivo** sólo por el carril gobernado:
  1. `pnpm public-website:ssh-check`;
  2. foto previa;
  3. `pnpm public-website:wpcli`;
  4. nunca imprimir ni guardar contraseñas de aplicación ni tokens.
- **Fotos nunca sobrescritas:** un cambio es un objeto nuevo.

## Normative Docs

- Skill `efeonce-public-site-wordpress`: referencias `runtime-and-discovery.md`, `custom-elementor-widgets.md`
  (§Deployment Rail) y `elementor-mutation.md`.
- Skill `gcp-operator` o el manual de buckets del repo, para la subida con `gcloud storage`.
- Canvas «Mega menú efeoncepro.com» (versión 67), fuente del contenido inicial, con la nota «Por confirmar».

## Dependencies & Impact

### Depends on

- `TASK-2040` Slice 1: esquema `site-nav.v1` publicado en `axis-ui-contracts`.
- Repo `efeonce-public-site-runtime` (checkout local `/Users/jreye/Documents/efeonce-public-site-runtime`) y su carril de
  release acotado por SSH.
- Bucket `gs://efeonce-group-axis-public-media` (público, acceso uniforme).
- Fotos aprobadas del menú: `ai-generations/2026-10-18_menu-sitio/web/` y otras carpetas de `ai-generations`. 17 de las
  74 que usa el canvas no tienen archivo local y se bajan del canvas.

### Blocks / Impacts

- `TASK-2042` lee el documento publicado y la REST de este plugin.
- Futuro adaptador de Think: lee la REST pública.
- Skill `efeonce-public-site-wordpress`: se agrega la referencia del plugin y de los comandos `wp eo-nav`.

### Files owned

- `docs/ui/wireframes/TASK-2041-eo-navegacion-admin.md`
- `docs/ui/flows/TASK-2041-eo-navegacion-editing-flow.md`
- En `efeonce-public-site-runtime`: `wp-content/plugins/eo-site-nav/`
- Exportación de respaldo del documento en el repo del runtime: `manifests/site-nav/efeoncepro.com.json`
- `gs://efeonce-group-axis-public-media/site-nav/v1/` (objetos)

## Current Repo State

### Already exists

- Diseño y contenido aprobados en el canvas: líneas, servicios, respuestas por servicio aprobadas el 2026-10-17, fotos
  por servicio y textos alternativos.
- 57 fotos del canvas con archivo local identificado por hash el 2026-10-18; mapa en la carpeta temporal de la sesión,
  reproducible cruzando el listado de assets del canvas con `shasum` de `ai-generations`.
- Bucket público de AXIS con política `allUsers:objectViewer`, usado ya por firma de correo, logo animado, Nexa, Glitch, Sparks
  y perfiles sociales.
- Carril de release del sitio: `pnpm public-website:export-live-code`, paquete con guarda `previousSha256`, deploy con
  respaldo, OPcache y purga de Kinsta.

### Gap

- No existe el plugin, el tipo de contenido, la validación, el admin, los comandos `wp eo-nav` ni la REST pública.
- No existe el documento `site-nav.v1` del sitio.
- No existe la carpeta `site-nav/` en el bucket. La tableta horizontal usa el recorte `op` con `object-position`, como el
  canvas: no hace falta un recorte `op-s` (retirado el 2026-10-22).
- Quedan pendientes de contenido de la nota «Por confirmar»: orden de servicios, respuestas por línea, URL de YouTube,
  títulos de lecturas y lectura propia de Influencer y Performance.
- **Resuelto (operador, 2026-10-20):** la franja «suscribirse a Glitch» de Recursos apunta a la suscripción del blog,
  que es la misma lista que Glitch. No se crea formulario ni lista propia del menú. El documento la guarda en
  `strip.cta` del panel editorial (`action: "link"`, `fallbackHref`), campo fijado por el esquema `site-nav.v1`
  (`TASK-2040`); hoy apunta a `/blog/`, hasta que `TASK-1802` publique un ancla estable. Hoy esa suscripción es el formulario CF7 de `/blog`; su reemplazo por el Growth
  Form `efeonce-blog-subscription` sigue sin publicar (auditoría `2026-10-20-blog-growth-form-preparation.md`). El
  enlace apunta al bloque de suscripción del blog y no cambia cuando cambie el formulario. Fuente: `TASK-1802`, Delta
  2026-10-20.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeonce-public-site-runtime/wp-content/plugins/` (WordPress en Kinsta)
- Future candidate home: `public`
- Boundary: servicio PHP de guardado del documento (validar → revisión → copia pública → purga); consumidores: pantalla
  del admin, `wp eo-nav`, REST `GET /wp-json/eo/v1/site-nav` y adaptador de `TASK-2042`
- Server/browser split: guardado, validación y datos dinámicos corren en el servidor de WordPress; el navegador del visitante nunca llama a la REST del plugin;
  la pantalla del admin sólo llama al servicio
- Build impact: plugin nuevo sin dependencias de terceros; esquema JSON copiado con versión fijada
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: persona del equipo con permiso `eo_manage_site_nav` o `manage_options`, no técnica
- Momento del flujo: cambiar textos, enlaces, fotos u orden del menú
- Resultado perceptible esperado: editar sin romper la estructura, ver cómo queda y volver atrás
- Friccion que debe reducir: hoy el menú no se puede editar con su estructura real; sólo con JSON o código
- No-goals UX: editor visual arrastrar y soltar del menú en vivo, edición del pie de página

### Surface & system decision

- Surface: WordPress admin → Ajustes → «Navegación del sitio»
- Nav placement: `none` — pantalla del admin de WordPress, no del portal Greenhouse
- Composition Shell: `no aplica` — admin de WordPress
- Primitive decision: `reuse` — componentes nativos de WordPress (`@wordpress/components` o formularios del admin)
- Adaptive density / The Seam: `no aplica`
- Floating/Sidecar/Dialog decision: confirmación de restaurar en línea, sin ventanas superpuestas; vista previa embebida
- Copy source: `local one-off` — textos del plugin con su dominio de traducción; el contenido del menú es dato del
  documento
- Access impact: `entitlements` — capability propia `eo_manage_site_nav` en WordPress (no es una capability de
  Greenhouse)

### State inventory

- Default: documento publicado con su revisión, autor y fecha
- Loading: guardando, con botón deshabilitado y «Guardando…»
- Empty: sin documento → «Importar documento inicial» o «Crear vacío»
- Error: validación fallida → no guarda; lista de errores con enlace al nodo y error en línea
- Degraded / partial: fuente dinámica de Recursos caída → aviso de que se usará el destacado fijo
- Permission denied: la pantalla no aparece; el acceso directo devuelve el aviso estándar de WordPress
- Long content: el árbol colapsa ramas; el editor de nodo hace scroll propio
- Mobile / compact: el admin no tiene objetivo móvil; sólo se verifica que no rompa en 390
- Keyboard / focus: árbol navegable con teclado; foco al primer error tras un guardado fallido
- Reduced motion: sin animaciones propias

### Interaction contract

- Primary interaction: seleccionar un nodo, editarlo y guardar
- Hover / focus / active: nativos del admin
- Pending / disabled: «Guardar» deshabilitado mientras guarda o sin cambios
- Escape / click-away: aviso de cambios sin guardar al salir de la página
- Focus restore: al nodo editado tras guardar; al primer error tras fallar
- Latency feedback: estado de guardado y aviso «Publicado como revisión N»
- Toast / alert behavior: avisos estándar del admin de WordPress

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: sin animación propia
- Layout morph: ninguno
- Stagger: ninguno
- Timing / easing token: no aplica
- Reduced-motion fallback: no aplica, sin motion
- Non-goal motion: animaciones en el árbol

### Implementation mapping

- Route / surface: `wp-admin/options-general.php?page=eo-site-nav`
- Primitive / variant / kind: componentes nativos del admin
- Component candidates: árbol del documento, editor de nodo, selector de foto (URL o biblioteca), historial con diff y
  vista previa
- Copy source: textos del plugin
- Data reader / command: servicio PHP de guardado y lectura del documento (mismo que WP-CLI)
- API parity: admin y `wp eo-nav apply` usan el mismo servicio
- Access / capability: `eo_manage_site_nav` o `manage_options`
- States to implement: los del inventario de arriba

### GVC scenario plan

- Scenario file: Playwright sobre el admin de staging o local (nombre final en el discovery); GVC del portal no aplica
- Route: `wp-admin/options-general.php?page=eo-site-nav`
- Viewports: 1440×900 y 1280×800 (y 390 sólo para no romper)
- Quality profile: `premium`
- Required steps: editar un servicio y guardar → error de validación → restaurar una revisión → vista previa
- Required captures: un frame por paso
- Required `data-capture` markers: `eo-site-nav-tree`, `eo-site-nav-editor`, `eo-site-nav-history`
- Assertions: el documento guardado es igual al de `wp eo-nav export`; el error no guarda; restaurar crea revisión nueva
- Scroll-width checks: sin scroll horizontal de página en 1280
- Reduced-motion / focus evidence: foco al primer error
- Review dossier: adjunto a la task
- Baseline decision / surface ID: baseline nueva, `wp-admin-eo-site-nav`

### Design decision log

- Decision: pantalla propia con árbol y editor de nodo, sobre el mismo servicio que WP-CLI
- Alternatives considered: «Apariencia → Menús» con metadatos extra (no guarda la estructura); editar JSON crudo (no
  sirve para personas); editor en Greenhouse (agrega un sistema más sin necesidad hoy)
- Why this pattern: respeta el esquema y da paridad a personas y agentes
- Reuse / extend / new primitive: reuse de componentes nativos de WordPress
- Open risks: no hay dirección visual aprobada para la pantalla; se aprueba antes de construir

### Visual verification

- GVC scenario: ver plan de arriba
- Viewports: 1440×900 y 1280×800
- Required captures: los del plan
- Required `data-capture` markers: los del plan
- Scroll-width check: 1280
- Accessibility/focus checks: árbol con teclado y foco al error
- Before/after evidence: no aplica, pantalla nueva
- Known visual debt: diseño visual por aprobar
- Visual scorecard: `docs/ui/reviews/TASK-2041-eo-navegacion-admin.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: documento `site-nav.v1` en el tipo de contenido privado `eo_site_nav` de WordPress
- Consumidores afectados: adaptador WordPress (`TASK-2042`), REST pública (Think a futuro), agentes por WP-CLI
- Runtime target: `production` (WordPress en Kinsta) y bucket de GCP

### Contract surface

- Contrato existente a respetar: esquema `site-nav.v1` de `efeonce.site-nav` (`TASK-2040`)
- Contrato nuevo o modificado:
  - servicio PHP de guardado;
  - `wp eo-nav export|validate|apply|revisions|restore`;
  - `GET /wp-json/eo/v1/site-nav` (sólo lectura, `ETag`).
- Backward compatibility: `not applicable` (contrato nuevo)
- Full API parity: el admin y WP-CLI son clientes del mismo servicio de guardado; una herramienta de Greenhouse o MCP
  podrá llamar a la misma puerta sin lógica paralela

### Data model and invariants

- Entidades/tablas/views afectadas: tipo de contenido `eo_site_nav` (una entrada por sitio) con revisiones nativas de
  WordPress (`wp_posts`, `wp_postmeta`)
- Invariantes que no se pueden romper:
  - un solo documento publicado por sitio;
  - todo documento guardado pasa el esquema `site-nav.v1`;
  - cada guardado crea una revisión con autor, fecha y mensaje; restaurar crea una revisión nueva y nunca borra historia;
  - todas las fotos tienen texto alternativo;
  - la REST pública sólo expone el documento publicado, nunca borradores ni revisiones.
- Write-target allowlist: `N/A` — dominio fuera de Greenhouse; las escrituras quedan limitadas al tipo `eo_site_nav` y
  a la purga de caché
- Tenant/space boundary: un documento por sitio (`site`); sin datos de clientes
- Idempotency/concurrency: `apply` con el mismo contenido no crea revisión nueva (hash del documento); guardado con
  control de revisión base para detectar conflictos y no pisar en silencio
- Audit/outbox/history: revisiones nativas con autor y mensaje; exportación de respaldo al repo del runtime

### Migration, backfill and rollout

- Migration posture: `additive` (tipo de contenido nuevo; nada existente se modifica)
- Default state: plugin activo con documento cargado, pero sin consumidor hasta que `TASK-2042` prenda el interruptor
- Backfill plan:
  1. `wp eo-nav validate --file` en local;
  2. `apply` en vivo con mensaje;
  3. `export` para verificar igualdad.

  Fotos: subida a `site-nav/v1/` con `Cache-Control` inmutable; verificación por `curl -I` de cada URL del documento.
- Rollback path: desactivar el plugin (el sitio sigue con Ohio porque `TASK-2042` aún no consume); restaurar una
  revisión; las fotos no se revierten (objetos nuevos inmutables, sin efecto si nadie los usa)
- External coordination: coordinar la subida al bucket con cualquier sesión que esté tocando AXIS; confirmar con el
  operador los pendientes de contenido antes del `apply` inicial

### Security and access

- Auth/access gate: capability `eo_manage_site_nav` o `manage_options` para escribir; REST pública de sólo lectura;
  WP-CLI sólo por el carril SSH gobernado
- Sensitive data posture: sin PII ni secretos; el documento es contenido público del sitio
- Error contract: errores de validación legibles por nodo en el admin y en WP-CLI; la REST devuelve 404 si no hay
  documento publicado
- Abuse/rate-limit posture: REST con caché (`ETag`, `Cache-Control` corto) detrás de Kinsta; sin escritura pública

### Runtime evidence

- Local checks: pruebas del plugin (validación, idempotencia, conflicto, restaurar)
- DB/runtime checks: `wp eo-nav export` igual al documento aplicado; `wp eo-nav revisions` con autor y mensaje
- Integration checks: `curl` a `/wp-json/eo/v1/site-nav` con `ETag`; `curl -I` a cada foto (200 y `Cache-Control`
  inmutable)
- Reliability signals/logs: log de PHP ante documento inválido; sin señal de Greenhouse
- Production verification sequence: ver §Production verification sequence

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime evidence (WP-CLI, REST, fotos) is listed and captured.

## Hybrid Execution Justification

- Why not split: la pantalla del admin no tiene lógica propia; es un cliente delgado del mismo servicio que WP-CLI.
  Separarla en otra task duplicaría contexto y el operador pidió tasks compactas (EPIC-055).
- Primary execution profile: `backend-data`
- Contract boundary: el servicio PHP de guardado es el contrato; la pantalla sólo lo llama y no se construye antes de
  que el servicio y WP-CLI estén verdes
- Risk controls: orden de slices obligatorio (servicio y WP-CLI → REST → fotos y documento → admin); plugin sin
  consumidor hasta `TASK-2042`; diseño visual del admin aprobado antes del Slice 4

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Discovery y plan (2026-10-22)

Revisado con la sesión «Rediseño de Menú», autora del canvas y de esta task.

**Auditoría:**
- Runtime vigente: `/Users/jreye/Documents/efeonce-public-site-runtime` en `main` (el directorio `-develop` es un
  worktree de `develop` del mismo repo). `main` local tiene WIP ajeno y está 5 adelante y 1 atrás de `origin`: el plugin
  es un directorio nuevo y no toca ese WIP.
- Plugins propios con prefijo `eo-`; ninguno usa `eo/v1`, `ETag` ni una capability propia: `eo_manage_site_nav` es la
  primera. Patrón de CPT privado con revisiones: `eo-headless-content/includes/class-eoh-cpt.php`. Patrón de WP-CLI:
  `greenhouse-wp-bridge` (`WP_CLI::add_command`, una función por subcomando).
- Sin Composer ni librería de JSON Schema: la validación PHP interpreta el mismo `site-nav.v1.schema.json` (el mismo
  subconjunto que el validador de AXIS) y se prueba contra casos generados desde AXIS para que ambos lados coincidan.
- Pruebas del runtime: scripts `php tests/<x>.test.php` sin runner. PHP 8.5 local; WordPress Playground disponible para
  probar WP-CLI y REST de punta a punta sin tocar producción.
- Deploy: no hay carril para el plugin. Se copia el patrón acotado de Creativa (paquete con `previousSha256`, lista de
  rutas permitidas, respaldo, OPcache, purga) y se agrega `wp-content/plugins/eo-site-nav` a `TARGETS` de
  `export-live-code-baseline.ts`.
- Purga desde el admin: ningún plugin purga Kinsta desde una petición web; se diseña en el Slice 1 (verificar en vivo qué
  expone el MU de Kinsta) y WP-CLI usa `kinsta cache purge --all` como el resto del carril.
- Bucket: no existe script con caché inmutable; se escribe uno con guarda contra sobrescritura.
- Fotos: las 51 del documento son los recortes finales del canvas v68 (2× del tamaño en pantalla). `op-s` se retiró.

**Avance 2026-10-22 (Slices 1 a 3, local):** plugin en el runtime (`13cb164`, sin push). Servicio de guardado,
`wp eo-nav`, REST y Recursos probados en WordPress Playground con `tests/playground/run-eo-site-nav.sh` (44 checks
dentro de WordPress más WP-CLI real con el PHP local) y paridad del validador (35 casos). Qué es dinámico en Recursos,
acordado con la sesión del menú:

| Formato | Lista | Destacado |
|---|---|---|
| Glitch (`wp-category`) | Dinámica; tipo desde el prefijo del título | Dinámico (título, extracto, enlace, sello, CTA) |
| Marketing con Manzanitas (`wp-post-type`) | Dinámica, sin categorías con formato propio | Fijo |
| Herramientas (`think-feed`) | Fija | Fija: Think no tiene feed; pendiente del repo de Think |
| Guías descargables | Fija | Fija |

Hallazgos de la prueba: sin usuario, `get_posts` no devuelve el documento privado, y el adaptador pinta el menú a
visitantes anónimos, así que la lectura va por consulta directa. La lista del blog repetía los posts de Glitch.
El carril de deploy acotado ya existe: `eo-site-nav` está en `TARGETS` y hay scripts de armado y deploy.

**Excepción de fotos (2026-10-22):** las 9 fotos del polo solo (engine, web, seo y revenue en `mm` y `op`, más
`contacto-op`) quedan como están. Lo decidió el operador («Déjalas así; ya las aprobé en el canvas»), según transmitió la
sesión del menú. La excepción vale sólo para estas fotos del menú; no cambia la regla de vestuario para piezas nuevas.

**Fotos subidas (2026-10-22, autorizado por el operador en esta sesión):** 51 objetos en
`gs://efeonce-group-axis-public-media/site-nav/v1/<slug>-<recorte>.webp`: 20 `mm`, 28 `op` y 3 `card`. El prefijo
`site-nav/` estaba vacío y se subió con `--no-clobber`. Ninguna otra sesión estaba trabajando en AXIS (ListAgents). Son,
byte por byte, los archivos del canvas v68 (los mismos de `apps/lab/public/site-nav/v1/` en AXIS). Los tres `hero-*`
del Lab son sólo de la demo y no se subieron.

Cinco tienen una medida distinta a la nominal y se subieron tal cual, porque son las aprobadas en el canvas y la regla
es no reescalar:

| Foto | Medida real | Medida nominal |
|---|---|---|
| `glitch-card` | 880×472 | 880×496 |
| `manzanitas-card` | 880×472 | 880×496 |
| `engine-op` | 830×900 | 996×1080 (misma proporción, menos resolución) |
| `nosotros-op` | 1120×1400 | 996×1080 |
| `portafolio-op` | 1120×1400 | 996×1080 |

El panel las encuadra con `object-fit: cover`. Si alguna se vuelve a recortar, se sube como archivo nuevo
(`.v2`) y nunca se sobrescribe.

**Deploy del plugin (2026-10-22, autorizado por el operador «sin aplicar todavía el documento del menú»):**

- **Comprobación previa en vivo (sólo lectura):** sin plugin, ruta `eo/v1`, tipo de contenido ni opciones `eosn_`.
  Producción corre PHP 8.2 y WP 7.1.3. El objeto de purga de Kinsta (`Kinsta\KMP`) existe y `timezone_string` está
  vacío.
- **Ensayo:** el mismo paquete se desplegó primero en un WordPress desechable de Playground.
- **Deploy:**
  - Paquete de 10 archivos, todos nuevos, desde runtime `b0dd479`, con sha256 `33f97058…`.
  - Respaldo en `/tmp/eo-site-nav-before-20261022-210707.tar`.
  - La activación dentro del deploy falló con «cabecera no válida»: WP-CLI tenía en caché la lista de plugins de
    antes de escribir los archivos. Se activó en un proceso aparte, limpiando esa caché, y el script ya la limpia.
- **Verificado en vivo:**
  - Los 10 archivos coinciden con el manifiesto; el plugin está activo; los administradores tienen
    `eo_manage_site_nav`.
  - La REST responde `404 eosn_not_found`, y POST da 404.
  - `wp eo-nav` tiene sus 5 subcomandos; `revisions` y `export` responden sin documento.
  - Recursos resuelve con los posts reales («FLASH · 28 SEP | Sonnet 5.5 roza a Opus… | Leer el Flash», ediciones 17,
    16 y 15) y el blog sin Glitch. Las cachés temporales de la prueba se borraron.
  - La portada y `/agencia-creativa/` siguen con la cabecera de Ohio y sin marcado del menú.
- **Rollback:** `wp plugin deactivate eo-site-nav` y borrar `wp-content/plugins/eo-site-nav/` (los 10 archivos eran
  nuevos).

**Decisiones:** directorio `eo-site-nav`, prefijo `EOSN_`, text domain `eo-site-nav`, comandos `wp eo-nav`, REST
`eo/v1/site-nav`. Respaldo del documento en el runtime: `manifests/site-nav/efeoncepro.com.json`.

**Plan por slices** (sin escrituras en producción hasta autorización explícita del operador):
1. Plugin y servicio de guardado, local, con pruebas PHP (validar, idempotencia por hash, conflicto por revisión base,
   revisión con autor y mensaje, copia publicada con `ETag`, purga).
2. Esquema vendorizado con versión y hash, validador PHP con paridad contra AXIS, y `wp eo-nav`
   `export|validate|apply|revisions|restore`. Verificación en WordPress Playground.
3. REST `GET /wp-json/eo/v1/site-nav` (`ETag`, `304`, caché corta, `404` sin documento) y datos dinámicos de Recursos
   (transient de 10 a 15 min, respaldo al destacado fijo).
4. Fotos y documento inicial: hoja de contacto revisada por la sesión del menú; subida al bucket y `apply` en vivo sólo
   con autorización del operador y los pendientes de contenido resueltos o diferidos por escrito.
5. Pantalla del admin: dirección visual aprobada por el operador antes de construir (`UI ready: no` hasta entonces).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Plugin y servicio de guardado

- Plugin con el tipo de contenido privado `eo_site_nav`, revisiones nativas y la capability `eo_manage_site_nav`.
- Servicio PHP:
  1. validar;
  2. comparar hash (idempotencia) y la revisión base (conflicto);
  3. guardar como revisión con autor y mensaje;
  4. publicar la copia;
  5. purgar caché.

### Slice 2 — Esquema y WP-CLI

- Copia del esquema `site-nav.v1` con versión fijada desde `axis-ui-contracts`.
- Comandos `wp eo-nav export|validate|apply|revisions|restore`, que llaman al servicio del Slice 1.

### Slice 3 — REST pública y datos dinámicos

- `GET /wp-json/eo/v1/site-nav` con `ETag` y `Cache-Control` corto. Sólo el documento publicado.
- Resolución de los datos dinámicos de Recursos (último por formato desde WordPress o el feed de Think), con transient
  de 10 a 15 min y respaldo al destacado fijo. El adaptador de `TASK-2042` lo consume en el servidor.

### Slice 4 — Fotos y documento inicial

- Recortes: los finales del canvas v68 (`mm` 880×472, `op` 996×1080 y `card` 880×496), bajados del artifact; un recorte
  que falte se corta de la fuente grande en `ai-generations`, nunca se reescala ni se regenera.
- Subida a `gs://efeonce-group-axis-public-media/site-nav/v1/` con nombres `<slug>-<recorte>.webp`,
  `Cache-Control: public, max-age=31536000, immutable` y `Content-Type` correcto. Coordinada con quien esté tocando AXIS.
- Documento inicial con el contenido del canvas y los pendientes de «Por confirmar» resueltos con el operador. Se aplica
  por WP-CLI y se exporta un respaldo.

### Slice 5 — Pantalla del admin

- Diseño visual de la pantalla aprobado por el operador antes de construir.
- Árbol, editor de nodo, selector de foto (URL o biblioteca), vista previa con el render de AXIS, historial con
  comparar y restaurar, y estados según el wireframe.

## Out of Scope

- Montar el menú en el sitio, el interruptor y las variantes de Ohio: `TASK-2042`.
- Superficie del agendador: `TASK-2042`.
- Publicar la copia pública en el bucket (PDR-027, punto abierto 3).
- Herramienta de Greenhouse o MCP para editar el menú (follow-up de EPIC-055).
- Cloud CDN con dominio propio.

## Detailed Spec

Modelo del documento, reglas, plugin, REST y fotos:
`docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md`. Pantalla del admin:
`docs/ui/wireframes/TASK-2041-eo-navegacion-admin.md`. No se duplica aquí.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- El Slice 2 requiere el esquema de `TASK-2040` Slice 1.
- El Slice 5 no empieza sin el servicio y WP-CLI en verde y sin el diseño de la pantalla aprobado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Persona y agente se pisan | Contenido del sitio | medium | Control de revisión base; conflicto visible en el admin y error en WP-CLI | Revisiones con el mismo base y autores distintos |
| Documento inválido llega a producción | Sitio público | low | Validación obligatoria en el servicio; el adaptador cae a Ohio | Log de PHP del adaptador |
| Foto pública equivocada o sin alt | Sitio público | low | Esquema exige alt; revisión de la hoja de contacto antes de subir; nombres versionados | `curl -I` fallido o alt vacío en validación |
| Colisión con trabajo en AXIS al subir | AXIS / GCP | low | Carpeta propia `site-nav/`; coordinar con sesiones activas antes de subir | Objetos inesperados en `site-nav/` |
| Caché de Kinsta sirve el documento viejo | Sitio público | medium | Purga en cada guardado; `ETag` en la REST | Diferencia entre `export` y lo servido |

### Feature flags / cutover

- Sin flag propio: el plugin no tiene consumidor hasta que `TASK-2042` prenda `eo_site_nav_enabled`. Es additive, sin
  impacto visible en producción mientras el interruptor esté en `off`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Desactivar el plugin (sin consumidor, sin efecto visible) | < 10 min | si |
| Slice 2 | Igual que Slice 1 | < 10 min | si |
| Slice 3 | Desactivar el endpoint o el plugin | < 10 min | si |
| Slice 4 | Restaurar una revisión anterior del documento; las fotos quedan como objetos sin uso | < 10 min | si |
| Slice 5 | Ocultar la pantalla; WP-CLI sigue operando | < 10 min | si |

### Production verification sequence

1. `pnpm public-website:ssh-check`.
2. Export del código vivo y paquete con guarda `previousSha256`; deploy del plugin desactivado; activar.
3. `wp eo-nav validate --file` con el documento inicial → `apply --message` → `export` y comparación.
4. `curl` a la REST pública (200, `ETag`) y `curl -I` a cada foto (200, caché inmutable).
5. Admin: editar y guardar, error de validación y restaurar en una revisión de prueba, luego volver.

### Out-of-band coordination required

- Operador: resolver los pendientes de contenido de la nota «Por confirmar» del canvas antes del `apply` inicial, y
  aprobar el diseño visual del admin.
- Sesiones que estén tocando AXIS: coordinar la subida a `site-nav/` del bucket.
- Kinsta: purga de caché tras cada cambio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El plugin guarda un solo documento `site-nav.v1` por sitio en el tipo privado `eo_site_nav`, con revisiones
  nativas. Evidencia: `tests/playground/run-eo-site-nav.sh` del runtime (44 checks + WP-CLI real), 2026-10-22.
- [ ] Un documento que no pasa el esquema no se guarda, ni desde el admin ni desde WP-CLI (prueba automatizada).
  Probado en el servicio y en WP-CLI (Playground). Sin tildar: la pantalla del admin (Slice 5) aún no existe.
- [x] `apply` con el mismo contenido no crea revisión nueva, y un guardado sobre una revisión base vieja da conflicto
  visible (prueba automatizada). Evidencia: Playground, servicio y `wp eo-nav apply` (409 legible, nada pisado).
- [ ] `wp eo-nav export|validate|apply|revisions|restore` funcionan en vivo y `restore` crea una revisión nueva.
  Probados con WP-CLI real contra un sitio de Playground. Sin tildar: falta en vivo (Slice 4, con autorización).
- [x] `GET /wp-json/eo/v1/site-nav` devuelve sólo el documento publicado, con `ETag`. Evidencia: Playground (200 con
  `ETag`, 304 con `If-None-Match`, 404 sin documento, sin escritura). En vivo se comprueba con el deploy.
- [x] Recursos resuelve lo último por formato en el servidor y cae al destacado fijo si la fuente falla. Evidencia:
  Playground (tipo de Glitch desde el título, hora de Santiago, invalidación al publicar/editar/recategorizar, fuente
  caída, resultado válido contra el esquema). Reglas por formato en la arquitectura, §Datos dinámicos.
- [x] Las fotos del documento responden 200 desde `site-nav/v1/` con `Cache-Control: public, max-age=31536000,
  immutable`, y todas tienen alt. Evidencia 2026-10-22: las 51 URL dan 200, con esa cabecera, `image/webp` y los mismos
  bytes que el original (curl de cada una). El alt lo exige el esquema y el documento de ejemplo valida.
- [ ] El documento inicial refleja el contenido aprobado del canvas, con los pendientes de «Por confirmar» resueltos o
  explícitamente diferidos.
- [ ] La franja de Recursos apunta a la suscripción del blog (misma lista que Glitch) y no existe formulario ni lista
  propia del menú.
- [ ] La pantalla del admin y WP-CLI llaman al mismo servicio de guardado (sin lógica duplicada).
- [ ] Se capturó y se miró la evidencia de la pantalla del admin y el scorecard cumple el umbral.
- [ ] `UI ready` se mantuvo en `no` hasta tener el diseño de la pantalla aprobado, el mapping, el plan de captura y el
  decision log.

## Verification

- Pruebas del plugin en el repo del runtime.
- Secuencia de §Production verification sequence con evidencia (salidas de WP-CLI, `curl`, capturas).
- `pnpm task:lint --task TASK-2041` en `greenhouse-eo`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-public-site-wordpress` (`.claude` y `.codex`) documenta el plugin y los comandos `wp eo-nav`
- [ ] Manual de uso para editar el menú desde el admin y por WP-CLI en `docs/manual-de-uso/public-site/`
- [ ] EPIC-055 actualizada con el estado de esta task

## Follow-ups

- Herramienta de Greenhouse o MCP que llame a la puerta de WP-CLI (EPIC-055).
- Copia pública también en el bucket de AXIS si se decide (PDR-027, punto abierto 3).
- Lo que surja dentro de la frontera del contenido entra como slice o criterio de esta task (regla de EPIC-055).

## Open Questions

- ~~Nombre del directorio del plugin y del texto de dominio~~: resuelto 2026-10-22, `eo-site-nav` (ver Discovery y plan).
- Pendientes de contenido de la nota «Por confirmar» del canvas (se resuelven con el operador en el Slice 4).
