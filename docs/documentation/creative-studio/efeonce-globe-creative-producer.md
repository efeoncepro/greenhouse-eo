# Efeonce Globe Creative Producer

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.2
> **Creado:** 2026-07-23 por Claude
> **Ultima actualizacion:** 2026-08-03 por Claude (delta: contrato creativo por ruta; conteo real de rutas)
> **Documentacion tecnica:** [Creative Producer V1](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md) · [ADR-014 — Client Application](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md)

Creative Producer es la consola prompt-first de Globe para crear y continuar activos de imagen, video y audio.
El diseño aprobado es el producto completo: composer multimodal, referencias privadas, estimación pre-spend,
biblioteca editorial, viewer/refinamiento, organización, revisión y sharing. Las capacidades no se eliminan cuando
un backend está apagado; la UI muestra su estado real y el dueño que debe habilitarlo.

## Qué puede hacer

- Componer por modalidad con prompt, presets, referencias, ruta/modelo público y shape válido.
- Estimar créditos antes de reservar o gastar; el operador fija un hard cap explícito.
- Bloquear o regenerar una seed reproducible y declarar restricciones negativas; ambos cambios invalidan el
  estimate anterior para evitar generar con una cotización desactualizada.
- Ejecutar runs durables y ver sus estados/attempts reales, sin porcentajes derivados de timers del browser.
- Recuperar image/video/audio por grants efímeros y validar integridad content-addressed.
- Explorar feed, lineage, series, collections, selección y operaciones batch.
- Recreate, variation, upscale e inpaint mediante commands gobernados con parentage y rights heredados.
- Revisar, comentar, aprobar/pedir cambios y compartir una proyección read-only revocable.

## Cómo se protege

El browser llama un BFF same-origin. El BFF deriva persona, workspace y surface, y llama la API IAM-private con
workload identity; nunca entrega una service credential al browser. Providers, secretos, almacenamiento, ledger,
tenancy, rights y review permanecen server-side.

Cada output generado se ingiere por stream, se registra content-addressed y entra en cuarentena. Un worker separado
ejecuta malware, C2PA y rights en orden. C2PA sólo se muestra como verificado ante un resultado explícito `Trusted`;
la presencia de un manifest no basta. Las políticas de derechos son exactas por ruta/proveedor/modelo/versión y los
derivados heredan restricciones de sus padres.

Los modos que necesitan referencias o provenance no se habilitan por apariencia: el Producer consulta la
autoridad del workspace y los mantiene cerrados si la capability está apagada, denegada o degradada.

## Qué puede pedirle cada ruta: su contrato creativo

Desde `TASK-1633`, cada ruta publica una **ficha versionada** que declara qué operación hace, qué
archivos acepta y en qué rol (una imagen puede ser el producto, el estilo, el primer cuadro o la
fuente del movimiento — y son cosas distintas), qué controles creativos honra y por qué mecanismo, y
qué produce. El servidor la valida **antes** de cotizar y de reservar crédito: pedir un control que
esa ruta no honra ahora falla con la razón nombrada, en vez de cobrarse y entregar una pieza donde
nunca se aplicó.

Eso reemplaza —en el contrato, todavía no en la pantalla— la fila de botones por modelo del composer.
La ficha ya se publica para las 17 rutas; la migración de la UI es `TASK-1552` y aún no ocurrió, así
que los modos **Crear · Editar · Movimiento · Elementos · Escalar · Cuadros** siguen visibles.

> Detalle técnico: [el contrato creativo de cada ruta](./efeonce-globe-contrato-creativo-ruta.md)
> (funcional, con los cinco ejes y el estado real) ·
> [ADR-022](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md).

## Cómo se lee la pantalla

La consola tiene tres zonas, y cada una responde una pregunta distinta.

| Zona | Dónde está | Qué responde |
|---|---|---|
| Píldora de créditos y su panel | cabecera, arriba a la derecha | ¿cuánto saldo me queda y en qué se está yendo? |
| Composer | columna izquierda | ¿qué quiero crear, con qué, en qué forma y cuánto cuesta? |
| Feed | columna derecha | ¿qué se generó, cómo lo encuentro y qué hago con eso? |

### El panel de créditos: tres slots, tres preguntas

El panel se abre haciendo clic en la píldora de la cabecera. Cada slot muestra algo que los otros no
repiten:

| Slot | Qué muestra | Ejemplo |
|---|---|---|
| El anillo | la **proporción** disponible, en porcentaje | `99 %` |
| El encabezado | la **cifra exacta**, con separadores de miles | `500.444 de 500.610 disponibles` |
| Las tres celdas | la **composición**: Disponible, Reservado, Gastado | `500.444` · `0` · `166` |

Dos reglas de lectura que conviene conocer:

- **El porcentaje redondea hacia abajo.** Con 166 créditos gastados dice `99 %`, no `100 %`. Sólo dice
  `100 %` cuando de verdad no se gastó nada.
