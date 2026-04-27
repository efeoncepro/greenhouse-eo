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

  // Fixed-width logo box keeps the instrument name aligned in a perfect
  // column across rows, regardless of each provider's intrinsic logo aspect
  // ratio. Without it, wider lockups (e.g. Greenhouse, Banco_Santander)
  // visually crowd the name and the column "jumps".
  const logoBoxWidth = size === 'sm' ? 36 : 48
  const avatarSize = size === 'sm' ? 24 : 32
  const variant = size === 'sm' ? 'body2' : 'body1'
  const categoryColor = instrumentCategory ? INSTRUMENT_CATEGORY_COLORS[instrumentCategory] : 'primary'

  // Prefer the compact (isotipo) logo whenever available — purpose-built
  // for tight contexts like list rows and dropdown items. Fall back to the
  // full lockup only when the provider has no compact variant.
  const logoSrc = provider?.compactLogo || provider?.logo

  const initials = instrumentName
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('')

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        sx={{
          width: logoBoxWidth,
          height: logoHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexShrink: 0
        }}
      >
        {logoSrc ? (
          <Box
            component='img'
            src={logoSrc}
            alt={provider?.name ?? instrumentName}
            sx={{
              maxHeight: logoHeight,
              maxWidth: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain'
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
      </Box>
      {showName && (
        <Typography variant={variant} sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
          {instrumentName}
        </Typography>
      )}
    </Box>
  )
}

export default PaymentInstrumentChip
