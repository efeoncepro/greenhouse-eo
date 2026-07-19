# TASK-1474 — Globe Professional Studio Workbench Wireframe

## Visual direction

Globe se comporta como una mesa de dirección creativa premium: una pieza dominante en el canvas, contexto
operativo lateral y evidencia visible sin convertir la pantalla en un dashboard de cards. La shell de marca
existente es la autoridad visual; este documento fija estructura, no valores literales de Figma ni tokens.

## Directions considered

1. **Editorial contact sheet:** alto impacto visual y lectura rápida, pero débil para approvals y lineage.
2. **Production control room:** excelente densidad operativa, pero demasiado técnico para el brief creativo.
3. **Creative desk — selected:** canvas dominante + rail contextual adaptable + dock de candidates; conserva
   craft y permite estimate, rights, review y delivery sin exponer el DAG.

## Desktop wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Globe / Campaign name                Run state        Credits estimate  Actor │
├──────────────────────────────────────────────────────┬───────────────────────┤
│ LEAD / CREATIVE CANVAS                               │ CONTEXT RAIL          │
│                                                      │ Brief / references    │
│      Key visual or selected candidate                │ Direction decisions   │
│      dominant, zoomable, compare-aware               │ Rights + approvals    │
│                                                      │ Route / version       │
│                                                      │ Recovery state        │
├──────────────────────────────────────────────────────┴───────────────────────┤
│ CANDIDATE DOCK  [01] [02] [03]   Review notes   Format set   Release package │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Mobile 390px

- El canvas sigue primero y conserva el candidate seleccionado.
- Context y review pasan a sidecar temporal accesible; el dock se convierte en lista horizontal contenida.
- Estimate, approval y estado crítico nunca desaparecen: se condensan en una banda sticky, no se recortan.
- No existe scroll horizontal de página; sólo el candidate dock puede tener scroll propio etiquetado.

## States and copy contract

- Empty: iniciar desde brief, template curado o campaña existente.
- Draft: decisiones editables, sin promesa de ejecución.
- Estimate required / expired: ruta y costo visibles, CTA a recalcular.
- Approval required: actor/alcance/expiración del approval explícitos.
- Running: progreso por attempt, cancelación honesta y provider/model/version real.
- Candidate ready: comparar, anotar, aprobar o ramificar.
- Blocked: rights, budget, readiness o provider error tipado con recuperación.
- Released / revoked: manifest y paquete descargable; evidencia histórica intacta.

## Implementation Mapping

| Región | Primitive/contract | Fuente |
|---|---|---|
| Shell | Composition Shell `leadPlusContext`, `fluidity='rich'` | controller compartido |
| Header | Breadcrumb/session/run summary | run reader |
| Canvas | media viewer/compare primitive | candidate reader |
| Context rail | adaptive sidecar + adaptive sections | brief, rights, estimate readers |
| Candidate dock | adaptive list/contact sheet | candidate collection |
| Review | annotations + governed commands | review command/reader |
| Delivery | release manifest + download command | release reader/command |

## GVC Scenario Plan

- Desktop 1440×1000: empty, draft, approval, running, candidate-ready, blocked y released.
- Mobile 390×844: canvas, context sidecar, candidate dock, keyboard/focus y error recovery.
- Medir `scrollWidth <= clientWidth` en ambos viewports.
- Capturar primer fold tras shell y datos fixture antes del cableado exhaustivo.
- Gate final: `design-contract:lint`, `ui:code-lint`, `ui:visual-gate`, `ui:quality` y scorecard >=4.5.

## Design Decision Log

- Se elige Creative desk porque mantiene un momento visual dominante y reduce el lenguaje técnico.
- El DAG queda fuera del onboarding; sólo podrá aparecer como authoring avanzado futuro.
- Candidate dock es región, no wallpaper de cards.
- El rail contextual usa The Seam: shell y cards se adaptan por sus propios contratos, sin acoplamiento.
- Texto/logos de release se muestran como finishing determinista, no como promesa del modelo generativo.

