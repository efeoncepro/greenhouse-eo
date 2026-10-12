#!/usr/bin/env bash
# Depuración de HubSpot (portal 48713323), preparada el 2026-10-12.
# Aplica UN lote: primero un registro piloto, lo relee, pregunta, y recién entonces el resto.
# Uso: bash aplicar-lote.sh leads | empresas | contactos | revertir-leads | revertir-empresas | revertir-contactos
set -euo pipefail
export PATH="$HOME/.hubspot/bin:$PATH"
DIR="$(cd "$(dirname "$0")" && pwd)"
LOTE="${1:-}"

campo() { python3 -I -c 'import json,sys,re
d=json.loads(sys.stdin.read().splitlines()[0])
k=sys.argv[1]
if k=="confirm": print(re.search(r"--confirm \x27([^\x27]*)\x27", d["apply_command_hint"]).group(1))
elif k=="afectados": print(d["impact"]["records_affected"])
else: print(d[k])' "$1"; }

# aplicar <tipo> <archivo.jsonl> <resultado.jsonl>
aplicar() {
  local tipo="$1" archivo="$2" salida="$3" seco digest confirma afectados
  seco="$(hubspot objects update --type "$tipo" --dry-run --format json < "$archivo")"
  digest="$(printf '%s' "$seco" | campo digest)"
  confirma="$(printf '%s' "$seco" | campo confirm)"
  afectados="$(printf '%s' "$seco" | campo afectados)"
  echo "  $(basename "$archivo"): $afectados registro(s)"
  hubspot objects update --type "$tipo" --digest "$digest" --confirm "$confirma" --format jsonl < "$archivo" > "$salida"
  local malos; malos="$(grep -c '"ok":false' "$salida" || true)"
  echo "  resultado: $(grep -c '"ok":true' "$salida" || true) bien, $malos con error -> $(basename "$salida")"
  if [ "$malos" != "0" ]; then echo "  Hay errores: revisa $salida antes de seguir."; exit 1; fi
}

releer() { # tipo id propiedades
  hubspot objects get --type "$1" "$2" --properties "$3" --format json < /dev/null \
    | python3 -I -c 'import json,sys
d=json.load(sys.stdin); x=d.get("data",d); x=x[0] if isinstance(x,list) else x
print("  relectura:", {k:v for k,v in x["properties"].items() if k in sys.argv[1].split(",")})' "$3"
}

preguntar() { read -r -p "  ¿Aplico el resto del lote? (s/n) " r; [ "$r" = "s" ] || { echo "  Detenido. Sólo se cambió el piloto."; exit 0; }; }

partir() { head -n 1 "$1" > "$DIR/.piloto.jsonl"; tail -n +2 "$1" > "$DIR/.resto.jsonl"; }
id_piloto() { python3 -I -c 'import json,sys; print(json.loads(open(sys.argv[1]).readline())["id"])' "$1"; }

# Un solo paso: leads (y las tres reversiones)
un_paso() { # tipo archivo propiedades etiqueta
  local tipo="$1" archivo="$2" props="$3" etq="$4"
  partir "$archivo"; local pid; pid="$(id_piloto "$archivo")"
  echo "Piloto $pid"; aplicar "$tipo" "$DIR/.piloto.jsonl" "$DIR/resultado-$etq-piloto.jsonl"; releer "$tipo" "$pid" "$props"
  preguntar
  echo "Resto"; aplicar "$tipo" "$DIR/.resto.jsonl" "$DIR/resultado-$etq.jsonl"
}

# Dos pasos: la etapa del ciclo de vida no retrocede sin vaciarla antes
dos_pasos() { # tipo prefijo etiqueta
  local tipo="$1" a="$DIR/$2-a-vaciar-etapa.jsonl" b="$DIR/$2-b-poner-lead.jsonl" etq="$3"
  local pid; pid="$(id_piloto "$a")"
  echo "Piloto $pid"
  partir "$a"; aplicar "$tipo" "$DIR/.piloto.jsonl" "$DIR/resultado-$etq-a-piloto.jsonl"; cp "$DIR/.resto.jsonl" "$DIR/.resto-a.jsonl"
  partir "$b"; aplicar "$tipo" "$DIR/.piloto.jsonl" "$DIR/resultado-$etq-b-piloto.jsonl"; cp "$DIR/.resto.jsonl" "$DIR/.resto-b.jsonl"
  releer "$tipo" "$pid" "lifecyclestage"
  preguntar
  echo "Resto: vaciar etapa"; aplicar "$tipo" "$DIR/.resto-a.jsonl" "$DIR/resultado-$etq-a.jsonl"
  echo "Resto: poner Lead";   aplicar "$tipo" "$DIR/.resto-b.jsonl" "$DIR/resultado-$etq-b.jsonl"
}

case "$LOTE" in
  leads)              un_paso leads "$DIR/1-leads-descalificar.jsonl" "hs_pipeline_stage,hs_lead_disqualification_note" leads ;;
  empresas)           dos_pasos companies 2-empresas empresas ;;
  contactos)          dos_pasos contacts 3-contactos contactos ;;
  revertir-leads)     un_paso leads "$DIR/1-leads-revertir.jsonl" "hs_pipeline_stage,hs_lead_disqualification_note" revertir-leads ;;
  revertir-empresas)  un_paso companies "$DIR/2-empresas-revertir.jsonl" "lifecyclestage" revertir-empresas ;;
  revertir-contactos) un_paso contacts "$DIR/3-contactos-revertir.jsonl" "lifecyclestage" revertir-contactos ;;
  *) echo "Uso: bash aplicar-lote.sh leads | empresas | contactos | revertir-leads | revertir-empresas | revertir-contactos"; exit 2 ;;
esac
rm -f "$DIR"/.piloto.jsonl "$DIR"/.resto.jsonl "$DIR"/.resto-a.jsonl "$DIR"/.resto-b.jsonl
echo "Listo: $LOTE"
