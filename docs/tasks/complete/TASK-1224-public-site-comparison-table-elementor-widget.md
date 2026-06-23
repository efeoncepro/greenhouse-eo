# TASK-1224 — Public Site reusable "Comparison Table" Elementor widget

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content|ui`
- Blocked by: `none`
- Branch: `task/TASK-1224-comparison-table-elementor-widget`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reemplazar la tabla comparativa estática (hoy dos imágenes `Tabla-Globe-scaled.webp` desktop + `Tabla-Globe-Mobile-1.webp` mobile en `/agencia-creativa/`, page_id `249582`) por un **widget custom de Elementor `greenhouse_comparison_table`** data-driven, en un **plugin nuevo `eo-elementor-widgets`** del runtime repo `efeoncepro/efeonce-public-site-runtime`. El widget renderiza una `<table>` semántica server-side con theming por tokens/preset, reflow responsive real (sin segundo asset) y clases `gh-*` estables. Es una primitiva reutilizable de comparativa 2 columnas (Dimensión × Opción A vs Opción B), con preset "Globe".

## Why This Task Exists

La comparativa "GLOBE vs Agencia Tradicional" es contenido de venta de alto valor pero hoy es una **imagen**: cero accesibilidad (texto invisible a lectores de pantalla y a Google), borrosa en retina, dos assets a mantener (desktop + mobile), no se traduce ni se A/B-testea, y cada cambio de copy obliga a reexportar en Figma. Es exactamente el caso que el strategy doc del sitio público (`wordpress-custom-widgets-react-strategy.md`) define para promover a widget custom: módulo repetible, Ohio no lo cubre, hoy resuelto con deuda (imagen). Convertirlo en un widget real es un upgrade de accesibilidad/SEO/mantenibilidad y deja una primitiva reutilizable para futuras comparativas (planes, nosotros-vs-competencia, antes/después).

## Goal

- Un widget Elementor `greenhouse_comparison_table` registrado bajo categoría `greenhouse`, en plugin propio `eo-elementor-widgets` del runtime repo, que rinde una `<table>` semántica accesible y responsive.
- Data-driven: N filas (repeater) + config de 2 columnas (título, logo, ribbon "best option", preset), sin reexportar imágenes para cambiar copy.
- La sección de `/agencia-creativa/` deja de depender de las imágenes `Tabla-Globe-*.webp` y usa el widget con el contenido transcrito, verificado con captura visual desktop + mobile.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/documentation/public-site/wordpress-custom-widgets-react-strategy.md` — decisión canónica: widget custom en plugin propio del runtime repo, NO en parent theme Ohio; contrato técnico mínimo del widget; etapas; guardrails.
- `docs/documentation/public-site/wordpress-ohio-elementor-widget-inventory.md` — inventario Ohio/Elementor (confirmar que ningún widget Ohio maduro cubre el caso).
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md` — control plane: Greenhouse gobierna, WordPress es runtime.
- `.claude/skills/efeonce-public-site-wordpress/SKILL.md` — modelo operativo del sitio (Kinsta SSH, `Document::save()`, GVC, draft-first, cache purge).

Reglas obligatorias:

- Widget vive en plugin del runtime repo (`efeoncepro/efeonce-public-site-runtime`), NUNCA en `ohio` parent ni `ohio-child` salvo emergencia documentada.
- Render server-side PHP, sanitize/escape de todo valor, CSS/JS encolado solo cuando el widget está en la página.
- Theming por CSS custom properties / preset, NUNCA HEX/gradiente inline (Figma Implementation Contract: Figma = intención, no valores).
- `<table>` semántica con `scope` (no divs-as-table); checkmarks/cross con texto accesible, no solo color/icono.
- Motion (si hay) detrás de `prefers-reduced-motion`.
- Draft/private first + GVC desktop/mobile antes de tocar la página live; backup + cache purge Kinsta.

## Normative Docs

- `docs/manual-de-uso/public-site/wordpress-ohio-elementor-landing-playbook.md` — playbook de landings.
- Elementor: registro moderno `elementor/widgets/register`, clase `\Elementor\Widget_Base` (refs en el strategy doc).

## Dependencies & Impact

### Depends on

- Runtime repo `efeoncepro/efeonce-public-site-runtime` (local: `/Users/jreye/Documents/efeonce-public-site-runtime`) accesible y desplegable. `[verificar]` rail de deploy a Kinsta (el strategy doc nota deploy apply aún bloqueado por token Kinsta/release policy → activar el plugin puede requerir subir vía SSH/scp como las ediciones de CSS actuales).
- Elementor / Elementor Pro activos en el sitio (confirmado: `4.1.3` / `4.1.1` por strategy doc) `[verificar versión vigente]`.

### Blocks / Impacts

- Habilita reutilización del widget en otras landings (comparativas futuras).
- No bloquea otras tasks.

### Files owned

Runtime repo `efeoncepro/efeonce-public-site-runtime` (cross-repo — paths `[verificar]` al crear el plugin):

- `wp-content/plugins/eo-elementor-widgets/eo-elementor-widgets.php`
- `wp-content/plugins/eo-elementor-widgets/includes/class-eo-widgets-loader.php`
- `wp-content/plugins/eo-elementor-widgets/includes/widgets/class-eo-comparison-table-widget.php`
- `wp-content/plugins/eo-elementor-widgets/assets/css/comparison-table.css`
- `wp-content/plugins/eo-elementor-widgets/assets/js/comparison-table.js` (opcional)
- `wp-content/plugins/eo-elementor-widgets/readme.txt`

greenhouse-eo:

- `docs/tasks/to-do/TASK-1224-public-site-comparison-table-elementor-widget.md` (este archivo)
- `.claude/skills/efeonce-public-site-wordpress/SKILL.md` + `.codex/skills/efeonce-public-site-wordpress/SKILL.md` (registrar el widget como Current Runtime Fact)
- `docs/documentation/public-site/wordpress-custom-widgets-react-strategy.md` (marcar el piloto entregado)

## Current Repo State

### Already exists

- Runtime repo con 3 plugins: `eo-headless-content`, `eo-vibe-coding-api` (servicios Elementor: `class-eov-elementor-document-service.php`, `-mutation-service`, `-pattern-renderer`, `-tree-service`, `-landing-builder-rest-controller`), `greenhouse-wp-bridge` (read-only/HMAC foundation).
- Strategy doc canónico con contrato técnico de widget custom + shape conceptual + ubicación recomendada.
- Sección live en `/agencia-creativa/` (page_id `249582`): badge `005dc8e` "GLOBE vs El resto" + image `078466f` (attachment `249604`, `Tabla-Globe-scaled.webp`) + image `14cfbe2` (attachment `249647`, `Tabla-Globe-Mobile-1.webp`).
- SSH/WP-CLI + `Document::save()` + GVC operativos (skill `efeonce-public-site-wordpress`).

### Gap

- No existe plugin `eo-elementor-widgets` ni categoría `greenhouse` de widgets.
- No existe el widget `greenhouse_comparison_table`.
- La comparativa es imagen → sin accesibilidad/SEO/edición/reflow real.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform` (primitiva reusable nueva del sitio público)
- Usuario / rol: visitante público de `efeoncepro.com` (prospecto comercial); editor de marketing en el builder Elementor.
- Momento del flujo: sección de comparación "GLOBE vs el resto" dentro de la landing de agencia.
- Resultado perceptible esperado: misma estética de la imagen (gradiente magenta→naranja, ribbon "BEST OPTION", checks) pero como tabla real: texto seleccionable, accesible, nítida en retina, editable sin Figma.
- Friccion que debe reducir: mantener/exportar dos imágenes por cada cambio de copy; contenido inaccesible.
- No-goals UX: no rediseñar la comparativa; replicar el estilo existente con fidelidad.

