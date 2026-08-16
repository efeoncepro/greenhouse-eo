# TASK-1730 — Wireframe · `/my` longitudinal candidato

## Product-design source

- Direction mode: `repo-native-benchmark`.
- Source: `docs/ui/visual-directions/TASK-1730-longitudinal-my-candidate-experience.md`.
- Recipe: operational workbench sobre `CompositionShell`.

## Desktop first fold

```text
┌ WorkbenchHeader: Mi espacio ─ Perfil | Postulaciones | Documentos | Privacidad ┐
├ Acción pendiente: Completa las preguntas de Diseñador/a UX · vence … [Continuar] ┤
├──────────────────────────────────────────┬───────────────────────────────────────┤
│ Mis postulaciones                        │ Mi perfil profesional                 │
│                                          │                                       │
│ ● Diseñador/a UX                         │ Headline + links                      │
│   Necesitamos algo de ti                 │ Skills / idiomas / certificaciones    │
│   última comunicación …                  │ CV actual · actualizado …             │
│   [Ver postulación]                      │ [Actualizar perfil]                   │
│                                          │                                       │
│ ○ Account Manager · En revisión          │ Privacidad/Talent Pool factual         │
└──────────────────────────────────────────┴───────────────────────────────────────┘
```

## Mobile first fold · 390 px

```text
Mi espacio
[Perfil] [Postulaciones] [Documentos] …

Necesitamos algo de ti
Preguntas · Diseñador/a UX             [Continuar]

Mis postulaciones
● Diseñador/a UX
  Necesitamos algo de ti · actualizado …
  [Ver postulación]

○ Account Manager
  En revisión · actualizado …
```

Perfil/documentos continúan debajo o en su ruta hermana; no desplazan la primera postulación fuera del fold.

## State and copy inventory

- Loading: skeleton de regiones manteniendo header/tabs.
- Empty: “Aún no tienes postulaciones asociadas a esta cuenta” + recovery/contact; no inventar success.
- Error: “No pudimos cargar tus postulaciones” + Reintentar.
- Degraded: perfil disponible y aplicaciones temporalmente indisponibles se explican por separado.
- Denied: acceso no disponible, sin confirmar existencia de recursos.
- Action required: propósito, deadline y CTA explícitos.
- Decision communicated: resultado sólo después de publication ledger.
- Withdraw: confirmación con consecuencias y focus restore.

## Accessibility

- Heading/order semántico; status tiene texto, no sólo color.
- Tabs/rutas operables por teclado; primary action visible al foco.
- Upload/confirmación restaura foco; errores asociados al campo y resumen.
- Reduced motion alcanza el mismo estado; live regions sólo para resultados causales.

## Implementation Mapping

- Shell: `WorkbenchHeader` + `CompositionShell` (`leadPlusContext` o composición canónica equivalente).
- Regions: `lead=next action`, `primary=applications journey`, `aside=professional profile/privacy`.
- Primitives: Greenhouse activity timeline/state surfaces/buttons/chips/forms/upload; confirmar lookup en runtime.
- Reader/commands: TASK-1728/1729; manifest server-side TASK-1727.
- Copy: `src/lib/copy/*`.
- Primitive decision: `reuse`; extender sólo si un hueco transversal se demuestra.

## GVC Scenario Plan

- Scenario: `task-1730-longitudinal-my`.
- Viewports: 1440×1000 y 390×844; `qualityProfile: premium`.
- Capturas: default dos apps, action required, empty, error/degraded, selection/preboarding, candidate+member.
- Interactions: tabs, abrir app, actualizar CV, withdraw cancel/confirm, keyboard/focus restore.
- Assertions: nav capability-safe, no notes/scores/raw stages, `scrollWidth === clientWidth`, active tab visible.
- Dossier: `docs/ui/reviews/TASK-1730-longitudinal-my-candidate-experience/`.

## Design Decision Log

- Seleccionado workbench longitudinal sobre wizard/dashboard.
- `/my` conserva URL y shell; no nace `/candidate`.
- Progreso de perfil es informativo/freshness, jamás score.
- Desktop usa contexto lateral; mobile recompone y prioriza acción/journey.
