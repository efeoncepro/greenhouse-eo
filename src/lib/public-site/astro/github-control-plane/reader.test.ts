import { describe, expect, it } from 'vitest'

import { readPublicSiteGithubControlPlaneSnapshot } from './reader'

const fixedDate = new Date('2026-06-17T12:00:00.000Z')
const mainSha = '4d050fbf7baf4097684f131d4ac31e1d6148ff02'
const developSha = '4d050fbf7baf4097684f131d4ac31e1d6148ff02'

const bindingPacket = {
  vercel: {
    deployments: [
      {
        environment: 'production',
        commitSha: mainSha
      }
    ]
  },
  github: {
    commits: [
      { branch: 'main', sha: mainSha },
      { branch: 'develop', sha: developSha }
    ]
  }
} as never

const jsonByEndpoint = (endpoint: string): unknown => {
  if (endpoint === '/repos/efeoncepro/efeonce-web') {
    return {
      html_url: 'https://github.com/efeoncepro/efeonce-web',
      default_branch: 'main',
      private: true,
      pushed_at: '2026-06-17T00:41:30Z',
      updated_at: '2026-06-17T00:41:35Z'
    }
  }

  if (endpoint.endsWith('/branches/main')) {
    return {
      name: 'main',
      protected: false,
      commit: {
        sha: mainSha,
        url: `https://api.github.com/repos/efeoncepro/efeonce-web/commits/${mainSha}`
      }
    }
  }

  if (endpoint.endsWith('/branches/develop')) {
    return {
      name: 'develop',
      protected: false,
      commit: {
        sha: developSha,
        url: `https://api.github.com/repos/efeoncepro/efeonce-web/commits/${developSha}`
      }
    }
  }

  if (endpoint.includes('/actions/workflows')) {
    return {
      workflows: [
        {
          id: 259783595,
          name: 'CI',
          path: '.github/workflows/ci.yml',
          state: 'active',
          url: 'https://api.github.com/repos/efeoncepro/efeonce-web/actions/workflows/259783595',
          html_url: 'https://github.com/efeoncepro/efeonce-web/actions/workflows/ci.yml'
        }
      ]
    }
  }

  if (endpoint.includes('/actions/runs')) {
    return {
      workflow_runs: [
        {
          id: 27657858751,
          name: 'CI',
          workflow_id: 259783595,
          status: 'completed',
          conclusion: 'failure',
          event: 'push',
          head_branch: 'main',
          head_sha: mainSha,
          html_url: 'https://github.com/efeoncepro/efeonce-web/actions/runs/27657858751',
          created_at: '2026-06-17T00:41:33Z',
          updated_at: '2026-06-17T00:42:00Z',
          run_started_at: '2026-06-17T00:41:33Z'
        }
      ]
    }
  }

  if (endpoint.includes('/search/issues') && endpoint.includes('is%3Aissue')) return { total_count: 0 }
  if (endpoint.includes('/search/issues') && endpoint.includes('is%3Apr')) return { total_count: 0 }

  throw new Error(`Unexpected endpoint ${endpoint}`)
}

describe('readPublicSiteGithubControlPlaneSnapshot', () => {
  it('returns unavailable without throwing when no GitHub token can be resolved', async () => {
    const result = await readPublicSiteGithubControlPlaneSnapshot(
      { now: () => fixedDate },
      {
        resolveToken: async () => null,
        readBinding: async () => bindingPacket
      }
    )

    expect(result.status).toBe('unavailable')
    expect(result.data.repository).toBeNull()
    expect(result.data.commitCorrelation.status).toBe('matched')
    expect(result.data.sources.every(source => source.status === 'unavailable' || source.status === 'degraded')).toBe(true)
  })

  it('reads Public Site GitHub repository, workflow, failed run and release state', async () => {
    const fetchJson = async <T>(endpoint: string, token: string): Promise<T> => {
      expect(token).toBe('gh-token')

      return jsonByEndpoint(endpoint) as T
    }

    const fetchResponse = async (endpoint: string, token: string): Promise<Response> => {
      expect(endpoint).toBe('/repos/efeoncepro/efeonce-web/releases/latest')
      expect(token).toBe('gh-token')

      return new Response('', { status: 404, statusText: 'Not Found' })
    }

    const result = await readPublicSiteGithubControlPlaneSnapshot(
      { now: () => fixedDate },
      {
        resolveToken: async () => 'gh-token',
        fetchJson,
        fetchResponse,
        readBinding: async () => bindingPacket
      }
    )

    expect(result.status).toBe('ok')
    expect(result.data.repository?.nameWithOwner).toBe('efeoncepro/efeonce-web')
    expect(result.data.branches.map(branch => branch.name)).toEqual(['main', 'develop'])
    expect(result.data.workflows[0]?.name).toBe('CI')
    expect(result.data.runs[0]).toMatchObject({
      workflowName: 'CI',
      conclusion: 'failure',
      branch: 'main'
    })
    expect(result.data.releases.status).toBe('no_release')
    expect(result.data.commitCorrelation.status).toBe('matched')
  })
})
