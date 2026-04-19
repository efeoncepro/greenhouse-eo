'use client'

import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import PricingCatalogNavCard from '@/components/greenhouse/pricing/PricingCatalogNavCard'
import { GH_PRICING } from '@/config/greenhouse-nomenclature'

export interface PricingCatalogCounts {
  roles: number
  tools: number
  overheads: number
  tiers: number
  commercialModels: number
  countryFactors: number
  fteHours: number
  employmentTypes: number
}

interface Props {
  counts: PricingCatalogCounts
}

const PricingCatalogHomeView = ({ counts }: Props) => {
  const cards = [
    {
      href: '/admin/pricing-catalog/roles',
      label: GH_PRICING.adminRoles,
      count: counts.roles,
      icon: 'tabler-briefcase',
      color: 'primary' as const,
      description: 'SKU, categoría, tier y tipo de venta'
    },
    {
      href: '/admin/pricing-catalog/tools',
      label: GH_PRICING.adminTools,
      count: counts.tools,
      icon: 'tabler-tools',
      color: 'info' as const,
      description: 'Licencias, suscripciones y proveedores'
    },
    {
      href: '/admin/pricing-catalog/overheads',
      label: GH_PRICING.adminOverhead,
      count: counts.overheads,
      icon: 'tabler-receipt',
      color: 'warning' as const,
      description: 'Fees, fondos y cargos adicionales'
    },
    {
      href: '/admin/pricing-catalog/governance',
      label: 'Gobierno de márgenes',
      count: counts.tiers,
      icon: 'tabler-scale',
      color: 'success' as const,
      description: 'Tiers de rol, servicio y multiplicadores'
    },
    {
      href: '/admin/pricing-catalog/employment-types',
      label: GH_PRICING.adminEmploymentTypes,
      count: counts.employmentTypes,
      icon: 'tabler-contract',
      color: 'primary' as const,
      description: 'Modalidades de contrato, moneda y fees por país'
    },
    {
      href: '/admin/pricing-catalog/governance',
      label: GH_PRICING.adminCountryFactors,
      count: counts.countryFactors,
      icon: 'tabler-flag',
      color: 'error' as const,
      description: 'Ajustes de precio por país'
    },
    {
      href: '/admin/pricing-catalog/audit-log',
      label: GH_PRICING.adminAudit,
      count: '—',
      icon: 'tabler-history',
      color: 'info' as const,
      description: 'Línea de tiempo de cambios en el catálogo'
    }
  ]

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4' sx={{ fontWeight: 600 }}>
          {GH_PRICING.adminTitle}
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Roles vendibles, herramientas, overheads y reglas de gobernanza para cotizaciones comerciales.
        </Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Grid container spacing={6}>
          {cards.map(card => (
            <Grid key={card.label} size={{ xs: 12, sm: 6, md: 4 }}>
              <PricingCatalogNavCard
                href={card.href}
                label={card.label}
                count={card.count}
                icon={card.icon}
                color={card.color}
                description={card.description}
              />
            </Grid>
          ))}
        </Grid>
      </Grid>
    </Grid>
  )
}

export default PricingCatalogHomeView
