'use client'

import type { ReactNode } from 'react'

import { AdaptiveSidecarLayout } from '@/components/greenhouse/primitives'
import { useNexaInteractionMode } from '@/lib/nexa/nexa-interaction-mode-context'
import NexaLanePanel from '@/views/greenhouse/nexa/lane-sidecar/NexaLanePanel'

/**
 * TASK-1079 — host del modo lane (concepto C). Envuelve el contenido del dashboard.
 *
 * - Modo != `lane` (o lane no disponible) → passthrough byte-idéntico: NO monta nada,
 *   el dashboard se renderiza exactamente como hoy (default-safe).
 * - Modo `lane` → envuelve el contenido en `AdaptiveSidecarLayout` (in-flow, reflow
 *   del shell, `role=complementary`; desktop lane / mobile Drawer) con `NexaLanePanel`
 *   como sidecar. El contenido reflowea (split) y queda 100% visible al lado.
 *
 * La burbuja flotante (`NexaFloatingButton`) se oculta en modo lane y actúa como
 * toggle de `laneOpen`.
 */
const NexaLaneContentHost = ({ children }: { children: ReactNode }) => {
  const { mode, availability, laneOpen, setLaneOpen } = useNexaInteractionMode()

  if (mode !== 'lane' || !availability.laneEnabled) {
    return <>{children}</>
  }

  return (
    <AdaptiveSidecarLayout
      open={laneOpen}
      onOpenChange={setLaneOpen}
      kind='assistant'
      preferredMode='push'
      side='right'
      sidecarWidth={520}
      sidecarMinWidth={440}
      sidecarMaxWidth={660}
      sidecarExtent='viewport'
      viewportShellReflow='greenhouse-vertical-navbar'
      mainMinWidth={520}
      temporaryPlacement='right'
      dataCapture='nexa-lane-content-host'
      source='nexa-interaction-mode-lane'
      sidecar={<NexaLanePanel onCollapse={() => setLaneOpen(false)} />}
    >
      {children}
    </AdaptiveSidecarLayout>
  )
}

export default NexaLaneContentHost
