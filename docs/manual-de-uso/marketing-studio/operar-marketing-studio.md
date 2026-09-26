# Operar Efeonce Marketing Studio

> **Tipo de documento:** Manual de uso
> **Version:** 1.2
> **Creado:** 2026-09-25 por Claude (TASK-1887)
> **Ultima actualizacion:** 2026-09-25 por Claude (TASK-1890 / TASK-1891)
> **Documentacion tecnica:** [Runtime handoff](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md) · [Arquitectura](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md)
> **Documentacion funcional:** [Efeonce Marketing Studio — Gestión de campañas](../../documentation/marketing-studio/efeonce-marketing-studio.md)

## Para qué sirve

Revisar el estado de las campañas y preparar la pauta, actualizar Studio cuando cambian los datos en OneDrive,
generar sus imágenes, dar acceso por API a una integración y, cuando esté encendido, pedirle a un agente que lea
Studio por Efeonce MCP.

## Antes de empezar

- **Para mirar:** abre `https://studio.efeonce.org`. No pide inicio de sesión y es sólo de lectura.
- **Para actualizar datos, imágenes o tokens** (tareas de operador técnico) necesitas:
  - acceso al OneDrive de Efeonce (carpeta `5. Contenidos`, Campaign Manager);
  - el repo `efeonce-marketing-studio` clonado e instalado (`NODE_AUTH_TOKEN="$(gh auth token)" pnpm install`);
  - `gcloud` autenticado en el proyecto de Efeonce y `cloud-sql-proxy`;
  - el túnel a la base abierto en el puerto **15433** (propio de Studio, para no chocar con Greenhouse):
    `cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15433`.
