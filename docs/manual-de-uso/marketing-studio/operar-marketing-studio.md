# Operar Efeonce Marketing Studio

> **Tipo de documento:** Manual de uso
> **Version:** 1.8
> **Creado:** 2026-09-25 por Claude (TASK-1887)
> **Ultima actualizacion:** 2026-10-04: catálogo desplegado y CLI HTTP local; se conservan los procedimientos de cargas, edición y video anteriores.
> **Documentacion tecnica:** [Runtime handoff](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md) · [Arquitectura](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md)
> **Documentacion funcional:** [Efeonce Marketing Studio — Gestión de campañas](../../documentation/marketing-studio/efeonce-marketing-studio.md)


## Dónde vivirá el flujo editorial SEO/AEO

**Acordado el 2026-10-04, pendiente de implementación:** el plan, brief, asignación, revisión y calendario
editorial vivirán en Studio. Consulta las oportunidades y resultados en Greenhouse / Search Visibility 360,
y los informes en Efeonce Insights. Studio conservará las referencias que conectan ese trabajo con su evidencia.

El flujo completo aún no tiene pasos operativos disponibles: [TASK-1667](../../tasks/to-do/TASK-1667-growth-seo-editorial-work-item-content-factory-handoff.md)
y [TASK-1669](../../tasks/to-do/TASK-1669-growth-seo-agentic-daily-plan.md) están en diseño. Un borrador enviado
al CMS no prueba publicación; una publicación no prueba indexación ni resultados.

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
   - si es un **video**, presiona play en el reproductor (no arranca solo). Puedes adelantar, ponerlo a pantalla
     completa y ver su duración en la línea de datos. Para revisar la versión con intro de Instagram (u otra variante
     del mismo formato), elígela en el tablero: aparece al lado del máster con su etiqueta.
   - si buscas el video de un formato y estás en **Imágenes**, el hueco dice **Ver video**: haz clic y te lleva a él.
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

## Paso a paso: agregar un concepto nuevo a una campaña gobernada por OneDrive

Sirve para sumar un concepto con sus finales (imágenes o video) a una campaña cuyos datos manda OneDrive (hoy
CMP-001 a CMP-005). En esas campañas el concepto no se crea desde Studio: entra por OneDrive, el catálogo, el import y
la ingesta de originales. Así se cargó el 2026-10-03 el spot «Los Sparks» (49,6 s, 16:9) en CMP-001 como concepto
CMP001-08.

1. **Copia los finales a OneDrive** con nombre canónico, en
   `Alineación/5. Contenidos/15. Paid Media/03. Finales/<CMP-### - Nombre>/`. Por ejemplo
   `02 - Videos/16x9/CMP001-08 - Los Sparks - 16x9.mp4` y
   `01 - Imagenes/4x5/CMP001-08 - Los Sparks portada - 4x5.png` (igual para 9x16 y 16x9).
2. **Agrega las piezas y los copys al catálogo** `01. Recursos/Campaign Manager/CATALOGO-DATOS.json`: cada pieza con
   su huella sha256, su peso en bytes y sus dimensiones; los copys en `campaigns[].copies`. Antes, haz una copia de
   respaldo del archivo. Si lo editas con un script, conserva la indentación de 2 espacios y los acentos tal cual
   (`indent=2`, `ensure_ascii=False`); otra indentación genera un cambio gigante.
3. **Nombra bien la primera pieza del concepto:** Studio toma de ella el título del concepto.
4. **Compara los estados de las campañas** en la base con `scripts/seeds/campaign-registry.json`. Si no coinciden,
   detente: el import revertiría lo que cambió en la base.
