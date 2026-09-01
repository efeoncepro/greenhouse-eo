'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GreenhouseChip } from '@/components/greenhouse/primitives'
import { GH_GROWTH_SEO_AUDIT } from '@/lib/copy/growth'
import type { SeoSiteAuditFindingSeverity } from '@/lib/growth/seo/contracts'

import type { SeoAuditIssueGroup } from './group-audit-issues'

/**
 * TASK-1671 — Región de hallazgos de SITIO (dominio) del audit SEO.
 *
 * Existe porque la lista de abajo prioriza por "N páginas afectadas" y un `robots.txt` no
 * pertenece a una página: pertenece al dominio. Renderizarlo en esa lista lo rotularía con un
 * número falso y lo hundiría dentro de su propio tier.
 *
 * Tres reglas que esta región tiene que sostener, y que son la razón de que exista
 * (contrato: `docs/ui/wireframes/TASK-1671-growth-seo-site-findings-audit-surface.md`):
 *
 *  1. **El bloqueo de ENTRENAMIENTO no se ve como un defecto.** Es una decisión de derechos
 *     sobre el contenido, legítima y frecuente. Lleva etiqueta textual propia («Decisión
 *     declarada») en lugar del genérico «Info»: `notice` describe PRIORIDAD y acá hace falta
 *     describir NATURALEZA. Distinguirlo por matiz de color sería invisible para un daltónico
 *     y, peor, seguiría leyéndose como una falla menor.
 *  2. **«Verificado» sólo si de verdad se midió.** Esta región no se renderiza cuando el run no
 *     trae filas de dominio; ese caso se decide en el caller leyendo el dato, jamás consultando
 *     el feature flag desde el cliente. Cero hallazgos tiene dos causas opuestas —está sano o no
 *     lo miramos— y colapsarlas reintroduce en la UI el falso sano que TASK-1670 cerró.
 *  3. **Siempre se dice DÓNDE se detectó.** Un cliente que lee «bloqueas crawlers de IA», abre su
 *     `robots.txt`, lo ve limpio y concluye que el informe está equivocado — y con él, el resto
 *     del reporte. El lugar es la mitad que sostiene la credibilidad, y por eso va en la fila y
 *     no en un tooltip: este texto viaja al artefacto descargable de TASK-1672.
 */

/** `issue_type` del hallazgo que es POSTURA declarada, no defecto (TASK-1670). */
const POSTURE_ISSUE_TYPE = 'ai_training_crawlers_blocked'

/** `issue_type` del hueco de medición: ni sano ni roto. */
const UNVERIFIED_ISSUE_TYPE = 'site_check_unverified'

/** Cuántos agentes se nombran completos antes de acotar. Cinco tokens crudos no se leen. */
const AGENTS_INLINE_LIMIT = 2

const SEVERITY_PRESENTATION: Record<
  SeoSiteAuditFindingSeverity,
  { icon: string; label: string; tone: 'error' | 'warning' | 'info' }
> = {
  critical: { icon: 'tabler-alert-octagon', label: GH_GROWTH_SEO_AUDIT.severity.critical, tone: 'error' },
  warning: { icon: 'tabler-alert-triangle', label: GH_GROWTH_SEO_AUDIT.severity.warning, tone: 'warning' },
  notice: { icon: 'tabler-info-circle', label: GH_GROWTH_SEO_AUDIT.severity.notice, tone: 'info' }
}

/**
 * Dónde se detectó el hallazgo, derivado del `source` que el evaluador persiste.
 *
 * Devuelve `null` cuando el dato no lo trae: se omite la línea en vez de inventar un lugar.
 * Afirmar «En robots.txt» sobre un hallazgo cuyo origen no conocemos es el mismo modo de falla
 * que esta región combate, con el signo cambiado.
 */
