'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

import BrandLogo from '@/components/greenhouse/BrandLogo'
import VerifiedByEfeonceBadge from '@/components/greenhouse/VerifiedByEfeonceBadge'
import { GH_CLIENT_TALENT } from '@/config/greenhouse-nomenclature'
import { formatDate as formatGreenhouseDate } from '@/lib/format'

// ── Types ──

export type ClientSafeTalentProfile = {
  memberId: string
  displayName: string
  avatarUrl: string | null
  headline: string | null
  aboutMe: string | null
  skills: Array<{ skillName: string; skillCategory: string; seniorityLevel: string }>
  tools: Array<{ toolName: string; toolCategory: string; iconKey: string | null; proficiencyLevel: string }>
  certifications: Array<{
    name: string
    issuer: string
    issuedDate: string | null
    expiryDate: string | null
    validationUrl: string | null
    hasEvidence: boolean
  }>
  languages: Array<{ languageName: string; proficiencyLevel: string }>
  professionalLinks: {
    linkedinUrl: string | null
    portfolioUrl: string | null
    behanceUrl: string | null
    githubUrl: string | null
    dribbbleUrl: string | null
  }
  verifiedItemCount: number
  isVerifiedByEfeonce: boolean
}

type ClientSafeTalentCardProps = {
  profile: ClientSafeTalentProfile
  expanded?: boolean
  onToggleExpand?: () => void
}

// ── Label maps ──

const SENIORITY_LABELS: Record<string, string> = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead'
}

const PROFICIENCY_LABELS: Record<string, string> = {
  beginner: 'Basico',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
  expert: 'Experto'
}

const LANGUAGE_PROFICIENCY_LABELS: Record<string, string> = {
  basic: 'Basico',
  conversational: 'Conversacional',
  professional: 'Profesional',
  fluent: 'Fluido',
  native: 'Nativo'
}

const CATEGORY_ICONS: Record<string, string> = {
  design: 'tabler-palette',
  development: 'tabler-code',
  strategy: 'tabler-target-arrow',
  account: 'tabler-briefcase',
  media: 'tabler-speakerphone',
  operations: 'tabler-settings',
  other: 'tabler-puzzle'
}

const CATEGORY_LABELS: Record<string, string> = {
  design: 'Diseno',
  development: 'Desarrollo',
  strategy: 'Estrategia',
  account: 'Cuenta',
  media: 'Medios',
  operations: 'Operaciones',
  other: 'Otros'
}

// ── Helpers ──

const getInitials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

const groupSkillsByCategory = (skills: ClientSafeTalentProfile['skills']) => {
  const grouped = new Map<string, typeof skills>()

  for (const skill of skills) {
    const key = skill.skillCategory || 'other'
    const arr = grouped.get(key) || []

    arr.push(skill)
    grouped.set(key, arr)
  }

  return grouped
}

const getProfessionalLinks = (links: ClientSafeTalentProfile['professionalLinks']) => {
  const entries: Array<{ key: string; url: string; label: string; brand: string }> = []

  if (links.linkedinUrl) entries.push({ key: 'linkedin', url: links.linkedinUrl, label: 'LinkedIn', brand: 'linkedin' })
  if (links.portfolioUrl) entries.push({ key: 'portfolio', url: links.portfolioUrl, label: 'Portfolio', brand: 'portfolio' })
  if (links.behanceUrl) entries.push({ key: 'behance', url: links.behanceUrl, label: 'Behance', brand: 'behance' })
  if (links.githubUrl) entries.push({ key: 'github', url: links.githubUrl, label: 'GitHub', brand: 'github' })
  if (links.dribbbleUrl) entries.push({ key: 'dribbble', url: links.dribbbleUrl, label: 'Dribbble', brand: 'dribbble' })

  return entries
}

// ── Component ──

const ClientSafeTalentCard = ({ profile, expanded = false }: ClientSafeTalentCardProps) => {
  if (!expanded) {
    return <CollapsedView profile={profile} />
  }

  return <ExpandedView profile={profile} />
}

// ── Collapsed View (card summary for grid) ──

