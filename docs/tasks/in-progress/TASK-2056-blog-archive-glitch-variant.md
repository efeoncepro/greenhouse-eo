# TASK-2056 — Archivo del blog: variante Glitch del tema

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
- Wireframe: `docs/ui/wireframes/TASK-2056-blog-archive-glitch-variant.md`
- Backend impact: `none`
- Epic: `none`
- Status real: `En producción desde el 2026-10-24 ~19:50 UTC (runtime 9a19d46; Greenhouse db64920a2): /category/glitch/ y /glitch/ con la variante, píldora real con texto. Verificado en vivo: 200, un H1, canonical, index, desborde 0 y axe 0 en 7 vistas, /blog/ verify verde. Falta: release de Greenhouse a producción para el logo en la píldora (renderer 1.3.0, en develop sin push).`
- Rank: `TBD`
- Domain: `public-site|content|ui`
- Blocked by: `none`
- Branch: `Runtime efeonce-public-site-runtime main (checkout compartido con WIP ajeno: commits sólo de los archivos propios); scripts, renderer y docs en Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`/category/glitch/` (que también sirve `/glitch/`, el archivo del newsletter) usa la plantilla «Archivo del blog» de
TASK-2055 con la piel de Glitch: el wordmark oficial como título, la cabecera de Glitch («EDICIÓN #17» y «NO ESPERA AL
LUNES / FLASH»), la muletilla en Guttery, la falla en bytes en el borde del bloque oscuro, filas con la placa de la
edición o del Flash, un filtro Ediciones/Flash/Notas y el banner de suscripción con la misma píldora que se transforma de
la portada del blog, en blanco y con el logo de Glitch. Mismo esqueleto, mismos gates; sólo cambia cuando el tema es
Glitch.

## Why This Task Exists

Glitch es el newsletter canónico y el único correo de Efeonce, con archivo en el blog (PDR-020 rev 2.0). Con TASK-2055 su
archivo se ve como cualquier tema: el nombre escrito en Bricolage verde, «10 publicaciones» y filas que repiten
«Glitch #N:» en cada título. El operador pidió que esa página, y sólo esa, se viera «más Glitch, con sus elementos
gráficos», y aprobó la variante en el canvas el 2026-10-24 (versión 79) con dos ajustes: escala contenida («gigante no
es necesariamente elegante») y el logo en la píldora de suscripción («construye marca»).

## Goal

- `/category/glitch/` y `/glitch/` se ven como los tableros «Tema · Glitch (variante)» aprobados (≤ 1 % de píxeles
  distintos por sección a 1440 y 390), con datos reales.
- Las otras seis vistas del archivo no cambian (equivalencia y píxeles intactos).
- La suscripción funciona con el formulario real de Glitch (el mismo de `/blog/`); si no está conectado, el banner no
  aparece.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/public-site/BLOG_ARCHIVE_RUNTIME_V1.md` (plantilla, adaptador, flag, gates, desvíos)
- `docs/architecture/public-site/BLOG_HOME_RUNTIME_V1.md` §Interruptor `data-subscribe` y §Formulario conectado (píldora real)
- `docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` (valores, límites NUNCA, una sola esfera)
- `docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md` (rol de Glitch)

Reglas obligatorias:

- El canvas congelado (versión 79) es la fuente visual; sólo se permiten los desvíos de la lista cerrada de TASK-2055 y
  los de esta task (Detailed Spec).
- La variante es parte de la misma plantilla (`sc-if` sobre un bloque `gl` del documento), nunca una plantilla aparte.
- Nunca un éxito simulado: sin formulario publicado y conectado, el banner de suscripción no se pinta.
- Guttery sólo en las muletillas; el verde nunca como texto, borde o separador sobre blanco; la manzana del wordmark no
  se deforma ni se desarma.
- Toda escritura en vivo con `ssh-check`, línea base, paquete acotado, snapshot, purga y lectura a 1440/390, con visto
  bueno explícito del operador por cada `--apply`.

## Normative Docs

- `docs/ui/visual-directions/TASK-2055-blog-archive-v3/README.md` §Variante Glitch del tema
- `docs/ui/wireframes/TASK-2056-blog-archive-glitch-variant.md`
- `docs/manual-de-uso/public-site/operar-archivo-del-blog.md`
- `.claude/skills/efeonce-public-site-wordpress/references/blog-home-operation.md`

