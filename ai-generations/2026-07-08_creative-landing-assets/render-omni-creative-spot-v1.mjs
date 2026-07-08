import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'

const project = 'efeonce-group'
const location = 'global'
const model = 'gemini-omni-flash-preview'
const endpoint = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`

const workspaceRoot = '/Users/jreye/Documents/greenhouse-eo'
const sourceDir = path.join(workspaceRoot, 'ai-generations/2026-07-08_creative-landing-assets')
const outRoot = path.join(sourceDir, 'motion-v1')
const refsDir = path.join(outRoot, 'refs')
const promptsDir = path.join(outRoot, 'prompts')
const mastersDir = path.join(outRoot, 'masters')
const exportsDir = path.join(outRoot, 'exports')
const reviewDir = path.join(outRoot, 'review')
const runtimeVideoDir = '/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/video/creative/portfolio/v1'

const shot = {
  id: 'creative-work-spot',
  source: 'creative-work-spot-ref.png',
  stem: 'creative-work-spot-v1',
  trimStart: 0.25,
  duration: 5,
  width: 720,
  height: 484,
  prompt: `Global direction:
- Produce a premium fictional TV spot sample for Efeonce's Agencia Creativa V2 public landing.
- This is a short website portfolio clip, not a full commercial. The first 5 seconds must be a complete usable beat.
- Preserve the supplied reference frame's deep navy, electric blue, orange and violet palette.
- The clip must feel like a real high-end ad shoot: cinematic camera, practical light movement, reflections, lens breathing, subtle haze, contact shadows and tactile production craft.
- No readable text, no captions, no logos, no real brands, no UI overlays, no watermarks.

Shot: premium audiovisual campaign hero frame inside a studio set.
Action: the camera performs a slow low-angle dolly push across the hero product silhouette and production lights; orange gel light sweeps softly across the floor, blue reflections move over glossy surfaces, a monitor glow flickers in the foreground, and atmospheric haze catches the light. The shot settles into a clean final advertising frame.
Camera: cinematic 35mm, shallow depth of field, controlled motion blur, subtle handheld weight but mostly studio-smooth.
Timing: 0.0-0.8 hold/anticipation, 0.8-3.6 slow push and light sweep, 3.6-5.0 premium settle.
Failure modes: avoid melted geometry, unreadable pseudo-text, fake logos, distorted product shapes, sudden cuts, abstract blobs or camera-only zoom without lighting/reflection life.`
}

function run(name, args) {
  const result = spawnSync(name, args, { stdio: 'inherit' })

  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${name} exited with ${result.status}`)
}

function getAccessToken() {
  return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim()
}

async function ensureReference() {
  await fs.mkdir(refsDir, { recursive: true })
  const src = path.join(sourceDir, shot.source)
  const ref = path.join(refsDir, `${shot.id}-ref-1280x720.png`)

  await fs.access(src)
  run('ffmpeg', ['-y', '-i', src, '-vf', 'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,format=rgb24', ref])
  
return ref
}

async function callOmni(refPath) {
  await fs.mkdir(promptsDir, { recursive: true })
  await fs.mkdir(mastersDir, { recursive: true })
  const promptPath = path.join(promptsDir, `${shot.id}.md`)
  const masterPath = path.join(mastersDir, `${shot.stem}-omni-master.mp4`)
  const metadataPath = path.join(mastersDir, `${shot.stem}-omni-master.metadata.json`)

  await fs.writeFile(promptPath, shot.prompt)

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: (await fs.readFile(refPath)).toString('base64')
            }
          },
          { text: shot.prompt }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'VIDEO']
    }
  }

  const startedAt = new Date().toISOString()

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'x-goog-user-project': project,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const json = await response.json().catch(async () => ({ raw: await response.text().catch(() => '') }))

  if (!response.ok) {
    await fs.writeFile(metadataPath, JSON.stringify({ ok: false, startedAt, status: response.status, response: json }, null, 2))
    throw new Error(`Omni request failed: HTTP ${response.status}`)
  }

  const parts = json?.candidates?.[0]?.content?.parts || []

  const videoPart = parts.find((part) => {
    const inline = part.inlineData || part.inline_data

    
return inline?.data && inline?.mimeType?.startsWith('video/')
  })

  const inline = videoPart?.inlineData || videoPart?.inline_data

  if (!inline?.data) {
    await fs.writeFile(metadataPath, JSON.stringify({ ok: false, startedAt, response: json }, null, 2))
    throw new Error('Omni response did not include video data')
  }

  const videoBuffer = Buffer.from(inline.data, 'base64')

  await fs.writeFile(masterPath, videoBuffer)
  await fs.writeFile(metadataPath, JSON.stringify({
    ok: true,
    startedAt,
    completedAt: new Date().toISOString(),
    project,
    location,
    model,
    endpoint,
    shotId: shot.id,
    promptPath,
    reference: refPath,
    masterPath,
    outputBytes: videoBuffer.length,
    videoMimeType: inline.mimeType,
    usageMetadata: json.usageMetadata || null,
    responseText: parts.filter((part) => typeof part.text === 'string').map((part) => part.text).join('\n\n').slice(0, 4000)
  }, null, 2))

  return masterPath
}

async function transcode(masterPath) {
  await fs.mkdir(exportsDir, { recursive: true })
  run('node', [
    path.join(workspaceRoot, 'scripts/media/pack-web-video.mjs'),
    '--input',
    masterPath,
    '--out-dir',
    exportsDir,
    '--stem',
    shot.stem,
    '--width',
    String(shot.width),
    '--height',
    String(shot.height),
    '--trim-start',
    String(shot.trimStart),
    '--duration',
    String(shot.duration),
    '--poster-offset',
    '0.8',
    '--copy-to',
    runtimeVideoDir
  ])
}

async function review(masterPath) {
  await fs.mkdir(reviewDir, { recursive: true })
  const sheet = path.join(reviewDir, `${shot.stem}-contact-sheet.jpg`)

  run('ffmpeg', ['-y', '-i', masterPath, '-vf', 'fps=1,scale=320:180,tile=5x2', '-frames:v', '1', '-update', '1', sheet])
  
return sheet
}

async function main() {
  const refPath = await ensureReference()
  const masterPath = await callOmni(refPath)

  await transcode(masterPath)
  const reviewSheet = await review(masterPath)

  console.log(JSON.stringify({ ok: true, refPath, masterPath, reviewSheet, runtimeVideoDir }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
