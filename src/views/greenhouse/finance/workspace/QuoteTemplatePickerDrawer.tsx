'use client'

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import DebouncedInput from '@/components/DebouncedInput'
import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_PRICING } from '@/lib/copy/pricing'

import type { QuoteCreateTemplate } from './quote-builder-types'

export interface QuoteTemplatePickerDrawerProps {
  open: boolean
  onClose: () => void
  onSelect: (template: QuoteCreateTemplate) => void
  templates: QuoteCreateTemplate[]
}

const PRICING_MODEL_LABELS: Record<QuoteCreateTemplate['pricingModel'], string> = {
  staff_aug: 'Staff augmentation',
  retainer: 'Retainer',
  project: 'Proyecto'
}

const formatUsage = (count: number): string =>
  count === 1
    ? GH_PRICING.builderTemplateUsageOne(count)
    : GH_PRICING.builderTemplateUsageMany(count)

const QuoteTemplatePickerDrawer = ({
  open,
  onClose,
  onSelect,
  templates
}: QuoteTemplatePickerDrawerProps) => {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()

    if (needle.length === 0) return templates

    return templates.filter(template => {
      const haystack = [
        template.templateName,
        template.templateCode,
        template.businessLineCode ?? '',
        template.pricingModel
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(needle)
    })
  }, [templates, query])

  const handleSelect = (template: QuoteCreateTemplate) => {
    onSelect(template)
    onClose()
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
    >
      <Box
        role='dialog'
        aria-label={GH_PRICING.builderTemplatePickerTitle}
        sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', p: 3 }}>
          <Box>
            <Typography variant='h6'>{GH_PRICING.builderTemplatePickerTitle}</Typography>
            <Typography variant='caption' color='text.secondary'>
              {GH_PRICING.builderTemplatePickerSubtitle}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size='small' aria-label={GH_PRICING.pickerClose}>
            <i className='tabler-x' aria-hidden='true' />
          </IconButton>
        </Box>
        <Divider />

        <Box sx={{ p: 3 }}>
          <DebouncedInput
            value={query}
            onChange={value => setQuery(String(value))}
            placeholder='Buscar por nombre o código'
            fullWidth
            size='small'
          />
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, pb: 2 }}>
          {filtered.length === 0 ? (
            <EmptyState
              icon='tabler-template-off'
              title={GH_PRICING.builderTemplatePickerEmpty}
              description={GH_PRICING.builderTemplatePickerEmptyHint}
            />
          ) : (
            <Stack spacing={2}>
              {filtered.map(template => (
                <Card
                  key={template.templateId}
                  elevation={0}
                  sx={theme => ({
                    border: `1px solid ${theme.palette.divider}`,
                    transition: theme.transitions.create(['border-color', 'box-shadow']),
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      boxShadow: theme.shadows[2]
                    }
                  })}
                >
                  <CardActionArea
                    onClick={() => handleSelect(template)}
                    aria-label={`Usar template ${template.templateName}`}
                  >
                    <Box sx={{ p: 2.5 }}>
                      <Stack spacing={1.25}>
                        <Box>
                          <Typography variant='subtitle1' sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                            {template.templateName}
                          </Typography>
                          <Typography
                            variant='caption'
                            sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}
                          >
                            {template.templateCode}
                          </Typography>
                        </Box>

                        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                          <CustomChip
                            round='true'
                            size='small'
                            variant='tonal'
                            color='primary'
                            label={PRICING_MODEL_LABELS[template.pricingModel] ?? template.pricingModel}
                          />
                          {template.businessLineCode ? (
                            <CustomChip
                              round='true'
                              size='small'
                              variant='tonal'
                              color='info'
                              label={template.businessLineCode}
                            />
                          ) : null}
                          <CustomChip
                            round='true'
                            size='small'
                            variant='outlined'
                            color='secondary'
                            label={formatUsage(template.usageCount)}
                          />
                        </Stack>

                        <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
                          <Box>
                            <Typography
                              variant='caption'
                              sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}
                            >
                              Moneda
                            </Typography>
                            <Typography variant='body2' sx={{ fontWeight: 500 }}>
                              {template.defaults.currency}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography
                              variant='caption'
                              sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}
                            >
                              Facturación
                            </Typography>
                            <Typography variant='body2' sx={{ fontWeight: 500 }}>
                              {template.defaults.billingFrequency}
                            </Typography>
                          </Box>
                          {template.defaults.contractDurationMonths ? (
                            <Box>
                              <Typography
                                variant='caption'
                                sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}
                              >
                                Duración
                              </Typography>
                              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                {template.defaults.contractDurationMonths} meses
                              </Typography>
                            </Box>
                          ) : null}
                        </Stack>
                      </Stack>
                    </Box>
                  </CardActionArea>
                </Card>
              ))}
            </Stack>
          )}
        </Box>

        <Divider />
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant='tonal' color='secondary' onClick={onClose}>
            {GH_PRICING.pickerCancel}
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}

export default QuoteTemplatePickerDrawer
