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
import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'
import ProfessionalLinksCard from '@/components/greenhouse/ProfessionalLinksCard'
import AboutMeCard from '@/components/greenhouse/AboutMeCard'
import BrandLogo from '@/components/greenhouse/BrandLogo'
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
import type {
  MemberTool,
  ToolCatalogItem,
  ToolProficiencyLevel,
  ToolCategory,
  MemberLanguage,
  LanguageProficiencyLevel
} from '@/types/talent-taxonomy'
import { SKILL_SENIORITY_LEVELS, SKILL_CATEGORY_VALUES } from '@/types/agency-skills'
import { TOOL_PROFICIENCY_LEVELS, TOOL_CATEGORY_VALUES, LANGUAGE_PROFICIENCY_LEVELS } from '@/types/talent-taxonomy'

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
  tools: MemberTool[]
  toolCatalog: ToolCatalogItem[]
  languages: MemberLanguage[]
  links: ProfessionalLinks
  headline: string | null
  aboutMe: string | null
  summary: {
    skillCount: number
    certificationCount: number
    verifiedSkillCount: number
    verifiedCertCount: number
    activeCertCount: number
    expiringSoonCount: number
    toolCount: number
    languageCount: number
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

const TOOL_CATEGORY_LABELS: Record<ToolCategory, string> = {
  design: 'Diseño',
  development: 'Desarrollo',
  analytics: 'Analítica',
  media: 'Medios',
  project_management: 'Gestión de proyectos',
  collaboration: 'Colaboración',
  content: 'Contenido',
  other: 'Otra'
}

const TOOL_PROFICIENCY_LABELS: Record<ToolProficiencyLevel, string> = {
  beginner: GH_SKILLS_CERTS.tool_proficiency_beginner,
  intermediate: GH_SKILLS_CERTS.tool_proficiency_intermediate,
  advanced: GH_SKILLS_CERTS.tool_proficiency_advanced,
  expert: GH_SKILLS_CERTS.tool_proficiency_expert
}

const LANGUAGE_PROFICIENCY_LABELS: Record<LanguageProficiencyLevel, string> = {
  basic: GH_SKILLS_CERTS.lang_proficiency_basic,
  conversational: GH_SKILLS_CERTS.lang_proficiency_conversational,
  professional: GH_SKILLS_CERTS.lang_proficiency_professional,
  fluent: GH_SKILLS_CERTS.lang_proficiency_fluent,
  native: GH_SKILLS_CERTS.lang_proficiency_native
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
        icon={<i className='tabler-tool' />}
        label={GH_SKILLS_CERTS.summary_tools(summary.toolCount)}
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
        icon={<i className='tabler-language' />}
        label={GH_SKILLS_CERTS.summary_languages(summary.languageCount)}
        variant='outlined'
        size='small'
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
    assetId: string | null
  }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [issuer, setIssuer] = useState('')
  const [issuedDate, setIssuedDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [validationUrl, setValidationUrl] = useState('')
  const [evidenceAsset, setEvidenceAsset] = useState<UploadedFileValue | null>(null)
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
        validationUrl: validationUrl.trim() || null,
        assetId: evidenceAsset?.assetId ?? null
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
    setEvidenceAsset(null)
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
          <GreenhouseFileUploader
            contextType='certification_draft'
            title={GH_SKILLS_CERTS.cert_upload}
            helperText={GH_SKILLS_CERTS.cert_upload_helper}
            emptyTitle='Arrastra tu certificado aquí'
            emptyDescription='PDF, JPG, PNG o WebP hasta 10 MB.'
            browseCta='Seleccionar archivo'
            replaceCta='Reemplazar archivo'
            value={evidenceAsset}
            onChange={setEvidenceAsset}
            disabled={submitting}
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
// Add Tool Dialog
// ---------------------------------------------------------------------------

function AddToolDialog({
  open,
  onClose,
  catalog,
  existingToolCodes,
  onSubmit
}: {
  open: boolean
  onClose: () => void
  catalog: ToolCatalogItem[]
  existingToolCodes: Set<string>
  onSubmit: (toolCode: string, proficiencyLevel: ToolProficiencyLevel) => Promise<void>
}) {
  const [selectedTool, setSelectedTool] = useState<ToolCatalogItem | null>(null)
  const [proficiency, setProficiency] = useState<ToolProficiencyLevel>('intermediate')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const availableCatalog = catalog.filter(t => t.active && !existingToolCodes.has(t.toolCode))

  const handleSubmit = async () => {
    if (!selectedTool) return

    setSubmitting(true)
    setError(null)

    try {
      await onSubmit(selectedTool.toolCode, proficiency)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar la herramienta.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedTool(null)
    setProficiency('intermediate')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm' aria-labelledby='add-tool-dialog-title'>
      <DialogTitle id='add-tool-dialog-title'>{GH_SKILLS_CERTS.tool_add}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Autocomplete
            options={availableCatalog}
            getOptionLabel={option => option.toolName}
            groupBy={option => TOOL_CATEGORY_LABELS[option.toolCategory] ?? option.toolCategory}
            value={selectedTool}
            onChange={(_, value) => setSelectedTool(value)}
            renderOption={(props, option) => (
              <Box component='li' {...props} key={option.toolCode} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {option.iconKey ? (
                  <BrandLogo brand={option.iconKey} size={24} />
                ) : (
                  <i className='tabler-tool text-[18px]' style={{ opacity: 0.5 }} />
                )}
                <span>{option.toolName}</span>
              </Box>
            )}
            renderInput={params => (
              <TextField {...params} label='Herramienta' placeholder='Buscar herramienta...' />
            )}
            disabled={submitting}
            noOptionsText='No hay herramientas disponibles'
          />
          <TextField
            select
            label={GH_SKILLS_CERTS.tool_proficiency}
            value={proficiency}
            onChange={e => setProficiency(e.target.value as ToolProficiencyLevel)}
            disabled={submitting}
            size='small'
          >
            {TOOL_PROFICIENCY_LEVELS.map(level => (
              <MenuItem key={level} value={level}>
                {TOOL_PROFICIENCY_LABELS[level]}
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
        <Button variant='contained' onClick={handleSubmit} disabled={!selectedTool || submitting}>
          {submitting ? 'Guardando...' : GH_SKILLS_CERTS.tool_add}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Tools Section
// ---------------------------------------------------------------------------

function ToolsSection({
  tools,
  catalog,
  mode,
  onAdd,
  onRemove,
  onVerify
}: {
  tools: MemberTool[]
  catalog: ToolCatalogItem[]
  mode: 'self' | 'admin'
  onAdd: (toolCode: string, proficiencyLevel: ToolProficiencyLevel) => Promise<void>
  onRemove: (toolCode: string) => Promise<void>
  onVerify?: (toolCode: string, action: 'verify' | 'unverify') => Promise<void>
}) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const existingToolCodes = new Set(tools.map(t => t.toolCode))

  // Group tools by category
  const grouped = TOOL_CATEGORY_VALUES.reduce<Record<string, MemberTool[]>>((acc, cat) => {
    const items = tools.filter(t => t.toolCategory === cat)

    if (items.length > 0) acc[cat] = items

    return acc
  }, {})

  return (
    <>
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title={GH_SKILLS_CERTS.section_tools}
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity', color: 'warning.main' }}>
              <i className='tabler-tool' />
            </Avatar>
          }
          action={
            <Button
              size='small'
              variant='tonal'
              startIcon={<i className='tabler-plus' />}
              onClick={() => setShowAddDialog(true)}
            >
              {GH_SKILLS_CERTS.tool_add}
            </Button>
          }
        />
        <Divider />
        <CardContent>
          {tools.length === 0 ? (
            <Stack alignItems='center' spacing={1} sx={{ py: 4 }}>
              <i className='tabler-tool text-[28px]' style={{ opacity: 0.3 }} />
              <Typography variant='body2' color='text.secondary'>
                {GH_SKILLS_CERTS.empty_tools_title}
              </Typography>
              <Typography variant='caption' color='text.disabled'>
                {GH_SKILLS_CERTS.empty_tools_description}
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={3}>
              {Object.entries(grouped).map(([category, items]) => (
                <Box key={category}>
                  <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>
                    {TOOL_CATEGORY_LABELS[category as ToolCategory] ?? category}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {items.map(tool => (
                      <Chip
                        key={tool.toolCode}
                        icon={
                          tool.iconKey ? (
                            <BrandLogo brand={tool.iconKey} size={20} />
                          ) : undefined
                        }
                        label={
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            <span>{tool.toolName}</span>
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
                              {TOOL_PROFICIENCY_LABELS[tool.proficiencyLevel]}
                            </Typography>
                            {tool.verifiedBy && (
                              <i className='tabler-rosette-discount-check text-[14px]' style={{ color: 'var(--mui-palette-info-main)' }} />
                            )}
                          </Box>
                        }
                        variant='outlined'
                        size='small'
                        onDelete={() => onRemove(tool.toolCode)}
                        deleteIcon={
                          <Tooltip title={GH_SKILLS_CERTS.tool_remove}>
                            <i className='tabler-x text-[14px]' />
                          </Tooltip>
                        }
                        sx={{ '& .MuiChip-label': { display: 'flex', alignItems: 'center' } }}
                      />
                    ))}
                  </Box>
                  {mode === 'admin' && onVerify && (
                    <Stack direction='row' spacing={0.5} sx={{ mt: 1 }}>
                      {items.map(tool => (
                        <Tooltip
                          key={tool.toolCode}
                          title={
                            tool.verifiedBy
                              ? GH_SKILLS_CERTS.unverify_action
                              : GH_SKILLS_CERTS.verify_action
                          }
                        >
                          <IconButton
                            size='small'
                            color={tool.verifiedBy ? 'info' : 'default'}
                            onClick={() =>
                              onVerify(tool.toolCode, tool.verifiedBy ? 'unverify' : 'verify')
                            }
                            aria-label={`${tool.verifiedBy ? GH_SKILLS_CERTS.unverify_action : GH_SKILLS_CERTS.verify_action} ${tool.toolName}`}
                          >
                            <i className={tool.verifiedBy ? 'tabler-rosette-discount-check' : 'tabler-rosette'} />
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

      <AddToolDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        catalog={catalog}
        existingToolCodes={existingToolCodes}
        onSubmit={onAdd}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Add Language Dialog
// ---------------------------------------------------------------------------

const COMMON_LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'Inglés' },
  { code: 'pt', name: 'Portugués' },
  { code: 'fr', name: 'Francés' },
  { code: 'de', name: 'Alemán' },
  { code: 'it', name: 'Italiano' },
  { code: 'zh', name: 'Chino mandarín' },
  { code: 'ja', name: 'Japonés' },
  { code: 'ko', name: 'Coreano' },
  { code: 'ar', name: 'Árabe' },
  { code: 'ru', name: 'Ruso' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Holandés' },
  { code: 'sv', name: 'Sueco' },
  { code: 'da', name: 'Danés' },
  { code: 'no', name: 'Noruego' },
  { code: 'fi', name: 'Finlandés' },
  { code: 'pl', name: 'Polaco' },
  { code: 'tr', name: 'Turco' },
  { code: 'he', name: 'Hebreo' },
  { code: 'th', name: 'Tailandés' },
  { code: 'vi', name: 'Vietnamita' },
  { code: 'uk', name: 'Ucraniano' },
  { code: 'cs', name: 'Checo' },
  { code: 'ro', name: 'Rumano' },
  { code: 'hu', name: 'Húngaro' },
  { code: 'el', name: 'Griego' },
  { code: 'id', name: 'Indonesio' },
  { code: 'ms', name: 'Malayo' },
  { code: 'ca', name: 'Catalán' }
] as const

function AddLanguageDialog({
  open,
  onClose,
  existingLanguageCodes,
  onSubmit
}: {
  open: boolean
  onClose: () => void
  existingLanguageCodes: Set<string>
  onSubmit: (languageCode: string, languageName: string, proficiencyLevel: LanguageProficiencyLevel) => Promise<void>
}) {
  const [selected, setSelected] = useState<(typeof COMMON_LANGUAGES)[number] | null>(null)
  const [proficiency, setProficiency] = useState<LanguageProficiencyLevel>('professional')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const availableLanguages = COMMON_LANGUAGES.filter(l => !existingLanguageCodes.has(l.code))

  const handleSubmit = async () => {
    if (!selected) return

    setSubmitting(true)
    setError(null)

    try {
      await onSubmit(selected.code, selected.name, proficiency)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el idioma.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelected(null)
    setProficiency('professional')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm' aria-labelledby='add-lang-dialog-title'>
      <DialogTitle id='add-lang-dialog-title'>{GH_SKILLS_CERTS.lang_add}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Autocomplete
            options={availableLanguages}
            getOptionLabel={opt => opt.name}
            value={selected}
            onChange={(_, value) => setSelected(value)}
            disabled={submitting}
            renderInput={params => (
              <TextField {...params} label='Idioma' required placeholder='Buscar idioma...' size='small' />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.code}>
                <Stack direction='row' spacing={1} alignItems='center'>
                  <Typography variant='body2' color='text.secondary' sx={{ minWidth: 24, fontFamily: 'monospace' }}>
                    {option.code}
                  </Typography>
                  <Typography variant='body2'>{option.name}</Typography>
                </Stack>
              </li>
            )}
            noOptionsText='Sin idiomas disponibles'
          />
          <TextField
            select
            label={GH_SKILLS_CERTS.lang_proficiency}
            value={proficiency}
            onChange={e => setProficiency(e.target.value as LanguageProficiencyLevel)}
            disabled={submitting}
            size='small'
          >
            {LANGUAGE_PROFICIENCY_LEVELS.map(level => (
              <MenuItem key={level} value={level}>
                {LANGUAGE_PROFICIENCY_LABELS[level]}
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
        <Button
          variant='contained'
          onClick={handleSubmit}
          disabled={!selected || submitting}
        >
          {submitting ? 'Guardando...' : GH_SKILLS_CERTS.lang_add}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Languages Section
// ---------------------------------------------------------------------------

function LanguagesSection({
  languages,
  onAdd,
  onRemove
}: {
  languages: MemberLanguage[]
  onAdd: (languageCode: string, languageName: string, proficiencyLevel: LanguageProficiencyLevel) => Promise<void>
  onRemove: (languageCode: string) => Promise<void>
}) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const existingLanguageCodes = new Set(languages.map(l => l.languageCode))

  return (
    <>
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title={GH_SKILLS_CERTS.section_languages}
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity', color: 'info.main' }}>
              <i className='tabler-language' />
            </Avatar>
          }
          action={
            <Button
              size='small'
              variant='tonal'
              startIcon={<i className='tabler-plus' />}
              onClick={() => setShowAddDialog(true)}
            >
              {GH_SKILLS_CERTS.lang_add}
            </Button>
          }
        />
        <Divider />
        <CardContent>
          {languages.length === 0 ? (
            <Stack alignItems='center' spacing={1} sx={{ py: 4 }}>
              <i className='tabler-language text-[28px]' style={{ opacity: 0.3 }} />
              <Typography variant='body2' color='text.secondary'>
                {GH_SKILLS_CERTS.empty_languages_title}
              </Typography>
              <Typography variant='caption' color='text.disabled'>
                {GH_SKILLS_CERTS.empty_languages_description}
              </Typography>
            </Stack>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {languages.map(lang => (
                <Chip
                  key={lang.languageCode}
                  label={
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      <span>{lang.languageName}</span>
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
                        {LANGUAGE_PROFICIENCY_LABELS[lang.proficiencyLevel]}
                      </Typography>
                    </Box>
                  }
                  variant='outlined'
                  size='small'
                  onDelete={() => onRemove(lang.languageCode)}
                  deleteIcon={
                    <Tooltip title={GH_SKILLS_CERTS.lang_remove}>
                      <i className='tabler-x text-[14px]' />
                    </Tooltip>
                  }
                  sx={{ '& .MuiChip-label': { display: 'flex', alignItems: 'center' } }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      <AddLanguageDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        existingLanguageCodes={existingLanguageCodes}
        onSubmit={onAdd}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Headline Card
// ---------------------------------------------------------------------------

function HeadlineCard({
  value,
  editable,
  onSave
}: {
  value: string | null
  editable: boolean
  onSave?: (value: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const MAX_HEADLINE_CHARS = 120

  const handleEdit = () => {
    setDraft(value ?? '')
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
      await onSave(draft.trim())
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title={GH_SKILLS_CERTS.section_headline}
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
          <Stack spacing={1}>
            <TextField
              value={draft}
              onChange={e => {
                if (e.target.value.length <= MAX_HEADLINE_CHARS) {
                  setDraft(e.target.value)
                }
              }}
              placeholder={GH_SKILLS_CERTS.headline_placeholder}
              fullWidth
              size='small'
              disabled={saving}
              slotProps={{
                htmlInput: { maxLength: MAX_HEADLINE_CHARS }
              }}
            />
            <Typography variant='caption' color='text.secondary' textAlign='right'>
              {draft.length} / {MAX_HEADLINE_CHARS}
            </Typography>
            {error && <Alert severity='error'>{error}</Alert>}
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardHeader
        title={GH_SKILLS_CERTS.section_headline}
        action={
          editable ? (
            <IconButton size='small' onClick={handleEdit} aria-label='Editar titular profesional'>
              <i className='tabler-pencil' />
            </IconButton>
          ) : undefined
        }
      />
      <CardContent>
        {value ? (
          <Typography variant='body2' color='text.secondary' fontStyle='italic'>
            {value}
          </Typography>
        ) : (
          <Typography variant='body2' color='text.disabled'>
            {GH_SKILLS_CERTS.headline_placeholder}
          </Typography>
        )}
      </CardContent>
    </Card>
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
    assetId: string | null
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
          tools: profile.tools ?? [],
          toolCatalog: [],
          languages: profile.languages ?? [],
          links: profile.professionalLinks ?? {
            linkedinUrl: null,
            portfolioUrl: null,
            twitterUrl: null,
            threadsUrl: null,
            behanceUrl: null,
            githubUrl: null,
            dribbbleUrl: null
          },
          headline: profile.headline ?? null,
          aboutMe: profile.aboutMe ?? null,
          summary: profile.summary ?? {
            skillCount: 0,
            certificationCount: 0,
            verifiedSkillCount: 0,
            verifiedCertCount: 0,
            activeCertCount: 0,
            expiringSoonCount: 0,
            toolCount: 0,
            languageCount: 0
          }
        })

        // Also fetch catalogs for admin add dialogs
        const [skillCatalogRes, toolCatalogRes] = await Promise.all([
          fetch('/api/my/skills'),
          fetch('/api/my/tools')
        ])

        if (skillCatalogRes.ok || toolCatalogRes.ok) {
          const [skillCatalogData, toolCatalogData] = await Promise.all([
            skillCatalogRes.ok ? skillCatalogRes.json() : { catalog: [] },
            toolCatalogRes.ok ? toolCatalogRes.json() : { catalog: [] }
          ])

          setData(prev =>
            prev
              ? {
                  ...prev,
                  catalog: skillCatalogData.catalog ?? [],
                  toolCatalog: toolCatalogData.catalog ?? []
                }
              : prev
          )
        }
      } else {
        const [skillsRes, certsRes, linksRes, toolsRes, langsRes] = await Promise.all([
          fetch('/api/my/skills'),
          fetch('/api/my/certifications'),
          fetch('/api/my/professional-links'),
          fetch('/api/my/tools'),
          fetch('/api/my/languages')
        ])

        if (!skillsRes.ok || !certsRes.ok || !linksRes.ok) {
          throw new Error('No se pudieron cargar los datos del perfil.')
        }

        const [skillsData, certsData, linksData, toolsData, langsData] = await Promise.all([
          skillsRes.json(),
          certsRes.json(),
          linksRes.json(),
          toolsRes.ok ? toolsRes.json() : { items: [], catalog: [] },
          langsRes.ok ? langsRes.json() : { items: [] }
        ])

        const skills: MemberSkill[] = skillsData.items ?? []
        const certifications: MemberCertification[] = certsData.items ?? []
        const tools: MemberTool[] = toolsData.items ?? []
        const languages: MemberLanguage[] = langsData.items ?? []

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
          tools,
          toolCatalog: toolsData.catalog ?? [],
          languages,
          links: linksData.links ?? {
            linkedinUrl: null,
            portfolioUrl: null,
            twitterUrl: null,
            threadsUrl: null,
            behanceUrl: null,
            githubUrl: null,
            dribbbleUrl: null
          },
          headline: linksData.headline ?? null,
          aboutMe: linksData.aboutMe ?? null,
          summary: {
            skillCount: skills.length,
            certificationCount: certifications.length,
            verifiedSkillCount,
            verifiedCertCount,
            activeCertCount,
            expiringSoonCount,
            toolCount: tools.length,
            languageCount: languages.length
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
    assetId: string | null
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

  const handleSaveHeadline = async (value: string) => {
    const res = await fetch('/api/my/professional-links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headline: value })
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)

      throw new Error(body?.error ?? 'No se pudo guardar el titular.')
    }

    await fetchData()
  }

  // --- Tool mutation handlers ---

  const handleAddTool = async (toolCode: string, proficiencyLevel: ToolProficiencyLevel) => {
    const url =
      mode === 'admin'
        ? `/api/hr/core/members/${memberId}/tools`
        : '/api/my/tools'

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolCode, proficiencyLevel })
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)

      throw new Error(body?.error ?? 'No se pudo agregar la herramienta.')
    }

    await fetchData()
  }

  const handleRemoveTool = async (toolCode: string) => {
    const url =
      mode === 'admin'
        ? `/api/hr/core/members/${memberId}/tools`
        : '/api/my/tools'

    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolCode })
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)

      throw new Error(body?.error ?? 'No se pudo eliminar la herramienta.')
    }

    await fetchData()
  }

  const handleVerifyTool = async (toolCode: string, action: 'verify' | 'unverify') => {
    const res = await fetch(`/api/hr/core/members/${memberId}/tools`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolCode, action })
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)

      throw new Error(body?.error ?? 'No se pudo actualizar la verificacion.')
    }

    await fetchData()
  }

  // --- Language mutation handlers ---

  const handleAddLanguage = async (
    languageCode: string,
    languageName: string,
    proficiencyLevel: LanguageProficiencyLevel
  ) => {
    const url =
      mode === 'admin'
        ? `/api/hr/core/members/${memberId}/languages`
        : '/api/my/languages'

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ languageCode, languageName, proficiencyLevel })
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)

      throw new Error(body?.error ?? 'No se pudo agregar el idioma.')
    }

    await fetchData()
  }

  const handleRemoveLanguage = async (languageCode: string) => {
    const url =
      mode === 'admin'
        ? `/api/hr/core/members/${memberId}/languages`
        : '/api/my/languages'

    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ languageCode })
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)

      throw new Error(body?.error ?? 'No se pudo eliminar el idioma.')
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

      {/* Skills + Tools + Certifications + Languages */}
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
          <ToolsSection
            tools={data.tools}
            catalog={data.toolCatalog}
            mode={mode}
            onAdd={handleAddTool}
            onRemove={handleRemoveTool}
            onVerify={mode === 'admin' ? handleVerifyTool : undefined}
          />
          <CertificationsSection
            certifications={data.certifications}
            mode={mode}
            onAdd={handleAddCertification}
            onVerify={mode === 'admin' ? handleVerifyCertification : undefined}
            onReject={mode === 'admin' ? handleRejectCertification : undefined}
          />
          <LanguagesSection
            languages={data.languages}
            onAdd={handleAddLanguage}
            onRemove={handleRemoveLanguage}
          />
        </Stack>
      </Grid>

      {/* Headline + About me + Professional links */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Stack spacing={6}>
          <HeadlineCard value={data.headline} editable={isEditable} onSave={isEditable ? handleSaveHeadline : undefined} />
          <AboutMeCard value={data.aboutMe} editable={isEditable} onSave={isEditable ? handleSaveAboutMe : undefined} />
          <ProfessionalLinksCard links={data.links} editable={isEditable} onSave={isEditable ? handleSaveLinks : undefined} />
        </Stack>
      </Grid>
    </Grid>
  )
}

export default SkillsCertificationsTab
