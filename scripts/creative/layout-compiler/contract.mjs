import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { parse as parseYaml } from 'yaml'
import { z } from 'zod'

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Expected a six-digit HEX color')
const normalized = z.number().min(0).max(1)
const positiveInt = z.number().int().positive()
const approval = z.enum(['pending', 'approved', 'rejected'])

const normalizedBox = z
  .object({
    x: normalized,
    y: normalized,
    width: normalized.refine(value => value > 0, 'width must be greater than zero'),
    height: normalized.refine(value => value > 0, 'height must be greater than zero')
  })
  .superRefine((box, context) => {
    if (box.x + box.width > 1) context.addIssue({ code: 'custom', message: 'x + width must be <= 1' })
    if (box.y + box.height > 1) context.addIssue({ code: 'custom', message: 'y + height must be <= 1' })
  })

const positionedText = z.object({
  x: z.number().nonnegative(),
  y: z.number().nonnegative(),
  size: z.number().positive(),
  tracking: z.number().default(0)
})

const contractSchema = z
  .object({
    version: z.literal('campaign-layout-compiler.v1'),
    campaign_id: z.string().min(1),
    run_root: z.string().min(1).default('.'),
    anchor: z.object({
      id: z.string().min(1),
      revision: positiveInt,
      asset: z.string().min(1),
      status: approval,
      locks: z.array(z.string().min(1)).min(1)
    }),
    brand_mode: z.enum(['branded', 'brand-light', 'editorial-neutral', 'client-brand']),
    channel_mode: z.enum(['digital-static', 'digital-motion', 'print', 'ooh']),
    message: z.object({
      kicker: z.string(),
      headline: z.array(z.string().min(1)).min(1).max(4),
      support: z.string(),
      url: z.string(),
      cta: z.string().optional(),
      legal: z.string().optional()
    }),
    brand: z.object({
      logo: z.string().min(1),
      fonts: z.object({
        medium: z.string().min(1),
        bold: z.string().min(1),
        extra_bold: z.string().min(1)
      }),
      colors: z.object({
        background: hexColor,
        foreground: hexColor,
        support: hexColor,
        muted: hexColor,
        accent: hexColor,
        accent_secondary: hexColor
      })
    }),
    visual_system: z.object({
      underlay: z.object({
        color: hexColor,
        copy_opacity_start: z.number().min(0).max(1),
        copy_opacity_mid: z.number().min(0).max(1),
        top_opacity: z.number().min(0).max(1),
        vignette_opacity: z.number().min(0).max(1)
      }),
      hook: z.object({
        type: z.enum(['frequency-rail', 'none']),
        colors: z.array(hexColor).min(2).max(4)
      })
    }),
    composition: z.object({
      renderer: z.literal('sharp-fontkit'),
      output_format: z.enum(['jpeg', 'png']).default('jpeg'),
      quality: z.number().int().min(1).max(100).default(94),
      max_bytes: positiveInt.default(5_242_880),
      contact_sheet_columns: z.number().int().min(1).max(4).default(2)
    }),
    approvals: z.object({
      layout: approval,
      human_release: approval,
      anchor_owner: z.string().min(1),
      release_owner: z.string().min(1)
    }),
    artifacts: z.object({
      plan_manifest: z.string().min(1),
      composition_manifest: z.string().min(1),
      qa_report: z.string().min(1),
      contact_sheet: z.string().min(1),
      editable_dir: z.string().min(1)
    }),
    formats: z
      .array(
        z.object({
          id: z.string().min(1),
          ratio: z.string().regex(/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/),
          canvas: z.object({ width: positiveInt, height: positiveInt }),
          grid: z.object({
            columns: positiveInt,
            margin_pct: z.number().min(0).max(25),
            gutter_pct: z.number().min(0).max(25)
          }),
          source_plate: z.string().min(1),
          finished_plate: z.string().min(1),
          output: z.string().min(1),
          baseline: z
            .object({
              output: z.string().min(1),
              max_normalized_mae: z.number().min(0).max(1)
            })
            .optional(),
          copy_field: normalizedBox,
          safe_zones: z.object({
            top: normalized,
            right: normalized,
            bottom: normalized,
            left: normalized
          }),
          finish: z.object({
            status: approval,
            executor: z.string().min(1),
            delta: z.string().min(1),
            input_policy: z.string().min(1)
          }),
          layout: z.object({
            copy_fade_mid: z.number().min(0).max(1),
            copy_fade_end: z.number().min(0).max(1),
            logo: z.object({ left: z.number().nonnegative(), top: z.number().nonnegative(), width: positiveInt }),
            kicker: positionedText,
            hook: z.object({
              x: z.number().nonnegative(),
              y: z.number().nonnegative(),
              width: z.number().positive(),
              height: z.number().positive()
            }),
            headline: positionedText.extend({ gap: z.number().positive() }),
            support: positionedText.extend({ max_width: z.number().positive(), gap: z.number().positive() }),
            url: positionedText,
            rule: z.object({
              x: z.number().nonnegative(),
              y: z.number().nonnegative(),
              width: z.number().positive(),
              height: z.number().positive()
            })
          })
        })
      )
      .min(1),
    gates: z.array(z.enum(['anchor', 'layout', 'finish', 'craft', 'format', 'technical', 'human_release'])).min(1)
  })
  .superRefine((contract, context) => {
    const ids = new Set()
    const outputs = new Set()

    contract.formats.forEach((format, index) => {
      if (ids.has(format.id))
        context.addIssue({ code: 'custom', path: ['formats', index, 'id'], message: 'Format IDs must be unique' })
      if (outputs.has(format.output))
        context.addIssue({
          code: 'custom',
          path: ['formats', index, 'output'],
          message: 'Format outputs must be unique'
        })
      ids.add(format.id)
      outputs.add(format.output)

      const expectedRatio = format.canvas.width / format.canvas.height
      const [ratioWidth, ratioHeight] = format.ratio.split(':').map(Number)
      const declaredRatio = ratioWidth / ratioHeight

      if (Math.abs(expectedRatio - declaredRatio) > 0.015) {
        context.addIssue({
          code: 'custom',
          path: ['formats', index, 'ratio'],
          message: 'Declared ratio does not match canvas'
        })
      }

      const { width, height } = format.canvas
      const { logo, hook, rule } = format.layout

      if (logo.left + logo.width > width || logo.top > height) {
        context.addIssue({
          code: 'custom',
          path: ['formats', index, 'layout', 'logo'],
          message: 'Logo origin/width exceeds canvas'
        })
      }

      if (hook.x + hook.width > width || hook.y + hook.height > height) {
        context.addIssue({ code: 'custom', path: ['formats', index, 'layout', 'hook'], message: 'Hook exceeds canvas' })
      }

      if (rule.x + rule.width > width || rule.y + rule.height > height) {
        context.addIssue({ code: 'custom', path: ['formats', index, 'layout', 'rule'], message: 'Rule exceeds canvas' })
      }
    })
  })

export const formatContractError = error =>
  error.issues.map(issue => `${issue.path.join('.') || 'contract'}: ${issue.message}`).join('\n')

export const resolveContractPath = (contractPath, value) => {
  if (path.isAbsolute(value)) return value

  return path.resolve(path.dirname(contractPath), value)
}

export const resolveRunRoot = (contractPath, contract) => resolveContractPath(contractPath, contract.run_root)

export const resolveRunPath = (contractPath, contract, value) => {
  if (path.isAbsolute(value)) return value

  return path.resolve(resolveRunRoot(contractPath, contract), value)
}

export const loadLayoutContract = async contractPath => {
  const absolutePath = path.resolve(contractPath)
  const raw = await readFile(absolutePath, 'utf8')
  const parsed = absolutePath.endsWith('.json') ? JSON.parse(raw) : parseYaml(raw)
  const result = contractSchema.safeParse(parsed)

  if (!result.success) throw new Error(`Invalid layout compiler contract:\n${formatContractError(result.error)}`)

  return { contract: result.data, contractPath: absolutePath }
}

export { contractSchema }