export const detectionPlace = (detail: Record<string, unknown>): string | null => {
  switch (detail.source) {
    case 'robots_txt':
      return GH_GROWTH_SEO_AUDIT.site.whereRobots
    case 'edge':
      return GH_GROWTH_SEO_AUDIT.site.whereEdge
    case 'home_html':
      return GH_GROWTH_SEO_AUDIT.site.whereHome
    case 'robots_txt_directive':
      return GH_GROWTH_SEO_AUDIT.site.whereSitemap
    default:
      // `sitemap_missing` no declara `source`: se comprobó la ruta convencional del sitio.
      return typeof detail.checkedPath === 'string' ? GH_GROWTH_SEO_AUDIT.site.whereSitemap : null
  }
}

/** Lista acotada de agentes bloqueados. `null` si el hallazgo no nombra ninguno. */
export const blockedAgentsLabel = (detail: Record<string, unknown>): string | null => {
  const blocked = Array.isArray(detail.blocked) ? detail.blocked.filter(item => typeof item === 'string') : []

  if (blocked.length === 0) {
    return null
  }

  if (blocked.length <= AGENTS_INLINE_LIMIT) {
    return GH_GROWTH_SEO_AUDIT.site.blockedAgentsAll(blocked.join(', '))
  }

  return GH_GROWTH_SEO_AUDIT.site.blockedAgents(blocked[0] as string, blocked.length - 1)
}

/** Nombre legible del chequeo que no se pudo verificar. */
export const unverifiedCheckLabel = (detail: Record<string, unknown>): string | null => {
  switch (detail.check) {
    case 'ai_crawler_access':
      return GH_GROWTH_SEO_AUDIT.site.checkAiAccess
    case 'edge_access':
      return GH_GROWTH_SEO_AUDIT.site.checkEdge
    case 'structured_data':
      return GH_GROWTH_SEO_AUDIT.site.checkStructuredData
    case 'sitemap':
      return GH_GROWTH_SEO_AUDIT.site.checkSitemap
    default:
      return null
  }
}

interface Props {
  /** Grupos de alcance `site`, ya ordenados por `groupAuditIssues`. */
  groups: readonly SeoAuditIssueGroup[]
}

