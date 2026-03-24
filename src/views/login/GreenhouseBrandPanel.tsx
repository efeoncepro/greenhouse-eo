import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_MESSAGES, GH_COLORS } from '@/config/greenhouse-nomenclature'

import LoginValueCard from './LoginValueCard'
import { LOGIN_VALUE_CARDS, DECORATIVE_CIRCLES } from './login-constants'

const GreenhouseBrandPanel = () => {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: GH_COLORS.brand.midnightNavy,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        p: { md: 6, lg: 8 }
      }}
    >
      {/* Decorative circles — placeholders for future 3D elements */}
      {DECORATIVE_CIRCLES.map((circle, i) => (
        <Box
          key={i}
          aria-hidden='true'
          sx={{
            position: 'absolute',
            borderRadius: '50%',
            border: `1px solid ${circle.borderColor}`,
            background: 'transparent',
            pointerEvents: 'none',
            width: circle.width,
            height: circle.height,
            top: circle.top,
            right: circle.right,
            bottom: circle.bottom
          }}
        />
      ))}

      {/* Content container — centered, constrained width for readability */}
      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480 }}>
        {/* Logo row */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 6 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '10px',
              bgcolor: GH_COLORS.brand.greenhouseGreen,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Box
              component='img'
              src='/images/greenhouse/SVG/negative-isotipo.svg'
              alt='Greenhouse'
              sx={{ width: 28, height: 28 }}
            />
          </Box>
          <Box
            component='img'
            src='/images/greenhouse/SVG/negative-sin-claim.svg'
            alt='Greenhouse logotipo'
            sx={{ height: 26, ml: 1.5 }}
          />
        </Box>

        {/* Hero copy */}
        <Typography
          sx={{
            fontSize: { md: 28, lg: 32 },
            fontWeight: 600,
            color: '#fff',
            lineHeight: 1.3,
            mb: 2,
            whiteSpace: 'pre-line'
          }}
        >
          {GH_MESSAGES.login_hero_title}
        </Typography>
        <Typography sx={{ fontSize: 15, color: 'rgba(255,255,255, 0.55)', mb: 5, maxWidth: 380 }}>
          {GH_MESSAGES.login_hero_subtitle}
        </Typography>

        {/* Value proposition cards */}
        <Stack spacing={1.5}>
          {LOGIN_VALUE_CARDS.map((card, i) => (
            <LoginValueCard key={i} data={card} />
          ))}
        </Stack>
      </Box>

      {/* Footer */}
      <Typography
        sx={{
          position: 'absolute',
          bottom: { md: 28, lg: 36 },
          fontSize: 11,
          color: 'rgba(255,255,255, 0.35)'
        }}
      >
        {GH_MESSAGES.login_footer}
      </Typography>
    </Box>
  )
}

export default GreenhouseBrandPanel
