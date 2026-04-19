'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

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
      tabIndex={disabled ? -1 : 0}
      aria-label={`${VARIANT_ARIA[variant]} ${label}${description ? `, ${description}` : ''}`}
      aria-selected={selected}
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      sx={theme => ({
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        minHeight: 56,
        borderRadius: 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        bgcolor: selected ? theme.palette.primary.lighterOpacity : 'transparent',
        border: `1px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
        transition: theme.transitions.create(['background-color', 'border-color'], { duration: 150 }),
        '&:hover': disabled
          ? undefined
          : {
              bgcolor: theme.palette.action.hover
            },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2
        }
      })}
    >
      <i
        className={VARIANT_ICON[variant]}
        aria-hidden='true'
        style={{ fontSize: 20, flexShrink: 0, color: 'inherit' }}
      />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.25 }}>
          <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.75rem', color: 'text.secondary' }}>
            {sku}
          </Typography>
          {category ? <Chip size='small' label={category} sx={{ height: 18, fontSize: '0.65rem' }} /> : null}
        </Stack>

        <Typography
          variant='body2'
          sx={{
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {label}
        </Typography>

        {description ? (
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
            {description}
          </Typography>
        ) : null}
      </Box>

      {priceLabel ? (
        <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {priceLabel}
        </Typography>
      ) : null}
    </Box>
  )
}

export default SellableItemRow
