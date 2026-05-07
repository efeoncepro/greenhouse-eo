'use client'

import { useState } from 'react'

import { getMicrocopy } from '@/lib/copy'
import styles from './styles.module.css'
import { formatDate as formatGreenhouseDate } from '@/lib/format'

const GREENHOUSE_COPY = getMicrocopy()

interface Props {
  acceptUrl: string
  shortCode: string | null
  initialAcceptedAt: string | null
  initialAcceptedByName: string | null
}

type AcceptState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'accepted'; acceptedByName: string; acceptedAt: string }
  | { kind: 'error'; message: string }

const formatDate = (iso: string): string => {
  return formatGreenhouseDate(new Date(iso), {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}, 'es-CL')
}

/**
 * TASK-631 Fase 2 — Client island for the Accept button.
 *
 * Pure DOM + fetch — no MUI to keep public-page bundle small.
 * Renders 3 states:
 * - idle: "Aceptar propuesta" button → opens inline form
 * - accepted: green confirmation card with name + timestamp
 * - error: inline error message + retry
 *
 * On submit:
 * - button-loading state with spinner
 * - POST /api/public/quote/[id]/[v]/[token]/accept
 * - on success: replace button with confirmation, status badge
 *   in header reflects the change after page refresh
 */
export const PublicQuoteAcceptForm = ({
  acceptUrl,
  shortCode,
  initialAcceptedAt,
  initialAcceptedByName
}: Props) => {
  const initialState: AcceptState =
    initialAcceptedAt && initialAcceptedByName
      ? { kind: 'accepted', acceptedByName: initialAcceptedByName, acceptedAt: initialAcceptedAt }
      : { kind: 'idle' }

  const [state, setState] = useState<AcceptState>(initialState)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!name.trim()) return

    setState({ kind: 'submitting' })

    try {
      const res = await fetch(acceptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptedByName: name.trim(),
          acceptedByRole: role.trim() || undefined,
          shortCode: shortCode ?? undefined
        })
      })

      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 409) {
          setState({
            kind: 'error',
            message:
              body.message
              || 'Hay una versión más reciente de esta cotización. Solicita el link actualizado a tu account lead.'
          })
          
return
        }

        throw new Error(body.error || `HTTP ${res.status}`)
      }

      setState({
        kind: 'accepted',
        acceptedByName: body.acceptedByName ?? name.trim(),
        acceptedAt: body.acceptedAt
      })
    } catch (err) {
      setState({
        kind: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'No pudimos registrar tu aceptación. Intenta nuevamente o contacta a tu account lead.'
      })
    }
  }

  if (state.kind === 'accepted') {
    return (
      <div className={styles.acceptedCard}>
        <span className={styles.acceptedIcon} aria-hidden='true'>✓</span>
        <div>
          <p className={styles.acceptedTitle}>Propuesta aceptada</p>
          <p className={styles.acceptedDetail}>
            Por <strong>{state.acceptedByName}</strong> el {formatDate(state.acceptedAt)}.
            <br />
            Tu account lead recibirá una notificación y se pondrá en contacto para el siguiente paso.
          </p>
        </div>
      </div>
    )
  }

  if (!showForm) {
    return (
      <button
        type='button'
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={() => setShowForm(true)}
      >
        ✓ Aceptar propuesta
      </button>
    )
  }

  return (
    <form className={styles.acceptForm} onSubmit={handleSubmit}>
      <div className={styles.acceptFormHeader}>
        <p className={styles.acceptFormTitle}>Confirma tu aceptación</p>
        <p className={styles.acceptFormSubtitle}>
          Tus datos quedan registrados como confirmación de aceptación comercial.
          El contrato formal se firma por separado.
        </p>
      </div>
      <label className={styles.acceptField}>
        <span>Nombre completo *</span>
        <input
          type='text'
          required
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={state.kind === 'submitting'}
          placeholder='Ej. María Elena Vargas'
          autoComplete='name'
        />
      </label>
      <label className={styles.acceptField}>
        <span>Cargo (opcional)</span>
        <input
          type='text'
          value={role}
          onChange={e => setRole(e.target.value)}
          disabled={state.kind === 'submitting'}
          placeholder='Ej. CMO'
        />
      </label>
      {state.kind === 'error' ? (
        <div className={styles.acceptError} role='alert'>
          {state.message}
        </div>
      ) : null}
      <div className={styles.acceptFormActions}>
        <button
          type='button'
          className={`${styles.btn} ${styles.btnOutlined}`}
          onClick={() => setShowForm(false)}
          disabled={state.kind === 'submitting'}
        >{GREENHOUSE_COPY.actions.cancel}</button>
        <button
          type='submit'
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={state.kind === 'submitting' || !name.trim()}
        >
          {state.kind === 'submitting' ? (
            <>
              <span className={styles.spinner} aria-hidden='true' />
              Aceptando...
            </>
          ) : (
            <>✓ Confirmar aceptación</>
          )}
        </button>
      </div>
    </form>
  )
}
