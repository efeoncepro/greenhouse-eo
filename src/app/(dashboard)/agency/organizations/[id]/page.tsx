import OrganizationView from '@views/greenhouse/organizations/OrganizationView'

export const dynamic = 'force-dynamic'

const OrganizationDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return <OrganizationView organizationId={id} />
}

export default OrganizationDetailPage
