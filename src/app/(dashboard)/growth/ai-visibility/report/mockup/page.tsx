import type { Metadata } from 'next'

import { SAMPLE_CLIENT_REPORT } from '@/components/growth/ai-visibility/report-artifact/fixtures'
import { modelFromClientReport } from '@/components/growth/ai-visibility/report-artifact/model'
import AiVisibilityClientReportView from '@/views/greenhouse/growth/ai-visibility/client/AiVisibilityClientReportView'

// TASK-1248 — AI Visibility client report (Split Workbench) GVC harness.
// Mockup route — excluded from route-reachability; alimenta el workbench con el MISMO fixture canónico
// (`SAMPLE_CLIENT_REPORT` → `modelFromClientReport`) que verifica el report-artifact, sin depender de data
// por-org (la ruta real /growth/ai-visibility/report es client-scoped y muestra empty sin un grader run).

export const metadata: Metadata = {
  title: 'Visibilidad en IA — mockup'
}

const model = modelFromClientReport(SAMPLE_CLIENT_REPORT)

const Page = () => (
  <AiVisibilityClientReportView model={model} organizationName='Efeonce (mock)' asOfLabel='2026-06-24' />
)

export default Page
