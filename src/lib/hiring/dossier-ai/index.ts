// TASK-1735 — Expediente de Evaluación SMART: barrel del carril dossier-ai.
// propose → confirm → execute: el LLM propone (propose.ts), el humano confirma
// (confirm.ts) y la nota se materializa vía recordHiringApplicationNote.

export * from './config'
export * from './packet'
export * from './generate'
export * from './store'
export * from './propose'
export * from './confirm'
export type * from '@/types/hiring-dossier-ai'
