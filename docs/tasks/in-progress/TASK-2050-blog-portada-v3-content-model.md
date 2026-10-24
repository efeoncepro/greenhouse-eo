# TASK-2050 — Portada del blog v3: modelo de contenido en WordPress

## Delta 2026-10-24

- Cada evento puede tener su formulario de reserva (`event_registration`, `form_key` propio, `event_key` fijo como campo
  oculto con `staticValue`, cupo y lista de espera) publicado con `pnpm growth:forms:publish-event-registration` —
  code complete por TASK-2053; el modelo de contenido referencia ese `form_key`.


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
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Code complete en local (2026-10-24): modelo en efeonce-editorial-blocks 0.2.0 (runtime b00fa2f…57d4455), 148 checks PHP, 62 checks en Playground, panel del editor probado en navegador y ensayo del despliegue y del backfill; rollout pendiente: PDR-029 Proposed, sin deploy, sin backfill, opción eo_content_model_enabled en 0`
- Rank: `TBD`
- Domain: `public-site|content`
- Blocked by: `Aprobación del operador de PDR-029 y del dry-run del backfill (rollout)`
- Branch: `Runtime efeonce-public-site-runtime main (checkout /Users/jreye/Documents/efeonce-public-site-runtime); docs en Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea en WordPress el modelo de contenido que la portada del blog v3 necesita para ser dinámica y mantenible por el
editor: la taxonomía «Formato», la fijación a la portada con vencimiento, el tipo «Evento» (con speakers, agenda,
aprendizajes, sede, formulario y grabación), el registro de recursos y herramientas, el marcado `Event`/`VideoObject`,
el `.ics` y las purgas de caché al publicar. Es la base que consume TASK-2051 para pintar el diseño aprobado tal cual.

## Why This Task Exists

El canvas aprobado (`docs/ui/visual-directions/TASK-2051-blog-portada-v3/`) muestra formatos por ícono, un slider de
destacados con artículos, casos, guías, diagnóstico y Flash, un bloque de eventos con cuenta regresiva y grabaciones,
y un riel de lecturas largas. Hoy WordPress no tiene nada de eso: no existe taxonomía de formato (edición y Flash de
Glitch sólo se distinguen por el título, `src/lib/glitch-composition/published-editions.ts`), no existe tipo de evento
(sólo hay CPT `eoh` y el de site-nav), los recursos de la etapa 1 están escritos a mano en `render.php` de develop, y
nada purga `/blog/` (página 18456) al publicar una entrada. Sin este modelo, la portada sólo podría ser una maqueta
estática, que es justo lo que el operador no quiere.

## Goal

