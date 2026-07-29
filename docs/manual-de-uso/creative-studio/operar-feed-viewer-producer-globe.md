# Operar el feed y el viewer del Producer sobre el payload cliente

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-07-25 por Claude (TASK-1559)
> **Ultima actualizacion:** 2026-07-29 por Claude (barra agrupada, estado «Listo», límites visibles)
> **Documentacion tecnica:** [ADR-014 — Globe Client Application Decision](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md) · [Gates de UI cliente](../../operations/creative-studio/GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md)

## Para qué sirve

Para dos cosas: **operar** el feed —encontrar una pieza, entender lo que dice de ella— y **diagnosticar**
cuando no muestra lo que debería.

## Estado hoy — 2026-07-29

**Desplegado y verificado en vivo.** `https://globe.efeoncepro.com/producer` sirve el payload cliente
(React) con composer, feed y viewer en la misma pantalla.

## Delta 2026-07-26 — `/producer` ya NO es el payload viejo

La versión 1.0 de este manual decía que `/producer` seguía sirviendo el Producer vanilla y que no iba a
cambiar todavía. **Eso dejó de ser cierto el 2026-07-26**, cuando se prendió
`GLOBE_CLIENT_PRODUCER_ENABLED` tras quedar verde el gate de paridad de capabilities. Lo que aplica hoy:

| Ruta | Qué sirve | Tiene composer |
|---|---|---|
| `/producer` | el workspace completo en payload cliente: cabecera + composer + feed + viewer | **sí** |
| `/producer/feed` | sólo el feed y el viewer; sigue existiendo como ruta acotada durante la transición | no |

El payload vanilla permanece como **fallback**: si el flag se apaga o el bundle no está en la imagen,
`/producer` vuelve a servirlo.

⚠️ **Dos flags, no uno.** `GLOBE_CLIENT_PRODUCER_ENABLED` es el que promueve `/producer`;
`GLOBE_CLIENT_APP_ENABLED` es el del payload cliente en general y está en `true` desde el cutover del
share board — apagarlo apagaría también el share board. Para revertir sólo el Producer, el flag correcto
es el primero.

⛔ **Las verificaciones post-deploy de la v1.0 que buscaban `<small>Producer</small>` en `/producer` ya no
aplican**: esa huella era del payload viejo, que en `/producer` hoy sólo aparece si el fallback se activó.

## Desplegar un cambio de estas superficies

Requiere autorización del operador: es un push a un repo de producto.

```bash
git -C ~/Documents/efeonce-globe push origin main
```

```bash
gh workflow run deploy-internal.yml -R efeoncepro/efeonce-globe -f service=globe-studio-internal -f target_sha=$(git -C ~/Documents/efeonce-globe rev-parse main)
```

### Verificación post-deploy (los cuatro puntos vigentes)

1. `GET /producer` con sesión interna → 200 y el documento referencia `/assets/app/`. Si en cambio trae
   `<small>Producer</small>`, la ruta cayó al **fallback vanilla**: revisa el flag y el bundle antes de
   seguir.
2. `GET /producer/feed` con la misma sesión → 200 (sigue existiendo como ruta acotada).
3. `GET /producer/feed` **sin** cookie de sesión → 401, nunca 200.
4. En el feed, las piezas de **imagen** guardadas muestran su archivo real (no un degradado de color).
   Un degradado en una imagen significa que los bytes no llegaron: mira el diagnóstico de abajo. En
   video y audio el degradado y la onda son lo esperado.

## Cómo leer y usar el feed

### La barra de herramientas está agrupada por tarea

No es una fila de controles sueltos: son tres grupos, y saber cuál es cuál te ahorra leer todas las
etiquetas.

| Grupo | Qué contiene | Para qué |
|---|---|---|
| **Cómo se ve la lista** | vista cómoda / compacta + **orden** (Recientes ↔ Antiguos) | presentar lo mismo de otra forma |
| **Acciones** | Serie, Compartir | operar sobre lo seleccionado |
| **Encontrar** | buscador + filtros (Todas · Favoritas · …) | reducir lo que veo |

- **El orden vive con la vista, no con los filtros.** Cambiar el orden no filtra nada.
- **El buscador está deshabilitado a propósito** y su razón está en el tooltip: hoy sólo podría filtrar
  la página ya cargada, y eso se vería idéntico a buscar en todo el corpus. Los filtros de al lado sí
  funcionan — el contraste entre ambos te dice cuál de los dos caminos está disponible.
- **Serie y Compartir están deshabilitadas** porque falta la pantalla que las consume, no el contrato.

### Una pieza terminada dice «Listo», en todos lados

La card destacada y las cards de la grilla usan **la misma palabra** para el mismo hecho. Antes una decía
«Listo» y la otra «Completada», y como el título de una pieza es su prompt, dos corridas del mismo prompt
se veían como dos piezas contradictorias a treinta centímetros de distancia.

