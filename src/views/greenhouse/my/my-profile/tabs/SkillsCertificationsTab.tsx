'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import VerifiedByEfeonceBadge from '@/components/greenhouse/VerifiedByEfeonceBadge'
import CertificatePreviewDialog from '@/components/greenhouse/CertificatePreviewDialog'
import ProfessionalLinksCard from '@/components/greenhouse/ProfessionalLinksCard'
import AboutMeCard from '@/components/greenhouse/AboutMeCard'
import { GH_SKILLS_CERTS } from '@/config/greenhouse-nomenclature'

import type {
  MemberSkill,
  SkillCatalogItem,
  SkillSeniorityLevel,
  SkillCategory
} from '@/types/agency-skills'
import type {
  MemberCertification,
  CertificationVerificationStatus
} from '@/types/certifications'
import { SKILL_SENIORITY_LEVELS, SKILL_CATEGORY_VALUES } from '@/types/agency-skills'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SkillsCertificationsTabProps = {
  mode: 'self' | 'admin'
  memberId: string
}

type ProfessionalLinks = {
  linkedinUrl: string | null
  portfolioUrl: string | null
  twitterUrl: string | null
  threadsUrl: string | null
  behanceUrl: string | null
  githubUrl: string | null
  dribbbleUrl: string | null
}

type ProfileData = {
  skills: MemberSkill[]
  catalog: SkillCatalogItem[]
  certifications: MemberCertification[]
  links: ProfessionalLinks
  aboutMe: string | null
  summary: {
    skillCount: number
    certificationCount: number
    verifiedSkillCount: number
    verifiedCertCount: number
    activeCertCount: number
    expiringSoonCount: number
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SENIORITY_LABELS: Record<SkillSeniorityLevel, string> = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead'
}

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  design: 'Diseño',
  development: 'Desarrollo',
  strategy: 'Estrategia',
  account: 'Cuentas',
  media: 'Medios',
  operations: 'Operaciones',
  other: 'Otra'
}

const VERIFICATION_STATUS_CONFIG: Record<
  CertificationVerificationStatus,
  { label: string; color: 'default' | 'info' | 'success' | 'error' | 'warning' }
> = {
  self_declared: { label: GH_SKILLS_CERTS.cert_status_self_declared, color: 'default' },
  pending_review: { label: GH_SKILLS_CERTS.cert_status_pending_review, color: 'info' },
  verified: { label: GH_SKILLS_CERTS.cert_status_verified, color: 'success' },
  rejected: { label: GH_SKILLS_CERTS.cert_status_rejected, color: 'error' }
}

