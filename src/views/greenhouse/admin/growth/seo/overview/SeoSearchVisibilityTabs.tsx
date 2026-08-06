'use client'

import { forwardRef } from 'react'

import Link from 'next/link'

import TabContext from '@mui/lab/TabContext'
import Tab from '@mui/material/Tab'
import type { TabProps } from '@mui/material/Tab'
import Tooltip from '@mui/material/Tooltip'

import CustomTabList from '@core/components/mui/TabList'

import { GH_GROWTH_SEO_OVERVIEW } from '@/lib/copy/growth'

/**
 * TASK-1306 — Conmutador local "Search Visibility".
 *
 * NO es un `TabContext` de paneles locales: cada tab es una RUTA propia
 * (`/admin/growth/seo`, `/performance`, `/keywords`, `/audit`) bajo el mismo viewCode
 * `administracion.growth_seo`. Por eso los tabs navegan (`next/link`) en vez de
 * intercambiar contenido en memoria — así el deep-link, el back/forward del browser y
 * el enlace compartible funcionan solos.
 *
 * Las hermanas (TASK-1307/1308/1309) todavía no existen. Un tab que navega a un 404 es
 * peor que un tab deshabilitado: se marcan `disabled` con un tooltip que dice POR QUÉ.
 * Al aterrizar cada hermana se le quita el flag `available: false` — un cambio de una
 * línea, no un refactor del conmutador.
 */

interface SeoSearchVisibilityTab {
  value: string
  label: string
  href: string
  icon: string
  available: boolean
}

const TABS: readonly SeoSearchVisibilityTab[] = [
  {
    value: 'overview',
    label: GH_GROWTH_SEO_OVERVIEW.tabs.overview,
    href: '/admin/growth/seo',
    icon: 'tabler-layout-dashboard',
    available: true
  },
  {
    value: 'performance',
    label: GH_GROWTH_SEO_OVERVIEW.tabs.performance,
    href: '/admin/growth/seo/performance',
    icon: 'tabler-chart-line',
    available: false
  },
  {
    value: 'keywords',
    label: GH_GROWTH_SEO_OVERVIEW.tabs.keywords,
    href: '/admin/growth/seo/keywords',
    icon: 'tabler-key',
    available: false
  },
  {
    value: 'audit',
    label: GH_GROWTH_SEO_OVERVIEW.tabs.audit,
    href: '/admin/growth/seo/audit',
    icon: 'tabler-stethoscope',
    available: false
  }
]

/**
 * Tab no disponible, con el motivo en un tooltip.
 *
 * ⚠️ `Tabs` inyecta props de contexto (`fullWidth`, `indicator`, `selectionFollowsFocus`,
 * `textColor`, `value`…) en sus hijos DIRECTOS. Si el hijo directo fuera el `<Tooltip>`,
 * esos props aterrizarían en el `<span>` del DOM y React tiraría 4 errores de atributo
 * desconocido en consola (pasó: los 4 issues del overlay de dev salían justo de acá).
 *
 * Por eso este wrapper existe: recibe lo inyectado y lo REENVÍA al `Tab`, que sí lo
 * entiende. El `<span>` intermedio sigue siendo necesario porque MUI no dispara eventos
 * de hover sobre un control deshabilitado — sin él, el tooltip nunca aparecería y el
 * usuario no sabría por qué el tab no responde.
 */
const UnavailableTab = forwardRef<HTMLSpanElement, TabProps & { tooltipTitle: string }>(function UnavailableTab(
  { tooltipTitle, ...tabProps },
  ref
) {
  return (
    <Tooltip title={tooltipTitle}>
      <span ref={ref}>
        <Tab {...tabProps} disabled />
      </span>
    </Tooltip>
  )
})

interface Props {
  /** Tab activa. Cada ruta hermana pasa la suya. */
  activeTab: string
  /** Space vigente — se propaga a las hermanas para no perder el contexto al navegar. */
  spaceId: string | null
}

const SeoSearchVisibilityTabs = ({ activeTab, spaceId }: Props) => {
  const withSpace = (href: string) => (spaceId ? `${href}?space=${encodeURIComponent(spaceId)}` : href)

  return (
    // `TabList` de @mui/lab lee la tab activa del contexto, no de una prop. Como acá cada
    // tab es una ruta propia, el contexto sólo transporta cuál está activa: no hay
    // `TabPanel` que conmutar — el "panel" es la página que Next monta.
    <TabContext value={activeTab}>
      <CustomTabList variant='scrollable' pill='true' aria-label={GH_GROWTH_SEO_OVERVIEW.sectionTitle}>
        {TABS.map(tab =>
          tab.available ? (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={<i className={tab.icon} />}
              iconPosition='start'
              component={Link}
              href={withSpace(tab.href)}
              aria-current={tab.value === activeTab ? 'page' : undefined}
            />
          ) : (
            <UnavailableTab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={<i className={tab.icon} />}
              iconPosition='start'
              tooltipTitle={GH_GROWTH_SEO_OVERVIEW.tabs.unavailableHint}
            />
          )
        )}
      </CustomTabList>
    </TabContext>
  )
}

export default SeoSearchVisibilityTabs
