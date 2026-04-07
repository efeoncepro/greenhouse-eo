/**
 * Generate category banners for profile headers via Imagen.
 * Run: npx tsx scripts/generate-banners.mts
 */
import { GoogleGenAI } from '@google/genai'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const OUTPUT_DIR = join(process.cwd(), 'public', 'images', 'banners')

// Try Imagen 4 first, fallback to Imagen 3
const MODELS = ['imagen-4.0-generate-001', 'imagen-3.0-generate-002']

const BANNERS: Record<string, string> = {
  leadership:
    'Abstract professional SaaS header banner, deep navy blue to royal purple gradient, subtle constellation pattern with luminous connected nodes and thin golden accent lines, soft ambient light particles, modern enterprise executive aesthetic, ultra clean minimal composition, no text no people no logos, photorealistic quality',

  operations:
    'Abstract professional SaaS header banner, deep blue to teal gradient, flowing data pipeline visualization with translucent geometric shapes and circuit-like pathways, subtle grid pattern overlay, modern project management tech aesthetic, ultra clean minimal, no text no people no logos, photorealistic quality',

  creative:
    'Abstract professional SaaS header banner, warm gradient from deep magenta to soft coral to violet, organic flowing brush-stroke shapes with translucent layers, subtle paint splatter particles, modern creative studio aesthetic, ultra clean minimal, no text no people no logos, photorealistic quality',

  technology:
    'Abstract professional SaaS header banner, dark midnight blue to electric cyan gradient, abstract circuit board topology with glowing trace lines and floating microchip elements, matrix-style subtle data rain, modern developer tech aesthetic, ultra clean minimal, no text no people no logos, photorealistic quality',

  strategy:
    'Abstract professional SaaS header banner, deep indigo to rich purple gradient, abstract wave visualization with flowing data streams and analytics chart silhouettes, subtle aurora borealis glow, modern strategy consulting aesthetic, ultra clean minimal, no text no people no logos, photorealistic quality',

  support:
    'Abstract professional SaaS header banner, deep teal to forest green gradient, balanced geometric crystal shapes with clean facets and soft ambient reflections, subtle hexagonal mesh pattern, modern HR finance stability aesthetic, ultra clean minimal, no text no people no logos, photorealistic quality',

  default:
    'Abstract professional SaaS header banner, deep navy blue to electric purple gradient, subtle geometric mesh network with floating translucent data nodes connected by thin luminous lines, soft bokeh light particles, modern enterprise tech aesthetic, ultra clean minimal, no text no people no logos, photorealistic quality'
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  // Use ADC (gcloud auth application-default)
  const client = new GoogleGenAI({
    vertexai: true,
    project: 'efeonce-group',
    location: 'us-central1',
    apiVersion: 'v1'
  })

  let workingModel = ''

  for (const [category, prompt] of Object.entries(BANNERS)) {
    console.log(`\n🎨 Generating: ${category}...`)

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
        const filePath = join(OUTPUT_DIR, `${category}.png`)

        await writeFile(filePath, buffer)
        console.log(`  ✅ ${category}.png (${(buffer.length / 1024).toFixed(1)} KB)`)

        workingModel = model
        generated = true
        break
      } catch (e: any) {
        console.log(`  ❌ ${model}: ${e.message?.slice(0, 150)}`)
      }
    }

    if (!generated) {
      console.log(`  ⚠ SKIPPED: ${category} — no model available`)
    }
  }

  console.log('\n✅ Done! Banners in:', OUTPUT_DIR)
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
