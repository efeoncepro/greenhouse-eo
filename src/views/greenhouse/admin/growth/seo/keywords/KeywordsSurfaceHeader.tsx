'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'

import { GreenhouseBreadcrumbs } from '@/components/greenhouse/primitives'
import WorkbenchHeader from '@/components/greenhouse/primitives/surface-system/WorkbenchHeader'
import { GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'
import { GH_GROWTH_SEO_OVERVIEW } from '@/lib/copy/growth'

import SeoSearchVisibilityTabs from '../overview/SeoSearchVisibilityTabs'
import KeywordLensTabs from './KeywordLensTabs'
import type { KeywordLens } from './KeywordLensTabs'

/**
 * TASK-1665 — Chrome ÚNICO de la superficie `/admin/growth/seo/keywords`.
 *
 * Las dos lentes (`Oportunidades` y `Descubrir`) son hermanas de UNA superficie: mismo
 * breadcrumb, mismo `h1`, misma barra de rutas hermanas y mismo Space. Resolver ese chrome en
 * dos lugares es una condición de parada explícita del estándar premium — no porque se vea
 * distinto hoy, sino porque diverge en la tercera edición que alguien haga con prisa.
 *
 * Lo único que varía por lente son los **controles de alcance** (`scopeControls`): la ventana
 * de 28/90 días es una pregunta que sólo tiene sentido sobre demanda medida, y en `Descubrir`
 * no significa nada. Por eso entra como prop y no como un `if` interno: la lente que no la
 * necesita simplemente no la pasa.
 *
 * El chrome vive en la región `header` de la recipe, NUNCA dentro de `regions.primary`: ahí
 * quedaría flotando sobre el canvas gris y a 390px el operador vería una pantalla entera de
 * controles antes del primer dato. Como está fuera del cuerpo, además sigue disponible en los
 * estados vacíos/degradados sin duplicarlo en cada uno.
 */

interface Props {
  activeLens: KeywordLens
  spaceId: string | null
  /**
   * Título y bajada de la LENTE activa.
   *
   * La composición del header es una sola —ése es el contrato—, pero el texto no puede serlo:
   * cada lente responde una pregunta distinta sobre el mismo objeto. Cablearlo al título de
   * Oportunidades hacía que `Descubrir` se anunciara como la lente hermana, que es exactamente
   * la clase de mentira que un `h1` no puede decir.
   */
  title: string
  description: string
  /** Controles de alcance propios de la lente activa (ej. la ventana de Oportunidades). */
  scopeControls?: ReactNode
  /** Hechos sobre el dato mostrado (frescura, estado de carga). */
  meta?: ReactNode
}

const KeywordsSurfaceHeader = ({ activeLens, spaceId, title, description, scopeControls, meta }: Props) => (
  <Stack spacing={4}>
    {/* Sin hrefs (misma convención del Overview y Rendimiento): "Growth" es un grupo de menú, y
        la navegación a las hermanas ES la barra de tabs del propio header. */}
    <GreenhouseBreadcrumbs
      items={[
        { label: GH_INTERNAL_NAV.growth.label },
        { label: GH_GROWTH_SEO_OVERVIEW.breadcrumbSection },
        { label: GH_INTERNAL_NAV.growthSeoKeywords.label }
      ]}
    />

    <WorkbenchHeader
      kind='report'
      titleComponent='h1'
      dataCapture='seo-keywords-toolbar'
      title={title}
      description={description}
      meta={meta}
      secondaryActions={scopeControls}
      supporting={
        <Stack spacing={2}>
          <Box data-capture='seo-keywords-tabs'>
            <SeoSearchVisibilityTabs activeTab='keywords' spaceId={spaceId} />
          </Box>
          <Box data-capture='seo-keywords-lens-tabs'>
            <KeywordLensTabs activeLens={activeLens} spaceId={spaceId} />
          </Box>
        </Stack>
      }
    />
  </Stack>
)

export default KeywordsSurfaceHeader
