import 'server-only'

import {
  githubFetchJson,
  resolveGithubToken
} from '@/lib/release/github-helpers'
import { redactErrorForResponse } from '@/lib/observability/redact'

import type {
  KortexReaderResult,
  KortexRepositorySnapshot
} from './types'

const KORTEX_REPO_OWNER = 'efeoncepro'
const KORTEX_REPO_NAME = 'kortex'

type GitHubRepoResponse = {
  full_name: string
  html_url: string
  default_branch: string | null
  private: boolean | null
  pushed_at: string | null
  updated_at: string | null
}

type GitHubCommitResponse = {
  sha: string
  html_url: string | null
  commit?: {
    message?: string | null
    author?: {
      date?: string | null
    } | null
  } | null
}

type GitHubSearchResponse = {
  total_count: number
}

const nowIso = () => new Date().toISOString()

const elapsedMs = (startedAt: number) => Math.max(0, Math.round(performance.now() - startedAt))

export const readKortexRepositorySnapshot = async (): Promise<KortexReaderResult<KortexRepositorySnapshot>> => {
  const startedAt = performance.now()
  const token = await resolveGithubToken()

  if (!token) {
    return {
      status: 'unavailable',
      data: null,
      health: {
        source: 'github',
        status: 'unavailable',
        checkedAt: nowIso(),
        latencyMs: elapsedMs(startedAt),
        error: 'GitHub token unavailable'
      }
    }
  }

  try {
    const repoPath = `/repos/${KORTEX_REPO_OWNER}/${KORTEX_REPO_NAME}`
    const repo = await githubFetchJson<GitHubRepoResponse>(repoPath, token)
    const defaultBranch = repo.default_branch

    const [commit, issueSearch, pullRequestSearch] = await Promise.all([
      defaultBranch
        ? githubFetchJson<GitHubCommitResponse>(`${repoPath}/commits/${encodeURIComponent(defaultBranch)}`, token)
        : Promise.resolve(null),
      githubFetchJson<GitHubSearchResponse>(
        `/search/issues?q=${encodeURIComponent(`repo:${KORTEX_REPO_OWNER}/${KORTEX_REPO_NAME} is:issue is:open`)}&per_page=1`,
        token
      ),
      githubFetchJson<GitHubSearchResponse>(
        `/search/issues?q=${encodeURIComponent(`repo:${KORTEX_REPO_OWNER}/${KORTEX_REPO_NAME} is:pr is:open`)}&per_page=1`,
        token
      )
    ])

    return {
      status: 'ok',
      data: {
        owner: KORTEX_REPO_OWNER,
        repo: KORTEX_REPO_NAME,
        nameWithOwner: repo.full_name,
        url: repo.html_url,
        defaultBranch,
        isPrivate: repo.private,
        pushedAt: repo.pushed_at,
        updatedAt: repo.updated_at,
        latestCommit: commit
          ? {
              sha: commit.sha,
              shortSha: commit.sha.slice(0, 7),
              url: commit.html_url,
              message: commit.commit?.message ?? null,
              authoredAt: commit.commit?.author?.date ?? null
            }
          : null,
        openIssueCount: issueSearch.total_count,
        openPullRequestCount: pullRequestSearch.total_count
      },
      health: {
        source: 'github',
        status: 'ok',
        checkedAt: nowIso(),
        latencyMs: elapsedMs(startedAt)
      }
    }
  } catch (error) {
    return {
      status: 'unavailable',
      data: null,
      health: {
        source: 'github',
        status: 'unavailable',
        checkedAt: nowIso(),
        latencyMs: elapsedMs(startedAt),
        error: redactErrorForResponse(error)
      }
    }
  }
}
