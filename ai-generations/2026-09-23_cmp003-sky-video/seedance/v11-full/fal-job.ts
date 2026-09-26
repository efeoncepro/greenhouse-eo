import { config } from 'dotenv'
import { readFile, writeFile, open } from 'node:fs/promises'
import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { uploadFalFile, getFalAccountBalances, runFalModel, getFalRequestStatus, awaitFalRequest } from '@/lib/ai/fal'

config({ path: '.env.local', quiet: true })
const dir = 'ai-generations/2026-09-23_cmp003-sky-video/seedance/v11-full/'
const model = 'bytedance/seedance-2.5/reference-to-video'
const account = 'FAL_API_KEY_B' as const
const save = (name: string, value: unknown) => writeFile(dir + name, JSON.stringify(value, null, 2) + '\n')
const read = async (name: string) => JSON.parse(await readFile(dir + name, 'utf8'))
const hash = (data: Buffer | string) => createHash('sha256').update(data).digest('hex')

async function main() {
  const mode = process.argv[2]
  if (mode === 'prepare') {
    const refs = await read('references.local.json')
    for (const ref of refs) {
      const bytes = await readFile(ref.path)
      if (hash(bytes) !== ref.sha256) throw new Error('Reference hash mismatch')
      const upload = await uploadFalFile({ bytes: new Uint8Array(bytes), fileName: ref.path.split('/').pop(), contentType: ref.kind === 'video' ? 'video/mp4' : 'image/png' })
      ref.url = upload.url
      await save('references.uploaded.json', refs)
      console.log('Uploaded ' + ref.prompt_ref)
    }
    const request = { model, account, input: { prompt: await readFile(dir + 'generation.prompt.txt', 'utf8'), task: 'reference', image_urls: refs.filter((r: any) => r.kind === 'image').map((r: any) => r.url), video_urls: refs.filter((r: any) => r.kind === 'video').map((r: any) => r.url), duration: '30', resolution: '1080p', aspect_ratio: '9:16', generate_audio: false, bitrate_mode: 'high', codec: 'H264' } }
    await save('request.json', request)
    await save('request-identity.json', { sha256: hash(await readFile(dir + 'request.json')), preparedAt: new Date().toISOString() })
    await save('balance-prepared.json', { at: new Date().toISOString(), balances: await getFalAccountBalances() })
    console.log('Ready; no generation submitted')
  } else if (mode === 'submit') {
    const approval = await read('budget-approval.json')
    const identity = await read('request-identity.json')
    const estimate = await read('estimate.json')
    const requestBytes = await readFile(dir + 'request.json')
    if (approval.status !== 'approved' || approval.maxAttempts !== 1 || approval.maxUsd < estimate.estimated_usd || approval.requestSha256 !== identity.sha256 || hash(requestBytes) !== identity.sha256) throw new Error('Budget or payload approval mismatch')
    const balances = await getFalAccountBalances()
    if ((balances.find(b => b.account === account)?.balance ?? 0) < estimate.estimated_usd) throw new Error('Insufficient verified balance')
    await save('balance-before.json', { at: new Date().toISOString(), balances })
    const guard = await open(dir + 'submission-started.json', 'wx')
    await guard.writeFile(JSON.stringify({ at: new Date().toISOString(), requestSha256: identity.sha256 }))
    await guard.close()
    const result = await runFalModel({ model, account, input: JSON.parse(requestBytes.toString()).input, detach: true, onEnqueued: handle => writeFileSync(dir + 'queue-handle.json', JSON.stringify({ ...handle, at: new Date().toISOString() }, null, 2)) })
    await save('submission.json', result)
    console.log({ ok: result.ok, httpStatus: result.httpStatus, requestId: result.requestId })
  } else if (mode === 'status') {
    const handle = await read('queue-handle.json')
    const state = await getFalRequestStatus({ model, account, requestId: handle.requestId })
    await save('status.json', { ...state, at: new Date().toISOString() })
    console.log({ status: state.status, httpStatus: state.httpStatus })
  } else if (mode === 'result') {
    const handle = await read('queue-handle.json')
    const result: any = await awaitFalRequest({ model, account, requestId: handle.requestId, pollTimeoutMs: 50000 })
    await save('result.json', result)
    console.log({ ok: result.ok, httpStatus: result.httpStatus })
    if (result.ok && result.output?.video?.url) {
      const response = await fetch(result.output.video.url)
      if (!response.ok) throw new Error('Output download failed')
      await writeFile(dir + 'sky-v11-fal-native.mp4', new Uint8Array(await response.arrayBuffer()))
      await save('balance-after.json', { at: new Date().toISOString(), balances: await getFalAccountBalances() })
      console.log('Output saved; creative review pending')
    }
  } else throw new Error('Use prepare, submit, status or result')
}
main().catch(() => { console.error('Operation did not complete. Inspect local state; never resubmit automatically.'); process.exitCode = 1 })
