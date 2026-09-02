# TASK-1078 — Nexa floating chat: panel expandible con historial persistido

> 🔴 **Qué es este documento y qué NO es.** Es un **registro retroactivo del diseño que YA está
> desplegado**, escrito el 2026-09-01 para cerrar la task. No es un wireframe previo a la
> implementación: la superficie se diseñó en su momento con un **mockup** (`/nexa/floating-chat/mockup`)
> y el loop GVC, que era la práctica vigente cuando se construyó, antes de que el contrato de
> wireframes existiera.
>
> Todo lo que sigue está **leído del código que corre hoy**, no propuesto. Donde hay una medida, sale
> del archivo citado. Donde algo no está resuelto, se dice — no se rellena.
>
> **Por qué existe igual:** el próximo que toque este panel necesita saber qué regiones tiene, qué
> estados sostiene y qué primitives lo componen, sin leer 882 líneas de TSX. Ese valor es real y
> sobrevive al motivo administrativo que lo originó.

## Meta

- Task: `TASK-1078` (`complete`)
- Modo de dirección: `system-led` — la superficie existía como FAB; lo que se diseñó fue su
  **expansión** a panel con historial, no un layout nuevo.
- Estado: **en runtime, sin flag**. El cutover se ejecutó el 2026-06-11 y el flag se **retiró** el
  2026-08-05 (`FEATURE_FLAG_STATE_LEDGER.md:270`); `src/lib/nexa/flags.ts` declara el panel ampliable
  como *comportamiento base incondicional*.
- Alcance: el FAB de Nexa montado en `src/app/(dashboard)/layout.tsx`, o sea **todas las rutas del
  dashboard**.

## Archivos que materializan este diseño

| Pieza | Archivo |
|---|---|
| Panel expandible | `src/views/greenhouse/nexa/floating-chat/NexaFloatingPanel.tsx` (534 líneas) |
| Riel de historial | `src/views/greenhouse/nexa/floating-chat/NexaHistoryRail.tsx` (348 líneas) |
| Scrollbar del patrón | `src/views/greenhouse/nexa/floating-chat/nexa-scrollbar.ts` |
| Entrypoint (FAB) | `src/components/greenhouse/NexaFloatingButton.tsx` |
| Runtime persistente | `src/lib/nexa/use-nexa-runtime.ts` (`useNexaPersistentRuntime`) |
| Thread compartido | `src/views/greenhouse/home/components/NexaThread.tsx` |

## Regiones

```
┌─ Panel ────────────────────────────────────────────────┐
│  ┌─ Riel de historial ─┐  ┌─ Conversación ───────────┐ │
│  │  width: 272px       │  │  NexaThread              │ │
│  │  (NexaHistoryRail   │  │  hideHeader              │ │
│  │   :184)             │  │  compact={!expanded}     │ │
│  │                     │  │                          │ │
│  │  · buscador         │  │  ┌─ vacío ─────────────┐ │ │
│  │    (clear aria)     │  │  │ maxWidth 400 / 460  │ │ │
│  │  · lista de threads │  │  │ (NexaFloatingPanel  │ │ │
│  │  · rename / delete  │  │  │  :83, :111)         │ │ │
│  │    con confirmación │  │  └─────────────────────┘ │ │
│  └─────────────────────┘  │  ┌─ NexaComposer ──────┐ │ │
│                           │  └─────────────────────┘ │ │
│                           └──────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

El riel **sólo existe expandido**. En `compact` el panel colapsa a la conversación: `NexaThread`
recibe `compact={!expanded}` (`NexaFloatingPanel.tsx:256`), que es el único conmutador de densidad —
no hay dos layouts paralelos.

## Estados que la superficie sostiene

| Estado | Cómo se ve | Dónde vive |
|---|---|---|
| Colapsado | conversación sin riel, densidad compacta | `expanded=false` |
| Expandido | riel de 272px + conversación | `expanded=true` |
| Vacío | mensaje centrado, `maxWidth 400`, sin lista | `NexaFloatingPanel.tsx:83` |
| Modo lane | el panel cede a `NexaLanePanel` | `isLaneMode` en `NexaFloatingButton.tsx` |
| Renombrando | diálogo con el título actual precargado | `NexaHistoryRail.tsx:147-171` |
| Borrando | confirmación explícita antes del `DELETE` | `NexaHistoryRail.tsx:148-176` |

Los dos últimos son **destructivos y por eso confirmados**: el rename precarga el valor vigente y el
delete exige confirmación. Ninguno actúa sobre el thread activo sin pasar por el diálogo.

## Persistencia

El historial no es estado local del panel: sale de `useNexaPersistentRuntime`
(`src/lib/nexa/use-nexa-runtime.ts`), **el mismo runtime que consume `HomeView`**. Ese compartir es
deliberado — es lo que deduplica los threads entre el Home y el panel flotante, y lo que hace que
abrir el FAB en cualquier ruta continúe la conversación en vez de empezar una nueva.

Rename y delete viajan por `PATCH`/`DELETE` a `/api/home/nexa/threads/[threadId]`, no por mutación
del cliente.

## Primitives que compone

`NexaComposer` · `NexaFace` · `NexaPresenceMark` · `NexaSenderMark` · `NexaGlowBorder` — canonizadas
en `docs/architecture/ui-platform/PRIMITIVES.md` y con lab propio en `/design-system/nexa-chat`. El
patrón agregado está declarado como **«Nexa Chat Pattern»** en `PATTERNS.md`.

🔴 Ninguna superficie nueva de Nexa debe crear su propio input, glow ni botón: reusa estas. Es la
regla que esta task dejó escrita al canonizarlas.

## Lo que este documento NO cubre, y no se inventa

- **Medidas del panel contenedor.** No hay constantes de ancho/alto declaradas en
  `NexaFloatingButton.tsx`; la geometría se resuelve en el layout del propio panel. Documentar un
  número acá sería inventarlo.
- **GVC mobile del runtime.** Declarado pendiente cosmético y no bloqueante en la task; no hay
  evidencia capturada del runtime a 390px (sí del mockup).
- **Baseline `fe:capture:diff --promote`** entre mockup y runtime: nunca se promovió.

## Relacionados

- `docs/architecture/ui-platform/PRIMITIVES.md` — las 5 primitives canonizadas acá
- `docs/architecture/ui-platform/PATTERNS.md` — «Nexa Chat Pattern»
- `TASK-1113` — el fix de flicker/scroll sobre este mismo thread (`complete`)
- `TASK-1112` — unificación chat/answers, que declara esta task como precondición
