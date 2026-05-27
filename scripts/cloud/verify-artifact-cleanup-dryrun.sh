#!/usr/bin/env bash
#
# verify-artifact-cleanup-dryrun.sh
# ---------------------------------------------------------------------------
# Verificación READ-ONLY del cleanup policy de Artifact Registry (repo gcr.io)
# ANTES de pasarlo a enforced (--no-dry-run). NUNCA borra nada.
#
# Qué hace:
#   1. Confirma que la policy existe y su estado dry-run en el repo gcr.io.
#   2. (Opcional) Busca logs de evaluación dry-run en Cloud Logging.
#   3. Reproduce localmente la decisión de la policy (keep N recientes por
#      imagen + conservar todo lo < KEEP_DAYS; borrar el resto) enumerando
#      las versiones reales de cada imagen via JSON (digest COMPLETO).
#   4. Recoge el digest que cada servicio Cloud Run SIRVE ahora (traffic vivo).
#   5. HARD GATE: {a-borrar} ∩ {sirviendo-ahora}. Si != vacío => UNSAFE.
#      Además reporta, informativo, cuántas revisiones históricas perderían
#      su imagen (ventana de rollback que se acorta — esperado).
#   6. Imprime (sin ejecutar) el comando para pasar a enforced.
#
# Modelo de seguridad:
#   - HARD: la imagen sirviendo en producción nunca cae en el borrado.
#     (keep-N la preserva siempre: la sirviendo es la más nueva.)
#   - Rollback: keep-N + <KEEP_DAYS preserva los últimos N deploys / KEEP_DAYS.
#     Revisiones más viejas pierden su imagen (no se puede --to-revisions a
#     ellas). Es el objetivo del cleanup; se reporta para transparencia.
#
# Contexto: TASK-931. Policy keep-15 + >14d seteada en dry-run 2026-05-24.
# gcr.io contiene SOLO imágenes de los 4 workers.
#
# Requisitos: gcloud autenticado contra efeonce-group (ADC local). El sandbox
# remoto de Claude /schedule NO sirve: no tiene credenciales GCP.
#
# Uso:
#   bash scripts/cloud/verify-artifact-cleanup-dryrun.sh
#   KEEP_RECENT=15 KEEP_DAYS=14 bash scripts/cloud/verify-artifact-cleanup-dryrun.sh
# ---------------------------------------------------------------------------
set -euo pipefail

PROJECT="${GCP_PROJECT:-efeonce-group}"
REPO_LOCATION="${REPO_LOCATION:-us}"
KEEP_RECENT="${KEEP_RECENT:-15}"
KEEP_DAYS="${KEEP_DAYS:-14}"
TOTAL_REPO_GB="${TOTAL_REPO_GB:-185}"   # tamaño aprox actual de gcr.io para estimar ahorro

# Imágenes en gcr.io (worker images). ci-fix es huérfano (sin servicio activo).
IMAGES=(ops-worker commercial-cost-worker ico-batch-worker hubspot-greenhouse-integration commercial-cost-worker-ci-fix)

# Mapeo imagen -> "servicio:region" (bash 3.2-compatible, sin arrays asociativos).
service_region_for() {
  case "$1" in
    ops-worker)                     echo "ops-worker:us-east4" ;;
    commercial-cost-worker)         echo "commercial-cost-worker:us-east4" ;;
    ico-batch-worker)               echo "ico-batch-worker:us-east4" ;;
    hubspot-greenhouse-integration) echo "hubspot-greenhouse-integration:us-central1" ;;
    *)                              echo "" ;;
  esac
}

# digests normalizados a hex puro (sin prefijo sha256:) para comparar.
SERVING_FILE="$(mktemp /tmp/serving-digests.XXXXXX.txt)"   # sirviendo ahora (hard gate)
DELETE_FILE="$(mktemp /tmp/delete-digests.XXXXXX.txt)"     # a borrar
HISTREV_FILE="$(mktemp /tmp/histrev-digests.XXXXXX.txt)"   # digests de revisiones históricas
POLICY_FILE="$(mktemp /tmp/cleanup-policy.XXXXXX.json)"
trap 'rm -f "$SERVING_FILE" "$DELETE_FILE" "$HISTREV_FILE" "$POLICY_FILE"' EXIT

norm() { sed 's/^sha256://' ; }   # normaliza digest a hex puro

echo "═══════════════════════════════════════════════════════════════════"
echo " Artifact Registry cleanup dry-run verification (READ-ONLY)"
echo " repo: gcr.io  ·  location: ${REPO_LOCATION}  ·  project: ${PROJECT}"
echo " policy mirror: keep ${KEEP_RECENT} recientes/imagen + conservar < ${KEEP_DAYS}d"
echo "═══════════════════════════════════════════════════════════════════"

# ── 1) Estado de la policy ─────────────────────────────────────────────────
echo ""
echo "── 1) Estado de la cleanup policy en gcr.io ──"
DRYRUN_STATE="$(gcloud artifacts repositories describe gcr.io \
  --location="${REPO_LOCATION}" --project="${PROJECT}" \
  --format='value(cleanupPolicyDryRun)' 2>/dev/null || echo 'ERROR')"
