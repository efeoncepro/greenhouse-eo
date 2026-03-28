import type { Metadata } from 'next'

import MyProfileView from '@/views/greenhouse/my/MyProfileView'

export const metadata: Metadata = { title: 'Mi Perfil | Greenhouse' }
export const dynamic = 'force-dynamic'
const Page = () => <MyProfileView />

export default Page
