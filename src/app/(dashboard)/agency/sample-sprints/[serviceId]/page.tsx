import SampleSprintsWorkspace from '@/views/greenhouse/agency/sample-sprints/SampleSprintsWorkspace'

export const dynamic = 'force-dynamic'

const SampleSprintDetailPage = async ({ params }: { params: Promise<{ serviceId: string }> }) => {
  const { serviceId } = await params

  return <SampleSprintsWorkspace mode='detail' serviceId={serviceId} />
}

export default SampleSprintDetailPage
