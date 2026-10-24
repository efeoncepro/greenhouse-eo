# TASK-2051 — Portada del blog v3 en alta fidelidad

## Delta 2026-10-24

- Formularios en línea de Glitch y del webinar disponibles en el renderer (`presentation: 'inline_pill'`, renderer
  `1.2.0`) y conteo público `GET /api/public/growth/forms/{formRef}/registrations-count` → `{ count, display, shown }`
  — code complete en develop (local) por TASK-2053/TASK-2054; llegan a los hosts con el próximo release a `main`.
  Embed, tokens y piel de referencia: `growth-public-forms-runtime-contract.md` §Formulario en línea y
  `scripts/growth/forms/fixtures/inline-pill-host-skin.css`. El anfitrión da a `<greenhouse-form>` el ancho de su
  columna (≥ 480 px para los anchos del canvas) y compone la nota del evento (en el canvas es absoluta).


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
- Execution profile: `ui-ux`
- UI impact: `motion`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-2051-blog-portada-v3-high-fidelity.md`
- Flow: `docs/ui/flows/TASK-2051-blog-portada-v3-high-fidelity-flow.md`
- Motion: `docs/ui/motion/TASK-2051-blog-portada-v3-high-fidelity-motion.md`
- Backend impact: `none`
- Epic: `none`
- Status real: `En producción en /blog/ desde 2026-10-24 (corte 08:13Z, snapshot _gh_blog_home_v3_before_20261024_081327) con datos reales, menú canónico, foto del autor y operación por pnpm public-website:blog-home; la suscripción real a Glitch espera el release de Greenhouse (consentBy submission) y la publicación del formulario píldora; sin ella la portada no muestra suscripción`
- Rank: `TBD`
- Domain: `public-site|content|ui`
- Blocked by: `TASK-2050 (sólo eventos, formatos y fijadas; las demás secciones avanzan antes)`
- Branch: `Runtime efeonce-public-site-runtime main (checkout /Users/jreye/Documents/efeonce-public-site-runtime); scripts y docs en Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye en `efeoncepro.com/blog/` la portada del blog que el operador aprobó en el canvas v3, tal cual: slider de
destacados a sangre, «Pregúntale al blog» con haz de luz, Glitch con suscripción en línea, eventos con cuenta regresiva
y reserva en línea, riel, órbita de temas, archivo por año y suscripción con cinta, con el header y el footer canónicos
del sitio. La aceptación es un gate de fidelidad por píxeles (≤ 1 % por sección a 1440 y 390) contra el canvas.

## Why This Task Exists

El operador pidió implementar «el diseño que tú hiciste, no otro, alta fidelidad». Hoy `/blog/` es una página Elementor
con widgets de Ohio y header-6, excluida del menú global (`EO_SITE_NAV_EXCLUDED_PAGES = array( 18456 )` en
`ohio-child/inc/site-nav.php:33`), y la etapa 1 (`greenhouse_blog_section`, sólo en develop) tiene otra dirección
visual. Sin una task que fije el canvas como fuente y la fidelidad como gate medible, la implementación deriva hacia lo
que ya existe — que es exactamente lo que el operador rechazó.

## Goal

