import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import BrandWordmark from '@/components/greenhouse/BrandWordmark'
import EmptyState from '@/components/greenhouse/EmptyState'
import type { ReportArtifactModel } from '@/components/growth/ai-visibility/report-artifact/model'
import { GH_GROWTH_SEO_CLIENT } from '@/lib/copy/growth'
import { selectFeaturedRankSeries } from '@/lib/growth/seo/client/select-featured-series'
import type { SeoAeoQuadrant } from '@/lib/growth/seo/contracts'

export interface SeoReportPrintProps {
  model: ReportArtifactModel
}

const formatPosition = (value: number | null): string => (value === null ? 'Sin dato' : `#${value.toFixed(1)}`)

const SeoReportPrint = ({ model }: SeoReportPrintProps) => {
  const seo = model.surface?.kind === 'seo' ? model.surface.seo : null

  if (!seo) {
    return (
      <EmptyState
        icon='tabler-file-off'
        title={GH_GROWTH_SEO_CLIENT.report.errorTitle}
        description={GH_GROWTH_SEO_CLIENT.report.errorDescription}
      />
    )
  }

  const featuredSeries = seo.rankEvolution ? selectFeaturedRankSeries(seo.rankEvolution.series) : []

  const featuredQuadrants = seo.gap
    ? [...seo.gap.quadrants]
        .sort((left, right) => {
          const priority: Record<SeoAeoQuadrant, number> = { invisible: 0, riesgo: 1, oportunidad: 2, dominante: 3 }

          return priority[left.quadrant] - priority[right.quadrant] || left.rankPosition - right.rankPosition
        })
        .slice(0, 8)
    : []

  const dates = seo.rankEvolution
    ? [...new Set(seo.rankEvolution.series.flatMap(serie => serie.points.map(point => point.date)))].sort()
    : []

  return (
    <Box
      component='article'
      aria-label={`${GH_GROWTH_SEO_CLIENT.report.title} — ${seo.organizationName}`}
      data-capture='seo-client-report-print'
      data-surface-recipe='analyticsReport'
      data-ui-surface='open'
      sx={{
        maxWidth: 900,
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        mx: 'auto',
        p: { xs: 3, md: 6 },
        paddingBlockStart: { xs: 'calc(var(--header-height, 54px) + 72px)', sm: 'calc(var(--header-height, 54px) + 24px)' },
        bgcolor: 'background.paper',
        color: 'text.primary',
        '@media print': {
          paddingBlockStart: 0,
          paddingBlockEnd: 0
        }
      }}
    >
      <Stack spacing={4}>
        <Stack spacing={2} sx={{ borderBlockEnd: '1px solid', borderColor: 'divider', borderInlineStart: '3px solid', borderInlineStartColor: 'primary.main', pb: 4, pl: { xs: 2, md: 3 } }}>
          <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
            <BrandWordmark brand='efeonce' height={20} maxWidth={132} />
            <Typography variant='caption' color='text.secondary'>
              {GH_GROWTH_SEO_CLIENT.report.reportMasthead}
            </Typography>
          </Stack>
          <Typography variant='overline' color='text.secondary'>
            {GH_GROWTH_SEO_CLIENT.report.eyebrow}
          </Typography>
          <Typography variant='surfaceHeroTitle' component='h1'>
            {GH_GROWTH_SEO_CLIENT.report.title}
          </Typography>
          <Typography variant='h5' color='text.primary'>
            {seo.organizationName}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {GH_GROWTH_SEO_CLIENT.page.reportDate(seo.asOfDate ?? 'Sin fecha de corte')}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {GH_GROWTH_SEO_CLIENT.report.reportReadout}
          </Typography>
        </Stack>

        <Divider />

        <Stack spacing={1.5}>
          <Typography variant='overline' color='text.secondary'>
            {GH_GROWTH_SEO_CLIENT.report.eyebrow}
          </Typography>
          <Typography variant='h4' component='h2'>
            {seo.summary.positionAverage === null
              ? GH_GROWTH_SEO_CLIENT.report.emptyTitle
              : `La posición media actual es ${formatPosition(seo.summary.positionAverage)}`}
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            {GH_GROWTH_SEO_CLIENT.report.summary}
          </Typography>
        </Stack>

        <TableContainer data-ui-surface='contained' tabIndex={0} role='region' aria-label={GH_GROWTH_SEO_CLIENT.report.summaryAria}>
          <Table size='small' aria-label={GH_GROWTH_SEO_CLIENT.report.summaryAria}>
            <TableBody>
              <TableRow><TableCell>{GH_GROWTH_SEO_CLIENT.report.metricPosition}</TableCell><TableCell>{formatPosition(seo.summary.positionAverage)}</TableCell></TableRow>
              <TableRow><TableCell>{GH_GROWTH_SEO_CLIENT.report.metricKeywords}</TableCell><TableCell>{seo.summary.keywordCount || 'Sin dato'}</TableCell></TableRow>
              <TableRow><TableCell>{GH_GROWTH_SEO_CLIENT.report.metricPageOne}</TableCell><TableCell>{seo.summary.keywordCount ? seo.summary.pageOneCount : 'Sin dato'}</TableCell></TableRow>
              <TableRow><TableCell>{GH_GROWTH_SEO_CLIENT.report.metricSignals}</TableCell><TableCell>{seo.summary.opportunityCount ?? 'Sin dato'}</TableCell></TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {seo.gap ? (
          <Stack spacing={2} sx={{ breakInside: 'avoid' }}>
            <Typography variant='h5' component='h2'>
              {GH_GROWTH_SEO_CLIENT.report.quadrantTitle}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {GH_GROWTH_SEO_CLIENT.quadrant.orthogonal}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {GH_GROWTH_SEO_CLIENT.report.reportFeaturedSignals(featuredQuadrants.length, seo.gap.quadrants.length)} {GH_GROWTH_SEO_CLIENT.report.reportFullDetail}
            </Typography>
            <TableContainer tabIndex={0} role='region' aria-label={GH_GROWTH_SEO_CLIENT.quadrant.ariaTable}>
              <Table size='small' aria-label={GH_GROWTH_SEO_CLIENT.quadrant.ariaTable}>
                <TableHead>
                  <TableRow><TableCell>Keyword</TableCell><TableCell>SEO</TableCell><TableCell>AEO</TableCell><TableCell>Lectura</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {featuredQuadrants.map(entry => (
                    <TableRow key={`${entry.keyword}-${entry.quadrant}`}>
                      <TableCell>{entry.keyword}</TableCell>
                      <TableCell>{entry.rankPosition.toFixed(1)}</TableCell>
                      <TableCell>{entry.aeoScore.toFixed(0)}</TableCell>
                      <TableCell>{GH_GROWTH_SEO_CLIENT.quadrant.labels[entry.quadrant]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        ) : null}

        {seo.rankEvolution ? (
          <Stack spacing={2} sx={{ breakInside: 'avoid' }}>
            <Typography variant='h5' component='h2'>
              {GH_GROWTH_SEO_CLIENT.report.evolutionTitle}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              La posición 1 es la mejor. Los huecos representan días sin medición. {GH_GROWTH_SEO_CLIENT.evolution.featuredNote(featuredSeries.length, seo.rankEvolution.series.length)}
            </Typography>
            <TableContainer tabIndex={0} role='region' aria-label={GH_GROWTH_SEO_CLIENT.evolution.ariaTable}>
              <Table size='small' aria-label={GH_GROWTH_SEO_CLIENT.evolution.ariaTable}>
                <TableHead>
                  <TableRow><TableCell>Fecha</TableCell><TableCell>{GH_GROWTH_SEO_CLIENT.evolution.printMeasurementsHeader}</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {dates.map(date => (
                    <TableRow key={date}>
                      <TableCell>{date}</TableCell>
                      <TableCell>
                        <Box
                          component='ul'
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                            gap: 0.5,
                            listStyle: 'none',
                            p: 0,
                            m: 0
                          }}
                        >
                          {featuredSeries.map(serie => {
                            const point = serie.points.find(candidate => candidate.date === date)

                            return (
                              <Typography component='li' variant='caption' color='text.primary' key={serie.keyword} sx={{ overflowWrap: 'anywhere' }}>
                                {serie.keyword}: {formatPosition(point?.position ?? null)}
                              </Typography>
                            )
                          })}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        ) : null}

        <Box sx={{ borderBlockStart: '1px solid', borderColor: 'divider', borderInlineStart: '3px solid', borderInlineStartColor: 'primary.main', pt: 2, pl: 2, breakInside: 'avoid' }}>
          <Typography variant='subtitle2' color='text.primary'>{GH_GROWTH_SEO_CLIENT.report.methodology}</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
            {GH_GROWTH_SEO_CLIENT.report.methodologyBody}
          </Typography>
        </Box>
      </Stack>
    </Box>
  )
}

export default SeoReportPrint
