'use client'

import { useRef } from 'react'

import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { AssessmentAccessRecoveryAvailability } from '@/lib/hiring/assessment/access-recovery/vocabulary'
import type { HiringDeskCopy } from '@/lib/copy/types'
import { GreenhouseButton } from '@/components/greenhouse/primitives'

type RecoveryCopy = HiringDeskCopy['application']['accessRecovery']

/**
 * TASK-1747 — cluster de recuperación de acceso en la tarjeta del test.
 *
 * Reemplaza al enlace que Application 360 mostraba en claro: ese enlace era el mismo que el correo
 * al candidato rotaba minutos después, así que la pantalla entregaba una credencial ya muerta
 * (incidente del 2026-08-19). Acá no se muestra ninguna credencial: se ofrece la ACCIÓN.
 */

/**
 * Un test cancelado cae en `status_not_allowed` igual que uno ya rendido, pero el remedio es
 * distinto y es accionable: reasignar. Colapsar ambos en "el test ya se rindió" le mentiría al
 * operador sobre un caso que sí tiene salida.
 */
export const resolveRecoveryUnavailableMessage = (
  availability: AssessmentAccessRecoveryAvailability,
  copy: RecoveryCopy,
): string | null => {
  if (availability.eligible) return null

  const code = availability.eligibilityCode

  if (code === 'assessment_recovery_status_not_allowed' && availability.status === 'cancelled') {
    return copy.unavailable.assessment_recovery_status_cancelled
  }

  if (code && code in copy.unavailable) {
    return copy.unavailable[code as keyof RecoveryCopy['unavailable']]
  }

  return copy.errorGeneric
}

/**
 * La elegibilidad se computó con el motivo POR DEFECTO, y hay un caso donde el motivo cambia la
 * respuesta: sólo `token_expired_before_start` puede probar que el acceso caducó antes de que la
 * persona empezara. Por eso `expiry_not_proven` NO cierra la puerta — el operador puede declarar
 * ese motivo en el diálogo y el servidor vuelve a decidir. El copy ya se lo explica.
 */
const isReasonDependentBlock = (availability: AssessmentAccessRecoveryAvailability) =>
  availability.eligibilityCode === 'assessment_recovery_expiry_not_proven'

interface Props {
  availability: AssessmentAccessRecoveryAvailability
  copy: RecoveryCopy
  canRecoverByEmail: boolean
  canRevealLink: boolean
  onOpen: (trigger: HTMLButtonElement | null) => void
}

export const AssessmentRecoveryCluster = ({
  availability,
  copy,
  canRecoverByEmail,
  canRevealLink,
  onOpen,
}: Props) => {
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const unavailableMessage = resolveRecoveryUnavailableMessage(availability, copy)
  const reasonDependent = isReasonDependentBlock(availability)

  // Puerta abierta = tiene la capability Y el canal está disponible. Son cosas distintas: sin
  // correo registrado la puerta del correo está cerrada aunque el permiso exista.
  const emailOpen = canRecoverByEmail && availability.channels.email.available
  const linkOpen = canRevealLink && availability.channels.secureLink.available
  const anyChannelOpen = emailOpen || linkOpen

  const remaining = Math.max(0, availability.rateLimit.maxPer24Hours - availability.rateLimit.usedIn24Hours)

  const quotaMessage = availability.rateLimit.limited
    ? linkOpen
      ? copy.quotaExhaustedEmail.replace('{max}', String(availability.rateLimit.maxPer24Hours))
      : copy.quotaExhaustedAll
    : copy.quotaRemainingEmail
        .replace('{remaining}', String(remaining))
        .replace('{max}', String(availability.rateLimit.maxPer24Hours))

  if (unavailableMessage && !reasonDependent) {
    return (
      <Alert severity='info' icon={<i className='tabler-lock' />}>
        <Typography fontWeight={700} variant='body2'>{copy.unavailableTitle}</Typography>
        <Typography variant='body2'>{unavailableMessage}</Typography>
      </Alert>
    )
  }

  // Sin ninguna puerta abierta no se dibuja el CTA, pero SÍ se dice por qué: un botón ausente y sin
  // explicación deja al operador creyendo que el camino no existe.
  if (!anyChannelOpen) {
    return (
      <Alert severity='info' icon={<i className='tabler-lock' />}>
        <Typography variant='body2'>
          {availability.rateLimit.limited
            ? copy.quotaExhaustedAll
            : availability.channels.email.hasCandidateEmail
              ? copy.errorPermission
              : copy.emailMissing}
        </Typography>
      </Alert>
    )
  }

  return (
    <Stack spacing={1.25}>
      {reasonDependent && unavailableMessage ? (
        <Alert severity='warning'>{unavailableMessage}</Alert>
      ) : null}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <GreenhouseButton
          kind='secondaryAction'
          leadingIconClassName='tabler-key'
          ref={triggerRef}
          onClick={() => onOpen(triggerRef.current)}
        >
          {copy.cta}
        </GreenhouseButton>
        <Typography color='text.secondary' variant='caption'>{quotaMessage}</Typography>
      </Stack>
    </Stack>
  )
}

export default AssessmentRecoveryCluster
