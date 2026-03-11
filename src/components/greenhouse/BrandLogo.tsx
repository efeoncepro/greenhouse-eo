'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

type BrandLogoProps = {
  brand: string
  size?: number
}

type BrandRegistryEntry = {
  iconClassName?: string
  fallbackIconClassName?: string
}

const normalizeBrand = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const brandRegistry: Record<string, BrandRegistryEntry> = {
  figma: { iconClassName: 'logos-figma', fallbackIconClassName: 'tabler-brand-figma' },
  'frame io': { fallbackIconClassName: 'tabler-frame' },
  frameio: { fallbackIconClassName: 'tabler-frame' },
  notion: { iconClassName: 'logos-notion-icon', fallbackIconClassName: 'tabler-brand-notion' },
  github: { iconClassName: 'logos-github-icon', fallbackIconClassName: 'tabler-brand-github' },
  vercel: { iconClassName: 'logos-vercel-icon', fallbackIconClassName: 'tabler-brand-vercel' },
  hubspot: { iconClassName: 'logos-hubspot' },
  'looker studio': { iconClassName: 'logos-looker-icon' },
  looker: { iconClassName: 'logos-looker-icon' },
  chatgpt: { iconClassName: 'logos-openai-icon', fallbackIconClassName: 'tabler-brand-openai' },
  openai: { iconClassName: 'logos-openai-icon', fallbackIconClassName: 'tabler-brand-openai' },
  'github copilot': { iconClassName: 'logos-github-copilot', fallbackIconClassName: 'tabler-brand-github-copilot' },
  copilot: { iconClassName: 'logos-github-copilot', fallbackIconClassName: 'tabler-brand-github-copilot' },
  gemini: { iconClassName: 'logos-google-gemini' },
  'google gemini': { iconClassName: 'logos-google-gemini' },
  miro: { iconClassName: 'logos-miro-icon' },
  framer: { iconClassName: 'logos-framer', fallbackIconClassName: 'tabler-brand-framer' },
  'adobe firefly': { fallbackIconClassName: 'tabler-brand-adobe' },
  firefly: { fallbackIconClassName: 'tabler-brand-adobe' },
  adobe: { fallbackIconClassName: 'tabler-brand-adobe' }
}

const resolveBrandEntry = (brand: string) => {
  const normalizedBrand = normalizeBrand(brand)

  if (brandRegistry[normalizedBrand]) {
    return brandRegistry[normalizedBrand]
  }

  return Object.entries(brandRegistry).find(([key]) => normalizedBrand.includes(key))?.[1] || null
}

const getMonogram = (brand: string) =>
  normalizeBrand(brand)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || '?'

const BrandLogo = ({ brand, size = 40 }: BrandLogoProps) => {
  const entry = resolveBrandEntry(brand)
  const iconSize = Math.round(size * 0.52)

  return (
    <Box
      component='span'
      aria-hidden='true'
      sx={{
        inlineSize: size,
        blockSize: size,
        borderRadius: 2.5,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: theme => `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
        bgcolor: theme => alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.04 : 0.72),
        boxShadow: theme => `0 10px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.22 : 0.08)}`,
        color: 'text.primary',
        '& i': {
          fontSize: iconSize,
          lineHeight: 1,
          display: 'inline-flex'
        }
      }}
    >
      {entry?.iconClassName ? (
        <i className={entry.iconClassName} />
      ) : entry?.fallbackIconClassName ? (
        <i className={entry.fallbackIconClassName} />
      ) : (
        <Typography variant='caption' sx={{ fontWeight: 700, letterSpacing: 0.6 }}>
          {getMonogram(brand)}
        </Typography>
      )}
    </Box>
  )
}

export default BrandLogo
