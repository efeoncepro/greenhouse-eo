import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import GreenhouseReviewQueue from '@/views/greenhouse/GreenhouseReviewQueue'
import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = {
  title: 'Revisiones | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  // TASK-827 Slice 4 — Page guard canonical resolver-based.
  // TASK-1679 Slice 6 — el viewCode canónico de /reviews es `cliente.reviews`.
  //
  // Acá pedía `cliente.revisiones`, y el módulo que gobierna esta superficie
  // (`creative_hub_globe_v1`) declara `cliente.reviews`: dos strings distintos para la misma
  // ruta, así que la página no podía abrir ni con la llave de organización correcta. Se
  // unifica en el que declara el módulo, porque cambiar dos referencias en código es más
  // barato que cambiar el dato sembrado. `cliente.revisiones` queda marcado como retirado en
  // el registry — append-only: se marca, no se borra.
  await requireViewCodeAccess('cliente.reviews')

  return <GreenhouseReviewQueue />
}

export default Page
