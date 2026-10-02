# Operar Efeonce Marketing Studio

> **Tipo de documento:** Manual de uso
> **Version:** 1.4
> **Creado:** 2026-09-25 por Claude (TASK-1887)
> **Ultima actualizacion:** 2026-10-02 por Claude (TASK-1894: subir y revisar finales; proporciones con decimales)
> **Documentacion tecnica:** [Runtime handoff](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md) · [Arquitectura](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md)
> **Documentacion funcional:** [Efeonce Marketing Studio — Gestión de campañas](../../documentation/marketing-studio/efeonce-marketing-studio.md)

## Para qué sirve

Revisar el estado de las campañas y preparar la pauta, actualizar Studio cuando cambian los datos en OneDrive,
subir finales y aprobarlos, generar sus imágenes, dar acceso por API a una integración y, cuando esté encendido, pedirle a un agente que lea
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

## Subir un final a Studio

Desde el 2026-10-02 un final puede entrar a Studio directamente, sin pasar por el import de OneDrive. El archivo se
sube al almacén privado de Studio, Studio comprueba que llegó intacto (misma huella, mismo tamaño, tipo real y
proporción correcta) y crea una **versión nueva pendiente de revisión**. La versión sólo pasa a ser la vigente cuando
una persona la aprueba.

### Antes de empezar

- El repo `efeonce-marketing-studio` instalado y `gcloud` autenticado (igual que arriba).
- El **token de subida**, que vive en Secret Manager. Cárgalo en la terminal sin imprimirlo:
  ```bash
  export STUDIO_API_TOKEN="$(gcloud secrets versions access latest --secret=marketing-studio-upload-cli-token)"
  ```
  Para staging, el secreto es `marketing-studio-upload-cli-token-staging` (y agrega `--base-url` con la dirección de
  staging).
- La **campaña** (`CMP-###`) ya existe en Studio.
- El **concepto** de la pieza ya existe en Studio. Si el concepto no está, hay que sembrarlo primero (registro semilla
  + import); esta subida no crea conceptos.
- El archivo es un **final** (PNG, JPG, WebP, MP4, MOV, audio o PDF). Los archivos de trabajo (PSD, AI, AEP, INDD,
  comprimidos) se rechazan.
- Sabes la **licencia** del archivo: `owned`, `client_supplied`, `stock`, `talent`, `music`, `ai_generated` o `mixed`.

### Paso a paso

1. Prueba primero sin subir nada, con `--dry-run`. Te dice qué pieza y qué número de versión deduciría:
   ```bash
   pnpm studio:upload "<…>/CMP004-S01 - <título> - 4x5.png" --campaign CMP-004 --license ai_generated --dry-run
   ```
2. **Si el archivo tiene el nombre canónico** (`CMP###-<concepto> - <título> - <ancho>x<alto>.<ext>`, por ejemplo
   `CMP004-S01 - … - 4x5.png`), Studio deduce la pieza sola. Sube igual, sin `--dry-run`:
   ```bash
   pnpm studio:upload "<…>/CMP004-S01 - <título> - 4x5.png" --campaign CMP-004 --license ai_generated
   ```
   Puedes pasar varios archivos en la misma llamada.
3. **Si la pieza todavía no existe**, créala junto con su primera versión (un archivo por llamada):
   ```bash
   pnpm studio:upload <archivo> --campaign CMP-004 --license ai_generated \
     --new-asset --concept CMP004-S01 --title "<título>" --ratio 4x5
   ```
   **Proporciones con decimales:** `--ratio` sólo acepta enteros (`<ancho>x<alto>`). Una horizontal 1,91:1 (LinkedIn
   1200×628 o Meta horizontal) se sube con `--ratio 191x100`; Studio la muestra como «1,91:1». No escribas `1.91x1`.
   La grilla de piezas de la campaña muestra una columna por cada proporción que la campaña tiene; después de subir,
   confirma que la pieza aparece en su columna.
4. **Si el nombre no permite deducir la pieza** pero ya existe, indícala con `--asset <id de la pieza>`.
5. Si tienes más datos de derechos, agrégalos: `--reference "…"`, `--from AAAA-MM-DD`, `--until AAAA-MM-DD`,
   `--territory CL`, `--channel <canal>`. Una nota para quien revisa va con `--note "…"`.