La diferencia entre **una corrida que terminó** y **una pieza guardada** no se perdió: está donde importa,
en lo que puedes hacer. Sin archivo retenido, `Ver`, `Descargar` y `Usar como referencia` salen
deshabilitadas con su razón, y no hay miniatura.

Las otras palabras de estado siguen diciendo lo suyo: «Falló», «Cancelada», «Se pasó del tiempo» — ésas sí
aportan algo que «Listo» esconde, que es que la corrida **no entregó**.

## Lo que se ve raro y no es un error

| Lo que ves | Por qué | ¿Se va a arreglar? |
|---|---|---|
| Un **video** muestra un degradado de color, nunca un cuadro del video | el feed recibe los bytes de la salida, y un MP4 no se puede pintar como imagen; el póster derivado todavía no se proyecta | sí — `TASK-1569` |
| Un **audio** muestra una onda | así es como se ve una pieza de audio; no es un póster que falta | no, es el diseño |
| El **título** de una pieza termina en «…» aunque sobre ancho en la tarjeta | el recorte ocurre en el dato, a 96 caracteres, antes de que exista el diseño | ensanchar la tarjeta no lo cambia; el arreglo es del paquete de dominio |

⚠️ **No reportes estos tres como bugs de la pantalla.** Ninguno se resuelve tocando la vista, y el primero
ya tiene dueño.

## Diagnóstico

### El feed muestra degradados de color en vez de las piezas

El degradado es el **placeholder honesto**, no un error. Aparece en cuatro casos legítimos:

| Caso | Por qué |
|---|---|
| La pieza es un **video** o un **modelo 3D** | sus bytes no son una imagen; hasta `TASK-1569` no hay póster que mostrar |
| La pieza es una **corrida**, no un archivo | Una corrida activa o terminada no tiene bytes. Es lo que la corrida *es* |
| La pieza está **más allá de la posición 12** | Hay un tope de 12 thumbnails por vista: sin tope, un feed largo abriría una descarga por pieza |
| El retrieval de esa pieza **falló** | Una pieza que falla no degrada el feed: se queda con su degradado y la card sigue usable |

Si **ninguna pieza de imagen** guardada muestra su archivo, el problema es el retrieval gobernado
(`globe.producer.output.get`), no el feed. Abre una pieza en el viewer: te va a decir cuál de los cuatro
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

1. abre las herramientas de red del browser y mira las llamadas a `/v1/ui/dispatch`;
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

- **No apagues `client_app_enabled` para revertir el Producer.** Apaga también el share board del
  cliente. El flag acotado es `GLOBE_CLIENT_PRODUCER_ENABLED`.
- **No decidas si una pieza tiene miniatura por su modalidad.** La decisión se toma por los **bytes**
  (`mimeType` de la salida). Una lista de excepciones por modalidad ya falló dos veces: se escribió
  «todo menos audio», volvió con video, y habría vuelto una tercera con un modelo 3D.
- **No agregues un `<img src="...">` a estas superficies.** La CSP del shell es `img-src 'self' blob:`
  para que el único origen posible de una imagen sea un object URL que pasó por el path autorizado.
- **No pidas bytes desde una card.** La resolución vive en la ruta, que es quien puede contar cuántas
  descargas hay abiertas y revocar los object URLs. Una card que pide filtra memoria al scrollear.
- **No colapses los cuatro códigos de error en «no se pudo cargar».** Mandan a acciones distintas.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `/producer/feed` da 404 con sesión válida | el bundle cliente no está en la imagen desplegada | redeployar; la ruta da 404 en vez de caer al vanilla a propósito |
| `/producer` se ve como el Producer viejo | el fallback vanilla se activó: flag apagado o bundle ausente | revisar `GLOBE_CLIENT_PRODUCER_ENABLED` y el bundle en la revisión activa |
| La barra del feed parece haber perdido el botón de orden | se movió al grupo de vista, junto a cómoda/compacta | está ahí, con su rótulo (`Recientes` / `Antiguos`) |
| La pestaña se pone lenta después de abrir muchas piezas | un object URL sin revocar | es un bug: `governed-media.ts` debe revocar; sus tests miden `liveCount()` |
| El canary de concurrencia dice que todo pasa pero `/__log` está vacío | el browser no está ejecutando JS (bundle 404) | revisa los 404 antes de creerle |

## Referencias técnicas

- Transporte y epoch: `apps/studio-client/src/data/governed-transport.ts`
- Reconciliación por marca: `apps/studio-client/src/data/producer-feed-reconciler.ts`
- Ciclo de vida de los bytes: `apps/studio-client/src/data/governed-media.ts`
- Criterio de retiro del payload viejo: `apps/studio-client/src/data/legacy-parity.ts`
- Gates y canaries: [`GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md`](../../operations/creative-studio/GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md)
