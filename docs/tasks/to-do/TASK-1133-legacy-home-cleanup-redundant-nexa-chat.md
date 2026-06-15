# TASK-1133 — Cleanup del home legacy + su chat de Nexa redundante (post rollout home v2)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `cleanup`
- Domain: `home|nexa|platform`

## Por qué existe

El rollout de **home v2 cerró y funciona** (es el default vigente — confirmado por el operador
2026-06-15). Quedó código legacy redundante:

- `src/app/(dashboard)/home/page.tsx` hace un **swap** `HomeShellV2` (v2) vs `HomeViewLegacy` (legacy)
  gobernado por el rollout flag (`resolveHomeRolloutFlag` / `home_v2_opt_out`).
- El **home legacy** (`src/views/greenhouse/home/HomeView.tsx`) embebe un **chat de Nexa propio**
  (`NexaThread` + `NexaThreadSidebar`).

Ese chat embebido es **redundante** con el **chat flotante global** (`NexaFloatingButton` →
`NexaFloatingPanel`, montado en todo el dashboard, que reusa el mismo `NexaThread`). El home v2 NO
embebe chat: usa el flotante. Con v2 como default, mantener el home legacy + su chat embebido es
deuda muerta + dos lugares para el mismo chat.

## ⚠️ Frontera dura (no romper el chat compartido)

- `NexaThread` (`src/views/greenhouse/home/components/NexaThread.tsx`) **es compartido**: lo reusa el
  **chat flotante global**. **NUNCA borrarlo.** Solo se retira **el embebido del home legacy**
  (`HomeView` + `NexaThreadSidebar`).
- El **endpoint** `/api/home/nexa` y el backend (`NexaService`, prompt, providers, tools, evidencia)
  **se quedan** — son el backend de TODO el chat (flotante incluido). El "home" del nombre es histórico.
- El flotante (`NexaFloatingButton`/`NexaFloatingPanel`) **se queda**.

## Qué hacer

1. **Confirmar rollout cerrado**: v2 es el default + `home_v2_opt_out` sin usuarios activos (consultar
   `home_rollout_flags` / la columna de opt-out). Si hay opt-outs, migrarlos antes.
2. **Simplificar el swap** en `home/page.tsx`: renderizar siempre `HomeShellV2`; quitar la rama
   `HomeViewLegacy`.
3. **Eliminar el home legacy**: `HomeView.tsx` + `NexaThreadSidebar.tsx` + assets/imports legacy que
   queden huérfanos (verificar con grep que nadie más los use).
4. **Retirar el rollout flag de home v2** (plataforma de flags TASK-780): `HOME_V2_ENABLED`,
   `home_v2_opt_out`, las filas `home_rollout_flags` del shell v2, los readers/signals asociados
   (`home-rollout-drift`) si quedan sin propósito. Append-only donde corresponda.
5. **Verificar**: el chat sigue funcionando vía el **flotante** en el home (y en todo el dashboard);
   `pnpm test` + `pnpm build` + route-reachability + `pnpm nexa:doc-gate` verdes.

## Aceptación

- `home/page.tsx` renderiza solo v2; `HomeViewLegacy` + `NexaThreadSidebar` eliminados; cero referencias huérfanas.
- El chat de Nexa en el home funciona vía el flotante (no hay dos chats).
- `NexaThread` + el flotante + `/api/home/nexa` intactos.
- Flag/opt-out de home v2 retirados (o documentado por qué quedan).

## Referencias

- Topología del chat: `docs/architecture/nexa-intelligence/experience/conversational-experience.md` + la skill `greenhouse-nexa-conversational` (sección "Topología del chat").
- Home rollout: `src/lib/home/rollout-flags.ts` + plataforma de flags (TASK-780).
- Procedencia: revisión profunda del Nexa Chat (TASK-1124 follow-up).