echo "   cleanupPolicyDryRun = ${DRYRUN_STATE}"
case "${DRYRUN_STATE}" in
  True|true)   echo "   ✅ Policy en DRY-RUN (no borra nada)." ;;
  False|false) echo "   ⚠️  Policy ya ENFORCED (borra). Este script solo verifica." ;;
  *)           echo "   ⚠️  No se pudo leer el estado (¿gcloud sin auth / repo distinto?)." ;;
esac

# ── 2) Logs dry-run (confirmación opcional) ────────────────────────────────
echo ""
echo "── 2) Logs de evaluación dry-run en Cloud Logging (últimos 7 días) ──"
LOG_COUNT="$(gcloud logging read \
  'resource.type="artifactregistry.googleapis.com/Repository"' \
  --project="${PROJECT}" --freshness=7d --limit=5 \
  --format='value(timestamp)' 2>/dev/null | wc -l | tr -d ' ' || echo 0)"
if [ "${LOG_COUNT}" -gt 0 ]; then
  echo "   ${LOG_COUNT}+ entradas de AR Repository en logs (la evaluación ya corrió)."
else
  echo "   Sin logs aún (AR evalúa periódicamente, hasta ~24h la 1ra vez)."
  echo "   El cómputo local de abajo es la fuente de verdad de la policy igual."
fi

# ── 3) Digest SIRVIENDO ahora por servicio (hard gate) ─────────────────────
echo ""
echo "── 3) Imagen sirviendo ahora por servicio (traffic vivo → no borrar) ──"
: > "${SERVING_FILE}"
for img in "${IMAGES[@]}"; do
  pair="$(service_region_for "${img}")"; [ -z "${pair}" ] && continue
  name="${pair%%:*}"; region="${pair##*:}"
  # revisiones con tráfico > 0
  revs="$(gcloud run services describe "${name}" --region "${region}" --project "${PROJECT}" \
    --format='json(status.traffic)' 2>/dev/null \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); print("\n".join(t["revisionName"] for t in (d.get("status",{}).get("traffic") or []) if t.get("percent",0)>0 and t.get("revisionName")))' 2>/dev/null || true)"
  for rev in ${revs}; do
    dg="$(gcloud run revisions describe "${rev}" --region "${region}" --project "${PROJECT}" \
      --format='value(spec.containers[0].image)' 2>/dev/null | grep -oE 'sha256:[0-9a-f]+' | norm || true)"
    [ -n "${dg}" ] && echo "${dg}" >> "${SERVING_FILE}" && printf "   %-34s %s  (rev %s)\n" "${name}" "${dg:0:16}…" "${rev}"
  done
done
sort -u "${SERVING_FILE}" -o "${SERVING_FILE}"
SERVING_N="$(wc -l < "${SERVING_FILE}" | tr -d ' ')"
echo "   digests sirviendo ahora: ${SERVING_N}"

# ── 4) Enumerar versiones (JSON, digest completo) + keep/delete ────────────
echo ""
echo "── 4) Simulación keep/delete por imagen (mirror exacto de la policy) ──"
: > "${DELETE_FILE}"
printf "   %-34s %6s %6s %7s\n" "IMAGEN" "total" "keep" "delete"
printf "   %s\n" "------------------------------------------------------------"
TOTAL_VERSIONS=0
for img in "${IMAGES[@]}"; do
  json_tmp="$(mktemp /tmp/_tags.XXXXXX.json)"
  gcloud container images list-tags "gcr.io/${PROJECT}/${img}" \
    --format=json --limit=9999 2>/dev/null > "${json_tmp}" || echo '[]' > "${json_tmp}"
  line="$(KEEP_RECENT="${KEEP_RECENT}" KEEP_DAYS="${KEEP_DAYS}" IMG="${img}" \
    python3 - "${DELETE_FILE}" "${json_tmp}" <<'PY'
import sys, os, json, datetime
from datetime import timezone
delete_out = sys.argv[1]; json_path = sys.argv[2]
keep_recent = int(os.environ["KEEP_RECENT"]); keep_days = int(os.environ["KEEP_DAYS"]); img = os.environ["IMG"]
now = datetime.datetime.now(timezone.utc)
try:
    data = json.load(open(json_path))
except Exception:
    data = []
rows = []
for v in data:
    digest = (v.get("digest") or "").replace("sha256:", "")
    ts = v.get("timestamp", {}).get("datetime") or v.get("createTime") or ""
    try:
        t = datetime.datetime.fromisoformat(ts.replace(" ", "T").split("+")[0].split(".")[0]).replace(tzinfo=timezone.utc)
        age = (now - t).days
    except Exception:
        age = 10**9
    rows.append((age, digest))
rows.sort(key=lambda x: x[0])  # más nuevo primero
keep = delete = 0
with open(delete_out, "a") as out:
    for i, (age, digest) in enumerate(rows):
        if i < keep_recent or age < keep_days:
            keep += 1
        else:
            delete += 1
            if digest: out.write(digest + "\n")
