'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'

const BRAND_LOGO_BLUE = '#023C70'
const BRAND_ACTION_BLUE = '#024C8F'
const BRAND_SUPPORT_TINT = '#E8F1F8'
const BRAND_GREEN_VIVID = '#6EC207'
const BRAND_GREEN_INK = '#3E7A12'
const BRAND_ORANGE = '#FF6500'

const BRAND_COLOR_ALTERNATIVES = [
  {
    name: 'A. Brand spine + governed vivid green',
    verdict: 'Recomendada',
    base: BRAND_LOGO_BLUE,
    action: BRAND_ACTION_BLUE,
    support: BRAND_SUPPORT_TINT,
    greenAccent: BRAND_GREEN_VIVID,
    greenInk: BRAND_GREEN_INK,
    orangeAccent: BRAND_ORANGE,
    summary: 'El azul gobierna identidad y accion; el verde vivo vuelve como acento gobernado, no como secondary.',
    usage:
      'Usar el vivid green en highlights y tints; usar green ink para texto/iconos. Nunca como success ni CTA default.'
  },
  {
    name: 'B. Brand spine + muted green',
    verdict: 'Mas sobria',
    base: BRAND_LOGO_BLUE,
    action: BRAND_ACTION_BLUE,
    support: BRAND_SUPPORT_TINT,
    greenAccent: '#3E7A12',
    greenInk: '#27500A',
    orangeAccent: BRAND_ORANGE,
    summary: 'Baja aun mas la saturacion del verde; gana calma, pero puede sentirse menos Greenhouse.',
    usage:
      'Buena si incluso el verde actual se siente demasiado protagonista.'
  },
  {
    name: 'C. Brand spine + operational green',
    verdict: 'Mas funcional',
    base: BRAND_LOGO_BLUE,
    action: BRAND_ACTION_BLUE,
    support: BRAND_SUPPORT_TINT,
    greenAccent: '#138760',
    greenInk: '#0C563D',
    orangeAccent: BRAND_ORANGE,
    summary: 'Mantiene el mismo verde recomendado, pero evalua una lectura mas funcional que identitaria.',
    usage:
      'Util si priorizamos contraste y separacion con success, pero baja la energia distintiva del logo.'
  }
] as const

const DRAFT_BRAND_ACCENT_RAMP = {
  100: '#FFE0CC',
  200: '#FFC199',
  300: '#FFA266',
  400: '#FF8333',
  500: BRAND_ORANGE,
  600: '#E65B00',
  700: '#BF4C00',
  800: '#993D00',
  900: '#662900'
} as const

const RAMP_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const

type DraftColorRamp = Readonly<Record<(typeof RAMP_STEPS)[number], string>>

const PROPOSED_BRAND_BASE_RAMP = {
  100: '#CCDEEA',
  200: '#99BCD5',
  300: '#669BC0',
  400: '#3379AA',
  500: BRAND_LOGO_BLUE,
  600: '#023766',
  700: '#022F58',
  800: '#012747',
  900: '#011A30'
} as const satisfies DraftColorRamp

const PROPOSED_ACTION_BLUE_RAMP = {
  100: '#CDE4F4',
  200: '#9BC8E9',
  300: '#68ADDD',
  400: '#3591D2',
  500: BRAND_ACTION_BLUE,
  600: '#02447F',
  700: '#013A6D',
  800: '#012F58',
  900: '#011E38'
} as const satisfies DraftColorRamp

const PROPOSED_SUPPORT_RAMP = {
  100: '#F6FAFD',
  200: '#E8F1F8',
  300: '#D7E8F3',
  400: '#C2D9EA',
  500: '#A8C6DD',
  600: '#83A9C4',
  700: '#6389A4',
  800: '#466980',
  900: '#304A5A'
} as const satisfies DraftColorRamp

const PROPOSED_GREEN_ACCENT_RAMP = {
  100: '#F5FBEA',
  200: '#EAF7D6',
  300: '#DDF3BC',
  400: '#C8EA92',
  500: BRAND_GREEN_VIVID,
  600: '#5FAE0D',
  700: '#4F8F14',
  800: BRAND_GREEN_INK,
  900: '#27500A'
} as const satisfies DraftColorRamp

const PROPOSED_INFO_RAMP = {
  100: '#D7EAF2',
  200: '#AFD5E5',
  300: '#87BFD7',
  400: '#5FAAC4',
  500: '#256B8F',
  600: '#205F7F',
  700: '#1A516D',
  800: '#144059',
  900: '#0D2A3A'
} as const satisfies DraftColorRamp

const PROPOSED_SUCCESS_RAMP = {
  100: '#D6EADF',
  200: '#ADD5BF',
  300: '#84BF9F',
  400: '#5BAA7F',
  500: '#1F7A4D',
  600: '#1B6E45',
  700: '#17603C',
  800: '#124C30',
  900: '#0B3220'
} as const satisfies DraftColorRamp

