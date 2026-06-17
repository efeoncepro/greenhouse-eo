'use client'

import '@assistant-ui/react-markdown/styles/dot.css'
import { createElement, useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import {
  useAui,
  useAuiState,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ActionBarPrimitive
} from '@assistant-ui/react'
import { MarkdownTextPrimitive, unstable_memoizeMarkdownComponents } from '@assistant-ui/react-markdown'

import { alpha, type Theme } from '@mui/material/styles'

import { getMicrocopy } from '@/lib/copy'
import { GH_NEXA } from '@/lib/copy/nexa'

import { GreenhouseThinkingBeat, NexaComposer, NexaComposerInput, NexaComposerActionButton, NexaSenderMark } from '@/components/greenhouse/primitives'
import CustomTextField from '@core/components/mui/TextField'

import type { NexaModelSelectorValue } from '@/lib/nexa/use-nexa-runtime'

import { nexaThinScrollbarSx } from '@/views/greenhouse/nexa/floating-chat/nexa-scrollbar'

import NexaModelSelector from './NexaModelSelector'
import NexaToolRenderer from './NexaToolRenderers'

const TASK407_ARIA_EDITAR_MENSAJE = "Editar mensaje"
const TASK407_ARIA_RESPUESTA_UTIL = "Respuesta util"
const TASK407_ARIA_RESPUESTA_NO_UTIL = "Respuesta no util"
const TASK407_ARIA_COPIAR_RESPUESTA = "Copiar respuesta"
const TASK407_ARIA_REGENERAR_RESPUESTA = "Regenerar respuesta"
const TASK407_ARIA_DETENER_GENERACION = "Detener generacion"
const TASK407_ARIA_HISTORIAL_DE_CONVERSACIONES = "Historial de conversaciones"
const TASK407_ARIA_IR_AL_FINAL = "Ir al final"
const TASK407_ARIA_ENVIAR_MENSAJE = "Enviar mensaje"


const GREENHOUSE_COPY = getMicrocopy()

export interface NexaThreadProps {
  onBack?: () => void
  selectedModel: NexaModelSelectorValue
  onModelChange: (value: NexaModelSelectorValue) => void
  compact?: boolean
  suggestions?: string[]
  onHistoryToggle?: () => void
  /**
   * Suprime el header interno (marca "Nexa AI" + selector de modelo). Para
   * embeber el thread dentro de un shell que ya provee su propio header
   * (ej. panel flotante TASK-1078). Opt-in; default conserva el header (Home).
   */
  hideHeader?: boolean
}

/* ── Subtle entrance animation ── */
const msgInSx = {
  '@keyframes nexa-msg-in': {
    '0%': { opacity: 0, transform: 'translateY(6px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' }
  },
  animation: 'nexa-msg-in 0.2s cubic-bezier(0.2, 0, 0, 1)',
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
}

/* ── Wordmark "Nexa" inline (labels por-mensaje) ── Poppins (display SoT) a 16px/600:
   presencia de marca sin pesar como el header (h4 20px). El fontSize inline es una
   excepción deliberada del wordmark (la regla es warn); se centralizará cuando el
   NexaComposer/wordmark pase a primitive del Design System (TASK-1078 follow-up). */
const nexaWordmarkInlineSx = (theme: Theme) => ({
  fontFamily: theme.typography.h4.fontFamily,
  fontWeight: 600,
  fontSize: '1rem',
  lineHeight: 1,
  letterSpacing: 0.1
})

const TextPart = ({ text }: { text: string }) => (
  <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
)

/* ── Markdown prose styles (document-quality) ── */
const proseSx = {
  fontSize: '0.9375rem',
  lineHeight: 1.8,
  color: 'text.primary',
  '& p': { m: 0, mb: 1.5, '&:last-child': { mb: 0 } },
  '& ul, & ol': { my: 1.5, pl: 3, '& li': { mb: 0.75 } },
  '& strong': { fontWeight: 700 },
  '& code': {
    fontSize: '0.8125rem',
    bgcolor: 'action.selected',
    px: 0.75,
    py: 0.25,
    borderRadius: 0.75,

    // Excepcion justificada (TASK-567): el tag <code> dentro de markdown
    // rendering del thread de Nexa muestra source code literal, no IDs ni
    // montos. Es el caso de excepcion documentado en la spec.
    // eslint-disable-next-line greenhouse/no-hardcoded-fontfamily
    fontFamily: 'monospace',
    border: '1px solid',
    borderColor: 'divider'
  },
  '& pre': {
    bgcolor: 'action.hover',
    p: 2,
    borderRadius: 2,
    overflow: 'auto',
    my: 2,
    border: '1px solid',
    borderColor: 'divider',
    '& code': { bgcolor: 'transparent', p: 0, border: 'none' }
  },
  '& a': { color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } },
  '& h1, & h2, & h3': { fontWeight: 700, mt: 2, mb: 1 },
  '& hr': { borderColor: 'divider', my: 2 }
}

