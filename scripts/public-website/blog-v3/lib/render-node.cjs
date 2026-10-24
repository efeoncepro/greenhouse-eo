/**
 * TASK-2051 — Renders a .dc.html artboard in Node with the production template runtime (dc-runtime.js), its own
 * logic class and frozen time, so the canvas reference and the bound template can be compared deterministically.
 */
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const { parseDcFile } = require('./dc-template.cjs')

const RUNTIME_DIR = process.env.BLOG_RUNTIME_DIR || path.resolve(__dirname, '../../../../../efeonce-public-site-runtime')
const DC_RUNTIME = path.join(RUNTIME_DIR, 'wp-content/plugins/eo-elementor-widgets/assets/js/blog-v3/dc-runtime.js')
// Frozen clock for references: 24 oct 2026 12:00 UTC.
const FROZEN_NOW = Date.UTC(2026, 9, 24, 12, 0, 0)

function loadRuntime() {
  delete require.cache[require.resolve(DC_RUNTIME)]

  return require(DC_RUNTIME)
}

function loadComponent(logicSource, runtime) {
  const RealDate = Date

  class FrozenDate extends RealDate {
    constructor(...a) {
      super(...(a.length ? a : [FROZEN_NOW]))
    }

    static now() {
      return FROZEN_NOW
    }
  }

  const ctx = vm.createContext({ DCLogic: runtime.DCLogic, Date: FrozenDate, Math, String, Number, Object, Array, JSON, setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {} })

  vm.runInContext(logicSource + '\n;this.__C = Component;', ctx)

  return ctx.__C
}

function renderBoard(file, props) {
  const parsed = parseDcFile(fs.readFileSync(file, 'utf8'))
  const runtime = loadRuntime()
  const Component = loadComponent(parsed.logic, runtime)

  return { ...parsed, html: runtime.renderToString(Component, parsed.ast, props || {}) }
}

module.exports = { renderBoard, loadRuntime, loadComponent, FROZEN_NOW, RUNTIME_DIR }
