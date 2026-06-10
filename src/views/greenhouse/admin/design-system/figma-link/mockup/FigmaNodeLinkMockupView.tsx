'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GreenhouseBreadcrumbs } from '@/components/greenhouse/primitives'

import FigmaNodeLinkAffordance from '../FigmaNodeLinkAffordance'
import FigmaNodeLinkEditor from '../FigmaNodeLinkEditor'

// Real Figma paste with leading "@" + encoded fileName + m=dev (TASK-1072 follow-up).
const AXIS_URL = '@https://www.figma.com/design/yyMksCoijfMaIoYplXKZaR/Design-System-%7C-Vuexy-%3E-AXIS?node-id=11669-40645&m=dev'
const PARSED_NODE = '11669:40645'
const LINKED_NODE = '205:234905'

const mockLink = (): Promise<{ ok: boolean }> =>
  new Promise(resolve => setTimeout(() => resolve({ ok: true }), 900))

const SurfaceCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Stack spacing={2} sx={{ inlineSize: 360 }}>
    <Typography variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {title}
    </Typography>
    <Card
      variant='outlined'
      sx={{
        borderRadius: theme => `${theme.shape.customBorderRadius.lg}px`,
        boxShadow: theme => theme.greenhouseElevation.floating.boxShadow,
        borderColor: theme => theme.greenhouseElevation.floating.borderColor
      }}
    >
      {children}
    </Card>
  </Stack>
)

const Toolbar = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Stack spacing={2}>
    <Typography variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </Typography>
    <Card
      variant='outlined'
      sx={{ p: 4, borderRadius: theme => `${theme.shape.customBorderRadius.lg}px` }}
    >
      <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2} flexWrap='wrap' useFlexGap>
        <GreenhouseBreadcrumbs
          ariaLabel='Design system navigation'
          kind='pageHierarchy'
          showIcons={false}
          items={[{ label: 'Greenhouse', href: '/home' }, { label: 'Design System', href: '/design-system' }, { label: 'Typography' }]}
        />
        {children}
      </Stack>
    </Card>
  </Stack>
)

/**
 * FigmaNodeLinkMockupView — GVC harness for the Figma node link affordance (TASK-1072).
 * Renders the closed toolbars (capability matrix), a live open popover (real rotation),
 * and the editor state matrix. Mock onLink — no backend.
 */