### Surface & system decision

- Surface: widget Elementor en sección de landing pública (no portal Greenhouse).
- Composition Shell: `no aplica` — es sitio público WordPress/Ohio, no el shell del portal.
- Primitive decision: `new` — nueva primitiva `greenhouse_comparison_table` (no existe equivalente Ohio; `ohio_service_table` es pricing 1-producto).
- Adaptive density / The Seam: `no aplica` (concepto del portal; aquí el equivalente es reflow por container query).
- Floating/Sidecar/Dialog decision: no aplica.
- Copy source: controles del widget en Elementor (editor-entered) + defaults del preset Globe. NO `src/lib/copy/*` (eso es el portal Next.js; esto es WordPress público).
- Access impact: `none`.

### State inventory

- Default: tabla 2 columnas, N filas, columna B con ribbon "best option".
- Loading: N/A (render server-side, sin fetch).
- Empty: si no hay filas, el widget no rinde tabla (placeholder solo en editor Elementor).
- Error: fallback si falta logo de columna (omitir img, mantener título); celda vacía permitida.
- Degraded / partial: si el plugin se desactiva, la página no rompe (degrada; el slot queda vacío en editor).
- Permission denied: N/A.
- Long content: celdas con texto largo hacen wrap; altura de fila fluida.
- Mobile / compact: reflow a card-por-dimensión (cada fila compara A vs B apilado), SIN segundo asset.
- Keyboard / focus: tabla navegable; sin controles interactivos (es contenido). Links dentro de celda (si los hubiera) con focus visible.
- Reduced motion: si hay reveal-on-scroll, desactivado bajo `prefers-reduced-motion`.

