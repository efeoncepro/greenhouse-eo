// TASK-990 — MXN multi-currency finance core. Money primitives + FX snapshot
// evidence + canonical 3-plane snapshot + feature flags. Slice 1 (flags off).
// Schema (fx_snapshots table, columns) + write-path wiring are later slices.

export * from './flags'
export * from './money'
export * from './fx-snapshot'
export * from './canonical-money-snapshot'
