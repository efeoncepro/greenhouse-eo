'use client'

import { useRef } from 'react'

import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type {
  AssessmentAccessRecoveryAvailability,
  AssessmentAccessRecoveryChannelBlock,
} from '@/lib/hiring/assessment/access-recovery/vocabulary'
import type { HiringDeskCopy } from '@/lib/copy/types'
import { GreenhouseButton } from '@/components/greenhouse/primitives'

type RecoveryCopy = HiringDeskCopy['application']['accessRecovery']

/**
 * TASK-1747 — cluster de recuperación de acceso en la tarjeta del test.
 *
 * Reemplaza al enlace que Application 360 mostraba en claro: ese enlace era el mismo que el correo
 * al candidato rotaba minutos después, así que la pantalla entregaba una credencial ya muerta
 * (incidente del 2026-08-19). Acá no se muestra ninguna credencial: se ofrece la ACCIÓN.
 *
 * Regla que este componente existe para sostener: **cada estado bloqueado dice su propia causa**.
 * Un `false` compartido entre "el test no se recupera", "no hay correo", "el proveedor bloquea",
 * "se acabó la cuota" y "espera un minuto" los mandaba a todos al mismo mensaje, y el operador
 * terminaba pidiéndole a Admin un permiso que ya tenía.
 */

/**
 * Un test CANCELADO y uno YA RENDIDO caen en el mismo `eligibilityCode` (`status_not_allowed`),
 * pero el remedio es distinto y es accionable: reasignar. Colapsarlos le mentiría al operador
 * sobre el único de los dos que sí tiene salida.
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

  // `eligible: false` con `eligibilityCode: null` NO es un caso raro: es cuota agotada en los dos
  // canales. Sin esta rama caía al genérico "intenta de nuevo en unos minutos", cuando la espera
  // real es de hasta 24 horas.
  if (code === null) return copy.quotaExhaustedAll

  return copy.errorGeneric
}

const secondsUntil = (iso: string | null): number => {
  if (!iso) return 0

  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000))
}

/** Cada bloqueo de canal con su remedio. Ninguno cae en un mensaje compartido. */
export const resolveChannelBlockMessage = (
  block: AssessmentAccessRecoveryChannelBlock,
  channel: 'email' | 'secure_link',
  availability: AssessmentAccessRecoveryAvailability,
  copy: RecoveryCopy,
): string | null => {
  if (block === 'assessment_not_eligible') return resolveRecoveryUnavailableMessage(availability, copy)
  if (block === 'no_candidate_email') return copy.emailMissing
  if (block === 'provider_blocked') return copy.emailBlocked

  if (block === 'quota_exhausted') {
    return channel === 'email'
      ? copy.quotaExhaustedEmail.replace('{max}', String(availability.rateLimit.maxPer24Hours))
      : copy.quotaExhaustedAll
  }

  const seconds = secondsUntil(
    channel === 'email' ? availability.rateLimit.cooldownUntil : availability.rateLimit.secureLinkCooldownUntil,
  )

  return copy.cooldown.replace('{seconds}', String(seconds))
}

/**
 * La elegibilidad se computó con el motivo POR DEFECTO, y hay un caso donde el motivo cambia la
 * respuesta: sólo `token_expired_before_start` puede probar que el acceso caducó antes de que la
 * persona empezara — que es exactamente el caso del incidente que originó esta task. Por eso
 * `expiry_not_proven` NO cierra la puerta: el operador declara ese motivo en el diálogo y el
 * servidor vuelve a decidir. El copy ya se lo explica.
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

  const reasonDependent = isReasonDependentBlock(availability)
  const emailBlock = availability.channels.email.blockedBy
  const linkBlock = availability.channels.secureLink.blockedBy

  // Puerta abierta = tiene el permiso Y el canal está disponible. Con el bloqueo reason-dependent
  // el canal figura cerrado porque la elegibilidad se computó con otro motivo: ahí la puerta la
  // decide el permiso, y el servidor confirma o rechaza cuando el operador declare el motivo real.
  const emailOpen = canRecoverByEmail && (availability.channels.email.available || (reasonDependent && emailBlock === 'assessment_not_eligible'))
  const linkOpen = canRevealLink && (availability.channels.secureLink.available || (reasonDependent && linkBlock === 'assessment_not_eligible'))

  // El test entero no se recupera y el motivo no lo cambia: no hay acción que ofrecer.
  if (emailBlock === 'assessment_not_eligible' && linkBlock === 'assessment_not_eligible' && !reasonDependent) {
    return (
      <Alert severity='info' icon={<i className='tabler-lock' />}>
        <Typography fontWeight={700} variant='body2'>{copy.unavailableTitle}</Typography>
        <Typography variant='body2'>{resolveRecoveryUnavailableMessage(availability, copy)}</Typography>
      </Alert>
    )
  }

  // Ningún canal abierto. Decir POR CUÁL de las causas, y distinguir el permiso que falta del
  // canal que está cerrado: mandar a pedir permiso a quien ya lo tiene es el peor de los dos.
  if (!emailOpen && !linkOpen) {
    const blockedByCapability =
      (!canRecoverByEmail && emailBlock === null) || (!canRevealLink && linkBlock === null)

    const message = blockedByCapability
      ? copy.errorPermission
      : [
          emailBlock && canRecoverByEmail ? resolveChannelBlockMessage(emailBlock, 'email', availability, copy) : null,
          linkBlock && canRevealLink ? resolveChannelBlockMessage(linkBlock, 'secure_link', availability, copy) : null,
        ].filter(Boolean).join(' ') || copy.errorPermission

    return (
      <Alert severity='info' icon={<i className='tabler-lock' />}>
        <Typography fontWeight={700} variant='body2'>{copy.unavailableTitle}</Typography>
        <Typography variant='body2'>{message}</Typography>
      </Alert>
    )
  }

  const remaining = Math.max(0, availability.rateLimit.maxPer24Hours - availability.rateLimit.usedIn24Hours)

  // Advertencias del canal que SÍ importan aunque haya otro abierto: si el buzón está bloqueado,
  // el operador tiene que saberlo ANTES de gastar un intento averiguándolo.
  const warnings = [
    emailOpen || !canRecoverByEmail || !emailBlock || emailBlock === 'assessment_not_eligible'
      ? null
      : resolveChannelBlockMessage(emailBlock, 'email', availability, copy),
    reasonDependent ? resolveRecoveryUnavailableMessage(availability, copy) : null,
  ].filter((entry): entry is string => Boolean(entry))

  return (
    <Stack spacing={1.25}>
      {warnings.map((warning) => (
        <Alert key={warning} severity='warning'>{warning}</Alert>
      ))}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <GreenhouseButton
          kind='secondaryAction'
          leadingIconClassName='tabler-key'
          ref={triggerRef}
          onClick={() => onOpen(triggerRef.current)}
        >
          {copy.cta}
        </GreenhouseButton>
        <Typography color='text.secondary' variant='caption'>
          {copy.quotaRemainingEmail
            .replace('{remaining}', String(remaining))
            .replace('{max}', String(availability.rateLimit.maxPer24Hours))}
        </Typography>
      </Stack>
    </Stack>
  )
}

export default AssessmentRecoveryCluster