### Interaction contract

- Primary interaction: ninguna (contenido informativo). Lectura.
- Hover / focus / active: opcional realce sutil de fila al hover (desktop), sin afectar legibilidad.
- Pending / disabled: N/A.
- Escape / click-away: N/A.
- Focus restore: N/A.
- Latency feedback: N/A.
- Toast / alert behavior: N/A.

### Motion & microinteractions

- Motion primitive: `CSS` (opcional reveal-on-scroll por fila vía `animation-timeline: view()` o IntersectionObserver ligero).
- Enter / exit: fade/translate sutil de filas al entrar en viewport (opcional, no bloqueante).
- Layout morph: el reflow desktop→card es por container query, sin animación.
- Stagger: opcional, suave, por fila.
- Timing / easing token: duraciones cortas (≤300ms), easing decelerado.
- Reduced-motion fallback: sin movimiento, contenido visible inmediato.
- Non-goal motion: nada cinemático ni que retrase la lectura.

### Visual verification

- GVC scenario: captura Playwright del sitio público (`efeoncepro.com/agencia-creativa/`) — NO el GVC del portal; usar el patrón Playwright del skill `efeonce-public-site-wordpress`.
- Viewports: desktop (1728/1440) + mobile (390) + tablet (1024) borde.
- Required captures: la sección comparativa antes (imagen) vs después (widget), desktop + mobile reflow.
- Required `data-capture` markers: `data-gh-widget="comparison-table"` en el root del widget.
- Scroll-width check: sin scroll horizontal de página en desktop ni mobile 390px.
- Accessibility/focus checks: `<table>` con `scope`, `<caption>` sr-only, checks/cross con `aria-label`; contraste texto blanco sobre gradiente verificado (vigilar extremo naranja claro < 4.5:1).
- Before/after evidence: screenshot del estado imagen vs widget.
- Known visual debt: paridad exacta del gradiente Globe depende de extraer los tokens reales (de la imagen o Figma AXIS) — open question.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Plugin scaffold + categoría `greenhouse`

- Crear plugin `eo-elementor-widgets` (bootstrap con header, loader, sin side-effects en load) en el runtime repo.
- Registrar categoría de widgets `greenhouse` vía `elementor/elements/categories_registered`.
- Registrar (vacío/placeholder) vía hook `elementor/widgets/register`.
- Activar en el sitio (vía SSH/scp + `wp plugin activate` o el rail disponible) y verificar que activa sin fatals/notices.

