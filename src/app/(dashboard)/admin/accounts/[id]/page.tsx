import AdminAccountDetailView from '@/views/greenhouse/admin/accounts/AdminAccountDetailView'

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return <AdminAccountDetailView organizationId={id} />
}

export default Page
