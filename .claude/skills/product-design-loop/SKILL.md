---
name: product-design-loop
description: Loop de diseño de producto estilo "3 conceptos visuales → elegir → implementar" para UI nueva de Greenhouse. Brief → 3 conceptos IA divergentes (imágenes) → el operador elige → implementación tokenizada como ruta real + verificación GVC en loop. Invocar cuando el usuario pide explorar, diseñar, prototipar o iterar una pantalla/feature visual nueva y quiere ver opciones antes de comprometerse a código. Triggers: "diseña", "prototipa", "explora opciones", "dame 3 propuestas", "concepto de UI", "cómo se vería", "product design", "iterar diseño".
---

# Product Design Loop

Réplica del flujo de plugin de diseño (brief → 3 propuestas en imagen → elegir → construir), adaptada al stack y contratos canónicos de Greenhouse. **Híbrido por diseño**: imágenes IA para divergir rápido (barato, rico) + implementación del concepto elegido como **ruta real tokenizada** verificada con **GVC en loop** (no "le pego a un PNG").

Invocación manual: `/product-design-loop [surface, objetivo, datos, restricciones]`.

## Principio rector (no negociable)

**La imagen es intención, NO valores literales.** El concepto IA inspira layout, jerarquía e interacción. Al implementar, NUNCA se transcriben HEX/px/fontFamily crudos del concepto: se **mapean** a tokens AXIS / SoT tipográfico / spacing 4n / motion tokens. La fidelidad real se verifica contra el portal corriendo (GVC), no contra la imagen.

## First Reads (solo lo que la tarea necesita)

- `CLAUDE.md` / `AGENTS.md` (contratos UI: Figma Implementation Contract, Primitive+Variants+Kinds, GVC, tokens)
- `DESIGN.md` (contrato visual agent-facing)
- `project_context.md`, `Handoff.md`
- `docs/architecture/ui-platform/README.md` + `PRIMITIVES.md`

## Las 5 fases del loop

### Fase 0 — Brief intake