/* ── Bloques de markdown memoizados (anti-flicker durante el revelado, TASK-1113) ──
   assistant-ui revela la respuesta con un typewriter (`smooth=true` por defecto) que hace
   crecer el texto en cada tick → ReactMarkdown re-parsea TODO el string cada vez. Sin
   componentes memoizados, el árbol entero re-renderiza por tick → reflow → parpadeo.
   `unstable_memoizeMarkdownComponents` envuelve cada bloque en React.memo comparando su
   nodo `hast`: los bloques ya revelados quedan congelados y solo el último (el que crece)
   re-renderiza. Cero cambio visual — se rinden los mismos tags (<p>/<ul>/<a>/…) que estiliza
   `proseSx` por CSS descendente. `code`/`pre` quedan en los defaults del primitive (que los
   gobierna aparte), por eso NO se memoizan acá. */
const intrinsicMarkdownComponent = (tag: string) => {
  const Comp = (props: Record<string, unknown>) => createElement(tag, props)

  Comp.displayName = `NexaMd_${tag}`

  return Comp
}

const NEXA_MARKDOWN_COMPONENTS = unstable_memoizeMarkdownComponents(
  Object.fromEntries(
    [
      'p', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'del',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'br', 'img'
    ].map(tag => [tag, intrinsicMarkdownComponent(tag)])
  ) as Parameters<typeof unstable_memoizeMarkdownComponents>[0]
)

/* ── Limpieza DETERMINÍSTICA del answer (TASK-1112) ──
   El cuerpo de la respuesta debe ser prosa limpia. Las fuentes son apoyo contextual y viven
   SOLO en el desplegable de procedencia, no en el texto. El modelo, pese al prompt, a veces
   escribe el volcado "Fuentes: [n] = …" y marcadores [n] inline (un LLM puede ignorar la
   instrucción → NO es robusto). Por eso se sanea en el render (determinístico, no depende del
   modelo), cubriendo respuestas nuevas Y threads viejos:
     1) corta el bloque final "Fuentes …" cuando es la lista de citas ("] =").
     2) quita los marcadores de cita inline numéricos ([1], [2, 4], [6]). */
const cleanNexaAnswer = (text: string): string => {
  let out = text

  const match = out.match(/\n+\s*[*_]{0,2}Fuentes\b:?[*_]{0,2}/i)

  if (match && match.index != null && /\]\s*=/.test(out.slice(match.index))) {
    out = out.slice(0, match.index)
  }

  // Marcadores de cita inline completos: [1], [2, 4], [6] (con el espacio previo, sin huecos).
  out = out.replace(/[ \t]*\[\d+(?:\s*,\s*\d+)*\]/g, '')

  // Marcador incompleto al FINAL: durante el revelado typewriter el texto crece char a char,
  // así que un "[", "[1", "[2, " todavía sin cerrar dejaría un corchete colgado. Lo quitamos.
  out = out.replace(/[ \t]*\[[\d,\s]*$/g, '')

  return out.trimEnd()
}

