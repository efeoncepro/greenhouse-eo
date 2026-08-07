'use client'

import Link from 'next/link'

import Tab from '@mui/material/Tab'

import { CustomTabsNav } from '@core/components/mui/TabList'

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
    // TASK-1307 — la hermana aterrizó: el tab navega de verdad.
    available: true
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

interface Props {
  /** Tab activa. Cada ruta hermana pasa la suya. */
  activeTab: string
  /** Space vigente — se propaga a las hermanas para no perder el contexto al navegar. */
  spaceId: string | null
}

const SeoSearchVisibilityTabs = ({ activeTab, spaceId }: Props) => {
  const withSpace = (href: string) => (spaceId ? `${href}?space=${encodeURIComponent(spaceId)}` : href)

  return (
    // `CustomTabsNav` (Tabs plano, TASK-1307) y NO el TabList de @mui/lab: estos "tabs"
    // son LINKS a rutas hermanas — el "panel" es la página que Next monta. El TabList
    // clona cada Tab inyectándole `aria-controls` hacia un TabPanel que acá no existe
    // (axe: `aria-valid-attr-value` critical) y su clone pisa cualquier override del
    // consumer. `role='navigation'` declara lo que esto ES; con Tabs plano nadie fabrica
    // ARIA hacia paneles fantasma y el estilo pill se conserva (mismas clases MuiTabs).
    <CustomTabsNav
      role='navigation'
      value={activeTab}
      variant='scrollable'
      pill='true'
      aria-label={GH_GROWTH_SEO_OVERVIEW.sectionTitle}
    >
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
          // `aria-disabled` + `title` en vez de `disabled` envuelto en Tooltip: un
          // `<span>` intermedio dentro del contenedor de tabs rompía el contrato ARIA
          // y un control `disabled` no dispara hover, así que el motivo nunca se veía.
          <Tab
            key={tab.value}
            value={tab.value}
            label={tab.label}
            icon={<i className={tab.icon} />}
            iconPosition='start'
            aria-disabled='true'
            title={GH_GROWTH_SEO_OVERVIEW.tabs.unavailableHint}
            sx={{ opacity: 0.5, pointerEvents: 'auto', cursor: 'not-allowed' }}
            onClick={event => event.preventDefault()}
          />
        )
      )}
    </CustomTabsNav>
  )
}

export default SeoSearchVisibilityTabs
