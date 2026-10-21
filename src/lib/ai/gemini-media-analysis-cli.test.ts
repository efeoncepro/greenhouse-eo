import { describe, expect, it } from 'vitest'

import {
  assertInlineBudget,
  buildFindingsSchema,
  buildMediaPart,
  composePrompt,
  cueExpectations,
  estimateFrames,
  GEMINI_MEDIA_DEFAULT_MODEL,
  mimeForPath,
  parseClip,
  parseCues,
  parseListenArgs
} from './gemini-media-analysis-cli'

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

  it('un preset basta como prompt', () => {
    expect(parseListenArgs(['--file', 'v.mp4', '--preset', 'impacto'], {}).preset).toBe('impacto')
    expect(() => parseListenArgs(['--file', 'v.mp4', '--preset', 'otro'], {})).toThrow(/desconocido/)
  })

  it('aplica los límites medidos de Gemini 3.8', () => {
    expect(() => parseListenArgs(['--file', 'a.wav', '--file', 'b.wav', '--prompt', 'x'], {})).toThrow(/1 archivo de audio/)
    expect(() => parseListenArgs(['--file', 'v.mp4', '--prompt', 'x', '--fps', '60'], {})).toThrow(/24/)
    expect(() => parseListenArgs(['--file', 'v.mp4', '--prompt', 'x', '--fps', '0'], {})).toThrow(/24/)
    expect(() => parseListenArgs(['--file', 'a.wav', '--prompt', 'x', '--fps', '8'], {})).toThrow(/sólo aplican a videos/)
    expect(() => parseListenArgs(['--file', 'v.mp4', '--prompt', 'x', '--agentic', '--fps', '8'], {})).toThrow(/agentic/)
    expect(() => parseListenArgs(['--file', 'v.mp4', '--prompt', 'x', '--resolution', 'ultra'], {})).toThrow(/imágenes/)
    expect(() => parseListenArgs(['--file', 'v.mp4', '--prompt', 'x', '--thinking', 'minimal'], {})).toThrow(/minimal/)
    expect(parseListenArgs(['--file', 'f.png', '--prompt', 'x', '--resolution', 'ultra'], {}).resolution).toBe('ultra')
  })

  it('--verify y --cues encienden los hallazgos estructurados', () => {
    expect(parseListenArgs(['--file', 'v.mp4', '--prompt', 'x', '--verify'], {}).findings).toBe(true)
    expect(parseListenArgs(['--file', 'v.mp4', '--prompt', 'x', '--cues', 'c.json'], {}).findings).toBe(true)
  })

  it('avisa lo que no hace lo que parece', () => {
    expect(parseListenArgs(['--file', 'v.mp4', '--prompt', 'x', '--temperature', '0.2'], {}).warnings.join(' ')).toMatch(/ignora/)
    expect(parseListenArgs(['--file', 'v.mp4', '--prompt', 'critica la mezcla'], {}).warnings.join(' ')).toMatch(/1 kbps/)
    expect(parseListenArgs(['--file', 'm.wav', '--file', 'v.mp4', '--prompt', 'critica la mezcla'], {}).warnings).toEqual([])
    expect(parseListenArgs(['--file', 'v.mp4', '--preset', 'cierre'], {}).warnings.join(' ')).toMatch(/1 kbps/)
    expect(parseListenArgs(['--file', 'v.mp4', '--preset', 'lockup'], {}).warnings).toEqual([])
  })

  it('mapea formatos, URIs y respeta el tope inline', () => {
    expect(mimeForPath('X.WAV')).toBe('audio/wav')
    expect(mimeForPath('gs://b/p/clip.mp4')).toBe('video/mp4')
    expect(() => assertInlineBudget([10 * 1048576, 10 * 1048576])).toThrow(/--gcs/)
    expect(() => assertInlineBudget([5 * 1048576])).not.toThrow()
  })

  it('interpreta el recorte y estima cuadros', () => {
    expect(parseClip('1.5-2.5')).toEqual({ start: 1.5, end: 2.5 })
    expect(() => parseClip('3-2')).toThrow(/mayor/)
    expect(estimateFrames(8, 24)).toBe(192)
    expect(estimateFrames(8, 24, { start: 1.5, end: 2.5 })).toBe(24)
  })
})

