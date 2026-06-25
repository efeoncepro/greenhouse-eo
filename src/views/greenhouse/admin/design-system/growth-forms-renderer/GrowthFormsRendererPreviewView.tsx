'use client'

import { useEffect, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

import { CompositionShell } from '@/components/greenhouse/primitives'
import type { RenderContract } from '@/growth-forms-renderer/contract'
import {
  conditionalContractFixture,
  multiStepContractFixture,
  staticContractFixture,
} from '@/growth-forms-renderer/fixtures'

/**
 * TASK-1231 Slice 2 — Preview interno del renderer portable Growth Forms.
 *
 * INTERNAL ONLY (viewCode `plataforma.design_system`) — los clientes nunca lo ven.
 * Monta el MISMO core (`FormRenderer`) que WordPress/Astro renderizan en producción,
 * desde fixtures del `render_contract` (offline, determinista para GVC). El submit usa
 * un `fetch` simulado (acepta) para poder ver el estado de éxito sin tocar el API real.
 * Demuestra la regla "Greenhouse preview usa el mismo contract/core que public hosts".
 */

type FixtureKey = 'static' | 'conditional' | 'multi_step'

const FIXTURES: Record<FixtureKey, { label: string; build: () => RenderContract }> = {
  static: { label: 'Estático', build: staticContractFixture },
  conditional: { label: 'Condicional', build: conditionalContractFixture },
  multi_step: { label: 'Multi-paso', build: multiStepContractFixture },
}

type StateKey = 'live' | 'loading' | 'error' | 'unavailable'

const STATES: Record<StateKey, string> = {
  live: 'Interactivo',
  loading: 'Cargando',
  error: 'Error de carga',
  unavailable: 'No disponible',
}

/** `fetch` simulado: el submit siempre acepta; nunca toca el API real. */
const previewFetch: typeof fetch = (async () =>
  new Response(JSON.stringify({ outcome: 'accepted', submissionId: 'preview' }), {
    status: 202,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch

const LiveForm = ({ fixture }: { fixture: FixtureKey }) => {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = ref.current

    if (!host) return
    let disposed = false
    let destroy: (() => void) | undefined

    void Promise.all([import('@/growth-forms-renderer/renderer'), import('@/growth-forms-renderer/styles')]).then(
      ([{ FormRenderer }, { ensureStylesInjected }]) => {
        if (disposed || !ref.current) return
        ensureStylesInjected(document)

        const renderer = new FormRenderer({
          root: ref.current,
          contract: FIXTURES[fixture].build(),
          api: { baseUrl: '', slug: FIXTURES[fixture].build().form.slug, surfaceId: 'greenhouse-preview' },
          fetchImpl: previewFetch,
          doc: document,
        })

        renderer.mount()
        destroy = () => renderer.destroy()
      },
    )

    return () => {
      disposed = true
      destroy?.()
    }
  }, [fixture])

  return <div ref={ref} data-capture='growth-forms-renderer-live' />
}

/** Estados no-interactivos (loading/error/unavailable) renderizados con el CSS del core. */
const StaticState = ({ state }: { state: Exclude<StateKey, 'live'> }) => {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    void import('@/growth-forms-renderer/styles').then(({ ensureStylesInjected }) => ensureStylesInjected(document))
  }, [])

  if (state === 'loading') {
    return (
      <div ref={ref} className='ghf-skeleton' role='status' aria-busy='true' aria-label='Cargando formulario'>
        <span className='ghf-skeleton-row' />
        <span className='ghf-skeleton-row' />
        <span className='ghf-skeleton-row' />
        <span className='ghf-skeleton-row' />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className='ghf-form'>
        <p className='ghf-status ghf-status--error' role='alert'>
          No pudimos cargar el formulario. Intenta de nuevo.
        </p>
        <div className='ghf-actions'>
          <button type='button' className='ghf-btn'>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <p className='ghf-status' role='status'>
      Formulario no disponible.
    </p>
  )
}

const EMBED_SNIPPET = `<greenhouse-form
  form="ai-visibility-intake"
  surface="astro"
  locale="es-CL"
  base-url="https://greenhouse.efeoncepro.com"
></greenhouse-form>
<script src="https://greenhouse.efeoncepro.com/growth-forms/renderer-preview.js" defer></script>`

const GrowthFormsRendererPreviewView = () => {
  const [fixture, setFixture] = useState<FixtureKey>('static')
  const [state, setState] = useState<StateKey>('live')

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1080, mx: 'auto' }} data-capture='growth-forms-renderer-preview'>
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Typography variant='h4'>Growth Forms · Renderer portable</Typography>
        <Typography variant='body2' color='text.secondary'>
          El mismo core (Web Component <code>&lt;greenhouse-form&gt;</code>) que renderiza WordPress y Astro en
          producción, consumiendo solo el <code>render_contract</code> gobernado. Vista interna de referencia y
          verificación (TASK-1231).
        </Typography>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }} useFlexGap flexWrap='wrap'>
        <Stack spacing={0.5}>
          <Typography variant='caption' color='text.secondary'>
            Composición
          </Typography>
          <ToggleButtonGroup
            exclusive
            size='small'
            value={fixture}
            onChange={(_, v: FixtureKey | null) => v && setFixture(v)}
            aria-label='Composición del formulario'
          >
            {(Object.keys(FIXTURES) as FixtureKey[]).map(key => (
              <ToggleButton key={key} value={key}>
                {FIXTURES[key].label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        <Stack spacing={0.5}>
          <Typography variant='caption' color='text.secondary'>
            Estado
          </Typography>
          <ToggleButtonGroup
            exclusive
            size='small'
            value={state}
            onChange={(_, v: StateKey | null) => v && setState(v)}
            aria-label='Estado del renderer'
          >
            {(Object.keys(STATES) as StateKey[]).map(key => (
              <ToggleButton key={key} value={key}>
                {STATES[key]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <CompositionShell
        composition='split'
        fluidity='rich'
        regions={{
          primary: (
            <Box
              data-capture='growth-forms-renderer-canvas'
              sx={{
                border: theme => `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                p: { xs: 2, md: 3 },
                bgcolor: 'background.paper',
                minHeight: 360,
              }}
            >
              {state === 'live' ? <LiveForm key={fixture} fixture={fixture} /> : <StaticState state={state} />}
            </Box>
          ),
          aside: (
            <Box
              data-capture='growth-forms-renderer-embed'
              sx={{
                border: theme => `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                p: { xs: 2, md: 3 },
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant='subtitle2' gutterBottom>
                Embed en host público
              </Typography>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 2 }}>
                WordPress y Astro montan el mismo bundle pineado por canal. El wrapper solo aporta enqueue/CSP/surface
                id; nunca altera campos, validación ni destinos.
              </Typography>
              <Box
                component='pre'
                sx={{ m: 0, p: 2, borderRadius: 1.5, bgcolor: 'action.hover', overflowX: 'auto' }}
              >
                <Typography component='code' variant='caption' sx={{ whiteSpace: 'pre' }}>
                  {EMBED_SNIPPET}
                </Typography>
              </Box>
            </Box>
          ),
        }}
      />
    </Box>
  )
}

export default GrowthFormsRendererPreviewView