const PROPOSED_WARNING_RAMP = {
  100: '#F4E3CC',
  200: '#E9C799',
  300: '#DDAA66',
  400: '#D28E33',
  500: '#A86400',
  600: '#975A00',
  700: '#824D00',
  800: '#663D00',
  900: '#442900'
} as const satisfies DraftColorRamp

const PROPOSED_ERROR_RAMP = {
  100: '#F0D3D4',
  200: '#E1A7AA',
  300: '#D27B7F',
  400: '#C44F55',
  500: '#B4232A',
  600: '#A11F26',
  700: '#8B1B21',
  800: '#6E151A',
  900: '#491014'
} as const satisfies DraftColorRamp

const PROPOSED_COLOR_SHEETS = [
  {
    title: 'Brand base',
    role: 'brand.primary.base',
    anchor: '500',
    ramp: PROPOSED_BRAND_BASE_RAMP,
    usage: 'Identidad, shell, navegacion, headers brand y superficies institucionales.'
  },
  {
    title: 'Primary action',
    role: 'brand.primary.action',
    anchor: '500',
    ramp: PROPOSED_ACTION_BLUE_RAMP,
    usage: 'CTA principal, links accionables, estados activos y foco de decision.'
  },
  {
    title: 'UI support',
    role: 'ui.support.tonal',
    anchor: '200',
    ramp: PROPOSED_SUPPORT_RAMP,
    usage: 'Secondary visual tonal: fondos suaves, botones secundarios y selected surfaces.'
  },
  {
    title: 'Brand green',
    role: 'brand.accent.green',
    anchor: '500 vivid / 800 ink',
    ramp: PROPOSED_GREEN_ACCENT_RAMP,
    usage: 'Acento vivo de marca. 500 para highlights/tints; 800 para texto/iconos. No secondary, no success.'
  },
  {
    title: 'Orange accent',
    role: 'brand.accent.orange',
    anchor: '500',
    ramp: DRAFT_BRAND_ACCENT_RAMP,
    usage: 'Acento puntual de marca/AXIS. No warning, no CTA default.'
  }
] as const

const channel = (c: number) => {
  const s = c / 255

  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

const luminance = (hex: string) => {
  const h = hex.replace('#', '').slice(0, 6)
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

const contrast = (a: string, b: string) => {
  const la = luminance(a)
  const lb = luminance(b)

  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const ratio = (value: number) => `${value.toFixed(2)}:1`

type RoleCardProps = {
  title: string
  value: string
  description: string
  usage: string
  color: string
  textColor?: string
}

const RoleCard = ({ title, value, description, usage, color, textColor }: RoleCardProps) => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={theme => ({
          bgcolor: color,
          color: textColor ?? theme.palette.getContrastText(color),
          minBlockSize: theme.spacing(16),
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          p: 3,
          display: 'flex',
          alignItems: 'flex-end'
        })}
      >
        <Typography variant='monoId'>{value}</Typography>
      </Box>
      <Box>
        <Typography variant='h6'>{title}</Typography>
        <Typography variant='body2' color='text.secondary'>
          {description}
        </Typography>
      </Box>
      <Typography variant='caption' color='text.secondary'>
        {usage}
      </Typography>
    </CardContent>
  </Card>
)

const ColorSample = ({ label, color }: { label: string; color: string }) => {
  const theme = useTheme()
  const onWhite = contrast(color, theme.axis.neutral.light.bgWhite)
  const withInk = contrast(color, theme.axis.neutral.light.textPrimary)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box
        sx={theme => ({
          bgcolor: color,
          minBlockSize: theme.spacing(9),
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          border: `1px solid ${theme.palette.divider}`
        })}
      />
      <Typography variant='h6'>{label}</Typography>
      <Typography variant='monoAmount' color='text.primary'>
        {color}
      </Typography>
      <Typography variant='caption' color='text.secondary'>
        blanco {ratio(onWhite)} · ink {ratio(withInk)}
      </Typography>
    </Box>
  )
}

const AlternativeCard = ({ alternative, recommended = false }: { alternative: (typeof BRAND_COLOR_ALTERNATIVES)[number]; recommended?: boolean }) => {
  const theme = useTheme()

  return (
    <Card
      variant='outlined'
      sx={{
        borderColor: recommended ? BRAND_LOGO_BLUE : theme.palette.divider,
        boxShadow: recommended ? theme.greenhouseElevation?.raised : 'none'
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
          <Box>
            <Typography variant='overline' color='text.secondary'>
              Alternativa
            </Typography>
            <Typography variant='h5'>{alternative.name}</Typography>
          </Box>
          <Chip
            label={alternative.verdict}
            sx={{
              bgcolor: recommended ? '#EAF7D6' : theme.palette.action.hover,
              color: recommended ? BRAND_LOGO_BLUE : theme.palette.text.secondary
            }}
          />
        </Box>
        <Typography variant='body2' color='text.secondary'>
          {alternative.summary}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(6, minmax(0, 1fr))' },
            gap: 1.5
          }}
        >
          <ColorSample label='Base' color={alternative.base} />
          <ColorSample label='Action' color={alternative.action} />
          <ColorSample label='Support' color={alternative.support} />
          <ColorSample label='Green vivid' color={alternative.greenAccent} />
          <ColorSample label='Green ink' color={alternative.greenInk} />
          <ColorSample label='Orange accent' color={alternative.orangeAccent} />
        </Box>
        <Typography variant='caption' color='text.secondary'>
          {alternative.usage}
        </Typography>
      </CardContent>
    </Card>
  )
}

const BrandAlternatives = () => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant='h5'>Alternativas de paleta</Typography>
        <Typography variant='body2' color='text.secondary'>
          Exploracion visual, todavia sin tokenizar. La decision clave es si el azul del logo pasa a ser la raiz de
          identidad, si #024C8F toma las acciones y si el verde vivo queda como acento gobernado, no como secondary.
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
        {BRAND_COLOR_ALTERNATIVES.map((alternative, index) => (
          <AlternativeCard key={alternative.name} alternative={alternative} recommended={index === 0} />
        ))}
      </Box>
    </CardContent>
  </Card>
)