Capturar antes de generar nada:
- **Surface**: qué pantalla/feature, en qué dominio (`<domain>/<surface>`), qué route group.
- **Objetivo + decisión del usuario**: ¿qué tarea resuelve y qué decide la persona en esta pantalla?
- **Datos**: qué entidades/campos se muestran (para mock data tipada después).
- **Restricciones**: rol/acceso, estados (loading/empty/error/degraded/**disabled-sin-capability/permiso**), responsive, gates de copy.

Si el brief está subespecificado, hacer **2-3 preguntas** con `AskUserQuestion` antes de divergir. No generar conceptos a ciegas.

**Decision-gate: ¿diverger con AI o ir directo a mockup real?** No toda surface necesita 3 conceptos IA.
- **Brief específico + primitive/wrapper existente + design system fuerte** (ej. un micro-componente, un editor sobre `FloatingSurface`, una variant de algo que ya existe) → **saltar la divergencia AI** e ir directo a Fase 3 (ruta mockup real tokenizada) + GVC. Más fiel, sin costo/tiempo de generación.
- **Espacio de diseño amplio** (pantalla nueva, varias layouts plausibles, no hay primitive obvia) → **diverger con AI** (Fase 1). La imagen sirve para elegir dirección, no para el acabado.
- En duda, decirlo explícito al operador y dejar que elija. La imagen es intención; el acabado siempre sale del runtime + GVC.

### Fase 1 — Divergencia: 3 conceptos IA

1. **Fijar dirección de arte primero** cargando las skills de diseño que apliquen: `modern-ui` (jerarquía/tipografía/spacing/balance), `greenhouse-ux` (layout + selección de componente Vuexy/MUI), `state-design` (**enumerar la matriz de estados como checklist ANTES de codear**: idle/loading/empty/error/degraded/disabled-sin-capability — no olvidar ninguno), `forms-ux` (si hay inputs: paste-friendly, validación, preview), `motion-design` (**si hay micro-interacción** — rotación/hover/toggle/reveal: fijar ángulo/duración-token/reduced-motion up front, no improvisado), `a11y-architect` (foco/teclado/SR/role — y activar el GVC `quality.keyboard` gate en Fase 4), `typography-design`, `dataviz-design` (si hay charts), y `modern-web-guidance` (patrones de plataforma web verificados por Chrome — `search`/`retrieve` para Forms/UX/Performance/APIs nativas). Estas definen el "bar enterprise 2026".
2. **Generar 3 conceptos DISTINTOS** con la **CLI canónica `pnpm ai:image`** (gpt-image-2; la skill `greenhouse-ai-image-generator` aporta la dirección de arte del prompt). **Quality-tier por fase**: conceptos en `--quality medium` (más barato/rápido; alcanza para elegir dirección); reservar `--quality high` para la dirección elegida o un hero en Fase 3. Batch: `pnpm ai:image --concept <loop> --batch concepts.json --quality medium` (`[{ filename, prompt }, …]`). **Usar SIEMPRE `--concept <loop>` (+ `--task TASK-###` si aplica)**: rutea automático a `.captures/concepts/<loop>/` (gitignored, protegido del GC), escribe `manifest.json` trazable y aparece en `pnpm fe:capture:index` agrupado por loop. NO pasar `--out`/`--out-dir` a mano para conceptos. Vectores reales: Higgsfield + Recraft V4.1. Cada concepto = **una dirección de layout/interacción genuinamente diferente** (no skins del mismo layout). Ej.: (A) dashboard-first, (B) inspector/sidecar-first, (C) wizard/flow-first.
   - Prompt de cada imagen: describir layout, jerarquía, densidad, paleta **alineada a AXIS** (no inventar marca), estados visibles. Aplicar dirección de arte de la skill de imagen (composición, materiales, iluminación, rubric QA).
   - Las imágenes quedan en `.captures/concepts/<loop>/` automáticamente vía `--concept` (gitignored, protegido del GC, trazable en el índice). NO committear conceptos exploratorios ni rutearlos a mano.
3. **Presentar los 3** con una línea de racional cada uno (qué tradeoff representa). Mostrar las imágenes.

### Fase 2 — Elegir

`AskUserQuestion` con los 3 conceptos (referencia visual + descripción). El operador elige uno **o un mix** ("layout de A con el inspector de B"). Confirmar el mix exacto antes de codear.

### Fase 3 — Implementar (ruta real tokenizada)

Tu fuente es un **concepto IA (imagen)**, no Figma — pero los **2 gates del Figma Implementation Contract son agnósticos a la fuente** y aplican igual (contrato completo en CLAUDE.md). El concepto fija la **dirección/intención**, no los valores. Salvedad clave: la parte Figma-only del Gate 1 (extracción vía MCP `get_variable_defs`/`get_code_connect_map`) **NO aplica** — acá NO hay nada que extraer programáticamente; leés la intención **a ojo** de la imagen y la tokenizás. Lo que SÍ heredás: el principio "imagen = intención, nunca transcribir crudo" (Gate 1) + el primitive lookup (Gate 2, 100% agnóstico).

1. **Token mapping (siempre)**: cada color del concepto → `theme.palette.*`/`theme.axis.*`; tipografía → variante/SoT; spacing → scale `4n`; radius → `customBorderRadius.*` como CSS length en `sx`, no como número directo; motion → `motion/core/tokens.ts`. **Cero hardcode** (lo bloquean los lint `no-hardcoded-hex-color`/`no-hardcoded-fontfamily`/`no-fontsize-inline-typography`). Gotcha MUI: `borderRadius` numérico en `sx` es multiplicador y puede inflar el radio.
2. **Primitive lookup en capas (ANTES de construir)**: (a) ¿existe primitive Greenhouse? grep `src/components/greenhouse/primitives/index.ts` + `ui-platform/PRIMITIVES.md` → usar/expandir, NUNCA fork; (b) ¿wrapper Vuexy `Custom*` o MUI base? → envolver esa base; (c) solo si no hay nada → desde cero (protocolo Primitive+Variants+Kinds completo + Lab interno + GVC).

Construir con la skill **`greenhouse-mockup-builder`** como **ruta real** (no HTML suelto):
- Route: `src/app/(dashboard)/<domain>/<surface>/mockup/page.tsx`
- View: `src/views/greenhouse/<domain>/<surface>/mockup/*`
- Mock data tipada + `src/lib/format/*` para números/fechas/moneda.

3. **Copy es-CL (no inline)**: invocar `greenhouse-ux-writing` para toda string visible (labels, placeholders, helper, errores, estados, aria, tooltips). En el mockup puede tolerarse literal efímero, pero **cuando el shell pasa a runtime (fuera de `/mockup/`) el copy reusable DEBE extraerse a `src/lib/copy/*`** (regla canónica `greenhouse/no-untokenized-copy`). NO dejar literales es-CL en componentes que van a producción.

**Reportar la decisión de primitive** (reuse / extend / new-primitive + por qué) ANTES de codear.

### Fase 4 — Verificar (GVC en loop)

`pnpm fe:capture` la ruta → **leer el frame PNG** → ajustar → re-capturar hasta que se vea enterprise. **Desktop + mobile.** Nunca declarar "listo" sin una captura GVC mirada. Para pantallas largas usar scenario con `scroll`/`mark fullPage`/`clipSelector` sobre `data-capture`. Para mockup aprobado→runtime, usar `baseline.surfaceId` + `fe:capture:diff --promote`.

**No solo mirar el PNG — declarar los gates V1.5 (opt-in) en el scenario** para que GVC atrape lo que el ojo deja pasar: `quality.layout` (overflow / target <24px / texto cortado / cards anidadas), `quality.keyboard` (foco esperado + focus ring + reduced-motion — obligatorio si hubo `a11y-architect`/`motion-design`), `quality.enterpriseRubric` (placeholders / exceso de `—`·`0` / >1 botón primario por header / saturación). Para una micro-interacción (rotación/hover/reveal) usar `interaction` V2 con frames relativos para capturar el estado abierto/cerrado.

### Fase 5 — Handoff

Entregar: URL `localhost` exacta + los 3 conceptos + el elegido + decisión de primitive (reuse/extend/new) + capturas GVC desktop/mobile. Si la surface pasa a producción, seguir el ciclo operativo (`intake → … → closure`) y sacar el shell runtime fuera de `/mockup/`.

## Hard Rules

- **NUNCA** transcribir valores crudos del concepto IA. Imagen = intención; siempre tokenizar.
- **NUNCA** pintar UI freehand ni declarar "listo" sin captura GVC mirada.
- **NUNCA** HTML/CSS suelto para UI del portal (salvo pedido explícito de artefacto estático). Mockups = rutas reales Next.js con primitives/wrappers del repo.
- **NUNCA** committear las imágenes de concepto exploratorias (van a dir gitignored).
- **NUNCA** generar 3 "skins" del mismo layout — los 3 conceptos deben representar tradeoffs genuinamente distintos.
- **NUNCA** crear una primitive paralela cuando existe una Greenhouse/wrapper Vuexy — usar/expandir.
- **NUNCA** logos de operating-entity (Efeonce/legal) en los conceptos IA; respetar el contrato de marca AXIS.
- **NUNCA** forzar 3 conceptos IA cuando el brief es específico + hay primitive/wrapper existente — ahí ir directo a mockup real (decision-gate Fase 0). La generación IA cuesta tiempo/plata; no es gratis.
- **NUNCA** dejar literales es-CL inline en componentes que van a runtime — extraer a `src/lib/copy/*` (regla `greenhouse/no-untokenized-copy`).
- **SIEMPRE** cargar las skills de diseño (`modern-ui`, `greenhouse-ux`, `state-design`, + `motion-design` si hay micro-interacción, + `a11y-architect`, `forms-ux`) para fijar el bar ANTES de generar conceptos/codear.
- **SIEMPRE** conceptos en `--quality medium`; `high` solo para la dirección elegida o un hero.
- **SIEMPRE** estados honestos (loading/empty/error/degraded/disabled-sin-capability) — no `$0`/`—` ambiguo; mostrar "Pendiente" con razón.
- **SIEMPRE** declarar los GVC `quality.*` gates en el scenario cuando aplique (no solo screenshots) — `quality.keyboard` es obligatorio si hubo `a11y-architect`/`motion-design`.

## Output Contract

- brief normalizado (surface, objetivo, datos, restricciones)
- 3 conceptos IA + racional/tradeoff de cada uno
- elección del operador (o mix exacto)
- decisión de primitive (reuse / extend / new-primitive + por qué)
- ruta real + URL localhost
- evidencia GVC desktop + mobile mirada
