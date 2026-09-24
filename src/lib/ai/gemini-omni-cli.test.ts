import { describe, expect, it } from 'vitest'

import {
  buildOmniRequest,
  estimateOmniVideoOutputUsd,
  omniInteractionUrl,
  summarizeOmniInteraction,
  type OmniRequestOptions,
  type OmniTask
} from '@/lib/ai/gemini-omni-cli'

const image = { uri: 'gs://assets-bucket/start.png', mimeType: 'image/png' }
const secondImage = { uri: 'gs://assets-bucket/end.png', mimeType: 'image/png' }
const video = { uri: 'gs://assets-bucket/source.mp4', mimeType: 'video/mp4' }

function options(task: OmniTask): OmniRequestOptions {
  return {
    task,
    prompt: 'A controlled camera move',
    images: [],
    videos: [],
    gcsOutput: 'gs://assets-bucket/out/',
    aspect: '16:9',
    resolution: '720p',
    duration: 5
  }
}

describe('Gemini Omni 1.1 Cloud CLI contract', () => {
  it.each([
    ['text', [], [], 'text_to_video'],
    ['image', [image], [], 'image_to_video'],
    ['frames', [image, secondImage], [], 'image_to_video'],
    ['reference', [image], [video], 'reference_to_video'],
    ['edit', [image], [video], 'edit'],
    ['extend', [], [video], 'extend']
  ] as const)('builds %s with exact Cloud identity and semantic task', (task, images, videos, providerTask) => {
    const request = buildOmniRequest({ ...options(task), images: [...images], videos: [...videos] })

    expect(request.model).toBe('gemini-omni-1.1-flash-preview')
    expect(request.background).toBe(true)
    expect(request.generation_config.video_config.task).toBe(providerTask)
    expect(request.response_format[0]).toMatchObject({
      delivery: 'uri',
      gcs_uri: 'gs://assets-bucket/out/',
      resolution: '720p'
    })
    expect('duration' in request.response_format[0]).toBe(task !== 'edit')
    expect('aspect_ratio' in request.response_format[0]).toBe(!['edit', 'extend'].includes(task))
    expect(request.input.slice(1).map(item => item.type)).toEqual([
      ...images.map(() => 'image'),
      ...videos.map(() => 'video')
    ])
  })

  it('rejects missing or extra media before submit', () => {
    expect(() => buildOmniRequest({ ...options('edit'), videos: [] })).toThrow('Entradas inválidas')
    expect(() => buildOmniRequest({ ...options('frames'), images: [image] })).toThrow('Entradas inválidas')
    expect(() => buildOmniRequest({ ...options('text'), videos: [video] })).toThrow('Entradas inválidas')
    expect(() => buildOmniRequest({ ...options('reference'), images: Array(11).fill(image) })).toThrow(
      'Entradas inválidas'
    )
  })

  it('rejects unsupported output shapes and non-GCS output', () => {
    expect(() => buildOmniRequest({ ...options('text'), duration: 11 })).toThrow('--duration')
    expect(() => buildOmniRequest({ ...options('text'), resolution: '8k' as never })).toThrow('--resolution')
    expect(() => buildOmniRequest({ ...options('text'), gcsOutput: 'https://example.test/out' })).toThrow(
      '--gcs-output'
    )
  })

  it('does not cross Cloud identity or trust a foreign model response', () => {
    expect(omniInteractionUrl('efeonce-group')).toBe(
      'https://aiplatform.googleapis.com/v1beta1/projects/efeonce-group/locations/global/interactions'
    )
    expect(() =>
      summarizeOmniInteraction({
        id: 'abc',
        status: 'completed',
        model: 'gemini-omni-1.1-flash',
        steps: []
      })
    ).toThrow('identidad')
  })

  it('extracts output without exposing thought text or inline bytes in the summary', () => {
    const result = summarizeOmniInteraction({
      id: 'abc',
      status: 'completed',
      model: 'gemini-omni-1.1-flash-preview',
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

  it('estimates only the published video-output component', () => {
    expect(estimateOmniVideoOutputUsd('720p', 10)).toBeCloseTo(1.0136, 4)
  })
})
