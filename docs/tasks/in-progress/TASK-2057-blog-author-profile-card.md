# TASK-2057 — Autor del blog: ficha de autor, byline y schema

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-2057-blog-author-profile-card.md`
- Backend impact: `reader`
- Epic: `none`
- Status real: `Código local listo y probado (lector + ficha + byline + schema): 32 pruebas PHP verdes; harness a 1440/390/320 sin desborde y axe 0. Falta: pasar el código al plugin cuando la sesión del Archivo libere content-model, cargar el perfil y la foto en WordPress y desplegar con visto bueno del operador.`
- Rank: `TBD`
- Domain: `public-site|content|ui`
- Blocked by: `none`
- Branch: `Runtime efeonce-public-site-runtime main (checkout compartido con WIP ajeno: commits sólo de los archivos propios); scripts y docs en Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El single del blog muestra al autor con su ficha propia de La órbita: un byline «Por Julio Reyes» enlazado al archivo,
con fecha y minutos de lectura, y al final del artículo una ficha oscura con el retrato en la pieza `portrait`, el cargo,
una bio corta, los temas que escribe y sus redes (isotipos oficiales de AXIS). La ficha reemplaza la caja de autor de
Ohio, cuyas redes apuntaban al demo del tema. Todo sale de un solo lector, `EO_Author_Profile`, que también alimenta la
cabecera del archivo de autor y deja el schema Person coherente con lo que se ve.

## Why This Task Exists

El operador pidió (2026-10-24) que las bios de autor expongan redes y web, cambiar su foto y revisar el single y todas
las superficies donde aparece el autor, con el schema SEO de autor. El discovery encontró: la caja de Ohio con redes del
demo (`facebook.com/colabrio`) y LinkedIn vacío; ninguna superficie enlaza al archivo de autor; etiquetas en inglés
(«Author», «Published», «Posted by»); el cargo derivado de la primera frase de la bio; y el `sameAs` del schema con
redes reales que ninguna plantilla mostraba. Diseño aprobado en el canvas «Autor del blog Efeonce».

## Goal

- El single muestra el byline y la ficha aprobados, con datos reales, sin la caja de Ohio ni textos en inglés.
- Ficha, byline, cabecera de `/author/` y schema leen el mismo perfil; las redes visibles y el `sameAs` no divergen.
- El schema Person de cada post expone cargo, foto, bio, `sameAs`, `knowsAbout` y `worksFor` como referencia a la
  Organization del sitio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/public-site/BLOG_ARCHIVE_RUNTIME_V1.md` (archivo de autor, guardas, cuentas de servicio)
- `docs/architecture/public-site/BLOG_HOME_RUNTIME_V1.md` (content model, caché de lectores, deploy)
- `.claude/skills/efeonce-graphic-line/` (pieza `portrait`, una esfera por pieza, esquina recta, acento ≥ 24 px)
- `docs/public-site/decisions/PDR-018*` y `PDR-020*` (autor real con ficha en cada artículo)

Reglas obligatorias:

- Yoast sigue siendo dueño del grafo JSON-LD; el plugin sólo ajusta `worksFor` por filtro.
- La foto del autor nunca es Gravatar; sin foto, iniciales.
- La web personal sólo se muestra si existe y no es el propio sitio (decisión del operador: cesargrowth.com fuera hasta
  que esté en línea).
- Toda escritura en vivo con `ssh-check`, línea base, paquete acotado, purga, lectura en vivo y visto bueno del operador
  por cada `--apply`; turno de content-model coordinado con la sesión del Archivo del blog.

## Normative Docs

- `docs/ui/wireframes/TASK-2057-blog-author-profile-card.md`
- Canvas «Autor del blog Efeonce» (`https://claude.ai/artifact/1F5hwtipS7FHA4uFxcMJew`)
- `.claude/skills/efeonce-public-site-wordpress/references/blog-home-operation.md`

## Dependencies & Impact

### Depends on

- TASK-2050 (content model, `EO_Home_Readers::cached`, `EO_CM_Util`) y TASK-2055 (archivo de autor).
- Yoast Premium (`wpseo_user_schema`) y One User Avatar en producción.