- **Los puntos de color de las tres celdas son la leyenda de la barra** que está encima: cada punto
  corresponde a un segmento.

Si el saldo es muy grande, las celdas lo abrevian (`1,3 M`) para no romper la columna, pero **el valor
exacto nunca se pierde**: sigue en el encabezado, en el tooltip y en lo que lee un lector de pantalla.

> Detalle técnico: lectores `globe.credits.balance.get` / `.usage.get` / `.forecast.get`, cada uno
> detrás de su propia capability; formato de cifras en `apps/studio-client/src/format/credits.ts`.
> Cómo se le agrega presupuesto al mes: [fondeo gobernado de créditos](./fondeo-gobernado-creditos-globe.md).

### El composer: el orden de lectura del costo

El bloque de costo, anclado al pie de la columna, se lee en este orden: **cuánto cuesta › qué hacer ›
en qué estado está el estimado**. El color naranja queda reservado para lo que pide atención — una
cifra real de gasto, un estimado que quedó desactualizado o un presupuesto bloqueado. Un estado sano
(«Vigente») y la frase que tranquiliza («Se calcula antes de gastar») se muestran en gris, porque no
hay nada que atender.

Cuando el contenido de la columna no cabe, **se desvanece** contra el bloque de costo en lugar de
cortarse a media letra: ese degradado significa «hay más abajo».

> Detalle técnico: valores exactos de la superficie en
> [`GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md`](../../ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md).

### El feed: tres grupos, una palabra por estado

La barra de herramientas del feed está agrupada por tarea, no por tipo de control:

| Grupo | Contiene | Para qué |
|---|---|---|
| Cómo se ve la lista | vista cómoda/compacta + orden | presentar |
| Acciones | Serie, Compartir | operar sobre la selección |
| Encontrar | buscador + filtros | reducir lo que veo |

Una pieza terminada dice **«Listo»** en todas partes — en la card destacada y en la grilla. Antes la
misma pieza podía decir «Listo» en un lugar y «Completada» en el otro; eran dos formas de nombrar el
mismo hecho, y leerlas juntas parecía una inconsistencia. La diferencia entre «una corrida que
terminó» y «una pieza guardada» sigue estando donde importa: sin archivo retenido, las acciones (`Ver`,
`Descargar`, `Usar como referencia`) salen deshabilitadas con su razón.

> Detalle técnico: la línea de estado renderiza el eje `coarseProgress` del contrato, no el eje
> `state` de la corrida. Ver
> [`operar-feed-viewer-producer-globe.md`](../../manual-de-uso/creative-studio/operar-feed-viewer-producer-globe.md).

## Lo que la pantalla todavía no hace

Tres límites visibles, para que no se confundan con fallas:

| Se ve así | Por qué | Dueño |
|---|---|---|
| Las miniaturas de **video** son un degradado de color, no un cuadro del video | el feed recibe los bytes de la salida, y un MP4 no se puede mostrar como imagen; el póster derivado todavía no se proyecta | `TASK-1569` |
| Los **títulos** de las piezas se cortan con «…» aunque sobre ancho | el recorte ocurre en el dato, a 96 caracteres, antes de que exista diseño: ensanchar la tarjeta no lo cambia | paquete de dominio |
| El **audio** muestra una onda y no una miniatura | no es un reemplazo de póster faltante: así es como se ve una pieza de audio | — |

> Detalle técnico: la decisión de si hay póster se toma por los **bytes** (`mimeType` de la salida) y
> no por la modalidad de la card, para que una modalidad nueva no vuelva a quedar fuera.

## Estado vigente

El Producer está **operativo internal-only** para personas autorizadas. Desde la UI se generaron y recuperaron
Image, Video y Audio reales; el feed hidrató nueve outputs y el viewer sirvió los tres medios. El catálogo expone
hoy 17 rutas —cada una con su contrato creativo—, pero sólo una parte tiene promoción durable, binding, circuito
y canario: que una ruta aparezca en catálogo no significa que esté habilitada. El estado real por ruta/modelo, con
su evidencia, vive en el
[ledger de la flota](../../operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md); la verdad live de
disponibilidad para quien consume es la propia flota del Producer.

Los originales se alojan en GCS privado por hash; el bucket no autoriza acceso. Globe valida workspace, ownership,
estado e integridad antes de servirlos mediante un grant corto same-origin. Una sesión válida con CSRF rotado se
recupera automáticamente; una sesión realmente expirada todavía necesita un CTA de reautenticación más claro.

Continúan abiertos la limpieza semántica de reconciliaciones obsoletas que inflan la edad de cola, la promoción
independiente de las otras siete rutas y la arquitectura de derivados/streaming para previews grandes. Clientes
externos y Production siguen bloqueados por los gates comerciales; internal-only no equivale a GA.

Arquitectura: [Creative Producer V1](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md).
Manual: [usar Creative Producer](../../manual-de-uso/creative-studio/usar-creative-producer-globe.md).