/* Wrapper del Text part del mensaje: MarkdownTextPrimitive lee el texto del contexto
   (ignora las props del part), así que el wrapper no recibe props. `smooth` se conserva
   (el revelado sigue), `components` memoizados eliminan el flicker, y `preprocess` sanea el
   answer (sin volcado "Fuentes:" ni [n] inline) antes de parsear el markdown. */
const NexaMarkdownText = () => (
  <MarkdownTextPrimitive components={NEXA_MARKDOWN_COMPONENTS} preprocess={cleanNexaAnswer} />
)

/* Fallback PURO para tools sin UI registrada: no registra nada (las registra el
   <NexaToolRenderer/> montado al nivel del thread). Renderiza null → comportamiento previo
   para tools desconocidas, sin el loop mount/unmount (TASK-1113). */
const NexaToolFallback = () => null

/* ── User message — subtle query, not a chat bubble ── */
const UserMessage = () => (
  <MessagePrimitive.Root>
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3, ...msgInSx }}>
      <Box sx={{ maxWidth: '85%', position: 'relative' }}>
        <ComposerPrimitive.If editing={false}>
          <Box sx={{
            px: 2.5,
            py: 1.75,
            borderRadius: '12px 12px 2px 12px',
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            transition: 'background-color 0.15s ease',
            '&:hover': { bgcolor: 'action.selected' }
          }}>
            <Typography
              variant='body2'
              component='div'
              sx={{ lineHeight: 1.7, color: 'text.primary' }}
            >
              <MessagePrimitive.Content components={{ Text: TextPart }} />
            </Typography>
          </Box>

          <ActionBarPrimitive.Root
            autohide='always'
            style={{ position: 'absolute', bottom: -4, right: -4 }}
          >
            <ActionBarPrimitive.Edit asChild>
              <IconButton
                size='small'
                aria-label={TASK407_ARIA_EDITAR_MENSAJE}
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: 'background.default',
                  border: 1,
                  borderColor: 'divider',
                  boxShadow: 1,
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' }
                }}
              >
                <i className='tabler-pencil' style={{ fontSize: '0.8rem' }} />
              </IconButton>
            </ActionBarPrimitive.Edit>
          </ActionBarPrimitive.Root>
        </ComposerPrimitive.If>

        <ComposerPrimitive.If editing={true}>
          <ComposerPrimitive.Root>
            <Box sx={{
              border: 2,
              borderColor: 'primary.main',
              borderRadius: '12px',
              overflow: 'hidden',
              bgcolor: 'background.paper'
            }}>
              <ComposerPrimitive.Input asChild>
                <CustomTextField
                  id='nexa-message-edit-input'
                  fullWidth
                  multiline
                  minRows={1}
                  maxRows={4}
                  autoFocus
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      fontSize: '0.9375rem',
                      color: 'text.primary',
                      '& fieldset': { border: 'none' }
                    }
                  }}
                />
              </ComposerPrimitive.Input>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 1 }}>
                <ComposerPrimitive.Cancel asChild>
                  <Button size='small' variant='outlined' color='secondary'>{GREENHOUSE_COPY.actions.cancel}</Button>
                </ComposerPrimitive.Cancel>
                <ComposerPrimitive.Send asChild>
                  <Button size='small' variant='contained'>{GREENHOUSE_COPY.actions.save}</Button>
                </ComposerPrimitive.Send>
              </Box>
            </Box>
          </ComposerPrimitive.Root>
        </ComposerPrimitive.If>
      </Box>
    </Box>
  </MessagePrimitive.Root>
)

