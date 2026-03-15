import { notFound } from 'next/navigation'

import GreenhouseAdminUserDetail from '@views/greenhouse/GreenhouseAdminUserDetail'

import { getAdminUserDetail } from '@/lib/admin/get-admin-user-detail'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // id can be EO-ID (e.g. EO-ID0001), userId, or memberId — all resolve via person_360
  const data = await getAdminUserDetail(id)

  if (!data) {
    notFound()
  }

  return <GreenhouseAdminUserDetail data={data} />
}
