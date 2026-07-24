# Efeonce Globe — Versiones livianas de media y entrega por tramos (Range)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-24 por Claude (TASK-1528)
> **Ultima actualizacion:** 2026-07-24 (TASK-1528)
> **Documentacion tecnica:** [EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md)

## Qué es y para qué sirve

Cuando Efeonce Globe genera una imagen, un video o un audio con IA, guarda el **archivo original completo**, que
puede ser pesado. Para que la galería y el visor sean rápidos, esta capacidad crea automáticamente **versiones
livianas** de cada pieza y las entrega **por tramos** en vez de mandar el archivo entero.

Es lo mismo que pasa cuando subes una foto a una red social: además del original, se genera una miniatura para
mostrarla rápido. Acá se generan seis tipos de versión liviana, y además un "mesero con control de porciones"
que entrega solo el pedazo del video que el reproductor pide en ese momento.

**El original nunca se toca ni se reemplaza.** Las versiones livianas viven aparte y siempre se puede volver al
original para descargar.

## Las seis versiones livianas (perfiles)

| Pieza | Versión liviana | Para qué |
|---|---|---|
| Imagen | Miniatura (512px, WebP) | La card de la galería |
| Imagen | Preview (1600px, WebP) | El visor |
| Video | Poster (fotograma del segundo 1) | La portada del video antes de reproducir |
| Video | Transcode (MP4 720p compatible) | Reproducir el video en el navegador sin descargar todo |
| Audio | Onda visual (peaks, JSON) | Dibujar la forma de onda |
| Audio | Preview (AAC) | Reproducir el audio en el navegador |

Cada perfil tiene sus valores **fijos y explícitos** (tamaño, códec, calidad). Si alguna vez se cambia un valor,
se crea una **versión nueva del perfil** y las versiones viejas quedan marcadas como reemplazadas — nunca se
sobrescribe un archivo existente.

> Detalle técnico: la identidad exacta de cada versión combina el hash del original + su generación en el
> almacenamiento + el perfil + su versión + la versión del transformador. Ver
> [EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md).

## Cómo funciona, en tres pasos

1. **Se piden las versiones.** Cuando una pieza está lista y es del workspace correcto, se encola la generación de
   sus versiones livianas. Pedir dos veces lo mismo no duplica nada.
2. **Un proceso separado las produce.** Un trabajador dedicado (aislado del resto de Globe) toma el original,
   corre la herramienta estándar de procesamiento de media (`ffmpeg`) con las recetas fijas, y guarda las versiones
   en su propio almacén. Si el original cambió mientras tanto, no produce una versión equivocada: falla de forma
   segura.
3. **Se entregan por tramos.** Para ver un video, el reproductor pide *"dame los segundos X a Y"* y el servidor
   entrega **solo ese pedazo**, sin cargar el archivo entero en memoria. Por eso el video empieza a reproducirse al
   instante.

## Seguridad: cada pedido se re-autoriza

Para mostrar un video o audio en el navegador, se usa un **ticket temporal** (dura 2 minutos) que está atado a tu
sesión, a la pieza exacta y a la versión exacta que pediste. Ese ticket:

- **no sirve para otra pieza ni para otro usuario**;
- **no reemplaza el permiso**: el servidor vuelve a verificar que eres el dueño en cada pedido;
- **vence solo**; si se filtra, no abre nada por sí mismo.

Si pides una versión que todavía no está lista, el sistema responde de forma honesta ("no disponible por ahora,
reintenta") en vez de un error confuso.

> Detalle técnico: el ticket es una firma (HMAC) atada a workspace + pieza + representación + disposición +
> identidad, con vencimiento corto. Nunca se guarda en logs.

## Qué NO hace todavía

- **No borra archivos.** La limpieza de versiones huérfanas (cuando ya no se necesitan) es otra capacidad
  separada (TASK-1529).
- **No está disponible para clientes externos.** Es interno mientras el producto se valida.
- **No usa CDN ni streaming adaptativo (HLS/DASH).** Eso queda para más adelante, con su propia decisión.

## Estado actual

**Activa en el runtime interno** (verificado el 2026-07-24 con imagen, video y audio reales). Los originales se
sirven igual que siempre; las versiones livianas y la entrega por tramos se pueden encender o apagar sin afectar
al original.

> Detalle técnico y evidencia del canary:
> [EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md).
> Cómo operarlo: [operar-media-derivatives-globe.md](../../manual-de-uso/creative-studio/operar-media-derivatives-globe.md).