### Slice 2 — Widget `greenhouse_comparison_table` (render PHP + repeater + preset Globe)

- Clase `\Elementor\Widget_Base`: nombre `greenhouse_comparison_table`, categoría `greenhouse`, icono, keywords.
- Controles: config columna A (título, logo, variant), columna B (título, logo, `is_best` switch, `best_label` default "BEST OPTION", variant), repeater `rows` (dimension, cell_a, cell_a_icon none|check|cross, cell_b, cell_b_icon), estilo (preset globe|neutral|custom, gradiente A, gradiente B, radius, divider).
- Render PHP: `<table>` semántica (`<thead>` `<th scope=col>`, `<tbody>` `<th scope=row>` + `<td>`), clases `gh-*`, `data-gh-widget`, escape/sanitize.
- CSS scoped `.gh-comparison-table` con tokens/preset (sin HEX inline), encolado condicional.
- QA visual desktop con GVC (Playwright sobre el sitio público).

### Slice 3 — Responsive reflow + accesibilidad

- Reflow a card-por-dimensión en mobile vía container query (elimina dependencia del asset mobile).
- `<caption>` sr-only, `aria-label` en check/cross, contraste verificado en ambos extremos del gradiente.
- Opcional: reveal-on-scroll detrás de `prefers-reduced-motion`.
- GVC mobile 390 + desktop, verificar sin scroll horizontal.

### Slice 4 — Migración de `/agencia-creativa/` (draft-first) + cleanup

- Extraer tokens reales del gradiente Globe (de la imagen `249604` o Figma AXIS) para el preset.
- Sembrar el widget con el contenido transcrito (ver Detailed Spec) en draft/private primero; verificar.
- Swap en la página live: reemplazar las dos imágenes (`078466f`, `14cfbe2`) por el widget vía `Document::save()`; backup del `_elementor_data` antes.
- Purga cache Kinsta + GVC desktop/mobile contra la URL real; comparar before/after.
- Backport del plugin al runtime repo; registrar Current Runtime Fact en la skill.

## Out of Scope

- Gobernanza por manifest `comparisonTable.v1` + validador/reader/command en greenhouse-eo (operabilidad por agente/Nexa) → follow-up backend-data separado (eso introduce `Backend impact != none`).
- Variante de 3+ columnas (esta task es 2 columnas, que matchea el asset).
- Otros widgets candidatos del strategy doc (Partner Proof, Hero, HubSpot Form, etc.).
- Rediseño visual de la comparativa (se replica el estilo existente).
- Migrar otras landings/comparativas (solo `/agencia-creativa/`).

## Detailed Spec

### Contenido transcrito de la tabla (para sembrar en Slice 4)

Cabecera: `Dimensión` | `AGENCIA TRADICIONAL` (columna A) | `globe — by efeonce` (columna B, ribbon "BEST OPTION").

| Dimensión | Columna A (Agencia Tradicional) | Columna B (Globe, icono check) |
|---|---|---|
| Producción | Equipo ad-hoc, plazos flexibles | 7 fases documentadas con checkpoints. Cumplimiento de plazos medido en tiempo real. |
| IA generativa | "Usamos IA" sin protocolo | 15+ modelos de IA con reglas claras de cuándo usarla, cuándo no, y quién la supervisa. |
| Marca | Manual de marca en PDF que nadie consulta | Tu marca documentada en un sistema vivo. IA valida cada pieza antes de salir. |
| Revisión | Emails con feedback ambiguo. Rondas infinitas. | Feedback centralizado con anotaciones precisas. Máximo 2 rondas por pieza. |
| Transparencia | Reportes mensuales estáticos | Dashboard compartido contigo. Estado de cada pieza y métrica en tiempo real, 24/7. |
| Medición | Vanity metrics y piezas entregadas | Medimos cuánto revenue adicional captura tu empresa gracias a la velocidad creativa. |