const ColorRampRow = ({ ramp }: { ramp: DraftColorRamp }) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', md: 'repeat(9, minmax(0, 1fr))' },
        gap: 1
      }}
    >
      {RAMP_STEPS.map(step => {
        const hex = ramp[step]
        const onWhite = contrast(hex, theme.axis.neutral.light.bgWhite)
        const withInk = contrast(hex, theme.axis.neutral.light.textPrimary)

        return (
          <Box key={step} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Box
              sx={theme => ({
                bgcolor: hex,
                minBlockSize: theme.spacing(10),
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                border: `1px solid ${theme.palette.divider}`
              })}
            />
            <Typography variant='monoId'>{step}</Typography>
            <Typography variant='monoAmount' color='text.secondary'>
              {hex}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              w {ratio(onWhite)} · ink {ratio(withInk)}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}

const ColorSheetCard = ({ sheet }: { sheet: (typeof PROPOSED_COLOR_SHEETS)[number] }) => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
        <Box>
          <Typography variant='overline' color='text.secondary'>
            {sheet.role}
          </Typography>
          <Typography variant='h5'>{sheet.title}</Typography>
        </Box>
        <Chip label={`anchor ${sheet.anchor}`} variant='outlined' />
      </Box>
      <Typography variant='body2' color='text.secondary'>
        {sheet.usage}
      </Typography>
      <ColorRampRow ramp={sheet.ramp} />
    </CardContent>
  </Card>
)

const SemanticFeedbackSheet = () => {
  const theme = useTheme()

  const feedback = [
    {
      title: 'Info',
      role: 'feedback.info',
      anchor: '500',
      ramp: PROPOSED_INFO_RAMP,
      usage: 'Azul petróleo para información. Acompaña primary sin parecer otro CTA ni cyan de template.'
    },
    {
      title: 'Success',
      role: 'feedback.success',
      anchor: '500',
      ramp: PROPOSED_SUCCESS_RAMP,
      usage: 'Verde éxito profundo. Se separa del green vivid de marca y mantiene lectura operacional.'
    },
    {
      title: 'Warning',
      role: 'feedback.warning',
      anchor: '500',
      ramp: PROPOSED_WARNING_RAMP,
      usage: 'Ámbar serio para atención. No compite con orange accent ni grita como amarillo demo.'
    },
    {
      title: 'Error',
      role: 'feedback.error',
      anchor: '500',
      ramp: PROPOSED_ERROR_RAMP,
      usage: 'Rojo adulto para error o bloqueo. Más institucional que coral, con contraste AA sobre blanco.'
    }
  ] as const

  return (
    <Card variant='outlined'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant='h5'>Feedback semántico propuesto</Typography>
          <Typography variant='body2' color='text.secondary'>
            Estados operativos que cumplen su propósito sin competir con la personalidad de marca. La semántica queda
            más sobria y menos Vuexy/demo.
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          {feedback.map(item => (
            <Box
              key={item.role}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                p: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: `${theme.shape.customBorderRadius.lg}px`
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant='overline' color='text.secondary'>
                    {item.role}
                  </Typography>
                  <Typography variant='h6'>{item.title}</Typography>
                </Box>
                <Chip label={`anchor ${item.anchor}`} size='small' />
              </Box>
              <Typography variant='caption' color='text.secondary'>
                {item.usage}
              </Typography>
              <ColorRampRow ramp={item.ramp} />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  )
}

const DesignSystemColorSheet = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <Card variant='outlined'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant='overline' color='text.secondary'>
          Design system sheet
        </Typography>
        <Typography variant='h4'>Hoja de color propuesta</Typography>
        <Typography variant='body2' color='text.secondary'>
          Simulación de cómo quedaría documentado el sistema: familias, ramps, anchors y separación entre marca, UI
          tonal y feedback semántico.
        </Typography>
      </CardContent>
    </Card>
    {PROPOSED_COLOR_SHEETS.map(sheet => (
      <ColorSheetCard key={sheet.role} sheet={sheet} />
    ))}
    <SemanticFeedbackSheet />
  </Box>
)

const DraftRamp = () => {
  const theme = useTheme()

  return (
    <Card variant='outlined'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant='h5'>Ramp propuesta</Typography>
          <Typography variant='body2' color='text.secondary'>
            Anchor 500 es el naranja real de marca. Los pasos oscuros gobiernan texto sobre blanco; los pasos claros
            quedan para tints y fondos suaves.
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', md: 'repeat(9, minmax(0, 1fr))' },
            gap: 1
          }}
        >
          {RAMP_STEPS.map(step => {
            const hex = DRAFT_BRAND_ACCENT_RAMP[step]
            const onWhite = contrast(hex, theme.axis.neutral.light.bgWhite)
            const withInk = contrast(hex, theme.axis.neutral.light.textPrimary)

            return (
              <Box key={step} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  aria-label={`tertiary-orange-${step} ${hex}`}
                  sx={theme => ({
                    bgcolor: hex,
                    minBlockSize: theme.spacing(15),
                    borderRadius: `${theme.shape.customBorderRadius.md}px`,
                    border: `1px solid ${theme.palette.divider}`
                  })}
                />
                <Typography variant='monoId' color='text.primary'>
                  {step}
                </Typography>
                <Typography variant='monoAmount' color='text.secondary'>
                  {hex}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  blanco {ratio(onWhite)} · ink {ratio(withInk)}
                </Typography>
              </Box>
            )
          })}
        </Box>
      </CardContent>
    </Card>
  )
}

const ApplicationExamples = () => {
  const theme = useTheme()
  const recommended = BRAND_COLOR_ALTERNATIVES[0]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.1fr 0.9fr' }, gap: 3 }}>
      <Card variant='outlined'>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant='h5'>Aplicación en producto</Typography>
            <Typography variant='body2' color='text.secondary'>
              Ejemplo con la alternativa A: el azul del logo sostiene la identidad, #024C8F gobierna la accion, el
              secondary es tonal y el verde vivo queda como acento de marca con ink separado.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant='contained'
              sx={{
                bgcolor: recommended.action,
                '&:hover': {
                  bgcolor: recommended.base
                }
              }}
              startIcon={<i className='tabler-check' />}
            >
              Confirmar operación
            </Button>
            <Button
              variant='tonal'
              sx={{
                color: recommended.action,
                bgcolor: recommended.support,
                '&:hover': {
                  bgcolor: '#D7E8F3'
                }
              }}
              startIcon={<i className='tabler-arrow-right' />}
            >
              Acción secundaria
            </Button>
            <Button
              variant='outlined'
              sx={{
                color: DRAFT_BRAND_ACCENT_RAMP[700],
                borderColor: DRAFT_BRAND_ACCENT_RAMP[700],
                '&:hover': {
                  borderColor: DRAFT_BRAND_ACCENT_RAMP[800],
                  bgcolor: DRAFT_BRAND_ACCENT_RAMP[100]
                }
              }}
              startIcon={<i className='tabler-sparkles' />}
            >
              Highlight de marca
            </Button>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label='Healthy'
              icon={<i className='tabler-circle-check' />}
              sx={{ bgcolor: PROPOSED_SUCCESS_RAMP[100], color: PROPOSED_SUCCESS_RAMP[700], borderColor: PROPOSED_SUCCESS_RAMP[300] }}
              variant='outlined'
            />
            <Chip
              label='Atención'
              icon={<i className='tabler-alert-triangle' />}
              sx={{ bgcolor: PROPOSED_WARNING_RAMP[100], color: PROPOSED_WARNING_RAMP[700], borderColor: PROPOSED_WARNING_RAMP[300] }}
              variant='outlined'
            />
            <Chip
              label='Bloqueado'
              icon={<i className='tabler-circle-x' />}
              sx={{ bgcolor: PROPOSED_ERROR_RAMP[100], color: PROPOSED_ERROR_RAMP[700], borderColor: PROPOSED_ERROR_RAMP[300] }}
              variant='outlined'
            />
            <Chip
              label='Informativo'
              icon={<i className='tabler-info-circle' />}
              sx={{ bgcolor: PROPOSED_INFO_RAMP[100], color: PROPOSED_INFO_RAMP[700], borderColor: PROPOSED_INFO_RAMP[300] }}
              variant='outlined'
            />
            <Chip
              label='Marca green vivid'
              icon={<i className='tabler-leaf' />}
              sx={{
                bgcolor: '#EAF7D6',
                color: recommended.base,
                borderColor: '#C8EA92'
              }}
              variant='outlined'
            />
            <Chip
              label='Green ink'
              icon={<i className='tabler-pencil' />}
              sx={{
                bgcolor: '#F5FBEA',
                color: recommended.greenInk,
                borderColor: '#C8EA92'
              }}
              variant='outlined'
            />
            <Chip
              label='Marca orange'
              icon={<i className='tabler-sparkles' />}
              sx={{
                bgcolor: DRAFT_BRAND_ACCENT_RAMP[100],
                color: DRAFT_BRAND_ACCENT_RAMP[800],
                borderColor: DRAFT_BRAND_ACCENT_RAMP[300]
              }}
              variant='outlined'
            />
          </Box>
          <Box
            sx={theme => ({
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(6, minmax(0, 1fr))' },
              gap: 2,
              p: 2,
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              bgcolor: theme.palette.background.default,
              border: `1px solid ${theme.palette.divider}`
            })}
          >
            {[
              ['Base brand', recommended.base, 'shell / logo'],
              ['Primary action', recommended.action, 'CTA / activo'],
              ['UI support', recommended.support, 'secondary tonal'],
              ['Green vivid', recommended.greenAccent, 'marca viva'],
              ['Green ink', recommended.greenInk, 'texto/iconos'],
              ['Orange accent', recommended.orangeAccent, 'marca puntual']
            ].map(([label, color, helper]) => (
              <Box key={label} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  sx={theme => ({
                    bgcolor: color,
                    minBlockSize: theme.spacing(10),
                    borderRadius: `${theme.shape.customBorderRadius.md}px`
                  })}
                />
                <Typography variant='h6'>{label}</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {helper}
                </Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card variant='outlined'>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant='h5'>Dark surface</Typography>
            <Typography variant='body2' color='text.secondary'>
              En superficies oscuras el azul sostiene la marca. El verde vivo aparece como acento breve y el verde ink
              queda para lectura en fondos claros.
            </Typography>
          </Box>
          <Box
            sx={theme => ({
              bgcolor: theme.axis.neutral.dark.bodyBg,
              color: theme.axis.neutral.dark.textPrimary,
              p: 3,
              borderRadius: `${theme.shape.customBorderRadius.xxl}px`,
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            })}
          >
            <Typography variant='overline' sx={{ color: theme.axis.neutral.dark.textSecondary }}>
              AXIS preview
            </Typography>
            <Typography variant='h5' sx={{ color: theme.axis.neutral.dark.textPrimary }}>
              Acento naranja para identidad
            </Typography>
            <Typography variant='body2' sx={{ color: theme.axis.neutral.dark.textSecondary }}>
              La familia azul da seriedad; los acentos guían la mirada en dosis pequeñas.
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1.5 }}>
              <Box
                sx={theme => ({
                  bgcolor: BRAND_ACTION_BLUE,
                  color: theme.axis.neutral.light.bgWhite,
                  p: 2,
                  borderRadius: `${theme.shape.customBorderRadius.lg}px`
                })}
              >
                <Typography variant='h6'>Action blue</Typography>
                <Typography variant='caption'>
                  Contraste {ratio(contrast(BRAND_ACTION_BLUE, theme.axis.neutral.light.bgWhite))}
                </Typography>
              </Box>
              <Box
                sx={theme => ({
                  bgcolor: BRAND_GREEN_VIVID,
                  color: BRAND_LOGO_BLUE,
                  p: 2,
                  borderRadius: `${theme.shape.customBorderRadius.lg}px`
                })}
              >
                <Typography variant='h6'>Green vivid</Typography>
                <Typography variant='caption'>Contraste {ratio(contrast(BRAND_GREEN_VIVID, BRAND_LOGO_BLUE))}</Typography>
              </Box>
              <Box
                sx={theme => ({
                  bgcolor: DRAFT_BRAND_ACCENT_RAMP[500],
                  color: theme.axis.neutral.light.textPrimary,
                  p: 2,
                  borderRadius: `${theme.shape.customBorderRadius.lg}px`
                })}
              >
                <Typography variant='h6'>Orange + ink</Typography>
                <Typography variant='caption'>
                  Contraste {ratio(contrast(DRAFT_BRAND_ACCENT_RAMP[500], theme.axis.neutral.light.textPrimary))}
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

const AccessibilityRules = () => {
  const theme = useTheme()
  const anchor = DRAFT_BRAND_ACCENT_RAMP[500]

  const rules = [
    {
      title: 'Anchor 500',
      value: ratio(contrast(anchor, theme.axis.neutral.light.textPrimary)),
      copy: 'Pasa con tinta oscura; falla con texto blanco.'
    },
    {
      title: 'Texto sobre blanco',
      value: '700 / 800 / 900',
      copy: 'Usar pasos oscuros para texto o íconos sobre superficies claras.'
    },
    {
      title: 'Tints',
      value: '100 / 200 / 300',
      copy: 'Buenos para fondos suaves, badges de marca y highlights.'
    },
    {
      title: 'No semántico',
      value: 'No warning',
      copy: 'No reemplaza atención, riesgo, error ni éxito operacional.'
    }
  ]

  return (
    <Card variant='outlined'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant='h5'>Reglas de accesibilidad y uso</Typography>
          <Typography variant='body2' color='text.secondary'>
            Propuesta de gobernanza si este color se convierte después en token.
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 2 }}>
          {rules.map(rule => (
            <Box
              key={rule.title}
              sx={theme => ({
                p: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: `${theme.shape.customBorderRadius.lg}px`
              })}
            >
              <Typography variant='overline' color='text.secondary'>
                {rule.title}
              </Typography>
              <Typography variant='h6'>{rule.value}</Typography>
              <Typography variant='caption' color='text.secondary'>
                {rule.copy}
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Contrapropuesta D (Claude · product-design) — solo visual, NO tokenizada.
// Tesis: sobriedad + pop de marca en dosis mínimas + TODO color de trabajo AA,
// y la mitad que falta: dual-mode (light + dark).
//
// Regla de gobierno: el 500 de cada color de TRABAJO cae en [4.5 - 7] sobre
// blanco → un solo token sirve como texto-sobre-blanco Y blanco-sobre-fill. En
// dark, un step más claro (dark-fg) da ≥4.5 sobre el charcoal. Los pops de marca
// (vivid green, orange) NO son texto: van con un ink-pair AA para texto/icono.
// ─────────────────────────────────────────────────────────────────────────────

const COUNTER_DARK_SURFACE = '#25293C' // AXIS dark bodyBg (preview)

const COUNTER_SPINE = { base: '#023C70', action: '#024C8F', support: '#E8F1F8' } as const
const COUNTER_GREEN_CANON = '#3E7A12' // muted: canónico, texto+fill (5.25 dual)
const COUNTER_GREEN_DARK = '#8FD45A' // dark-fg del verde
const COUNTER_ACTION_DARK = '#6BA6E8' // dark-fg del action blue
const COUNTER_GREEN_POP = '#6EC207' // vivid: pop de marca, SOLO fill decorativo
const COUNTER_ORANGE_POP = '#FF6500' // orange: pop de marca, SOLO fill decorativo
const COUNTER_ORANGE_INK = '#9A3D00' // ink-pair AA del orange para texto/icono (6.90)

// Cada semántica: `fill` (fondo) + `onFill` (texto sobre el fill) + `ink` (texto
// del rol sobre blanco) + `dark` (fg sobre charcoal). Warning rompe el molde a
// propósito (lógica de señal de tránsito): amber BRILLANTE como fill con texto
// OSCURO, e ink ocre solo para texto-sobre-blanco. Nunca texto blanco en amber.
const COUNTER_SEMANTICS = [
  { role: 'Info', fill: '#256B8F', onFill: '#ffffff', ink: '#256B8F', dark: '#6FB0D6' },
  { role: 'Success', fill: '#1F7A4D', onFill: '#ffffff', ink: '#1F7A4D', dark: '#5FC08C' },
  { role: 'Warning', fill: '#FFB703', onFill: '#2A1A00', ink: '#8F6200', dark: '#E0A93E' },
  { role: 'Error', fill: '#B4232A', onFill: '#ffffff', ink: '#B4232A', dark: '#E8888D' }
] as const

type CounterSemantic = (typeof COUNTER_SEMANTICS)[number]

const DualModeSwatch = ({ role, fill, onFill, ink, dark }: CounterSemantic) => {
  const onWhite = contrast(ink, '#ffffff')
  const fillContrast = contrast(fill, onFill)
  const onDark = contrast(dark, COUNTER_DARK_SURFACE)

  return (
    <Card variant='outlined'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant='h6'>{role}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <Box
            sx={theme => ({
              bgcolor: '#ffffff',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              p: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75
            })}
          >
            <Box sx={{ bgcolor: fill, color: onFill, borderRadius: '999px', px: 1.5, py: 0.5, textAlign: 'center' }}>
              <Typography variant='caption' sx={{ color: onFill, fontWeight: 700 }}>
                fill {ratio(fillContrast)}
              </Typography>
            </Box>
            <Typography variant='caption' sx={{ color: ink, fontWeight: 700 }}>
              texto {ink}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              ink/blanco {ratio(onWhite)}
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: COUNTER_DARK_SURFACE,
              borderRadius: '6px',
              p: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75
            }}
          >
            <Box sx={{ border: `1px solid ${dark}`, borderRadius: '999px', px: 1.5, py: 0.5, textAlign: 'center' }}>
              <Typography variant='caption' sx={{ color: dark, fontWeight: 700 }}>
                dark-fg
              </Typography>
            </Box>
            <Typography variant='caption' sx={{ color: dark, fontWeight: 700 }}>
              texto {dark}
            </Typography>
            <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.6)' }}>
              dark {ratio(onDark)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

const CounterProposalD = () => {
  const theme = useTheme()

  return (
    <Box data-capture='counter-proposal-d' sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) auto' },
          gap: 2,
          alignItems: 'start'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant='overline' sx={{ color: COUNTER_SPINE.action, fontWeight: 800 }}>
            Contrapropuesta · Claude · product-design
          </Typography>
          <Typography variant='h5'>D. Brand spine + verde disciplinado + ink-pairs + dual-mode</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: theme.spacing(180) }}>
            Mantiene lo bueno de A/B (spine navy + acción azul + las 4 semánticas AA) y agrega cuatro cosas: (1) regla
            dura — el 500 de cada color de trabajo cae en [4.5–7] sobre blanco, así un solo token sirve como texto y como
            fill; (2) verde muted como canónico, el vivid como pop de marca capado; (3) ink-pairs AA para los pops que no
            son texto (vivid green, orange); (4) la mitad que faltaba: columna dark-fg verificada sobre charcoal.
          </Typography>
        </Box>
        <Chip
          label='Recomendada (a11y + 2026)'
          sx={{ bgcolor: COUNTER_SPINE.support, color: COUNTER_SPINE.action, fontWeight: 700, alignSelf: 'start' }}
        />
      </Box>

      {/* Brand spine + verde — heredado, con verde muted canónico */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
        <ColorSample label='Base / identidad' color={COUNTER_SPINE.base} />
        <ColorSample label='Action / CTA' color={COUNTER_SPINE.action} />
        <ColorSample label='Verde canónico (muted)' color={COUNTER_GREEN_CANON} />
        <ColorSample label='Support tonal' color={COUNTER_SPINE.support} />
      </Box>

      {/* Semánticas dual-mode */}
      <Box>
        <Typography variant='subtitle2' sx={{ mb: 1 }}>
          Semánticas — fill (fondo) · ink (texto sobre blanco) · dark-fg (sobre charcoal). Todas AA. Warning es el único
          que rompe el molde a propósito: amber brillante #FFB703 con texto OSCURO (señal de tránsito), ink ocre solo
          para texto. Nunca texto blanco sobre amber.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          {COUNTER_SEMANTICS.map(s => (
            <DualModeSwatch key={s.role} {...s} />
          ))}
        </Box>
      </Box>

      {/* Pops de marca + ink-pairs */}
      <Card variant='outlined'>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant='h6'>Pops de marca — solo fill decorativo, nunca texto/UI a 3:1</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ bgcolor: COUNTER_GREEN_POP, borderRadius: '8px', px: 2, py: 1 }}>
              <Typography variant='caption' sx={{ color: COUNTER_SPINE.base, fontWeight: 800 }}>
                vivid green pop {COUNTER_GREEN_POP}
              </Typography>
            </Box>
            <Typography variant='caption' sx={{ color: COUNTER_GREEN_CANON, fontWeight: 700 }}>
              ↳ texto/icono → green-ink {COUNTER_GREEN_CANON} ({ratio(contrast(COUNTER_GREEN_CANON, '#ffffff'))})
            </Typography>
            <Box sx={{ bgcolor: COUNTER_ORANGE_POP, borderRadius: '8px', px: 2, py: 1 }}>
              <Typography variant='caption' sx={{ color: '#ffffff', fontWeight: 800 }}>
                orange pop {COUNTER_ORANGE_POP}
              </Typography>
            </Box>
            <Typography variant='caption' sx={{ color: COUNTER_ORANGE_INK, fontWeight: 700 }}>
              ↳ texto/icono → orange-ink {COUNTER_ORANGE_INK} ({ratio(contrast(COUNTER_ORANGE_INK, '#ffffff'))})
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Demo viva: light + dark lado a lado */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Card variant='outlined'>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, bgcolor: '#ffffff' }}>
            <Typography variant='subtitle2'>Light</Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button variant='contained' sx={{ bgcolor: COUNTER_SPINE.action, '&:hover': { bgcolor: COUNTER_SPINE.base } }}>
                Confirmar
              </Button>
              <Button variant='tonal' sx={{ color: COUNTER_SPINE.action, bgcolor: COUNTER_SPINE.support }}>
                Secundario
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {COUNTER_SEMANTICS.map(s => (
                <Chip
                  key={s.role}
                  size='small'
                  label={s.role}
                  sx={{ bgcolor: s.fill, color: s.onFill, fontWeight: 700 }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
        <Card variant='outlined' sx={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, bgcolor: COUNTER_DARK_SURFACE }}>
            <Typography variant='subtitle2' sx={{ color: 'rgba(255,255,255,0.92)' }}>
              Dark
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button variant='contained' sx={{ bgcolor: COUNTER_ACTION_DARK, color: COUNTER_DARK_SURFACE, '&:hover': { bgcolor: '#8FBFF0' } }}>
                Confirmar
              </Button>
              <Button variant='outlined' sx={{ color: COUNTER_GREEN_DARK, borderColor: COUNTER_GREEN_DARK }}>
                Highlight
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {COUNTER_SEMANTICS.map(s => (
                <Chip
                  key={s.role}
                  size='small'
                  variant='outlined'
                  label={s.role}
                  sx={{ color: s.dark, borderColor: s.dark, fontWeight: 700 }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

const BrandColorProposalMockupView = () => {
  const theme = useTheme()

  return (
    <Box data-capture='brand-color-proposal-mockup' sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxInlineSize: theme.spacing(285), mx: 'auto' }}>
      <Box
        sx={theme => ({
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) auto' },
          gap: 4,
          p: { xs: 4, md: 6 },
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.display}px`,
          bgcolor: theme.palette.background.paper
        })}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant='overline' color='text.secondary'>
            Mockup interno
          </Typography>
          <Typography variant='h4'>Sistema de color Greenhouse + acentos de marca</Typography>
          <Typography variant='body1' color='text.secondary'>
            Alternativas para acercar la plataforma a la marca real: azul logo como raiz, #024C8F como accion, soporte
            tonal para secondary UI, green vivid para marca viva y green ink para usos legibles.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip sx={{ bgcolor: BRAND_LOGO_BLUE, color: theme.axis.neutral.light.bgWhite }} label='Base #023C70' />
            <Chip sx={{ bgcolor: BRAND_ACTION_BLUE, color: theme.axis.neutral.light.bgWhite }} label='Action #024C8F' />
            <Chip sx={{ bgcolor: BRAND_SUPPORT_TINT, color: BRAND_LOGO_BLUE }} label='Support #E8F1F8' />
            <Chip sx={{ bgcolor: '#EAF7D6', color: BRAND_LOGO_BLUE }} label='Green vivid #6EC207' />
            <Chip sx={{ bgcolor: '#F5FBEA', color: BRAND_GREEN_INK }} label='Green ink #3E7A12' />
            <Chip
              label='Orange accent #FF6500'
              sx={{ bgcolor: DRAFT_BRAND_ACCENT_RAMP[100], color: DRAFT_BRAND_ACCENT_RAMP[800] }}
            />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', lg: 'center' } }}>
          <AxisWordmark variant='auto' height={96} />
        </Box>
      </Box>

      <BrandAlternatives />

      <Divider />
      <CounterProposalD />
      <Divider />

      <DesignSystemColorSheet />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(6, minmax(0, 1fr))' }, gap: 2 }}>
        <RoleCard
          title='Primary base'
          value={BRAND_LOGO_BLUE}
          description='Color del logo como raiz de identidad.'
          usage='Shell, navegacion, superficies brand y estados activos de estructura.'
          color={BRAND_LOGO_BLUE}
          textColor={theme.axis.neutral.light.bgWhite}
        />
        <RoleCard
          title='Primary action'
          value={BRAND_ACTION_BLUE}
          description='Azul accionable para dar mas seriedad al producto.'
          usage='Botones contained, links principales y foco de decision.'
          color={BRAND_ACTION_BLUE}
          textColor={theme.axis.neutral.light.bgWhite}
        />
        <RoleCard
          title='UI support'
          value={BRAND_SUPPORT_TINT}
          description='Secondary visual como tonal, no como verde de marca.'
          usage='Botones secundarios, fondos seleccionados suaves y bloques de soporte.'
          color={BRAND_SUPPORT_TINT}
          textColor={BRAND_LOGO_BLUE}
        />
        <RoleCard
          title='Green vivid'
          value={BRAND_GREEN_VIVID}
          description='Energia viva de marca, no secondary ni success.'
          usage='Highlights, badges, fondos suaves y momentos de identidad.'
          color={BRAND_GREEN_VIVID}
          textColor={BRAND_LOGO_BLUE}
        />
        <RoleCard
          title='Green ink'
          value={BRAND_GREEN_INK}
          description='Verde de lectura para texto e iconos sobre claro.'
          usage='Labels de marca, bordes y estados visuales no semanticos.'
          color={BRAND_GREEN_INK}
          textColor={theme.axis.neutral.light.bgWhite}
        />
        <RoleCard
          title='Orange accent'
          value={DRAFT_BRAND_ACCENT_RAMP[500]}
          description='Acento de identidad de marca.'
          usage='Highlights, momentos AXIS, marca; no warning ni CTA por defecto.'
          color={DRAFT_BRAND_ACCENT_RAMP[500]}
          textColor={theme.axis.neutral.light.textPrimary}
        />
      </Box>

      <DraftRamp />
      <AccessibilityRules />
      <ApplicationExamples />
    </Box>
  )
}

export default BrandColorProposalMockupView