/* ── Feedback thumbs ── */
const FeedbackThumbs = ({ messageId }: { messageId: string }) => {
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | null>(null)

  const handleFeedback = useCallback(
    (value: 'positive' | 'negative') => {
      if (sentiment === value) return

      setSentiment(value)

      fetch('/api/home/nexa/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId: messageId, sentiment: value })
      }).catch(() => {})
    },
    [messageId, sentiment]
  )

  return (
    <>
      <IconButton
        size='small'
        aria-label={TASK407_ARIA_RESPUESTA_UTIL}
        aria-pressed={sentiment === 'positive'}
        onClick={() => handleFeedback('positive')}
        sx={{
          width: 28, height: 28, borderRadius: 1.5,
          color: sentiment === 'positive' ? 'success.main' : 'text.secondary',
          opacity: sentiment === 'negative' ? 0.3 : 1,
          '&:hover': { color: 'success.main', bgcolor: 'action.selected' },
          transition: 'all 0.15s ease'
        }}
      >
        <i className={sentiment === 'positive' ? 'tabler-thumb-up-filled' : 'tabler-thumb-up'} style={{ fontSize: '0.875rem' }} />
      </IconButton>
      <IconButton
        size='small'
        aria-label={TASK407_ARIA_RESPUESTA_NO_UTIL}
        aria-pressed={sentiment === 'negative'}
        onClick={() => handleFeedback('negative')}
        sx={{
          width: 28, height: 28, borderRadius: 1.5,
          color: sentiment === 'negative' ? 'error.main' : 'text.secondary',
          opacity: sentiment === 'positive' ? 0.3 : 1,
          '&:hover': { color: 'error.main', bgcolor: 'action.selected' },
          transition: 'all 0.15s ease'
        }}
      >
        <i className={sentiment === 'negative' ? 'tabler-thumb-down-filled' : 'tabler-thumb-down'} style={{ fontSize: '0.875rem' }} />
      </IconButton>
    </>
  )
}

/* ── Thinking beat — "Nexa está pensando" (progreso indeterminado) ──
   Solo cuando el mensaje está corriendo (belt-and-suspenders sobre `hasContent={false}`:
   un mensaje vacío YA completado nunca queda con el beat colgado). El primitive hornea
   el pulse+stagger, reduced-motion y el contrato a11y (role=status + aria-live). */
const NexaThinkingBeatRow = () => {
  const running = useAuiState(s => (s.message?.status?.type ?? '') === 'running')

  if (!running) return null

  return (
    <Stack direction='row' spacing={1.25} alignItems='center' sx={{ pt: 0.5, pb: 0.75 }}>
      {/* Spacer = ancho del avatar (NexaSenderMark, 28px) → el beat arranca alineado con
          la "N" de Nexa (mismo gap que el sender row), no debajo del avatar. */}
      <Box aria-hidden sx={{ width: 28, flexShrink: 0 }} />
      <GreenhouseThinkingBeat kind='nexa' variant='inline' motion='wave' dotCount={5} dotSize={7} />
    </Stack>
  )
}

