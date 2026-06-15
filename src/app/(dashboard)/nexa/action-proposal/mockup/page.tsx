import { requireServerSession } from '@/lib/auth/require-server-session'

import NexaActionProposalMockupView from '@/views/greenhouse/nexa/action-proposal/mockup/NexaActionProposalMockupView'

export const dynamic = 'force-dynamic'

// Mockup TASK-1137 — confirm-card de acción gobernada en el chat. Ruta real del portal con datos
// mock; sin efecto productivo. Sirve para el GVC determinístico de la tarjeta.
const NexaActionProposalMockupPage = async () => {
  await requireServerSession()

  return <NexaActionProposalMockupView />
}

export default NexaActionProposalMockupPage
