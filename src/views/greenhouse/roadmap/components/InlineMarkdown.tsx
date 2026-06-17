'use client'

/**
 * TASK-1153 (follow-up) — Render inline de Markdown para prosa CORTA del cockpit
 * (resumen / por qué / causa raíz del inspector). Renderiza **negritas**,
 * `código` y links, pero NO bloques (headings, listas, tablas) — los párrafos
 * colapsan a texto continuo. Para el documento completo usar `RoadmapTaskDrawer`.
 *
 * HTML crudo NO se interpreta (sin `rehype-raw`). Estilos tokenizados.
 */
import Box from '@mui/material/Box'

import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

const INLINE_COMPONENTS: Components = {
  // Cada párrafo del fragmento se aplana a un <span> en flujo (sin saltos de bloque).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  p: ({ node, ...props }) => <Box component='span' {...props} />,
  // Links externos seguros (target _blank + rel).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  a: ({ node, href, ...props }) => <Box component='a' href={href} target='_blank' rel='noopener noreferrer' {...props} />
}

export interface InlineMarkdownProps {
  text: string
}

const InlineMarkdown = ({ text }: InlineMarkdownProps) => (
  <Box
    component='span'
    sx={{
      '& strong': { fontWeight: 700, color: 'text.primary' },
      '& em': { fontStyle: 'italic' },
      '& a': { color: 'primary.main', textDecoration: 'none', fontWeight: 500, '&:hover': { textDecoration: 'underline' } },
      '& code': {
        // Excepción justificada: <code> inline muestra paths/símbolos literales del
        // repo, no IDs ni montos (mismo caso documentado que el drawer/NexaThread).
        // eslint-disable-next-line greenhouse/no-hardcoded-fontfamily
        fontFamily: 'monospace',
        fontSize: theme => theme.typography.caption.fontSize,
        bgcolor: 'action.selected',
        px: 0.5,
        py: 0.125,
        borderRadius: theme => `${theme.shape.customBorderRadius.xs}px`,
        border: '1px solid',
        borderColor: 'divider'
      }
    }}
  >
    <Markdown remarkPlugins={[remarkGfm]} components={INLINE_COMPONENTS}>
      {text}
    </Markdown>
  </Box>
)

export default InlineMarkdown
