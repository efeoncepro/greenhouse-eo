import ServiceDetailView from '@/views/greenhouse/agency/services/ServiceDetailView'

export const dynamic = 'force-dynamic'

const ServiceDetailPage = async ({ params }: { params: Promise<{ serviceId: string }> }) => {
  const { serviceId } = await params

  return <ServiceDetailView serviceId={serviceId} />
}

export default ServiceDetailPage
