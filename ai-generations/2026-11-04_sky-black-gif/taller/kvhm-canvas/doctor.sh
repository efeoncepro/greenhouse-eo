#!/bin/bash
# Chequeo de arranque del taller SKY BLACK 2026. Correr ANTES de componer desde una sesión nueva.
# Solo lee: no escribe nada, no toca OneDrive más allá de listar la carpeta del kit (nunca el destino).
# Uso: bash doctor.sh   → exit 0 si todo está listo; exit 1 y la lista de faltantes si no.
cd "$(dirname "$0")"; K="$(pwd)"
GH=/Users/jreye/Documents/greenhouse-eo
SRC="$HOME/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Sky - Efeonce - General/SKY Campañas/2026/10_Noviembre/Despliegue Base"
fail=0
ok()  { printf '  ✓ %s\n' "$1"; }
bad() { printf '  ✗ %s\n' "$1"; fail=1; }

echo "Taller: $K"
echo "Herramientas"
command -v node >/dev/null && ok "node $(node -v)" || bad "node no está en el PATH"
for m in playwright sharp; do
  node -e "require('$GH/node_modules/$m')" 2>/dev/null && ok "$m (node_modules de greenhouse-eo)" || bad "$m no carga: corre pnpm install en $GH"
done
node -e "require('$GH/node_modules/playwright').chromium.executablePath()" >/dev/null 2>&1 \
  && [ -x "$(node -e "console.log(require('$GH/node_modules/playwright').chromium.executablePath())")" ] \
  && ok "Chromium de Playwright" || bad "Chromium de Playwright no está: pnpm exec playwright install chromium"
if command -v ffmpeg >/dev/null; then
  F=$(ffmpeg -hide_banner -filters 2>/dev/null; ffmpeg -hide_banner -encoders 2>/dev/null)
  miss=""; for x in libx264 aac palettegen paletteuse xfade amix alimiter; do echo "$F" | grep -qw "$x" || miss="$miss $x"; done
  [ -z "$miss" ] && ok "ffmpeg con libx264, aac, palettegen, xfade, amix, alimiter" || bad "a ffmpeg le falta:$miss"
else bad "ffmpeg no está (brew install ffmpeg)"; fi
command -v python3 >/dev/null && ok "python3" || bad "python3 no está (lo usa split.py)"

echo "Insumos del taller"
for w in Regular Medium Semibold Bold Black; do [ -s "Metric-$w.otf" ] || bad "falta Metric-$w.otf"; done; [ $fail = 0 ] && ok "fuentes Metric (5 pesos)"
[ -s hph/SourceSans3-Regular.otf ] && ok "SourceSans3 (HPH)" || bad "falta hph/SourceSans3-Regular.otf"
n=$(ls src2/"KV X HM"/*.svg 2>/dev/null | wc -l | tr -d ' ')
[ "$n" -gt 0 ] && ok "kit corregido src2/ ($n SVG en KV X HM)" || bad "src2/KV X HM vacío: el kit corregido no está"
miss=$(node -e "
const fs=require('fs'),d=require('./fotos-destino.json'),m=new Set();
for(const [k,v] of Object.entries(d)){ if(k.startsWith('_'))continue; const s=[v.src,...Object.values(v.f||{}).map(o=>o&&o.src)].filter(Boolean);
  for(const f of s) if(!fs.existsSync('fotos-destino/'+f)) m.add(f); }
console.log([...m].join(', '))")
[ -z "$miss" ] && ok "fotos de destino ($(ls fotos-destino | wc -l | tr -d ' ') archivos, todas las de fotos-destino.json)" || bad "faltan fotos de destino: $miss"
[ -s foto-fuente.png ] && ok "foto-fuente.png" || bad "falta foto-fuente.png"
[ -d ../canvas/project ] && ok "proyecto del canvas (../canvas/project, $(ls ../canvas/project | wc -l | tr -d ' ') entradas)" || bad "falta ../canvas/project"
[ -s vid-blobs.json ] && ok "vid-blobs.json" || bad "falta vid-blobs.json"
VIEJO="556be""26d"  # id de la sesión original, partido para no encontrarse a sí mismo
left=$(grep -rl "$VIEJO" --include='*.cjs' --include='*.sh' --include='*.py' . 2>/dev/null)
[ -z "$left" ] && ok "sin rutas al scratchpad viejo" || bad "rutas al scratchpad viejo en: $left"

echo "Kit en OneDrive (solo lectura)"
if [ -d "$SRC" ] && gtimeout 20s ls "$SRC" >/dev/null 2>&1; then ok "Despliegue Base accesible"; else bad "no se puede listar Despliegue Base (¿OneDrive sincronizado?)"; fi

echo
if [ $fail = 0 ]; then echo "LISTO: se puede componer (./rehacer-destinos.sh)."; else
  echo "NO LISTO. Si faltan imágenes del taller, quizás se archivaron: pnpm ai-gen:where ai-generations/2026-11-04_sky-black-gif/taller y pnpm ai-gen:pull."; fi
exit $fail
