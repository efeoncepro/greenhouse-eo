import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'

const project = 'efeonce-group'
const location = 'global'
const model = 'gemini-omni-flash-preview'
const endpoint = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`

const workspaceRoot = '/Users/jreye/Documents/greenhouse-eo'
const sourceDir = path.join(workspaceRoot, 'ai-generations/2026-07-08_social-includes-assets')
const outRoot = path.join(sourceDir, 'motion-v1')
const refsDir = path.join(outRoot, 'refs')
const promptsDir = path.join(outRoot, 'prompts')
const mastersDir = path.join(outRoot, 'masters')
const exportsDir = path.join(outRoot, 'exports')
const reviewDir = path.join(outRoot, 'review')
const runtimeDir = '/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/video/social/includes/v1'

const sharedPrompt = `Global direction:
- Produce a premium fictional social media production sample for Efeonce's public "Redes Sociales" landing.
- This is a short website media clip, not a full ad. The first 5 seconds must be a complete usable beat.
- Preserve the supplied reference image's blue/green macaw mural art direction, deep navy palette, premium craft and social-first feel.
- Motion must feel alive through human action, camera parallax, light changes, contact shadows, secondary motion and a readable settle.
- Use cinematic social-native language: 24fps cadence, natural motion blur, shallow depth of field, tactile light, subtle film grain.
- No readable text, no captions, no logos, no UI overlays, no watermarks, no brand names.
- Avoid frozen faces, plastic skin, deformed hands, warped phones, melted murals, slideshow cuts, empty abstract motion, or camera-only movement.`

const shots = {
  studio: {
    source: 'includes-studio-production-ref.png',
    stem: 'includes-studio-production-v1',
    trimStart: 0.35,
    duration: 5,
    prompt: `Shot: content production studio, REC on-location context.
Action: a compact crew is actively producing a social clip near the macaw mural. The creator adjusts the camera rig, a hand checks the monitor, an LED panel flickers subtly, and the director gives a small nod. Cables, fabric, paper swatches and dust have tiny real-world secondary movement.
Camera: cinematic handheld 35mm medium-wide, slight push-in with parallax across foreground gear, shallow depth of field, warm practical highlights over teal/navy grade.
Timing: 0.0-0.8 hold/anticipation, 0.8-3.4 active framing adjustment and nod, 3.4-5.0 settle into a polished production-studio hero frame.
This must feel like real production craft in the field, not a generic stock studio.`
  },
  ugc: {
    source: 'includes-ugc-simple-ref.png',
    stem: 'includes-ugc-simple-v1',
    trimStart: 0.35,
    duration: 5,
    prompt: `Shot: simple authentic UGC clip inside a social card.
