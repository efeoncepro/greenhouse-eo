import 'server-only'

import { createHash } from 'crypto'

import type {
  AssessmentAccessRecoveryChannel,
  AssessmentAccessRecoveryReason,
} from './vocabulary'

/**
 * TASK-1746/1747 — mitad SERVER de la recuperación de acceso: lo que necesita `node:crypto`.
 *
 * El vocabulario (canales, motivos, desenlaces, cuotas, elegibilidad) vive en `./vocabulary`, que
 * es isomorfo y sí puede importar el navegador. Se re-exporta acá para que los consumidores
 * server-side sigan teniendo un solo punto de entrada.
 */

export * from './vocabulary'

export const digestAssessmentRecoveryIdempotencyKey = (idempotencyKey: string): string =>
  createHash('sha256').update(`assessment-access-recovery:v1:${idempotencyKey}`).digest('hex')

/** Fingerprint binds a key to its immutable semantic request without storing sensitive input. */
export const fingerprintAssessmentRecoveryRequest = (input: {
  assessmentId: string
  channel: AssessmentAccessRecoveryChannel
  reasonCode: AssessmentAccessRecoveryReason
}): string =>
  createHash('sha256')
    .update(`assessment-access-recovery-request:v1:${input.assessmentId}:${input.channel}:${input.reasonCode}`)
    .digest('hex')
