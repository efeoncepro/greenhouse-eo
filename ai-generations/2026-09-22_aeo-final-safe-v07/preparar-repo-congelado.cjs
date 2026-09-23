// Arma un repo congelado para recomponer.cjs: copia cada archivo de dependencias.json en la versión exacta que fija su
// sha256 (del repo si coincide; si no, la busca en la historia de git) y enlaza node_modules y package.json del repo.
// Existe porque el repo avanzó (axis-advertising.mjs cambió el 2026-09-22 17:20, commit 8dcc449b3) y recomponer.cjs se
// niega, con razón, a recomponer contra otra versión. Los paquetes de node_modules NO quedan congelados: la prueba de que
// la reproducción es fiel es que las piezas que no cambian salgan idénticas byte a byte (ver REPRODUCCION-VERIFICADA.json).
// Uso: node preparar-repo-congelado.cjs --out <directorio nuevo> [--repo <repo>]
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process')
const args = process.argv.slice(2), arg = n => args[args.indexOf(n) + 1]
if (!args.includes('--out')) throw Error('Uso: node preparar-repo-congelado.cjs --out <directorio nuevo> [--repo <repo>]')
const repo = path.resolve(args.includes('--repo') ? arg('--repo') : '/Users/jreye/Documents/greenhouse-eo'), out = path.resolve(arg('--out'))
if (fs.existsSync(out)) throw Error('La salida ya existe; usa una nueva.')
const sha = b => crypto.createHash('sha256').update(b).digest('hex')
const deps = JSON.parse(fs.readFileSync(path.join(__dirname, 'dependencias.json'), 'utf8'))
const archivos = []
for (const f of deps) {
  const actual = path.join(repo, f.path)
  let buf = fs.existsSync(actual) ? fs.readFileSync(actual) : null, origen = 'repo'
  if (!buf || sha(buf) !== f.sha256) {
    buf = null
    const commits = cp.execFileSync('git', ['-C', repo, 'log', '--format=%H', '--', f.path], { encoding: 'utf8' }).split('\n').filter(Boolean)
    for (const c of commits) {
      let b
      try { b = cp.execFileSync('git', ['-C', repo, 'show', `${c}:${f.path}`], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }) } catch { continue }
      if (sha(b) === f.sha256) { buf = b; origen = c.slice(0, 9); break }
    }
    if (!buf) throw Error('Ninguna versión en la historia de git tiene el sha256 fijado: ' + f.path)
  }
  archivos.push({ f, buf, origen })
}
for (const { f, buf, origen } of archivos) {
  const dst = path.join(out, f.path)
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.writeFileSync(dst, buf)
  console.log((origen === 'repo' ? 'igual al repo   ' : 'de ' + origen + '    ') + f.path)
}
fs.mkdirSync(path.join(out, 'ai-generations'), { recursive: true })
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(out, 'node_modules'))
fs.symlinkSync(path.join(repo, 'package.json'), path.join(out, 'package.json'))
console.log(`Repo congelado en ${out}. Siguiente: node recomponer.cjs --out <directorio nuevo> --repo ${out}`)
