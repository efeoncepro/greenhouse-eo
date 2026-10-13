import { describe, expect, it } from 'vitest'

import {
  buildNanoRequest, estimateNanoOutputUsd, nanoUrl, NANO_BANANA_MODEL,
  readNanoSse, summarizeNanoResponses, type NanoOptions
} from './nano-banana-cli'

const options = (changes: Partial<NanoOptions> = {}): NanoOptions => ({ prompt: 'A blue circle', media: [], history: [], resolution: '1K', thinking: 'medium', search: 'off', ...changes })

describe('Nano Banana 2.1 contract', () => {
  it('targets only 2.1 on global and transports all controls without sampling parameters', () => {
    expect(nanoUrl('efeonce-group', 'generateContent')).toContain(`/locations/global/publishers/google/models/${NANO_BANANA_MODEL}:generateContent`)
    expect(buildNanoRequest(options({ resolution: '4K', aspect: '8:1', thinking: 'high', search: 'both', system: 'Keep it simple' }))).toEqual({
      contents: [{ role: 'user', parts: [{ text: 'A blue circle' }] }],
      systemInstruction: { parts: [{ text: 'Keep it simple' }] },
      generationConfig: { candidateCount: 1, responseModalities: ['TEXT', 'IMAGE'], imageConfig: { imageSize: '4K', aspectRatio: '8:1' }, thinkingConfig: { thinkingLevel: 'HIGH', includeThoughts: false } },
      tools: [{ googleSearch: { searchTypes: { webSearch: {}, imageSearch: {} } } }]
    })
  })
  it('does not force landscape on reference edits', () => {
    expect(buildNanoRequest(options()).generationConfig.imageConfig).not.toHaveProperty('aspectRatio')
  })
  it.each(['web', 'images'] as const)('allows independent %s search', search => {
    const request = buildNanoRequest(options({ search }))

    expect(Object.keys(request.tools![0].googleSearch.searchTypes)).toEqual([search === 'web' ? 'webSearch' : 'imageSearch'])
  })
  it('preserves provider signatures and previous output for iterative edits', () => {
    const history: NanoOptions['history'] = [{ role: 'user', parts: [{ text: 'initial' }] }, { role: 'model', parts: [{ inlineData: { mimeType: 'image/png', data: 'abc' }, thoughtSignature: 'opaque-signature' }] }]

    expect(buildNanoRequest(options({ history })).contents.slice(0, 2)).toEqual(history)
  })
  it('rejects 15 references but accepts 14', () => {
    const ref = { inlineData: { mimeType: 'image/png', data: 'abc' } }

    expect(() => buildNanoRequest(options({ media: Array(15).fill(ref) }))).toThrow('Máximo 14')
    expect(buildNanoRequest(options({ media: Array(14).fill(ref) })).contents[0].parts).toHaveLength(15)
  })
  it('accepts video/PDF context without turning into video generation', () => {
    const request = buildNanoRequest(options({ media: [{ fileData: { mimeType: 'video/mp4', fileUri: 'https://www.youtube.com/watch?v=abc' } }, { fileData: { mimeType: 'application/pdf', fileUri: 'gs://private-bucket/source.pdf' } }] }))

    expect(request.generationConfig.responseModalities).toEqual(['TEXT', 'IMAGE'])
  })
  it.each(['https://example.com/video.mp4', 'gs://private-bucket/input.mp4?token=secret', 'https://youtube.com/watch?v=abc&token=secret'])('rejects untrusted/signed URI %s', fileUri => {
    expect(() => buildNanoRequest(options({ media: [{ fileData: { mimeType: 'video/mp4', fileUri } }] }))).toThrow()
  })
  it('rejects removed resolution, invalid ratio, thinking and history before network', () => {
    expect(() => buildNanoRequest(options({ resolution: '512' as '1K' }))).toThrow('512')
    expect(() => buildNanoRequest(options({ aspect: '16:10' }))).toThrow('aspecto')
    expect(() => buildNanoRequest(options({ thinking: 'low' as 'high' }))).toThrow('thinking')
    expect(() => buildNanoRequest(options({ history: [{ role: 'model', parts: [{ text: 'wrong role' }] }] }))).toThrow('Historial')
  })
  it('estimates only published visual output', () => {
    expect(estimateNanoOutputUsd('1K')).toBeCloseTo(0.0336)
    expect(estimateNanoOutputUsd('2K')).toBeCloseTo(0.0504)
    expect(estimateNanoOutputUsd('4K')).toBeCloseTo(0.0756)
  })
  it('excludes private thought images and text but keeps opaque signatures', () => {
    const result = summarizeNanoResponses([{ modelVersion: NANO_BANANA_MODEL, candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'private', thought: true }, { inlineData: { mimeType: 'image/png', data: 'private' }, thought: true }, { text: 'caption' }, { inlineData: { mimeType: 'image/png', data: 'final' }, thoughtSignature: 'opaque' }] } }] }])

    expect(result.text).toBe('caption')
    expect(result.images).toHaveLength(1)
    expect(result.content.parts).not.toContainEqual(expect.objectContaining({ thought: true }))
    expect(result.images[0].thoughtSignature).toBe('opaque')
  })
  it.each(['SAFETY', 'MAX_TOKENS', undefined])('refuses incomplete/blocked %s output', finishReason => {
    expect(() => summarizeNanoResponses([{ candidates: [{ finishReason, content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'partial' } }] } }] }])).toThrow('terminó')
  })
  it('refuses silently substituted models and text-only responses', () => {
    expect(() => summarizeNanoResponses([{ modelVersion: 'gemini-3.1-flash-image' }])).toThrow('modelo distinto')
    expect(() => summarizeNanoResponses([{ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'no image' }] } }] }])).toThrow('imagen final')
  })
  it('parses SSE split inside base64/JSON and CRLF boundaries', async () => {
    const payload = 'data: {"candidates":[{"content":{"parts":[{"text":"hello"}]}}]}\r\n\r\ndata: {"usageMetadata":{"totalTokenCount":4}}\n\ndata: [DONE]\n\n'
    const bytes = new TextEncoder().encode(payload)
    const stream = new ReadableStream<Uint8Array>({ start(controller) { for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7)); controller.close() } })

    expect(await readNanoSse(stream)).toEqual([{ candidates: [{ content: { parts: [{ text: 'hello' }] } }] }, { usageMetadata: { totalTokenCount: 4 } }])
  })
})
