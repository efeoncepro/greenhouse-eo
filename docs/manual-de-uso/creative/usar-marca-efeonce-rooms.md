# Usar la marca de Efeonce Rooms — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-08 por Claude
> **Ultima actualizacion:** 2026-10-08 por Claude
> **Modulo:** Creative · marca de producto de Efeonce (familia de La órbita)
> **Ruta en portal:** no aplica — Rooms aún no tiene runtime; los archivos viven en `@efeoncepro/axis-brand-assets`
> **Documentacion relacionada:** [ADR de la marca de Rooms](../../architecture/rooms/EFEONCE_ROOMS_MARK_DECISION_V1.md) · [Dossier Rooms](../../architecture/rooms/README.md) · [Usar la línea gráfica de Efeonce](usar-linea-grafica-efeonce.md) · [Manual técnico de La órbita](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md)

## Para qué sirve

Este manual explica qué pieza de la marca de **Efeonce Rooms** usar en cada lugar, en qué variante de color, qué no
hacer y cómo regenerar los archivos. La marca («eslabón leve») quedó aceptada el 2026-10-08: en «Rooms» las dos «o» son
dos órbitas enlazadas como eslabones (quien propone y quien decide, en la misma sala) y una sola esfera, en el acento
Growth, va a la 1:30 de la segunda órbita, como en toda la familia (Factory, Marketing Studio, Creative Studio).

No aprueba composiciones de la sala ni aplicaciones de marca: esas siguen sujetas a los contratos de UI de Rooms y al go
de [EPIC-052](../../epics/to-do/EPIC-052-efeonce-rooms-sales-enablement-platform.md).

## Antes de empezar

- **Toma los archivos del paquete**, nunca de una captura ni del canvas: `@efeoncepro/axis-brand-assets` **0.4.27**,
  archivos `rooms-<pieza>-<variante>.svg`. Publicado en el release `v0.4.27` (2026-10-08); fíjalo exacto (ver el
  [runbook de consumo de AXIS](../../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md)).
- **En el Lab:** hasta 0.4.28 Rooms, como Creative Studio, vivía sólo en el paquete (`AXIS_LOGO_EXCLUSIONS`). Desde
  0.4.29 (tag `v0.4.29`, índice de búsqueda fragmentado) sus 18 piezas están en la página «Logotipos»
  (`/references/logos/`) y en la búsqueda global.
- **Ten a mano las reglas de la familia** (área de resguardo, tamaños mínimos, logo frente a isotipo) en el
  [manual técnico de La órbita](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) y en
  [Usar la línea gráfica de Efeonce](usar-linea-grafica-efeonce.md). Este manual no fija medidas propias de Rooms.

## Paso a paso

### Paso 1 · Elige la pieza

| Pieza | Archivo | Dónde va |
| --- | --- | --- |
| Lockup **Efeonce \| Rooms** | `rooms-lockup` | **Por defecto**: encabezado de la sala, invitaciones, enlace compartido, decks |
| Compacto **efeonce Rooms** (sin filete) | `rooms-compact` | Chips y espacios muy angostos |
| Apilado (Efeonce arriba, Rooms debajo) | `rooms-stacked-lockup` | Portadas, modo presentación y formatos cuadrados |
| Símbolo: las dos órbitas enlazadas, sin letra | `rooms-isotype` | Favicon, avatar de la sala, ícono de app; **nunca junto al nombre** |
| Ícono: la nave de Efeonce sobre «Rooms» liso | `rooms-icon` | Sólo lo que circula suelto (una sola esfera: la de la nave) |
| La palabra sola | `rooms-logo` | Insumo de las anteriores y piezas de lanzamiento; no la uses como firma en publicidad |

Si dudas, usa el lockup. Junto a Efeonce, «Rooms» va en el gris medido de la familia y sólo la esfera conserva el
acento.

### Paso 2 · Elige la variante según el fondo

| Variante | Úsala sobre | Qué cambia |
| --- | --- | --- |
| `positive` | Papel / fondos claros | Tinta navy; esfera Growth `#0e8c82` |
| `negative` | Navy / fondos oscuros | Tinta blanca; esfera Growth `#36c8bf` |
| `white` | Foto o color donde la versión a color no funciona | Todo en blanco, esfera incluida |

### Paso 3 · Colócala en el marco, nunca sobre el arte del cliente

En la sala, la marca de Rooms vive en el marco de producto (encabezado, favicon, avatar). Las piezas del cliente
conservan su marca: **nunca** pongas la marca de Rooms ni una órbita encima de su arte.