- Cada sección del canvas tiene una fuente de datos gobernada, con orden, vacío y fallback definidos.
- El editor publica una entrada, un evento o un recurso y la portada se actualiza sola (caché purgada).
- Los eventos tienen marcado `Event` válido, `.ics`, paso automático a grabación y cero dependencias de un plugin de terceros.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/public-site/decisions/PDR-018-pillar-experience-arquitectura-editorial-y-runtime.md` (§6 registry, §7 papel de Elementor, §8 schema visible)
- `docs/public-site/decisions/PDR-019-taxonomia-editorial-canonica-blog-wordpress.md`
- `docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md` (§4.2 formato ≠ categoría; decisión 2; Delta 2026-10-22: orden Glitch → herramienta → diagnóstico, autor real, video incrustado con transcripción)
- `docs/architecture/agent-invariants/PUBLIC_SITE_KINSTA_ACCESS_AGENT_INVARIANTS.md`

Reglas obligatorias:

- Formato y categoría son ejes distintos: `eo_format` nunca reemplaza ni mezcla las 13 categorías de PDR-019.
- WordPress no es dueño de formularios ni del mapeo a HubSpot (`.claude/skills/efeonce-public-site-wordpress/references/growth-forms-wordpress.md`); el evento guarda sólo la referencia al Growth Form.
- Yoast es dueño del grafo JSON-LD; el marcado nuevo entra por `wpseo_schema_graph_pieces`, nunca pegado desde Elementor.
- Sin `_elementor_data` directo; ninguna escritura en vivo sin `pnpm public-website:ssh-check`, snapshot y rollback.

## Normative Docs

- `docs/ui/visual-directions/TASK-2051-blog-portada-v3/README.md`
- `.claude/skills/efeonce-public-site-wordpress/references/content-factory-gutenberg.md`
- `.claude/skills/efeonce-public-site-wordpress/references/taxonomy-permalink-migrations.md`
- `.claude/skills/efeonce-public-site-wordpress/references/runtime-and-discovery.md`
- `.claude/skills/seo-aeo/references/home-landing-metadata-schema.md`
- `docs/documentation/public-site/wordpress-blog-content-hub-search.md`
- `scripts/public-website/blog-phase1/README.md`

## Dependencies & Impact

### Depends on

- PDR nuevo `docs/public-site/decisions/PDR-029-modelo-de-contenido-portada-blog.md` (lo escribe el Slice 1 de esta task y lo aprueba el operador antes del Slice 2).
- Runtime `efeonce-public-site-runtime` en `main`; la etapa 1 vive sólo en develop (`/Users/jreye/Documents/efeonce-public-site-runtime-develop/wp-content/plugins/eo-elementor-widgets/includes/blog/model.php`) y se porta, no se empaqueta tal cual.

### Blocks / Impacts

- TASK-2051 (portada v3) consume los readers de esta task para eventos, formatos, fijadas y recursos.
- TASK-2053 (contrato de Growth Forms) define el formulario por evento que el campo `form_key` referencia.
- TASK-1802 recibe Delta: su modelo multiformato se materializa aquí.

### Files owned

- `efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/includes/content-model/` [crear]
- `efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/includes/content-model/class-eo-format-taxonomy.php` [crear]
- `efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/includes/content-model/class-eo-event-type.php` [crear]
- `efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/includes/content-model/class-eo-resource-registry.php` [crear]
- `efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/includes/content-model/class-eo-home-readers.php` [crear]
- `efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/includes/content-model/class-eo-cache-purge.php` [crear]
- `greenhouse-eo/scripts/public-website/blog-v3/` [crear: backfill dry-run/apply, deploy del paquete, verificadores]
- `greenhouse-eo/docs/public-site/decisions/PDR-029-modelo-de-contenido-portada-blog.md` [crear]

## Current Repo State

### Already exists

- 13 categorías de PDR-019 con primaria Yoast y permalink `/%category%/%postname%/`.
- Bloque `efeoncepro/glitch-drop` y embed de YouTube en Content Factory.
- Plugin `efeonce-editorial-blocks` en el runtime (`/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks`).
- Readers de la etapa 1 en develop (`includes/blog/model.php`): `get_posts`/`get_terms`, regla de 120 días para Novedades, `ignore_sticky_posts=true`, recursos fijos.
- Growth Forms con kind `event_registration` (`src/lib/growth/forms/contracts.ts:28`).

### Gap

- No hay taxonomía de formato ni backfill de las 44 entradas publicadas.
- No hay meta de fijación con vencimiento ni título partido para el slider (`light` + `bold`).
- No hay tipo de evento, ni marcado `Event`, ni `.ics`, ni transición a grabación.
- No hay registro de recursos/herramientas (PDR-020 decisión 2 sigue abierta).
- No hay purga de `/blog/` al publicar, ni purga programada por vencimientos.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeonce-public-site-runtime` → plugin `efeonce-editorial-blocks` (WordPress en Kinsta)
- Future candidate home: `public`
- Boundary: tipos, taxonomías, metas y readers PHP `EO_Home_Readers::*` consumidos sólo por los widgets de TASK-2051 y por la REST pública de lectura del blog; nada escribe fuera del plugin
- Server/browser split: lógica y datos en servidor (PHP); el navegador sólo recibe HTML, JSON-LD y el `.ics`; ningún secreto en el cliente
- Build impact: none (PHP del plugin; sin dependencias nuevas)
- Extraction blocker: depende de WordPress/Yoast para el grafo y del caché de Kinsta para las purgas

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: base de WordPress de efeoncepro.com (posts, términos, metas, CPT nuevos)
- Consumidores afectados: widgets de la portada (TASK-2051), REST de búsqueda del blog, grafo Yoast, Google
- Runtime target: `production` (Kinsta) vía paquete acotado

### Contract surface

- Contrato existente a respetar: categorías PDR-019, permalinks, grafo Yoast, kind `event_registration` de Growth Forms
- Contrato nuevo o modificado: taxonomía `eo_format`; metas `_eo_pin_until`, `_eo_hero_light`, `_eo_hero_bold`, `_eo_hero_image`; CPT `eo_event`; CPT no público `eo_resource`; readers `EO_Home_Readers::{featured, topics, glitch, events, rail, archive}`; endpoint `GET /wp-json/eo/v1/events/{id}/ics`; piezas Yoast `Event` y `VideoObject`
- Backward compatibility: `compatible` (aditivo; las entradas existentes siguen igual)
- Full API parity: los readers se exponen también por REST de sólo lectura (`/wp-json/eo/v1/home/*`) para agentes y verificadores; la escritura es el editor de WordPress y los scripts gobernados de backfill

