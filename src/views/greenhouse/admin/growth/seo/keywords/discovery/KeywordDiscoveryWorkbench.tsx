'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'

import EmptyState from '@/components/greenhouse/EmptyState'
import SurfaceRecipe from '@/components/greenhouse/primitives/surface-system/SurfaceRecipe'
import { throwIfNotOk } from '@/lib/api/parse-error-response'
import { GH_GROWTH_SEO_KEYWORDS } from '@/lib/copy/growth'
import type { SeoDiscoveryMethod } from '@/lib/growth/seo/keyword-discovery/contracts'

import KeywordsSurfaceHeader from '../KeywordsSurfaceHeader'
import KeywordDiscoveryBuilder from './KeywordDiscoveryBuilder'

/**
 * TASK-1665 — Raíz de la lente `Descubrir`.
 *
 * Cliente PURO, igual que la lente hermana: el servidor ya resolvió guard, Space, sitio,
 * mercado, flag y capabilities. Acá se compone, se recoge el input y se llama al command
 * gobernado — **nunca** al proveedor. El browser no conoce credenciales de DataForSEO ni sabe
 * que existe.
 *
 * Composición: `analyticsReport` con `plane='none'`. El plano contenido de la recipe haría
 * card-on-card sobre las superficies que el cuerpo ya define (builder, estado, resultados),
 * que es exactamente lo que el estándar premium bloquea.
 */

const DISCOVERY_ENDPOINT = '/api/admin/growth/seo/keyword-discovery'

export interface KeywordDiscoveryWorkbenchProps {
  organizationId: string | null
  seoTargetId: string | null
  selectedSpaceId: string | null
  marketLabel: string | null
  canExecute: boolean
  disabledReason: string | null
  budgetRemainingUsd: number | null
}

const KeywordDiscoveryWorkbench = ({
  organizationId,
  seoTargetId,
  selectedSpaceId,
  marketLabel,
  canExecute,
  disabledReason,
  budgetRemainingUsd
}: KeywordDiscoveryWorkbenchProps) => {
  const copy = GH_GROWTH_SEO_KEYWORDS.discovery
  const router = useRouter()
  const [, setLastRunId] = useState<string | null>(null)

  const header = (
    <KeywordsSurfaceHeader
      activeLens='discovery'
      spaceId={selectedSpaceId}
      title={copy.title}
      description={copy.subtitle}
    />
  )

  const handleSubmit = async ({
    seeds,
    methods,
    resultsPerCall
  }: {
    seeds: string[]
    methods: SeoDiscoveryMethod[]
    resultsPerCall: number
  }) => {
    if (!organizationId) return

    const response = await fetch(DISCOVERY_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        intent: 'queue',
        organizationId,
        seoTargetId,
        seedSource: 'manual',
        manualSeeds: seeds,
        methods: methods.map(method => ({ method, resultsPerCall }))
      })
    })

    await throwIfNotOk(response, copy.run.providerErrorTitle)

    const payload = (await response.json()) as { ok?: boolean; runId?: string }

    // El `runId` sólo entra al estado/URL cuando el command CONFIRMÓ persistencia. Guardarlo
    // antes dejaría un enlace compartible apuntando a una corrida que nunca existió.
    if (payload.ok && payload.runId) {
      setLastRunId(payload.runId)
      router.refresh()
    }
  }

  const body = (
    <Stack spacing={6}>
      <Card>
        <CardContent>
          <KeywordDiscoveryBuilder
            marketLabel={marketLabel}
            canExecute={canExecute}
            disabledReason={disabledReason}
            budgetRemainingUsd={budgetRemainingUsd}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>

      {/* El canvas de candidatos y la banda de estado llegan en los slices siguientes. Hasta
          entonces el estado vacío dice la verdad —todavía no hay corrida— en vez de fingir una
          tabla vacía, que se leería como "no encontramos nada". */}
      <Card data-capture='seo-keyword-discovery-results'>
        <CardContent>
          <EmptyState
            icon='tabler-radar-2'
            title={seoTargetId ? copy.empty.title : copy.empty.noTargetTitle}
            description={seoTargetId ? copy.empty.description : copy.empty.noTargetDescription}
          />
        </CardContent>
      </Card>
    </Stack>
  )

  return (
    <SurfaceRecipe
      kind='analyticsReport'
      instanceId='seo-keywords-discovery'
      plane='none'
      header={header}
      regions={{ primary: body }}
    />
  )
}

export default KeywordDiscoveryWorkbench
