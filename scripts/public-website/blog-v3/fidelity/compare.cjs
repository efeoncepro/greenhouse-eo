/**
 * TASK-2051 — Pixel fidelity gate: compares each section PNG of <candidateDir> against the approved reference in
 * <referenceDir>. A section passes when the share of differing pixels is ≤ the budget (default 1 %) and its size
 * matches. Writes a diff PNG per section next to the candidate and exits 1 on any failure.
 *
 *   node fidelity/compare.cjs <referenceDir> <candidateDir> [--budget 0.01]
 */
const fs = require('node:fs')
const path = require('node:path')

const pixelmatch = require('pixelmatch')
const { PNG } = require('pngjs')

const [refDir, candDir, ...rest] = process.argv.slice(2)
const budgetArg = rest.indexOf('--budget')
const BUDGET = budgetArg >= 0 ? Number(rest[budgetArg + 1]) : 0.01

if (!refDir || !candDir) {
  console.error('Usage: compare.cjs <referenceDir> <candidateDir> [--budget 0.01]')
  process.exit(2)
}

const match = typeof pixelmatch === 'function' ? pixelmatch : pixelmatch.default
const refs = fs.readdirSync(refDir).filter(f => f.endsWith('.png') && !f.endsWith('.diff.png')).sort()
const rows = []
let failed = 0

for (const f of refs) {
  const candFile = path.join(candDir, f)

  if (!fs.existsSync(candFile)) {
    rows.push({ section: f, verdict: 'MISSING' })
    failed++
    continue
  }

  const a = PNG.sync.read(fs.readFileSync(path.join(refDir, f)))
  const b = PNG.sync.read(fs.readFileSync(candFile))

  if (a.width !== b.width || a.height !== b.height) {
    rows.push({ section: f, verdict: 'SIZE', reference: `${a.width}×${a.height}`, candidate: `${b.width}×${b.height}` })
    failed++
    continue
  }

  const diff = new PNG({ width: a.width, height: a.height })
  const n = match(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 })
  const share = n / (a.width * a.height)
  const ok = share <= BUDGET

  if (!ok) failed++
  if (n) fs.writeFileSync(path.join(candDir, f.replace(/\.png$/, '.diff.png')), PNG.sync.write(diff))
  rows.push({ section: f, verdict: ok ? 'PASS' : 'FAIL', diff: (share * 100).toFixed(3) + ' %', size: `${a.width}×${a.height}` })
}

console.table(rows)
console.log(`${refs.length - failed}/${refs.length} sections within ${(BUDGET * 100).toFixed(1)} %`)
process.exit(failed ? 1 : 0)
