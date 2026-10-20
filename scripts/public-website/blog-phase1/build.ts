import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { efeonceGraphicLine as brand, efeonceTokens as tokens, axisTypography as type } from '@efeoncepro/axis-tokens'
import { glitchAssetUrl, manzanitasAssetUrl } from '@efeoncepro/axis-brand-assets'

const runtime = resolve(process.env.BLOG_RUNTIME_DIR || '../efeonce-public-site-runtime-develop')
const plugin = resolve(runtime, 'wp-content/plugins/eo-elementor-widgets')
const dir = resolve('scripts/public-website/blog-phase1')

const roles = {
  paper: brand.color.paper,
  ink: brand.color.navy,
  dark: brand.color.dark,
  white: tokens.color.surface,
  line: `color-mix(in srgb, ${brand.color.navy} 22%, transparent)`,
  soft: `color-mix(in srgb, ${brand.color.navy} 5%, ${brand.color.paper})`,
  unit: tokens.spacing[4],
  xs: tokens.spacing[1],
  sm: tokens.spacing[2],
  md: tokens.spacing[4],
  lg: tokens.spacing[8],
  xl: `calc(${tokens.spacing[8]} * 2)`,
  radius: tokens.radius.md,
  title: type.scale.surfaceHeroTitle.size,
  'title-mobile': type.scale.surfaceHeroTitle.mobileSize,
  'card-title': type.scale.headlineLg.size,
  body: type.scale.bodyLg.size,
  'body-large': type.scale.bodyLg.size,
  label: type.scale.overline.size
}

mkdirSync(resolve(plugin, 'assets/img/blog'), { recursive: true })
copyFileSync(glitchAssetUrl('glitch-logo-negative'), resolve(plugin, 'assets/img/blog/glitch-logo-negative.svg'))
copyFileSync(
  manzanitasAssetUrl('manzanitas-wordmark-negative'),
  resolve(plugin, 'assets/img/blog/manzanitas-wordmark-negative.svg')
)
writeFileSync(
  resolve(plugin, 'assets/css/blog-phase1.css'),
  `/* Generated from installed AXIS tokens by greenhouse-eo/scripts/public-website/blog-phase1/build.ts */\n.eo-blog {\n${Object.entries(
    roles
  )
    .map(([k, v]) => ` --blog-${k}: ${v};`)
    .join('\n')}\n}\n` + readFileSync(resolve(dir, 'layout.css'), 'utf8')
)
copyFileSync(
  resolve('scripts/public-website/blog-growth-form/host.css'),
  resolve(plugin, 'assets/css/blog-subscription.css')
)
const sections = ['intro', 'latest', 'glitch', 'goals', 'resources', 'news', 'newsletter']

// Prepared data only. No WordPress writer or deployment is invoked by this package.
writeFileSync(
  resolve(dir, 'elementor-body.preview.json'),
  JSON.stringify(
    {
      pageId: 18456,
      publishAuthorized: false,
      elements: sections.map((section, i) => ({
        id: `eoblog${i}`,
        elType: 'container',
        settings: {
          content_width: 'full',
          flex_direction: 'column',
          css_classes: 'eo-blog-section-host',
          padding: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true }
        },
        elements: [
          {
            id: `eobw${i}`,
            elType: 'widget',
            widgetType: 'greenhouse_blog_section',
            settings: { section },
            elements: []
          }
        ]
      }))
    },
    null,
    2
  ) + '\n'
)
console.log('Built local blog assets and Elementor proposal. No publication.')
