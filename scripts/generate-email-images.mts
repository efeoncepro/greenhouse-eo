/**
 * Generate hero images for email templates via Imagen 4.
 * Run: npx tsx scripts/generate-email-images.mts
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { GoogleGenAI } from '@google/genai'

const OUTPUT_DIR = join(process.cwd(), 'public', 'images', 'emails')

// Try Imagen 4 first, fallback to Imagen 3
const MODELS = ['imagen-4.0-generate-001', 'imagen-3.0-generate-002']

const EMAIL_IMAGES: Record<string, string> = {
  'leave-decision':
    'Isometric 3D clay render of a rounded desk calendar with a large circular checkmark badge resting against it, a small rounded suitcase on one side and a stylized palm leaf on the other. Soft matte clay textures with rounded edges on every object. Warm cream-white background with subtle soft shadows on a flat surface. Pastel color palette: calendar in soft white with light teal accents, checkmark badge in muted green clay, suitcase in warm coral clay, palm leaf in sage green. No text, no people, no logos. Professional yet friendly aesthetic similar to Figma or Linear 3D illustrations. Studio lighting, shallow depth of field, clean minimal composition. 16:9 aspect ratio.',

  'leave-review':
    'Isometric 3D clay render of a rounded clipboard with visible lined rows and a checkmark on the top row, a chunky rubber stamp pressed beside it leaving a subtle circular mark, and a short rounded pen resting nearby. Soft matte clay textures with rounded puffy edges on every element. Light warm background with gentle ambient occlusion shadows on a flat surface. Pastel color palette: clipboard in soft off-white clay, stamp in muted indigo-blue clay, pen in warm amber clay, checkmark detail in soft green. No text, no people, no logos. Professional yet approachable style inspired by Notion and Linear 3D icon renders. Studio lighting, shallow depth of field, clean minimal composition. 16:9 aspect ratio.'
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
