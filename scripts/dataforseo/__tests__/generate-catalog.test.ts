import { describe, expect, it } from 'vitest'

import { parseOfficialPage } from '../generate-catalog'

describe('DataForSEO official documentation parser', () => {
  it('extracts endpoint method, schema, requirements, example and provenance', () => {
    const endpoints = parseOfficialPage({
      id: 42,
      modified: '2026-09-28T10:00:00',
      slug: 'example',
      link: 'https://docs.dataforseo.com/v3/serp/google/example/live/',
      title: { rendered: 'Example' },
      content: {
        rendered: `<h1>Example endpoint</h1><p>This endpoint returns example results for a keyword.</p>
          <div class="endpoint">POST <button data-href="https://api.dataforseo.com/v3/serp/google/example/live"></button></div>
          <div class="dfs-doc-container dfs-doc-request"><table><tr data-doc-id="keyword"><td><code>keyword</code></td><td>string</td><td>keyword required field</td></tr></table></div>
          <code>--data-raw '[{"keyword":"efeonce"}]'</code>`
      }
    })

    expect(endpoints).toEqual([
      expect.objectContaining({
        method: 'POST',
        path: '/v3/serp/google/example/live',
        mode: 'live',
        sourcePageId: 42,
        requestFields: [expect.objectContaining({ name: 'keyword', required: true })],
        example: [{ keyword: 'efeonce' }]
      })
    ])
  })
})
