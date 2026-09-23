#!/usr/bin/env bash
# Genera las tomas de motion de CMP001-02..07 con h3max-r2v (receta del piloto 01).
#
#   ./generar.sh                         -> SIMULACIÓN: imprime comandos y costo estimado. No gasta.
#   ./generar.sh 02-9x16 05-9x16          -> simula sólo esas tomas (formato <pieza>-<ratio>)
#   CONFIRMAR_GASTO=1 ./generar.sh 02-9x16 -> ejecuta de verdad (tope --max-usd por toma)
#
# Orden recomendado (ver LEEME.md §4): primero los 9:16 (master nativo) de las mascotas; 05/06 (Nexa)
# después de la sonda; 3:4 y 1:1 SÓLO de las piezas cuyo 9:16 quedó aprobado por el operador.
# Idempotente: si out/<toma>.mp4 existe, no se vuelve a pagar.
set -euo pipefail
cd "$(dirname "$0")"
REPO=/Users/jreye/Documents/greenhouse-eo
RATE_USD_S=0.08        # H3 Max 1080P, guía de modelos §3 [oficial, "50% off": promo o lista sin dato]
DUR=15
MAX_USD=${MAX_USD:-1.5}
ACCOUNT=${FAL_ACCOUNT:-FAL_API_KEY_B}
mkdir -p out logs

sel=("$@")
takes=$(python3 - "${sel[@]+"${sel[@]}"}" <<'EOF'
import json, sys
t = json.load(open('tomas.json'))
want = set(sys.argv[1:])
for x in t:
    key = f"{x['piece']}-{x['ratio']}"
    if want and key not in want:
        continue
    if x['lint'] != 'ok':
        sys.exit(f"lint pendiente en {x['take']}: {x['lint']}")
    print('\t'.join([x['take'], x['aspect'], x['prompt'], *x['images']]))
EOF
)

total=0; n=0
while IFS=$'\t' read -r take aspect prompt imgs; do
  [ -z "$take" ] && continue
  read -r -a images <<<"$(printf '%s' "$imgs" | tr '\t' ' ')"
  out="out/${take}.mp4"
  if [ -f "$out" ]; then echo "= $take ya existe, se omite"; continue; fi
  args=(--capability h3max-r2v)
  for i in "${images[@]}"; do args+=(--image "$PWD/$i"); done
  args+=(--prompt-file "$PWD/$prompt" --duration "$DUR" --resolution 1080P --aspect "$aspect"
         --prompt-expansion disabled --fal-account "$ACCOUNT" --max-usd "$MAX_USD" --yes --out "$PWD/$out")
  cost=$(python3 -c "print(f'{$RATE_USD_S*$DUR:.2f}')")
  total=$(python3 -c "print(f'{$total+$cost:.2f}')"); n=$((n+1))
  if [ "${CONFIRMAR_GASTO:-0}" = "1" ]; then
    echo "▶ $take  (~USD $cost)"
    (cd "$REPO" && pnpm -s ai:fal "${args[@]}") 2>&1 | tee "logs/${take}.log"
  else
    printf '· %-18s ~USD %s\n  pnpm ai:fal %s\n' "$take" "$cost" "${args[*]}"
  fi
done <<<"$takes"

echo "---"
echo "$n tomas · costo estimado USD $total (tarifa ${RATE_USD_S}/s × ${DUR}s; sin reintentos)"
[ "${CONFIRMAR_GASTO:-0}" = "1" ] || echo "SIMULACIÓN: nada se encoló. Para ejecutar: CONFIRMAR_GASTO=1 $0 <tomas>"
