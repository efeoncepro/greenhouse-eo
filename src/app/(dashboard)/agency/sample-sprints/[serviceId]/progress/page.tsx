import SampleSprintsWorkspace from '@/views/greenhouse/agency/sample-sprints/SampleSprintsWorkspace'

export const dynamic = 'force-dynamic'

const SampleSprintProgressPage = async ({ params }: { params: Promise<{ serviceId: string }> }) => {
  const { serviceId } = await params

  return <SampleSprintsWorkspace mode='progress' serviceId={serviceId} />
}

export default SampleSprintProgressPage
