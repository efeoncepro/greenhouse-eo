'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import BrandLogo from '@/components/greenhouse/BrandLogo'
import { GH_SKILLS_CERTS } from '@/config/greenhouse-nomenclature'

type ProfessionalLinks = {
  linkedinUrl: string | null
  portfolioUrl: string | null
  twitterUrl: string | null
  threadsUrl: string | null
  behanceUrl: string | null
  githubUrl: string | null
  dribbbleUrl: string | null
}

type ProfessionalLinksCardProps = {
  links: ProfessionalLinks
  editable: boolean
  onSave?: (links: Record<string, string | null>) => Promise<void>
}

type LinkDefinition = {
  key: keyof ProfessionalLinks
  brand: string
  label: string
  placeholder: string
}

const LINK_DEFINITIONS: LinkDefinition[] = [
  { key: 'linkedinUrl', brand: 'linkedin', label: GH_SKILLS_CERTS.link_linkedin, placeholder: 'https://linkedin.com/in/...' },
  { key: 'portfolioUrl', brand: 'portfolio', label: GH_SKILLS_CERTS.link_portfolio, placeholder: 'https://...' },
  { key: 'twitterUrl', brand: 'twitter', label: GH_SKILLS_CERTS.link_twitter, placeholder: 'https://x.com/...' },
  { key: 'threadsUrl', brand: 'threads', label: GH_SKILLS_CERTS.link_threads, placeholder: 'https://threads.net/...' },
  { key: 'behanceUrl', brand: 'behance', label: GH_SKILLS_CERTS.link_behance, placeholder: 'https://behance.net/...' },
  { key: 'githubUrl', brand: 'github', label: GH_SKILLS_CERTS.link_github, placeholder: 'https://github.com/...' },
  { key: 'dribbbleUrl', brand: 'dribbble', label: GH_SKILLS_CERTS.link_dribbble, placeholder: 'https://dribbble.com/...' }
]

const ProfessionalLinksCard = ({ links, editable, onSave }: ProfessionalLinksCardProps) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProfessionalLinks>(links)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeLinks = LINK_DEFINITIONS.filter(def => links[def.key])
  const hasLinks = activeLinks.length > 0

  const handleEdit = () => {
    setDraft({ ...links })
    setEditing(true)
    setError(null)
  }

  const handleCancel = () => {
    setEditing(false)
    setError(null)
  }

  const handleSave = async () => {
    if (!onSave) return

    setSaving(true)
    setError(null)

    try {
      const payload: Record<string, string | null> = {}

      for (const def of LINK_DEFINITIONS) {
        const value = draft[def.key]?.trim() || null

        payload[def.key] = value
      }

      await onSave(payload)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  const handleFieldChange = (key: keyof ProfessionalLinks, value: string) => {
    setDraft(prev => ({ ...prev, [key]: value || null }))
  }

  if (editing) {
    return (
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title={GH_SKILLS_CERTS.section_professional_links}
          action={
            <Stack direction='row' spacing={1}>
              <Button size='small' onClick={handleCancel} disabled={saving}>
                Cancelar
              </Button>
              <Button size='small' variant='contained' onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </Stack>
          }
        />
        <CardContent>
          <Stack spacing={3}>
            {LINK_DEFINITIONS.map(def => (
              <TextField
                key={def.key}
                label={def.label}
                value={draft[def.key] ?? ''}
                onChange={e => handleFieldChange(def.key, e.target.value)}
                placeholder={def.placeholder}
                size='small'
                fullWidth
                disabled={saving}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <BrandLogo brand={def.brand} size={24} />
                      </InputAdornment>
                    )
                  }
                }}
              />
            ))}
            {error && <Alert severity='error'>{error}</Alert>}
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardHeader
        title={GH_SKILLS_CERTS.section_professional_links}
        action={
          editable ? (
            <IconButton size='small' onClick={handleEdit} aria-label='Editar links profesionales'>
              <i className='tabler-pencil' />
            </IconButton>
          ) : undefined
        }
      />
      <CardContent>
        {hasLinks ? (
          <Stack spacing={2}>
            {activeLinks.map(def => (
              <Box key={def.key} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <BrandLogo brand={def.brand} size={32} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant='caption' color='text.secondary'>
                    {def.label}
                  </Typography>
                  <Typography
                    component='a'
                    href={links[def.key]!}
                    target='_blank'
                    rel='noreferrer'
                    variant='body2'
                    color='primary'
                    sx={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' }
                    }}
                  >
                    {links[def.key]}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        ) : (
          <Stack alignItems='center' spacing={1} sx={{ py: 3 }}>
            <i className='tabler-link text-[24px]' style={{ opacity: 0.4 }} />
            <Typography variant='body2' color='text.secondary' textAlign='center'>
              {GH_SKILLS_CERTS.empty_links_title}
            </Typography>
            <Typography variant='caption' color='text.disabled' textAlign='center'>
              {GH_SKILLS_CERTS.empty_links_description}
            </Typography>
            {editable && (
              <Button size='small' variant='tonal' onClick={handleEdit} sx={{ mt: 1 }}>
                Agregar links
              </Button>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

export default ProfessionalLinksCard