/* ── Assistant message — open prose, no bubble ── */
const AssistantMessage = () => {
  const messageId = useAuiState(s => {
    const msgs = s.thread.messages

    const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant')

    return lastAssistant?.id ?? 'unknown'
  })

  return (
    <MessagePrimitive.Root>
      <Box sx={{ mb: 4, ...msgInSx }}>
        {/* Sender label — glyph en círculo outline: presencia liviana, content-first */}
        <Stack direction='row' spacing={1.25} alignItems='center' sx={{ mb: 1.5 }}>
          <NexaSenderMark />
          <Typography component='span' sx={[nexaWordmarkInlineSx, { color: 'text.secondary' }]}>
            Nexa
          </Typography>
        </Stack>

        {/* Thinking beat — mientras Nexa compone (mensaje corriendo, aún sin contenido).
            UN solo avatar (el de arriba) + indicador VIVO honesto (no skeleton estático):
            progreso indeterminado → GreenhouseThinkingBeat (dots Nexa, role=status/aria-live
            + reduced-motion horneados). Se reemplaza por el texto al llegar la respuesta. */}
        <MessagePrimitive.If hasContent={false}>
          <NexaThinkingBeatRow />
        </MessagePrimitive.If>

        {/* Prose content — no bubble, no border */}
        <Box sx={{ '& .aui-md': proseSx }}>
          <MessagePrimitive.Content
            components={{
              Text: NexaMarkdownText as any,
              // Las tools se registran UNA vez vía <NexaToolRenderer/> montado al nivel del
              // thread (abajo). El Fallback NO debe registrar: si registra acá, la tool queda
              // "matched" → este Fallback se desmonta → el cleanup des-registra → "unmatched"
              // → re-monta → loop infinito (≈630 remounts/s = el parpadeo, TASK-1113). Para
              // tools sin UI registrada, no renderizamos nada (comportamiento previo).
              tools: { Fallback: NexaToolFallback }
            }}
          />
        </Box>

        {/* Error state */}
        <MessagePrimitive.Error>
          <Box sx={{
            mt: 1.5,
            px: 2,
            py: 1.5,
            borderRadius: 2,
            bgcolor: 'error.lighterOpacity',
            border: 1,
            borderColor: 'error.main',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}>
            <i className='tabler-alert-circle' style={{ fontSize: '1rem', flexShrink: 0 }} />
            <Typography variant='body2' color='error.main' sx={{ flex: 1 }}>
              No se pudo generar una respuesta.
            </Typography>
            <ActionBarPrimitive.Reload asChild>
              <Button size='small' color='error' variant='outlined' sx={{ flexShrink: 0 }}>
                Reintentar
              </Button>
            </ActionBarPrimitive.Reload>
          </Box>
        </MessagePrimitive.Error>

        {/* Contained ActionBar */}
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide='not-last'
          style={{ marginTop: 12 }}
        >
          <Box sx={{
            display: 'inline-flex',
            gap: 0.5,
            bgcolor: 'action.hover',
            borderRadius: 2,
            px: 1,
            py: 0.5
          }}>
            <ActionBarPrimitive.Copy asChild>
              <IconButton
                size='small'
                aria-label={TASK407_ARIA_COPIAR_RESPUESTA}
                sx={{
                  width: 28, height: 28, borderRadius: 1.5,
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary', bgcolor: 'action.selected' },
                  '&[data-copied]': { color: 'success.main' },
                  '& .aui-copy': { display: 'inline-flex' },
                  '& .aui-copied': { display: 'none' },
                  '&[data-copied] .aui-copy': { display: 'none' },
                  '&[data-copied] .aui-copied': { display: 'inline-flex' }
                }}
              >
                <i className='tabler-copy aui-copy' style={{ fontSize: '0.875rem' }} />
                <i className='tabler-check aui-copied' style={{ fontSize: '0.875rem' }} />
              </IconButton>
            </ActionBarPrimitive.Copy>
            <ActionBarPrimitive.Reload asChild>
              <IconButton
                size='small'
                aria-label={TASK407_ARIA_REGENERAR_RESPUESTA}
                sx={{
                  width: 28, height: 28, borderRadius: 1.5,
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary', bgcolor: 'action.selected' }
                }}
              >
                <i className='tabler-refresh' style={{ fontSize: '0.875rem' }} />
              </IconButton>
            </ActionBarPrimitive.Reload>
            <FeedbackThumbs messageId={messageId} />
          </Box>
        </ActionBarPrimitive.Root>
      </Box>
    </MessagePrimitive.Root>
  )
}

/* ── Follow-up suggestions — mini cards, not chips ── */
const FollowupSuggestions = ({ suggestions }: { suggestions: string[] }) => {
  const aui = useAui()
  const isRunning = useAuiState(s => s.thread.isRunning)

  if (isRunning || suggestions.length === 0) return null

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, maxWidth: 720, mx: 'auto', mt: 1, mb: 2, px: 3, ...msgInSx }}>
      {suggestions.map(suggestion => (
        <Box
          key={suggestion}
          role='button'
          tabIndex={0}
          onClick={() => {
            aui.thread().append({
              role: 'user',
              content: [{ type: 'text' as const, text: suggestion }]
            })
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              aui.thread().append({ role: 'user', content: [{ type: 'text' as const, text: suggestion }] })
            }
          }}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '12px',
            px: 2,
            py: 1.25,
            cursor: 'pointer',
            maxWidth: 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            bgcolor: 'background.paper',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
            '& .nexa-suggestion-arrow': {
              opacity: 0,
              transform: 'translateX(-4px)',
              transition: 'opacity 0.15s ease, transform 0.15s ease',
              color: 'primary.main',
              flexShrink: 0
            },
            '&:hover': {
              borderColor: 'primary.main',
              boxShadow: theme => theme.greenhouseElevation.raised.boxShadow,
              transform: 'translateY(-1px)'
            },
            '&:hover .nexa-suggestion-arrow': { opacity: 1, transform: 'translateX(0)' },
            '&:focus-visible': {
              outline: '2px solid var(--mui-palette-primary-main)',
              outlineOffset: 2
            },
            '&:active': { transform: 'translateY(0)' },
            '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } }
          }}
        >
          <Typography variant='body2' color='text.primary' sx={{ lineHeight: 1.45 }}>
            {suggestion}
          </Typography>
          <i className='tabler-arrow-up-right nexa-suggestion-arrow' style={{ fontSize: '0.9rem' }} />
        </Box>
      ))}
    </Box>
  )
}