### Blocks / Impacts

- TASK-2055 — `EO_Archive_Adapter` puede consumir `EO_Author_Profile` para la cabecera de `/author/` (la sesión del
  Archivo decide y dibuja; Delta cuando ocurra).
- TASK-2042 — el paquete del tema `ohio-child` suma `parts/elements/page_headline.php` a su allowlist.
- TASK-1316 — el rater E-E-A-T consume las señales de autor.

### Files owned

- `efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/includes/content-model/class-eo-author-profile.php`
- `efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/includes/content-model/assets/author.css`
- `efeonce-public-site-runtime/tests/eo-author-profile.test.php`
- `efeonce-public-site-runtime/wp-content/themes/ohio-child/parts/elements/page_headline.php` (rama del byline)
- `greenhouse-eo/scripts/public-website/{build-site-nav-theme-package.cjs,deploy-site-nav-theme-package.php,deploy-blog-v3-content-model-package.php}` (allowlists)
- `greenhouse-eo/ai-generations/2026-10-24_autor-blog/` (foto y su procedencia)

## Current Repo State

### Already exists

- `EO_Home_Readers::author_photo()` (foto sin Gravatar) y `EO_Archive_Adapter` (foto, nombre, cargo y bio del archivo).
- El `Person` de Yoast con `sameAs` (efeoncepro.com, instagram y linkedin cesargrowth), `jobTitle` y `knowsAbout` desde
  `wpseo_user_schema`.
- Caja de autor del widget `ohio_widget_about_author` (`ohio-extra`), impresa por `ohio/single.php:56-57`.

### Gap

- No hay ficha de autor propia ni byline enlazado; el cargo sale de la bio; la foto es la de 2024.
- El paquete del tema no permite desplegar `page_headline.php`; el de content-model no acepta CSS en `assets/`.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeonce-public-site-runtime` (`efeonce-editorial-blocks` content model + override de `ohio-child`)
- Future candidate home: `public`
- Boundary: el tema sólo llama `eo_author_byline()`; sin el plugin, Ohio pinta lo de siempre
- Server/browser split: HTML en servidor; sin JavaScript
- Build impact: paquetes existentes de content-model y del tema (allowlists ampliadas)
- Extraction blocker: depende de Ohio (`single.php`, widget) para la posición de la ficha

## Hybrid Execution Justification

- Why not split: el lector es pequeño, puro y sin migración; sólo existe para pintar la ficha y el byline, y separarlo
  dejaría un reader sin consumidor visible.
- Primary execution profile: `ui-ux`.
- Contract boundary: `EO_Author_Profile::build()` (puro) y `for_user()` (lectura cacheada); la UI sólo consume el registro.
- Risk controls: sin escrituras de esquema; el campo nuevo es un usermeta opcional; rollback restaurando el `.tar` del
  deploy; pruebas puras antes del paquete.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader`
- Source of truth afectado: usermeta de WordPress (`description`, `wpseo_user_schema`, `job_title`, contactos de Yoast, `wpdg_user_avatar`) y el nuevo `eo_author_bio_short`
- Consumidores afectados: single (byline y ficha), archivo de autor, schema Yoast
- Runtime target: `production` (WordPress en Kinsta)

### Contract surface

- Contrato existente a respetar: `EO_Home_Readers::cached`, `EO_Home_Readers::author_photo`, grafo de Yoast
- Contrato nuevo o modificado: `EO_Author_Profile::build()/for_user()` → `{id, name, initials, role, org, bioShort, bioLong, photo, photoLarge, links[], topics[], postCount, archiveUrl}`; `eo_author_byline()`
- Backward compatibility: `compatible` (aditivo; el tema cae a Ohio sin el plugin)
- Full API parity: lectura pública; el perfil se edita en el perfil de WordPress o por WP-CLI (`wp user meta`)

### Data model and invariants

- Entidades/tablas/views afectadas: `wpdg_usermeta` (clave nueva `eo_author_bio_short`)
- Invariantes que no se pueden romper:
  - Redes visibles = `sameAs` de Yoast (mismas metas, mismo orden).
  - Cuentas de servicio y autores sin posts publicados no tienen ficha.
  - La foto nunca es Gravatar.