Action: a creator records a quick candid clip near the macaw mural. They smile, blink, laugh silently, shift the phone slightly, and lean closer as if tagging the brand. The handheld camera has small arm sway, and the background mural/light has natural parallax.
Camera: front-camera phone feel, close medium framing, friendly human imperfection, shallow depth of field.
Timing: 0.0-0.7 hold, 0.7-3.2 smile/laugh/phone micro-adjustment, 3.2-5.0 settle into a believable UGC moment.
Keep it simple and human. It must not feel like a glossy ad or a moving portrait.`
  }
}

function selectedShots() {
  const onlyArg = process.argv.find((arg) => arg.startsWith('--only='))

  if (!onlyArg) return Object.keys(shots)
  
return onlyArg.replace('--only=', '').split(',').map((slot) => slot.trim()).filter(Boolean)
}

function run(name, args) {
  const result = spawnSync(name, args, { encoding: 'utf8' })

  if (result.status !== 0) {
    throw new Error(`${name} failed:\n${result.stderr || result.stdout}`)
  }
}

function getAccessToken() {
  return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim()
}

async function ensureReference(shotId, shot) {
  await fs.mkdir(refsDir, { recursive: true })
  const src = path.join(sourceDir, shot.source)
  const ref = path.join(refsDir, `${shotId}-ref-1280x720.png`)

  await fs.access(src)
  run('ffmpeg', [
    '-y',
    '-i',
    src,
    '-vf',
    'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,format=rgb24',
    ref
  ])
  
return ref
}

async function callOmni(shotId, shot, refPath) {
  await fs.mkdir(promptsDir, { recursive: true })
  await fs.mkdir(mastersDir, { recursive: true })
  const prompt = `${sharedPrompt}\n\n${shot.prompt}\n`
  const promptPath = path.join(promptsDir, `${shotId}.md`)
  const masterPath = path.join(mastersDir, `${shot.stem}-omni-master.mp4`)
  const metadataPath = path.join(mastersDir, `${shot.stem}-omni-master.metadata.json`)

  await fs.writeFile(promptPath, prompt)

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
          { text: prompt }
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
    throw new Error(`Omni request failed for ${shotId}: HTTP ${response.status}`)
  }

  const parts = json?.candidates?.[0]?.content?.parts || []

  const videoPart = parts.find((part) => {
    const inline = part.inlineData || part.inline_data

    
return inline?.data && inline?.mimeType?.startsWith('video/')
  })

  const inline = videoPart?.inlineData || videoPart?.inline_data

  if (!inline?.data) {
    await fs.writeFile(metadataPath, JSON.stringify({ ok: false, startedAt, response: json }, null, 2))
    throw new Error(`Omni response did not include video data for ${shotId}`)
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
    shotId,
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

async function transcode(shot, masterPath) {
  await fs.mkdir(exportsDir, { recursive: true })
  await fs.mkdir(runtimeDir, { recursive: true })
  const filter = 'fps=24,scale=640:360:force_original_aspect_ratio=increase,crop=640:360,setsar=1,format=yuv420p'
  const runtimeBase = path.join(runtimeDir, shot.stem)
  const exportBase = path.join(exportsDir, shot.stem)

  const outputs = {
    webm: `${runtimeBase}.webm`,
    mp4: `${runtimeBase}.mp4`,
    poster: `${runtimeBase}-poster.jpg`
  }

  run('ffmpeg', ['-y', '-ss', String(shot.trimStart), '-t', String(shot.duration), '-i', masterPath, '-vf', filter, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-deadline', 'good', '-row-mt', '1', outputs.webm])
  run('ffmpeg', ['-y', '-ss', String(shot.trimStart), '-t', String(shot.duration), '-i', masterPath, '-vf', filter, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outputs.mp4])
  run('ffmpeg', ['-y', '-ss', String(shot.trimStart + 0.8), '-i', masterPath, '-frames:v', '1', '-vf', filter, '-q:v', '3', outputs.poster])

  await fs.copyFile(outputs.webm, `${exportBase}.webm`)
  await fs.copyFile(outputs.mp4, `${exportBase}.mp4`)
  await fs.copyFile(outputs.poster, `${exportBase}-poster.jpg`)
  
return outputs
}

async function buildReviewSheet(outputs) {
  await fs.mkdir(reviewDir, { recursive: true })
  const frames = []

  for (const item of outputs) {
    const frame = path.join(reviewDir, `${item.shotId}-contact.jpg`)

    run('ffmpeg', ['-y', '-i', item.outputs.mp4, '-vf', 'fps=1,scale=320:180,tile=5x1', '-frames:v', '1', frame])
    frames.push(frame)
  }

  const listPath = path.join(reviewDir, 'contact-list.txt')

  await fs.writeFile(listPath, frames.map((frame) => `file '${frame.replaceAll("'", "'\\''")}'`).join('\n'))
  const sheet = path.join(reviewDir, 'includes-motion-v1-contact-sheet.jpg')

  run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-vf', 'scale=1600:-1,tile=1x2', '-frames:v', '1', sheet])
  
return sheet
}

async function main() {
  const targets = selectedShots()
  const unknown = targets.filter((shotId) => !shots[shotId])

  if (unknown.length) throw new Error(`Unknown shots: ${unknown.join(', ')}`)

  const results = []

  for (const shotId of targets) {
    const shot = shots[shotId]

    console.log(`Rendering ${shotId} (${shot.stem})`)
    const refPath = await ensureReference(shotId, shot)
    const masterPath = await callOmni(shotId, shot, refPath)
    const outputs = await transcode(shot, masterPath)

    results.push({ shotId, masterPath, outputs })
  }

  const reviewSheet = await buildReviewSheet(results)

  console.log(JSON.stringify({ ok: true, reviewSheet, results }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
