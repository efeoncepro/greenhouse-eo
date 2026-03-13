'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import { alpha } from '@mui/material/styles'

import { getBrandDisplayLabel, resolveBrandAssets } from './brand-assets'

type BusinessLineBadgeProps = {
  brand: string
  negative?: boolean
}

const BusinessLineBadge = ({ brand, negative = false }: BusinessLineBadgeProps) => {
  const assetEntry = resolveBrandAssets(brand)
  const src = negative ? assetEntry?.negativeWordmarkSrc || assetEntry?.wordmarkSrc : assetEntry?.wordmarkSrc || assetEntry?.negativeWordmarkSrc

  if (!src) {
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
      <Box
        component='img'
        src={src}
        alt={assetEntry?.label || brand}
        sx={{
          display: 'block',
          inlineSize: 'auto',
          blockSize: 18,
          maxInlineSize: 88,
          objectFit: 'contain'
        }}
      />
    </Box>
  )
}

export default BusinessLineBadge
