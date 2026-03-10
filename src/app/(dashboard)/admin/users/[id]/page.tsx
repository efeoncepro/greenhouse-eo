import { notFound } from 'next/navigation'

import GreenhouseAdminUserDetail from '@views/greenhouse/GreenhouseAdminUserDetail'

import { getAdminUserDetail } from '@/lib/admin/get-admin-user-detail'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getAdminUserDetail(id)

  if (!data) {
    notFound()
  }

  return <GreenhouseAdminUserDetail data={data} />
}
