'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

export type SellableItemVariant = 'role' | 'tool' | 'overhead' | 'service'

export interface SellableItemRowProps {
  variant: SellableItemVariant

  /** SKU o identificador estable */
  sku: string

  /** Label principal (nombre del ítem) */
  label: string

  /** Descripción secundaria — en roles suele ser el label en inglés, en tools el proveedor. */
  description?: string | null

  /** Categoría/tier/módulo — se renderiza como chip */
  category?: string | null

  /** Línea de precio (ya formateada por el caller) */
  priceLabel?: string | null

  /** Estado de selección — para pickers con multi-select */
  selected?: boolean

  /** Si está deshabilitado (ej. ya agregado al quote) */
  disabled?: boolean

  /** Handler de click/selección */
  onSelect?: (sku: string) => void
}

const VARIANT_ICON: Record<SellableItemVariant, string> = {
  role: 'tabler-user-check',
  tool: 'tabler-tool',
  overhead: 'tabler-plus-minus',
  service: 'tabler-package'
}

const VARIANT_ARIA: Record<SellableItemVariant, string> = {
  role: 'Rol vendible',
  tool: 'Herramienta',
  overhead: 'Overhead add-on',
  service: 'Servicio empaquetado'
}

/**
 * Row polimórfico para `SellableItemPickerDrawer`. Renderiza un ítem del catálogo
 * (rol, herramienta, overhead, servicio) con icono + label + descripción + precio.
 * Sin lógica de negocio — el caller maneja selección y filtrado.
 */
const SellableItemRow = ({
  variant,
  sku,
  label,
  description,
  category,
  priceLabel,
  selected = false,
  disabled = false,
  onSelect
}: SellableItemRowProps) => {
  const handleClick = () => {
    if (!disabled && onSelect) onSelect(sku)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || !onSelect) return

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(sku)
    }
  }

  return (
    <Box
      role='option'
      data-capture='sellable-item-option'
      tabIndex={disabled ? -1 : 0}
      aria-label={`${VARIANT_ARIA[variant]} ${label}${description ? `, ${description}` : ''}`}
      aria-selected={selected}
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      sx={theme => ({
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: 1.25,
        p: { xs: 1.25, sm: 1.35 },
        minHeight: 64,
        borderRadius: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        bgcolor: selected ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.15 : 0.09) : theme.palette.background.paper,
        border: '1px solid transparent',
        boxShadow: selected ? `inset 3px 0 0 ${theme.palette.primary.main}` : 'none',
        transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
          duration: theme.transitions.duration.shortest
        }),
        '&:hover': disabled
          ? undefined
          : {
	              bgcolor: selected ? alpha(theme.palette.primary.main, 0.095) : alpha(theme.palette.primary.main, 0.028),
              borderColor: alpha(theme.palette.primary.main, 0.18)
            },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: -2
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none'
        }
      })}
    >
      <Box
        aria-hidden='true'
        sx={theme => ({
	            width: 34,
	            height: 34,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          color: selected ? 'primary.main' : 'text.secondary',
          backgroundColor: selected ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.text.primary, 0.035),
          border: `1px solid ${selected ? alpha(theme.palette.primary.main, 0.32) : theme.palette.divider}`,
          boxShadow: selected ? `0 10px 18px -16px ${alpha(theme.palette.primary.main, 0.82)}` : 'none',
          flexShrink: 0
        })}
      >
	        <i className={VARIANT_ICON[variant]} style={{ fontSize: 17 }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
	        <Stack direction='row' spacing={0.75} alignItems='center' sx={{ mb: 0.15 }} useFlexGap flexWrap='wrap'>
          <Typography variant='caption' sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
            {sku}
          </Typography>
          {category ? (
            <CustomChip round='true' size='small' variant='tonal' color='primary' label={category} />
          ) : null}
        </Stack>

        <Typography
          variant='body1'
          sx={{
            fontWeight: 600,
	            lineHeight: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {label}
        </Typography>

        {description ? (
	          <Typography variant='body2' color='text.secondary' sx={{ display: 'block', lineHeight: 1.25 }} noWrap>
            {description}
          </Typography>
        ) : null}
      </Box>

      <Stack direction='row' spacing={1} alignItems='center' justifyContent='flex-end' sx={{ minWidth: 0 }}>
        {priceLabel ? (
          <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {priceLabel}
          </Typography>
        ) : null}
        <Box
          component='span'
          className='sellable-row-action'
          aria-hidden='true'
          sx={theme => ({
	            width: 28,
	            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            color: selected ? 'primary.contrastText' : 'text.secondary',
            backgroundColor: selected ? theme.palette.primary.main : theme.palette.background.default,
            border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
            flexShrink: 0,
            boxShadow: selected ? `0 10px 18px -14px ${alpha(theme.palette.primary.main, 0.9)}` : 'none',
            transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'transform'], {
              duration: theme.transitions.duration.shortest
            }),
            '.sellable-row-action': {},
            '[role="option"]:hover &': disabled
              ? undefined
              : {
                  transform: 'scale(1.04)'
                },
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              transform: 'none'
            }
          })}
        >
	        <i className={selected ? 'tabler-check' : 'tabler-plus'} style={{ fontSize: 14 }} />
        </Box>
      </Stack>
    </Box>
  )
}

export default SellableItemRow
