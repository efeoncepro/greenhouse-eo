/**
 * Generate hero images for email templates via Imagen 4.
 * Run: npx tsx scripts/generate-email-images.mts
 */
import { GoogleGenAI } from '@google/genai'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const OUTPUT_DIR = join(process.cwd(), 'public', 'images', 'emails')

// Try Imagen 4 first, fallback to Imagen 3
const MODELS = ['imagen-4.0-generate-001', 'imagen-3.0-generate-002']

/**
 * Email hero images — subtle, abstract, modern SaaS aesthetic.
 * 560×315 conceptual (16:9), will be displayed at 560×180 with object-fit.
 * Each image must be: no text, no people, no logos, abstract, professional.
 */
const EMAIL_IMAGES: Record<string, string> = {
  'leave-decision':
    'Modern SaaS email header banner, abstract 3D visualization of a calendar grid floating in space with translucent glass day tiles, some tiles gently glowing green to represent approved time, soft sunlight beams passing through the glass creating warm refractions, a single abstract hourglass shape made of floating glass particles dissolving upward, deep navy to warm teal gradient background, glass morphism aesthetic, subtle bokeh particles, ultra clean Linear/Vercel design language, no text no people no logos, 8K render quality',

  'leave-review':
    'Modern SaaS email header banner, abstract 3D birds-eye view of a translucent glass dashboard with floating approval checkmark and document shapes, small glowing nodes connected by thin lines forming a decision tree pattern, a subtle stamp or seal shape made of frosted glass with an inner glow, deep indigo to soft purple gradient background, glass morphism aesthetic, floating light particles, ultra clean Linear/Vercel design language, no text no people no logos, 8K render quality'
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const client = new GoogleGenAI({
    vertexai: true,
    project: 'efeonce-group',
    location: 'us-central1',
    apiVersion: 'v1'
  })

  let workingModel = ''

  for (const [name, prompt] of Object.entries(EMAIL_IMAGES)) {
    console.log(`\n🎨 Generating: ${name}...`)

    let generated = false

    const modelsToTry = workingModel ? [workingModel] : MODELS

    for (const model of modelsToTry) {
      try {
        console.log(`  Trying model: ${model}`)

        const response = await client.models.generateImages({
          model,
          prompt,
          config: {
            numberOfImages: 1,
            aspectRatio: '16:9'
          }
        })

        const img = response.generatedImages?.[0]

        if (!img?.image?.imageBytes) {
          console.log(`  ⚠ No image data from ${model}`)
          continue
        }

        const buffer = Buffer.from(img.image.imageBytes, 'base64')
        const filePath = join(OUTPUT_DIR, `${name}.png`)

        await writeFile(filePath, buffer)
        console.log(`  ✅ ${name}.png (${(buffer.length / 1024).toFixed(1)} KB)`)

        workingModel = model
        generated = true
        break
      } catch (e: any) {
        console.log(`  ❌ ${model}: ${e.message?.slice(0, 150)}`)
      }
    }

    if (!generated) {
      console.log(`  ⚠ SKIPPED: ${name} — no model available`)
    }
  }

  console.log('\n✅ Done! Email images in:', OUTPUT_DIR)
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