const formatDate = (date: string | null): string => {
  if (!date) return '—'

  try {
    return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(
      new Date(date)
    )
  } catch {
    return date
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCounters({ summary }: { summary: ProfileData['summary'] }) {
  return (
    <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
      <Chip
        icon={<i className='tabler-sparkles' />}
        label={GH_SKILLS_CERTS.summary_skills(summary.skillCount)}
        variant='outlined'
        size='small'
      />
      <Chip
        icon={<i className='tabler-certificate' />}
        label={GH_SKILLS_CERTS.summary_certs_active(summary.activeCertCount)}
        variant='outlined'
        size='small'
        color='success'
      />
      <Chip
        icon={<i className='tabler-rosette-discount-check' />}
        label={GH_SKILLS_CERTS.summary_verified(summary.verifiedSkillCount + summary.verifiedCertCount)}
        variant='outlined'
        size='small'
        color='info'
      />
      {summary.expiringSoonCount > 0 && (
        <Chip
          icon={<i className='tabler-clock-exclamation' />}
          label={GH_SKILLS_CERTS.summary_expiring_soon(summary.expiringSoonCount)}
          variant='outlined'
          size='small'
          color='warning'
        />
      )}
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Add Skill Dialog
// ---------------------------------------------------------------------------

function AddSkillDialog({
  open,
  onClose,
  catalog,
  existingSkillCodes,
  onSubmit
}: {
  open: boolean
  onClose: () => void
  catalog: SkillCatalogItem[]
  existingSkillCodes: Set<string>
  onSubmit: (skillCode: string, seniorityLevel: SkillSeniorityLevel) => Promise<void>
}) {
  const [selectedSkill, setSelectedSkill] = useState<SkillCatalogItem | null>(null)
  const [seniority, setSeniority] = useState<SkillSeniorityLevel>('mid')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const availableCatalog = catalog.filter(s => s.active && !existingSkillCodes.has(s.skillCode))

  const handleSubmit = async () => {
    if (!selectedSkill) return

    setSubmitting(true)
    setError(null)

    try {
      await onSubmit(selectedSkill.skillCode, seniority)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar la skill.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedSkill(null)
    setSeniority('mid')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm' aria-labelledby='add-skill-dialog-title'>
      <DialogTitle id='add-skill-dialog-title'>{GH_SKILLS_CERTS.skill_add}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Autocomplete
            options={availableCatalog}
            getOptionLabel={option => option.skillName}
            groupBy={option => CATEGORY_LABELS[option.skillCategory] ?? option.skillCategory}
            value={selectedSkill}
            onChange={(_, value) => setSelectedSkill(value)}
            renderInput={params => (
              <TextField {...params} label='Skill' placeholder='Buscar skill...' />
            )}
            disabled={submitting}
            noOptionsText='No hay skills disponibles'
          />
          <TextField
            select
            label={GH_SKILLS_CERTS.skill_seniority}
            value={seniority}
            onChange={e => setSeniority(e.target.value as SkillSeniorityLevel)}
            disabled={submitting}
            size='small'
          >
            {SKILL_SENIORITY_LEVELS.map(level => (
              <MenuItem key={level} value={level}>
                {SENIORITY_LABELS[level]}
              </MenuItem>
            ))}
          </TextField>
          {error && <Alert severity='error'>{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={!selectedSkill || submitting}>
          {submitting ? 'Guardando...' : GH_SKILLS_CERTS.skill_add}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Add Certification Dialog
// ---------------------------------------------------------------------------

function AddCertificationDialog({
  open,
  onClose,
  onSubmit
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    issuer: string
    issuedDate: string | null
    expiryDate: string | null
    validationUrl: string | null
  }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [issuer, setIssuer] = useState('')
  const [issuedDate, setIssuedDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [validationUrl, setValidationUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!name.trim() || !issuer.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      await onSubmit({
        name: name.trim(),
        issuer: issuer.trim(),
        issuedDate: issuedDate || null,
        expiryDate: expiryDate || null,
        validationUrl: validationUrl.trim() || null
      })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la certificacion.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setName('')
    setIssuer('')
    setIssuedDate('')
    setExpiryDate('')
    setValidationUrl('')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm' aria-labelledby='add-cert-dialog-title'>
      <DialogTitle id='add-cert-dialog-title'>{GH_SKILLS_CERTS.cert_add}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <TextField
            label='Nombre de la certificacion'
            value={name}
            onChange={e => setName(e.target.value)}
            required
            disabled={submitting}
            placeholder='ej. Google Analytics Certified'
          />
          <TextField
            label={GH_SKILLS_CERTS.cert_issuer}
            value={issuer}
            onChange={e => setIssuer(e.target.value)}
            required
            disabled={submitting}
            placeholder='ej. Google'
          />
          <Stack direction='row' spacing={2}>
            <TextField
              label={GH_SKILLS_CERTS.cert_issued_date}
              type='date'
              value={issuedDate}
              onChange={e => setIssuedDate(e.target.value)}
              disabled={submitting}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label={GH_SKILLS_CERTS.cert_expiry_date}
              type='date'
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              disabled={submitting}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
          <TextField
            label={GH_SKILLS_CERTS.cert_validation_url}
            value={validationUrl}
            onChange={e => setValidationUrl(e.target.value)}
            disabled={submitting}
            placeholder='https://...'
          />
          {error && <Alert severity='error'>{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          variant='contained'
          onClick={handleSubmit}
          disabled={!name.trim() || !issuer.trim() || submitting}
        >
          {submitting ? 'Guardando...' : GH_SKILLS_CERTS.cert_add}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Skills Section
// ---------------------------------------------------------------------------

function SkillsSection({
  skills,
  catalog,
  mode,
  onAdd,
  onRemove,
  onVerify
}: {
  skills: MemberSkill[]
  catalog: SkillCatalogItem[]
  mode: 'self' | 'admin'
  onAdd: (skillCode: string, seniorityLevel: SkillSeniorityLevel) => Promise<void>
  onRemove: (skillCode: string) => Promise<void>
  onVerify?: (skillCode: string, action: 'verify' | 'unverify') => Promise<void>
}) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const existingSkillCodes = new Set(skills.map(s => s.skillCode))

  // Group skills by category
  const grouped = SKILL_CATEGORY_VALUES.reduce<Record<string, MemberSkill[]>>((acc, cat) => {
    const items = skills.filter(s => s.skillCategory === cat)

    if (items.length > 0) acc[cat] = items

    return acc
  }, {})

  return (
    <>
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title={GH_SKILLS_CERTS.section_skills}
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity', color: 'primary.main' }}>
              <i className='tabler-sparkles' />
            </Avatar>
          }
          action={
            <Button
              size='small'
              variant='tonal'
              startIcon={<i className='tabler-plus' />}
              onClick={() => setShowAddDialog(true)}
            >
              {GH_SKILLS_CERTS.skill_add}
            </Button>
          }
        />
        <Divider />
        <CardContent>
          {skills.length === 0 ? (
            <Stack alignItems='center' spacing={1} sx={{ py: 4 }}>
              <i className='tabler-sparkles text-[28px]' style={{ opacity: 0.3 }} />
              <Typography variant='body2' color='text.secondary'>
                {GH_SKILLS_CERTS.empty_skills_title}
              </Typography>
              <Typography variant='caption' color='text.disabled'>
                {GH_SKILLS_CERTS.empty_skills_description}
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={3}>
              {Object.entries(grouped).map(([category, items]) => (
                <Box key={category}>
                  <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>
                    {CATEGORY_LABELS[category as SkillCategory] ?? category}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {items.map(skill => (
                      <Chip
                        key={skill.skillCode}
                        label={
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            <span>{skill.skillName}</span>
                            <Typography
                              component='span'
                              variant='caption'
                              sx={{
                                bgcolor: 'action.selected',
                                borderRadius: 0.5,
                                px: 0.5,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                textTransform: 'uppercase'
                              }}
                            >
                              {SENIORITY_LABELS[skill.seniorityLevel]}
                            </Typography>
                            {skill.verifiedBy && (
                              <i className='tabler-rosette-discount-check text-[14px]' style={{ color: 'var(--mui-palette-info-main)' }} />
                            )}
                          </Box>
                        }
                        variant='outlined'
                        size='small'
                        onDelete={() => onRemove(skill.skillCode)}
                        deleteIcon={
                          <Tooltip title={GH_SKILLS_CERTS.skill_remove}>
                            <i className='tabler-x text-[14px]' />
                          </Tooltip>
                        }
                        sx={{ '& .MuiChip-label': { display: 'flex', alignItems: 'center' } }}
                      />
                    ))}
                  </Box>
                  {mode === 'admin' && onVerify && (
                    <Stack direction='row' spacing={0.5} sx={{ mt: 1 }}>
                      {items.map(skill => (
                        <Tooltip
                          key={skill.skillCode}
                          title={
                            skill.verifiedBy
                              ? GH_SKILLS_CERTS.unverify_action
                              : GH_SKILLS_CERTS.verify_action
                          }
                        >
                          <IconButton
                            size='small'
                            color={skill.verifiedBy ? 'info' : 'default'}
                            onClick={() =>
                              onVerify(skill.skillCode, skill.verifiedBy ? 'unverify' : 'verify')
                            }
                            aria-label={`${skill.verifiedBy ? GH_SKILLS_CERTS.unverify_action : GH_SKILLS_CERTS.verify_action} ${skill.skillName}`}
                          >
                            <i className={skill.verifiedBy ? 'tabler-rosette-discount-check' : 'tabler-rosette'} />
                          </IconButton>
                        </Tooltip>
                      ))}
                    </Stack>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <AddSkillDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        catalog={catalog}
        existingSkillCodes={existingSkillCodes}
        onSubmit={onAdd}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Certifications Section
// ---------------------------------------------------------------------------

function CertificationsSection({
  certifications,
  mode,
  onAdd,
  onVerify,
  onReject
}: {
  certifications: MemberCertification[]
  mode: 'self' | 'admin'
  onAdd: (data: {
    name: string
    issuer: string
    issuedDate: string | null
    expiryDate: string | null
    validationUrl: string | null
  }) => Promise<void>
  onVerify?: (certificationId: string) => Promise<void>
  onReject?: (certificationId: string, reason: string) => Promise<void>
}) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [previewCert, setPreviewCert] = useState<MemberCertification | null>(null)

  return (
    <>
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title={GH_SKILLS_CERTS.section_certifications}
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity', color: 'success.main' }}>
              <i className='tabler-certificate' />
            </Avatar>
          }
          action={
            <Button
              size='small'
              variant='tonal'
              startIcon={<i className='tabler-plus' />}
              onClick={() => setShowAddDialog(true)}
            >
              {GH_SKILLS_CERTS.cert_add}
            </Button>
          }
        />
        <Divider />
        <CardContent>
          {certifications.length === 0 ? (
            <Stack alignItems='center' spacing={1} sx={{ py: 4 }}>
              <i className='tabler-certificate text-[28px]' style={{ opacity: 0.3 }} />
              <Typography variant='body2' color='text.secondary'>
                {GH_SKILLS_CERTS.empty_certs_title}
              </Typography>
              <Typography variant='caption' color='text.disabled'>
                {GH_SKILLS_CERTS.empty_certs_description}
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2}>
              {certifications.map(cert => {
                const statusConfig = VERIFICATION_STATUS_CONFIG[cert.verificationStatus]

                return (
                  <Card
                    key={cert.certificationId}
                    elevation={0}
                    sx={{
                      border: theme => `1px solid ${theme.palette.divider}`,
                      '&:hover': { boxShadow: theme => theme.shadows[2] }
                    }}
                  >
                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                      <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant='subtitle2' noWrap>
                              {cert.name}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {cert.issuer}
                            </Typography>
                          </Box>
                          <Stack direction='row' spacing={0.5} alignItems='center' flexShrink={0}>
                            <Chip
                              label={statusConfig.label}
                              color={statusConfig.color}
                              size='small'
                              variant='outlined'
                            />
                            {cert.isExpired && (
                              <Chip
                                label={GH_SKILLS_CERTS.cert_expired}
                                color='error'
                                size='small'
                                variant='filled'
                              />
                            )}
                          </Stack>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                          {cert.issuedDate && (
                            <Typography variant='caption' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <i className='tabler-calendar text-[14px]' />
                              {formatDate(cert.issuedDate)}
                            </Typography>
                          )}
                          {cert.expiryDate && (
                            <Typography variant='caption' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <i className='tabler-calendar-due text-[14px]' />
                              {formatDate(cert.expiryDate)}
                            </Typography>
                          )}
                          {cert.verificationStatus === 'verified' && (
                            <VerifiedByEfeonceBadge size='small' />
                          )}
                        </Box>

                        <Stack direction='row' spacing={1} alignItems='center'>
                          {(cert.assetDownloadUrl || cert.assetMimeType) && (
                            <Button
                              size='small'
                              variant='text'
                              startIcon={<i className='tabler-eye' />}
                              onClick={() => setPreviewCert(cert)}
                            >
                              {GH_SKILLS_CERTS.cert_view}
                            </Button>
                          )}
                          {cert.validationUrl && (
                            <Button
                              size='small'
                              variant='text'
                              component='a'
                              href={cert.validationUrl}
                              target='_blank'
                              rel='noreferrer'
                              startIcon={<i className='tabler-external-link' />}
                            >
                              Validar
                            </Button>
                          )}
                          {mode === 'admin' && onVerify && cert.verificationStatus !== 'verified' && (
                            <Button
                              size='small'
                              variant='tonal'
                              color='success'
                              startIcon={<i className='tabler-check' />}
                              onClick={() => onVerify(cert.certificationId)}
                            >
                              {GH_SKILLS_CERTS.verify_action}
                            </Button>
                          )}
                          {mode === 'admin' && onReject && cert.verificationStatus !== 'rejected' && (
                            <Button
                              size='small'
                              variant='tonal'
                              color='error'
                              startIcon={<i className='tabler-x' />}
                              onClick={() => onReject(cert.certificationId, '')}
                            >
                              {GH_SKILLS_CERTS.reject_action}
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                )
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      <AddCertificationDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSubmit={onAdd}
      />

      <CertificatePreviewDialog
        open={previewCert !== null}
        onClose={() => setPreviewCert(null)}
        assetDownloadUrl={previewCert?.assetDownloadUrl ?? null}
        assetMimeType={previewCert?.assetMimeType ?? null}
        certificationName={previewCert?.name ?? ''}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Main Tab Component
// ---------------------------------------------------------------------------

const SkillsCertificationsTab = ({ mode, memberId }: SkillsCertificationsTabProps) => {
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (mode === 'admin') {
        const res = await fetch(`/api/hr/core/members/${memberId}/professional-profile`)

        if (!res.ok) throw new Error('No se pudo cargar el perfil profesional.')

        const profile = await res.json()

        setData({
          skills: profile.skills ?? [],
          catalog: [],
          certifications: profile.certifications ?? [],
          links: profile.professionalLinks ?? {
            linkedinUrl: null,
            portfolioUrl: null,
            twitterUrl: null,
            threadsUrl: null,
            behanceUrl: null,
            githubUrl: null,
            dribbbleUrl: null
          },
          aboutMe: profile.aboutMe ?? null,
          summary: profile.summary ?? {
            skillCount: 0,
            certificationCount: 0,
            verifiedSkillCount: 0,
            verifiedCertCount: 0,
            activeCertCount: 0,
            expiringSoonCount: 0
          }
        })

        // Also fetch catalog for admin add-skill dialog
        const catalogRes = await fetch('/api/my/skills')

        if (catalogRes.ok) {
          const catalogData = await catalogRes.json()

          setData(prev => (prev ? { ...prev, catalog: catalogData.catalog ?? [] } : prev))
        }
      } else {
        const [skillsRes, certsRes, linksRes] = await Promise.all([
          fetch('/api/my/skills'),
          fetch('/api/my/certifications'),
          fetch('/api/my/professional-links')
        ])

        if (!skillsRes.ok || !certsRes.ok || !linksRes.ok) {
          throw new Error('No se pudieron cargar los datos del perfil.')
        }

        const [skillsData, certsData, linksData] = await Promise.all([
          skillsRes.json(),
          certsRes.json(),
          linksRes.json()
        ])

        const skills: MemberSkill[] = skillsData.items ?? []
        const certifications: MemberCertification[] = certsData.items ?? []

        const verifiedSkillCount = skills.filter(s => s.verifiedBy !== null).length
        const verifiedCertCount = certifications.filter(c => c.verificationStatus === 'verified').length
        const activeCertCount = certifications.filter(c => !c.isExpired).length

        const expiringSoonCount = certifications.filter(c => {
          if (!c.expiryDate || c.isExpired) return false

          const diff = new Date(c.expiryDate).getTime() - Date.now()

          return diff > 0 && diff <= 90 * 24 * 60 * 60 * 1000
        }).length

        setData({
          skills,
          catalog: skillsData.catalog ?? [],
          certifications,
          links: linksData.links ?? {
            linkedinUrl: null,
            portfolioUrl: null,
            twitterUrl: null,
            threadsUrl: null,
            behanceUrl: null,
            githubUrl: null,
            dribbbleUrl: null
          },
          aboutMe: linksData.aboutMe ?? null,
          summary: {
            skillCount: skills.length,
            certificationCount: certifications.length,
            verifiedSkillCount,
            verifiedCertCount,
            activeCertCount,
            expiringSoonCount
          }
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos.')
    } finally {
      setLoading(false)
    }
  }, [mode, memberId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- Mutation handlers ---

  const handleAddSkill = async (skillCode: string, seniorityLevel: SkillSeniorityLevel) => {
    const res = await fetch('/api/my/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillCode, seniorityLevel })
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)

      throw new Error(body?.error ?? 'No se pudo agregar la skill.')
    }

    await fetchData()
  }

  const handleRemoveSkill = async (skillCode: string) => {
    const res = await fetch('/api/my/skills', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillCode })
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)

      throw new Error(body?.error ?? 'No se pudo eliminar la skill.')
    }

    await fetchData()
  }

  const handleVerifySkill = async (skillCode: string, action: 'verify' | 'unverify') => {
    const res = await fetch(`/api/hr/core/members/${memberId}/skills`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillCode, action })
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)

      throw new Error(body?.error ?? 'No se pudo actualizar la verificacion.')
    }

    await fetchData()
  }

  const handleAddCertification = async (certData: {
    name: string
    issuer: string
    issuedDate: string | null
    expiryDate: string | null
    validationUrl: string | null
  }) => {
    const res = await fetch('/api/my/certifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(certData)
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)

      throw new Error(body?.error ?? 'No se pudo crear la certificacion.')
    }

    await fetchData()
  }

  const handleVerifyCertification = async (certificationId: string) => {
    const res = await fetch(`/api/hr/core/members/${memberId}/certifications/${certificationId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify' })
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)

      throw new Error(body?.error ?? 'No se pudo verificar la certificacion.')
    }

    await fetchData()
  }

  const handleRejectCertification = async (certificationId: string, reason: string) => {
    const res = await fetch(`/api/hr/core/members/${memberId}/certifications/${certificationId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', rejectionReason: reason || null })
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)

      throw new Error(body?.error ?? 'No se pudo rechazar la certificacion.')
    }

    await fetchData()
  }

  const handleSaveLinks = async (links: Record<string, string | null>) => {
    const res = await fetch('/api/my/professional-links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(links)
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)

      throw new Error(body?.error ?? 'No se pudieron guardar los links.')
    }

    await fetchData()
  }

  const handleSaveAboutMe = async (value: string) => {
    const res = await fetch('/api/my/professional-links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aboutMe: value })
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)

      throw new Error(body?.error ?? 'No se pudo guardar la biografia.')
    }

    await fetchData()
  }

  // --- Loading state ---

  if (loading) {
    return (
      <Stack alignItems='center' justifyContent='center' sx={{ py: 8 }}>
        <CircularProgress size={32} />
        <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
          Cargando perfil profesional...
        </Typography>
      </Stack>
    )
  }

  // --- Error state ---

  if (error) {
    return (
      <Alert
        severity='error'
        action={
          <Button size='small' onClick={fetchData}>
            Reintentar
          </Button>
        }
      >
        {error}
      </Alert>
    )
  }

  if (!data) return null

  const isEditable = mode === 'self'

  // --- Render ---

  return (
    <Grid container spacing={6}>
      {/* Summary counters */}
      <Grid size={{ xs: 12 }}>
        <SummaryCounters summary={data.summary} />
      </Grid>

      {/* Skills section */}
      <Grid size={{ xs: 12, md: 7 }}>
        <Stack spacing={6}>
          <SkillsSection
            skills={data.skills}
            catalog={data.catalog}
            mode={mode}
            onAdd={handleAddSkill}
            onRemove={handleRemoveSkill}
            onVerify={mode === 'admin' ? handleVerifySkill : undefined}
          />
          <CertificationsSection
            certifications={data.certifications}
            mode={mode}
            onAdd={handleAddCertification}
            onVerify={mode === 'admin' ? handleVerifyCertification : undefined}
            onReject={mode === 'admin' ? handleRejectCertification : undefined}
          />
        </Stack>
      </Grid>

      {/* Professional links + About me */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Stack spacing={6}>
          <AboutMeCard value={data.aboutMe} editable={isEditable} onSave={isEditable ? handleSaveAboutMe : undefined} />
          <ProfessionalLinksCard links={data.links} editable={isEditable} onSave={isEditable ? handleSaveLinks : undefined} />
        </Stack>
      </Grid>
    </Grid>
  )
}

export default SkillsCertificationsTab
