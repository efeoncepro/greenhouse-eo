'use client'

import Link from 'next/link'

import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

import type { ThemeColor } from '@core/types'

import CustomAvatar from '@core/components/mui/Avatar'
import { formatInteger } from '@/lib/format'

export interface PricingCatalogNavCardProps {

  /** Ruta destino del catálogo (ej: `/admin/pricing/roles`) */
  href: string

  /** Label del catálogo (ej: "Roles vendibles") */
  label: string

  /** Número de entidades activas (ej: 33). Se formatea como integer. Acepta string para "—" o placeholders. */
  count?: number | string

  /** Icono Tabler (ej: "tabler-briefcase") */
  icon: string

  /** Color del avatar — default `primary` */
  color?: ThemeColor

  /** Descripción corta opcional (una línea) — default undefined */
  description?: string
}

const formatCount = (count: number | string | undefined): string => {
  if (count === undefined) return '—'
  if (typeof count === 'string') return count

  return formatInteger(count)
}

const PricingCatalogNavCard = ({
  href,
  label,
  count,
  icon,
  color = 'primary',
  description
}: PricingCatalogNavCardProps) => {
  const accessibleLabel = count !== undefined ? `${label}, ${formatCount(count)}` : label

  return (
    <Card
      elevation={0}
      sx={theme => ({
        border: `1px solid ${theme.palette.divider}`,
        transition: theme.transitions.create(['border-color', 'box-shadow'], { duration: 150 }),
        '&:hover': {
          borderColor: theme.palette[color].main,
          boxShadow: theme.shadows[2]
        }
      })}
    >
      <CardActionArea
        component={Link}
        href={href}
        aria-label={accessibleLabel}
        sx={{ minHeight: 96, p: 0 }}
      >
        <CardContent
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}>
            <Typography variant='h5'>{formatCount(count)}</Typography>
            <Typography variant='body2'>{label}</Typography>
            {description ? (
              <Typography variant='caption' color='text.secondary'>
                {description}
              </Typography>
            ) : null}
          </Box>
          <CustomAvatar variant='rounded' skin='light' color={color}>
            <i className={icon} aria-hidden='true' />
          </CustomAvatar>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export default PricingCatalogNavCard
