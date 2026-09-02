# Operar los hallazgos de sitio de la auditoría SEO (crawlers de IA, borde, JSON-LD, sitemap)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-09-01 por Claude (TASK-1670)
> **Ultima actualizacion:** 2026-09-01 por Claude (TASK-1670)
> **Documentacion tecnica:** [`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §6 y §10.6
> **Documentacion funcional:** [`modulo-seo-search-visibility-360.md`](../../documentation/growth/modulo-seo-search-visibility-360.md)
> **Manual de la pantalla:** [Auditoría del sitio](usar-auditoria-sitio-seo.md)

## Para que sirve

La auditoría del sitio revisa **páginas**: títulos, imágenes sin texto alternativo, enlaces rotos.
Hay cuatro cosas que **no son de ninguna página, son del dominio entero** y que hasta ahora nadie
revisaba:

1. **Si los rastreadores de IA pueden leer el sitio**, según lo que dice el `robots.txt`.
2. **Si el servidor o el CDN los rechaza** aunque el `robots.txt` los deje pasar.
3. **Si la portada publica datos estructurados** (el marcado que le dice a buscadores y motores de
   IA quién es la marca).
4. **Si existe y responde el mapa del sitio.**

Este runbook cubre la **operación** de esa capacidad: cómo se prende, cómo se verifica y cómo se
apaga. Para **leer** los hallazgos en la pantalla, el manual es
[Auditoría del sitio](usar-auditoria-sitio-seo.md).

### 🔴 Hoy está APAGADO, y eso importa

El flag `GROWTH_SEO_SITE_FINDINGS_ENABLED` está en **OFF en todos los ambientes**. Mientras siga
así, **el punto ciego sigue abierto**: un sitio que le cierra la puerta a `OAI-SearchBot`,
`PerplexityBot` o `ClaudeBot` sigue puntuando 95/100 en la auditoría y presentándose como sano.

El motor existe, está en `develop` y fue verificado contra red real el 2026-09-01 sobre 6 dominios.
**Pero el merge no cerró el agujero; lo cierra el flip.** Y el flip está bloqueado por `TASK-1671`
(ver más abajo por qué, que no es cautela genérica).

## Antes de empezar

| Requisito | Como se verifica |
|---|---|
| **`TASK-1671` desplegada** | Es la condición dura. Sin ella, prender el flag empeora el informe en vez de arreglarlo. Ver "Por qué no se prende antes" |
| `GROWTH_SEO_ENABLED=true` en el ops-worker | Es el flag padre. Con el módulo apagado no corre nada, tenga este flag el valor que tenga |
| Acceso a `services/ops-worker/deploy.sh` y permiso para desplegar el ops-worker | El flip toca el archivo **y** el servicio; no basta con uno |
| Un cliente con auditoría corriendo para verificar | El paso 3 usa Berel porque su `robots.txt` está verificado 1:1 contra los hallazgos |

**No hace falta** autorización de gasto: esta capacidad **no llama a DataForSEO**. Son 4-5 fetches
propios al sitio del cliente por corrida, con presupuesto de tiempo duro (15 segundos). El costo es
tiempo del worker, no saldo de proveedor.

## Por que no se prende antes de TASK-1671

Vale la pena entenderlo, porque suena a exceso de cuidado y no lo es.

La pantalla de auditoría mide cada grupo de hallazgos en **"N páginas afectadas"**, y **ordena la
lista por ese número**. Un `robots.txt` no pertenece a ninguna página: es del dominio. Renderizado
con la maquinaria actual, "los motores de IA no pueden leer el sitio" saldría rotulado **"1 página
afectada"** —que es falso— y se hundiría dentro de su propio nivel, debajo de 400 imágenes sin texto
alternativo.

Es decir: prenderlo antes **cambia un punto ciego por un dato mal contado**, que es peor, porque el
dato mal contado se ve como información. `TASK-1671` le da tratamiento propio en la pantalla y con
eso habilita el flip.

## El runtime es UNO solo: el ops-worker

Esto no es un flag multi-runtime como otros del ledger. **El único lector es el collect del site
audit**, que corre en el ops-worker (Cloud Run). **En Vercel el flag es inerte**: los hallazgos ya
escritos se sirven por el reader canónico, que no lo consulta.

⚠️ **El SoT declarativo es `services/ops-worker/deploy.sh`.** El deploy usa `--set-env-vars`, que es
**destructivo**: borra toda variable agregada por fuera. Prenderlo **sólo** con
`gcloud run services update --update-env-vars` funciona hasta el próximo deploy, y ahí desaparece
**en silencio** — es exactamente el modo de falla que dejó muerto el email de
`GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`. Hay que hacer **las dos cosas**.

## Paso a paso del flip

### 1. Confirmar que la superficie está desplegada

`TASK-1671` cerró el 2026-09-01: la sección "Acceso y presentación del sitio" **existe en código**.
Pero acá la pregunta no es si existe, es si **corre**: no "mergeada", desplegada y visible en
`/admin/growth/seo/audit`. Si los hallazgos de sitio todavía se renderizarían como "1 página
afectada", **para acá**.

Verificación rápida, en este orden:

1. `git show origin/main:src/views/greenhouse/admin/growth/seo/audit/SiteAuditSiteFindings.tsx` —
   si no existe, el código no está en producción y no hay nada que prender.
2. Abrir `/admin/growth/seo/audit` en el entorno donde vas a prender y confirmar que la sección
   aparece (o que aparecería con datos).

### 2. Prender el flag en los dos lugares

**a. El default declarativo**, en `services/ops-worker/deploy.sh`:

```bash
GROWTH_SEO_SITE_FINDINGS_ENABLED="${GROWTH_SEO_SITE_FINDINGS_ENABLED:-true}"
```

**b. La revisión activa**, para efecto inmediato sin esperar el deploy:

```bash
gcloud run services update ops-worker \
  --region=us-east4 \
  --update-env-vars GROWTH_SEO_SITE_FINDINGS_ENABLED=true
```

Hacer sólo (b) deja el flag vivo hasta el próximo deploy. Hacer sólo (a) no tiene efecto hasta que
alguien despliegue. **Van juntos.**

### 3. Correr el collect contra un cliente y contrastar con su `robots.txt` real

```bash
curl -X POST "$OPS_WORKER_URL/seo/audit/collect"
```

Después, abrir el `robots.txt` del cliente en el navegador y **comparar bot por bot** con lo que
salió. Si el `robots.txt` de Berel no bloquea a nadie, no puede aparecer un hallazgo de crawlers
bloqueados; si bloquea `GPTBot` y nada más, tiene que salir **un** hallazgo `notice` de
entrenamiento y **ningún** `critical`.

Este paso no es ceremonia: la verificación con red real encontró un falso positivo que ningún test
con datos simulados podía ver (un `robots.txt` que nos prohíbe la ruta del sitemap se reportaba como
sitemap roto).

### 4. Confirmar que la señal de corridas atascadas queda estable

En `/admin/operations`, mirar `seo.audit.stuck_tasks` durante **varios ciclos** del collect (corre
cada 30 minutos). Si empieza a acumular, los fetches al sitio del cliente están alargando la
transacción del collect y hay que revisar el presupuesto de tiempo antes de dejarlo prendido.

### 5. Actualizar el ledger

En [`FEATURE_FLAG_STATE_LEDGER.md`](../../operations/FEATURE_FLAG_STATE_LEDGER.md), mover la fila de
"§ Pendientes de acción" al snapshot con el estado real y la fecha. Un ledger que dice ON mientras
el runtime está OFF es peor que no tenerlo.

## Que significan los estados

### Los siete hallazgos

| Lo que aparece | Gravedad | Que significa |
|---|---|---|
| **Los motores de IA no pueden leer el sitio** | Crítico | El `robots.txt` le niega el paso a los rastreadores que **citan** páginas en las respuestas de ChatGPT, Perplexity y Claude (`OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Claude-SearchBot`, `ChatGPT-User`). Sin ese acceso el sitio no puede aparecer en esas respuestas |
| **El servidor rechaza a los rastreadores** | Crítico | El `robots.txt` está limpio, pero el servidor o el CDN responde 401/403/429 cuando quien pide la página es un rastreador identificado. **Se corrige en el CDN o el firewall, no en `robots.txt`** |
| **Entrenamiento de modelos de IA bloqueado** | Aviso (`notice`) | El sitio le niega el paso a los rastreadores que recolectan contenido para **entrenar** modelos (`GPTBot`, `Google-Extended`, `CCBot`, `anthropic-ai`, `Applebot-Extended`). **No es una falla.** Ver abajo |
| **Sin datos estructurados en la portada** | Atención | La portada no publica JSON-LD: buscadores y motores de IA no tienen dónde leer quién es la marca y a qué se dedica |
| **Sin mapa del sitio** | Aviso | No hay sitemap en la ruta habitual ni declarado en `robots.txt`. Los buscadores descubren páginas sólo siguiendo enlaces |
| **El mapa del sitio declarado no responde** | Atención | El `robots.txt` anuncia un sitemap que no se puede leer. Los buscadores lo buscan justo ahí y no encuentran nada |
| **Chequeo de sitio sin verificar** | Aviso | **No se pudo medir. Ni sano ni roto.** Ver abajo |

### Retrieval y entrenamiento son dos cosas distintas

Es la distinción que hay que tener clara antes de hablar con un cliente.

- **Retrieval** = los rastreadores que leen el sitio **para citarlo en una respuesta**. Bloquearlos
  es `critical` porque el efecto es directo: el sitio no puede aparecer.
- **Entrenamiento** = los rastreadores que recolectan contenido **para entrenar modelos**.
  Bloquearlos es una **decisión de derechos sobre el contenido**, legítima y frecuente — muchos
  medios lo hacen a propósito. Es `notice`, **nunca `critical`**, y el texto está redactado como
  postura registrada, no como defecto.

Un sitio puede tener el retrieval completamente abierto y sólo bloquear entrenamiento: eso es un
sitio **sano** con una postura declarada. Presentárselo al cliente en rojo lo entrena a ignorar la
severidad más alta del informe, y ahí se pierde el valor del `critical` de verdad.

### "Sin verificar" no es "está bien"

`site_check_unverified` significa que la revisión **quedó sin hacer** — no respondió el sitio, se
agotó el presupuesto de tiempo, el `robots.txt` no se pudo leer. Viene con la razón en el detalle.

Leerlo como "no encontró problemas" es exactamente el falso sano que esta capacidad existe para
cerrar. Si aparece, la respuesta correcta es "no lo pudimos medir", no "está correcto".

## Que NO hacer

- **No prender el flag antes de que `TASK-1671` esté desplegada.** La pantalla actual rotularía un
  hallazgo de dominio como **"1 página afectada"** —falso— y lo hundiría al fondo de su nivel. Se
  cambia un punto ciego por un dato mal contado.
- **No prenderlo sólo con `--update-env-vars`.** El `--set-env-vars` del próximo deploy lo borra en
  silencio. Tiene que quedar escrito en `deploy.sh` **además** de aplicado en vivo.
- **No prenderlo en Vercel.** Ahí es inerte. Declararlo da la falsa impresión de que quedó activo.
- **No leer `site_check_unverified` como "está bien".** Es un hueco declarado, no un veredicto.
- **No presentarle al cliente el bloqueo de entrenamiento como un defecto.** Es una decisión sobre
  el uso de su contenido. Se informa para dejarla registrada; no afecta que el sitio aparezca en las
  respuestas de IA.
- **No declarar el punto ciego cerrado por haber mergeado `TASK-1670`.** Lo cierra el flip
  verificado, no el merge. Mientras el flag esté OFF, la frase correcta en Handoff y changelog es
  `code complete, rollout pendiente`.
- **No borrar hallazgos ya escritos para "limpiar" después de un rollback.** La tabla es append-only
  por diseño: son la evidencia de lo que se midió y cuándo.
- **No decirle a un cliente que su sitio está "listo para la IA"** basándose sólo en estos cuatro
  chequeos. Miden acceso y descubribilidad, no calidad de contenido ni presencia real en respuestas
  — eso lo mide el AEO Grader, que es otra capacidad.

## Problemas comunes

| Sintoma | Causa probable | Que hacer |
|---|---|---|
| Corrí el collect y no aparece ningún hallazgo de sitio | El flag está OFF en el ops-worker | Verificar la **revisión activa**, no `deploy.sh`: `gcloud run services describe ops-worker --region=us-east4 --format='value(spec.template.spec.containers[0].env)'` |
| Lo prendí y a la semana dejó de aparecer | Se aplicó sólo con `--update-env-vars` y un deploy lo borró | Escribirlo en `deploy.sh` y volver a aplicarlo. Es el modo de falla más frecuente de este flag |
| No aparece nada aunque el flag esté ON | `GROWTH_SEO_ENABLED` está apagado | Es el flag padre; sin él no corre nada del módulo |
| Todos los chequeos salen "sin verificar" | El sitio no responde, o se agotó el presupuesto de 15 segundos | Abrir el sitio a mano. Si responde normal y desde el worker no, revisar si el borde del cliente bloquea a nuestro rastreador — eso **es** un hallazgo, no una falla nuestra |
| Sale "El servidor rechaza a los rastreadores" pero el sitio abre bien en el navegador | Es justamente el caso que este chequeo existe para encontrar | El CDN/WAF discrimina por user-agent. Se remedia en el CDN, no en `robots.txt`. Confirmarlo con el equipo de infraestructura del cliente |
| El cliente pregunta por qué su bloqueo de `GPTBot` aparece en el informe | Está registrado como postura, no como falla | Explicar la diferencia retrieval/entrenamiento. Si no quiere verlo, es una decisión de presentación del informe, no del diagnóstico |
| `seo.audit.stuck_tasks` empieza a acumular tras el flip | Los fetches al sitio del cliente alargan la transacción del collect | Apagar el flag (rollback abajo) y revisar el presupuesto de tiempo antes de reintentar |

## Rollback (menos de 10 minutos)

```bash
# 1. En services/ops-worker/deploy.sh
GROWTH_SEO_SITE_FINDINGS_ENABLED="${GROWTH_SEO_SITE_FINDINGS_ENABLED:-false}"

# 2. Efecto inmediato
gcloud run services update ops-worker \
  --region=us-east4 \
  --update-env-vars GROWTH_SEO_SITE_FINDINGS_ENABLED=false
```

Deja de escribir hallazgos de sitio de inmediato. **Los hallazgos ya escritos quedan**: la tabla es
append-only por diseño y borrarlos destruiría la evidencia de lo que se midió.

Y hay que decirlo con todas sus letras: **con el flag en `false` el punto ciego vuelve a estar
abierto.** Un sitio invisible para los motores de IA vuelve a puntuar 95/100.

## Referencias tecnicas

- Ficha del flag y su estado por ambiente:
  [`FEATURE_FLAG_STATE_LEDGER.md`](../../operations/FEATURE_FLAG_STATE_LEDGER.md) (§ Snapshot y
  § Pendientes de acción).
- Declaración del flag y su racional completo: `services/ops-worker/deploy.sh` (bloque TASK-1670).
- El juicio de los hallazgos (familias, severidades, chequeo de borde, degradación honesta):
  `src/lib/growth/seo/site-audit/site-findings.ts`.
- El sustrato que obtiene la evidencia (fetcher con guarda SSRF, parseo de `robots.txt` y HTML):
  `src/lib/growth/site-substrate/`.
- Fichas en español de los 7 hallazgos: `GH_GROWTH_SEO_AUDIT_ISSUES` en `src/lib/copy/growth.ts`.
- Spec de la capacidad y su verificación con red real:
  `docs/tasks/complete/TASK-1670-growth-site-probes-kernel-seo-audit.md`.
- La superficie que habilita el flip: `docs/tasks/to-do/TASK-1671-growth-seo-site-findings-audit-surface.md`.
- Runbook hermano del ciclo de auditoría (schedulers `ops-seo-audit-enqueue` / `ops-seo-audit-collect`,
  señal `seo.audit.stuck_tasks`): [Operar el site audit y los backlinks](operar-site-audit-backlinks-seo.md).