const CollapsedView = ({ profile }: { profile: ClientSafeTalentProfile }) => {
  const topSkills = profile.skills.slice(0, 3)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Identity row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {profile.avatarUrl ? (
          <Avatar src={profile.avatarUrl} sx={{ width: 64, height: 64 }} />
        ) : (
          <CustomAvatar color='primary' skin='light-static' sx={{ width: 64, height: 64, fontSize: '1.25rem' }}>
            {getInitials(profile.displayName)}
          </CustomAvatar>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant='subtitle1' fontWeight={600} noWrap>
            {profile.displayName}
          </Typography>
          {profile.headline && (
            <Typography variant='body2' color='text.secondary' noWrap>
              {profile.headline}
            </Typography>
          )}
          {profile.isVerifiedByEfeonce && (
            <Box sx={{ mt: 0.5 }}>
              <VerifiedByEfeonceBadge size='small' />
            </Box>
          )}
        </Box>
      </Box>

      {/* Skills preview */}
      {topSkills.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {topSkills.map(skill => (
            <Chip
              key={skill.skillName}
              label={skill.skillName}
              size='small'
              variant='outlined'
              sx={{ fontSize: '0.75rem', height: 24 }}
            />
          ))}
          {profile.skills.length > 3 && (
            <Chip
              label={`+${profile.skills.length - 3}`}
              size='small'
              variant='outlined'
              sx={{ fontSize: '0.75rem', height: 24 }}
            />
          )}
        </Box>
      )}

      {/* Summary line */}
      <Typography variant='caption' color='text.secondary'>
        {profile.tools.length > 0 && `${profile.tools.length} ${GH_CLIENT_TALENT.label_tools}`}
        {profile.tools.length > 0 && profile.certifications.length > 0 && ' · '}
        {profile.certifications.length > 0 && `${profile.certifications.length} ${GH_CLIENT_TALENT.label_certifications}`}
      </Typography>
    </Box>
  )
}

// ── Expanded View (full dossier in dialog) ──