- Write-target allowlist: `N/A` (sin boundary test en WordPress)
- Tenant/space boundary: `N/A` — sitio público de un solo tenant
- Idempotency/concurrency: lectura cacheada 5 min; el guardado del perfil hace `EO_Cache_Purge::bump()`
- Audit/outbox/history: `none` — datos de perfil editorial; WordPress no versiona usermeta

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — el paquete se instala con el flag de content-model; la ficha reemplaza un widget roto
- Backfill plan: perfil de Julio por WP-CLI (cargo, bio corta, foto) con visto bueno del operador
- Rollback path: restaurar el `.tar` de `efeonce-editorial-blocks` y del tema del deploy
- External coordination: turno con la sesión «Plantilla Archivo del blog v3»; purga de Kinsta

### Security and access

- Auth/access gate: lectura pública; el campo de bio corta exige `edit_user` y nonce
- Sensitive data posture: datos públicos de perfil; el slug de autor expone el usuario (follow-up de seguridad)
- Error contract: `N/A` — render server-side; sin perfil, no hay ficha
- Abuse/rate-limit posture: `none` — sin endpoints nuevos

### Runtime evidence

- Local checks: `php tests/eo-author-profile.test.php`, `php tests/eo-content-model.test.php`
- DB/runtime checks: `wp user meta get` de las claves usadas (sólo lectura) antes y después
- Integration checks: HTML en vivo del single (ficha, byline, sin `colabrio`), JSON-LD del Person
- Reliability signals/logs: `verify-content-model.php` del deploy; `debug.log` sin avisos nuevos
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: lector de un artículo del blog (y buscadores/IA que evalúan la autoría)
- Momento del flujo: inicio (byline) y cierre (ficha) de la lectura
- Resultado perceptible esperado: saber quién escribe, por qué confiar y dónde seguirlo
- Fricción que debe reducir: caja de autor rota (redes del demo), autor sin enlace, textos en inglés
- No-goals UX: mini ficha al foco del byline, «Más de Julio» en lugar de los relacionados de Ohio, slug de autor

### Surface & system decision

- Surface: single de WordPress (`is_singular('post')`)
- Nav placement: `none` (no crea destinos; enlaza el archivo de autor existente)
- Composition Shell: `no aplica` — sitio público WordPress, no portal
- Primitive decision: `new` — ficha de autor con la pieza `portrait` de La órbita e isotipos de `axis-brand-assets`
- Adaptive density / The Seam: `no aplica` — breakpoint único a 640 px
- Floating/Sidecar/Dialog decision: ninguno
- Copy source: `local one-off` — copy del wireframe (Escribe, Ver sus {n} artículos, Por {autor})
- Access impact: `none`

### State inventory

- Default: ficha completa y byline
- Loading: no aplica (servidor)
- Empty: sin perfil editorial → sin ficha y sin enlace en el byline (Ohio pinta lo suyo)
- Error: si falla la lectura, no se pinta la ficha
- Degraded / partial: sin redes, sin temas, sin bio o sin foto → esas partes no se pintan; iniciales sin foto
- Permission denied: no aplica
- Long content: nombre y cargo largos envuelven; bio corta ≤ 160 caracteres
- Mobile / compact: ficha apilada bajo 640 px, CTA a todo el ancho
- Keyboard / focus: byline → artículo → temas → CTA → redes, con foco visible
- Reduced motion: sin animaciones

### Interaction contract

- Primary interaction: ir al archivo del autor; abrir un perfil social
- Hover / focus / active: fondos y bordes suaves; foco con contorno del halo
- Pending / disabled: no aplica
- Escape / click-away: no aplica
- Focus restore: no aplica
- Latency feedback: no aplica
- Toast / alert behavior: ninguno

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: ninguno
- Layout morph: ninguno
- Stagger: ninguno
- Timing / easing token: ninguno
- Reduced-motion fallback: no aplica
- Non-goal motion: órbita animada

