'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { TeamAvatarGroup } from '@/components/greenhouse/primitives'

/**
 * Lab interno de TeamAvatarGroup (TASK-1248). INTERNAL ONLY — los clientes nunca lo ven.
 * Specimen vivo de las 2 kinds de la primitive:
 *  - `members` (default): avatares de persona (foto o iniciales) en grupo solapado con tooltip + pull-up.
 *  - `brands` (TASK-1248): isotipos de motor/integración (ChatGPT/Claude/Gemini/Perplexity) precedidos por
 *    un `label` inline, con el Tooltip AXIS (snackbar + arrow, node Figma 216:135965), solape sutil + pull-up.
 */

const MOCK_MEMBERS = [
  { name: 'Julio Reyes', avatarUrl: null },
  { name: 'Maggie Borralles', avatarUrl: null },
  { name: 'Daniela Soto', avatarUrl: null },
  { name: 'Andrés Pinto', avatarUrl: null },
  { name: 'Carla Méndez', avatarUrl: null },
  { name: ' Tomás Vera', avatarUrl: null }
]

const MOCK_ENGINES = [
  { provider: 'gemini', name: 'Gemini' },
  { provider: 'openai', name: 'ChatGPT' },
  { provider: 'anthropic', name: 'Claude' },
  { provider: 'perplexity', name: 'Perplexity' }
]

const Specimen = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
  <Card variant='outlined' sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.lg}px` })}>
    <CardContent>
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Typography variant='h5'>{title}</Typography>
        <Typography variant='body2' color='text.secondary'>
          {description}
        </Typography>
      </Stack>
      {children}
    </CardContent>
  </Card>
)

const TeamAvatarGroupLabView = () => (
  <Stack spacing={6} sx={{ p: { xs: 4, md: 6 } }} data-capture='team-avatar-group-lab'>
    <Box>
      <Typography variant='h4'>Team Avatar Group</Typography>
      <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>
        Grupo compacto de avatares solapados con tooltip + microinteracción <code>pull-up</code> al hover. Dos
        kinds: <code>members</code> (personas) y <code>brands</code> (isotipos de motor/integración).
      </Typography>
    </Box>

    <Specimen
      title='Kind · brands (isotipos)'
      description='Isotipos de motor/integración precedidos por un label inline. Tooltip AXIS (snackbar + arrow), solape sutil + pull-up. Reusa GreenhouseBrandLogoMark + el glyph de Perplexity. +N si supera el max.'
    >
      <Stack spacing={5}>
        <TeamAvatarGroup brands={MOCK_ENGINES} label='Evaluado en' size={40} />
        <TeamAvatarGroup brands={MOCK_ENGINES} label='Motores' size={32} />
        <TeamAvatarGroup brands={[...MOCK_ENGINES, { provider: 'other', name: 'Otro' }]} label='Con overflow' max={3} size={40} />
      </Stack>
    </Specimen>

    <Specimen
      title='Kind · members (personas)'
      description='Avatares de persona (foto o iniciales) en grupo solapado con tooltip + pull-up. Variante histórica, byte-idéntica.'
    >
      <Stack spacing={5}>
        <TeamAvatarGroup members={MOCK_MEMBERS} size={40} />
        <TeamAvatarGroup members={MOCK_MEMBERS} max={3} size={32} />
      </Stack>
    </Specimen>
  </Stack>
)

export default TeamAvatarGroupLabView
