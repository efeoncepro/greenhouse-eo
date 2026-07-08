import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'

const project = 'efeonce-group'
const location = 'global'
const model = 'gemini-omni-flash-preview'
const endpoint = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`

const workspaceRoot = '/Users/jreye/Documents/greenhouse-eo'
const sourceDir = path.join(workspaceRoot, 'ai-generations/2026-07-08_social-wall-assets')
const outRoot = path.join(sourceDir, 'motion-v3')
const refsDir = path.join(outRoot, 'refs')
const promptsDir = path.join(outRoot, 'prompts')
const mastersDir = path.join(outRoot, 'masters')
const exportsDir = path.join(outRoot, 'exports')
const runtimeDir = '/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/video/social/wall/v3'

const sharedPrompt = `Global direction:
- Produce a premium fictional social media sample for Efeonce's public "Redes Sociales" landing.
- This must feel like a living short-form clip captured in context, not a still image with pan/zoom.
- Preserve the supplied reference image's macaw mural art direction, blue/green/gold palette, premium craft and social-first visual language.
- Keep the first 4 seconds as a complete usable beat for a website media wall; the rest of the 10s clip can continue the same action.
- Motion must include believable anticipation, ease, arcs, overlap, blinking, breathing, fabric/hair/handheld micro-movement, lighting changes, shadows and parallax when humans or objects are present.
- Use cinematic social-native language: 24fps cadence, natural motion blur, shallow depth of field, textured light, subtle film grain, rich teal-to-gold color grade.
- No readable text, no captions, no logos, no UI overlays, no watermarks, no brand names.
- Avoid frozen faces, plastic skin, deformed hands, extra fingers, warped phones, melted murals, slideshow cuts, empty abstract motion, or camera-only movement.`

const slots = {
  'muro-a1': {
    source: 'muro-a1-reel-cover.png',
    stem: 'muro-a1-reel-living',
    trimStart: 0.4,
    duration: 4.0,
    prompt: `Shot: vertical Reel cover that becomes alive.
Action: the giant painted macaw wing on the mural subtly unfurls as if the paint has a pulse. Individual feather panels flex with overlapping timing, tiny dust and paint particles catch sunlight, and shadows slide across the wall. A hint of city/water atmosphere moves in the background.
Camera: low-angle 28mm slow push-in with real parallax from foreground leaves; one dominant camera move only.
Timing: 0.0-0.6 holds close to the reference composition, 0.6-2.6 wing feathers breathe outward with anticipation and follow-through, 2.6-4.0 the movement settles near the original pose for a clean web loop.
The mural is artwork becoming alive, not a real bird replacing the mural.`
  },
  'muro-a4': {
    source: 'muro-a4-creator-collaboration.png',
    stem: 'muro-a4-creator-living',
    trimStart: 0.4,
    duration: 4.0,
    prompt: `Shot: creator collaboration behind-the-scenes clip.
Action: a creator/director works in front of the macaw mural. The person shifts weight, raises the phone/gimbal slightly, checks framing, and nods to someone off-camera. A second person in the mural area moves naturally in soft focus. Papers, markers and small production objects react with tiny real-world motion.
Camera: handheld medium shot, 35mm lens, shallow depth of field, gentle rack focus from the phone screen area to the creator and mural.
Timing: 0.0-0.7 anticipation as the creator prepares the shot, 0.7-2.7 active adjustment and nod, 2.7-4.0 settle into a composed BTS hero frame.
Make it feel like a live production moment, not a poster.`
  },
  'muro-b2': {
    source: 'muro-b2-story-frame.png',
    stem: 'muro-b2-story-living',
    trimStart: 0.4,
    duration: 4.0,
    prompt: `Shot: handheld Story frame.
