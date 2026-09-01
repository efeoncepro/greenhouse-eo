# ISSUE-166 — El CTA «Pregúntale a Nexa» abre el chat sin anclar el insight ni enviar la pregunta

## Ambiente

production (código en `main`; el defecto no depende del ambiente)

## Detectado

2026-09-01, durante el barrido de tasks `in-progress` con cero checkboxes tildados. Emergió al
verificar si `TASK-1182` estaba terminada: su Slice 1 (backend) está vivo, su CTA está vivo, y el
puente entre ambos se perdió.

## Síntoma

En `/nexa/insights/[id]` y en el bento de insights del Home, el usuario pulsa **«Pregúntale a Nexa»**.
El panel de Nexa se abre — y no pasa nada más. **No ancla el insight y no envía la pregunta semilla.**
El usuario queda frente a un chat vacío, teniendo que reescribir a mano lo que el botón prometía.

No hay error, no hay log, no hay señal. El botón cumple la mitad visible de su promesa.

## Causa raíz

El productor despacha el evento con todo lo necesario
(`src/views/greenhouse/nexa/insights/NexaInsightDetailView.tsx:522`):

```js
window.dispatchEvent(
  new CustomEvent(NEXA_FLOATING_OPEN_EVENT, {
    detail: {
      source: 'nexa-insight',
      focusRef: { kind: 'nexa_insight', id: signalId },
      seedPrompt: GH_NEXA.insight_ask_nexa_seed
    }
  })
)
```

Y el consumidor lo descarta (`src/components/greenhouse/NexaFloatingButton.tsx:91`):

```js
const onOpen = () => {
  if (isLaneMode) { setLaneOpen(true); return }
  setOpen(true)
  setExpanded(true)
}
```

**El handler no declara el parámetro del evento**, así que no puede leer `detail`. El `focusRef` y el
`seedPrompt` se pierden en el aire.

Verificado por grep: `focusRef` existe en 7 archivos — el contrato (`nexa-contract.ts`), el resolver
(`insight-focus.ts` + su test), el servicio (`nexa-service.ts`), la ruta (`api/home/nexa/route.ts`) y
los **dos productores** — y en **cero** consumers del panel. No está en `use-nexa-runtime.ts`, ni en
`NexaFloatingButton.tsx`, ni en `NexaFloatingPanel.tsx`.

**Origen:** el transporte del `focusRef` y el auto-envío de la semilla vivían en el panel `dock`
legacy, retirado en `e1662f3b3`. El retiro se llevó el consumer y nadie lo repuso en el panel nuevo.
Es una regresión de refactor, no un diseño incompleto: el propio `## Delta 2026-08-05` de `TASK-1182`
ya lo documenta.

## Impacto

**User-facing y silencioso.** El CTA es la convención de marca de Nexa citada en `CLAUDE.md` (Nexa Mark
+ Shiny Button navy) y aparece en dos superficies productivas: la página de detalle de insight y el
bento del Home. Cada clic promete una conversación anclada al insight y entrega un chat en blanco.

El backend está intacto: `focusRef` sigue resolviéndose y anclando la respuesta cuando llega. Lo único
roto es el transporte del cliente.

## Solución propuesta

Los cuatro puntos que `TASK-1182` ya declara en su Delta:

1. `useNexaPersistentRuntime` acepta `focusRef` y lo pasa al body vía `createNexaChatAdapter` — patrón
   aditivo idéntico al que ya usa `modelMode`.
2. `NexaFloatingPanel` y `NexaLanePanel` reciben `focusRef` + `seedPrompt` desde el
   `NEXA_FLOATING_OPEN_EVENT` (el handler debe recibir el evento).
3. Reponer el auto-envío de la semilla dentro del provider persistente (el ex `NexaSeedAutoSend`).
4. Evidencia en las **dos** modalidades vigentes: panel flotante y lane.

## Verificación

Manual, porque es de percepción:

1. Abrir `/nexa/insights/<id>` y pulsar «Pregúntale a Nexa».
2. El panel debe abrirse **con la pregunta ya enviada** y la respuesta anclada a ese insight.
3. Repetir en el bento del Home y en modo lane.

```bash
pnpm vitest run src/lib/nexa
# y, cuando exista el consumer:
grep -rn "focusRef" src/lib/nexa/use-nexa-runtime.ts src/components/greenhouse/NexaFloatingButton.tsx
```

## Relacionados

- `TASK-1182` — Nexa Insight Surface-Aware Conversation (`in-progress`; dueña del fix)
- `TASK-1181` — el lado inverso (chat → insights), que sí funciona
- `e1662f3b3` — el retiro del panel `dock` que se llevó el consumer