## Dependencies & Impact

### Depends on

- TASK-2055 (complete): plantilla `EOBH_Archive`, `EO_Archive_Adapter`, pipeline `scripts/public-website/blog-archive/`.
- TASK-2054: renderer `inline_pill` en producción (`renderer-latest.js` 1.2.0); esta task le agrega el logo en el rótulo.
- Formulario `efeonce-blog-subscription` publicado y conectado en `eo_blog_glitch_form_key` (ya en vivo para `/blog/`).

### Blocks / Impacts

- TASK-2054 — el renderer gana el atributo de anfitrión para el logo del rótulo (cambio aditivo, Delta).
- Sesión «Blog v3 portada: correos y eventos»: comparte `eo-blog-home` y el formulario de Glitch; turno de despliegue.

### Files owned

- `greenhouse-eo/scripts/public-website/blog-archive/` (fuente congelada `Archivo-D-tema-glitch-*`, bind, build, pruebas, fidelidad)
- `greenhouse-eo/src/growth-forms-renderer/{element.ts,renderer.ts,inline-pill.ts}` (logo del rótulo, aditivo)
- `efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/includes/content-model/class-eo-archive-adapter.php` (bloque `gl`)
- `efeonce-public-site-runtime/wp-content/plugins/eo-blog-home/{includes/class-eobh-archive.php,assets/css/eoba-host.css,assets/generated/archive*,assets/fonts/}`

## Current Repo State

### Already exists

- Tableros aprobados en el canvas «Portada Blog Efeonce» (versión 79) y copia en
  `docs/ui/visual-directions/TASK-2055-blog-archive-v3/variante-glitch-2026-10-24.tar.gz` (`gen_glitch.py` sobre `gen_d.py`).
- Plantilla del archivo con el tema genérico y la fila con logo de Glitch; formato `glitch-*` agrupado en «Glitch».
- Assets de Glitch en el catálogo del Composer: `glitch-logo-{negative,positive}.svg`, `flash-trail.svg`, Guttery 400.
- La píldora real en `/blog/`: `<greenhouse-form class="eo-inline-pill eo-inline-pill--glitch">` con tono por variables
  `--ghf-inline-*` del anfitrión.

### Gap

- El bind exige el mismo CSS en todas las vistas; la variante agrega reglas (`.gl*`), una fuente y el eje de ancho de
  Bricolage.