Action: a hand holds a phone recording the macaw mural. The phone tilts and stabilizes with human micro-shake, the thumb subtly taps/settles near the edge, reflections move on the glass, and the painted feathers behind it ripple with light and breeze. The phone screen shows the mural in motion without readable UI or text.
Camera: close handheld phone POV, shallow depth of field, realistic parallax between hand, phone glass and mural.
Timing: 0.0-0.6 hold, 0.6-2.8 small human adjustment and living reflection, 2.8-4.0 settle near the starting composition.
Hands and phone geometry must stay natural and believable.`
  },
  'muro-b3': {
    source: 'muro-b3-trend-reel-cover.png',
    stem: 'muro-b3-trend-living',
    trimStart: 0.4,
    duration: 4.0,
    prompt: `Shot: trend Reel cover with human movement.
Action: a silhouetted creator near the mural/beach takes one expressive step and arm sweep, as if catching the visual trend. The painted wing light blooms behind them, then trails with a subtle feather-smear effect. Water, fabric and hair have secondary motion, and the person remains grounded with real foot contact and shadow.
Camera: low 35mm tracking push, golden-hour backlight, controlled lens flare, cinematic but social-native.
Timing: 0.0-0.5 anticipation, 0.5-2.2 step and arm sweep along a natural arc, 2.2-4.0 recoil and settle into a strong still frame.
Do not make the human float, melt into the mural, or become a statue.`
  },
  'muro-c1': {
    source: 'muro-c1-ugc-clip-still.png',
    stem: 'muro-c1-ugc-living',
    trimStart: 0.4,
    duration: 4.0,
    prompt: `Shot: authentic UGC selfie clip.
Action: the creator is genuinely alive in the scene. She holds the phone at arm's length, laughs silently to camera, blinks, shifts her shoulders, leans slightly toward the mural, then points her smile/attention back to the viewer. Hair, earrings, fabric and skin catch natural light with small secondary motion. The macaw mural stays behind her but breathes through changing light, texture and shallow parallax.
Camera: handheld front-camera social video, 28mm phone lens, close medium selfie framing, small natural arm sway, friendly human imperfection.
Timing: 0.0-0.6 hold near reference, 0.6-2.5 laugh/lean/eye contact, 2.5-4.0 settle near the original composition for a clean loop.
The result should feel like a creator's real clip, not an advertisement and not a moving photo.`
  },
  'muro-c4': {
    source: 'muro-c4-reel-finale-cover.png',
    stem: 'muro-c4-finale-living',
    trimStart: 0.4,
    duration: 4.0,
    prompt: `Shot: cinematic Reel finale.
Action: two luminous macaw shapes swirl through the painted night mural/city space as living brushstrokes. Feathers arc around the frame with depth, particles and mist overlap, and the energy gathers into a clear hero composition. The mural and city lights respond with reflections and atmospheric movement.
Camera: slow controlled orbit/crane feeling, 50mm lens language, layered foreground particles, teal-blue night grade with emerald and gold highlights.
Timing: 0.0-0.5 hold, 0.5-2.7 feather vortex arcs with follow-through, 2.7-4.0 energy settles into a premium final cover pose.
Keep it artistic and social-first; avoid chaotic abstract blobs.`
  }
}

