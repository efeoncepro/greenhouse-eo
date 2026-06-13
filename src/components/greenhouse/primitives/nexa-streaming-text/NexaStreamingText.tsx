'use client'

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { getNexaExpressiveTextPlainText } from '../nexa-expressive-text/NexaExpressiveText'
import { computeRevealedPlainText, isRevealing } from './nexa-streaming-text-controller'
import type { NexaStreamingTextProps } from './nexa-streaming-text-types'

/**
 * Caret de revelado: barra tokenizada (`primary.main`) que parpadea con `steps(1)`. reduced-motion
 * horneado → sin animación (no se oculta el contenido, solo deja de parpadear). NO se renderiza
 * cuando el revelado se asentó (`show=false`).
 */
const StreamingCaret = ({ show }: { show: boolean }) => {
  if (!show) return null

  return (
    <Box
      component='span'
      aria-hidden='true'
      sx={theme => ({
        display: 'inline-block',
        inlineSize: '2px',
        blockSize: '1.05em',
        marginInlineStart: '3px',
        verticalAlign: 'text-bottom',
        borderRadius: '1px',
        backgroundColor: theme.palette.primary.main,
        '@keyframes nexa-stream-caret': { '0%,48%': { opacity: 1 }, '50%,100%': { opacity: 0 } },
        animation: 'nexa-stream-caret 1.05s steps(1) infinite',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 1 }
      })}
    />
  )
}

/**
 * Revelado progresivo de texto de Nexa (el "feel" del asistente que escribe). Transversal:
 * lo consume cualquier surface conversacional (canvas, Nexa Chat, Answer Trace).
 *
 * - `value` mode: contenido completo → revela `revealedFraction` con caret (depiction estática del
 *   canvas, byte-idéntica). Bajo `prefers-reduced-motion` colapsa al texto completo sin caret
 *   (never-hidden: el contenido NUNCA queda atrapado invisible).
 * - `stream` mode: consume un `AsyncIterable<string>` y acumula chunks; caret mientras llega.
 *   Abort-safe: si el stream se corta o el componente se desmonta, asienta lo recibido.
 *
 * Tier de motion: CSS/JS de bajo costo (slicing + caret CSS). NO GSAP — no es coreografía orquestada.
 */
const NexaStreamingText = ({
  mode = 'value',
  value = '',
  revealedFraction,
  minRevealedChars,
  stream,
  onSettled,
  showCaret = true,
  variant = 'body2',
  color = 'text.secondary',
  dataCapture
}: NexaStreamingTextProps) => {
  const fullPlainText = getNexaExpressiveTextPlainText(value)

  // ── stream mode ───────────────────────────────────────────────────────────
  const [streamedText, setStreamedText] = useState('')
  const [streamSettled, setStreamSettled] = useState(false)

  useEffect(() => {
    if (mode !== 'stream' || !stream) return

    let cancelled = false

    setStreamedText('')
    setStreamSettled(false)
    let accumulated = ''

    const consume = async () => {
      try {
        for await (const chunk of stream) {
          if (cancelled) break
          accumulated += chunk
          setStreamedText(accumulated)
        }
      } catch {
        // Abort / stream roto: asienta lo recibido (never-hidden), no relanza.
      } finally {
        if (!cancelled) {
          setStreamSettled(true)
          onSettled?.(accumulated)
        }
      }
    }

    void consume()

    return () => {
      cancelled = true
    }
    // onSettled es estable por contrato del consumer; lo excluimos para no reiniciar el stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, stream])

  if (mode === 'stream') {
    const streamCaretVisible = showCaret && !streamSettled

    
return (
      <Typography
        variant={variant}
        color={color}
        data-capture={dataCapture}
        aria-busy={streamSettled ? undefined : 'true'}
        sx={{ minInlineSize: 0 }}
      >
        {streamedText}
        <StreamingCaret show={streamCaretVisible} />
      </Typography>
    )
  }

  // ── value mode ────────────────────────────────────────────────────────────
  const revealedSlice = computeRevealedPlainText(fullPlainText, {
    fraction: revealedFraction,
    minChars: minRevealedChars
  })

  const stillRevealing = isRevealing(fullPlainText, revealedSlice)
  const caretVisible = showCaret && stillRevealing

  return (
    <Typography variant={variant} color={color} data-capture={dataCapture}>
      {/* Vista "llegando": fracción revelada + caret. Visible en motion normal; oculta bajo reduced-motion. */}
      <Box component='span' sx={{ '@media (prefers-reduced-motion: reduce)': { display: 'none' } }}>
        {revealedSlice}
        <StreamingCaret show={caretVisible} />
      </Box>
      {/* Vista "asentada": texto completo. Oculta en motion normal; visible bajo reduced-motion (never-hidden). */}
      <Box component='span' sx={{ display: 'none', '@media (prefers-reduced-motion: reduce)': { display: 'inline' } }}>
        {fullPlainText}
      </Box>
    </Typography>
  )
}

export default NexaStreamingText
