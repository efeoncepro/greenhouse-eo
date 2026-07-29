import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildGrowthMeetingRenderer } from './lib/growth-meeting-renderer-build.mjs'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptsDir, '..')
const siteDir = resolve(repoRoot, 'artifacts/public-renderers')
const stagingDir = resolve(repoRoot, 'artifacts/public-renderers-build')
const digest = value => createHash('sha256').update(value).digest('hex')
const sri = value => `sha256-${createHash('sha256').update(value).digest('base64')}`

await rm(siteDir, { recursive: true, force: true })
await rm(stagingDir, { recursive: true, force: true })
await mkdir(stagingDir, { recursive: true })
await buildGrowthMeetingRenderer({ repoRoot, channel: 'stable', outDir: stagingDir })

const renderer = await readFile(resolve(stagingDir, 'renderer-stable.js'))
const icons = await readFile(resolve(stagingDir, 'icons.css'))
const releaseId = digest(Buffer.concat([renderer, icons])).slice(0, 20)
const releaseDir = resolve(siteDir, 'releases', releaseId)
const sourceSha = process.env.GITHUB_SHA || process.env.RENDERER_SOURCE_SHA || 'local'
const createdAt = new Date().toISOString()

await mkdir(releaseDir, { recursive: true })
await writeFile(resolve(releaseDir, 'renderer.js'), renderer)
await writeFile(resolve(releaseDir, 'icons.css'), icons)

const manifest = {
  schema: 'efeonce.public-renderer-release.v1', releaseId, sourceSha, createdAt,
  assets: {
    renderer: { path: `/releases/${releaseId}/renderer.js`, sha256: digest(renderer), integrity: sri(renderer) },
    icons: { path: `/releases/${releaseId}/icons.css`, sha256: digest(icons), integrity: sri(icons) },
  },
}

await mkdir(resolve(siteDir, 'channels'), { recursive: true })
await mkdir(resolve(siteDir, '.vercel'), { recursive: true })
await writeFile(resolve(releaseDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
await writeFile(resolve(siteDir, 'channels/stable.json'), `${JSON.stringify(manifest, null, 2)}\n`)
await writeFile(resolve(siteDir, 'health.json'), `${JSON.stringify({ ok: true, channel: 'stable', releaseId, sourceSha, createdAt }, null, 2)}\n`)
await writeFile(resolve(siteDir, '.vercel/project.json'), `${JSON.stringify({
  orgId: 'team_gmNiF4YCHmc1wqsHUTCvqjmN',
  projectId: 'prj_at4qmplrQosTwbcyzVuSxQDL9vkF',
})}\n`)
await writeFile(resolve(siteDir, 'loader.js'), `/* Efeonce public renderer stable loader · TASK-1510 */
(()=>{const root=new URL('.',document.currentScript?.src||location.href);fetch(new URL('channels/stable.json',root),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('manifest');return r.json()}).then(m=>{if(!m?.releaseId||!m?.assets?.renderer?.path||!m?.assets?.icons?.path)throw new Error('contract');const css=document.createElement('link');css.rel='stylesheet';css.href=new URL(m.assets.icons.path,root);css.integrity=m.assets.icons.integrity;css.crossOrigin='anonymous';css.dataset.ghmIconStyles='artifact';css.dataset.ghmIconRelease=m.releaseId;document.head.append(css);const js=document.createElement('script');js.src=new URL(m.assets.renderer.path,root);js.integrity=m.assets.renderer.integrity;js.crossOrigin='anonymous';js.dataset.ghmRendererRelease=m.releaseId;document.head.append(js)}).catch(()=>document.documentElement.dataset.ghmRendererError='load')})();
`)
await writeFile(resolve(siteDir, 'vercel.json'), `${JSON.stringify({
  cleanUrls: false,
  headers: [
    { source: '/releases/(.*)', headers: [
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      { key: 'Access-Control-Allow-Origin', value: '*' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
    ] },
    { source: '/(loader.js|channels/stable.json|health.json)', headers: [
      { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
      { key: 'Access-Control-Allow-Origin', value: '*' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
    ] },
  ],
}, null, 2)}\n`)

await rm(stagingDir, { recursive: true, force: true })
console.log(`[renderer:meeting:site] OK release=${releaseId} source=${sourceSha}`)
