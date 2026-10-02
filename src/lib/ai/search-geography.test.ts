import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'

import { server } from '@/mocks/node'

import { runOpenAIResponsesWebSearch } from './openai'
import { runPerplexitySearch } from './perplexity'
import { runAnthropicWebSearch } from './anthropic'

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret: async () => ({ value: 'local-test-key', source: 'env' })
}))

describe('canonical search clients transmit native country location', () => {
  it.each(['US', 'MX', 'ES', 'BR', 'HT'])(
    'OpenAI uses approximate country %s in the web_search tool',
    async countryCode => {
      let body: Record<string, unknown> = {}

      server.use(
        http.post('https://api.openai.com/v1/responses', async ({ request }) => {
          body = (await request.json()) as Record<string, unknown>

          return HttpResponse.json({ output: [], usage: {} })
        })
      )
      await runOpenAIResponsesWebSearch({ prompt: 'test', countryCode })
      expect(body.tools).toEqual([{ type: 'web_search', user_location: { type: 'approximate', country: countryCode } }])
    }
  )
  it('Sonar uses web_search_options.user_location, not search_domain_filter', async () => {
    let body: Record<string, unknown> = {}

    server.use(
      http.post('https://api.perplexity.ai/chat/completions', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>

        return HttpResponse.json({ choices: [{ message: { content: 'test' } }] })
      })
    )
    await runPerplexitySearch({ prompt: 'test', countryCode: 'PE' })
    expect(body.web_search_options).toEqual({ user_location: { country: 'PE' } })
    expect(body).not.toHaveProperty('search_domain_filter')
  })
  it('Anthropic sends country within the native search tool', async () => {
    let body: Record<string, unknown> = {}

    server.use(
      http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>

        return HttpResponse.json({
          id: 'message-local',
          type: 'message',
          role: 'assistant',
          model: 'claude',
          content: [],
          usage: { input_tokens: 1, output_tokens: 1 }
        })
      })
    )
    await runAnthropicWebSearch({ prompt: 'test', countryCode: 'MX' })
    expect(body.tools).toEqual([expect.objectContaining({ user_location: { type: 'approximate', country: 'MX' } })])
  })
})