### Data model and invariants

- Entidades/tablas/views afectadas: `wp_terms`/`wp_term_taxonomy` (`eo_format`), `wp_postmeta`, `wp_posts` (`eo_event`, `eo_resource`)
- Invariantes que no se pueden romper:
  - una entrada tiene exactamente un término `eo_format`; el formato nunca cambia la URL ni la categoría primaria
  - el orden de invitaciones del slider respeta PDR-020: Glitch → herramienta → diagnóstico
  - un evento sin `start_utc` válido o en estado `cancelled` nunca aparece como «próximo»
  - el contador de reservas nunca se escribe a mano (lo entrega TASK-2053 o se oculta)
  - el `.ics` nunca contiene el enlace privado de acceso al webinar
- Write-target allowlist: `N/A` (dominio WordPress, sin boundary test)
- Tenant/space boundary: `N/A` (sitio público único)
- Idempotency/concurrency: backfill idempotente por slug (re-ejecutar no duplica términos ni cambia entradas ya clasificadas); purgas con debounce de 60 s
- Audit/outbox/history: el backfill escribe un ledger JSON en `scripts/public-website/blog-v3/ledger/` con antes/después por entrada

### Migration, backfill and rollout

- Migration posture: `additive` + `backfill`
- Default state: tipos y taxonomía registrados pero sin uso en la portada hasta TASK-2051
- Backfill plan: `backfill-format.php` en dry-run (lista entrada → formato propuesto) → aprobación del operador → apply por lotes de 10 con ledger
- Rollback path: desactivar el módulo `content-model` del plugin (los datos quedan inertes) + `restore` del ledger para quitar términos
- External coordination: aprobación del PDR-029; inventario de webinars y herramientas (PDR-020 decisión 2); autores reales

### Security and access

- Auth/access gate: edición con capacidades estándar de WordPress (`edit_posts`); REST de lectura pública sólo con datos ya públicos
- Sensitive data posture: speakers externos sin PII más allá de nombre, rol y organización públicos
- Error contract: REST con `WP_Error` y códigos `eo_*` sin trazas internas
- Abuse/rate-limit posture: REST de sólo lectura cacheada (transient 5 min); el `.ics` con cabeceras de caché

### Runtime evidence

- Local checks: `php -l` de cada archivo; pruebas PHP en `tests/` del runtime; `node scripts/public-website/verify-source-led-compilers.cjs` si se toca la base
- DB/runtime checks: `pnpm public-website:wpcli -- --eval-file ./tmp/<read-only>.php --wp-user 12` para verificar términos, metas y CPT registrados
- Integration checks: Rich Results Test sobre la página de un evento; validar el `.ics` en Google Calendar y Apple Calendar
- Reliability signals/logs: ledger del backfill; log de purgas
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects. (PDR-029 §1–§6 y el docblock de cada clase en `includes/content-model/`.)
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit. (PDR-029; backfill idempotente por slug con `expect_sha256`; purgas con ventana de 60 s.)
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo. (No aplica: no hay tablas nuevas ni boundary test en el dominio WordPress; se deja sin tildar.)
- [x] Migration/backfill/rollback posture is explicit and proportional to risk. (PDR-029 §7; ensayo `scripts/public-website/blog-v3/rehearse-content-model-deploy.sh`: deploy → verify → backfill apply → restore.)
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling. (Evidencia local en Playground; la de producción queda pendiente con el rollout.)
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks. (`WP_Error` con códigos `eo_*`; log de purgas; prueba de que el `.ics`, el marcado y la página no llevan el enlace privado.)

### Capability Definition of Done

`N/A — no capability de Greenhouse`: el modelo vive en WordPress y se opera con el editor; los readers REST de sólo
lectura cubren la paridad programática para agentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Discovery y plan (2026-10-24)

- Inventario de sólo lectura del sitio vivo (WP-CLI remoto, sin escrituras): 44 entradas publicadas, 13 categorías,
  un solo autor publicador (Julio Reyes), WordPress 7.1.3, PHP 8.2.35, Yoast 28.6, Kinsta con
  `Kinsta\Cache_Purge::initiate_purge` y filtros `KinstaCache/purgeImmediate|purgeThrottled`, WP-Cron activo por
  visita, sin caché de objetos persistente. `/blog/` es la página 18456 y todavía no tiene `[eo_blog_home]`.
- Contrato de consumo: el plugin `eo-blog-home` (TASK-2051) pinta dos documentos (`portada`, `movil`; la tablet usa
  el de escritorio) y acepta datos reales por el filtro `eobh_data`. La forma exacta es la de
  `assets/generated/fixture.{portada,movil}.json`; las rutas que lee la plantilla salen de `*.ast.json`.
