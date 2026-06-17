import { describe, expect, it } from 'vitest'

import { readPublicSiteAstroBinding } from './binding-reader'

const fixedDate = new Date('2026-06-17T18:00:00.000Z')

const commit = (sha: string, branch: string) => ({
  sha,
  html_url: `https://github.com/efeoncepro/efeonce-web/commit/${sha}`,
  commit: {
    message: `${branch} commit\n\nbody`,
    committer: { date: '2026-06-17T17:00:00Z' }
  }
})

describe('readPublicSiteAstroBinding', () => {
  it('composes static binding, GitHub state, Vercel deployments and route ownership', async () => {
    const packet = await readPublicSiteAstroBinding(
      { bypassCache: true, now: () => fixedDate },
      {
        resolveGithubToken: async () => 'gh-token',
        fetchGithubJson: async endpoint => {
          if (endpoint.endsWith('/main')) return commit('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'main') as never
          if (endpoint.endsWith('/develop')) return commit('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'develop') as never

          throw new Error(`Unexpected endpoint ${endpoint}`)
        },
        resolveVercelToken: async () => 'vercel-token',
        fetchVercelDeployments: async (_token, teamId, projectId, target) => {
          expect(teamId).toBe('team_gmNiF4YCHmc1wqsHUTCvqjmN')
          expect(projectId).toBe('prj_i52CnPvaoNB0Lweqk7L7cLimv7W9')

          return [
            {
              uid: `${target}-deploy`,
              url: `${target}.efeonce-web.vercel.app`,
              state: 'READY',
              target,
              createdAt: Date.parse('2026-06-17T16:00:00Z'),
              meta: { githubCommitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }
            }
          ]
        }
      }
    )

    expect(packet.contractVersion).toBe('public-site-astro-binding.v1')
    expect(packet.status).toBe('ok')
    expect(packet.confidence).toBe('high')
    expect(packet.binding.repository.name).toBe('efeonce-web')
    expect(packet.routeOwnership.length).toBeGreaterThan(0)
    expect(packet.github?.commits.map(item => item.branch)).toEqual(['main', 'develop'])
    expect(packet.vercel?.deployments[0]).toMatchObject({
      environment: 'production',
      status: 'READY',
      shortCommitSha: 'aaaaaaa'
    })
  })

  it('degrades honestly when provider tokens are missing', async () => {
    const packet = await readPublicSiteAstroBinding(
      { bypassCache: true, now: () => fixedDate },
      {
        resolveGithubToken: async () => null,
        resolveVercelToken: async () => null
      }
    )

    expect(packet.status).toBe('degraded')
    expect(packet.confidence).toBe('none')
    expect(packet.github).toBeNull()
    expect(packet.vercel).toBeNull()
    expect(packet.degradedSources.map(source => source.source)).toEqual([
      'github_repo_state',
      'vercel_deployments'
    ])
  })

  it('keeps the response alive when GitHub fails but Vercel succeeds', async () => {
    const packet = await readPublicSiteAstroBinding(
      { bypassCache: true, now: () => fixedDate },
      {
        resolveGithubToken: async () => 'gh-token',
        fetchGithubJson: async () => {
          throw new Error('GitHub API returned 403 token secret-secret')
        },
        resolveVercelToken: async () => 'vercel-token',
        fetchVercelDeployments: async (_token, _teamId, _projectId, target) => [
          {
            uid: `${target}-deploy`,
            url: `${target}.efeonce-web.vercel.app`,
            state: 'READY',
            target,
            createdAt: Date.parse('2026-06-17T16:00:00Z'),
            meta: {}
          }
        ]
      }
    )

    expect(packet.status).toBe('degraded')
    expect(packet.github).toBeNull()
    expect(packet.vercel?.deployments[0]?.status).toBe('READY')
    expect(packet.degradedSources).toHaveLength(1)
    expect(packet.degradedSources[0]?.source).toBe('github_repo_state')
  })
})
