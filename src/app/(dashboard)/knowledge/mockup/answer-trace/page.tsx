import { requireServerSession } from '@/lib/auth/require-server-session'

import KnowledgeAnswerTraceMockupView from '@/views/greenhouse/knowledge/mockup/answer-trace/KnowledgeAnswerTraceMockupView'

export const dynamic = 'force-dynamic'

const KnowledgeAnswerTraceMockupPage = async () => {
  await requireServerSession()

  return <KnowledgeAnswerTraceMockupView />
}

export default KnowledgeAnswerTraceMockupPage
