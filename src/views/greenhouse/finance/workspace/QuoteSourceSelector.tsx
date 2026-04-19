'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

import { GH_PRICING } from '@/config/greenhouse-nomenclature'

export interface QuoteSourceSelectorProps {
  onCatalog: () => void
  onService: () => void
  onTemplate: () => void
  onManual: () => void
  disabled?: boolean
}

type SourceKey = 'catalog' | 'service' | 'template' | 'manual'

type SourceMeta = {
  key: SourceKey
  title: string
  subtitle: string
  icon: string
  color: 'primary' | 'success' | 'info' | 'secondary'
}

const SOURCES: SourceMeta[] = [
  {
    key: 'catalog',
    title: GH_PRICING.builderSources.catalog.title,
    subtitle: GH_PRICING.builderSources.catalog.subtitle,
    icon: GH_PRICING.builderSources.catalog.icon,
    color: GH_PRICING.builderSources.catalog.color
  },
  {
    key: 'service',
    title: GH_PRICING.builderSources.service.title,
    subtitle: GH_PRICING.builderSources.service.subtitle,
    icon: GH_PRICING.builderSources.service.icon,
    color: GH_PRICING.builderSources.service.color
  },
  {
    key: 'template',
    title: GH_PRICING.builderSources.template.title,
    subtitle: GH_PRICING.builderSources.template.subtitle,
    icon: GH_PRICING.builderSources.template.icon,
    color: GH_PRICING.builderSources.template.color
  },
  {
    key: 'manual',
    title: GH_PRICING.builderSources.manual.title,
    subtitle: GH_PRICING.builderSources.manual.subtitle,
    icon: GH_PRICING.builderSources.manual.icon,
    color: GH_PRICING.builderSources.manual.color
  }
]

const QuoteSourceSelector = ({
  onCatalog,
  onService,
  onTemplate,
  onManual,
  disabled = false
}: QuoteSourceSelectorProps) => {
  const handlers: Record<SourceKey, () => void> = {
    catalog: onCatalog,
    service: onService,
    template: onTemplate,
    manual: onManual
  }

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardHeader
        title={GH_PRICING.builderSourcesCardTitle}
        subheader={GH_PRICING.builderSourcesCardSubtitle}
        avatar={
          <CustomAvatar variant='rounded' skin='light' color='primary'>
            <i className='tabler-layout-grid-add' aria-hidden='true' />
          </CustomAvatar>
        }
      />
      <Divider />
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {SOURCES.map(source => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={source.key}>
              <Card
                elevation={0}
                sx={theme => ({
                  height: '100%',
                  border: `1px solid ${theme.palette.divider}`,
                  transition: theme.transitions.create(['border-color', 'box-shadow', 'transform']),
                  '&:hover': {
                    borderColor: theme.palette[source.color].main,
                    boxShadow: theme.shadows[2]
                  },
                  opacity: disabled ? 0.6 : 1
                })}
              >
                <CardActionArea
                  onClick={handlers[source.key]}
                  disabled={disabled}
                  aria-label={`${source.title} — ${source.subtitle}`}
                  sx={{ height: '100%', p: 2.5 }}
                >
                  <Stack spacing={1.5} alignItems='flex-start'>
                    <CustomAvatar
                      variant='rounded'
                      skin='light'
                      color={source.color}
                      size={44}
                    >
                      <i className={source.icon} aria-hidden='true' style={{ fontSize: 22 }} />
                    </CustomAvatar>
                    <Box>
                      <Typography variant='h6' sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                        {source.title}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        sx={{ mt: 0.5, lineHeight: 1.4 }}
                      >
                        {source.subtitle}
                      </Typography>
                    </Box>
                  </Stack>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Card>
  )
}

export default QuoteSourceSelector