- El adaptador no separa ediciones, Flash y notas, ni conoce el número de edición ni la fecha del último Flash.
- El renderer dibuja el rótulo de la píldora sólo como texto.
- `eo-blog-home` no aloja fuentes propias.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeonce-public-site-runtime` (`eo-blog-home` plantilla + `efeonce-editorial-blocks` datos) y `greenhouse-eo` (renderer de Growth Forms)
- Future candidate home: `public`
- Boundary: la plantilla recibe el bloque `gl` por `eoba_data`; el renderer sólo lee un atributo de anfitrión opcional y no cambia el contrato del formulario
- Server/browser split: HTML en servidor; en el navegador sólo el renderer de Growth Forms que ya carga la portada
- Build impact: el mismo pipeline `blog-archive`; el renderer se publica con el release normal de Greenhouse
- Extraction blocker: depende de Ohio para header/footer y del release de Greenhouse para el logo de la píldora

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: lector o suscriptor potencial de Glitch que llega desde la portada, una edición, el correo o Google
- Momento del flujo: explorar el archivo del newsletter y suscribirse
- Resultado perceptible esperado: la página se reconoce como Glitch al primer vistazo y deja suscribirse sin salir
- Fricción que debe reducir: un archivo genérico que no transmite la marca y no ofrece suscribirse
- No-goals UX: motion, sonido, la manzana en bytes, cambiar la portada del blog, la vista del Flash individual

### Surface & system decision

- Surface: archivo de la categoría `glitch` de WordPress (incluida la URL `/glitch/`)
- Nav placement: `none` (destino ya enlazado desde la portada, el menú y las ediciones)
- Composition Shell: `no aplica` — sitio público WordPress, no portal
- Primitive decision: `extend` — esqueleto D + piezas Glitch con valores del token `glitchLine`; píldora = componente real de Growth Forms
- Adaptive density / The Seam: `no aplica` — tableros 1440/390
- Floating/Sidecar/Dialog decision: ninguno
- Copy source: `local one-off` — copy del canvas (wireframe); textos del formulario desde Growth Forms
- Access impact: `none`

### State inventory

- Default: cabecera Glitch, filtro, lista por año con placas, banner de suscripción, otros temas
- Loading: no aplica (servidor); la píldora tiene su loader propio
- Empty: no aplica (si Glitch quedara sin publicaciones, cae a la vista «tema vacío» genérica)
- Error: si el adaptador falla, la vista cae a Ohio y registra el error (igual que TASK-2055); error de envío: estado propio de la píldora
- Degraded / partial: sin JavaScript la píldora es un enlace a la suscripción; sin formulario conectado no hay banner; sin el renderer nuevo el rótulo muestra «Suscríbete a Glitch» en texto
- Permission denied: no aplica
- Long content: títulos sin el prefijo «Glitch #N:», con `text-wrap: balance`
- Mobile / compact: tablero 390; cifras en dos columnas
- Keyboard / focus: migas → destacada → filtro → filas → píldora → otros temas
- Reduced motion: igual que el archivo; la píldora respeta su propio `prefers-reduced-motion`

### Interaction contract

- Primary interaction: abrir una edición; suscribirse
- Hover / focus / active: los del archivo; píldora con los de Growth Forms
- Pending / disabled: loader y estados de la píldora
- Escape / click-away: no aplica
- Focus restore: lo resuelve el renderer de la píldora
- Latency feedback: loader de la órbita de la píldora
- Toast / alert behavior: ninguno; confirmación dentro de la píldora

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: ninguno en la plantilla
- Layout morph: el de la píldora (ancho), ya aprobado en TASK-2054
- Stagger: ninguno
- Timing / easing token: los del archivo y los `--ghf-inline-*`
- Reduced-motion fallback: sin transform
- Non-goal motion: falla animada, manzana que se arma, sonido

### Implementation mapping

- Route / surface: `is_category('glitch')` (y sus subcategorías no existen) detrás de `eo_blog_archive_enabled`
- Primitive / variant / kind: bloque `gl` en `archive-body.template.html`; piezas `.gl-t`, `.gl-mul`, `.gl-mh`, `.gl-bytes`, `.gl-b`, `.gl-sub`
- Component candidates: `EO_Archive_Adapter::glitch_block()`; `<greenhouse-form>` con `inline-label-logo`
- Copy source: wireframe TASK-2056 + formulario de Glitch
- Data reader / command: `EO_Archive_Adapter` (títulos publicados «Glitch #N», `eo_format` `glitch-*`); suscripción por el comando público de Growth Forms ya existente
- API parity: lectura pública de WordPress; la suscripción usa la API pública de Growth Forms (sin camino nuevo)
- Access / capability: público
- States to implement: los del inventario

### GVC scenario plan

- Scenario file: `scripts/public-website/blog-archive/fidelity/capture.cjs` con la vista `tema-glitch`
- Route: preview local (`preview/serve.cjs`) → producción con token de preview → producción
- Viewports: 1440×900, 390×844 (fidelidad); 320–1920 en 8 anchos (desborde)
- Quality profile: `premium`
- Required steps: cargar `/category/glitch/` y `/glitch/`; aplicar el filtro «Ediciones»; abrir la píldora
- Required captures: una por sección y viewport
- Required `data-capture` markers: `archive-head`, `archive-filter`, `archive-list`, `archive-subscribe`, `archive-topics`
- Assertions: `pixelmatch` ≤ 1 % por sección; un H1; axe WCAG 2.2 AA sin violaciones; las seis vistas anteriores sin cambios
- Scroll-width checks: `scrollWidth === clientWidth` de 320 a 1920
- Reduced-motion / focus evidence: recorrido con teclado hasta la píldora
- Review dossier: `docs/ui/visual-directions/TASK-2055-blog-archive-v3/` (variante Glitch)
- Baseline decision / surface ID: baseline = tableros Glitch de la versión 79; surface `public-blog-archive-glitch`

### Design decision log

- Decision: variante Glitch de la dirección D con seis elementos de la línea de Glitch y escala contenida
- Alternatives considered: tema genérico (TASK-2055); manzana desarmándose en bytes en la cabecera (descartada: recarga y deforma el logo); píldora verde con texto (descartada: el logo construye marca y la manzana se pierde sobre verde)
- Why this pattern: Glitch es el newsletter y su archivo debe reconocerse; reutiliza el esqueleto para no abrir una plantilla nueva
- Reuse / extend / new primitive: extiende el esqueleto D; la píldora es el componente real
- Open risks: el logo de la píldora depende del release del renderer; la falla en el borde es un uso nuevo aprobado sólo para esta página

### Visual verification

- GVC scenario: `blog-archive/fidelity` (vista `tema-glitch`)
- Viewports: 1440, 390 (+ desborde 320–1920)
- Required captures: por sección
- Required `data-capture` markers: los cinco del plan
- Scroll-width check: sí
- Accessibility/focus checks: axe 0; foco visible en la píldora; el H1 es una imagen con `alt="Glitch"`
- Before/after evidence: `/category/glitch/` genérico (TASK-2055) vs variante en vivo
- Known visual debt: portadas antiguas de algunas ediciones (contenido)
- Visual scorecard: `docs/ui/visual-directions/TASK-2055-blog-archive-v3/README.md` §Variante Glitch
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

### Slice 1 — Fuente congelada y enlace

- `source/Archivo-D-tema-glitch-{1440,390}.dc.html` congelados desde la versión 79; `assets.json` con la estela y Guttery.
- `bind-archive.cjs`: la vista `tema-glitch`; el CSS compartido pasa a ser el de la variante (superconjunto probado: el CSS
  de los tableros D es su prefijo exacto); desvío de la píldora (componente real dentro de `sc-if`).
- `archive-body.template.html`: bloque `gl` (título, muletilla, cifras, borde de bytes), placa por fila, banner.
- `build-archive.cjs`: Guttery a `assets/fonts/`, URL de la fuente reescrita en el CSS; fixture `tema-glitch`.
- `test-bound-equivalence.cjs` y `test-php-parity.cjs` con siete vistas.

### Slice 2 — Datos

- `EO_Archive_Adapter`: bloque `gl` cuando el término es `glitch` (última edición por número publicado y su fecha; último
  Flash y su fecha; subformato por fila; número y título sin el prefijo; filtro Ediciones/Flash/Notas; muletilla separada
  de la descripción; suscripción con `live` del formulario de la portada). Pruebas en `tests/eo-blog-archive.test.php`.

### Slice 3 — Píldora con logo

- Renderer de Growth Forms: atributo de anfitrión opcional `inline-label-logo` (URL) + `inline-label-logo-text` (la palabra
  que reemplaza); el rótulo conserva el nombre accesible completo; sin el atributo, nada cambia. Prueba unitaria.
- `eoba-host.css`: tono blanco (`--ghf-inline-tone: #ffffff`, `--ghf-inline-on-tone: #001a33`).

