'use client'

import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'

import { getBrandDisplayLabel, resolveBrandAssets } from './brand-assets'

type BrandWordmarkProps = {
  brand: string
  negative?: boolean
  height?: number
  maxWidth?: number
  sx?: SxProps<Theme>
  imgSx?: SxProps<Theme>
}

const BrandWordmark = ({
  brand,
  negative = false,
  height = 18,
  maxWidth = 120,
  sx,
  imgSx
}: BrandWordmarkProps) => {
  const assetEntry = resolveBrandAssets(brand)
  const src = negative ? assetEntry?.negativeWordmarkSrc || assetEntry?.wordmarkSrc : assetEntry?.wordmarkSrc || assetEntry?.negativeWordmarkSrc

  if (!src) {
    return (
      <Box component='span' sx={[{ display: 'inline-flex', alignItems: 'center' }, ...(Array.isArray(sx) ? sx : [sx])]}>
        {getBrandDisplayLabel(brand)}
      </Box>
    )
  }

  return (
    <Box component='span' sx={[{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <Box
        component='img'
        src={src}
        alt={assetEntry?.label || brand}
        sx={[
          {
            display: 'block',
            inlineSize: 'auto',
            blockSize: height,
            maxInlineSize: maxWidth,
            objectFit: 'contain'
          },
          ...(Array.isArray(imgSx) ? imgSx : [imgSx])
        ]}
      />
    </Box>
  )
}

export default BrandWordmark
