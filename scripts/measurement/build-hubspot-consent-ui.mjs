/** Build the scoped HubSpot presentation adapter for both existing public hosts. */
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { createHash } from 'node:crypto'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const think = resolve(root, '../efeonce-think')
const require = createRequire(resolve(think, 'package.json'))
const primitives = createRequire(require.resolve('@efeoncepro/axis-ui-primitives'))
const primitiveVersion=JSON.parse(readFileSync(resolve(dirname(require.resolve('@efeoncepro/axis-ui-primitives')),'../package.json'),'utf8')).version
const tokenVersion=JSON.parse(readFileSync(resolve(dirname(primitives.resolve('@efeoncepro/axis-tokens')),'../package.json'),'utf8')).version

if(primitiveVersion!=='0.6.6'||tokenVersion!=='0.6.1')throw new Error('Review package provenance before rebuilding the consent UI')
const { efeonceGraphicLine:g, axisGeometry:geo, axisMotion:motion, axisTypography:type, axisElevation:elevation, axisButton:button, axisForms:forms } = await import(primitives.resolve('@efeoncepro/axis-tokens'))
const neutral = button.surfaces.light.neutral

const variables = {
  paper:g.color.paper,ink:g.color.navy,night:g.color.dark,accent:g.color.tealDark,white:neutral.onFill,
  line:neutral.disabledBorder,wash:neutral.softFill,hover:neutral.hoverFill,
  unit:geo.spacing.base,radius:geo.radius.display,round:geo.radius.round,weight:g.type.answer.weight,tracking:g.type.answer.tracking,
  body:type.scale.bodyMd.size,small:type.scale.bodySm.size,title:type.scale.surfaceHeroTitle.size,'title-mobile':type.scale.surfaceHeroTitle.mobileSize,
  duration:motion.duration.standard,ease:motion.ease.emphasized,shadow:elevation.modal.boxShadow,
  border:forms.borderWidth,focus:forms.focusWidth,'focus-offset':forms.focusOffset,
  'button-height':button.sizes.md.minHeight,'button-radius':button.radius,'button-block':button.sizes.md.paddingBlock,'button-inline':button.sizes.md.paddingInline,
  'switch-width':forms.switchWidth,'switch-height':forms.switchHeight,'switch-thumb':forms.switchThumb,'switch-padding':forms.switchPadding,'switch-travel':forms.switchTravel,
}

if (Object.values(variables).some(value => value === undefined)) throw new Error('AXIS token shape changed; inspect before distribution')
const css = '/* AXIS primitives 0.6.6 / tokens 0.6.1. Generated, do not edit distributions. */\nhtml #hs-banner-parent{' + Object.entries(variables).map(([key,value])=>`--eo-cp-${key}:${value}`).join(';') + '}\n' + readFileSync(resolve(root,'scripts/measurement/hubspot-consent-ui.template.css'),'utf8')
const js = readFileSync(resolve(root,'scripts/measurement/hubspot-consent-ui.js'))

const assets = {
  'consent-ui.v1.css':Buffer.from(css),'consent-ui.v1.js':js,
  'bricolage-latin.woff2':readFileSync(resolve(think,'node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2')),
  'poppins-400-latin.woff2':readFileSync(resolve(think,'node_modules/@fontsource/poppins/files/poppins-latin-400-normal.woff2')),
  'poppins-500-latin.woff2':readFileSync(resolve(think,'node_modules/@fontsource/poppins/files/poppins-latin-500-normal.woff2')),
  'LICENSE-bricolage':readFileSync(resolve(think,'node_modules/@fontsource-variable/bricolage-grotesque/LICENSE')),
  'LICENSE-poppins':readFileSync(resolve(think,'node_modules/@fontsource/poppins/LICENSE')),
}

const manifest={version:1,authority:'HubSpot category consent; presentation only',tokens:'@efeoncepro/axis-tokens@0.6.1',primitives:'@efeoncepro/axis-ui-primitives@0.6.6',files:Object.fromEntries(Object.entries(assets).map(([key,value])=>[key,createHash('sha256').update(value).digest('hex')]))}

assets['manifest.json']=Buffer.from(JSON.stringify(manifest,null,2)+'\n')

for(const dir of [resolve(think,'public/measurement/consent-ui'),resolve(root,'../efeonce-public-site-runtime/wp-content/plugins/eo-measurement-consent/assets/consent-ui')]) {
  mkdirSync(dir,{recursive:true});for(const [name,content] of Object.entries(assets)) writeFileSync(resolve(dir,name),content)
}

console.log(JSON.stringify(manifest,null,2))
