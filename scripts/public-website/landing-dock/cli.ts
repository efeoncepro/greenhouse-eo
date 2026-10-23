/**
 * `pnpm public-website:landing-dock` — governed operation of the shared bottom dock of the efeoncepro.com landings
 * (TASK-2043, EPIC-055). The dock is the AXIS primitive `efeonce.landing-dock`; the eo-landing-dock plugin paints it on
 * a landing that has a config in its `_eo_landing_dock` meta and removes that landing's legacy dock from the same HTML,
 * so the two never coexist. Each landing's config lives in the runtime repo (`manifests/landing-dock/<landing>.json`,
 * without keys: the surface key of a landing's own meeting CTA is read from the live page when applying).
 *
 *   status                      which landings have the dock on (live)
 *   preview <landing|all>       injects the dock into the live page in a local browser (no write) and captures it;
 *                               it declines the cookie banner unless --with-cookies
 *   snapshot <landing>          saves the page's content, Elementor data and dock meta to tmp/landing-dock/snapshots
 *   on <landing> --confirm      stores the config live (needs a snapshot of the last hour), purges, verifies the HTML
 *   off <landing> --confirm     deletes the config live (the legacy dock comes back), purges, verifies the HTML
 *   verify <landing>            checks the served HTML: one dock (or none) and no legacy dock while it is on
 *   purge                       purges the page cache (after a plugin update, so the landings serve the new AXIS files)
 *
 * `on` and `off` write production: they need the operator's go.
 * Manual: docs/manual-de-uso/public-site/operar-dock-de-landings.md
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

type Json = any

const ROOT = resolve(__dirname, '../../..')
const DIR = join(ROOT, 'tmp/landing-dock')
const RUNTIME = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const MANIFESTS = join(RUNTIME, 'manifests/landing-dock')
const PLUGIN = join(RUNTIME, 'wp-content/plugins/eo-landing-dock')
const SITE = 'https://efeoncepro.com'
const AVOID = '#hs-eu-cookie-confirmation,[data-landing-dock-avoid]'
const SNAPSHOT_MAX_AGE_MS = 60 * 60 * 1000

const fail = (message: string): never => {
  console.error(`✗ ${message}`)
  process.exit(1)
}

const ok = (message: string) => console.log(`✓ ${message}`)
const flagSet = (name: string) => process.argv.includes(`--${name}`)
const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'))

const write = (file: string, value: unknown) => {
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n')
}

const landings = () => readdirSync(MANIFESTS).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort()

const manifest = (landing: string): Json => {
  const file = join(MANIFESTS, `${landing}.json`)

  return existsSync(file) ? read(file) : fail(`No landing «${landing}». Landings: ${landings().join(', ')}`)
}

const axisVersion = () => {
  const match = readFileSync(join(PLUGIN, 'eo-landing-dock.php'), 'utf8').match(/define\( 'EOLD_AXIS', '([0-9.]+)' \)/)

  return match ? match[1] : fail('EOLD_AXIS not found in the plugin.')
}

const vendor = (file: string) => readFileSync(join(PLUGIN, 'assets/vendor/axis/landing-dock', axisVersion(), file), 'utf8')

const fetchLive = (path: string) =>
  execFileSync('curl', ['-sL', '-A', 'Mozilla/5.0 (landing-dock CLI)', `${SITE}${path}${path.includes('?') ? '&' : '?'}eold=${Date.now()}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

const attributes = (tag: string) => Object.fromEntries([...tag.matchAll(/([a-z-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]))

/** The config to store: the manifest's, with the surface key of the landing's own CTA read from the live page. */
function resolveConfig(m: Json): Json {
  if (m.pending) fail(`«${m.landing}» is pending: ${m.pending}`)
  const config = JSON.parse(JSON.stringify(m.config))

  if (config.scheduler?.source === 'cta') {
    // Never the dock's own launcher: it holds the key stored by the last `on`, which may be stale after a rotation.
    const html = fetchLive(m.path).replace(/<div class="eo-landing-dock-scheduler"[\s\S]*?<\/div>/g, '')
    const tags = [...html.matchAll(/<greenhouse-cta\b[^>]*>/g)].map(t => attributes(t[0]))
    const live = tags.find(a => a.cta === config.scheduler.cta && a.surface === config.scheduler.surface && a['embed-key'])

    if (!live) fail(`The live page has no <greenhouse-cta> «${config.scheduler.cta}» on surface ${config.scheduler.surface} outside the dock to take the key from. If the landing's only launcher was its old dock (HubSpot), run \`off\`, then \`on\` again (with the dock off, the old dock's launcher is back in the HTML).`)
    config.scheduler.key = live['embed-key']
  }

  return config
}