print(f"{len(rows)}|{keep}|{delete}")
PY
)"
  rm -f "${json_tmp}"
  tot="${line%%|*}"; rest="${line#*|}"; keep="${rest%%|*}"; dele="${rest##*|}"
  TOTAL_VERSIONS=$((TOTAL_VERSIONS + tot))
  printf "   %-34s %6s %6s %7s\n" "${img}" "${tot}" "${keep}" "${dele}"
done
sort -u "${DELETE_FILE}" -o "${DELETE_FILE}"
DELETE_N="$(wc -l < "${DELETE_FILE}" | tr -d ' ')"

# ── 5) Cross-check ─────────────────────────────────────────────────────────
echo ""
echo "── 5) Cross-check de seguridad ──"
OFFENDERS="$(comm -12 "${DELETE_FILE}" "${SERVING_FILE}" 2>/dev/null || true)"
OFFENDER_N="$(printf '%s' "${OFFENDERS}" | grep -c . || true)"

# Informativo: cuántas revisiones históricas (últimas 100/servicio) perderían imagen.
: > "${HISTREV_FILE}"
for img in "${IMAGES[@]}"; do
  pair="$(service_region_for "${img}")"; [ -z "${pair}" ] && continue
  name="${pair%%:*}"; region="${pair##*:}"
  gcloud run revisions list --service "${name}" --region "${region}" --project "${PROJECT}" \
    --format='value(spec.containers[0].image)' --limit=100 2>/dev/null \
    | grep -oE 'sha256:[0-9a-f]+' | norm >> "${HISTREV_FILE}" || true
done
sort -u "${HISTREV_FILE}" -o "${HISTREV_FILE}"
HISTREV_N="$(wc -l < "${HISTREV_FILE}" | tr -d ' ')"
LOST_ROLLBACK="$(comm -12 "${DELETE_FILE}" "${HISTREV_FILE}" 2>/dev/null | grep -c . || true)"

EST_GB="$(python3 -c "t=${TOTAL_VERSIONS} or 1; print(f'{${TOTAL_REPO_GB}*${DELETE_N}/t:.0f}')" 2>/dev/null || echo '?')"
EST_USD="$(python3 -c "t=${TOTAL_VERSIONS} or 1; print(f'{${TOTAL_REPO_GB}*${DELETE_N}/t*0.10:.1f}')" 2>/dev/null || echo '?')"

echo "   colisión {a-borrar} ∩ {sirviendo-ahora} : ${OFFENDER_N}   (HARD GATE)"
echo "   revisiones históricas que pierden imagen : ${LOST_ROLLBACK} / ${HISTREV_N}  (informativo)"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo " RESUMEN"
echo "   versiones totales : ${TOTAL_VERSIONS}"
echo "   a borrar          : ${DELETE_N}"
echo "   sirviendo ahora   : ${SERVING_N}"
echo "   GB estimados libre: ~${EST_GB} GB  (~\$${EST_USD}/mo)"
echo "═══════════════════════════════════════════════════════════════════"

if [ "${OFFENDER_N}" -eq 0 ]; then
  echo ""
  echo " ✅ VEREDICTO: SEGURO pasar a enforced."
  echo "    La imagen que cada worker sirve AHORA está preservada (keep-${KEEP_RECENT})."
  echo "    Ventana de rollback: últimos ${KEEP_RECENT} deploys + ${KEEP_DAYS} días por worker."
  if [ "${LOST_ROLLBACK}" -gt 0 ]; then
    echo "    Nota: ${LOST_ROLLBACK} revisiones MUY viejas (>keep+${KEEP_DAYS}d) perderían su"
    echo "    imagen → no se podría --to-revisions a ellas (esperado; nunca se rollbackea tan atrás)."
  fi
  echo ""
  echo " Para ENFORCED (DESTRUCTIVO — requiere confirmación humana):"
  cat > "${POLICY_FILE}" <<EOF
[
  { "name": "keep-recent-${KEEP_RECENT}", "action": { "type": "Keep" }, "mostRecentVersions": { "keepCount": ${KEEP_RECENT} } },
  { "name": "delete-older-than-${KEEP_DAYS}d", "action": { "type": "Delete" }, "condition": { "olderThan": "$((KEEP_DAYS*86400))s" } }
]
EOF
  echo "   cat > /tmp/cleanup-policy.json <<'JSON'"
  sed 's/^/   /' "${POLICY_FILE}"
  echo "   JSON"
  echo "   gcloud artifacts repositories set-cleanup-policies gcr.io \\"
  echo "     --location=${REPO_LOCATION} --project=${PROJECT} \\"
  echo "     --policy=/tmp/cleanup-policy.json --no-dry-run"
  exit 0
else
  echo ""
  echo " ⛔ VEREDICTO: NO SEGURO. ${OFFENDER_N} digest(s) sirviendo AHORA caerían en el borrado:"
  printf '%s\n' "${OFFENDERS}" | sed 's/^/    /'
  echo ""
  echo " Acción: subí KEEP_RECENT o KEEP_DAYS y re-corré. NO pasar a enforced."
  exit 1
fi
