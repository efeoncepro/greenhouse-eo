# Greenhouse Premium Agentic UI Delivery Decision V1

## Status

- Decision status: `Accepted`
- Date: `2026-07-18`
- Owner: `Platform UI + Product Design`
- Scope: `UI platform, agent workflows, surface composition, GVC and visual acceptance`
- Reversibility: `two-way-but-slow`
- Confidence: `high`
- Validated as of: `2026-07-18`
- Execution: `TASK-1453 / EPIC-033`

## Context

Greenhouse ya gobernaba tokens, primitives, Composition Shell, adaptive density y captura visual. Aun así, los agentes podían producir pantallas técnicamente correctas pero genéricas: grids uniformes, card sobre card, first folds sin foco y una estética MUI/Vuexy reconocible. El fallo no era la ausencia de componentes ni MUI por sí mismo. Faltaba gobernar la dirección visual y la composición de superficie antes de JSX, además de un gate que rechazara evidencia visual mediocre aunque lint, build y accesibilidad básica pasaran.

El coste observable era una convergencia estética tardía: horas de iteración humana para llegar al nivel que una landing nueva conseguía desde su primera dirección de arte.

## Decision

1. `greenhouse-ai-design-studio` es el orquestador canónico de cualquier UI visible. Debe resolver dirección visual, composición, contenido real, estados, responsive y evidencia antes de implementar.
2. Toda UI `ui-standard` o `ui-platform` registra una Visual Direction versionada y compara alternativas cuando la dirección no viene aprobada. Figma, Claude Design o una imagen son intención; nunca sustituyen el contrato runtime.
3. La pantalla nace desde Composition Shell y un surface recipe. Los átomos MUI/Vuexy siguen siendo bases accesibles, pero no son autores del layout ni de la estética final.
4. Se adopta una semántica explícita de superficies mediante `data-ui-surface`. `contained` representa una frontera real; `open`, `band`, `immersive`, `stage`, `selected` y `floating` expresan otros planos. El first fold normal tiene un presupuesto máximo de tres superficies `contained`; anidar superficies sin cambio semántico es un fallo.
5. Cada superficie relevante necesita un momento visual dominante y específico de la task: una composición que comunique la decisión, evidencia o acción principal. Un stack serial de cards, especialmente en mobile, no satisface este requisito.
6. La aceptación se divide en cuatro gates independientes: contrato, código, evidencia visual y calidad. GVC premium captura desktop y 390 px, aplica enterprise rubric, baselines y dossier revisable.
7. El scorecard visual tiene catorce dimensiones. Exige media mínima `4.5/5`, piso `4/5`, y `≥4.5` en jerarquía, economía de superficies, impacto visual, fidelidad y resistencia genérica. Un `CONDITIONAL PASS` no puede eximir estos mínimos.
8. MUI se conserva como infraestructura de accesibilidad, interacción y theme. Se reemplaza o envuelve sólo cuando impide el contrato; no se elimina como sustituto de una dirección de arte ausente.

## Rejected alternatives

- **Prompts más largos sin gates:** el agente puede cumplir la prosa y aun producir chrome uniforme.
- **Agregar más componentes atómicos:** amplía el vocabulario, pero no decide jerarquía ni composición.
- **Prohibir MUI:** cambia la librería sin corregir el problema de dirección y puede degradar accesibilidad.
- **Revisión sólo por screenshot:** detecta tarde, no deja un contrato reproducible y permite score complaciente.
- **Una plantilla visual única:** reduce variedad y produciría otro tipo de UI genérica.

## Consequences

### Positive

- Las nuevas interfaces parten con una tesis visual comprobable y no con un grid de componentes.
- Card wallpaper y falta de foco se detectan mecánicamente y en review.
- Workbench, report y settings comparten sistema sin verse clonados.
- Codex y Claude aplican el mismo estándar y los mismos comandos de cierre.

### Costs and risks

- La fase pre-JSX es más exigente y requiere evidencia visual real.
- Los umbrales pueden necesitar calibración si aparecen falsos positivos; todo ajuste debe preservar los pisos críticos.
- Las superficies legacy no migran automáticamente. La adopción dura parte desde `TASK-1453` y el legacy se corrige por auditoría.

## Runtime contract

- Canon: `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`.
- Recipes: `docs/ui/recipes/`.
- Primitives: `src/components/greenhouse/primitives/surface-system/`.
- Evidence: GVC premium + `docs/ui/reviews/` + durable baselines.
- Gates: `design-contract:lint`, `ui:code-lint`, `ui:visual-gate`, `ui:quality`.
- Lab: `/design-system/surface-recipes`.

## Revisit when

- El presupuesto de superficies bloquee repetidamente layouts legítimos y exista evidencia de al menos tres dominios.
- Otra UI foundation supere MUI en accesibilidad, mantenimiento y compatibilidad con AXIS, no sólo en apariencia.
- GVC pueda inferir con precisión la semántica visual sin instrumentación `data-ui-surface`.
- El scorecard muestre drift sostenido entre evaluación humana y resultado de los gates.
