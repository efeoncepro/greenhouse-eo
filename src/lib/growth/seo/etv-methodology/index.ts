/**
 * TASK-1805 — Punto de entrada del dominio de metodología ETV (módulo puro).
 *
 * Writers: `buildEtvMethodologyRequest` (una vez por request) y persistir el resultado.
 * Readers: `resolveEtvReadMethodology` + `assertSingleEtvMethodology` + `buildEtvMethodologyProvenance`.
 * Evaluador: `./evaluator`.
 */

export * from './contracts'
export * from './families'
export * from './policy'
export * from './provenance'
export * from './evaluator'