(Transcrito del asset; el agente debe confirmar copy exacto contra la imagen `249604` y la voz es-CL antes de sembrar — validar con `greenhouse-ux-writing` si se ajusta copy.)

### Modelo de controles (shape)

```text
greenhouse_comparison_table
  content:
    col_a: { title, logo?, variant=tradicional }
    col_b: { title, logo, is_best(switch), best_label="BEST OPTION", variant=globe }
    rows[]: { dimension, cell_a, cell_a_icon(none|check|cross), cell_b, cell_b_icon(none|check|cross) }
  style:
    preset(globe|neutral|custom), gradient_a, gradient_b, radius, row_divider, icon_color, header_typography
  behavior:
    stack_breakpoint, reveal_on_scroll(switch, reduced-motion-safe)
  render:
    <table class="gh-comparison-table gh-owned" data-gh-widget="comparison-table" data-preset="globe">
      <caption class="sr-only">…</caption>
      <thead><tr><th scope="col">Dimensión</th><th scope="col">…A…</th><th scope="col">…B (best)…</th></tr></thead>
      <tbody><tr><th scope="row">Producción</th><td>…</td><td><span aria-label="Incluido">✓</span> …</td></tr>…</tbody>
    </table>
```

### Contrato técnico mínimo (del strategy doc)

Registro moderno, clase propia, controles agrupados, render PHP, CSS/JS condicional, clases `gh-*`, responsive Elementor, sanitize/escape, fallback assets, versión de schema del widget, compatibilidad editor/preview.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (scaffold) → Slice 2 (widget render) → Slice 3 (responsive + a11y) → Slice 4 (migración live).
- Slice 4 (swap en la página live) MUST ship DESPUÉS de Slice 3 verde en GVC desktop+mobile. No tocar la página live antes de validar el widget en draft/private.
- Extracción de tokens del gradiente (inicio de Slice 4) DEBE preceder al seed para no hardcodear color.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Activar el plugin causa fatal/notice | WordPress runtime (Kinsta) | low | Sin side-effects en load, código en hooks; activar primero y `wp plugin list`/error_log antes de seguir; rollback = `wp plugin deactivate` | error_log / pantalla blanca en editor |
| Contraste texto blanco sobre naranja claro < 4.5:1 | a11y / UI | medium | Verificar APCA/4.5:1 en ambos extremos del gradiente; oscurecer naranja u overlay en el preset | revisión a11y manual + GVC |
| Swap live rompe layout de la sección (page_id 249582) | UI pública | medium | Draft/private first + GVC; backup `_elementor_data` antes; rollback restaura imágenes | GVC before/after |
| Cache Kinsta sirve estado viejo tras el swap | UI pública | medium | `wp kinsta cache purge --all` + verificar URL real sin cache-buster | verificación live |
| Deploy/activación del plugin bloqueado por release policy Kinsta | runtime/deploy | medium | Confirmar rail disponible (SSH/scp como las ediciones de CSS); si bloqueado, escalar | activación falla |

### Feature flags / cutover

Sin flag — additive. El widget no afecta otras páginas; la migración de `/agencia-creativa/` es opt-in por página. Cutover = swap de imágenes por widget en una sola página, reversible restaurando el `_elementor_data` backup.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `wp plugin deactivate eo-elementor-widgets` (+ remover archivos) | <5 min | sí |
| Slice 2 | idem Slice 1 (widget no usado en ninguna página live aún) | <5 min | sí |
| Slice 3 | idem (sin impacto en páginas live) | <5 min | sí |
| Slice 4 | restaurar `_elementor_data` de page 249582 desde backup (vuelven las imágenes) + purge cache | <10 min | sí |

### Production verification sequence

