# TASK-1540 — Globe Video Effectiveness Visual Direction

## Mode and source

- Mode: `repo-native-benchmark`
- Durable source: este documento, ADR-011/SPEC-011, el Creative Loop de TASK-1523 y el viewer/review aprobado
  de TASK-1505.
- Runtime reference: `../efeonce-globe/apps/studio-web/src/producer-ui.ts`,
  `../efeonce-globe/apps/studio-web/src/producer-controller.ts` y
  `../efeonce-globe/apps/studio-web/src/producer-copy.ts`.
- Provenance / approval: dirección propuesta por Product/UI; su primera implementación exige checkpoint humano.
- Selected frame/state: reporte listo con video pausado en un finding severo, frame exacto y objetivo visible.

## Alternatives

### A. Evidence Review Theatre — selected

El video domina como stage. Una línea de tiempo editorial sincroniza playback, escenas, findings y frames
verificados; el objetivo funciona como lente persistente y un inspector explica observación, interpretación,
recomendación, confianza y dirección alternativa.

### B. Creative Scorecard Control Room — rejected

KPIs, scores por dimensión y gráficos dominan el primer fold. Facilita comparación rápida, pero empuja el video a
preview secundaria, incentiva una falsa lectura de precisión y se acerca a un dashboard genérico.

### C. Conversational Creative Critic — rejected

El agente conversa sobre el video en un hilo y adjunta frames. Es flexible para preguntas posteriores, pero vuelve
opaca la cobertura temporal, dificulta comparar versiones y hace que el informe dependa de una secuencia de chat.

## Decision

Seleccionar **Evidence Review Theatre**. El artefacto y su evidencia permanecen por encima de la personalidad del
agente. Conversación contextual puede existir como follow-up futuro, pero no reemplaza timeline, informe ni
decisiones humanas.

## Visual thesis

- First-fold reading order: contexto/objetivo → video → timeline de evidencia → finding activo → decisión.
- Dominant moment: stage de video unido físicamente a la evidence ribbon; seleccionar un finding lleva al momento
  exacto sin ocultar el objetivo declarado.
- Action hierarchy: `Analizar efectividad` antes del run; luego `Revisar hallazgos`; después
  `Proponer variante en Producer`. Aprobar/publicar/gastar nunca es acción del agente.
- Density: editorial y analítica; resumen compacto, detalle profundo bajo selección.
- Depth: canvas oscuro de reproducción, ribbon operativa, inspector luminoso y surfaces flotantes sólo para
  contexto transitorio o decisiones bloqueantes.
- Typography: display controlado para objetivo/título; copy operativo para timecodes, evidencia y confianza.
- Color: paleta Orbital Threshold/Globe; acento para playhead/selección, semánticos sólo para severidad o estado.
- Signature details: objective lens, evidence ribbon con ranges y frames, comparación before/after y
  recommendation-to-Producer con lineage visible.

## Desktop target — 1440×1000

- Contexto de workspace, origen y deployment queda en una banda compacta.
- Stage de video ocupa aproximadamente dos tercios del plano útil; no queda reducido por cards laterales.
- Timeline/evidence ribbon permanece vinculada al stage y soporta escenas, ranges, frame pins y playhead.
- Inspector derecho muestra finding activo y cambia entre `Objetivo`, `Craft`, `Canal`, `Alternativas` y
  `Forecast` sin perder reproducción.
- Historial/comparación aparece como rail colapsable, no como dashboard de report cards.
- Action dock reúne review humano, abrir origen y propuesta a Producer.

## Mobile target — 390×844

- Contexto compacto → stage 16:9/9:16 adaptado → evidence ribbon táctil → finding activo → action dock.
- El inspector se convierte en una surface full-height con tabs/sections, manteniendo el video como mini-stage
  contextual cuando aporta orientación.
- La lista de findings y la ribbon son scroll-containers internos; nunca crean scroll horizontal de página.
- `Proponer variante` abre confirmación/draft en sheet y devuelve foco al finding de origen.

## Surface/system mapping

| Cue | Globe pattern/runtime candidate | Decision |
| --- | --- | --- |
| Shell de análisis | Globe Creative Suite shell + navegación propia | `extend` |
| Video dominante | Producer candidate viewer/media delivery | `reuse` |
| Evidence ribbon | pattern nuevo candidato de Globe sobre timeline accesible | `extend`, promover sólo vía TASK-1485 |
| Finding inspector | review/viewer surface de Producer | `extend` |
| Upload/picker | canonical private ingest + asset library | `reuse`; nunca uploader local |
| Agent → Producer | governed proposal/draft handoff | `reuse` de contracts, UI local |
| Blocking decisions | dialog/sheet focus-managed de Globe | `reuse` |

Greenhouse `CompositionShell`, MUI primitives y AXIS no se importan al runtime de Globe. Los nombres anteriores
son roles de composición; la implementación consume únicamente tokens/patterns propios de Globe.

## Anti-patterns

- Dashboard de scores o cards uniformes como primer fold.
- Chat como única forma de navegar el análisis.
- Timeline decorativa sin timecodes/frame identity.
- Autoplay, ambient loops o motion que compita con el video.
- Score único que mezcle objetivo, craft, canal y forecast.
- CTA agente→Producer que parezca ejecución aprobada o esconda estimate.
- Segunda librería/uploader dentro de Video Effectiveness.
- Provider slug, vendor cost, raw storage URI o predicción causal en el DOM.

## Acceptance signature

- Average visual score ≥4.5/5; no dimensión <4/5.
- Hierarchy, surface economy, visual impact, fidelity y generic-template resistance ≥4.5/5.
- El video y su evidencia temporal dominan desktop y mobile.
- El flujo Producer↔analysis↔Producer es visible sin implicar autoaprobación ni gasto.
- Evidencia GVC premium en `1440×1000`, `390×844` y reduced motion.
- `document.documentElement.scrollWidth <= document.documentElement.clientWidth` con inspector, picker,
  comparison y proposal sheet abiertos.
