import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const project = 'efeonce-group'
const model = 'gemini-omni-flash-preview'
const runRoot = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-07-11_glitch-microphone-intro'
const referencePath = path.join(runRoot, 'refs/glitch-keyref-hand-light-720.png')
const outputPath = path.join(runRoot, 'masters/glitch-microphone-intro-keyref-hand-neutral-probe.mp4')
const metadataPath = path.join(runRoot, 'masters/glitch-microphone-intro-keyref-hand-neutral-probe.metadata.json')
const prompt = 'Animate this supplied broadcast-studio visual as one quiet continuous portrait shot. Preserve the hand, microphone, lighting and composition. Make only subtle natural motion. No text, no signs, no new people, no music, no speech and no cuts.'

const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim()
const startedAt = new Date().toISOString()
const body = { contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/png', data: (await fs.readFile(referencePath)).toString('base64') } }, { text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'VIDEO'] } }

try {
  const response = await fetch(`https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/${model}:generateContent`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'x-goog-user-project': project, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = await response.json().catch(async () => ({ raw: await response.text().catch(() => '') }))
  const parts = json?.candidates?.[0]?.content?.parts || []

  const videoPart = parts.find((part) => { const inline = part.inlineData || part.inline_data;

 

return inline?.data && String(inline?.mimeType || inline?.mime_type || '').startsWith('video/') })

  const inline = videoPart?.inlineData || videoPart?.inline_data

  if (!response.ok || !inline?.data) {
    await fs.writeFile(metadataPath, `${JSON.stringify({ ok: false, startedAt, completedAt: new Date().toISOString(), responseStatus: response.status, promptFeedback: json?.promptFeedback || null, candidateCount: (json?.candidates || []).length, response: json }, null, 2)}\n`)
    throw new Error('Neutral one-image probe returned no video.')
  }

  await fs.writeFile(outputPath, Buffer.from(inline.data, 'base64'))
  await fs.writeFile(metadataPath, `${JSON.stringify({ ok: true, startedAt, completedAt: new Date().toISOString(), referencePath, outputPath, responseStatus: response.status, promptFeedback: json?.promptFeedback || null, usageMetadata: json?.usageMetadata || null }, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify({ ok: true, outputPath, metadataPath })}\n`)
} catch (error) {
  if (!await fs.access(metadataPath).then(() => true).catch(() => false)) await fs.writeFile(metadataPath, `${JSON.stringify({ ok: false, startedAt, error: error instanceof Error ? error.message : String(error) }, null, 2)}\n`)
  throw error
}
