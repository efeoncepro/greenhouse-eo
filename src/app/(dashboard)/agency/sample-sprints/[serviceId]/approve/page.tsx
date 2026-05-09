import SampleSprintsWorkspace from '@/views/greenhouse/agency/sample-sprints/SampleSprintsWorkspace'

export const dynamic = 'force-dynamic'

const SampleSprintApprovePage = async ({ params }: { params: Promise<{ serviceId: string }> }) => {
  const { serviceId } = await params

  return <SampleSprintsWorkspace mode='approve' serviceId={serviceId} />
}

export default SampleSprintApprovePage