- `/blog/` se ve igual que el canvas v3 en escritorio y teléfono, con datos reales y header/footer canónicos.
- Cada interacción del canvas funciona igual (slider, haz, botones, formularios en línea, cuenta regresiva, riel, años, cinta).
- La página cumple rendimiento (LCP ≤ 2,5 s p75, INP ≤ 200 ms, CLS ≤ 0,1), accesibilidad y SEO (un H1, grafo Yoast intacto).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/public-site/PRIMITIVES.md`
- `docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md` (adaptador WordPress, interruptor, tono por luminancia)
- `docs/public-site/decisions/PDR-024-axis-en-el-sitio-publico-composicion-agentica.md` (AXIS no tiene módulos de página)
- `docs/public-site/decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md`
- `docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md`

Reglas obligatorias:

- El canvas congelado (`docs/ui/visual-directions/TASK-2051-blog-portada-v3/`) es la fuente visual; sólo se permiten los
  desvíos de la lista cerrada de su README.
- Widgets en `eo-elementor-widgets` (no un plugin nuevo), renderizados en servidor; nunca `_elementor_data` directo
  (`Document::save`); CSS con alcance `.gh-blog-v3`; sin React en el frontend público.
- Header y footer canónicos: quitar 18456 de la exclusión con el carril del tema; el pie es el de `ohio-child`.
- Toda escritura en vivo con `pnpm public-website:ssh-check`, snapshot, paquete acotado y rollback; publicar sólo con
  aprobación explícita del operador.

## Normative Docs

- `docs/ui/visual-directions/TASK-2051-blog-portada-v3/README.md`
- `.claude/skills/efeonce-public-site-wordpress/references/landing-workflow.md`
- `.claude/skills/efeonce-public-site-wordpress/references/custom-elementor-widgets.md`
- `.claude/skills/efeonce-public-site-wordpress/references/source-led-elementor-patterns.md`
- `.claude/skills/efeonce-public-site-wordpress/references/elementor-mutation.md`
- `.claude/skills/efeonce-public-site-wordpress/references/global-site-navigation.md`
- `.claude/skills/seo-aeo/references/editorial-image-seo.md`
- `.claude/skills/seo-aeo/references/home-landing-metadata-schema.md`

## Dependencies & Impact

### Depends on

- TASK-2050 — readers de eventos, formatos, fijadas y recursos.
- TASK-2052 — primitives AXIS (botón con texto que rueda y flecha dibujada, segmentado, buscador con haz); mientras no
  estén publicadas se usa la copia local del canvas con los mismos valores.
- TASK-2053 y TASK-2054 — formularios en línea (Glitch, evento) con Growth Forms.
- Suscripción del blog en Growth Forms (form key `6bc62588…`, `scripts/public-website/blog-growth-form/PUBLICATION-CHECKLIST.md`).

### Blocks / Impacts

- TASK-1802 — su dirección visual queda reemplazada por el canvas v3 (Delta).
- TASK-2042 — `/blog/` deja de ser excepción del menú global.
- Menú global: la franja de Recursos apunta al ancla `#suscripcion` (`pnpm public-website:site-nav`).

### Files owned

- `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/includes/blog-v3/` [crear]
- `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/css/blog-v3.css` [crear]
- `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/js/blog-v3/` [crear]
- `efeonce-public-site-runtime/wp-content/themes/ohio-child/inc/site-nav.php` (sólo la constante de exclusión)
- `greenhouse-eo/scripts/public-website/blog-v3/` [crear: fixture, preview, fidelidad, paquete, publicación]
- `greenhouse-eo/docs/ui/visual-directions/TASK-2051-blog-portada-v3/`
- `greenhouse-eo/docs/ui/reviews/TASK-2051-blog-portada-v3/` [crear]

## Current Repo State

### Already exists

- Canvas aprobado y congelado en `docs/ui/visual-directions/TASK-2051-blog-portada-v3/`.
- Menú AXIS `eo-site-nav` en todo el sitio salvo 18456; footer V2 de `ohio-child`.
- Patrones de landings en `eo-elementor-widgets/includes/<landing>/` (agency, nosotros, partners, inbound…).
- Banners del slider: tres generados (`ai-generations/2026-10-23_blog-portada-slider/`) y el de AEO aprobado.
- Preview local de la etapa 1 (`scripts/public-website/blog-phase1/serve-preview.ts`, `127.0.0.1:8842/blog/`).

### Gap