### Paso 4 · En publicidad y comunicación, firma siempre Efeonce | Rooms

«Room/rooms» es casi genérico en la categoría de salas de venta; por eso la firma pública es siempre **Efeonce | Rooms**
(el lockup), nunca «Rooms» suelto.

## Qué significan las piezas y variantes

- **Las dos órbitas enlazadas** son la sala: quien propone y quien decide. El cruce es corto y la almendra del centro,
  angosta y vacía; la palabra se sigue leyendo «oo».
- **La única esfera, a la 1:30 de la segunda órbita**, es la misma posición de toda la familia. El acento Growth dice que
  Rooms sirve a varias líneas (propuestas creativas y SEO/AEO), como Factory.
- **El símbolo solo** es poco distintivo (dos aros enlazados es un gesto común) y puede leerse como argollas con piedra,
  el ícono de «enlace» 🔗 o ⚣ a tamaños chicos. Hasta que la prueba sin contexto confirme lo contrario, úsalo donde el
  contexto ya dice «Efeonce Rooms» (favicon, avatar dentro de la sala).

## Qué no hacer

- **Nunca** «Rooms» suelto en publicidad: firma con el lockup Efeonce | Rooms.
- **Nunca** la marca de Rooms sobre el arte del cliente.
- **Nunca** el símbolo junto al nombre (es uno u otro).
- **Nunca** mover la esfera a un cruce de las órbitas: una esfera en la punta de la almendra se lee como una figura
  anatómica. La regla vale para toda la línea.
- **Nunca** una R dentro de una órbita como símbolo: se lee como ®.
- **Nunca** separar las órbitas hasta que sólo se toquen: se leen como anteojos o ∞.
- **Nunca** editar los SVG a mano, recolorearlos ni rehacer el logo con texto.
- **Nunca** animar el logo por tu cuenta: la apertura (las órbitas se enlazan y la esfera se posa a la 1:30; con
  movimiento reducido, sólo el cuadro final) se exploró en el canvas y **no está aprobada**.

## Regenerar los archivos

Sólo cuando cambia la marca o la geometría de la familia, y con la decisión registrada en el ADR:

1. En greenhouse-eo, corre el generador con un directorio de salida:
   `node scripts/brand/build-rooms-logos.mjs <directorio-de-salida>` (18 SVG: 6 piezas × 3 variantes).
2. Copia los SVG a `packages/brand-assets/assets/` y a `apps/lab/public/branding/` del repo AXIS.
3. En AXIS, corre `pnpm seal` y publica por el flujo de release de AXIS.

El generador quita los espacios al final de línea que trae el logo de Efeonce; si `git diff --check` de AXIS marca
alguno, los archivos no salieron del generador.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| No encuentro Rooms en el Lab | El Lab todavía no tiene 0.4.29 (hasta 0.4.28 Rooms estaba excluido) | Búscalo en «Logotipos» (`/references/logos/`) o tómalo del paquete `@efeoncepro/axis-brand-assets` |
| `0.4.27` no se instala | No es el tag: `v0.4.27` está publicado (2026-10-08); suele ser el acceso al registro o el pin | Revisa el runbook de consumo de AXIS y fija la versión exacta |
| El SVG se ve distinto en un visor | Archivo editado a mano o exportado desde otra herramienta | Vuelve a tomar el archivo del paquete; los cortes son contornos, no máscaras |
| `git diff --check` falla en AXIS | Espacios al final de línea | Regenera con el generador en vez de copiar a mano |
| Alguien lee el símbolo como 🔗, ⚣ o argollas | Lectura conocida del símbolo solo | Muéstralo junto a la palabra (lockup); nunca muevas la esfera para corregirlo |

## Referencias técnicas

- Decisión, alternativas descartadas y revisión de parecido: [ADR de la marca de Rooms](../../architecture/rooms/EFEONCE_ROOMS_MARK_DECISION_V1.md).
- Generador: [`scripts/brand/build-rooms-logos.mjs`](../../../scripts/brand/build-rooms-logos.mjs).
- Paquete y Lab: [AXIS: packages y Lab](../../documentation/creative/axis-packages-y-lab.md).
- Sistema de la familia: [ADR «La órbita»](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md) ·
  [manual técnico](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md).
- Uso en la sala: [dirección visual de Rooms](../../ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md) ·
  [motion de Rooms](../../ui/motion/rooms-v1.md).
