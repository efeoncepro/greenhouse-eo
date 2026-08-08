import { requireServerSession } from '@/lib/auth/require-server-session'
import { SEO_CLIENT_MOCK_SURFACE } from '@/lib/growth/seo/client/mock-surface'
import SeoClientDashboardView from '@/views/greenhouse/growth/seo/client/SeoClientDashboardView'

/** TASK-1310 — authenticated visual QA harness; it never replaces the gated runtime route. */
export default async function SeoClientMockupPage() {
  await requireServerSession()

  return (
    <SeoClientDashboardView
      organizationName='Grupo Berel · Visual QA'
      surface={SEO_CLIENT_MOCK_SURFACE}
    />
  )
}