### Implementation mapping

- Route / surface: single de post; widget `ohio_widget_about_author` reemplazado por `widget_display_callback`
- Primitive / variant / kind: `.eo-author` (ficha B oscura) y `.eo-byline`
- Component candidates: `EO_Author_Profile::card_html()`, `::byline_html()`, `eo_author_byline()`
- Copy source: wireframe TASK-2057
- Data reader / command: `EO_Author_Profile::for_user()` (cacheado con `EO_Home_Readers::cached`)
- API parity: lectura pública de WordPress; edición por perfil o WP-CLI
- Access / capability: público
- States to implement: los del inventario

### GVC scenario plan

- Scenario file: harness local (`card_html` + `byline_html` con el CSS real) y Playwright sobre el post en vivo
- Route: harness local → producción (`/aeo/web-agentica-agentes-ia/` y un Glitch)
- Viewports: 1440×900, 390×844; desborde 320–1920
- Quality profile: `standard`
- Required steps: cargar el post; recorrer con teclado hasta las redes
- Required captures: byline y ficha a 1440 y 390
- Required `data-capture` markers: `byline`, `card` (harness)
- Assertions: axe WCAG 2.2 AA sin violaciones en `.eo-author` y `.eo-byline`; un solo `widget_ohio_widget_about_author` = 0; sin `colabrio`
- Scroll-width checks: `scrollWidth === clientWidth` de 320 a 1920
- Reduced-motion / focus evidence: recorrido con teclado
- Review dossier: canvas «Autor del blog Efeonce» + capturas del harness
- Baseline decision / surface ID: baseline = tableros `Main`, `Card-B-orbita` y `Movil`; surface `public-blog-single-author`

### Design decision log

- Decision: ficha B oscura al cierre del artículo + byline enlazado
- Alternatives considered: ficha A en papel (alternativa para cuerpos oscuros); franja C mínima; mantener la caja de Ohio corrigiendo redes (descartada: forma y datos del demo)
- Why this pattern: marca el final del artículo, es el fondo por defecto de La órbita y lleva la autoría al primer plano (E-E-A-T)
- Reuse / extend / new primitive: nueva, con la pieza `portrait` y los isotipos oficiales
- Open risks: la posición depende de `ohio/single.php`; el paquete del tema ahora incluye el override del headline

### Visual verification

- GVC scenario: harness + Playwright en vivo
- Viewports: 1440, 390 (+ desborde 320–1920)
- Required captures: byline y ficha
- Required `data-capture` markers: `byline`, `card`
- Scroll-width check: sí
- Accessibility/focus checks: axe 0; foco visible
- Before/after evidence: caja de Ohio con redes del demo vs ficha nueva
- Known visual debt: los relacionados de Ohio siguen con su tarjeta (sólo cambia «Posted by» → «Por»)
- Visual scorecard: canvas aprobado por el operador el 2026-10-24
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Lector y ficha

- `class-eo-author-profile.php` (lector puro + render + hooks), registro en `bootstrap.php`, `assets/author.css`,
  versión del plugin, `tests/eo-author-profile.test.php`.
- Allowlist de `deploy-blog-v3-content-model-package.php` acepta `assets/*.css`.

### Slice 2 — Byline

- `page_headline.php`: rama `eo_author_byline()` con caída a Ohio; allowlist del paquete del tema.

### Slice 3 — Schema

- `worksFor` → `{"@id": home/#organization}` por `wpseo_schema_person`; cargo actualizado en `wpseo_user_schema` y
  `job_title`; foto nueva → `image` del Person.

### Slice 4 — Datos y foto

- Por WP-CLI con visto bueno: foto nueva como avatar (One User Avatar), cargo, bio corta y bio larga.

### Slice 5 — Despliegue y verificación

- Turno; deploy de content-model y del tema; purga; HTML, JSON-LD, Playwright 1440/390, desborde y axe en vivo.

### Slice 6 — Documentación

- `BLOG_HOME_RUNTIME_V1`/`BLOG_ARCHIVE_RUNTIME_V1` (lector de autor), funcional, manual de operación del perfil, skill,
  Handoff y changelog.