const SiteAuditSiteFindings = ({ groups }: Props) => {
  // El hueco de medición NO es un hallazgo: se separa para que no compita en peso visual.
  const findings = groups.filter(group => group.issueType !== UNVERIFIED_ISSUE_TYPE)
  const unverified = groups.filter(group => group.issueType === UNVERIFIED_ISSUE_TYPE)

  // 🔴 "Verificado" exige que NO haya huecos: con un chequeo sin medir, declarar el sitio sano
  // es exactamente el falso sano que TASK-1670 cerró en el motor, reintroducido acá. Detectado
  // por su test — la primera versión mostraba "Verificado" y "No pudimos verificar" a la vez.

  const row = (group: SeoAuditIssueGroup, index: number) => {
    const severity = SEVERITY_PRESENTATION[group.severity]
    const isPosture = group.issueType === POSTURE_ISSUE_TYPE
    const detail = group.findings[0]?.detail ?? {}
    const place = detectionPlace(detail)
    const agents = blockedAgentsLabel(detail)

    // El hallazgo de borde nombra que el robots está limpio: sin esa mitad, el cliente lo
    // confunde con el hallazgo de robots y busca el problema en el archivo equivocado.
    const edgeNote = detail.robotsAllowsCrawlers === true ? GH_GROWTH_SEO_AUDIT.site.edgeCleanRobots : null
    const context = [place, agents, edgeNote].filter(Boolean).join(' · ')

    return (
      <Box component='li' key={group.issueType} sx={{ listStyle: 'none' }}>
        {index > 0 ? <Divider /> : null}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2, sm: 4 }}
          alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
          sx={{ py: 3, px: { xs: 0, sm: 1 } }}
        >
          <Box sx={{ flexShrink: 0, minInlineSize: { sm: 160 } }}>
            <GreenhouseChip
              kind='status'
              size='small'
              tone={severity.tone}
              iconClassName={severity.icon}
              // La etiqueta de postura viaja DENTRO del chip, como texto: es la única
              // diferencia con un defecto y no puede depender del color.
              label={isPosture ? GH_GROWTH_SEO_AUDIT.site.postureLabel : severity.label}
            />
          </Box>

          <Stack spacing={0.5} sx={{ flex: 1, minInlineSize: 0 }}>
            <Typography variant='body1' fontWeight={600}>
              {group.label}
            </Typography>
            {context ? (
              <Typography variant='caption' color='text.secondary'>
                {context}
              </Typography>
            ) : null}
            {group.hint ? (
              // Inline, nunca tooltip: en el hallazgo de postura este texto ES lo que impide
              // leerlo como falla, y además viaja al artefacto descargable.
              <Typography variant='body2' color='text.secondary'>
                {group.hint}
              </Typography>
            ) : null}
          </Stack>

          {/* Ocupa el lugar donde una fila de página dice "N páginas afectadas". Misma
              posición, misma función: declarar alcance. Sin `[Ver →]`: un hallazgo de
              dominio no tiene URLs que abrir, y un botón que no lleva a ninguna parte es
              una promesa rota. */}
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'flex-start' }, pt: { sm: 1 } }}
          >
            {GH_GROWTH_SEO_AUDIT.site.scopeLabel}
          </Typography>
        </Stack>
      </Box>
    )
  }

  return (
    <Card data-capture='seo-audit-site-findings'>
      <CardContent>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography variant='h5' component='h2'>
            {GH_GROWTH_SEO_AUDIT.site.title}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {GH_GROWTH_SEO_AUDIT.site.subtitle}
          </Typography>
        </Stack>

        {findings.length > 0 ? (
          <Box component='ul' sx={{ m: 0, p: 0 }} aria-label={GH_GROWTH_SEO_AUDIT.site.regionAria}>
            {findings.map((group, index) => row(group, index))}
          </Box>
        ) : unverified.length > 0 ? null : (
          // Densidad confirmación. NO es un empty state: es un resultado positivo MEDIDO, y
          // decirlo es el entregable — hasta esta task el silencio significaba "no lo miramos".
          <Stack direction='row' spacing={3} alignItems='flex-start' sx={{ py: 2 }}>
            <GreenhouseChip
              kind='status'
              size='small'
              tone='success'
              iconClassName='tabler-circle-check'
              label={GH_GROWTH_SEO_AUDIT.site.verified}
            />
            <Typography variant='body2' color='text.secondary'>
              {GH_GROWTH_SEO_AUDIT.site.verifiedHint}
            </Typography>
          </Stack>
        )}

        {unverified.length > 0 ? (
          <Stack spacing={0.5} sx={{ mt: findings.length > 0 ? 3 : 2, pt: 3 }} component='section'>
            <Divider sx={{ mb: 3 }} />
            {/* Menor peso que un hallazgo y SIN chip de severidad: darle uno lo igualaría a un
                problema, y esto no es ni sano ni roto — es un hueco declarado. */}
            <Typography variant='caption' color='text.secondary' fontWeight={600}>
              {GH_GROWTH_SEO_AUDIT.site.unverifiedTitle}
            </Typography>
            {unverified.flatMap(group =>
              group.findings.map(finding => {
                const check = unverifiedCheckLabel(finding.detail)
                const reason = typeof finding.detail.reason === 'string' ? finding.detail.reason : null

                if (!check || !reason) {
                  return null
                }

                return (
                  <Typography key={`${check}-${reason}`} variant='caption' color='text.secondary'>
                    {GH_GROWTH_SEO_AUDIT.site.unverifiedItem(check, reason)}
                  </Typography>
                )
              })
            )}
          </Stack>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default SiteAuditSiteFindings
