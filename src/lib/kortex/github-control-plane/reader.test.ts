import { describe, expect, it } from 'vitest'

import { readKortexGithubControlPlaneSnapshot } from './reader'

const fixedDate = new Date('2026-06-17T12:00:00.000Z')

const jsonByEndpoint = (endpoint: string): unknown => {
  if (endpoint === '/repos/efeoncepro/kortex') {
    return {
      html_url: 'https://github.com/efeoncepro/kortex',
      default_branch: 'main',
      private: true,
      pushed_at: '2026-06-17T10:10:24Z',
      updated_at: '2026-06-17T10:10:24Z'
    }
  }

  if (endpoint.endsWith('/branches/main')) {
    return {
      name: 'main',
      protected: true,
      commit: {
        sha: '7266902e9936d4ad2d56f10cbdcdd0467fc93f2a',
        url: 'https://api.github.com/repos/efeoncepro/kortex/commits/7266902'
      }
    }
  }

  if (endpoint.endsWith('/branches/develop')) {
    return {
      name: 'develop',
      protected: false,
      commit: {
        sha: '1111111e9936d4ad2d56f10cbdcdd0467fc93f2a',
        url: 'https://api.github.com/repos/efeoncepro/kortex/commits/1111111'
      }
    }
  }

  if (endpoint.includes('/actions/workflows')) {
    return {
      workflows: [
        {
          id: 245705338,
          name: 'CI',
          path: '.github/workflows/ci.yml',
          state: 'active',
          url: 'https://api.github.com/repos/efeoncepro/kortex/actions/workflows/245705338',
          html_url: 'https://github.com/efeoncepro/kortex/actions/workflows/ci.yml'
        }
      ]
    }
  }

  if (endpoint.includes('/actions/runs')) {
    return {
      workflow_runs: [
        {
          id: 27681588991,
          name: 'CI',
          workflow_id: 245705338,
          status: 'completed',
          conclusion: 'success',
          event: 'push',
          head_branch: 'main',
          head_sha: '7266902e9936d4ad2d56f10cbdcdd0467fc93f2a',
          html_url: 'https://github.com/efeoncepro/kortex/actions/runs/27681588991',
          created_at: '2026-06-17T10:10:27Z',
          updated_at: '2026-06-17T10:10:40Z',
          run_started_at: '2026-06-17T10:10:27Z'
        }
      ]
    }
  }

  if (endpoint.includes('/search/issues') && endpoint.includes('is%3Aissue')) {
    return { total_count: 2 }
  }

  if (endpoint.includes('/search/issues') && endpoint.includes('is%3Apr')) {
    return { total_count: 1 }
  }

  throw new Error(`Unexpected endpoint ${endpoint}`)
}

describe('readKortexGithubControlPlaneSnapshot', () => {
  it('returns unavailable without throwing when no GitHub token can be resolved', async () => {
    const result = await readKortexGithubControlPlaneSnapshot(
      { now: () => fixedDate },
      { resolveToken: async () => null }
    )

    expect(result.status).toBe('unavailable')
    expect(result.data.repository).toBeNull()
    expect(result.data.sources.every(source => source.status === 'unavailable' || source.status === 'skipped')).toBe(true)
  })

  it('reads Kortex GitHub repository, workflow, run and release state', async () => {
    const fetchJson = async <T>(endpoint: string, token: string): Promise<T> => {
      expect(token).toBe('gh-token')

      return jsonByEndpoint(endpoint) as T
    }

    const fetchResponse = async (endpoint: string, token: string): Promise<Response> => {
      expect(endpoint).toBe('/repos/efeoncepro/kortex/releases/latest')
      expect(token).toBe('gh-token')

      return new Response('', { status: 404, statusText: 'Not Found' })
    }

    const result = await readKortexGithubControlPlaneSnapshot(
      { now: () => fixedDate },
      {
        resolveToken: async () => 'gh-token',
        fetchJson,
        fetchResponse
      }
    )

    expect(result.status).toBe('ok')
    expect(result.data.repository?.nameWithOwner).toBe('efeoncepro/kortex')
    expect(result.data.branches.map(branch => branch.name)).toEqual(['main', 'develop'])
    expect(result.data.workflows[0]?.name).toBe('CI')
    expect(result.data.runs[0]?.workflowName).toBe('CI')
    expect(result.data.releases.status).toBe('no_release')
    expect(result.data.runtimeCorrelation.status).toBe('matched')
  })
})
