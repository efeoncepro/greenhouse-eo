import { describe, expect, it } from 'vitest'

import {
  buildOmniRequest,
  estimateOmniVideoOutputUsd,
  omniInteractionUrl,
  resolveOmniModel,
  summarizeOmniInteraction,
  type OmniModelKey,
  type OmniRequestOptions,
  type OmniTask
} from '@/lib/ai/gemini-omni-cli'

const image = { uri: 'gs://assets-bucket/start.png', mimeType: 'image/png' }
const secondImage = { uri: 'gs://assets-bucket/end.png', mimeType: 'image/png' }
const video = { uri: 'gs://assets-bucket/source.mp4', mimeType: 'video/mp4' }

function options(task: OmniTask, model?: OmniModelKey): OmniRequestOptions {
  return {
    task,
    prompt: 'A controlled camera move',
    images: [],
    videos: [],
    gcsOutput: 'gs://assets-bucket/out/',
    aspect: '16:9',
    resolution: '720p',
    duration: 5,
    ...(model ? { model } : {})
  }
}

describe('Gemini Omni Cloud CLI contract', () => {
  it.each([
    ['text', [], [], 'text_to_video'],
    ['image', [image], [], 'image_to_video'],
    ['frames', [image, secondImage], [], 'image_to_video'],
    ['reference', [image], [video], 'reference_to_video'],
    ['edit', [image], [video], 'edit'],
    ['extend', [], [video], 'extend']
  ] as const)('builds %s on Omni 1.2 by default with the semantic task', (task, images, videos, providerTask) => {
    const request = buildOmniRequest({ ...options(task), images: [...images], videos: [...videos] })

    expect(request.model).toBe('gemini-omni-1.2-flash')
    expect(request.background).toBe(true)
    expect(request.generation_config.video_config.task).toBe(providerTask)
    expect(request.response_format[0]).toMatchObject({
      delivery: 'uri',
      gcs_uri: 'gs://assets-bucket/out/',
      resolution: '720p'
    })
    expect('duration' in request.response_format[0]).toBe(task !== 'edit')
    expect('aspect_ratio' in request.response_format[0]).toBe(!['edit', 'extend'].includes(task))
    expect('previous_interaction_id' in request).toBe(false)
    expect(request.input.slice(1).map(item => (item as { type: string }).type)).toEqual([
      ...images.map(() => 'image'),
      ...videos.map(() => 'video')
    ])
  })

  it('keeps Omni 1.1 Preview selectable with its own identity and 10s ceiling', () => {
    expect(buildOmniRequest(options('text', '1.1')).model).toBe('gemini-omni-1.1-flash-preview')
    expect(() => buildOmniRequest({ ...options('text', '1.1'), duration: 11 })).toThrow('3 a 10')
    expect(resolveOmniModel('gemini-omni-1.1-flash-preview').key).toBe('1.1')
    expect(resolveOmniModel(undefined).key).toBe('1.2')
    expect(() => resolveOmniModel('2.0')).toThrow('--model')
  })

  it('applies the 1.2 duration ceilings per task', () => {
    expect(buildOmniRequest({ ...options('text'), duration: 15 }).response_format[0]).toMatchObject({ duration: '15s' })
    expect(() => buildOmniRequest({ ...options('text'), duration: 16 })).toThrow('3 a 15')
    expect(() =>
      buildOmniRequest({ ...options('frames'), images: [image, secondImage], duration: 11 })
    ).toThrow('3 a 10')
    expect(() => buildOmniRequest({ ...options('extend'), videos: [video], duration: 11 })).toThrow('3 a 10')
  })

  it('limits 1.2 references: one reference video above 10s, at most 6 images', () => {
    expect(() =>
      buildOmniRequest({ ...options('reference'), videos: [video, video], duration: 12 })
    ).toThrow('Entradas inválidas')
    expect(buildOmniRequest({ ...options('reference'), videos: [video, video], duration: 10 }).model).toBe(
      'gemini-omni-1.2-flash'
    )
    expect(() => buildOmniRequest({ ...options('reference'), images: Array(7).fill(image) })).toThrow(
      'Entradas inválidas'
    )
    expect(() => buildOmniRequest({ ...options('edit'), images: [image, image, image], videos: [video] })).toThrow(
      'Entradas inválidas'
    )
  })

  it('builds a stateless upscale with a valid transition and no aspect or duration', () => {
    const request = buildOmniRequest({
      ...options('upscale'),
      prompt: '',
      videos: [video],
      resolution: '1080p',
      sourceResolution: '720p',
      duration: 15
    })

    expect(request.generation_config.video_config.task).toBe('upscale')
    expect(request.response_format[0]).toEqual({
      type: 'video',
      delivery: 'uri',
      gcs_uri: 'gs://assets-bucket/out/',
      resolution: '1080p'
    })
    expect(request.input).toEqual([{ type: 'video', uri: video.uri, mime_type: 'video/mp4' }])
  })

  it('rejects impossible upscales and upscale on 1.1', () => {
    const base = { ...options('upscale'), videos: [video], duration: 10 }

    expect(() => buildOmniRequest({ ...base, resolution: '4k', sourceResolution: '360p' })).toThrow('360p→4k')
    expect(() => buildOmniRequest({ ...base, resolution: '1080p' })).toThrow('--source-resolution')
    expect(() =>
      buildOmniRequest({ ...base, model: '1.1', resolution: '1080p', sourceResolution: '720p' })
    ).toThrow('no admite upscale')
    expect(() => buildOmniRequest({ ...options('text'), sourceResolution: '360p' })).toThrow('sólo aplica')
  })

  it('chains a follow-up turn with previous_interaction_id and a user_input wrapper', () => {
    const request = buildOmniRequest({
      ...options('upscale'),
      prompt: '',
      resolution: '720p',
      sourceResolution: '360p',
      duration: 8,
      previousInteractionId: 'v1_abc123'
    })

    expect(request.previous_interaction_id).toBe('v1_abc123')
    expect(request.store).toBe(true)
    expect(request.input).toEqual([{ type: 'user_input', content: [{ type: 'text', text: 'Upsample video.' }] }])
    expect(() =>
      buildOmniRequest({ ...options('edit'), videos: [video], previousInteractionId: 'v1_abc123' })
    ).toThrow('turno anterior')
    expect(() => buildOmniRequest({ ...options('text'), previousInteractionId: 'v1_abc123' })).toThrow(
      'sólo aplica a edit y upscale'
    )
  })

  it('rejects missing or extra media before submit', () => {
    expect(() => buildOmniRequest({ ...options('edit'), videos: [] })).toThrow('Entradas inválidas')
    expect(() => buildOmniRequest({ ...options('frames'), images: [image] })).toThrow('Entradas inválidas')
    expect(() => buildOmniRequest({ ...options('text'), videos: [video] })).toThrow('Entradas inválidas')
    expect(() => buildOmniRequest({ ...options('reference', '1.1'), images: Array(11).fill(image) })).toThrow(
      'Entradas inválidas'
    )
  })

  it('rejects unsupported output shapes and non-GCS output', () => {
    expect(() => buildOmniRequest({ ...options('text'), resolution: '8k' as never })).toThrow('--resolution')
    expect(() => buildOmniRequest({ ...options('text'), gcsOutput: 'https://example.test/out' })).toThrow(
      '--gcs-output'
    )
  })

  it('does not cross Cloud identity and flags, without throwing, a foreign model response', () => {
    expect(omniInteractionUrl('efeonce-group')).toBe(
      'https://aiplatform.googleapis.com/v1beta1/projects/efeonce-group/locations/global/interactions'
    )

    const foreign = summarizeOmniInteraction({ id: 'abc', status: 'in_progress', model: 'veo-3.1', steps: [] })

    expect(foreign.unexpectedModel).toBe(true)
    expect(foreign.id).toBe('abc')
    expect(
      summarizeOmniInteraction({ id: 'abc', status: 'completed', model: 'gemini-omni-1.2-flash', steps: [] })
        .unexpectedModel
    ).toBeUndefined()
  })

  it('extracts output without exposing thought text or inline bytes in the summary', () => {
    const result = summarizeOmniInteraction({
      id: 'abc',
      status: 'completed',
      model: 'gemini-omni-1.2-flash',
      steps: [
        { type: 'thought', summary: [{ text: 'private model thought' }] },
        {
          type: 'model_output',
          content: [{ type: 'video', uri: 'gs://assets-bucket/out/clip.mp4', mime_type: 'video/mp4' }]
        }
      ]
    })

    expect(result.videos).toEqual([{ uri: 'gs://assets-bucket/out/clip.mp4', mimeType: 'video/mp4' }])
    expect(result.inlineVideos).toEqual([])
    expect(JSON.stringify(result)).not.toContain('private model thought')
  })

  it('estimates only the published video-output component per model', () => {
    // 1.2: 5,792 tok/s × 10s × $12/1M ≈ $0.695 (Google publica ~$0.70 por 10s a 720p).
    expect(estimateOmniVideoOutputUsd({ resolution: '720p', duration: 10 })).toBeCloseTo(0.695, 3)
    expect(estimateOmniVideoOutputUsd({ resolution: '720p', duration: 15 })).toBeCloseTo(1.0426, 3)
    expect(estimateOmniVideoOutputUsd({ model: '1.1', resolution: '720p', duration: 10 })).toBeCloseTo(1.0136, 4)
    expect(
      estimateOmniVideoOutputUsd({ task: 'upscale', sourceResolution: '720p', resolution: '4k', duration: 10 })
    ).toBeCloseTo(1.39, 2)
  })
})
