import { requireServerSession } from '@/lib/auth/require-server-session'

import NexaLaneSidecarMockupView from '@/views/greenhouse/nexa/lane-sidecar/mockup/NexaLaneSidecarMockupView'

export const dynamic = 'force-dynamic'

// Mockup TASK-1079 — Nexa interaction-mode, concepto C (lane sidecar full-height).
// Ruta real del portal con runtime mock; sin datos productivos. El lane usa
// AdaptiveSidecarLayout (in-flow, reflow del shell, mobile Drawer) hospedando el
// cuerpo assistant de Nexa (presencia + rail + thread + composer).
const NexaLaneSidecarMockupPage = async () => {
  await requireServerSession()

  return <NexaLaneSidecarMockupView />
}

export default NexaLaneSidecarMockupPage
