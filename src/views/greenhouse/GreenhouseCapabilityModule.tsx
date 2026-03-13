import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { EmptyState, ExecutiveCardShell, ExecutiveHeroCard, MetricStatCard } from '@/components/greenhouse'
import type { CapabilityModuleData } from '@/types/capabilities'

type GreenhouseCapabilityModuleProps = {
  clientName: string
  data: CapabilityModuleData
}

const GreenhouseCapabilityModule = ({ clientName, data }: GreenhouseCapabilityModuleProps) => {
  const hasProjects = data.projects.length > 0
  const hasTools = data.tools.length > 0
  const hasQuality = data.quality.length > 0

  return (
    <Stack spacing={6}>
      <ExecutiveHeroCard
        eyebrow={data.hero.eyebrow}
        title={`${clientName}: ${data.hero.title}`}
        description={data.hero.description}
        highlights={data.hero.highlights}
        summaryLabel={data.hero.summaryLabel}
        summaryValue={data.hero.summaryValue}
        summaryDetail={data.hero.summaryDetail}
        badges={data.hero.badges}
      />

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(3, minmax(0, 1fr))'
          }
        }}
      >
        {data.metrics.map(metric => (
          <MetricStatCard
            key={metric.id}
            chipLabel={metric.chipLabel}
            chipTone={metric.chipTone}
            title={metric.title}
            value={metric.value}
            detail={metric.detail}
          />
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            xl: 'minmax(0, 1.2fr) minmax(0, 0.8fr)'
          }
        }}
      >
        <ExecutiveCardShell
          title='Projects in focus'
          subtitle='Proyectos que explican la lectura ejecutiva de este capability module.'
        >
          {hasProjects ? (
            <List disablePadding>
              {data.projects.map(project => (
                <ListItem
                  key={project.id}
                  disableGutters
                  secondaryAction={
                    <Button component={Link} href={project.href} size='small' variant='text'>
                      Ver proyecto
                    </Button>
                  }
                  sx={{
                    py: 2.25,
                    borderBottom: theme => `1px solid ${theme.palette.divider}`,
                    '&:last-of-type': { borderBottom: 'none', pb: 0 }
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
                        <Typography variant='h6'>{project.name}</Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {project.status}
                        </Typography>
                      </Stack>
                    }
                    secondary={project.detail}
                    secondaryTypographyProps={{ color: 'text.secondary', sx: { mt: 0.5 } }}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <EmptyState
              icon='tabler-folder-search'
              title='Sin proyectos visibles todavia'
              description='Este modulo necesita proyectos en alcance para construir la lectura ejecutiva.'
              minHeight={180}
            />
          )}
        </ExecutiveCardShell>

        <Stack spacing={3}>
          <ExecutiveCardShell title='Tooling visible' subtitle='Stack detectado hoy para este space y capability.'>
            {hasTools ? (
              <List disablePadding>
                {data.tools.map(tool => (
                  <ListItem
                    key={tool.key}
                    disableGutters
                    component={tool.href ? Link : 'div'}
                    href={tool.href || undefined}
                    sx={{
                      py: 1.75,
                      alignItems: 'flex-start',
                      borderBottom: theme => `1px solid ${theme.palette.divider}`,
                      '&:last-of-type': { borderBottom: 'none', pb: 0 },
                      textDecoration: 'none',
                      color: 'inherit'
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
                          <Typography variant='subtitle1'>{tool.label}</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {tool.category}
                          </Typography>
                        </Stack>
                      }
                      secondary={tool.description}
                      secondaryTypographyProps={{ color: 'text.secondary', sx: { mt: 0.5 } }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <EmptyState
                icon='tabler-tool'
                title='Sin tooling visible'
                description='No hay herramientas registradas para esta cuenta dentro del runtime actual.'
                minHeight={180}
              />
            )}
          </ExecutiveCardShell>

          <ExecutiveCardShell title='Quality signal' subtitle='Referencia reciente de RpA y first-time-right cuando existe.'>
            {hasQuality ? (
              <List disablePadding>
                {data.quality.map(item => (
                  <ListItem
                    key={item.month}
                    disableGutters
                    sx={{
                      py: 1.75,
                      borderBottom: theme => `1px solid ${theme.palette.divider}`,
                      '&:last-of-type': { borderBottom: 'none', pb: 0 }
                    }}
                  >
                    <ListItemText
                      primary={<Typography variant='subtitle1'>{item.month}</Typography>}
                      secondary={`RpA: ${item.avgRpa} · First-Time Right: ${item.firstTimeRight}`}
                      secondaryTypographyProps={{ color: 'text.secondary', sx: { mt: 0.5 } }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <EmptyState
                icon='tabler-chart-line'
                title='Sin quality signals suficientes'
                description='La cuenta todavia no entrega una senal de calidad util para este modulo.'
                minHeight={180}
              />
            )}
          </ExecutiveCardShell>
        </Stack>
      </Box>
    </Stack>
  )
}

export default GreenhouseCapabilityModule