## Out of Scope

- Mini ficha al foco del byline, «Más de Julio» en lugar de los relacionados de Ohio.
- Cambiar el slug `/author/jreysgo/` y cerrar `/wp-json/wp/v2/users` (follow-up de seguridad).
- La cabecera de `/author/` (la dibuja e implementa la sesión del Archivo con este contrato).
- Web personal de Julio (hasta que cesargrowth.com esté en línea).

## Detailed Spec

Ficha: pieza `portrait` (caja 208: anillo r 96 al 40 % del halo, foto r 78, arco 200°→250° trazo 4, esfera r 7 en
`accent-growth`), nombre Bricolage 740 con punto tipeado en el acento, esquina recta arriba a la izquierda
(`straightCorner`), CTA blanco, redes de 44 px con `rel="me noopener"` y nombre accesible. Temas: `knowsAbout` que son
categoría con posts (alias: «IA aplicada al marketing» → `ai`, «SEO/AEO» → `aeo`), máximo 4.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slices 1–3 en local con pruebas verdes antes del paquete; 4 y 5 sólo con turno y visto bueno.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La ficha queda fuera de lugar en `.author-container` | UI | medium | revisar en vivo a 1440/390 antes de cerrar | capturas en vivo |
| Un TOC indexa la ficha | contenido | low | la ficha no lleva encabezados y no entra en `the_content` | TOC con «Julio Reyes» |
| El paquete del tema arrastra cambios de site-nav | deploy | low | build exige archivos limpios y compara SHA en vivo | `Live drift` |
| Deploy cruzado con la sesión del Archivo | deploy | medium | turno explícito por mensaje | dos deploys en el ledger a la vez |

### Feature flags / cutover

- Sin flag nuevo: la ficha existe con el plugin instalado; rollback = restaurar el `.tar` del deploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1–3 | Restaurar el `.tar` de `efeonce-editorial-blocks` | 5 min | sí |
| 2 | Restaurar `page_headline.php` del `.tar` del tema | 5 min | sí |
| 4 | Restaurar el avatar anterior (adjunto 244826) y los metas | 5 min | sí |

### Production verification sequence

1. `pnpm public-website:ssh-check`; turno con la sesión del Archivo.
2. `pnpm public-website:blog-home deploy content-model` (dry-run) → `--apply` con visto bueno.
3. Paquete del tema (build + deploy) con visto bueno; purga.
4. Single en vivo: byline, ficha, sin `colabrio`, JSON-LD del Person; Playwright 1440/390, desborde, axe.

### Out-of-band coordination required

- Visto bueno del operador para cada `--apply` y para escribir su perfil.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Se declaro `Execution profile: ui-ux` y `UI impact` segun el alcance real.
- [ ] `UI ready` permanece `no` hasta que el wireframe y `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log; si esta en `yes`, pasa `pnpm task:lint --task TASK-2057`.
- [x] Se declaro `Wireframe: docs/ui/wireframes/TASK-2057-blog-author-profile-card.md` y el archivo existe.
- [x] El lector pasa sus pruebas puras (32 chequeos, 2026-10-24).
- [x] Harness local a 1440/390/320 sin desborde y axe 0 (2026-10-24).
- [ ] En vivo: byline y ficha en el single, sin la caja de Ohio ni «colabrio», sin textos en inglés del autor.
- [ ] El JSON-LD del Person trae el cargo nuevo, la foto nueva, `sameAs` con LinkedIn e Instagram y `worksFor` por `@id`.
- [ ] Documentación actualizada (runtime, funcional, manual, skill).

## Verification

- `php tests/eo-author-profile.test.php` y `php tests/eo-content-model.test.php` en el runtime
- Harness + Playwright a 1440/390 y 320–1920
- `pnpm public-website:blog-home verify` tras el deploy

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- Slug de autor sin el usuario y cierre de `/wp-json/wp/v2/users`.
- Mini ficha al foco del byline; «Más de Julio» en lugar de los relacionados de Ohio.
- Web personal de Julio cuando cesargrowth.com esté en línea.