const ExpandedView = ({ profile }: { profile: ClientSafeTalentProfile }) => {
  const groupedSkills = groupSkillsByCategory(profile.skills)
  const links = getProfessionalLinks(profile.professionalLinks)

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 3 }}>
        {profile.avatarUrl ? (
          <Avatar src={profile.avatarUrl} sx={{ width: 80, height: 80 }} />
        ) : (
          <CustomAvatar color='primary' skin='light-static' sx={{ width: 80, height: 80, fontSize: '1.5rem' }}>
            {getInitials(profile.displayName)}
          </CustomAvatar>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant='h5' fontWeight={600}>
            {profile.displayName}
          </Typography>
          {profile.headline && (
            <Typography variant='body1' color='text.secondary' sx={{ mt: 0.5 }}>
              {profile.headline}
            </Typography>
          )}
          {profile.isVerifiedByEfeonce && (
            <Box sx={{ mt: 1 }}>
              <VerifiedByEfeonceBadge size='medium' />
            </Box>
          )}

          {/* Verified items counter */}
          {profile.verifiedItemCount > 0 && (
            <Typography variant='caption' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
              <i className='tabler-rosette-discount-check' style={{ fontSize: 14, color: 'var(--mui-palette-info-main)' }} />
              {profile.verifiedItemCount} {GH_CLIENT_TALENT.label_verified_items}
            </Typography>
          )}
        </Box>
      </Box>

      {/* About Me */}
      {profile.aboutMe && (
        <>
          <SectionHeading icon='tabler-user' label={GH_CLIENT_TALENT.section_about_me} />
          <Typography variant='body2' color='text.secondary' sx={{ mb: 3, lineHeight: 1.7 }}>
            {profile.aboutMe}
          </Typography>
        </>
      )}

      {/* Skills grouped by category */}
      {profile.skills.length > 0 && (
        <>
          <SectionHeading icon='tabler-bulb' label={GH_CLIENT_TALENT.section_skills} count={profile.skills.length} />
          <Stack spacing={2} sx={{ mb: 3 }}>
            {Array.from(groupedSkills.entries()).map(([category, skills]) => (
              <Box key={category}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <i className={CATEGORY_ICONS[category] || 'tabler-puzzle'} style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
                  <Typography variant='caption' fontWeight={600} color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {CATEGORY_LABELS[category] || category}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {skills.map(skill => (
                    <Chip
                      key={skill.skillName}
                      label={
                        <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                          {skill.skillName}
                          <Typography
                            component='span'
                            variant='caption'
                            sx={{
                              fontSize: '0.65rem',
                              color: 'text.disabled',
                              fontWeight: 500,
                              borderLeft: theme => `1px solid ${theme.palette.divider}`,
                              pl: 0.75
                            }}
                          >
                            {SENIORITY_LABELS[skill.seniorityLevel] || skill.seniorityLevel}
                          </Typography>
                        </Box>
                      }
                      size='small'
                      variant='outlined'
                      sx={{
                        height: 28,
                        borderColor: theme => theme.palette.divider,
                        '& .MuiChip-label': { px: 1.5 }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Stack>
        </>
      )}

      {/* Tools */}
      {profile.tools.length > 0 && (
        <>
          <SectionHeading icon='tabler-tool' label={GH_CLIENT_TALENT.section_tools} count={profile.tools.length} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
            {profile.tools.map(tool => (
              <Tooltip key={tool.toolName} title={`${PROFICIENCY_LABELS[tool.proficiencyLevel] || tool.proficiencyLevel}`} arrow>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BrandLogo brand={tool.iconKey || tool.toolName} size={28} />
                  <Box>
                    <Typography variant='body2' fontWeight={500} sx={{ lineHeight: 1.3 }}>
                      {tool.toolName}
                    </Typography>
                    <Typography variant='caption' color='text.disabled' sx={{ fontSize: '0.65rem' }}>
                      {PROFICIENCY_LABELS[tool.proficiencyLevel] || tool.proficiencyLevel}
                    </Typography>
                  </Box>
                </Box>
              </Tooltip>
            ))}
          </Box>
        </>
      )}

      {/* Certifications */}
      {profile.certifications.length > 0 && (
        <>
          <SectionHeading icon='tabler-certificate' label={GH_CLIENT_TALENT.section_certifications} count={profile.certifications.length} />
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {profile.certifications.map(cert => (
              <Box
                key={cert.name}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  p: 1.5,
                  borderRadius: 2,
                  border: theme => `1px solid ${theme.palette.divider}`,
                  bgcolor: theme => theme.palette.action.hover
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: theme => theme.palette.action.selected,
                    flexShrink: 0
                  }}
                >
                  <i className='tabler-certificate' style={{ fontSize: 18, color: 'var(--mui-palette-primary-main)' }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant='body2' fontWeight={600} noWrap>
                      {cert.name}
                    </Typography>
                    {cert.hasEvidence && (
                      <Tooltip title={GH_CLIENT_TALENT.cert_evidence_available} arrow>
                        <i className='tabler-file-check' style={{ fontSize: 14, color: 'var(--mui-palette-success-main)' }} />
                      </Tooltip>
                    )}
                  </Box>
                  <Typography variant='caption' color='text.secondary'>
                    {cert.issuer}
                    {cert.issuedDate && ` · ${formatDate(cert.issuedDate)}`}
                    {cert.expiryDate && ` — ${formatDate(cert.expiryDate)}`}
                  </Typography>
                  {cert.validationUrl && (
                    <Box sx={{ mt: 0.5 }}>
                      <Typography
                        component='a'
                        href={cert.validationUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        variant='caption'
                        color='primary.main'
                        sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {GH_CLIENT_TALENT.cert_verify_link}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
          </Stack>
        </>
      )}

      {/* Languages */}
      {profile.languages.length > 0 && (
        <>
          <SectionHeading icon='tabler-language' label={GH_CLIENT_TALENT.section_languages} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
            {profile.languages.map(lang => (
              <Box
                key={lang.languageName}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  border: theme => `1px solid ${theme.palette.divider}`
                }}
              >
                <i className='tabler-world' style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
                <Typography variant='body2' fontWeight={500}>
                  {lang.languageName}
                </Typography>
                <Typography variant='caption' color='text.disabled'>
                  {LANGUAGE_PROFICIENCY_LABELS[lang.proficiencyLevel] || lang.proficiencyLevel}
                </Typography>
              </Box>
            ))}
          </Box>
        </>
      )}

      {/* Professional Links */}
      {links.length > 0 && (
        <>
          <SectionHeading icon='tabler-link' label={GH_CLIENT_TALENT.section_links} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            {links.map(link => (
              <Tooltip key={link.key} title={link.label} arrow>
                <IconButton
                  component='a'
                  href={link.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label={link.label}
                  size='small'
                  sx={{
                    border: theme => `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    width: 40,
                    height: 40
                  }}
                >
                  {link.key === 'portfolio' ? (
                    <i className='tabler-world' style={{ fontSize: 20 }} />
                  ) : (
                    <BrandLogo brand={link.brand} size={24} />
                  )}
                </IconButton>
              </Tooltip>
            ))}
          </Box>
        </>
      )}
    </Box>
  )
}

// ── Subcomponents ──

const SectionHeading = ({ icon, label, count }: { icon: string; label: string; count?: number }) => (
  <Box sx={{ mb: 1.5 }}>
    <Divider sx={{ mb: 2 }} />
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <i className={icon} style={{ fontSize: 18, color: 'var(--mui-palette-text-secondary)' }} />
      <Typography variant='subtitle2' fontWeight={600}>
        {label}
      </Typography>
      {count != null && count > 0 && (
        <Chip label={count} size='small' variant='outlined' sx={{ height: 20, fontSize: '0.7rem', ml: 0.5 }} />
      )}
    </Box>
  </Box>
)

// ── Date formatting ──

const formatDate = (dateStr: string) => {
  try {
    return formatGreenhouseDate(dateStr, { month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export default ClientSafeTalentCard
