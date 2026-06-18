'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { isNexaFloatingExpandableEnabled, isNexaInteractionLaneEnabled } from './flags'
import {
  availableNexaInteractionModes,
  type NexaInteractionMode,
  type NexaInteractionModeAvailability
} from './interaction-mode'

/**
 * TASK-1079 — contexto client del modo de interacción con Nexa.
 *
 * El modo efectivo se resuelve server-side (`resolveNexaInteractionModeForUser`) y se
 * pasa como `initialMode`. El provider mantiene el estado optimista + persiste el
 * cambio vía `PATCH /api/home/preferences`. Lo consumen el flotante (se oculta en
 * `lane`), el lane host (envuelve el contenido en `lane`) y el selector de modo.
 *
 * La disponibilidad se lee de los flags (NEXT_PUBLIC mirrors) en el cliente, idéntica
 * a la del server → cero drift de gating.
 */

interface NexaInteractionModeContextValue {
  mode: NexaInteractionMode
  availability: NexaInteractionModeAvailability
  availableModes: NexaInteractionMode[]
  setMode: (mode: NexaInteractionMode) => void
  // Estado de apertura del lane (modo C). En modo lane, la burbuja flotante actúa como
  // toggle de este estado (abrir/contraer el lane) en vez de abrir el panel flotante.
  laneOpen: boolean
  setLaneOpen: (open: boolean) => void
}

const NexaInteractionModeContext = createContext<NexaInteractionModeContextValue | null>(null)

export const NexaInteractionModeProvider = ({
  initialMode,
  children
}: {
  initialMode: NexaInteractionMode
  children: ReactNode
}) => {
  const [mode, setModeState] = useState<NexaInteractionMode>(initialMode)
  // El lane arranca abierto si el modo inicial ya es lane (workspace persistente).
  const [laneOpen, setLaneOpen] = useState<boolean>(initialMode === 'lane')

  const availability = useMemo<NexaInteractionModeAvailability>(
    () => ({ expandableEnabled: isNexaFloatingExpandableEnabled(), laneEnabled: isNexaInteractionLaneEnabled() }),
    []
  )

  const availableModes = useMemo(() => availableNexaInteractionModes(availability), [availability])

  const setMode = useCallback(
    (next: NexaInteractionMode) => {
      // Optimista: la UI cambia de inmediato; la persistencia es best-effort. Si el
      // PATCH falla, la preferencia visible se mantiene (degradación honesta) y se
      // reconcilia en el próximo render server-side.
      setModeState(next)

      // Al entrar a lane, abrirlo; al salir, el estado de lane deja de aplicar.
      if (next === 'lane') setLaneOpen(true)

      void fetch('/api/home/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nexaInteractionMode: next })
      }).catch(() => {
        // Silencioso: el modo sigue aplicado en esta sesión; el servidor es la SSOT
        // en el próximo load.
      })
    },
    []
  )

  const value = useMemo<NexaInteractionModeContextValue>(
    () => ({ mode, availability, availableModes, setMode, laneOpen, setLaneOpen }),
    [mode, availability, availableModes, setMode, laneOpen]
  )

  return <NexaInteractionModeContext.Provider value={value}>{children}</NexaInteractionModeContext.Provider>
}

/**
 * Lectura segura del modo. Fuera del provider devuelve un fallback inerte (`dock`
 * sin acciones) → un consumer montado fuera del dashboard no rompe.
 */
export const useNexaInteractionMode = (): NexaInteractionModeContextValue => {
  const ctx = useContext(NexaInteractionModeContext)

  if (!ctx) {
    return {
      mode: 'dock',
      availability: { expandableEnabled: false, laneEnabled: false },
      availableModes: ['dock'],
      setMode: () => {},
      laneOpen: false,
      setLaneOpen: () => {}
    }
  }

  return ctx
}
