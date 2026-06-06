import type { Metadata } from 'next'

import AdaptiveSidecarPlatformMockupView from '@/views/greenhouse/platform/adaptive-sidecar/mockup/AdaptiveSidecarPlatformMockupView'

export const metadata: Metadata = { title: 'Mockup sidecar adaptativa | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = () => <AdaptiveSidecarPlatformMockupView />

export default Page