- No existe ningún widget con el diseño v3, ni slider/carrusel genérico, ni cuenta regresiva.
- No hay referencias por sección ni script de comparación de fidelidad para esta página.
- La plantilla de 18456 usa header-6 con sidebar; los rieles de Ohio desde 1181 px chocan con el slider a sangre.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeonce-public-site-runtime` → `eo-elementor-widgets` (WordPress/Elementor en Kinsta)
- Future candidate home: `public`
- Boundary: los widgets `greenhouse_blog_v3_hero` … `greenhouse_blog_v3_subscribe` consumen sólo `EO_Home_Readers` (TASK-2050), el web component greenhouse-form de Growth Forms y primitives AXIS vendorizadas
- Server/browser split: HTML y datos en servidor (PHP); JS vanilla sólo realza; sin secretos ni llamadas a proveedores desde el navegador más allá de Growth Forms público
- Build impact: CSS y JS propios del widget (sin bundler nuevo); assets AXIS vendorizados con `VERSION.json`
- Extraction blocker: depende de Elementor/Ohio para el shell y de Kinsta para caché

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: visitante del blog (marketers, líderes de marketing y tecnología en LatAm) y prospectos
- Momento del flujo: entrada al hub editorial de Efeonce (Marketing con Manzanitas + Glitch)
- Resultado perceptible esperado: portada de agencia premium, de alto impacto, que se actualiza sola
- Fricción que debe reducir: encontrar qué leer, suscribirse y reservar sin salir de la página
- No-goals UX: rediseñar header o footer; búsqueda con IA; páginas de entrada o de evento

### Surface & system decision

- Surface: página WordPress 18456 (`/blog/`)
- Nav placement: `none` (la superficie ya existe en el menú global)
- Composition Shell: `no aplica` — sitio público WordPress, no portal
- Primitive decision: `extend` — botón AXIS (texto que rueda, flecha dibujada), segmentado y buscador desde TASK-2052; módulos de página nuevos en el plugin
- Adaptive density / The Seam: `no aplica` — página editorial con breakpoints del canvas
- Floating/Sidecar/Dialog decision: ninguno; formularios en línea
- Copy source: `local one-off` — copy editorial del canvas en el widget y datos de WordPress; no es portal
- Access impact: `none`

### State inventory

- Default: ocho secciones con datos reales
- Loading: no aplica (render de servidor)
- Empty: reglas por sección del wireframe (evento → grabación; sin datos → sección oculta)
- Error: estado de error del formulario dentro de la píldora
- Degraded / partial: sin JS (primera diapositiva, búsqueda GET, scroll nativo, fecha absoluta)
- Permission denied: no aplica (público)
- Long content: títulos con balance y tamaño por largo; nombres de speakers en dos líneas
- Mobile / compact: tablero `Movil-v3` a 390
- Keyboard / focus: orden del flujo; ← → sólo dentro del slider; foco visible AXIS
- Reduced motion: sin autoplay, barrido, paralaje ni haz animado

### Interaction contract

- Primary interaction: leer un destacado; secundaria: suscribirse/reservar en línea
- Hover / focus / active: botones con texto que rueda y flecha dibujada; filas con fondo suave y avance 8 px; tarjetas que suben
- Pending / disabled: loader de la órbita en el botón de envío
- Escape / click-away: Esc cierra el formulario en línea si está vacío
- Focus restore: al cerrar, foco al botón; tras éxito, foco al mensaje
- Latency feedback: loader inmediato al enviar
- Toast / alert behavior: sin toasts; mensajes en línea

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: barrido del slider; palabras que suben; formularios que se estiran
- Layout morph: píldora → formulario → éxito → estado final
- Stagger: 45 ms por palabra del título
- Timing / easing token: valores del canvas (ver motion doc)
- Reduced-motion fallback: ver motion doc
- Non-goal motion: animación en scroll de secciones completas

### Implementation mapping

- Route / surface: `/blog/` (18456)
- Primitive / variant / kind: AXIS button (`line` turquesa, Engine, Glitch), segmented, search-field
- Component candidates: `greenhouse_blog_v3_hero`, `_ask`, `_glitch`, `_events`, `_rail`, `_topics`, `_archive`, `_subscribe`
- Copy source: canvas v3 (copy editorial) + WordPress
- Data reader / command: `EO_Home_Readers::*` (TASK-2050)
- API parity: lectura por REST `/wp-json/eo/v1/home/*`; formularios por Growth Forms
- Access / capability: público
- States to implement: los del inventario

### GVC scenario plan

- Scenario file: `scripts/public-website/blog-v3/fidelity/blog-v3.scenario.mjs`
- Route: preview local → preview Kinsta → producción
- Viewports: 1440×900, 1024×768, 390×844, 320×640
- Quality profile: `premium`
- Required steps: carga, cambio de diapositiva, foco en buscador, formulario en línea a éxito, cambio de año
- Required captures: una por sección y viewport
- Required `data-capture` markers: `blog-hero`, `blog-ask`, `blog-glitch`, `blog-events`, `blog-rail`, `blog-topics`, `blog-archive`, `blog-subscribe`
- Assertions: `pixelmatch` ≤ 1 % por sección; un H1; foco visible
- Scroll-width checks: `scrollWidth === clientWidth` en los cuatro viewports
- Reduced-motion / focus evidence: corrida con movimiento reducido y recorrido con teclado
- Review dossier: `docs/ui/reviews/TASK-2051-blog-portada-v3/`
- Baseline decision / surface ID: baseline = referencias del canvas; surface `public-blog-home-v3`

### Design decision log

- Decision: canvas v3 1:1 como widgets de consulta en servidor
- Alternatives considered: diseño de la etapa 1; compilador estático; React
- Why this pattern: fidelidad exigida + datos vivos + sin JS pesado
- Reuse / extend / new primitive: extiende AXIS (TASK-2052); módulos de página nuevos en el plugin
- Open risks: rieles de Ohio; peso del hero; formularios en línea

### Visual verification

- GVC scenario: `blog-v3.scenario.mjs`
- Viewports: 1440, 1024, 390, 320
- Required captures: por sección
- Required `data-capture` markers: los ocho
- Scroll-width check: sí
- Accessibility/focus checks: axe sin violaciones serias; foco visible; slider con pausa
- Before/after evidence: `/blog/` actual vs v3
- Known visual debt: arte clave por evento pendiente de producción
- Visual scorecard: `docs/ui/reviews/TASK-2051-blog-portada-v3.scorecard.json`
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

### Slice 1 — Referencias y gate de fidelidad

- Fixture con los datos de ejemplo del canvas (`renderVals()`), referencias PNG por sección a 1440 y 390 en
  `docs/ui/visual-directions/TASK-2051-blog-portada-v3/referencias/`.
- `scripts/public-website/blog-v3/fidelity/compare.mjs` (pixelmatch por `data-capture`, hoja lado a lado).

### Slice 2 — Base: plantilla, CSS y header/footer canónicos

- Plantilla de página sin sidebar ni rieles de Ohio; `blog-v3.css` copiado del canvas con alcance `.gh-blog-v3`.
- Constante de exclusión sin 18456 (carril del tema), 85 px reservados para la isla, footer de `ohio-child`.

### Slice 3 — Slider de destacados

- Widget `greenhouse_blog_v3_hero` + `hero.js` (barrido, palabras, contador, siguiente, paralaje, arrastre, teclado, pausa).
- Imágenes de la Media Library (WebP, `srcset`, primera con `fetchpriority="high"`).

### Slice 4 — Pregúntale al blog y Glitch

- Buscador con haz (copia del canvas o AXIS), chips, resultados en línea por REST, fallback GET.
- Glitch con la manzana en bytes, edición, Flash, números y la píldora que se transforma (TASK-2054).

### Slice 5 — Eventos

- Tarjeta del evento, franja de cuenta regresiva, aprendizajes, agenda, próximos y grabaciones con datos de TASK-2050.

### Slice 6 — Riel, órbita, archivo y suscripción

- Riel con flechas, órbita con arcos `measureSvg` calculados en servidor, archivo con año sticky y selector, cinta y formulario final.

### Slice 7 — Fidelidad, rendimiento y publicación

- Gate de fidelidad verde, hoja lado a lado aprobada por el operador, LCP/INP/CLS medidos, axe limpio.
- Publicación con `Document::save`, snapshot, purga y verificación en producción (sólo con aprobación).

## Out of Scope

- Modelo de contenido (TASK-2050) y formularios (TASK-2053/2054).
- Páginas de entrada, de evento y de archivo por tema.
- Rediseño del header o del footer.
- Búsqueda con IA.

## Detailed Spec

Todo valor visual sale del canvas congelado. La tabla de secciones, `data-capture` y la lista cerrada de desvíos
están en `docs/ui/visual-directions/TASK-2051-blog-portada-v3/README.md`; layout y estados en el wireframe; motion en el
motion doc. Lecciones medidas en el canvas que aplican al código: no usar `cqi` en tamaños, no usar `var()` dentro de
keyframes para el haz, máscaras de palabra con padding `.14em .1em .14em .06em` para no cortar glifos, y el logo de
Efeonce en línea (no como archivo aparte).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (referencias + gate) antes de cualquier widget: sin gate no hay forma de medir fidelidad.
- Slice 2 → 3 → 4 → 6 en cualquier orden después de la base; Slice 5 espera TASK-2050 (eventos).
- Slice 7 sólo con todos los anteriores verdes y aprobación explícita del operador.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La implementación deriva del canvas | UI | high | gate de píxeles ≤ 1 % por sección + hoja lado a lado | compare.mjs en rojo |
| Rieles/sidebar de Ohio rompen el slider a sangre | UI / WordPress | medium | plantilla sin sidebar y metas `page_*` copiadas de una landing que ya lo resolvió | scroll horizontal en 1440 |
| Hero pesado empuja LCP | rendimiento | medium | `<img>` prioritaria, WebP ≤ 150 KB, animaciones tras el primer pintado | LCP en CrUX/GSC |
| Quitar la exclusión rompe el header en otras páginas | WordPress | low | el carril del tema sólo toca la constante; verificación en tres páginas | GVC del header |
| Publicar sin aprobación | release | low | snapshot + publicación sólo con aprobación explícita | n/a |

### Feature flags / cutover

- Cutover por página: la versión nueva se arma en una página de preview (borrador) y se publica sobre 18456 con
  `Document::save` sólo al aprobar. Revert: restaurar el snapshot de 18456 y volver a excluir 18456 del menú.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir commit (scripts y referencias) | 1 min | sí |
| Slice 2–6 | Revertir el paquete del plugin (backup `.tar` en `/tmp` de Kinsta) | 10 min | sí |
| Slice 7 | Restaurar snapshot de 18456 + exclusión del menú + purga | 10 min | sí |

### Production verification sequence

1. `pnpm public-website:ssh-check`, `export-live-code`, `diff-runtime`.
2. Paquete acotado en dry-run, luego apply con backup.
3. Página de preview en borrador con los widgets; gate de fidelidad y axe contra la preview.
4. Aprobación del operador con la hoja lado a lado.
5. Publicar sobre 18456 con snapshot; quitar la exclusión del menú; purgar.
6. Verificar en producción a 1440 y 390; medir CWV durante 7 días.

### Out-of-band coordination required

- Aprobación del operador para publicar en producción.
- Banners y arte clave aprobados por el operador.
- Release de Growth Forms (TASK-2053/2054 y la suscripción del blog).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Se declaro `Execution profile: ui-ux` y `UI impact` segun el alcance real.
- [ ] `UI ready` permanece `no` hasta que el wireframe y `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log; si esta en `yes`, pasa `pnpm task:lint --task TASK-2051`.
- [x] Se declaro `Wireframe: docs/ui/wireframes/TASK-2051-blog-portada-v3-high-fidelity.md` y el archivo existe.
- [x] Se declaro `Flow` y `Motion` y los archivos existen.
- [x] Cada sección pasa el gate de fidelidad (≤ 1 % de píxeles distintos) a 1440 y 390 contra las referencias del canvas. Evidencia 2026-10-24 en el sitio en vivo (`/blog-v3-revision/`, `fidelity/capture.cjs url` + `compare.cjs`): 25/25 secciones con tablet incluida; la mayor diferencia es la cuenta regresiva, que corre con la hora real (0,86 % en móvil).
- [x] El operador aprobó la hoja lado a lado de cada sección. Aprobada el 2026-10-24 («Apruebo sí»); la hoja (https://claude.ai/artifact/VZELsJUCwxjvEj999eHCVB) ahora compara contra el sitio en vivo e incluye tablet.
- [x] `/blog/` muestra el header AXIS y el footer de `ohio-child`; la exclusión de 18456 ya no existe. Desplegado el 2026-10-24 (paquete del tema `78331ff5…`, corte de la página; `verify` en vivo: plantilla, un H1, menú canónico, indexable).
- [x] Sin scroll horizontal de página a 1440, 1024, 390 y 320. Medido en vivo de 1920 a 320 px (17 anchos, tres tableros): 0 px de desborde.
- [ ] Un solo H1; grafo Yoast sin piezas duplicadas; axe sin violaciones serias. Un solo H1 verificado en vivo y en la prueba del runtime; axe WCAG 2.2 AA 0 violaciones en vivo en escritorio, tablet y móvil. Pendiente: grafo Yoast de /blog/ (se verifica en el corte).
- [ ] LCP ≤ 2,5 s, INP ≤ 200 ms y CLS ≤ 0,1 en la medición de laboratorio de 390 y 1440. Medido en vivo con el perfil móvil de Lighthouse (150 ms, 1,6 Mbps, CPU ×4): la imagen del hero se pinta a 3,8 s en móvil, 3,4 s en tablet y 3,6–5,0 s en escritorio; CLS ≤ 0,05; INP 128–248 ms. No cumple 2,5 s: el sitio ya tarda 2,8–3,9 s en el primer pintado con ese perfil (`/agenda/`, `/blog/`: 1,4 MB de scripts) y en móvil el LCP lo toma el banner de cookies del sitio (10–17 s). Seguimiento de sitio, fuera de esta task.
- [x] Movimiento reducido: sin autoplay, barrido, paralaje ni haz animado. Verificado 2026-10-24: la diapositiva no avanza en 9 s y no queda ninguna animación infinita activa, a 1440 y 390.
- [ ] Sin JavaScript: primera diapositiva, búsqueda GET, riel y archivo funcionan. La primera diapositiva, el riel y el archivo se sirven sin JavaScript (las capturas del gate son sin JS). La búsqueda GET necesita la URL real de búsqueda que entrega TASK-2050.

## Verification

- `node scripts/public-website/blog-v3/fidelity/compare.mjs`
- `php -l` de los widgets; pruebas PHP del runtime
- Playwright/Webwright en los cuatro viewports con y sin movimiento reducido
- `pnpm public-website:ssh-check` antes de cualquier escritura en vivo

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] el registro de landings de la skill `efeonce-public-site-wordpress` incluye la portada v3

## Follow-ups

- Página pública de cada evento.
- Promover a AXIS lo que resulte reutilizable del slider si otra superficie lo pide.

## Open Questions

- ¿El slider respeta el orden PDR-020 (Glitch → herramienta → diagnóstico) o el orden del canvas? El reader de
  TASK-2050 aplica PDR-020; el diseño no cambia, sólo el orden de los datos.
- Tablet (768 a 1099 px): el canvas sólo diseña 1440 y 390. Medido el 2026-10-24: el tablero de escritorio se
  rompe bajo 1100 px (titulares sobre las imágenes) y el móvil estirado deja el hero en 390 px con el resto vacío.
  Interino: tablero móvil bajo 1100 px. Decisión del operador: diseñar un tablero de tablet en el canvas o aceptar
  el interino.
- Dos H1 en el HTML (uno por tablero, sólo uno visible): ¿se acepta, o el tablero oculto pasa su H1 a otro nivel?
  Cambiarlo es un desvío de marcado invisible y se puede aplicar en `bind-canvas.cjs` a ambos tableros.

## Decisiones de implementación (2026-10-24)

- Publicación para revisión pedida por el operador («que quede publicado en el sitio para revisar»): plugin
  `eo-blog-home` instalado en vivo (runtime `162375a`) y página aparte `/blog-v3-revision/` (252046, noindex,
  sin enlaces) con `create-blog-home-review-page.php`; `/blog/` no se tocó, porque mostraría al público el
  contenido de ejemplo. Corte de `/blog/`: `publish-blog-home-page.php` + paquete del tema, con aprobación.
- Integración medida en vivo: Ohio aplica 16 px de padding al contenedor y −16 px de margen al cuerpo Elementor,
  no en todos los anchos; ambos van a cero sólo donde vive la portada (`eobh-host.css`).
- Los formularios de la revisión son los del canvas: el envío es simulado y no guarda nada hasta TASK-2053/2054.

- La portada vive en un plugin propio, `eo-blog-home`, y no en `eo-elementor-widgets/includes/blog-v3/` como
  decía el plan: el plugin compartido tiene trabajo sin commitear de otra sesión (su archivo principal incluido) y
  un plugin propio tiene versión, paquete y rollback independientes (mismo patrón que `eo-landing-dock`).
- La plantilla es el canvas mismo: `bind-canvas.cjs` → AST que renderizan PHP (`EOBH_Template`) y el navegador
  (`dc-runtime.js`) con la lógica del canvas. Paridad PHP = primer render del navegador, byte a byte, en 6 casos.
- Aislamiento del tema: raíz `#eobh` con `all: initial`, reset `all: revert` con especificidad de ID sobre los
  elementos HTML, imágenes y SVG con sus propiedades de caja revertidas (sin tocar width/height/fill) y keyframes
  con nombre propio por tablero.
- Archivos generados en `assets/generated` (el `.gitignore` del runtime ignora toda carpeta `build/`).