/** The plugin's own validator and renderer (byte-identical to AXIS), run with the local PHP. */
function renderLocally(config: Json): string {
  const file = join(DIR, 'render-input.json')

  write(file, config)

  const php = `define('ABSPATH', 1); $d = '${PLUGIN}/'; require $d.'includes/class-eold-validator.php'; require $d.'includes/class-eold-render.php'; require $d.'includes/class-eold-config.php';
    $v = new EOLD_Validator(file_get_contents($d.'assets/vendor/axis/landing-dock/${axisVersion()}/landing-dock.v1.schema.json'));
    $c = json_decode(file_get_contents('${file}')); $i = EOLD_Config::issues($c, $v);
    if ($i) { fwrite(STDERR, json_encode($i, JSON_UNESCAPED_UNICODE)); exit(2); } echo EOLD_Render::html($c->document, $v);`

  try {
    return execFileSync('php', ['-r', php], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (error: any) {
    return fail(`Invalid config: ${error.stderr || error.message}`)
  }
}

// ── Remote: WP-CLI over SSH through the repo wrapper; data travels as --input-file, never as arguments ──

function remote(input: Json, extra: string[] = []): string {
  const inputFile = join(DIR, 'remote-input.json')

  write(inputFile, input)

  const out = execFileSync('pnpm', ['-s', 'public-website:wpcli', '--', '--eval-file', 'scripts/public-website/landing-dock/remote.php', '--input-file', inputFile, ...extra.flatMap(f => ['--input-file', f])], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  const match = out.match(/---EOLD-BEGIN---\n([\s\S]*?)---EOLD-END---/)

  return match ? match[1].trim() : fail(`Unexpected remote output:\n${out}`)
}

/** What the served HTML says: how many shared docks and whether the legacy dock is there. */
function inspect(m: Json) {
  const html = fetchLive(m.path)
  const docks = (html.match(/data-axis-landing-dock="v1"/g) || []).length
  const legacy = (m.config.legacy || []).some((l: Json) => new RegExp(`<${l.tag}\\b[^>]*\\s${l.attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[\\s>/=])`, 'i').test(html))
  const location = /cta-location="landing_dock"/.test(html)

  return { docks, legacy, location }
}

function latestSnapshot(landing: string) {
  const dir = join(DIR, 'snapshots')

  if (!existsSync(dir)) return undefined
  const files = readdirSync(dir).filter(f => f.startsWith(`${landing}-`)).map(f => join(dir, f)).sort()

  return files.length ? files[files.length - 1] : undefined
}

async function preview(names: string[]) {
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch({ channel: 'chrome' })
  const css = vendor('landing-dock.css')
  const js = vendor('landing-dock.js')
  const out = join(DIR, 'preview', new Date().toISOString().replace(/[:.]/g, '-'))
  const report: Json[] = []

  for (const landing of names) {
    const m = manifest(landing)
    const config = JSON.parse(JSON.stringify(m.config))

    // The preview never needs the key: the scheduler intent is logged, not opened.
    if (config.scheduler?.source === 'cta') config.scheduler.key = 'preview_only_key_000000'
    const dock = renderLocally(config)

    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const mobile = width < 769
      const page = await browser.newPage({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 })

      await page.goto(`${SITE}${m.path}`, { waitUntil: 'networkidle' }).catch(() => undefined)
      // A fresh browser gets the cookie banner; the preview declines it (the most private choice) to see the page.
      const banner = flagSet('with-cookies') ? false : await page.locator('#hs-eu-decline-button').click({ timeout: 4000 }).then(() => true, () => false)

      const setup = await page.evaluate(({ dock, css, legacy, start, end }) => {
        // Same removal as the plugin, on the live DOM.
        let removed = 0

        for (const l of legacy) document.querySelectorAll(`${l.tag}[${l.attr}]`).forEach(el => { el.remove(); removed++ })
        const style = document.createElement('style')

        style.textContent = css
        document.head.append(style)
        document.body.insertAdjacentHTML('beforeend', dock)

        return { removed, start: !!document.querySelector(start || '[data-landing-dock-start]'), end: end ? document.querySelectorAll(end).length : 0 }
      }, { dock, css, legacy: config.legacy || [], start: config.start, end: config.end })

      await page.addScriptTag({ type: 'module', content: `${js}\nenhanceLandingDock(document, ${JSON.stringify({ start: config.start, end: config.end, stop: config.stop, avoid: AVOID })})\ndocument.addEventListener('axis-landing-dock:cta', e => { e.preventDefault(); window.__dockIntent = e.detail.location })` })
      await page.waitForTimeout(400)
      const states: Json[] = []
      const total = await page.evaluate(() => document.documentElement.scrollHeight)

      for (const ratio of [0, 0.35, 0.6]) {
        await page.evaluate(y => window.scrollTo(0, y), Math.round(total * ratio))
        await page.waitForTimeout(900)

        const state = await page.evaluate(() => {
          const d = document.querySelector<HTMLElement>('[data-axis-landing-dock]')!
          const r = d.getBoundingClientRect()

          return { state: d.dataset.state, tone: d.dataset.tone, display: getComputedStyle(d).display, height: Math.round(r.height), bottom: Math.round(innerHeight - r.bottom), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }
        })

        states.push({ at: ratio, ...state })
        if (ratio > 0) await page.screenshot({ path: join(out, `${landing}-${width}-${Math.round(ratio * 100)}.png`) })
      }

      report.push({ landing, width, cookieBannerDeclined: banner, ...setup, states })
      await page.close()
    }
  }

  await browser.close()
  write(join(out, 'report.json'), report)
  console.log(JSON.stringify(report, null, 2))
  ok(`Preview frames and report in ${out}`)
}

async function main() {
  const [command, landing, ...rest] = process.argv.slice(2).filter(a => a !== '--')
  const confirm = rest.includes('--confirm') || process.argv.includes('--confirm')

  switch (command) {
    case 'status':
      console.log(remote({ command: 'list' }))
      break
    case 'preview':
      await preview(landing === 'all' || !landing ? landings() : [landing])
      break

    case 'snapshot': {
      const m = manifest(landing)
      const raw = remote({ command: 'snapshot', page: m.page })
      const file = join(DIR, 'snapshots', `${landing}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)

      write(file, raw + '\n')
      ok(`Snapshot of ${m.path} (page ${m.page}) in ${file}`)
      break
    }

    case 'purge':
      console.log(remote({ command: 'purge' }))
      break

    case 'verify': {
      const m = manifest(landing)

      console.log(JSON.stringify({ landing, path: m.path, ...inspect(m) }))
      break
    }

    case 'on': {
      if (!confirm) fail('`on` writes production: pass --confirm once the operator gave the go.')
      const m = manifest(landing)
      const snapshot = latestSnapshot(landing)

      if (!snapshot || Date.now() - statSync(snapshot).mtimeMs > SNAPSHOT_MAX_AGE_MS) fail(`Take a snapshot first: pnpm public-website:landing-dock snapshot ${landing}`)
      const config = resolveConfig(m)

      renderLocally(config)
      const file = join(DIR, `config-${landing}.json`)

      write(file, config)
      console.log(remote({ command: 'set', page: m.page }, [file]))
      writeFileSync(file, '{}\n') // the key never stays on disk
      const live = inspect(m)

      console.log(JSON.stringify({ landing, ...live }))
      if (live.docks !== 1 || live.legacy) fail('The served HTML is not one shared dock without the legacy one: check the cache, or run `off`.')
      if (config.scheduler && !live.location) fail('The dock is on but its scheduler launcher is missing (menu scheduler option or CTA).')
      ok(`Dock on for ${m.path}; legacy dock removed from the HTML.`)
      break
    }

    case 'off': {
      if (!confirm) fail('`off` writes production: pass --confirm once the operator gave the go.')
      const m = manifest(landing)

      console.log(remote({ command: 'unset', page: m.page }))
      const live = inspect(m)

      console.log(JSON.stringify({ landing, ...live }))
      if (live.docks !== 0 || !live.legacy) fail('The served HTML still has the shared dock or lacks the legacy one: check the cache.')
      ok(`Dock off for ${m.path}; its own dock is back.`)
      break
    }

    default:
      console.log('Usage: pnpm public-website:landing-dock <status | preview <landing|all> | snapshot <landing> | on|off <landing> --confirm | verify <landing> | purge>')
      console.log(`Landings: ${existsSync(MANIFESTS) ? landings().join(', ') : '(runtime repo not found)'}`)
  }
}

main().catch(error => fail(error?.message || String(error)))
