'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import type { NexaPageContextValue } from './suggested-prompts'

// TASK-1078 Tier 1.5 — contexto que la PÁGINA declara para Nexa (nombre real de la entidad
// + familia opcional). El panel flotante lo lee para interpolar los prompts contextuales
// (ej. "Cliente · Sky Airline"). Dos contextos separados: el SETTER es estable (de useState)
// → declararlo desde una página no re-dispara el efecto en loop; el VALUE cambia al setear.

type NexaContextSetter = (context: NexaPageContextValue | null) => void

const NexaSetContext = createContext<NexaContextSetter>(() => {})
const NexaValueContext = createContext<NexaPageContextValue | null>(null)

export const NexaContextProvider = ({ children }: { children: ReactNode }) => {
  const [context, setContext] = useState<NexaPageContextValue | null>(null)

  return (
    <NexaSetContext.Provider value={setContext}>
      <NexaValueContext.Provider value={context}>{children}</NexaValueContext.Provider>
    </NexaSetContext.Provider>
  )
}

/** Lectura (panel flotante): el contexto declarado por la página actual, o null. */
export const useNexaPageContext = (): NexaPageContextValue | null => useContext(NexaValueContext)

/**
 * Declaración (página): setea el contexto de Nexa en mount y lo limpia en unmount. Render
 * declarativo — la página solo hace `<NexaContextScope entityName={cliente.name} />`. No
 * pinta nada. El setter es estable, así que el efecto solo corre si cambia entityName/key.
 */
export const NexaContextScope = ({ entityName, contextKey }: NexaPageContextValue) => {
  const setContext = useContext(NexaSetContext)

  useEffect(() => {
    setContext({ entityName, contextKey })

    return () => setContext(null)
  }, [setContext, entityName, contextKey])

  return null
}
