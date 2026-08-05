# Experiencia — Conversational Experience

> **Vista Nexa Intelligence.** Contrato canónico (SSOT): [`../../ui-platform/CONVERSATIONAL_EXPERIENCE.md`](../../ui-platform/CONVERSATIONAL_EXPERIENCE.md) + el domain playbook. Skill: `greenhouse-nexa-conversational`.

## Qué es

La **experiencia conversacional** es la forma en que una persona le pregunta algo a Nexa dentro de
Greenhouse y recibe una respuesta clara, confiable y con sus fuentes — **sin salir del contexto en
el que estaba**. La superficie canónica es `NexaAnswersCanvas` (domain-neutral): la respuesta
**lidera** y **se arma**.

## Principios (que esta capa hereda del contrato)

- **`NexaAnswersCanvas` es la surface canónica** — NO hay una answer-surface por dominio. El dominio
  entra por **datos** (`surfaceContext`), nunca por chrome especial.
- **Contratos versionados SSOT**: `surfaceContext` (`@/lib/nexa/nexa-answers-surface-context`),
  `nexa-answer-render-plan.v1`, `nexa-evidence.v1`, `knowledge-search.v1`.
- **Mecanismos transversales = primitives neutrales**: `NexaProvenanceTrace` (grounding),
  `NexaResponseToolbar` (chrome de confianza), `NexaStreamingText` (revelado), `NexaEvidencePanel` (evidencia).

## La coreografía (11 estados)

`idle → submitted → thinking → reasoning → streaming → answered → proofOpen → followup` (+
`compacted`/`degraded`/`error`). El live region del status lo lleva la identidad Nexa (un solo
anuncio a11y); `prefers-reduced-motion` horneado en cada primitive.

## Cómo se relaciona con las otras capas

- El **system prompt** (capa 01/02) gobierna qué dice; la experiencia gobierna cómo se muestra.
- El **knowledge** (capa knowledge) produce el packet; la experiencia lo renderiza (citas + panel de fuentes).
- La **evidencia** (`evidence-and-citations`) es el chrome de confianza de esta superficie.

## Reglas duras (del contrato — no re-derivar)

- **NUNCA** crear una answer-surface/chat por dominio. Componer el canvas con su `surfaceContext`.
- **NUNCA** crear un `surfaceContext` paralelo ni un variant nuevo por dominio.
- **NUNCA** romper un contrato versionado sin bumpear la versión.
- **NUNCA** duplicar grounding/toolbar/revelado/evidencia: consumir las primitives.

## Convergencia (runtime construido)

La lente rica del canvas YA está cableada a `/knowledge` con retrieval real (flag
`NEXA_ANSWERS_CANVAS_LENS_ENABLED`, default OFF), GVC-verificada. Cualquier dominio nuevo sigue el
domain playbook (no se rediseña el shell). Detalle + follow-ups: el contrato canónico.

## Modo de interacción del chat (expandible / lane — TASK-1079)

El **chat flotante** (`NexaThread` montado por `NexaFloatingButton`) tiene dos form-factors que el
usuario final elige según cómo trabaja — **es una preferencia, no un flag binario de plataforma**:

| Modo | Qué es | Form-factor |
| --- | --- | --- |
| `expandible` (B) | Panel ampliable con historial | `NexaFloatingPanel` (TASK-1078), compacto↔ancho. **Piso incondicional** |
| `lane` (C) | Sidecar in-flow con gutter de shell | `AdaptiveSidecarLayout` + `NexaLanePanel`; el dashboard queda 100% visible al lado (split) y el panel conserva margen visual respecto del viewport |

### Delta 2026-08-05 — retiro del modo `dock` ("Compacto")

`dock` (A) era el panel flotante **efímero previo a TASK-1078** (runtime local vía `useLocalRuntime`,
sin historial persistido). Cuando el panel ampliable completó su rollout y pasó a ser el comportamiento
base, ese panel viejo quedó vivo únicamente como opción del selector: una modalidad que ya no
representaba nada vigente. Se retiró junto con su código muerto y con el flag de cutover que lo
gateaba (`NEXA_FLOATING_EXPANDABLE_ENABLED` + su mirror `NEXT_PUBLIC_*`, ON en Production/staging/Preview
desde 2026-06). Consecuencias:

