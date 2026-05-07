import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CommercialIntelligenceView from '@views/greenhouse/finance/CommercialIntelligenceView'
import { ROLE_CODES } from '@/config/role-codes'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pipeline comercial — Greenhouse'
}

const CommercialPipelinePage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasCommercialFallback =
    tenant.routeGroups.includes('commercial') ||
    tenant.routeGroups.includes('finance') ||
    tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)

  const hasCommercialAccess =
    hasAuthorizedViewCode({
      tenant,
      viewCode: 'comercial.pipeline',
      fallback: false
    }) || hasCommercialFallback

  const hasLegacyFinanceAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'finanzas.inteligencia',
    fallback: false
  })

  if (!hasCommercialAccess && !hasLegacyFinanceAccess) {
    redirect(tenant.portalHomePath)
  }

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant='h5' sx={{ fontWeight: 500 }}>
          Pipeline comercial
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Forecast comercial de deals, contratos standalone y pre-sales. No representa revenue reconocido.
        </Typography>
      </Box>

      <CommercialIntelligenceView />
    </Stack>
  )
}

export default CommercialPipelinePage
