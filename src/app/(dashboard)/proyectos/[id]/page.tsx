import GreenhouseProjectDetail from '@views/greenhouse/GreenhouseProjectDetail'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <GreenhouseProjectDetail projectId={id} />
}
