'use client'

import { type ReactNode } from 'react'

import {
  EntitySummaryDock,
  TotalsLadder,
  type EntitySummaryDockSaveState,
  type MarginClassification,
  type MarginTierRange
} from '@/components/greenhouse/primitives'
import { GH_PRICING } from '@/config/greenhouse-nomenclature'
import type { PricingOutputCurrency } from '@/lib/finance/pricing/contracts'

export interface QuoteSummaryDockProps {
  subtotal: number | null
  factor?: number | null
  ivaAmount?: number | null
  total: number | null
  currency: PricingOutputCurrency
  loading?: boolean
  addonCount?: number
  addonContent?: ReactNode
  primaryCtaLabel: string
  primaryCtaIcon?: string
  primaryCtaLoading?: boolean
  primaryCtaDisabled?: boolean
  onPrimaryClick: () => void
  secondaryCtaLabel?: string
  secondaryCtaDisabled?: boolean
  onSecondaryClick?: () => void
  marginClassification?: MarginClassification | null
  marginPct?: number | null

  /** Target tier range, usado para tooltip del margen. */
  marginTierRange?: MarginTierRange | null

  /** Suma de los addons ya aplicados como línea overhead_addon. Se muestra en
   *  el segmento inline de la ladder como contexto cuantitativo cuando > 0. */
  appliedAddonsTotal?: number | null

  /** Save state indicator en la parte izquierda del dock. */
  saveState?: EntitySummaryDockSaveState | null

  /** Si hay un error del engine v2, se muestra como Alert inline en la parte
   * superior del dock (justo encima del bloque de totales). */
  simulationError?: string | null

  /** Mensaje contextual cuando no hay datos suficientes para mostrar totales
   * (ej. sin ítems agregados). Si está presente, reemplaza el bloque de
   * totales por una leyenda informativa. */
  emptyStateMessage?: string | null

  /**
   * TASK-615: razón humana cuando el CTA terminal está deshabilitado.
   *
   * Se inyecta como tooltip arriba del botón y como `aria-describedby` para
   * que la causa esté visible y verbalizable. Si `primaryCtaDisabled === true`
   * pero no hay reason, el botón cae al placeholder genérico.
   */
  disabledReason?: string | null
}

/**
 * QuoteSummaryDock — sticky-bottom cockpit del Quote Builder. Hoy actúa como
 * adapter del primitive canónico `EntitySummaryDock` (TASK-498), conservando
 * la API histórica del dominio (subtotal/factor/ivaAmount/total + addons +
 * margen + save state) y mapeando a los slots genéricos del primitive.
 *
 * Cuando emerja un nuevo dock de dominio (invoice, PO, contract), debe
 * consumir `EntitySummaryDock` directamente desde primitives, no este wrapper.
 */
const QuoteSummaryDock = ({
  subtotal,
  factor,
  ivaAmount,
  total,
  currency,
  loading = false,
  addonCount = 0,
  addonContent,
  primaryCtaLabel,
  primaryCtaIcon,
  primaryCtaLoading = false,
  primaryCtaDisabled = false,
  onPrimaryClick,
  secondaryCtaLabel,
  secondaryCtaDisabled = false,
  onSecondaryClick,
  marginClassification,
  marginPct,
  marginTierRange,
  appliedAddonsTotal,
  saveState,
  simulationError,
  emptyStateMessage,
  disabledReason
}: QuoteSummaryDockProps) => {
  const showMarginIndicator = Boolean(
    marginClassification && marginPct !== null && marginPct !== undefined && !loading
  )

  return (
    <EntitySummaryDock
      id='quote-summary-dock'
      ariaLabel={GH_PRICING.summaryDock.ariaLabel}
      saveState={saveState ?? null}
      marginIndicator={
        showMarginIndicator
          ? {
              classification: marginClassification as MarginClassification,
              marginPct: marginPct as number,
              tierRange: marginTierRange ?? null
            }
          : null
      }
      simulationError={simulationError ?? null}
      emptyStateMessage={emptyStateMessage ?? null}
      centerSlot={
        emptyStateMessage ? null : (
          <TotalsLadder
            subtotal={subtotal}
            factor={factor ?? null}
            ivaAmount={ivaAmount ?? null}
            total={total}
            currency={currency}
            loading={loading}
            addonsSegment={
              addonContent && addonCount > 0
                ? {
                    count: addonCount,
                    amount: appliedAddonsTotal ?? 0,
                    content: addonContent
                  }
                : null
            }
          />
        )
      }
      primaryCta={{
        label: primaryCtaLabel,
        onClick: onPrimaryClick,
        loading: primaryCtaLoading,
        disabled: primaryCtaDisabled,
        iconClassName: primaryCtaIcon,
        disabledReason: disabledReason ?? undefined
      }}
      secondaryCta={
        secondaryCtaLabel && onSecondaryClick
          ? {
              label: secondaryCtaLabel,
              onClick: onSecondaryClick,
              disabled: secondaryCtaDisabled
            }
          : null
      }
    />
  )
}

export default QuoteSummaryDock