1. Slice 1: activar plugin → `wp plugin list` muestra activo + sin fatals en editor.
2. Slice 2: insertar widget en una página draft/private de prueba → render correcto desktop (GVC).
3. Slice 3: GVC mobile 390 + desktop → reflow correcto, sin scroll horizontal, a11y OK.
4. Slice 4: seed en draft/private de 249582 (o página de prueba) → verificar → backup `_elementor_data` → swap live → `wp kinsta cache purge --all` → GVC contra URL real → comparar before/after.
5. Backport plugin al runtime repo + commit.

### Out-of-band coordination required

N/A — repo + WordPress runtime change. Sin Azure/HubSpot/secrets. Confirmar con el operador antes del swap live de la página (cambio outward-facing en sitio público).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe el plugin `eo-elementor-widgets` en el runtime repo y activa sin fatals/notices.
- [ ] El widget `greenhouse_comparison_table` aparece en la categoría `greenhouse` del builder Elementor.
- [ ] El render es una `<table>` semántica con `scope`, `<caption>` sr-only y check/cross con `aria-label` (no solo color).
- [ ] El contenido es data-driven (repeater de filas + config de columnas); cambiar copy NO requiere reexportar imágenes.
- [ ] El theming (gradientes/colores) sale de tokens/preset (CSS vars), NO HEX inline.
- [ ] En mobile reflowea a card-por-dimensión sin un segundo asset; sin scroll horizontal en 390px.
- [ ] Contraste de texto verificado en ambos extremos del gradiente.
- [ ] `/agencia-creativa/` ya no depende de `Tabla-Globe-scaled.webp` ni `Tabla-Globe-Mobile-1.webp`; usa el widget con el contenido transcrito.
- [ ] GVC desktop + mobile capturado y mirado (before/after); cache Kinsta purgado; verificado contra la URL real.
- [ ] Plugin backporteado al runtime repo; Current Runtime Fact registrado en la skill `efeonce-public-site-wordpress` (ambas copias).

## Verification

- WordPress: `wp plugin list` (activo, sin fatals), render en editor/preview, `wp_kses`/escape correctos.
- GVC: captura Playwright del sitio público (patrón del skill `efeonce-public-site-wordpress`), desktop + mobile + tablet borde.
- a11y: `<table>`/`scope`/`caption`/`aria-label`, contraste (APCA/4.5:1).
- Sin scroll horizontal desktop/390px.
- (No aplican `pnpm lint`/`tsc`/`test` de greenhouse-eo al código PHP del runtime repo; aplican lint/escape PHP del runtime repo si existen.)

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/`, `complete/`).
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `Handoff.md` actualizado con lo aplicado/verificado/pendiente.
- [ ] `changelog.md` actualizado si cambió comportamiento visible.
- [ ] chequeo de impacto cruzado sobre tasks afectadas.
- [ ] Plugin backporteado al runtime repo y Current Runtime Fact en la skill (ambas copias) + marcar piloto entregado en `wordpress-custom-widgets-react-strategy.md`.

## Follow-ups

- **TASK-1225 (backend-data, sequenced after this task)** — manifest `comparisonTable.v1` + validador/reader/command en greenhouse-eo para gobernanza/operabilidad por agente/Nexa (Stage 3 del strategy doc). Aprobada por el operador 2026-06-23. Va aparte porque introduce `Backend impact != none` (split UI/backend) y porque el manifest gobierna un widget que debe existir primero.
- Variante 3+ columnas del widget.
- Presets adicionales + migración oportunista de otras comparativas.
- Archivar (no borrar) los attachments `249604` / `249647` una vez verificado el swap.

## Delta 2026-06-23 (COMPLETADA — sign-off visual del operador recibido)

Cerrada con sign-off explícito ("Quedó brutal!!! me encantó, canonicemos este widget y esta primitive"). Estado final entregado y verificado en vivo:

- **Widget canónico** `greenhouse_comparison_table` (plugin `eo-elementor-widgets` v0.6.0), LIVE en `/agencia-creativa/` (249582). Las 2 imágenes (`078466f`/`14cfbe2`) quedaron reemplazadas.
- **Ribbon "Best Option"** = esquina doblada embebida en la celda del header Globe (`clip-path` face + `fold--top`/`fold--left`). Experimentos de banner vertical y oclusión 2-capas fueron descartados por el operador; el corner-fold es la forma canónica.
- **Degradados fieles a Figma** (muestreo pixel a pixel del nodo `12479-18591`): lado Agencia oscurecido a vino→índigo (`#3a022c→#341d4e`), Globe coral→durazno→rosa, amber `#ffa300`, crimson `#d11963` (más vivo por decisión del operador, editable).
- **Autoadministrable + agent-ready**: `theme_schema()` (método PUBLIC = SSOT) + controles de color/radio en Elementor + render de CSS vars inline + markers `data-gh-schema="comparisonTable.v1"` / `data-gh-plugin-version`. TASK-1225 **NO ejecutada, solo preparada** (su manifest espeja `theme_schema()`).
- **Microinteracciones** (revisadas con `motion-design` + `microinteractions-auditor`, compositor-only + `prefers-reduced-motion`): cascada de entrada + check pop (scroll-driven `view()` con `@supports`), hover de fila, sheen del ribbon, cursor-glow (JS `assets/js/comparison-table.js`).
- **Docs triple capa**: técnica (strategy doc, piloto marcado entregado) · funcional (`docs/documentation/public-site/comparison-table-widget.md`) · manual (`docs/manual-de-uso/public-site/comparison-table-widget.md`) · skill `efeonce-public-site-wordpress` (ambas copias) actualizada.
- Commits runtime repo `main`: `86224bd`, `13ea66a`, `0ef3a5a`, `73b0768`, `6de0dcc`, `f72ce17`, `743f6be`.