/* ── Premium composer ── */
const ChatComposer = () => {
  const isRunning = useAuiState(s => s.thread.isRunning)

  return (
    // Placement del composer (sticky sobre paper, banda 720 centrada). La presentación
    // intrínseca (glow + input + botón send/stop + disclaimer) la canoniza `NexaComposer`.
    <Box sx={{
      position: 'sticky',
      bottom: 0,
      // Composer sobre blanco (paper), sin banda gris ni borde → experiencia
      // conversacional continua (UI moderna: el grey backing fragmenta el chat).
      bgcolor: 'background.paper',
      pt: 2,
      pb: 2.5,
      px: 4,
      maxWidth: 720,
      mx: 'auto',
      width: '100%'
    }} data-capture='nexa-composer'>
      <ComposerPrimitive.Root>
        <NexaComposer disclaimer={GH_NEXA.floating.composer_disclaimer}>
          <ComposerPrimitive.Input asChild>
            <NexaComposerInput
              id='nexa-floating-composer-input'
              placeholder={GH_NEXA.floating.composer_placeholder}
              endAdornment={
                isRunning ? (
                  <ComposerPrimitive.Cancel asChild>
                    <NexaComposerActionButton variant='stop' aria-label={TASK407_ARIA_DETENER_GENERACION} />
                  </ComposerPrimitive.Cancel>
                ) : (
                  <ComposerPrimitive.Send asChild>
                    <NexaComposerActionButton variant='send' aria-label={TASK407_ARIA_ENVIAR_MENSAJE} />
                  </ComposerPrimitive.Send>
                )
              }
            />
          </ComposerPrimitive.Input>
        </NexaComposer>
      </ComposerPrimitive.Root>
    </Box>
  )
}

/* Estado de scroll del chat, escrito como ATRIBUTOS en un ancestro (NO en el elemento
   scrollable). Crítico: assistant-ui pone un MutationObserver sobre el viewport (con
   `attributes:true`, filtrando solo mutaciones de `style`); escribir `data-*` ahí dispara
   su re-ancla al fondo y bloquea el scroll hacia arriba. Por eso los atributos van al
   wrapper (ancestro, fuera del subtree observado) y la reveal de scrollbar/sombra se hace
   por CSS descendente. Sin state → cero re-render. Un solo listener passive:
   - `data-scrolling` (transient, ~1s): auto-hide del scrollbar (fade soft).
   - `data-scrolled` (scrollTop > umbral): sombra de profundidad bajo el header. */
