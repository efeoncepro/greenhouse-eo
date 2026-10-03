#!/bin/zsh
# Genera un plate por ficha (variante a), 6 en paralelo. Uso: generar.sh <patrón-de-ficha>...
cd /Users/jreye/Documents/greenhouse-eo
D=ai-generations/2026-10-02_cmp004-cine-nativo/formatos
V=${V:-a}
L=()
for p in "$@"; do for f in $D/fichas/$~p; do L+=("$f"); done; done
gen() { f=$1; id=${f:t:r}; if [[ -f $D/plates/$id-$V/$id.png ]]; then echo "$id skip"; return; fi; pnpm -s foto:generar $f --quality high --out $D/plates/$id-$V > $D/logs/$id-$V.log 2>&1; echo "$id-$V exit=$?"; }
i=0
for f in $L; do gen $f & ((i++)); if (( i % 6 == 0 )); then wait; fi; done; wait
