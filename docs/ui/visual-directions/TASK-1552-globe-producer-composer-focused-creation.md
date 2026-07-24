# TASK-1552 — Globe Producer Composer Focused Creation

## Direction mode

`repo-native-benchmark`

## Product thesis

Globe Producer debe sentirse como una mesa de producción creativa prompt-first, no como un panel técnico que expone todas sus capacidades a la vez. La primera decisión visible es la intención creativa; la complejidad aparece sólo cuando ayuda a controlar el resultado.

## Alternatives considered

### A — Composer técnico compacto

Mantiene todos los controles actuales, pero reduce spacing y agrupa secciones. Rechazada: conserva la jerarquía equivocada y sigue haciendo competir prompt, presets, seed, governance y modelo.

### B — Composer modal centrado

Abre la creación en un modal enfocado sobre el feed. Rechazada: rompe continuidad con la biblioteca y hace más difícil comparar/refinar resultados.

### C — Focus + Context sidecar — seleccionada

El feed sigue siendo el workspace principal y el composer funciona como un lane de creación continuo: `prompt → dirección → output shape → ajustes opcionales → generar`. La modalidad global gobierna el contenido del lane; el mismo CTA absorbe el estimate de TASK-1532.

## First-fold targets

- Desktop: 1440×1000, composer visible sin scroll inicial y feed claramente secundario mientras se compone.
- Mobile: 390×844, una columna, CTA siempre alcanzable, sin compresión de desktop ni scroll horizontal.

## Action hierarchy

1. Elegir modalidad global.
2. Escribir o mejorar el prompt.
3. Elegir formato/dirección mínima.
4. Generar con el CTA único de TASK-1532.
5. Abrir ajustes avanzados sólo si hace falta.

## Signature details

- Prompt grande como único foco visual del composer.
- Sugerencias como direcciones cortas, no como pared de chips.
- Modelo recomendado como orientación legible, no como plumbing.
- Ajustes avanzados colapsados.
- CTA `Generar · {credits} créditos` cuando el estimate esté vigente; sin línea de costo duplicada.

## Anti-patterns

- Doble selector de modalidad.
- Botón separado `Calcular costo`.
- Seed visible por defecto.
- Referencias deshabilitadas ocupando espacio principal.
- Matriz extensa de presets sin preview ni agrupación.
- Cards anidadas con bordes para cada subsección.

## Token and surface mapping

- Brand blue: primary action and active modality only.
- Green: valid/ready states only.
- Amber: policy or material cost-change warning only.
- Globe tokens and existing Producer patterns; no new provider colors, raw hex or parallel design system.
- Surface: existing Globe Producer Console/composer in `../efeonce-globe/apps/studio-web`.

## GVC intent

Scenario premium desktop/mobile must prove first-fold hierarchy, progressive disclosure, CTA states, modality recomposition, keyboard focus, reduced motion and `scrollWidth === clientWidth`.
