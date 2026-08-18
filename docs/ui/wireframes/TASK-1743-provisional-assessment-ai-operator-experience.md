# Wireframe — TASK-1743 Provisional Assessment AI Operator Experience

## Meta

- Product Design asset: `docs/ui/visual-directions/TASK-1743-provisional-assessment-ai-operator-experience.md`
- Visual direction mode: `repo-native-benchmark`

## Source and intent

- Source durable: TASK-1738 workbench runtime + TASK-1742 provisional projection.
- Mode: `repo-native-benchmark`.
- Desktop target: 1440px Application 360.
- Mobile target: 390px responsive stack.
- Objective: expose useful provisional evaluation without visually or semantically promoting it to effective score.

## Information hierarchy

```text
Assessment card
├─ Test identity + submitted/run state
├─ Provisional summary surface
│  ├─ “Evaluación provisional de IA” + operator-only badge
│  ├─ provisional global /100
│  ├─ “No incorporada al resultado efectivo”
│  └─ coverage: evaluated / eligible · abstentions · failures
├─ Competency provisional breakdown
│  └─ score + target + provenance + expandable evidence
├─ Attention queue
│  ├─ abstentions/failures
│  ├─ risk reasons
│  └─ blind quality sample (proposal absent)
└─ Effective score/workbench controls (existing, visually separated)
```

## Desktop Target — 1440×1100

El bloque provisional se incorpora al encabezado del workbench existente, dentro de la misma superficie de evaluación. Mantiene una separación semántica y tonal respecto del resultado efectivo y reserva el lateral para cobertura y excepciones, sin crear una tarjeta dentro de otra.

```text
┌──────────────────────────────────────────────────────────────┐
│ Test del candidato      Evaluación provisional de IA        │
│ EO-ASM-…                 Solo operador                       │
├──────────────────────────────────────────────────────────────┤
│ 76 /100  PROVISIONAL   Cobertura 10/10   0 abst. 0 fallos   │
│ No incorporada al resultado efectivo                         │
├──────────────────────────────────────────────────────────────┤
│ Competencias provisionales                                   │
│ Relación cliente      68 /100  [Ver evidencia]              │
│ Copywriting           69 /100  [Ver evidencia]              │
│ …                                                            │
├──────────────────────────────────────────────────────────────┤
│ Necesita atención (2)                                        │
│ [Contradicción] respuesta …                    [Revisar]      │
└──────────────────────────────────────────────────────────────┘
```

## Mobile Target — 390×844

El orden DOM pasa de resumen a cobertura, competencias y excepciones. El score provisional nunca queda aislado de su etiqueta y disclaimer; evidencia y acciones ocupan todo el ancho y ninguna cadena se trunca semánticamente.

```text
┌──────────────────────────────┐
│ Evaluación provisional IA   │
│ Solo operador               │
│ 76 /100                     │
│ No incorporada al efectivo  │
│ Cobertura 10/10             │
├──────────────────────────────┤
│ Competencias                │
│ Relación cliente       68   │
│ [Ver evidencia]             │
├──────────────────────────────┤
│ Necesita atención (2)       │
│ [Revisar]                   │
└──────────────────────────────┘
```

## Copy Ledger

| Elemento | Copy visible | Fuente |
|---|---|---|
| Título | Evaluación provisional de IA | `src/lib/copy/hiring.ts` |
| Autoridad | Solo para operadores | `src/lib/copy/hiring.ts` |
| Disclaimer | No incorporada al resultado efectivo | `src/lib/copy/hiring.ts` |
| Cobertura | {evaluated} de {eligible} respuestas evaluadas | DTO + `src/lib/copy/hiring.ts` |
| Excepciones | Necesita atención ({count}) | DTO + `src/lib/copy/hiring.ts` |
| Acción recuperable | Reintentar evaluación | `src/lib/copy/hiring.ts` |

## State Copy