const useChatScrollAttributes = (
  scrollRef: RefObject<HTMLElement | null>,
  wrapperRef: RefObject<HTMLElement | null>
) => {
  useEffect(() => {
    const el = scrollRef.current
    const wrapper = wrapperRef.current

    if (!el || !wrapper) return

    let timeout: ReturnType<typeof setTimeout>

    const onScroll = () => {
      wrapper.setAttribute('data-scrolling', 'true')
      clearTimeout(timeout)
      timeout = setTimeout(() => wrapper.setAttribute('data-scrolling', 'false'), 1000)
      wrapper.setAttribute('data-scrolled', el.scrollTop > 4 ? 'true' : 'false')
    }

    el.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      el.removeEventListener('scroll', onScroll)
      clearTimeout(timeout)
    }
  }, [scrollRef, wrapperRef])
}

/* ── Main thread ── */
const NexaThread = ({ onBack, selectedModel, onModelChange, compact, suggestions = [], onHistoryToggle, hideHeader }: NexaThreadProps) => {
  const viewportRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useChatScrollAttributes(viewportRef, wrapperRef)

  return (
    // minHeight:0 cuando el thread vive en un shell de altura acotada (panel flotante,
    // `hideHeader`) → permite que el Viewport interno scrollee en vez de empujar el panel.
    // En el Home (no acotado) se conserva el 60vh histórico.
    // ref={wrapperRef}: el hook escribe data-scrolling / data-scrolled ACÁ (ancestro), no en
    // el viewport — y la reveal de scrollbar + la sombra se hacen por CSS descendente.
    <Box
      ref={wrapperRef}
      sx={theme => ({
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: hideHeader ? 0 : compact ? 'auto' : '60vh',
        // Scrollbar: revela el thumb durante el scroll-activity (data-scrolling, transient).
        '&[data-scrolling="true"] [data-capture="nexa-thread-viewport"]': {
          scrollbarColor: `${alpha(theme.palette.text.primary, 0.26)} transparent`
        },
        '&[data-scrolling="true"] [data-capture="nexa-thread-viewport"]::-webkit-scrollbar-thumb': {
          backgroundColor: alpha(theme.palette.text.primary, 0.24)
        },
        // Sombra de profundidad bajo el header: visible mientras hay contenido scrolleado.
        '&[data-scrolled="true"] .nexa-header-shadow': { opacity: 1 }
      })}
    >
    {/* Frosted header */}
    {!compact && !hideHeader && (
      <Box sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: 'rgba(var(--mui-palette-background-defaultChannel) / 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        px: 2,
        maxWidth: 720,
        mx: 'auto',
        width: '100%'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
          {onHistoryToggle ? (
            <IconButton
              size='small'
              aria-label={TASK407_ARIA_HISTORIAL_DE_CONVERSACIONES}
              onClick={onHistoryToggle}
              sx={{ width: 36, height: 36, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <i className='tabler-history' style={{ fontSize: '1.125rem' }} />
            </IconButton>
          ) : null}
          {onBack ? (
            <Button
              startIcon={<i className='tabler-arrow-left' />}
              onClick={onBack}
              size='small'
              color='secondary'
            >
              Inicio
            </Button>
          ) : null}
        </Box>
        <Stack direction='row' spacing={0.75} alignItems='center'>
          <i className='tabler-sparkles' style={{ fontSize: '1rem', color: 'var(--mui-palette-primary-main)' }} />
          <Typography component='span' sx={[nexaWordmarkInlineSx, { color: 'text.primary' }]}>
            Nexa AI
          </Typography>
        </Stack>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <NexaModelSelector compact selectedModel={selectedModel} onChange={onModelChange} />
        </Box>
      </Box>
    )}

    {/* Thread */}
    <ThreadPrimitive.Root style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative' }}>
      {/* Registro de tool UIs UNA sola vez (siempre montado dentro del runtime) → las 6 tools
          quedan registradas de forma persistente, sin el loop del Fallback (TASK-1113). Renderiza null. */}
      <NexaToolRenderer />
      {/* Sombra de separación bajo el header — SOLO cuando el shell provee su propio header
          (panel flotante, `hideHeader`) y SOLO si hay contenido scrolleado debajo
          (data-scrolled, gobernado por el wrapper). Da profundidad del canvas del chat respecto al header, minimalista
          (soft shadow del borde superior, fade-in). Decorativa, fuera del viewport scrollable. */}
      {hideHeader && (
        <Box
          aria-hidden
          className='nexa-header-shadow'
          sx={theme => ({
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 18,
            zIndex: 6,
            pointerEvents: 'none',
            // Opacity la gobierna el ancestro vía `[data-scrolled="true"] .nexa-header-shadow`
            // (CSS, sin re-render). Gradiente de profundidad (no box-shadow de 1px, que era
            // imperceptible): el header "flota" y proyecta una sombra suave sobre el canvas.
            opacity: 0,
            background: `linear-gradient(to bottom, ${alpha(theme.palette.common.black, 0.14)} 0%, ${alpha(
              theme.palette.common.black,
              0.05
            )} 42%, ${alpha(theme.palette.common.black, 0)} 100%)`,
            transition: 'opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
          })}
        />
      )}
      <ThreadPrimitive.Viewport asChild>
        <Box
          ref={viewportRef}
          data-capture='nexa-thread-viewport'
          sx={theme => ({
            flex: 1,
            // El min-height:0 es lo que permite que ESTE contenedor scrollee (en vez de
            // crecer y empujar el panel/página). overscrollBehavior:contain evita que el
            // scroll se "encadene" a la página al llegar al tope/fondo.
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            // Scroll instantáneo (sin CSS smooth): el auto-scroll-to-bottom de assistant-ui
            // llama scrollTo({behavior:'auto'}), y con `scroll-behavior: smooth` eso se vuelve
            // una animación suave que se re-dispara en CADA resize de contenido durante el
            // streaming → pelea físicamente con la rueda del usuario y mantiene el lock al
            // fondo (no se puede subir). Sin smooth, el sticky-bottom honesto de assistant-ui
            // se ancla si estás al fondo y SUELTA cuando subís (TASK-1113). Reduced-motion
            // queda satisfecho por construcción (no hay motion de scroll).
            maxWidth: compact ? undefined : 720,
            mx: 'auto',
            width: '100%',
            // Margen lateral amplio (alineado con el composer, px:4) → el contenido respira.
            px: 4,
            pt: 3,
            // Scrollbar canónico thin + auto-hide (helper compartido con el rail → consistencia,
            // sin "doble scroll" chunky). La reveal por scroll-activity la agrega el ancestro
            // (`[data-scrolling]`); acá solo base + hover/focus (pseudo-clases seguras).
            ...nexaThinScrollbarSx(theme),
            '@media (prefers-reduced-motion: reduce)': {
              '&::-webkit-scrollbar-thumb': { transition: 'none' }
            }
          })}
        >
          <ThreadPrimitive.Messages
            components={{ UserMessage, AssistantMessage }}
          />
        </Box>
      </ThreadPrimitive.Viewport>

      <FollowupSuggestions suggestions={suggestions} />

      {!hideHeader && (
        <ThreadPrimitive.ScrollToBottom asChild>
          <IconButton
            aria-label={TASK407_ARIA_IR_AL_FINAL}
            sx={{
              position: 'absolute',
              bottom: 100,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              boxShadow: 2,
              '&:hover': { bgcolor: 'action.hover' },
              width: 36,
              height: 36,
              zIndex: 10
            }}
          >
            <i className='tabler-arrow-down' style={{ fontSize: '1.25rem' }} />
          </IconButton>
        </ThreadPrimitive.ScrollToBottom>
      )}

      <ChatComposer />
    </ThreadPrimitive.Root>
    </Box>
  )
}

export default NexaThread
