# Operar Efeonce Marketing Studio

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-09-25 por Claude (TASK-1887)
> **Documentacion tecnica:** [Runtime handoff](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md)

## Para qué sirve

Revisar el estado de las campañas, preparar la pauta y actualizar Studio cuando cambian los datos de campaña
en OneDrive.

## Antes de empezar

- Para mirar: abre `studio.efeonce.org` (mientras el DNS no esté activo, pide la URL del deployment).
- Para actualizar datos, necesitas acceso a OneDrive de Efeonce, el repo `efeonce-marketing-studio` clonado,
  `gcloud` autenticado en `efeonce-group` y `cloud-sql-proxy`.

## Paso a paso: revisar una campaña

1. Entra a **Hoy** y lee las decisiones pendientes; cada una tiene un botón que lleva a la pantalla donde se resuelve.
2. Abre la campaña desde **Campañas**.
3. En **Piezas**, haz clic en una pieza. A la derecha verás cómo se ve en el feed; cambia **LinkedIn/Meta** y **Copy A/B** para ver cada combinación.
4. Copia la **URL con UTM** con el botón de copiar. La dirección de la página queda enlazada a esa pieza para compartirla.
5. Revisa **Antes de lanzar**: son los chequeos pendientes de esa pieza.
6. En **Medios**, confirma que el presupuesto figure como propuesto y quién falta asignar.

## Paso a paso: actualizar datos desde OneDrive

1. Regenera el catálogo del Campaign Manager en OneDrive si cambió una campaña.
2. Si hay una campaña nueva o cambió un estado, edita `scripts/seeds/campaign-registry.json` en el repo de Studio.
3. Sigue los comandos de import (primero sin `--apply`) y de renditions del [runtime handoff](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md#comandos-desde-efeonce-marketing-studio), primero en staging y después en producción.
4. Confirma que una segunda corrida de import informe 0 filas insertadas.

## Paso a paso: dar acceso por API a una integración

1. Decide qué organizaciones debe ver la integración (id canónico `org-…`, no el `EO-ORG-####`).
2. Con el túnel a la base de destino abierto, corre `pnpm api-client:create --label "<quién>" --org org-… --scope studio:read --token-only` y canaliza la salida directo a Secret Manager (`| gcloud secrets versions add <secreto> --data-file=-`). El token se muestra una sola vez.
3. Verifica con `curl -H "Authorization: Bearer <token>" https://studio.efeonce.org/api/v1/campaigns`: debe responder 200 y sólo campañas de sus organizaciones.
4. Para cortar el acceso: `pnpm api-client:revoke --id <api_client_id> --reason "<por qué>"`. Desde ese momento el token responde 401.

El gateway de Efeonce MCP usa su propio cliente (secreto `marketing-studio-mcp-gateway-token`); no lo compartas con otra integración.

## Qué significan los estados

| Estado | Significado |
|---|---|
| Piezas finales / Aprobada | La creatividad está lista o aprobada |
| Pendiente (medios) | Falta autorizar la inversión o las cuentas |
| Bloqueada | Hay un impedimento declarado (por ejemplo, una aprobación de un partner) |
| No aplica | Campaña orgánica, sin pauta |
| Sin lanzar / Programado | Ningún anuncio activo / hay posts programados en Metricool |
| Requieren verificación | La fecha del post pasó y el último estado registrado es «pendiente» |

## Qué no hacer

- No edites datos directo en la base: se reimportan desde OneDrive y el registro.
- No asumas que un post salió porque pasó su fecha; revísalo en Metricool.
- No crees usuarios de base con `gcloud sql users create`, ni pegues el `.npmrc` completo como token en Vercel.

## Problemas comunes

- **Un token responde 401:** está mal copiado, revocado o tiene saltos de línea. Los tokens empiezan con `mst_` y tienen 47 caracteres.
- **Una integración recibe 404 en una campaña que existe:** la campaña es de una organización que su token no tiene permitida.

| Síntoma | Qué hacer |
|---|---|
| Una pieza sale sin imagen | Faltan sus renditions: corre `media:renditions` para ese ambiente |
| «No pudimos cargar esta vista» | Revisa `/api/v1/health`; si la base está inalcanzable, revisa el secreto y la service account del ambiente |
| El deployment queda `BLOCKED` | El autor del commit no está vinculado al team de Vercel; usa `jreyes@efeonce.cl` como email del repo |
| Falla `pnpm install` en Vercel | `NODE_AUTH_TOKEN` debe tener solo el token de GitHub Packages, no el `.npmrc` completo |

## Referencias técnicas

- [Arquitectura](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md)
- [Runtime handoff](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md)
- [EPIC-049](../../epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md)
