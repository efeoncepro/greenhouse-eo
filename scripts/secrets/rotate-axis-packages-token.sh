#!/usr/bin/env bash
# Rota `axis-packages-read-token` leyendo el PAT por STDIN.
#
# Por qué existe: el secreto NO es el token pelado — es un `.npmrc` completo que el
# Dockerfile monta en `/root/.npmrc`. Cargarlo a mano es fácil de arruinar, y un `.npmrc`
# malformado falla EXACTAMENTE igual que un token vencido (401 en `pnpm install`), así que
# cuesta otro ciclo de build de ~4 min descubrirlo.
#
# 🔴 El token entra por STDIN y sólo por STDIN. Nunca como argumento (queda en `ps` y en el
# historial del shell), nunca en un archivo temporal, nunca en un log. El pipe va directo a
# `gcloud secrets versions add --data-file=-`.
#
# Uso (macOS — recomendado, cero interaccion):
#   Copia el PAT en GitHub y corre:
#     pbpaste | ./scripts/secrets/rotate-axis-packages-token.sh
#   El valor va portapapeles -> stdin -> Secret Manager. Nunca se escribe en la terminal,
#   ni queda en el historial del shell, ni aparece en pantalla.
#
# Uso (interactivo, cualquier plataforma):
#   ./scripts/secrets/rotate-axis-packages-token.sh
#   (pega el PAT, Enter, y luego Ctrl-D para cerrar la entrada)
#
# El PAT necesita scope `read:packages` sobre la org `efeoncepro`.
# Consumidores: ops-worker · commercial-cost-worker · ico-batch · artifact-worker.
set -euo pipefail

SECRET="axis-packages-read-token"
PROJECT="efeonce-group"

# Sin stdin redirigido, se ofrece el portapapeles antes que obligar a un Ctrl-D: en macOS es
# el camino con menos friccion Y mas seguro (el token no llega a mostrarse en pantalla).
if [ -t 0 ]; then
  if command -v pbpaste >/dev/null 2>&1; then
    echo "Sin entrada por stdin. Tomando el token del PORTAPAPELES (pbpaste)." >&2
    echo "Si prefieres pegarlo a mano, corta con Ctrl-C y usa: ./$(basename "$0") < /dev/tty" >&2
    TOKEN="$(pbpaste)"
  else
    echo "Pega el PAT (scope read:packages), Enter, y luego Ctrl-D:" >&2
    TOKEN="$(cat)"
  fi
else
  TOKEN="$(cat)"
fi
TOKEN="${TOKEN//[$'\r\n\t ']/}"

if [ -z "$TOKEN" ]; then
  echo "ERROR: no se leyó ningún token por stdin." >&2
  exit 1
fi

# Validación barata ANTES de escribir: un token que no autentica produce el mismo 401 que el
# vencido, y descubrirlo en el build cuesta 4 minutos en vez de 2 segundos.
if ! curl -sf -o /dev/null -H "Authorization: Bearer ${TOKEN}" \
     "https://api.github.com/orgs/efeoncepro/packages?package_type=npm&per_page=1"; then
  echo "ERROR: el token no pudo leer packages de la org efeoncepro." >&2
  echo "       Verifica el scope read:packages y que esté autorizado para la org (SSO)." >&2
  exit 1
fi

printf '@jsr:registry=https://npm.jsr.io/\n@efeoncepro:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\n' \
  "$TOKEN" \
  | gcloud secrets versions add "$SECRET" --project "$PROJECT" --data-file=- >/dev/null

echo "OK — nueva versión de ${SECRET} publicada y token verificado contra la API de GitHub." >&2
gcloud secrets versions list "$SECRET" --project "$PROJECT" --limit 2 \
  --format='table(name,state,createTime)' >&2