- Plan ejecutado: PDR-029 → taxonomía y base (Slice 2) → fijación y panel (Slice 3) → evento, `.ics` y marcado
  (Slice 4) → recursos, readers, REST y adaptador `eobh_data` (Slice 5) → purgas y pruebas (Slice 6) → paquete,
  verificador, backfill y ensayo en Playground.
- Desvíos respecto de la spec, registrados en PDR-029: «próximo» = hasta inicio + duración (criterio de aceptación,
  no `start_utc > now`); sin evento próximo la sección no se pinta (el canvas no tiene disposición para «grabación en
  el bloque grande»; el reader deja `featured_recording`); el bloque grande exige arte clave; los recursos se
  muestran sólo con revisión de los últimos 180 días; la regla de tamaños sale del largo de la línea más larga y la
  posición móvil (`left`) del aspecto del banner.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — PDR-029

- Escribir `PDR-029-modelo-de-contenido-portada-blog.md`: `eo_format` (Artículo, Caso, Guía, Grabación, Glitch Edición, Glitch Flash, Glitch Nota), fijación con vencimiento, `eo_event` (URL `/eventos/<slug>/`), `eo_resource` no público, plugin dueño, orden del slider, decisión del contador de reservas.
- Registrar el PDR en el índice de `docs/public-site/`.

### Slice 2 — Taxonomía «Formato» y backfill

- Registrar `eo_format` (no jerárquica, `show_in_rest`, sin rewrite pública) con íconos AXIS por término.
- `scripts/public-website/blog-v3/backfill-format.php` con dry-run, ledger y apply por lotes.

### Slice 3 — Fijación y título del slider

- Metas `_eo_pin_until`, `_eo_hero_light`, `_eo_hero_bold`, `_eo_hero_image` con panel en el editor de bloques.
- Reader `featured()` con el orden de PDR-020 y el fallback «la más reciente que no sea Glitch».

### Slice 4 — Tipo «Evento»

- CPT `eo_event` con campos: `start_utc`, `tz`, `duration_min`, `modality`, `venue`, `territory`, `key_art`, `speakers[]` (usuario WP o externo), `takeaways[3]`, `agenda[]`, `form_key`, `recording_post_id`, `status`.
- Pieza Yoast `Event` (y `VideoObject` en la grabación), `.ics` por REST, purga programada al terminar el evento.

### Slice 5 — Registro de recursos y readers

- CPT no público `eo_resource` (tipo, URL canónica, territorio, imagen, placements, orden, `reviewed_at`).
- `EO_Home_Readers` con todos los readers de la portada + REST de lectura `/wp-json/eo/v1/home/*`.

### Slice 6 — Purgas de caché y despliegue

- `EO_Cache_Purge`: `transition_post_status` y `save_post` (post, evento, recurso) purgan `/blog/` y archivos; `wp_schedule_single_event` para vencimientos.
- Paquete acotado con `deploy-blog-v3-content-model-package.php`, snapshot y rollback.

## Out of Scope

- La interfaz de la portada (TASK-2051).
- El contrato y el renderer de formularios (TASK-2053 y TASK-2054).
- Búsqueda semántica con IA para «Pregúntale al blog» (requiere ADR propio).
- Migrar o reescribir las entradas existentes más allá de asignarles formato.

## Detailed Spec

- **Orden del slider (`featured`)**: fijadas vigentes ordenadas por fecha de fijación; luego recursos con placement `hero`
  en el orden de PDR-020; tope 5. Sin fijadas: la más reciente que no sea Glitch. Cada item expone `kind`
  (`bleed|logo`), `format`, `topic`, `accent` (color de línea), `light`, `bold`, `dek`, `cta`, `author`, `minutes`,
  `date`, `image` (attachment id) — el mismo shape que `S` en `renderVals()` del canvas.
- **Eventos (`events`)**: `next` = primer `eo_event` con `start_utc > now` y `status = scheduled`; `upcoming` = los dos
  siguientes; `recordings` = tres entradas `eo_format = grabacion` más recientes. Sin `next`: la última grabación sube
  al bloque grande. Sin nada: el reader devuelve `null` y la sección no se pinta.
