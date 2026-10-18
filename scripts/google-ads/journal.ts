import { mkdir, open, chmod, lstat } from 'node:fs/promises'
import { join } from 'node:path'

import { GoogleAdsError } from '../../src/lib/growth/google-ads/contracts'
import { buildWritePlan } from '../../src/lib/growth/google-ads/writes'
import type { GoogleAdsClient } from '../../src/lib/growth/google-ads/client'

/** One durable dispatch per digest; an ambiguous result never authorizes an automatic retry. */
export async function applyOnce(input: unknown, digest: string, client: GoogleAdsClient, directory: string) {
  const plan = buildWritePlan(input)

  if (digest !== plan.digest) throw new GoogleAdsError('WRITE_CONFIRMATION_DIGEST_REQUIRED')
  await client.verifyIdentity()
  await mkdir(directory, { recursive: true, mode: 0o700 })
  const stat = await lstat(directory)

  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0 || (process.getuid && stat.uid !== process.getuid())) throw new GoogleAdsError('PRIVATE_JOURNAL_DIRECTORY_REQUIRED')
  const receiptPath = join(directory, plan.digest + '.json')
  let file

  try { file = await open(receiptPath, 'wx', 0o600) } catch { throw new GoogleAdsError('WRITE_DIGEST_ALREADY_RESERVED', 7) }
  await chmod(receiptPath, 0o600)
  const receipt: Record<string, unknown> = { contractVersion: 'google-ads-receipt.v1', createdAt: new Date().toISOString(), plan, state: 'prepared' }
  const persist = async () => { await file.truncate(0); await file.write(JSON.stringify(receipt, null, 2) + '\n', 0, 'utf8'); await file.sync() }

  try {
    await persist()
    await client.executeWrite(plan.summary, { validateOnly: true })
    receipt.state = 'dispatching'
    receipt.dispatchedAt = new Date().toISOString()
    await persist()

    try {
      const result = await client.executeWrite(plan.summary, { validateOnly: false, confirmDigest: digest })

      receipt.state = 'accepted'
      receipt.result = result
      await persist()

      return { receiptPath, receipt }
    } catch (e) {
      const error = e instanceof GoogleAdsError ? e : new GoogleAdsError('WRITE_RESULT_UNKNOWN', 7)

      receipt.state = error.details.httpStatus && error.details.httpStatus < 500 ? 'rejected' : 'unknown'
      receipt.error = { code: error.code, ...error.details }
      // The exclusively reserved file still blocks replay if disk failure prevents final metadata.
      try { await persist() } catch { /* Preserve the unknown/rejected outcome in the CLI error. */ }
      throw new GoogleAdsError(receipt.state === 'unknown' ? 'WRITE_RESULT_UNKNOWN_NO_RETRY' : 'WRITE_REJECTED', receipt.state === 'unknown' ? 7 : error.exitCode, error.details)
    }
  } finally { await file.close() }
}
