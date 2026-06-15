import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'

import { hasAnyAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { NexaContextScope } from '@/lib/nexa/nexa-page-context'

export default async function MyLayout({ children }: { children: ReactNode }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAnyAuthorizedViewCode({
    tenant,
    viewCodes: [
      'mi_ficha.mi_inicio',
      'mi_ficha.mis_asignaciones',
      'mi_ficha.mi_desempeno',
      'mi_ficha.mi_delivery',
      'mi_ficha.mi_perfil',
      'mi_ficha.mi_nomina',
      'mi_ficha.mis_permisos',
      'mi_ficha.mis_objetivos',
      'mi_ficha.mis_evaluaciones',
      'mi_ficha.mi_organizacion'
    ],
    fallback: tenant.routeGroups.includes('my')
  })

  if (!hasAccess) {
    redirect('/401')
  }

  // TASK-1141 — declara el contexto `personal` para Nexa (el chat flotante global lo lee → prompts
  // data-aware de los pendientes del propio colaborador). El `entityId` es el memberId de sesión;
  // el resolver server-side igual usa `subject.memberId` (anti-oracle). Sin memberId → Tier 1/1.5.
  return (
    <>
      {tenant.memberId ? (
        <NexaContextScope entityKind='member' entityId={tenant.memberId} contextKey='personal' />
      ) : null}
      {children}
    </>
  )
}
