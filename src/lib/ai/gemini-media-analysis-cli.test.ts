import { describe, expect, it } from 'vitest'

import { assertInlineBudget, GEMINI_MEDIA_DEFAULT_MODEL, mimeForPath, parseListenArgs } from './gemini-media-analysis-cli'

describe('ai:listen — argumentos', () => {
  it('acepta varios archivos en orden y usa el modelo por defecto', () => {
    const args = parseListenArgs(['--file', 'mezcla.wav', '--file', 'video.mp4', '--prompt', 'critica'], {})

    expect(args.files).toEqual(['mezcla.wav', 'video.mp4'])
    expect(args.model).toBe(GEMINI_MEDIA_DEFAULT_MODEL)
  })

  it('el env cambia el modelo y --model gana sobre el env', () => {
    expect(parseListenArgs(['--file', 'a.mp3', '--prompt', 'x'], { GREENHOUSE_GEMINI_MEDIA_MODEL: 'gemini-3.5-flash' }).model).toBe('gemini-3.5-flash')
    expect(parseListenArgs(['--file', 'a.mp3', '--prompt', 'x', '--model', 'gemini-2.5-pro'], { GREENHOUSE_GEMINI_MEDIA_MODEL: 'gemini-3.5-flash' }).model).toBe('gemini-2.5-pro')
  })

  it('rechaza lo que no se puede enviar', () => {
    expect(() => parseListenArgs(['--prompt', 'x'], {})).toThrow(/--file/)
    expect(() => parseListenArgs(['--file', 'a.wav'], {})).toThrow(/--prompt/)
    expect(() => parseListenArgs(['--file', 'a.wav', '--prompt', 'x', '--prompt-file', 'p.txt'], {})).toThrow(/no ambos/)
    expect(() => parseListenArgs(['--file', 'a.psd', '--prompt', 'x'], {})).toThrow(/no soportado/)
    expect(() => parseListenArgs(['--file', 'a.wav', '--prompt', 'x', '--bogus'], {})).toThrow(/desconocida/)
  })

  it('mapea formatos y respeta el tope inline', () => {
    expect(mimeForPath('X.WAV')).toBe('audio/wav')
    expect(mimeForPath('clip.mp4')).toBe('video/mp4')
    expect(() => assertInlineBudget([10 * 1048576, 10 * 1048576])).toThrow(/MB/)
    expect(() => assertInlineBudget([5 * 1048576])).not.toThrow()
  })
})
