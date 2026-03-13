'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import { alpha } from '@mui/material/styles'

import BrandWordmark from './BrandWordmark'
import { getBrandDisplayLabel, resolveBrandAssets } from './brand-assets'

type BusinessLineBadgeProps = {
  brand: string
  negative?: boolean
  height?: number
}

const BusinessLineBadge = ({ brand, negative = false, height = 18 }: BusinessLineBadgeProps) => {
  const assetEntry = resolveBrandAssets(brand)

  if (!assetEntry?.wordmarkSrc && !assetEntry?.negativeWordmarkSrc) {
    return <Chip size='small' variant='outlined' label={getBrandDisplayLabel(brand)} />
  }

  return (
    <Box
      component='span'
      sx={theme => ({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 32,
        px: 1.4,
        borderRadius: 999,
        border: `1px solid ${negative ? alpha(theme.palette.common.white, 0.22) : theme.palette.divider}`,
        bgcolor: negative ? alpha(theme.palette.common.white, 0.12) : alpha(theme.palette.background.paper, 0.82),
        backdropFilter: negative ? 'blur(10px)' : 'blur(6px)'
      })}
    >
      <BrandWordmark brand={brand} negative={negative} height={height} maxWidth={88} />
    </Box>
  )
}

export default BusinessLineBadge
