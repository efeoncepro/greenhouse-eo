import type { Metadata } from 'next'
import MyAssignmentsView from '@/views/greenhouse/my/MyAssignmentsView'
export const metadata: Metadata = { title: 'Mis Asignaciones | Greenhouse' }
export const dynamic = 'force-dynamic'
const Page = () => <MyAssignmentsView />
export default Page