- `NexaInteractionMode` = `'expandible' | 'lane'`; `expandible` es el piso incondicional (ya no se gatea).
- `coerceNexaInteractionMode('dock', …)` → `'expandible'`: una preferencia legacy nunca rompe el layout.
- CHECK de DB cerrado a `('expandible','lane')` + filas `dock` normalizadas a NULL
  (`migrations/20260805110418197_retire-nexa-dock-interaction-mode.sql`).
- Se fue con el panel legacy el único consumer del `focusRef`/seed de TASK-1182 (ver "Deuda conocida").

- **Cero lógica de chat duplicada:** ambos modos comparten `useNexaPersistentRuntime`,
  `nexa_threads`/`nexa_messages` (historial), `NexaHistoryRail` y `NexaModelSelector`. Solo cambia el chrome.
- **SSOT de modo:** `src/lib/nexa/interaction-mode.ts` (puro: coerce + gating). Preferencia persistida
  per-usuario en `greenhouse_core.client_users.nexa_interaction_mode` (NULL = default que **preserva el
  comportamiento vigente** del flotante; nunca `lane` por default). Reader server-side:
  `interaction-mode.server.ts`; provider client: `nexa-interaction-mode-context.tsx`; selector reusable:
  `NexaModeMenu`; host del lane: `NexaLaneContentHost` (envuelve `{children}` del dashboard, passthrough
  byte-idéntico salvo modo lane).
- **Flags (gating de disponibilidad, default-safe):** queda uno solo —
  `NEXA_INTERACTION_LANE_ENABLED` (**default OFF**, TASK-1079) habilita el lane C (reflowea el contenido
  del dashboard = cambio de hot-path). Un modo no disponible degrada al default; el selector solo ofrece
  lo disponible y no se renderiza cuando hay menos de 2 opciones.
- **El lane arranca abierto** en cada carga fresca cuando el modo efectivo es `lane`
  (`useState(initialMode === 'lane')`); el colapso NO se persiste, así que un reload lo reabre. Es el
  diseño vigente ("workspace persistente"), no un bug — pero es la causa del reporte recurrente
  "el chat de Nexa se abre solo al iniciar sesión".

**Reglas duras:** **NUNCA** forkar la lógica de chat por modo (ambos envuelven el mismo runtime/historial).
**NUNCA** montar el lane fuera de `NexaLaneContentHost` ni romper su passthrough default-safe. **NUNCA**
hacer `lane` el default (es opt-in explícito del usuario + flag default-OFF). **NUNCA** reintroducir un
form-factor de chat con runtime propio: si un modo nuevo no comparte `useNexaPersistentRuntime` +
`nexa_threads`, nace como deuda (fue exactamente lo que pasó con `dock`).

### Deuda conocida — `focusRef` / pregunta semilla (TASK-1182)

El ancla de superficie (`focusRef` + auto-envío del seed) que alimentaba el CTA "Pregúntale a Nexa"
estaba implementada **solo** en el panel legacy `dock`, no en `NexaFloatingPanel`. Como el modo default
era `expandible` desde el rollout de TASK-1078, esa capability ya estaba **inoperante en producción**
antes de este retiro: el CTA abría el chat pero no anclaba el insight ni enviaba la semilla. Hoy los CTAs
siguen abriendo el chat (comportamiento sin cambio observable); portar el ancla al runtime persistente
(`useNexaPersistentRuntime` no acepta `focusRef`) queda pendiente como trabajo propio.

## Código

`src/components/greenhouse/primitives/nexa-answers-canvas/**`, `src/lib/nexa/nexa-answers-surface-context.ts`,
`src/views/greenhouse/**` (lens hosts). Procedencia: TASK-1095/1096/1101 (+ 1103/1104/1105/1108).
Modo de interacción (dock/expandible/lane): `src/lib/nexa/interaction-mode*.ts`,
`src/lib/nexa/nexa-interaction-mode-context.tsx`, `src/components/greenhouse/{NexaModeMenu,NexaLaneContentHost}.tsx`,
`src/views/greenhouse/nexa/lane-sidecar/NexaLanePanel.tsx`. Procedencia: TASK-1078 (B) + TASK-1079 (C + preferencia).
