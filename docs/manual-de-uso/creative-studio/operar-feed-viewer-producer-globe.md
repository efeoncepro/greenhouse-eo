# Operar el feed y el viewer del Producer sobre el payload cliente

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-07-25 por Claude (TASK-1559)
> **Ultima actualizacion:** 2026-07-25 por Claude
> **Documentacion tecnica:** [ADR-014 — Globe Client Application Decision](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md) · [Gates de UI cliente](../../operations/creative-studio/GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md)

## Para qué sirve

Para tres cosas: **encender** el feed nuevo (el paso que falta hoy), **entender por qué convive** con el
Producer viejo en vez de reemplazarlo, y **diagnosticar** cuando el feed no muestra lo que debería.

## Estado hoy — 2026-07-25

`code complete, rollout pendiente`. El código está en `main` **local** de `efeonce-globe` y verificado en
un browser real, pero **no está desplegado**: el workflow de deploy exige que el SHA esté en
`refs/heads/main` del remoto.

## Lo primero que hay que entender: son DOS rutas, no una migración

| Ruta | Qué sirve | Tiene composer |
|---|---|---|
| `/producer` | el Producer completo, payload viejo (TypeScript vanilla) | **sí** |
| `/producer/feed` | el feed + el viewer, payload cliente nuevo (React tipado) | no |

**`/producer` no cambió y no va a cambiar todavía.** El payload nuevo no tiene composer, así que servirlo
en `/producer` dejaría a un operador sin la superficie que gasta creditos — una regresión de capacidad
disfrazada de migración. La ruta nueva crece al lado y `/producer` se cambia de una sola vez cuando el
composer alcance paridad (`TASK-1560`).

⚠️ **El flag `client_app_enabled` NO separa estas dos rutas.** Está en `true` desde el cutover del share
board, así que apagarlo apagaría el share board del cliente y no sólo el feed. Si hace falta revertir, el
camino es revertir el commit de la ruta y redeployar; la ruta es **aditiva**, así que revertirla no toca
`/producer` ni ninguna otra superficie.

## Encender el feed nuevo

Requiere autorización del operador: es un push a un repo de producto.

```bash
git -C ~/Documents/efeonce-globe push origin main
```

```bash
gh workflow run deploy-internal.yml -R efeoncepro/efeonce-globe -f service=globe-studio-internal -f target_sha=$(git -C ~/Documents/efeonce-globe rev-parse main)
```

### Verificación post-deploy (los cinco puntos)

1. `GET /producer/feed` con sesión interna → 200 y el documento referencia `/assets/app/`.
2. El mismo documento **no** contiene `<small>Producer</small>` — ese rótulo es la huella del payload
   viejo, y si aparece la ruta está sirviendo la generación equivocada.
3. `GET /producer` con la misma sesión → sigue trayendo `<small>Producer</small>`. Esta es la
   verificación que protege al operador.
4. `GET /producer/feed` **sin** cookie de sesión → 401, nunca 200.
5. En el feed, las piezas guardadas muestran su imagen real (no un degradado de color). Un degradado
   significa que los bytes no llegaron: mirá el punto siguiente.

## Diagnóstico

### El feed muestra degradados de color en vez de las piezas

El degradado es el **placeholder honesto**, no un error. Aparece en tres casos legítimos:

| Caso | Por qué |
|---|---|
| La pieza es una **corrida**, no un archivo | Una corrida activa o terminada no tiene bytes. Es lo que la corrida *es* |
| La pieza está **más allá de la posición 12** | Hay un tope de 12 thumbnails por vista: sin tope, un feed largo abriría una descarga por pieza |
| El retrieval de esa pieza **falló** | Una pieza que falla no degrada el feed: se queda con su degradado y la card sigue usable |

Si **ninguna** pieza guardada muestra imagen, el problema es el retrieval gobernado
(`globe.producer.output.get`), no el feed. Abrí una pieza en el viewer: te va a decir cuál de los cuatro
casos es.

### El viewer dice algo distinto según el caso, y eso es a propósito

| Lo que dice | Qué pasó | ¿Sirve reintentar? |
|---|---|---|
| «Tu sesión expiró» | la sesión murió y el refresh no la recuperó | no — hay que entrar de nuevo |
| «No tienes acceso a esta pieza» | la pieza existe pero no es tuya | no — pedir acceso |
| «La pieza ya no está disponible» | se eliminó o se movió a la papelera | no |
| «El almacenamiento no responde» | falla temporal de la dependencia | **sí**, y el botón aparece |
| «Esta corrida no publicó una salida retenida» | no hay archivo que abrir | no es un error |
| «Esta pieza está en la papelera» | hay que restaurarla desde la biblioteca | no |

**El botón «Reintentar» aparece sólo donde reintentar puede funcionar.** Si no lo ves, no es que falte:
es que apretarlo no cambiaría nada.

### El feed no se actualiza

El feed reanuda cada 4 segundos. Si dejó de traer novedades:

1. abrí las herramientas de red del browser y mirá las llamadas a `/v1/ui/dispatch`;
2. la **primera** debe ser `globe.producer.feed.live.list` sin cursor, y las **siguientes**
   `globe.producer.feed.live.changes` **con** cursor;
3. si ves `list` repetido, la marca no se está reanudando y el feed está pidiendo todo cada vez;
4. si ves `changes` **sin** cursor, hay un bug en la reanudación — no lo arregles en la vista: el
   reconciliador es `apps/studio-client/src/data/producer-feed-reconciler.ts` y tiene tests.

Para reproducirlo sin runtime, el canary de concurrencia lo hace observable:

```bash
node apps/studio-client/scripts/producer-concurrency-canary.mjs
```

## Qué NO hacer

- **No apagues `client_app_enabled` para revertir el feed.** Apaga también el share board del cliente.
- **No sirvas el payload cliente en `/producer`** hasta que el composer tenga paridad. La verificación
  del punto 3 existe justamente para atrapar eso.
- **No agregues un `<img src="...">` a estas superficies.** La CSP del shell es `img-src 'self' blob:`
  para que el único origen posible de una imagen sea un object URL que pasó por el path autorizado.
- **No pidas bytes desde una card.** La resolución vive en la ruta, que es quien puede contar cuántas
  descargas hay abiertas y revocar los object URLs. Una card que pide filtra memoria al scrollear.
- **No colapses los cuatro códigos de error en «no se pudo cargar».** Mandan a acciones distintas.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `/producer/feed` da 404 con sesión válida | el bundle cliente no está en la imagen desplegada | redeployar; la ruta da 404 en vez de caer al vanilla a propósito |
| La pestaña se pone lenta después de abrir muchas piezas | un object URL sin revocar | es un bug: `governed-media.ts` debe revocar; sus tests miden `liveCount()` |
| El canary de concurrencia dice que todo pasa pero `/__log` está vacío | el browser no está ejecutando JS (bundle 404) | revisá los 404 antes de creerle |

## Referencias técnicas

- Transporte y epoch: `apps/studio-client/src/data/governed-transport.ts`
- Reconciliación por marca: `apps/studio-client/src/data/producer-feed-reconciler.ts`
- Ciclo de vida de los bytes: `apps/studio-client/src/data/governed-media.ts`
- Criterio de retiro del payload viejo: `apps/studio-client/src/data/legacy-parity.ts`
- Gates y canaries: [`GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md`](../../operations/creative-studio/GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md)
