'use client'

import Link from 'next/link'

import Tab from '@mui/material/Tab'

import { CustomTabsNav } from '@core/components/mui/TabList'

import { GH_GROWTH_SEO_KEYWORDS } from '@/lib/copy/growth'

/**
 * TASK-1665 — Conmutador de LENTES dentro de `/admin/growth/seo/keywords`.
 *
 * ⚠️ No confundir con `SeoSearchVisibilityTabs`, que conmuta entre RUTAS hermanas
 * (Overview · Rendimiento · Keywords · Auditoría). Éste conmuta entre **contenidos de la
 * misma ruta**: el objeto es el mismo target/keyword set y sólo cambia la pregunta que se
 * responde. Por eso `?view=` y no una ruta `/discovery`: separar la ruta duplicaría Space,
 * guard, viewCode, breadcrumb y frescura para mirar el mismo objeto.
 *
 * Aun siendo lentes de una misma página, la navegación es REAL (`next/link` con el query
 * param), no estado en memoria: así el deep-link, el back/forward y el enlace compartible
 * funcionan sin código extra, y el server revalida el acceso en cada entrada.
 *
 * `CustomTabsNav` con `role='navigation'` y NO el `TabList` de `@mui/lab`: el TabList clona
 * cada Tab inyectándole `aria-controls` hacia un TabPanel que acá no existe (axe
 * `aria-valid-attr-value`, severidad critical). Mismo hallazgo y misma solución que la barra
 * de rutas hermanas — se replica a propósito, no por copiar.
 *
 * La lente `Objetivos` (TASK-1660) entra acá cuando exista su reader. Hoy NO se renderiza
 * deshabilitada: un tab apagado promete una vista que todavía no tiene ni contrato.
 */

export type KeywordLens = 'opportunities' | 'discovery'

interface KeywordLensTab {
  value: KeywordLens
  label: string
  icon: string
}

const TABS: readonly KeywordLensTab[] = [
  {
    value: 'opportunities',
    label: GH_GROWTH_SEO_KEYWORDS.discovery.lensOpportunities,
    icon: 'tabler-target-arrow'
  },
  {
    value: 'discovery',
    label: GH_GROWTH_SEO_KEYWORDS.discovery.lensLabel,
    icon: 'tabler-radar-2'
  }
]

interface Props {
  activeLens: KeywordLens
  /** Space vigente — se propaga para no perder el contexto al cambiar de lente. */
  spaceId: string | null
}

const KeywordLensTabs = ({ activeLens, spaceId }: Props) => {
  // Propaga `space` Y `view`. El Space es contexto compartido por las dos lentes; perderlo al
  // conmutar mandaría al operador al primer Space elegible sin avisar.
  const hrefFor = (lens: KeywordLens) => {
    const params = new URLSearchParams()

    if (spaceId) params.set('space', spaceId)

    // La lente por defecto no ensucia la URL: `/keywords` ya significa Oportunidades.
    if (lens !== 'opportunities') params.set('view', lens)

    const query = params.toString()

    return query ? `/admin/growth/seo/keywords?${query}` : '/admin/growth/seo/keywords'
  }

  return (
    <CustomTabsNav
      role='navigation'
      value={activeLens}
      variant='scrollable'
      // Sin `allowScrollButtonsMobile`: en 390px las flechas se comen ~80px y terminan tapando
      // el tab activo. Mismo hallazgo que la barra de rutas hermanas.
      scrollButtons='auto'
      sx={{
        '& .MuiTab-iconWrapper': { display: { xs: 'none', sm: 'inline-flex' } },
        '& .MuiTab-root': { paddingInline: { xs: 3, sm: 5 }, minInlineSize: 0 }
      }}
      aria-label={GH_GROWTH_SEO_KEYWORDS.discovery.lensAriaLabel}
    >
      {TABS.map(tab => (
        <Tab
          key={tab.value}
          value={tab.value}
          label={tab.label}
          icon={<i className={tab.icon} />}
          iconPosition='start'
          component={Link}
          href={hrefFor(tab.value)}
          aria-current={tab.value === activeLens ? 'page' : undefined}
        />
      ))}
    </CustomTabsNav>
  )
}

export default KeywordLensTabs