6. Lee el resultado de cada archivo (tabla de abajo). Al terminar, cierra la variable del token: `unset STUDIO_API_TOKEN`.

| Línea del resultado | Qué significa |
|---|---|
| `creado <pieza> vN · pendiente de revisión` | La versión existe y espera que alguien la apruebe. Todavía no es la que se usa. |
| `duplicado de <pieza> vN` | Ese mismo archivo ya es una versión de esa pieza. No se creó nada. |
| `dry-run · …` | Modo de prueba: muestra la pieza y versión que deduciría, sin escribir. |
| `rechazado: <código>` | No se creó la versión. El código dice por qué (ver problemas comunes). |
| `pendiente de verificación (retoma con --resume <id>)` | El archivo se subió pero la verificación tardó más de 10 minutos. Retoma después (ver problemas comunes). |

### Revisar y aprobar

1. Lista lo pendiente de una campaña (necesitas las variables `STUDIO_PG_*` de la base, como en el import):
   ```bash
   pnpm studio:review pending --campaign CMP-004
   ```
2. Mira la pieza en la web o por la API y decide.
3. Para aprobar:
   ```bash
   pnpm studio:review approve <id de la pieza> <número de versión> --reviewer "Nombre Apellido" --note "…"
   ```
   Desde ese momento esa versión es la vigente.
4. Para pedir cambios (la nota es obligatoria y dice qué cambiar):
   ```bash
   pnpm studio:review request-changes <id de la pieza> <número de versión> --reviewer "Nombre Apellido" --note "qué cambiar"
   ```

Sólo una persona puede aprobar: una integración o un agente con token de API no puede.

### Qué no hacer al subir

- **No confundas aprobar una pieza con autorizar la pauta.** Aprobar sólo dice que ese archivo es el bueno; la
  autorización de medios sigue en su propio estado.
- **No subas archivos de trabajo** (PSD, AI, AEP, ni copias con sufijos de taller en el nombre). Studio guarda sólo
  finales; el taller sigue en OneDrive.
- **No reutilices una llave de idempotencia** con otro archivo o con otros datos: Studio lo rechaza
  (`idempotency_key_reused`). La CLI arma la llave sola; si integras por API, usa una llave nueva por cada subida
  distinta.
- No imprimas el token de subida ni lo pegues en chats o tickets.

### Problemas comunes al subir

| Síntoma | Qué hacer |
|---|---|
| `rechazado: filename_not_inferable` | El nombre no sigue el patrón canónico. Renómbralo o indica la pieza con `--asset`, o créala con `--new-asset`. |
| `rechazado: rights_required` | Faltan los derechos mínimos. Agrega `--license` (la línea dice qué falta). |
| `rechazado: revision_conflict` | La pieza cambió mientras subías (otra persona subió o editó). Vuelve a correr el comando: la CLI lee la revisión actual. |
| `rechazado: upload_rejected: sha256_mismatch` o `size_mismatch` | El archivo que llegó no coincide con el que declaraste (se corrompió o cambió durante la subida). Vuelve a subirlo. |
| `rechazado: upload_rejected: type_rejected` | El contenido real del archivo no es del tipo que dice su extensión, o es un formato de trabajo. Exporta el final de nuevo. |
| `rechazado: upload_rejected: aspect_ratio_mismatch` | La proporción del archivo no es la de la pieza (más de 1 % de diferencia). Revisa que subes el formato correcto. |
| `rechazado: upload_expired` | La subida venció (24 h). Corre el comando de nuevo. |
| `rechazado: too_many_open_uploads` | Tienes más de 20 subidas abiertas. Termínalas o deja que venzan. |
| `rechazado: upload_disabled` | La subida está apagada en ese ambiente. Avisa al equipo técnico. |
| `Falta: STUDIO_API_TOKEN …` | No cargaste el token de subida en la terminal. Cárgalo como en «Antes de empezar». |
| `rechazado: forbidden` | El token no tiene permiso de subida (`studio:assets:write`). Usa el de `marketing-studio-upload-cli-token`. |
| `pendiente de verificación (retoma con --resume <id>)` | Espera unos minutos y corre `pnpm studio:upload --campaign CMP-### --resume <id>`. El barrido de Studio también retoma solo las verificaciones atascadas. |

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
