/**
 * TASK-1846 Slice 1 — registry de consumers del motor de render.
 *
 * El orden importa: Proposal primero preserva el comportamiento histórico (era el único consumer).
 * La cuota por organización y el fairness real entre consumers llegan en el Slice 3; hasta
 * entonces el orden es determinista y declarado, no emergente.
 */

import type { RenderConsumer } from '../consumer-contract'

import { createBrandRenderConsumer } from './brand-render'
import { createInsightsConsumer } from './insights'
import { createProposalConsumer } from './proposal'

export const buildRenderConsumers = (): RenderConsumer[] => [
  createProposalConsumer(),
  createInsightsConsumer(),
  // TASK-1921 — piezas de marca («La órbita» y Glitch). Último: su cola es interna y no compite con entregables de
  // cliente; con su flag OFF el worker ni lo consulta.
  createBrandRenderConsumer()
]

export const findConsumer = (consumers: RenderConsumer[], key: string): RenderConsumer | null =>
  consumers.find(consumer => consumer.key === key) ?? null
