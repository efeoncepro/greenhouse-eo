import SampleSprintsWorkspace from '@/views/greenhouse/agency/sample-sprints/SampleSprintsWorkspace'

export const dynamic = 'force-dynamic'

const SampleSprintOutcomePage = async ({ params }: { params: Promise<{ serviceId: string }> }) => {
  const { serviceId } = await params

  return <SampleSprintsWorkspace mode='outcome' serviceId={serviceId} />
}

export default SampleSprintOutcomePage