5. **Corre el import** sin `--apply`, lee el resumen y repite con `--apply` (pasos de
   [actualizar datos desde OneDrive](#paso-a-paso-actualizar-datos-desde-onedrive)). Contra producción usa
   `STUDIO_PG_DATABASE=marketing_studio`, `STUDIO_PG_USER=marketing_studio_app`, `STUDIO_PG_SSL=false` y la contraseña
   del secreto `marketing-studio-pg-app-password`, leída en la misma línea, nunca impresa.
6. **Sube los originales al almacén de Studio:**
   ```bash
   pnpm media:ingest --root "<…>/Alineación/5. Contenidos" --bucket efeonce-marketing-studio-originals --campaign CMP-001 --apply
   ```
   Necesita credenciales de Google que actúen como la cuenta de ingesta
   (`marketing-studio-ingest@efeonce-group.iam.gserviceaccount.com`). Usa un archivo de credenciales temporal, sólo
   para este comando, y bórralo después. No cambies tus credenciales por defecto ni los permisos de la nube.
7. **Espera las imágenes livianas:** Studio las genera solo al recibir cada original (3 por imagen, 6 por video).
   Confírmalas en la web o por la API antes de reintentar nada.
8. **Registra las piezas** en el `ASSETS.md` de la campaña (`Alineación/2. Campañas/<carpeta de la campaña>/ASSETS.md`).
9. Las versiones nuevas quedan **importadas**, no aprobadas: aprobar es un paso aparte de una persona.

**Corregir un copy después:** cambia el texto en el catálogo y vuelve a correr el import con `--apply`. El copy se
actualiza sin duplicarse.

| Síntoma | Qué hacer |
|---|---|
| El import responde `ECONNRESET` | El túnel a la base quedó viejo. Abre uno nuevo en otro puerto y apunta `STUDIO_PG_PORT` a ese puerto. |
| El resumen dice `updated: N` con muchas filas | Cuenta todas las filas que el import tocó, cambien o no. Confirma el dato puntual con una lectura. |
| Un original queda un rato en `media_object_pending` | Es pasajero: el aviso llegó antes que el registro. Espera y revisa las imágenes antes de reintentar. |

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

## Editar una campaña gobernada por Studio

> **Estado (2026-10-02):** en producción desde el 2026-10-02, tras probarse en staging con la campaña de pruebas
> `CMP-900`. Las campañas reales siguen gobernadas por OneDrive (responden 409) hasta su corte a Studio.

Cada campaña tiene un **dueño de sus datos**: OneDrive o Studio. Las campañas que existían antes (CMP-001 a CMP-005)
siguen gobernadas por OneDrive: sus datos se actualizan con el import. Las campañas nuevas creadas en Studio nacen
gobernadas por Studio, y en ellas se puede editar todo desde Studio.

### Qué se puede editar

En una campaña gobernada por Studio:

- **La campaña y su brief.** El brief se guarda tal como lo escribes (comillas, saltos de línea y espacios incluidos).
  Si editas un brief ya aprobado, vuelve a borrador y hay que aprobarlo de nuevo.
- **Conceptos y piezas** (crear y editar), y los **derechos** de una versión.
- **Copys**, que se guardan letra por letra, sin cambios.
- **Anuncios**: unen una pieza que ya tiene versión vigente con un copy y una audiencia de la misma campaña.
- **Plan de medios**: el flight (uno por campaña) y las líneas de presupuesto. Una línea nueva siempre entra como
  **propuesta**; aprobarla crea una línea aprobada aparte y conserva la propuesta.
- **Calendario**: planificar y cancelar posts. Studio nunca publica, y un post que vino de la plataforma no se edita.
- **Estados** de creatividad, autorización de medios y lanzamiento, con una nota obligatoria que explica el cambio.
  «Activa» y «Pausada» no se marcan a mano: salen de lo que se observa en la plataforma.

### Por qué una campaña de OneDrive responde 409

Si intentas editar una campaña gobernada por OneDrive (por ejemplo CMP-004), Studio responde
**`campaign_not_studio_owned` (409)** y no guarda nada. Es a propósito: el próximo import desde OneDrive sobrescribiría
tu cambio. Esas campañas se siguen editando en OneDrive hasta su corte, que se hará más adelante. Las subidas de
finales (sección anterior) sí funcionan en cualquier campaña.

Esto incluye la **autorización de medios de CMP-004**: sigue en el catálogo de OneDrive hasta su corte.

### Antes de empezar

- El repo `efeonce-marketing-studio` instalado y la conexión a la base del ambiente (las variables `STUDIO_PG_*`,
  igual que para el import y para `studio:review`).
- El id de la campaña y la **revisión** actual de lo que vas a cambiar (ver «La revisión», abajo).
- Un archivo JSON con los datos del cambio, si la operación los pide.

### Paso a paso: aprobar o autorizar con la CLI

Aprobar (una pieza, la creatividad, el brief o una línea de presupuesto) y autorizar medios son decisiones de una
**persona**. Studio no deja que una integración ni un agente con token las tome (`approval_requires_person`).

1. Mira qué operaciones existen y su nivel de riesgo:
   ```bash
   pnpm studio:write --list
   ```
2. **Prueba sin escribir.** Sin `--apply`, el comando sólo muestra qué haría:
   ```bash
   pnpm studio:write authorizeMedia --param campaignId=CMP-900 --file autorizacion.json --if-match 4
   ```
3. Lee el resultado. Si es lo que quieres, **aplica y confirma**. Una aprobación o una acción que borra exige las dos
   banderas, `--apply` y `--confirm`:
   ```bash
   pnpm studio:write authorizeMedia --param campaignId=CMP-900 --file autorizacion.json --if-match 4 --apply --confirm
   ```
4. Los cambios de estado comunes (por ejemplo pasar la autorización de medios a «Pendiente») no son aprobaciones:
   llevan nota obligatoria y sólo `--apply`.

Para llevar la creatividad a «Aprobada» o los medios a «Autorizada» hay que usar su comando propio (`approveCreative`,
`authorizeMedia`). El cambio de estado genérico lo rechaza con `approval_requires_dedicated_command`.

### La revisión (If-Match), en simple

Cada cosa que se puede editar tiene un número de **revisión** que sube cada vez que alguien la cambia. Cuando editas,
le dices a Studio qué revisión viste (`--if-match <número>`). Si alguien la cambió mientras tanto, Studio no pisa su
trabajo: responde `revision_conflict` y tienes que volver a leer y repetir. Si no indicas la revisión, responde
`precondition_required`. La revisión aparece en la lectura de la campaña (también como `ETag` por la API).

La lectura de la campaña también dice si puedes editarla (`writable`), por qué no (`lockReason`: modo abierto, sin
permiso o gobernada por OneDrive), si puedes aprobar y a qué estados se puede pasar desde el actual.

### Problemas comunes al editar

| Síntoma | Qué hacer |
|---|---|
| `campaign_not_studio_owned` (409) | La campaña sigue gobernada por OneDrive. Edítala allá hasta su corte. |
| `approval_requires_person` (403) | Una integración intentó aprobar. Lo hace una persona con la CLI. |
| `confirmation_required` (403) | Una aprobación o borrado llegó por la API. Por ahora sólo se hace con la CLI, con `--confirm`. |
| `approval_requires_dedicated_command` (422) | Usa `approveCreative` o `authorizeMedia` en vez del cambio de estado genérico. |
| `invalid_state_transition` (409) | Ese cambio de estado no está permitido desde el estado actual. Revisa los estados posibles en la lectura de la campaña. |
| `revision_conflict` (412) o `precondition_required` (428) | Vuelve a leer, toma la revisión actual y repite con `--if-match`. |
| `budget_kind_violation` (422) | Una línea nueva sólo puede ser propuesta. Para aprobarla usa `approveBudgetLine`. |

## Paso a paso: dar acceso por API a una integración

1. Decide qué organizaciones debe ver la integración. Usa el id canónico de Greenhouse (`org-…`), no el
   `EO-ORG-####`.
2. Con el túnel a la base de destino abierto, crea el cliente y manda el token **directo** a Secret Manager (el
   token se muestra una sola vez; nunca lo imprimas en pantalla):
   ```bash
   pnpm api-client:create --label "<quién>" --org org-… --scope studio:read --token-only \
     | gcloud secrets versions add <secreto> --data-file=-
   ```
3. Desde Greenhouse, verifica sin poner el token en los argumentos:
   `pnpm studio call studio.campaigns.list --token-secret <secreto> --project <proyecto>`. Debe responder 200 y
   mostrar sólo campañas de las organizaciones autorizadas. Consulta `pnpm studio list` para el nombre vigente.
4. Para cortar el acceso: `pnpm api-client:revoke --id <api_client_id> --reason "<por qué>"`. Desde ese momento
   el token responde 401. La revocación queda auditada.

El gateway de Efeonce MCP usa su propio cliente (secreto `marketing-studio-mcp-gateway-token`); no lo compartas
con otra integración.

## Paso a paso: pedirle a un agente que lea Studio por MCP

> **Estado al 04/10:** el release Studio publicó API 1.6.0 y 59 tools declaradas; no desplegó Greenhouse/gateway
> ni verificó estas herramientas en una sesión MCP real. Estos pasos requieren que el provider y la conexión
> estén habilitados. La autoridad MCP T1 corresponde a TASK-2003; TASK-1899 está retirada.

1. Confirma que tu usuario tenga uno de los roles con permiso de lectura de Studio: **administración**,
   **cuentas** u **operaciones** de Efeonce. Sin ese permiso el agente no puede leer nada en tu nombre.
2. Conecta tu asistente (por ejemplo, Claude) a `mcp.efeonce.org` e inicia sesión con tu cuenta Efeonce.
3. Pídele lo que necesitas en lenguaje normal: «¿qué decisiones están pendientes en Studio?», «resúmeme la
   campaña CMP-004», «muéstrame la pieza 4:5 del concepto 2».
4. El agente carga el manual `marketing-studio` y usa las herramientas disponibles en su conexión. Debe informarte los tres
   estados por separado, decir de qué tipo es cada monto y no dar por publicado un post sólo porque pasó su fecha.
5. Si necesita cambiar algo, verifica el carril y los permisos. Una campaña gobernada por Studio se edita por
   API/CLI con autoridad suficiente; una campaña de OneDrive conserva su flujo de importación. No suponer
   escritura MCP ni confirmación remota T2 por tener disponible una lectura.

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
| Un video muestra el primer cuadro y «La versión para reproducir todavía no está lista» | El worker aún no genera su versión liviana. Se crea sola en el barrido horario del worker; para no esperar, el equipo técnico puede correr el barrido (`gcloud scheduler jobs run marketing-studio-reconcile-derivatives`). Recarga después. |
| Un video dice «No se pudo cargar el video.» | Presiona **Reintentar**. Si sigue, recarga la página: el enlace del video vence y se renueva al recargar. Si persiste, revisa `/api/v1/health` y avisa al equipo técnico (puede faltar el firmante en ese ambiente: error `playback_unavailable`). |
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

## CLI HTTP desde el repositorio Greenhouse

Para operar Studio sin entrar al repo hermano usa `pnpm studio` desde `greenhouse-eo`:
[manual de CLI API](operar-por-cli-api.md). Incluye descubrimiento de operaciones, lecturas, copys,
canales, planes y carga de piezas. Su default es **dryRun**; para escribir se añade `--apply` y se usan
credenciales con los permisos correspondientes. No confundirlo con las CLIs históricas del repo de Studio.

## Leer alertas de canales

Desde el release del 04/10, una señal de canales en la atención indica hallazgos de la revisión vigente. Abre la
campaña y revisa el literal, la clave canónica y la versión del catálogo. `validatedWithPreviousSpec` sólo indica
que existe una especificación publicada posterior; no significa que se haya revalidado la pieza. En modo `warn`,
los hallazgos no bloquean por sí solos el guardado ni equivalen a una aprobación.

Para mapear aliases, revisar findings o revalidar, usa el [manual de catálogo](gobernar-catalogo-canales.md).
No cambies flags ni ejecutes un backfill para ocultar la señal: los 134 registros pendientes observados en el
release necesitan revisión explícita. ICP sigue desactivado; una nota pendiente conserva el trabajo sin inventar
referencias del modelo de cliente.
