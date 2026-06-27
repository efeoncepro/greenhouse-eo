import type { Metadata } from 'next'

import ReportArtifactMockupView from '@views/greenhouse/growth/ai-visibility/report-artifact/mockup/ReportArtifactMockupView'

// AI Visibility Report Artifact mockup harness (TASK-1252).
// 5-level framework spine over the approved visual contract.
// Mockup route — excluded from route-reachability; GVC harness only.

export const metadata: Metadata = {
  title: 'Informe de visibilidad en IA — mockup'
}

const Page = () => <ReportArtifactMockupView />

export default Page
