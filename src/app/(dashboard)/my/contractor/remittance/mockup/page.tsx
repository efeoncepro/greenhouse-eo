import type { Metadata } from 'next'

import RemittanceAdviceMockupView from '@/views/greenhouse/contractors/mockup/RemittanceAdviceMockupView'

export const metadata: Metadata = { title: 'Mockup comprobante de pago contractor | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = () => <RemittanceAdviceMockupView />

export default Page
