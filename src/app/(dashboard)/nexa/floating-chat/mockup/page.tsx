import { requireServerSession } from '@/lib/auth/require-server-session'

import NexaFloatingChatMockupView from '@/views/greenhouse/nexa/floating-chat/mockup/NexaFloatingChatMockupView'

export const dynamic = 'force-dynamic'

// Mockup TASK-1078 — Nexa floating chat, concepto B (panel expandible).
// Ruta real del portal con runtime mock; sin datos productivos.
const NexaFloatingChatMockupPage = async () => {
  await requireServerSession()

  return <NexaFloatingChatMockupView />
}

export default NexaFloatingChatMockupPage
