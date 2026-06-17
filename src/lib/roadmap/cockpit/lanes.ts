/**
 * TASK-1153 — Asignación de lane + normalización de prioridad (pura, testeable).
 *
 * Cada work item cae en EXACTAMENTE una de las 7 lanes del board, derivada de su
 * kind + lifecycle + bloqueo + salud. Determinístico (sin fechas, sin azar).
 */
import type { WorkItem } from '@/lib/roadmap/work-item-index/types'

import type { RoadmapLaneId, RoadmapPriority } from './types'

/** Extrae `P0`..`P3` del campo Priority del front-matter. */
export const normalizePriority = (raw: string | null): RoadmapPriority => {
  if (!raw) return null

  const match = raw.toUpperCase().match(/\bP([0-3])\b/)

  if (!match) return null

  return `P${match[1]}` as RoadmapPriority
}

/**
 * Lane canónica del item. Prioridad de reglas (la primera que matchea gana):
 * - epic → programs (o done si completado): un epic es un contenedor de programa,
 *   nunca trabajo ejecutable suelto.
 * - issue → issues (o done si resuelto): incidente reactivo, no task ejecutable.
 * - task/mini: complete → done · in-progress → progress · bloqueada → blocked ·
 *   con findings de salud → grooming · si no → ready.
 *
 * `hasOpenBlocker` (opcional): una task está «bloqueada» SOLO si su bloqueador
 * sigue abierto. Si no se pasa, se deriva de `blockedBy.length > 0` (un bloqueador
 * ya cerrado no debería dejar la task en «Bloqueadas» — la projection lo resuelve).
 */
export const assignLane = (item: WorkItem, opts?: { hasOpenBlocker?: boolean }): RoadmapLaneId => {
  if (item.kind === 'epic') {
    return item.lifecycle === 'complete' ? 'done' : 'programs'
  }

  if (item.kind === 'issue') {
    return item.lifecycle === 'resolved' ? 'done' : 'issues'
  }

  // task / mini_task
  if (item.lifecycle === 'complete') return 'done'
  if (item.lifecycle === 'in-progress') return 'progress'

  const isBlocked = opts?.hasOpenBlocker ?? item.blockedBy.length > 0

  if (isBlocked) return 'blocked'
  if (item.health.level !== 'ok') return 'grooming'

  return 'ready'
}

/** Una lane es «activa» (backlog vivo) si no es la de resueltas. */
export const isActiveLane = (lane: RoadmapLaneId): boolean => lane !== 'done'
