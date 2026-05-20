import 'server-only'

import { countCorrectionTransitionsDemo } from './count-correction-transitions-demo'
import {
  RPA_FORMULA_VERSION,
  type RpaV2DataStatus,
  type RpaV2InputsUsed,
  type RpaV2Result,
  type RpaV2SourceMode,
  type TaskInputsForRpaV2
} from './calculate-rpa-v2'

/**
 * TASK-913 Slice 1 — calculateRpaV2Demo canonical helper (demo carril paralelo).
 *
 * **Sibling físicamente separado** de `calculateRpaV2` productive. Delega 100%
 * a `countCorrectionTransitionsDemo` (lee tabla demo). Mismo shape canonical
 * `RpaV2Result` que el sibling productive — consumer downstream (writeback,
 * paridad signal) ve mismo contract.
 *
 * **Defense in depth canonical** (TASK-910 demo-prod isolation invariants):
 * - Lee SOLO tabla `task_status_transitions_demo` (via foundation helper demo)
 * - NUNCA toca `task_status_transitions` productive
 * - Persistencia downstream va a `task_rpa_demo_snapshots` (NO `metrics_by_*` productive)
 * - Writeback downstream apunta a property `[GH] RpA v2` del demo teamspace (NO Efeonce/Sky)
 * - `formulaVersion='rpa_v2.0'` mismo enum que productive — distinción es
 *   table source, no formula version (forward-compat para promote demo → prod
 *   sin schema bump)
 *
 * Idempotente (pure read). Re-invocations safe.
 *
 * Cross-refs:
 * - Productive sibling: src/lib/notion-metrics/calculate-rpa-v2.ts
 * - Foundation demo: src/lib/notion-metrics/count-correction-transitions-demo.ts
 * - Consumer reactivo: src/lib/sync/projections/notion-rpa-compute-demo.ts
 */
export const calculateRpaV2Demo = async (inputs: TaskInputsForRpaV2): Promise<RpaV2Result> => {
  const { taskSourceId, windowStart, windowEnd } = inputs

  const transitions = await countCorrectionTransitionsDemo({
    taskSourceId,
    windowStart,
    windowEnd
  })

  if (transitions.sourceMode === 'unavailable') {
    const inputsUsed: RpaV2InputsUsed = {
      taskSourceId,
      correctionTransitionsCount: 0,
      windowStart,
      windowEnd
    }

    return {
      value: null,
      dataStatus: 'unavailable' as RpaV2DataStatus,
      sourceMode: 'unavailable' as RpaV2SourceMode,
      inputsUsed,
      formulaVersion: RPA_FORMULA_VERSION
    }
  }

  const inputsUsed: RpaV2InputsUsed = {
    taskSourceId,
    correctionTransitionsCount: transitions.count,
    windowStart,
    windowEnd
  }

  return {
    value: transitions.count,
    dataStatus: 'valid' as RpaV2DataStatus,
    sourceMode: 'canonical' as RpaV2SourceMode,
    inputsUsed,
    formulaVersion: RPA_FORMULA_VERSION
  }
}
