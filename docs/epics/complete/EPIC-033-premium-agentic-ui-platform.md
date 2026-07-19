# EPIC-033 — Premium Agentic UI Platform

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Cerrado local-first`
- Rank: `1`
- Domain: `ui|platform|ops`
- Owner: `Codex + Product Design`
- Branch: `develop`
- GitHub Issue: `n/a`

## Summary

Convierte el estándar visual de Greenhouse en un sistema ejecutable para agentes: dirección visual versionada, recipes de superficie, primitives compuestas, motion rico con reduced-motion, readiness profundo, crítica visual y evidencia GVC desktop/mobile. El resultado esperado es que una interfaz nueva nazca moderna, diferenciada y enterprise sin depender de horas de corrección manual posterior.

## Why This Epic Exists

El repositorio gobierna bien arquitectura, tokens y primitives atómicas, pero no obliga a que un agente elija y preserve una dirección visual completa antes de implementar. Los gates actuales validan presencia de headings, no calidad ni fidelidad; GVC puede ejecutarse sin rúbrica; y la orquestación favorece composición conservadora de MUI. La combinación produce pantallas correctas pero genéricas, planas y con jerarquía débil.

## Outcome

- Toda UI nueva selecciona una dirección visual versionada y pasa un readiness gate sustantivo antes de JSX.
- Los arquetipos recurrentes parten de recipes y primitives compuestas con densidad, responsive y motion resueltos.
- La evidencia visual desktop/mobile incluye crítica dimensional, umbrales de aceptación, baseline cuando aplica y dossier revisable.
- Codex y Claude reciben una orquestación coherente, basada únicamente en skills reales y en el mismo contrato canónico.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

## Child Tasks

- `TASK-1453` — contrato, enforcement, recipes, primitives, labs y validación multi-arquetipo.

## Existing Related Work

- Composition Shell, The Seam, GVC V1.5 y Design System Labs.
- `greenhouse-ai-design-studio`, `greenhouse-product-ui-architect`, `greenhouse-portal-ui-implementer`, `modern-ui-greenhouse-overlay`, `greenhouse-ui-review` y `greenhouse-ui-enterprise-review`.
- `DESIGN.md`, `docs/ui/wireframes/`, `docs/ui/flows/`, `docs/ui/motion/` y `scripts/frontend/`.

## Exit Criteria

- [x] `TASK-1453` está completa y sus gates focales/changed pasan.
- [x] Tres arquetipos distintos están materializados y revisados en desktop/mobile.
- [x] Ninguna skill canónica de UI referencia una dependencia inexistente o una tipografía obsoleta.
- [x] Un agente no puede marcar `UI ready: yes` con un wireframe vacío, sin dirección visual o sin plan GVC premium.
- [x] La documentación de agentes apunta al flujo nuevo sin reglas contradictorias.

## Non-goals

- Rediseñar retroactivamente todas las rutas del portal.
- Sustituir MUI, Vuexy, Composition Shell o el sistema AXIS.
- Convertir la opinión estética en un test puramente algorítmico; la revisión visual queda gobernada y auditable.

## Delta 2026-07-18

Epic creado por instrucción explícita del operador para resolver el problema de calidad de nacimiento de UI de forma agnóstica a cualquier task o pantalla particular.

## Closure 2026-07-18

`TASK-1453` materializó contrato, enforcement, recipes, primitives, Lab y evidencia. El resultado final elimina card wallpaper como default mediante superficie semántica y presupuesto de chrome, exige impacto visual task-native y deja aceptación reproducible en Codex/Claude. QA: `PASS`; score visual `4.63/5`; GVC final con 32 frames y cero findings no-baseline.
