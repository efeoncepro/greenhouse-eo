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

/**
 * Greenhouse metaphor banners — modern SaaS aesthetic (Linear/Figma/Vercel style).
 * Each banner uses abstract 3D shapes, glass morphism, and gradients to represent
 * the role's function within the greenhouse ecosystem.
 *
 * Leadership  → architects of the greenhouse (glass structures, frameworks, blueprints)
 * Operations  → irrigation system (flowing pipelines, connected nodes, rhythmic flow)
 * Creative    → pollinators (organic blooming shapes, color bursts, cross-pollination)
 * Technology  → engineers (circuit meshes, sensor grids, infrastructure wiring)
 * Strategy    → agronomists (data visualizations, growth curves, analytical layers)
 * Support     → soil and nutrients (root networks, layered foundations, mineral nodes)
 * Default     → seeds (emerging forms, potential energy, new growth)
 */
const BANNERS: Record<string, string> = {
  leadership:
    'Modern SaaS header banner, abstract 3D glass greenhouse architectural framework floating in space, translucent geometric glass panels with frosted edges arranged in a cathedral-like dome structure, thin golden wireframe grid lines connecting the panels, soft volumetric light passing through the glass creating prismatic refractions, deep navy to royal purple gradient background, glass morphism aesthetic, floating subtle bokeh particles, ultra clean Linear/Vercel design language, no text no people no logos, 8K render quality',

  operations:
    'Modern SaaS header banner, abstract 3D visualization of flowing translucent pipes and channels forming an elegant irrigation network, glowing teal liquid flowing through glass tubes with smooth curves and junctions, small pulsing nodes at connection points, rhythmic wave patterns along the flow paths, deep blue to emerald teal gradient background, glass morphism tubes with inner glow, floating water droplet particles, ultra clean Linear/Vercel design language, no text no people no logos, 8K render quality',

  creative:
    'Modern SaaS header banner, abstract 3D organic blooming shapes exploding outward like flowers opening, translucent glass petals with iridescent surfaces catching light, floating pollen-like luminous particles drifting between shapes, warm gradient from deep magenta through coral to soft violet, glass morphism organic forms with chromatic aberration edges, cross-pollination visual with connecting light threads between blooms, ultra clean Linear/Vercel design language, no text no people no logos, 8K render quality',

  technology:
    'Modern SaaS header banner, abstract 3D smart greenhouse infrastructure, glowing circuit-like mesh patterns embedded in translucent dark glass surfaces, tiny LED sensor nodes pulsing along grid intersections, holographic data streams floating upward like growing plants, deep midnight blue to electric cyan gradient background, glass morphism panels with embedded neon trace lines, matrix-style subtle particle rain, ultra clean Linear/Vercel design language, no text no people no logos, 8K render quality',

  strategy:
    'Modern SaaS header banner, abstract 3D analytical landscape showing translucent topographic layers stacked vertically, growth curve lines glowing through frosted glass planes, subtle weather-map contour patterns overlaid, magnifying lens shapes focusing light on data points, deep indigo to rich purple gradient background with warm amber analytical highlights, glass morphism data visualization aesthetic, floating metric particles, ultra clean Linear/Vercel design language, no text no people no logos, 8K render quality',

  support:
    'Modern SaaS header banner, abstract 3D cross-section showing layered translucent planes representing soil strata, glowing root-like neural network pathways connecting between layers, mineral-like crystalline nodes pulsing at intersections, mycorrhizal web pattern creating an interconnected foundation mesh, deep forest green to warm earth brown gradient with golden mineral highlights, glass morphism layered depth, ultra clean Linear/Vercel design language, no text no people no logos, 8K render quality',

  default:
    'Modern SaaS header banner, abstract 3D seedlings emerging from a dark translucent surface, small luminous sprout shapes unfurling upward with soft inner glow, tiny seed forms cracking open revealing light within, morning dew droplets as floating glass spheres catching dawn light, deep navy base fading upward to warm sunrise gold gradient, glass morphism emerging organic forms, gentle particle mist rising, sense of potential and new beginnings, ultra clean Linear/Vercel design language, no text no people no logos, 8K render quality'
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
