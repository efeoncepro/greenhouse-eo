import GreenhouseSprintDetail from '@views/greenhouse/GreenhouseSprintDetail'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <GreenhouseSprintDetail sprintId={id} />
}
