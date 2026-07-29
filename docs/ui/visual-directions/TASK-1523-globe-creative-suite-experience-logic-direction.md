# TASK-1523 — Globe Creative Suite Experience Logic Visual Direction

## Mode and source

- Mode: `repo-native-benchmark`
- Durable source: este documento, el runtime/source aprobado de `TASK-1505` y los contratos de `TASK-1474`.
- Provenance / approval: dirección propuesta por Product/UI; selección final requiere aprobación humana.
- Selected frame/state: Creative Loop desde intención hasta candidato seleccionado.

## Alternatives

1. **Editorial Creative Desk** — stage dominante, intención/dirección legible, referencias próximas,
   candidatos como contact sheet e inspector contextual.
2. **AI Chat Canvas** — conversación dominante con outputs en stream y controles embebidos.
3. **Technical Node Graph** — canvas explícito de steps, providers, ramas y dependencias.

## Decision

Seleccionar **Editorial Creative Desk**. Habla el idioma creativo y conserva dirección, craft, rights, gasto y
lineage visibles. Chat queda auxiliar; el grafo técnico sólo puede ser diagnóstico/operator tooling futuro.

## Visual thesis

- First-fold reading order: contexto → intención/dirección → stage → estimate/acción → candidatos.
- Dominant decision: qué producir o qué hacer con el candidato actual.
- Density: rica y editorial; controles avanzados por progressive disclosure.
- Depth model: canvas base, stage inmersivo, selection/inspector y floating context con roles distintos.
- Typography role: display para identidad/momento creativo; operational copy compacta.
- Color role: Orbital Threshold/Globe; acento reservado a acción/selección y estados honestos.
- Signature details: stage con memoria visual, candidate filmstrip y handoffs causales.

## Desktop target

En `1440×1000`, el stage domina. Workspace/responsabilidad quedan compactos; intención/referencias se relacionan
con el stage sin formulario lateral permanente; estimate y CTA permanecen juntos. Los candidatos forman una
banda de continuidad y el inspector aparece al seleccionar.

## Mobile target

En `390×844`: contexto compacto → intención → estimate/CTA contextual → candidato/stage → filmstrip. Settings,
lineage y metadata pasan a sheets/dialogs según semántica. Cero scroll horizontal de página.

## Token mapping

| Cue | Canonical token / primitive / recipe | Deviation |
|---|---|---|
| Stage dominante | pattern Globe `Creative Desk` candidate | no hereda CompositionShell |
| Candidato seleccionado | state/selection token Globe | nunca sólo color |
| Contexto transitorio | floating/popover pattern Globe | wrapper/fallback |
| Decisión bloqueante | dialog pattern Globe | gasto/rights/release |
| Movimiento causal | motion tokens/patterns Globe | reduced motion equivalente |
| Galería larga | intrinsic layout + render diferido | verificar teclado/layout shift |

## Anti-patterns

- Chat como único modelo de interacción.
- Formulario/configuración más prominente que el stage.
- Apps separadas por Image/Video/Audio.
- Card dashboard o nested-card wallpaper.
- Nodos/providers/slugs como lenguaje de usuario.
- Progress inventado, ambient motion constante o gates con apariencia ejecutable.

## Acceptance signature

- Average ≥4.5/5; critical dimensions ≥4.5/5; no dimension <4/5.
- Desktop/mobile/reduced-motion evidence.
- Creative Loop reconocible sin confundir Producer con Workbench.
