# TASK-1182 — Nexa Insight Surface-Aware Conversation (turno sembrado y anclado)

> **Alcance de este wireframe.** No describe una pantalla nueva: describe **cómo se ve un turno de chat que
> nace sembrado desde otra superficie**, dentro de las dos modalidades vigentes de Nexa (Panel y Lateral).
> Redactado 2026-08-05 al reabrir el Slice 2, después de que el retiro del modo `dock` dejara sin consumer
> el `focusRef` (ver `## Delta 2026-08-05` en la task). Todo lo que sigue está anclado a componentes que
> existen hoy en el repo; lo que aún es decisión abierta está marcado como tal, no rellenado.

## Source & Direction

- Direction mode: `system-led` — la superficie ya existe (`NexaFloatingPanel` / `NexaLanePanel`); lo que se
  diseña es el **estado inicial** de una conversación que llega con contexto, no un layout nuevo.
- Source: el chat vigente (`docs/architecture/nexa-intelligence/experience/conversational-experience.md`),
  el ADR del bridge (`GREENHOUSE_NEXA_INSIGHT_CONVERSATION_BRIDGE_DECISION_V1.md` §2.2) y el CTA ya
  implementado en `NexaInsightDetailView` + `HomeAiInsightsBento`.
- Desktop target: el turno sembrado se lee como **una conversación que el usuario inició**, no como un
  mensaje del sistema. Nada de banners "contexto adjuntado".
- Mobile (390 px): idéntica semántica; el Panel ocupa el bottom sheet y el Lateral degrada a Drawer.

## First Fold & Action Hierarchy

Al abrirse el chat desde el CTA, el primer fold muestra, en este orden:

1. **El turno del usuario ya enviado** con la pregunta semilla (`GH_NEXA.insight_ask_nexa_seed`) — el usuario
   ve *su* pregunta, no un placeholder.
2. **El indicador de que Nexa está respondiendo** (el mismo `isRunning` del thread, sin variante nueva).
3. **La respuesta anclada**, que cita el insight enfocado por su nombre real (el servicio lo pre-resuelve con
   `readNexaInsightDrill`; el usuario nunca ve el UUID).
4. El composer, listo para el follow-up, con el historial del thread intacto por debajo.

Regla de jerarquía: **el ancla no es un chrome**. No hay chip, badge ni card de "insight adjunto" en V1 — si
el turno no se puede anclar, la respuesta lo dice en prosa (degradación honesta), no un estado visual aparte.

## Estados (inventario)

| Estado | Cuándo | Qué se ve |
|---|---|---|
| `seeded-sending` | CTA pulsado, semilla despachada | turno del usuario visible + thread `isRunning` |
| `seeded-anchored` | el servicio resolvió el insight | respuesta que nombra la métrica/insight real |
| `seeded-unanchored` | `focusRef` presente pero no resoluble para ese subject | Nexa responde **sin** inventar: contesta lo general y declara que no pudo abrir ese insight |
| `opened-plain` | el chat se abre sin `focusRef` (burbuja, ⌘K) | comportamiento actual, sin cambio |
| `already-running` | el CTA se pulsa con un turno en curso | **decisión abierta** — ver Open questions |
| `error` | el POST falla | error canónico es-CL vigente del thread; el turno sembrado queda re-enviable |

## Copy & Accessibility

- Copy: ya existe y no se inventa aquí — `GH_NEXA.insight_ask_nexa_seed`, `insight_ask_nexa_cta`,
  `insight_ask_nexa_aria`, `home_bento_ask_nexa_seed`, `home_bento_ask_nexa_overview_seed`
  (`src/lib/copy/nexa.ts`). Cualquier string nueva pasa por `greenhouse-ux-writing`.
- El turno auto-enviado **debe anunciarse**: el usuario que llega por teclado o lector de pantalla tiene que
  enterarse de que ya se envió una pregunta en su nombre. Reusar el `aria-live` del thread; no crear región nueva.
- Foco: al abrir por CTA, el foco entra al panel (ya lo hace `FocusTrap` en el flotante); al cerrar vuelve al FAB.
- Reduced motion: sin motion nuevo — el turno aparece con la misma transición que cualquier mensaje.

## Implementation Mapping

| Pieza | Path | Qué cambia |
|---|---|---|
| Runtime compartido | `src/lib/nexa/use-nexa-runtime.ts` | acepta `focusRef` opcional por ref y lo pasa al body (patrón aditivo idéntico a `modelMode`) |
| Adapter canónico | `createNexaChatAdapter` (mismo archivo) | incluye `focusRef` en el POST a `/api/home/nexa` cuando está presente |
| Panel (modo `expandible`) | `src/views/greenhouse/nexa/floating-chat/NexaFloatingPanel.tsx` | recibe `focusRef` + `seedPrompt` |
| Lateral (modo `lane`) | `src/views/greenhouse/nexa/lane-sidecar/NexaLanePanel.tsx` | idem — cubierto por construcción al compartir runtime |
| Puente de apertura | `src/components/greenhouse/NexaFloatingButton.tsx` | hoy escucha `NEXA_FLOATING_OPEN_EVENT` y solo abre; debe **propagar** el detail |
| Auto-envío | (a reponer dentro del provider del runtime persistente) | equivalente vivo del `NexaSeedAutoSend` eliminado con el panel legacy |
| Backend | `/api/home/nexa` + `NexaService` | **sin cambios** — Slice 1 ya acepta y pre-resuelve `focusRef` |

## Verificación visual (GVC)

Escenarios mínimos, desktop + 390 px, en **ambas** modalidades (el Slice 2 original solo cubría el flotante):

1. `/nexa/insights/[id]` → CTA → panel abierto con la pregunta ya enviada y la respuesta nombrando el insight.
2. Home → bento de insights → CTA de overview → mismo comportamiento sin `focusRef` de insight puntual.
3. Modo Lateral con el mismo CTA → el turno se siembra en la columna, no abre un panel paralelo.
4. Persona sin acceso al insight → respuesta sin ancla y sin filtración del contenido (evidencia del anti-oracle).

## Open questions (bloquean `UI ready: yes`)

1. **CTA pulsado con un turno en curso** (`already-running`): ¿se encola la semilla, se descarta, o se
   reemplaza el turno? El `NexaSeedAutoSend` legacy simplemente esperaba a `!isRunning`. Decisión de producto.
2. **CTA pulsado dos veces sobre el mismo insight**: ¿re-siembra o solo enfoca el thread existente?
3. **Alcance del ancla en el thread**: ¿el `focusRef` aplica solo al turno sembrado o persiste para los
   follow-ups de esa conversación? El contrato lo permite por turno; la decisión de UX no está tomada.

Mientras estas tres sigan abiertas, la task se mantiene en `UI ready: no`: son decisiones de comportamiento,
no detalles de implementación, y determinan qué se captura en GVC.
