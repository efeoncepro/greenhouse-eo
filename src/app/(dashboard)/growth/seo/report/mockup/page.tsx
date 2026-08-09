import { modelFromSeoReport } from '@/components/growth/seo/report-artifact/model'
import { SeoReportArtifact, SeoReportPrint } from '@/components/growth/seo/report-artifact'
import { requireServerSession } from '@/lib/auth/require-server-session'
import { SEO_CLIENT_MOCK_SURFACE } from '@/lib/growth/seo/client/mock-surface'

interface PageProps {
  searchParams: Promise<{ print?: string }>
}

/** TASK-1310 — authenticated visual QA harness for the Trust Report Artifact. */
export default async function SeoReportMockupPage({ searchParams }: PageProps) {
  await requireServerSession()

  const model = modelFromSeoReport({
    organizationName: 'Grupo Berel · Visual QA',
    seoTargetId: SEO_CLIENT_MOCK_SURFACE.seoTargetId ?? 'seot-task-1310-visual-qa',
    asOfDate: SEO_CLIENT_MOCK_SURFACE.connection.dataAsOf,
    rankEvolution: SEO_CLIENT_MOCK_SURFACE.rankEvolution?.ok ? SEO_CLIENT_MOCK_SURFACE.rankEvolution : null,
    gap: SEO_CLIENT_MOCK_SURFACE.gap?.ok ? SEO_CLIENT_MOCK_SURFACE.gap : null
  }, 'clientPortal')

  const params = await searchParams

  return params.print === '1' ? <SeoReportPrint model={model} /> : <SeoReportArtifact model={model} />
}