const FigmaNodeLinkMockupView = () => {
  // Editor state matrix (presentational, controlled).
  const [, noop] = useState('')

  return (
    <Stack spacing={6} data-capture='figma-link-mockup' sx={{ maxInlineSize: 1200, mx: 'auto' }}>
      <Box>
        <Typography variant='h4' sx={{ mb: 1 }}>
          Vincular nodo Figma — mini-interfaz
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          El “+” a la izquierda del botón abre el editor anclado (FloatingSurface inlineEditor). Solo lo ve quien tiene la
          capability de diseñador; verlo en el Design System no alcanza para vincular.
        </Typography>
      </Box>

      {/* Closed toolbars — capability + node matrix */}
      <Stack spacing={4} data-capture='figma-link-toolbars'>
        <Toolbar label='Diseñador · página sin nodo (botón inactivo + “+” para agregar)'>
          <FigmaNodeLinkAffordance nodeId={null} canLink onLink={mockLink} />
        </Toolbar>
        <Toolbar label='Diseñador · página con nodo (botón activo + “+” para cambiar)'>
          <FigmaNodeLinkAffordance nodeId={LINKED_NODE} canLink onLink={mockLink} />
        </Toolbar>
        <Toolbar label='Colaborador sin capability (solo botón inactivo, sin “+”)'>
          <FigmaNodeLinkAffordance nodeId={null} canLink={false} onLink={mockLink} />
        </Toolbar>
      </Stack>

      {/* Live open popover — real anchored surface + rotated “+” */}
      <Stack spacing={2} data-capture='figma-link-live'>
        <Typography variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Vivo · popover abierto (rotación real del “+”)
        </Typography>
        <Card
          variant='outlined'
          sx={{ p: 4, minBlockSize: 480, borderRadius: theme => `${theme.shape.customBorderRadius.lg}px` }}
        >
          <Stack direction='row' justifyContent='flex-end'>
            <FigmaNodeLinkAffordance nodeId={null} canLink onLink={mockLink} defaultOpen />
          </Stack>
        </Card>
      </Stack>

      {/* Editor state matrix (presentational) */}
      <Stack spacing={3} data-capture='figma-link-states'>
        <Typography variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Estados del editor
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 6,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, max-content)' },
            justifyContent: { md: 'center' }
          }}
        >
          <SurfaceCard title='Vacío (idle)'>
            <FigmaNodeLinkEditor mode='link' value='' onChange={noop} parsed={null} status='idle' onSubmit={() => {}} onClose={() => {}} />
          </SurfaceCard>
          <SurfaceCard title='URL válida · render real del nodo'>
            <FigmaNodeLinkEditor
              mode='link'
              value={AXIS_URL}
              onChange={noop}
              parsed={{ fileKey: 'yyMksCoijfMaIoYplXKZaR', fileName: 'Design-System-|-Vuexy->-AXIS', nodeId: PARSED_NODE }}
              status='valid'
              nodeThumbnailUrl='/images/design-system/figma-node-preview-demo.png'
              thumbnailStatus='ready'
              onSubmit={() => {}}
              onClose={() => {}}
            />
          </SurfaceCard>
          <SurfaceCard title='Cargando vista previa del nodo'>
            <FigmaNodeLinkEditor
              mode='link'
              value={AXIS_URL}
              onChange={noop}
              parsed={{ fileKey: 'yyMksCoijfMaIoYplXKZaR', fileName: 'Design-System-|-Vuexy->-AXIS', nodeId: PARSED_NODE }}
              status='valid'
              thumbnailStatus='loading'
              onSubmit={() => {}}
              onClose={() => {}}
            />
          </SurfaceCard>
          <SurfaceCard title='Vinculando…'>
            <FigmaNodeLinkEditor
              mode='link'
              value={AXIS_URL}
              onChange={noop}
              parsed={{ fileKey: 'yyMksCoijfMaIoYplXKZaR', fileName: 'Design-System-|-Vuexy->-AXIS', nodeId: PARSED_NODE }}
              status='validating'
              onSubmit={() => {}}
              onClose={() => {}}
            />
          </SurfaceCard>
          <SurfaceCard title='URL inválida'>
            <FigmaNodeLinkEditor
              mode='link'
              value='https://figma.com/algo'
              onChange={noop}
              parsed={null}
              status='invalid'
              errorMessage='No parece un enlace de nodo Figma'
              onSubmit={() => {}}
              onClose={() => {}}
            />
          </SurfaceCard>
          <SurfaceCard title='Archivo distinto a AXIS'>
            <FigmaNodeLinkEditor
              mode='link'
              value='https://www.figma.com/design/OTRO/Proyecto?node-id=10-20'
              onChange={noop}
              parsed={null}
              status='wrong-file'
              errorMessage='El nodo debe ser del archivo AXIS'
              onSubmit={() => {}}
              onClose={() => {}}
            />
          </SurfaceCard>
          <SurfaceCard title='Cambiar nodo existente'>
            <FigmaNodeLinkEditor
              mode='change'
              value=''
              onChange={noop}
              parsed={null}
              status='idle'
              currentNodeId={LINKED_NODE}
              onSubmit={() => {}}
              onClose={() => {}}
            />
          </SurfaceCard>
          <SurfaceCard title='Error al vincular'>
            <FigmaNodeLinkEditor
              mode='link'
              value={AXIS_URL}
              onChange={noop}
              parsed={{ fileKey: 'yyMksCoijfMaIoYplXKZaR', fileName: 'Design-System-|-Vuexy->-AXIS', nodeId: PARSED_NODE }}
              status='error'
              errorMessage='No se pudo vincular el nodo. Reintenta.'
              onSubmit={() => {}}
              onClose={() => {}}
            />
          </SurfaceCard>
        </Box>
      </Stack>
    </Stack>
  )
}

export default FigmaNodeLinkMockupView