| State | Copy visible | Recovery behavior |
|---|---|---|
| ready | “Evaluación provisional de IA” + score y cobertura completos | Abrir evidencia o revisar la muestra ciega; no requiere acción para existir. |
| loading | “Estamos evaluando las respuestas” con skeleton de tamaño reservado | Actualización automática; conservar el último estado válido si existe. |
| empty | “La evaluación de IA aún no comienza” o “No hay respuestas aptas para evaluación” | Mostrar “Reintentar evaluación” solo cuando App API indique que es seguro. |
| partial | “Evaluación provisional parcial” + evaluadas/aptas, abstenciones y fallos | Llevar al operador a la excepción concreta o permitir reintento gobernado. |
| error | “No pudimos completar la evaluación de IA” + causa segura | Mostrar “Reintentar evaluación”; nunca convertir el fallo en cero. |
| denied | “No tienes acceso a la evaluación de IA” sin score, rationale ni evidencia | No ofrecer bypass; mantener navegación normal de Application 360. |
| stale | “Esta evaluación corresponde a una versión anterior” | Permitir iniciar un run nuevo mediante el command gobernado. |
| effective | “Resultado efectivo” en un bloque independiente | Conservar confirmación/cancelación existente; nunca fusionar ambos scores. |

## Action hierarchy

1. Primary: revisar solo una excepción cuando existe.
2. Secondary: expandir evidencia/provenance.
3. Existing governed action: confirm/cancel cuando el backend habilita el modo.
4. No CTA candidate-facing, ranking, stage o decisión.

## Visual Fidelity Mapping

- Reutilizar tokens de canvas/surface, typography, StatusChip y progress de Hiring.
- Provisional usa info/neutral, nunca success/green de “score confirmado”.
- Effective conserva la jerarquía existente de TASK-1738.
- No introducir gradients, glass, card-on-card innecesario ni literales de color/spacing.

## Accessibility Contract

- El nombre accesible del score incluye “provisional”; no depende del color ni de la posición.
- El estado de run se anuncia con `aria-live="polite"` solo cuando cambia, sin repetir toda la tarjeta.
- Los controles de evidencia, revisión y reintento son operables por teclado, mantienen foco visible y restauran el foco al elemento disparador.
- Competencias usan listas y headings reales; rationale largo envuelve y permanece disponible completo.
- En 390 px los objetivos táctiles miden al menos 44 px y `scrollWidth === clientWidth`.
- `prefers-reduced-motion` conserva toda la información porque no se añade movimiento esencial.

## Implementation Mapping

- Surface: `src/views/greenhouse/hiring/AssessmentAiRunWorkbench.tsx` dentro de `Application360View`.
- Data: DTO browser-safe de TASK-1742; cero store/provider imports.
- Primitive decision: extend existing workbench/AdaptiveCard; optional local `ProvisionalAssessmentSummary` only.
- Copy: `src/lib/copy/hiring.ts`.
- Markers: `assessment-provisional-summary`, `assessment-ai-coverage`, `assessment-ai-exceptions`.

## GVC Scenario Plan

- Scenario: `task-1743-provisional-assessment-ai`.
- Quality profile: `premium`.
- Viewports: 1440x1100 and 390x844.
- Captures: complete, partial/exceptions, error/retry, coexistence effective, mobile, reduced motion/focus.
- Assertions: provisional label and disclaimer visible; no proposal in blind sample; no candidate payload/DOM; no clipped evidence.
- Scroll width: `documentElement.scrollWidth === documentElement.clientWidth`.
- Desktop evidence: 1440×1100 para ready, partial, error y coexistencia con score efectivo.
- Mobile evidence: 390×844 para ready, excepción expandida y denied.
- Review dossier: `docs/ui/reviews/TASK-1743-provisional-assessment-ai-operator-experience.scorecard.json`.
- Baseline decision / surface ID: extender `TASK-1738-assessment-ai-review-workbench`; no rediseñar Application 360.

## Design Decision Log

- Decision: embed provisional summary in the existing assessment workbench.
- Rejected: reuse effective bars/radar as if final; separate dashboard; modal-only result; hidden proposals.
- Rationale: keeps context, reduces toil and preserves authority distinction.
- Reuse: extend existing pattern; no new primitive or navigation destination.
- Risk: nine competencies can create density; mitigate with compact summary and progressive disclosure.