## Delta 2026-06-23 (histórico — iteración)

Estado: plugin `eo-elementor-widgets` creado + activo en Kinsta; widget `greenhouse_comparison_table` LIVE en `/agencia-creativa/` (page 249582) reemplazando las 2 imágenes. Commits runtime repo (local, sin push): `86224bd` (Slice 1), `13ea66a` (Slice 2+3) + cambios sin commitear (version 0.2.0, loader filemtime).

**Pendiente (gap de fidelidad que el operador marca "no es fiel"):**
- **Prime suspect: el texto está más chico que la referencia.** Medido live: dimFont ≈17px, cellFont ≈15px (clamp con `cqw`). La referencia usa texto más grande y bold (dim ≈28px, celdas ≈18-20px). Subir tamaños/pesos.
- Revisar también: alto de fila/padding (filas más altas en la referencia), exactitud del gradiente Globe, tamaño del ribbon, sutileza de los divisores.
- El operador NO puede enviar screenshots en el chat (límite de tamaño). En sesión fresca: capturar el widget live con Playwright y comparar contra la referencia, o pedir que describa diferencias puntuales. Loop GVC hasta sign-off.

**Gotcha de cache resuelto:** el CSS se servía `?ver=0.1.0` fijo durante todas las iteraciones → el navegador del operador cacheó un CSS roto temprano (texto solapado, sin logo) y nunca lo refrescó; por eso veía "horrible". Fix: versionado por `filemtime()` (auto-bustea) + reset de OPcache (Kinsta `validate_timestamps=1 freq=2`, pero para instantáneo: dropear `<?php opcache_reset();` en webroot, curl, borrar) + `wp kinsta cache purge --all`. Backup `_elementor_data` de 249582 en scratchpad.

- Open Questions resueltas por el operador: (1) **2 columnas** confirmado, 3+ como follow-up; (3) **extraer gradientes/colores exactos** de la imagen `249604` / Figma AXIS para que quede idéntico al asset; gobernanza por manifest **aprobada** → reservada como **TASK-1225** (backend-data, secuenciada después de esta).

## Open Questions

1. ¿Rail de activación/deploy del plugin en Kinsta disponible vía SSH/scp (como las ediciones de CSS) o requiere coordinación de release? `[verificar durante Discovery]`
