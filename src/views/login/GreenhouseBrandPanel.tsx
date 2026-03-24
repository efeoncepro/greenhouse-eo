import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_MESSAGES, GH_COLORS } from '@/config/greenhouse-nomenclature'

import LoginValueCard from './LoginValueCard'
import { LOGIN_VALUE_CARDS } from './login-constants'

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
      {/* Radial glow — adds depth behind content */}
      <Box
        aria-hidden='true'
        sx={{
          position: 'absolute',
          width: '130%',
          height: '130%',
          top: '-15%',
          left: '-15%',
          background: 'radial-gradient(ellipse at 30% 50%, rgba(27,122,78, 0.12) 0%, transparent 60%)',
          pointerEvents: 'none'
        }}
      />

      {/* Secondary glow — top right accent */}
      <Box
        aria-hidden='true'
        sx={{
          position: 'absolute',
          width: '80%',
          height: '80%',
          top: '-20%',
          right: '-20%',
          background: 'radial-gradient(ellipse at 70% 30%, rgba(3,117,219, 0.08) 0%, transparent 55%)',
          pointerEvents: 'none'
        }}
      />

      {/* Brand arrow — large watermark, top right */}
      <Box
        component='img'
        src='/images/greenhouse/SVG/arrow-greenhouse.svg'
        alt=''
        aria-hidden='true'
        sx={{
          position: 'absolute',
          top: '-2%',
          right: '2%',
          width: { md: 300, lg: 380 },
          height: 'auto',
          opacity: 0.1,
          pointerEvents: 'none'
        }}
      />

      {/* Brand arrow — smaller accent, bottom left, rotated */}
      <Box
        component='img'
        src='/images/greenhouse/SVG/arrow-greenhouse.svg'
        alt=''
        aria-hidden='true'
        sx={{
          position: 'absolute',
          bottom: '5%',
          left: '-2%',
          width: { md: 160, lg: 200 },
          height: 'auto',
          opacity: 0.06,
          transform: 'rotate(180deg)',
          pointerEvents: 'none'
        }}
      />

      {/* Content container — centered, constrained width */}
      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 500 }}>
        {/* Logo row */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: { md: 6, lg: 8 } }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '10px',
              bgcolor: GH_COLORS.brand.greenhouseGreen,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 20px rgba(27,122,78, 0.3)'
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
            sx={{ height: 28, ml: 1.5 }}
          />
        </Box>

        {/* Hero copy */}
        <Typography
          sx={{
            fontSize: { md: 32, lg: 38 },
            fontWeight: 600,
            color: '#fff',
            lineHeight: 1.2,
            mb: 2.5,
            whiteSpace: 'pre-line',
            letterSpacing: '-0.02em'
          }}
        >
          {GH_MESSAGES.login_hero_title}
        </Typography>

        {/* Gradient accent line */}
        <Box
          aria-hidden='true'
          sx={{
            width: 64,
            height: 3,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${GH_COLORS.brand.greenhouseGreen}, ${GH_COLORS.brand.coreBlue})`,
            mb: 2.5
          }}
        />

        {/* Subtitle with inline Efeonce logo */}
        <Typography
          component='p'
          sx={{ fontSize: 15, color: 'rgba(255,255,255, 0.5)', mb: 6, lineHeight: 1.7 }}
        >
          {'La plataforma de '}
          <Box
            component='img'
            src='/branding/logo-negative.svg'
            alt='Efeonce'
            sx={{
              height: 12,
              display: 'inline',
              verticalAlign: 'middle',
              opacity: 0.5,
              mx: 0.5
            }}
          />
          {' donde todo se conecta y todo se mide.'}
        </Typography>

        {/* Value proposition cards */}
        <Stack spacing={1.5}>
          {LOGIN_VALUE_CARDS.map((card, i) => (
            <LoginValueCard key={i} data={card} />
          ))}
        </Stack>
      </Box>

      {/* Right edge glow — depth at panel boundary */}
      <Box
        aria-hidden='true'
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 120,
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(3,117,219, 0.06))',
          pointerEvents: 'none'
        }}
      />

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