- **Glitch**: última edición, último Flash, cuatro anteriores por número (categoría Glitch × `eo_format`).
- **Temas**: `get_terms(hide_empty)` sobre `post` publicados; porcentaje = entradas del término / total; «último» = la más reciente.
- **Archivo**: paginado en servidor; año, tema y formato en la URL; `noindex,follow` en URLs filtradas.
- **Purgas**: `wp kinsta cache purge` por URL cuando exista; si no, purga completa con debounce.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (PDR aprobado) → Slice 2 → Slice 3 → Slice 4 → Slice 5 → Slice 6.
- Slice 2 apply en producción sólo después del dry-run revisado por el operador.
- Slice 6 (purgas) debe estar en producción antes de que TASK-2051 publique la portada.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Backfill asigna un formato equivocado a entradas publicadas | WordPress / SEO | medium | dry-run + aprobación + ledger reversible | diff del ledger |
| Ohio o Yoast reaccionan mal a un CPT nuevo (sidebar, schema duplicado) | WordPress / SEO | medium | registrar sin rewrite pública hasta TASK-2051; Rich Results Test | errores en Search Console |
| Purga completa demasiado frecuente degrada TTFB | Kinsta | low | debounce 60 s y purga por URL | TTFB en CrUX |
| `.ics` filtra el enlace privado del webinar | Eventos / privacidad | low | el `.ics` sólo lleva la URL pública del evento; test unitario | revisión del `.ics` |

### Feature flags / cutover

- Opción `eo_content_model_enabled` (default `off` en producción hasta el Slice 6). Revert: opción a `off`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir el PDR (doc) | 1 min | sí |
| Slice 2 | `backfill-format.php --restore <ledger>` + desactivar taxonomía | 10 min | sí |
| Slice 3 | Desactivar el panel; las metas quedan inertes | 5 min | sí |
| Slice 4 | `eo_content_model_enabled=off`; los eventos quedan en borrador | 5 min | sí |
| Slice 5 | Igual que Slice 4 | 5 min | sí |
| Slice 6 | Restaurar el backup `.tar` del paquete en `/tmp` de Kinsta | 10 min | sí |

### Production verification sequence

1. `pnpm public-website:ssh-check` y `pnpm public-website:export-live-code` (línea base).
2. Paquete en dry-run; luego apply con snapshot.
3. Verificar por WP-CLI de sólo lectura: taxonomía, CPT y metas registrados; REST `/wp-json/eo/v1/home/*` responde 200.
4. Backfill dry-run → aprobación → apply → ledger.
5. Crear un evento de prueba en borrador, validar `.ics` y Rich Results en preview.

### Out-of-band coordination required

- Aprobación del operador del PDR-029 y del dry-run del backfill.
- Inventario de webinars y herramientas (PDR-020 decisión 2) y nombres reales de autores y speakers.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] PDR-029 existe, está aprobado por el operador y registrado en el índice de decisiones del sitio público.
- [ ] `eo_format` está registrada y las 44 entradas publicadas tienen exactamente un formato, con ledger del apply.
- [x] El reader `featured` devuelve el shape del canvas y respeta el orden Glitch → herramienta → diagnóstico. (Prueba PHP: claves de cada diapositiva = las del documento de ejemplo; Playground: `art, caso, flash, guia, diag`.)
- [ ] Un evento de prueba produce `Event` válido en Rich Results Test y un `.ics` que abre en Google y Apple Calendar sin enlace privado.
- [x] Al pasar `start + duración`, el evento deja de ser «próximo» sin intervención manual. (Prueba PHP de estados; en Playground un evento que terminó hace 5 minutos no es próximo y la purga de su fin queda programada.)
- [ ] Publicar o actualizar una entrada, evento o recurso purga `/blog/` en menos de 2 minutos (medido). (Medido sólo en Playground con Kinsta simulado: 0,1 s la primera purga y 67 s la agrupada; falta medirlo en Kinsta.)
- [x] Todos los readers responden por REST de sólo lectura con los mismos datos que usa la portada. (Playground: `/wp-json/eo/v1/home/board/portada` idéntico al documento embebido en `/blog/`; cada reader responde 200.)

## Verification

- `php -l` de cada archivo nuevo
- Pruebas PHP del runtime (`php ../efeonce-public-site-runtime/tests/<archivo>.test.php`)
- `pnpm public-website:wpcli -- --eval-file ./tmp/<read-only>.php --wp-user 12`
- Rich Results Test y prueba del `.ics`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] TASK-1802 recibió Delta con lo materializado

## Follow-ups

- Búsqueda semántica con IA para «Pregúntale al blog» (ADR propio).
- Página pública de cada evento (`/eventos/<slug>/`) con plantilla propia si TASK-2051 no la cubre.

## Open Questions

- ¿El formato visible se llama «Grabación» o «Webinar»? (las notas del canvas listan ambos).
- Color de línea para IA, Loop, Inbound y Marketing Digital (hoy provisorio en Growth).