### Slice 4 — Verificación y despliegue

- Gate ≤ 1 % por sección a 1440/390 de la vista nueva; las seis anteriores intactas; desborde y axe.
- Despliegue acotado de `efeonce-editorial-blocks` y `eo-blog-home` con visto bueno por paso; lectura en vivo.
- El logo de la píldora llega con el próximo release de Greenhouse a producción (hasta entonces, texto).

### Slice 5 — Documentación

- `BLOG_ARCHIVE_RUNTIME_V1` (variante y desvíos), funcional, manual, skill (`blog-home-operation.md`), Handoff, changelog.

## Out of Scope

- Cambiar la píldora de la portada del blog (propuesta aparte si el operador la quiere igual).
- La manzana en bytes en el banner o en la cabecera.
- Motion, sonido o falla animada.
- Variantes para otros temas.

## Detailed Spec

**Desvíos de esta task (se suman a la lista cerrada de TASK-2055):**

10. Píldora de suscripción: el `<a class="gl-pill">` del canvas es el componente real `<greenhouse-form inline_pill>` con
    el formulario de Glitch; sin formulario conectado no se pinta el banner.
11. Guttery se sirve desde `eo-blog-home/assets/fonts/` (en el canvas, desde el almacén del artifact).
12. El número de la placa y de la cabecera sale del título publicado «Glitch #N» (regla del registro de ediciones de
    `GLITCH_GRAPHIC_LINE_V1` §2), no de un campo nuevo.

