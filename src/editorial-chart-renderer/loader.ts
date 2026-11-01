/**
 * Loader of the blog chart renderer (`efeoncepro/chart`): the only script the page loads up front (< 1 KB).
 *
 * The chart engine (ECharts, ~180 KB gzip) is downloaded once, only when a chart figure comes within 300 px of the
 * viewport, so a post with a chart below the fold keeps its LCP and main thread untouched. The engine sits next to this
 * file as `engine.js` and mounts every figure on load (index.ts).
 */

// Digest of engine.js, injected at build time: a new engine gets a new URL, so no cache keeps serving the old one.
declare const __ENGINE_VERSION__: string

const SELECTOR = 'figure.eo-chart[data-eo-chart]'
const ENGINE_URL = new URL(`engine.js?v=${__ENGINE_VERSION__}`, (document.currentScript as HTMLScriptElement | null)?.src ?? location.href).href

let requested = false

const loadEngine = () => {
  if (requested) return

  requested = true

  const script = document.createElement('script')

  script.src = ENGINE_URL
  script.async = true
  document.head.append(script)
}

const watch = () => {
  // The block editor also injects this script into its canvas iframe, where it can run before <body> exists; the
  // engine loaded by the editor page watches that canvas itself, so there is nothing to do here.
  if (!document.body) return

  // Block editor: the figures live in the canvas iframe, which the engine watches itself. Load it right away.
  if (document.body.classList.contains('block-editor-page')) return loadEngine()

  const figures = document.querySelectorAll(SELECTOR)

  if (!figures.length) {
    // The block editor inserts the server render later; load as soon as a figure appears.
    const mo = new MutationObserver(() => {
      if (document.querySelector(SELECTOR)) {
        mo.disconnect()
        loadEngine()
      }
    })

    mo.observe(document.body, { childList: true, subtree: true })

    return
  }

  if (!('IntersectionObserver' in window)) return loadEngine()

  const io = new IntersectionObserver(
    entries => {
      if (entries.some(e => e.isIntersecting)) {
        io.disconnect()
        loadEngine()
      }
    },
    { rootMargin: '300px 0px' }
  )

  figures.forEach(f => io.observe(f))
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch, { once: true })
else watch()
