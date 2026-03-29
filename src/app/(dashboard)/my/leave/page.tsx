import type { Metadata } from 'next'

import MyLeaveView from '@/views/greenhouse/my/MyLeaveView'

export const metadata: Metadata = { title: 'Mis Permisos | Greenhouse' }
export const dynamic = 'force-dynamic'
const Page = () => <MyLeaveView />

export default Page
