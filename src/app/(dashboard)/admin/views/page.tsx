import type { Metadata } from 'next'

import AdminViewAccessGovernanceView from '@/views/greenhouse/admin/AdminViewAccessGovernanceView'
import { getAdminViewAccessGovernance } from '@/lib/admin/get-admin-view-access-governance'

export const metadata: Metadata = {
  title: 'Vistas y acceso | Admin Center | Greenhouse'
}

export default async function Page() {
  const data = await getAdminViewAccessGovernance()

  return <AdminViewAccessGovernanceView data={data} />
}
