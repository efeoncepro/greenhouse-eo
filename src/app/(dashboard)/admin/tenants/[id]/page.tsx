import { notFound } from 'next/navigation'

import GreenhouseAdminTenantDetail from '@views/greenhouse/GreenhouseAdminTenantDetail'

import { getAdminTenantDetail } from '@/lib/admin/get-admin-tenant-detail'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getAdminTenantDetail(id)

  if (!data) {
    notFound()
  }

  return <GreenhouseAdminTenantDetail data={data} />
}