function selectedSlots() {
  const onlyArg = process.argv.find((arg) => arg.startsWith('--only='))

  if (!onlyArg) return Object.keys(slots)

  return onlyArg
    .replace('--only=', '')
    .split(',')
    .map((slot) => slot.trim())
    .filter(Boolean)
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

async function ensureReference(slotId, slot) {
  await fs.mkdir(refsDir, { recursive: true })
  const src = path.join(sourceDir, slot.source)
  const ref = path.join(refsDir, `${slotId}-ref-720x1280.png`)

  await fs.access(src)
  run('ffmpeg', [
    '-y',
    '-i',
    src,
    '-vf',
    'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,format=rgb24',
    ref
  ])

  return ref
}

async function callOmni(slotId, slot, refPath) {
  await fs.mkdir(promptsDir, { recursive: true })
  await fs.mkdir(mastersDir, { recursive: true })

  const prompt = `${sharedPrompt}\n\n${slot.prompt}\n`
  const promptPath = path.join(promptsDir, `${slotId}.md`)
  const masterPath = path.join(mastersDir, `${slot.stem}-omni-master.mp4`)
  const metadataPath = path.join(mastersDir, `${slot.stem}-omni-master.metadata.json`)

  await fs.writeFile(promptPath, prompt)

  const refBuffer = await fs.readFile(refPath)

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: refBuffer.toString('base64')
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
    throw new Error(`Omni request failed for ${slotId}: HTTP ${response.status}`)
  }

  const parts = json?.candidates?.[0]?.content?.parts || []

  const videoPart = parts.find((part) => {
    const inline = part.inlineData || part.inline_data

    
return inline?.data && inline?.mimeType?.startsWith('video/')
  })

  const inline = videoPart?.inlineData || videoPart?.inline_data

  if (!inline?.data) {
    await fs.writeFile(metadataPath, JSON.stringify({ ok: false, startedAt, response: json }, null, 2))
    throw new Error(`Omni response did not include video data for ${slotId}`)
  }

  const videoBuffer = Buffer.from(inline.data, 'base64')

  await fs.writeFile(masterPath, videoBuffer)
  await fs.writeFile(
    metadataPath,
    JSON.stringify(
      {
        ok: true,
        startedAt,
        completedAt: new Date().toISOString(),
        project,
        location,
        model,
        endpoint,
        slotId,
        promptPath,
        reference: refPath,
        masterPath,
        outputBytes: videoBuffer.length,
        videoMimeType: inline.mimeType,
        usageMetadata: json.usageMetadata || null,
        responseText: parts.filter((part) => typeof part.text === 'string').map((part) => part.text).join('\n\n').slice(0, 4000)
      },
      null,
      2
    )
  )

  return masterPath
}

async function transcode(slot, masterPath) {
  await fs.mkdir(exportsDir, { recursive: true })
  await fs.mkdir(runtimeDir, { recursive: true })

  const filter = 'fps=24,scale=432:768:force_original_aspect_ratio=increase,crop=432:648,setsar=1,format=yuv420p'
  const baseOut = path.join(exportsDir, slot.stem)
  const runtimeBase = path.join(runtimeDir, slot.stem)

  const outputs = {
    webm: `${runtimeBase}.webm`,
    mp4: `${runtimeBase}.mp4`,
    poster: `${runtimeBase}-poster.jpg`
  }

  run('ffmpeg', [
    '-y',
    '-ss',
    String(slot.trimStart),
    '-t',
    String(slot.duration),
    '-i',
    masterPath,
    '-vf',
    filter,
    '-an',
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '0',
    '-crf',
    '34',
    '-deadline',
    'good',
    '-row-mt',
    '1',
    outputs.webm
  ])

  run('ffmpeg', [
    '-y',
    '-ss',
    String(slot.trimStart),
    '-t',
    String(slot.duration),
    '-i',
    masterPath,
    '-vf',
    filter,
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputs.mp4
  ])

  run('ffmpeg', [
    '-y',
    '-ss',
    String(slot.trimStart + 0.6),
    '-i',
    masterPath,
    '-frames:v',
    '1',
    '-vf',
    filter,
    '-q:v',
    '3',
    outputs.poster
  ])

  await fs.copyFile(outputs.webm, `${baseOut}.webm`)
  await fs.copyFile(outputs.mp4, `${baseOut}.mp4`)
  await fs.copyFile(outputs.poster, `${baseOut}-poster.jpg`)

  return outputs
}

async function main() {
  const targets = selectedSlots()
  const unknown = targets.filter((slot) => !slots[slot])

  if (unknown.length) {
    throw new Error(`Unknown slots: ${unknown.join(', ')}`)
  }

  const results = []

  for (const slotId of targets) {
    const slot = slots[slotId]

    console.log(`Rendering ${slotId} (${slot.stem})`)
    const refPath = await ensureReference(slotId, slot)
    const masterPath = await callOmni(slotId, slot, refPath)
    const outputs = await transcode(slot, masterPath)

    results.push({ slotId, masterPath, outputs })
  }

  console.log(JSON.stringify({ ok: true, results }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
