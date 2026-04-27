'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { getProvider, INSTRUMENT_CATEGORY_COLORS, type InstrumentCategory } from '@/config/payment-instruments'

interface Props {
  providerSlug?: string | null
  instrumentName: string
  instrumentCategory?: InstrumentCategory
  size?: 'sm' | 'md'
  showName?: boolean
}

const PaymentInstrumentChip = ({
  providerSlug,
  instrumentName,
  instrumentCategory,
  size = 'md',
  showName = true
}: Props) => {
  const provider = getProvider(providerSlug)
  const logoHeight = size === 'sm' ? 20 : 28
  const avatarSize = size === 'sm' ? 24 : 32
  const variant = size === 'sm' ? 'body2' : 'body1'
  const categoryColor = instrumentCategory ? INSTRUMENT_CATEGORY_COLORS[instrumentCategory] : 'primary'
  const logoSrc = size === 'sm' ? provider?.compactLogo || provider?.logo : provider?.logo

  const initials = instrumentName
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('')

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {logoSrc ? (
        <Box
          component='img'
          src={logoSrc}
          alt={provider?.name ?? instrumentName}
          sx={{
            height: logoHeight,
            maxWidth: size === 'sm' ? 34 : 112,
            width: 'auto',
            objectFit: 'contain',
            flexShrink: 0
          }}
        />
      ) : (
        <Avatar
          sx={{
            width: avatarSize,
            height: avatarSize,
            fontSize: size === 'sm' ? '0.65rem' : '0.75rem',
            bgcolor: `${categoryColor}.lightOpacity`,
            color: `${categoryColor}.main`
          }}
        >
          {initials}
        </Avatar>
      )}
      {showName && (
        <Typography variant={variant} sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
          {instrumentName}
        </Typography>
      )}
    </Box>
  )
}

export default PaymentInstrumentChip