describe('ai:listen — partes y prompt', () => {
  const video = { path: 'v.mp4', mimeType: 'video/mp4', data: 'AAA' }

  it('pone fps, recorte y resolución sólo donde aplican', () => {
    const part = buildMediaPart(video, { fps: 24, clip: { start: 1.5, end: 2.5 }, resolution: 'high', agentic: false })

    expect(part.videoMetadata).toEqual({ fps: 24, startOffset: '1.5s', endOffset: '2.5s' })
    expect(part.mediaResolution).toEqual({ level: 'MEDIA_RESOLUTION_HIGH' })
    expect(buildMediaPart({ path: 'a.wav', mimeType: 'audio/wav', data: 'A' }, { fps: 24, resolution: 'high', agentic: false })).toEqual({
      inlineData: { mimeType: 'audio/wav', data: 'A' }
    })
  })

  it('el modo agéntico reemplaza los controles estáticos y la URI reemplaza al inline', () => {
    const part = buildMediaPart({ path: 'v.mp4', mimeType: 'video/mp4', uri: 'gs://b/v.mp4' }, { agentic: true })

    expect(part).toEqual({ fileData: { fileUri: 'gs://b/v.mp4', mimeType: 'video/mp4' }, mediaProcessing: 'AGENTIC' })
  })

  it('el prompt fija tiempos absolutos con recorte y pide veredicto por cue', () => {
    const prompt = composePrompt({ userPrompt: 'revisa', clip: { start: 1.5, end: 2.5 }, cues: [{ t: 2 }], files: ['v.mp4'], findings: true })

    expect(prompt).toMatch(/ARCHIVO completo/)
    expect(prompt).toMatch(/veredicto por cue/)
    expect(prompt).toMatch(/\(1\) video/)
  })

  it('el schema exige cues sólo cuando hay hoja', () => {
    expect(buildFindingsSchema(true).required).toContain('cues')
    expect(buildFindingsSchema(false).required).not.toContain('cues')
  })
})

describe('ai:listen — hoja de cues', () => {
  // Fragmento real de ai-generations/2026-10-21_aws-partner/audio-cues.json
  const cues = parseCues({
    cues: [
      { t: 1.62, hasta: 2.0, imagen: 'Zambullida continua en el chip de EC2 y fogonazo', sonido: 'silencio absoluto 1,75-2,0' },
      { t: 2.0, imagen: 'GOLPE 1 — pasillo del data center', sonido: 'drop (archivo 10,0), impacto y sub' },
      { t: 4.6, hasta: 4.98, imagen: 'La Tierra se asienta', sonido: 'vacío de la mezcla; sube el sting' },
      { t: 5.0, imagen: 'Lockup en etapas', sonido: 'pico del sting' },
      { t: 5.0, hasta: 8.0, imagen: 'Tierra viva alejándose', sonido: 'cola del drop y fundido' }
    ]
  })

  it('deduce qué se puede medir de cada cue', () => {
    expect(cueExpectations(cues[0])).toEqual([{ kind: 'silencio', t: 1.75, tFin: 2.0 }])
    expect(cueExpectations(cues[1])).toEqual([{ kind: 'golpe', t: 2.0 }])
    expect(cueExpectations(cues[2])).toEqual([])
    expect(cueExpectations(cues[3])).toEqual([{ kind: 'pico', t: 5.0 }])
    expect(cueExpectations(cues[4])).toEqual([])
  })

  it('rechaza una hoja sin tiempos', () => {
    expect(() => parseCues({ cues: [{ imagen: 'x' }] })).toThrow(/"t"/)
    expect(() => parseCues({})).toThrow(/arreglo/)
  })
})
