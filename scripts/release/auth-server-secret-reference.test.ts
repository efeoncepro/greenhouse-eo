import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const helper = join(import.meta.dirname, '../../services/_shared/gcloud-secret-iam.sh')

describe('version-pinned Auth secret IAM references', () => {
  it.each([
    ['rooms-production-invitation-authority-token', 'rooms-production-invitation-authority-token'],
    ['rooms-production-invitation-authority-token:latest', 'rooms-production-invitation-authority-token'],
    ['rooms-production-invitation-authority-token:12', 'rooms-production-invitation-authority-token'],
    ['projects/efeonce-group/secrets/auth-otp/versions/3', 'auth-otp'],
    ['projects/efeonce-group/secrets/auth-otp/versions/latest', 'auth-otp']
  ])('extracts secret resource from %s without reading a payload', (reference, expected) => {
    const name = execFileSync('bash', ['-c', 'source "$1"; extract_secret_name "$2"', 'bash', helper, reference], { encoding: 'utf8' })

    expect(name).toBe(expected)
  })

  it('preserves pinned version for the Cloud Run mount', () => {
    const reference = 'auth-otp:12'
    const normalized = execFileSync('bash', ['-c', 'source "$1"; normalize_secret_ref_for_cloud_run "$2"', 'bash', helper, reference], { encoding: 'utf8' })

    expect(normalized).toBe(reference)
  })
})