**Datos de la variante (todos de WordPress):** última edición = el post de formato edición con mayor número publicado;
último Flash = el post de formato Flash más reciente; filas: edición → placa `#N` y título sin prefijo; Flash → placa
estela + FLASH; nota → sin placa. Filtro con las cuentas de esos tres subformatos.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 antes que la 2 (sin equivalencia no se mide la fidelidad); la 3 es independiente; la 4 sólo con 1–3 verdes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El CSS compartido cambia las otras seis vistas | UI | low | prueba de prefijo exacto + gate de las seis vistas | `compare.cjs` en rojo fuera de Glitch |
| Banner con éxito simulado si el formulario se desconecta | Growth Forms | low | `sc-if` sobre `live` del adaptador | banner visible sin `<greenhouse-form>` |
| Un título fuera del patrón «Glitch #N» pierde su número | contenido | medium | sin número → fila como nota; prueba | placa ausente en una edición |
| El renderer nuevo rompe otras píldoras | Growth Forms | low | atributo opcional; pruebas existentes verdes | regresión en `/blog/` |

### Feature flags / cutover

- Mismo `eo_blog_archive_enabled` de TASK-2055: la variante sólo existe cuando la plantilla está encendida. El adaptador
  activa el bloque `gl` por término; rollback inmediato = desplegar el adaptador anterior.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slices 1–2 | Restaurar el `.tar` de `eo-blog-home` / `efeonce-editorial-blocks` del despliegue | 5 min | sí |
| Slice 3 | Quitar el atributo en la plantilla (el renderer sin atributo no cambia) | 5 min | sí |
| Total | `archive 0 --apply` (vuelve Ohio en todo el archivo) | 2 min | sí |

### Production verification sequence

1. `pnpm public-website:ssh-check`; turno con la sesión «Blog v3 portada: correos y eventos».
2. Despliegue del adaptador y de `eo-blog-home` con visto bueno por paso.
3. `/category/glitch/` y `/glitch/` a 1440/390: gate, axe, desborde; la píldora abre y su enlace sin JS funciona.
4. Las seis vistas genéricas sin cambios; `/blog/` verify verde.

### Out-of-band coordination required

- Visto bueno del operador para cada `--apply`.
- Release de Greenhouse a producción para el logo de la píldora (control plane de release).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Se declaro `Execution profile: ui-ux` y `UI impact` segun el alcance real.
- [ ] `UI ready` permanece `no` hasta que el wireframe y `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log; si esta en `yes`, pasa `pnpm task:lint --task TASK-2056`.
- [x] Se declaro `Wireframe: docs/ui/wireframes/TASK-2056-blog-archive-glitch-variant.md` y el archivo existe.
- [x] La vista `tema-glitch` pasa el gate (≤ 1 % por sección) a 1440 y 390 contra los tableros de la versión 79. Plantilla + fixture: 10/10 a 0 % (2026-10-24). En vivo 7/10: el banner difiere por la píldora real (desvío 10) y «Otros temas» por los datos reales.
- [x] Equivalencia y paridad PHP verdes en las siete vistas; las seis anteriores sin cambio de píxeles.
- [x] Sin scroll horizontal de 320 a 1920 en `/category/glitch/` y `/glitch/`; un H1; axe 0.
- [ ] La píldora real suscribe con el formulario de Glitch; sin formulario conectado no hay banner. Montada en vivo con el formulario de `/blog/` (verificado que el renderer la monta); el «sin banner» está probado en PHP. Sin envío real de prueba.
- [x] El renderer muestra el logo en el rótulo con el atributo y no cambia nada sin él (prueba unitaria).
- [x] Documentación actualizada (runtime, funcional, manual, skill).

## Verification

- `node scripts/public-website/blog-archive/test-bound-equivalence.cjs`, `test-php-parity.cjs`
- `node scripts/public-website/blog-archive/fidelity/capture.cjs` + `blog-v3/fidelity/compare.cjs` por vista
- `php tests/eo-blog-archive.test.php` en el runtime
- `pnpm vitest run src/growth-forms-renderer`
- Playwright a 1440/390 y 8 anchos de 320 a 1920

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- Alinear la píldora de la portada del blog con la del archivo (blanca con logo), si el operador lo aprueba.