- Trabaja siempre **primero en staging** (base `marketing_studio_staging`) y después en producción
  (`marketing_studio`). Los usuarios y secretos de cada base están en el
  [runtime handoff](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md#variables-en-vercel).

## Paso a paso: revisar una campaña

1. Entra a **Hoy** y lee **Requiere tu decisión**. Cada decisión tiene un botón (Revisar plan, Verificar, Ver
   campaña) que lleva a la pantalla donde se resuelve.
2. Abre la campaña desde **Campañas**. Arriba verás sus tres estados: creatividad, autorización de medios y
   lanzamiento. Léelos por separado (ver [Qué significan los estados](#qué-significan-los-estados)).
3. Usa **Brief y decisiones** para ver las decisiones registradas, el brief y la nota del operador.
4. En la pestaña **Piezas**, haz clic en una pieza. A la derecha verás cómo se ve publicada:
   - si es **9:16**, como una story;
   - si es **1:1, 4:5 o 16:9**, dentro de una tarjeta de feed con su proporción real.
5. Cambia **LinkedIn/Meta** y **Copy A/B** para revisar cada combinación. Si aparece «Sin copy registrado para
   este canal y variante», falta ese copy en la fuente.
6. Copia la **URL con UTM** con el botón **Copiar URL**. La dirección de la página queda enlazada a esa pieza, así
   que puedes compartirla.
7. Revisa **Antes de lanzar**: son los chequeos que faltan para esa pieza. Mientras haya chequeos pendientes, el
   anuncio no está listo.
8. En la pestaña **Medios**, confirma de qué tipo es cada monto y revisa **Falta para activar** y los responsables.

## Cómo leer estados y presupuestos

- **Nunca sumes** propuesto, aprobado y gasto real. Son cosas distintas: una propuesta no autoriza inversión y
  no es gasto.
- «Sin aprobación registrada» significa que ningún anuncio puede lanzarse con ese presupuesto.
- «Sin datos de gasto» significa que no hay cuenta publicitaria conectada o no hay dato; **no** significa cero.
- «Reparto recomendado, no autorización de medios» acompaña la distribución por mes y canal: es una sugerencia.
- «Sin dato en la fuente» significa que el dato no existe en OneDrive ni en el registro; no lo completes a ojo.

## Paso a paso: actualizar datos desde OneDrive

Mientras no exista la edición en Studio, OneDrive es la fuente y Studio se actualiza reimportando.

1. Si cambió una campaña, regenera el catálogo del Campaign Manager en OneDrive (`CATALOGO-DATOS.json`).
2. Si hay una campaña nueva o cambió un estado, edita `scripts/seeds/campaign-registry.json` en el repo de Studio.
3. Con el túnel abierto, corre el import **sin `--apply`** (modo de prueba) contra staging y revisa el resumen:
   ```bash
   STUDIO_PG_HOST=127.0.0.1 STUDIO_PG_PORT=15433 STUDIO_PG_DATABASE=marketing_studio_staging \
   STUDIO_PG_USER=<usuario app> STUDIO_PG_PASSWORD="$(gcloud secrets versions access latest --secret=<secreto app>)" \
   pnpm import:catalog --catalog "<…>/Campaign Manager/CATALOGO-DATOS.json"
   ```
   Si una campaña tiene lectura de Metricool, agrega `--readback "CMP-###=<ruta al readback>"`.
4. Si el resumen es el esperado, repite con `--apply`.
5. Corre el import una segunda vez: debe informar **0 filas insertadas**. Si inserta algo, detente y revisa antes
   de seguir.
6. Repite los pasos 3 a 5 contra producción (`marketing_studio`, con su usuario y secreto).
7. Si hay piezas nuevas, genera sus imágenes (siguiente sección).

## Paso a paso: generar las imágenes de las piezas

Studio no muestra los originales: muestra una **miniatura de 640 px** y una **vista previa de 1600 px** de cada
pieza (los videos, con un fotograma). Hay que generarlas cuando entran piezas nuevas.

1. Con el túnel abierto y las variables de la base de destino, corre sin `--apply`:
   ```bash
   pnpm media:renditions --root "<…>/Alineación/5. Contenidos" --bucket <bucket del ambiente>
   ```
   El bucket de producción es `efeonce-marketing-studio-media` y el de staging `efeonce-marketing-studio-media-staging`.
2. Revisa el resumen (cuántas piezas procesaría) y repite con `--apply`.
3. Es seguro repetirlo: lo que ya existe no se vuelve a generar.
4. Abre la campaña en la web y confirma que las piezas nuevas se ven.

## Paso a paso: dar acceso por API a una integración

1. Decide qué organizaciones debe ver la integración. Usa el id canónico de Greenhouse (`org-…`), no el
   `EO-ORG-####`.
2. Con el túnel a la base de destino abierto, crea el cliente y manda el token **directo** a Secret Manager (el
   token se muestra una sola vez; nunca lo imprimas en pantalla):
   ```bash
   pnpm api-client:create --label "<quién>" --org org-… --scope studio:read --token-only \
     | gcloud secrets versions add <secreto> --data-file=-
   ```
3. Verifica con `curl -H "Authorization: Bearer <token>" https://studio.efeonce.org/api/v1/campaigns`: debe
   responder 200 y sólo campañas de sus organizaciones.
4. Para cortar el acceso: `pnpm api-client:revoke --id <api_client_id> --reason "<por qué>"`. Desde ese momento
   el token responde 401. La revocación queda auditada.

El gateway de Efeonce MCP usa su propio cliente (secreto `marketing-studio-mcp-gateway-token`); no lo compartas
con otra integración.

## Paso a paso: pedirle a un agente que lea Studio por MCP

> **Estado:** las herramientas de Studio en Efeonce MCP están desplegadas pero **apagadas** hasta la próxima
> publicación de Greenhouse a producción y una prueba con una persona real. Estos pasos aplican desde que se
> enciendan.

1. Confirma que tu usuario tenga uno de los roles con permiso de lectura de Studio: **administración**,
   **cuentas** u **operaciones** de Efeonce. Sin ese permiso el agente no puede leer nada en tu nombre.
2. Conecta tu asistente (por ejemplo, Claude) a `mcp.efeonce.org` e inicia sesión con tu cuenta Efeonce.
3. Pídele lo que necesitas en lenguaje normal: «¿qué decisiones están pendientes en Studio?», «resúmeme la
   campaña CMP-004», «muéstrame la pieza 4:5 del concepto 2».
4. El agente carga el manual `marketing-studio` y usa las 12 herramientas de lectura. Debe informarte los tres
   estados por separado, decir de qué tipo es cada monto y no dar por publicado un post sólo porque pasó su fecha.
5. Si te pide aprobar o cambiar algo, recuerda que **todavía no puede**: los cambios se hacen fuera de Studio
   (OneDrive) y se reimportan.

| Lo que responde el agente | Qué significa |
|---|---|
| `authorization_denied` | Tu usuario no tiene el permiso de lectura de Studio. Pídeselo a un administrador. |
| `not_found` | La campaña o pieza no existe o tu conexión no la puede ver. No revela cuál de las dos. |
| `upstream_unavailable` | Studio no respondió. Revisa `https://studio.efeonce.org/api/v1/health`. |
| La herramienta no aparece | El proveedor sigue apagado o tu conexión no tiene el alcance de lectura. |

## Qué significan los estados

| Estado | Valor en pantalla | Significado |
|---|---|---|
| Creatividad | En producción | Las piezas se están haciendo |
| Creatividad | Piezas finales | Hay finales disponibles, todavía sin aprobar |
| Creatividad | Aprobada | La creatividad está aprobada (no dice nada del presupuesto ni del lanzamiento) |
| Autorización de medios | Pendiente | Falta autorizar la inversión o las cuentas |
| Autorización de medios | Autorizada | La inversión está autorizada; eso no lanza la campaña |
| Autorización de medios | Bloqueada | Hay un impedimento declarado (por ejemplo, la aprobación de un partner); lee la nota |
| Autorización de medios | No aplica | Campaña orgánica, sin pauta pagada |
| Lanzamiento | Sin lanzar | Ningún anuncio salió |
| Lanzamiento | Sin verificar | Alguien dijo que salió, sin evidencia de la plataforma |
| Lanzamiento | Activa | La plataforma la muestra funcionando |
| Lanzamiento | Programado | Campaña orgánica con posts agendados en Metricool |
| Calendario | Requieren verificación | La fecha del post pasó y el último estado observado es «pendiente» |

## Qué no hacer

- No edites datos directo en la base: se reimportan desde OneDrive y el registro, y tu cambio se perdería.
- No sumes presupuestos propuestos, aprobados y reales, ni presentes uno propuesto como gasto.
- No asumas que un post salió porque pasó su fecha; revísalo en Metricool.
- No corras el import con `--apply` sin haber leído antes la corrida de prueba.
- No imprimas ni pegues tokens de API en chats, tickets o terminal compartida; mándalos directo a Secret Manager.
- No crees usuarios de base con `gcloud sql users create`, ni pegues el `.npmrc` completo como token en Vercel.

## Problemas comunes

| Síntoma | Qué hacer |
|---|---|
| Una integración recibe **401** | El token está mal copiado, revocado o tiene saltos de línea. Los tokens empiezan con `mst_` y tienen 47 caracteres. Un token inválido responde 401 aunque la web esté abierta. |
| Una integración recibe **404** en una campaña que existe | La campaña es de una organización que su token no tiene permitida. Es intencional: no se revela si existe. |
| Una pieza muestra «Vista previa no disponible» | Primero recarga la página: los enlaces de imagen vencen cada semana y se renuevan al recargar. Si sigue igual, a esa pieza le faltan sus imágenes: corre `media:renditions` para ese ambiente. |
| Muchas imágenes fallan a la vez | Revisa `https://studio.efeonce.org/api/v1/health`. Si la base responde bien, avisa al equipo técnico: puede faltar la configuración de enlaces de imagen en ese ambiente. |
| «No pudimos cargar esta vista» | Revisa `/api/v1/health`. Si dice `database: unreachable`, la base no responde: revisa el secreto y la cuenta de servicio del ambiente. |
| Un comando local dice que la base no responde (`database: unreachable` o conexión rechazada) | Casi siempre es la sesión de `gcloud` vencida o el túnel cerrado. Renueva la sesión desde greenhouse-eo con `pnpm gcloud:auth:playwright -- --force` y vuelve a abrir el túnel en el puerto 15433. |
| El deployment queda `BLOCKED` | El autor del commit no está vinculado al team de Vercel; usa `jreyes@efeonce.cl` como email del repo. |
| Falla `pnpm install` en Vercel | `NODE_AUTH_TOKEN` debe tener sólo el token de GitHub Packages, no el `.npmrc` completo. |
| El agente responde `authorization_denied` | Tu usuario no tiene el permiso de lectura de Studio (roles administración, cuentas u operaciones). |

## Referencias técnicas

- [Documentación funcional](../../documentation/marketing-studio/efeonce-marketing-studio.md)
- [Arquitectura](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md)
- [ADR API-first](../../architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md)
- [Runtime handoff](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md)
- [Runbook de Efeonce MCP — Provider Marketing Studio](../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md#provider-marketing-studio-efeonce-marketing-studio)
- [EPIC-049](../../epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md)
