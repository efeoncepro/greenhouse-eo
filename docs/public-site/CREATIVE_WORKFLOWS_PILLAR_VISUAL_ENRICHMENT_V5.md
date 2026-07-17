# Creative Workflows Pillar: visual enrichment V5

> **Estado:** publicado y verificado.
> **Fecha:** 2026-07-15.
> **Post:** `251363` — `https://efeoncepro.com/creative/creative-workflows/`.
> **Spec:** [Gutenberg V5](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V5.json).

## 1. Problema editorial

La V4 tenía tres imágenes de cuerpo, pero todas aparecían antes de la palabra `1961`. Aproximadamente el `57%`
final de una Pillar de más de 4.500 palabras quedaba sin apoyo visual. La intervención debía agregar comprensión,
no llenar espacios ni repetir encabezados.

Se eligieron tres trabajos:

1. explicar la frontera sistema → IA → persona;
2. explicar la progresión managed → co-operated → client-operated;
3. convertir métricas emparejadas en una comparación escaneable y accesible.

El video quedó fuera de scope: no existía todavía una demostración o transición que justificara poster,
captions, transcript, hosting y carga diferida.

## 2. Solución integrada

| Pieza | Placement | Runtime |
|---|---|---|
| `CW-V05` Frontera de decisión | después de las reglas de delegación/escalamiento | `core/image`, media V3 `251393`, caption y enlace a WebP completo |
| `CW-V06` Grados de autonomía | después de “Se gana con evidencia” | `core/image`, media V3 `251392`, caption y enlace a WebP completo |
| `CW-T01` Scorecard | después de la lista de métricas emparejadas | `core/table`, tres columnas, cuatro filas y caption |
| Captions V4 | bajo `251366–251368` | `figcaption.wp-element-caption` nativo |

Los diagramas usan la paleta, papel y señal lima de `La señal seleccionada`, pero sus labels se compusieron con
Poppins/Geist locales. La fuente vive en `ai-generations/2026-07-15_creative-workflows-pillar/sources/` y el
renderer Playwright produce masters `1440×960`. No se delegaron labels, cifras ni claims a generación de imagen.

## 3. Iteración, error detectado y corrección V3

Los masters V1 pasaron la revisión aislada y se cargaron como `251386–251387`. El primer QA live reveló que el
widget flotante Next Post de Ohio cubre la esquina inferior derecha en desktop. La V2 movió el contenido fuera
de esa zona y se cargó como `251389–251390`, pero esa corrección recibió un `PASS` incorrecto: resolvió el
chrome del tema y dejó defectos dentro del propio raster.

La relectura humana detectó dos fallos:

- `CW-V05`: la línea lima atravesaba copy y listas, la tarjeta central invadía el cierre y el signo `¿`
  colisionaba visualmente con la `Q`;
- `CW-V06`: la diagonal ocultaba el ordinal `01`, cruzaba las tarjetas y el label vertical “evidencia
  acumulada” quedaba recortado.

La V3 (`251393` y `251392`) separa las progresiones del contenido, conserva todos los ordinales y labels,
alinea las tarjetas y mantiene únicamente espacio prescindible bajo el widget Ohio. Los attachments V1/V2
quedan `superseded`, no borrados. La V5 publicada sólo referencia V3.

En mobile, el raster horizontal funciona como síntesis y el enlace a media permite ampliar. ALT y caption
comunican la relación sin depender de labels pequeños. La tabla nativa cabe a `358px` de contenido, conserva
headers/filas y no produce overflow de página.

## 4. WordPress y rollback

- Preflight: `pnpm public-website:ssh-check` → `status=ok`, Kinsta SSH/WP-CLI verificado.
- Snapshot remoto pre-V5: `/tmp/greenhouse-creative-workflows-251363-before-v5-20260715-200344.json`.
- Snapshot SHA-256: `d0a23ce1e5bc0e873f0dbc8b50f7c84f97c9dec87cc79eac456aa6b0dbd065f7`.
- Content V4 SHA-256: `860ed827de9012e803a70598e7b35fc50904c8808dfed73083982e06688a0af9`.
- Content V5 authored SHA-256: `19e1d8177b0227eb6c442b84bc64db13a3c217302c0a0d31b5747bf892ed0cf2`.
- Content V5 runtime SHA-256: `fbcd3f8d466803b73c5e22345d3b00afac28ce356e7a1a3eff50cb2898a1ae23`.
- Estado preservado: `publish`, slug `creative-workflows`, autor `1`, categoría `193`, cero tags, featured `251370`.
- SEO preservado: title/metadescription Yoast, canonical, `index, follow` y Open Graph JPEG.
- Cache: `kinsta cache purge --all` exitoso después del write final.

Corrección V3:

- Snapshot remoto pre-write: `/tmp/greenhouse-creative-workflows-251363-before-autonomy-v3-20260715-204423.json`.
- Snapshot SHA-256: `813ea681c9a15b8d4a6d5f48b3385c46440b66932df470f05f0eb7fcfc5b76cd`.
- Content previo runtime SHA-256: `fbcd3f8d466803b73c5e22345d3b00afac28ce356e7a1a3eff50cb2898a1ae23`.
- Content V3 authored SHA-256: `dae35ff725f9408845714c0c4d52402437c7343edf3dce36851d3c4ef5ebd2e4`.
- Content V3 runtime SHA-256: `98299f2948f6671b89ebc50e03b846ba6f150be74c6cb61d37a7bee8847f67a3`.
- Post modificado en WordPress: `2026-07-15 20:49:32 GMT`; estado, slug, autor, categoría, tags, featured y
  metadata SEO preservados por readback.
- WebP decisión V3: media `251393`, SHA-256 `1db4a810dbdba75229086974531d5d9dc965116fd3e83cebcd82a0151148af31`.
- WebP autonomía V3: media `251392`, SHA-256 `4c944fd0d7915b76bdaa67cf78de02ea40cc609965adec461a3b438d186fa1c4`.
- Cache Kinsta purgada después de la corrección.

La diferencia authored/runtime corresponde sólo a tres conversiones `🍏` → `&#x1f34f;`; el frontend las
renderiza como tres `img.emoji[alt="🍏"]`. El diff se verificó antes de aceptar el hash de runtime.

## 5. Extensión del Content Factory

El primitive ahora soporta:

- `kind=table` con headers obligatorios, filas obligatorias y ancho de columnas consistente;
- rich text seguro dentro de headers, celdas y caption;
- caption opcional en `kind=image`;
- `linkDestination=none|media` en imágenes;
- allowlist, enrichment profile y tests para `core/table`.

El helper remoto `public-website:wpcli` acepta `--input-file` repetible, pasa las rutas en `$args` y limpia PHP
e inputs remotos. Esto mantiene media y payloads dentro del mismo preflight SSH gobernado.

## 6. QA final

La inspección profunda final está en
[`post-deep-inspection-251363-2026-07-15T20-51-28+00-00.json`](../operations/public-site-content-factory/post-deep-inspection-251363-2026-07-15T20-51-28+00-00.json).
El reporte Playwright vive en
`ai-generations/2026-07-15_creative-workflows-pillar/review/v5-diagrams-v3/qa-report.json`.

| Gate | Desktop `1440×1000` | Mobile `390×844` |
|---|---|---|
| Un H1 + title esperado | PASS | PASS |
| Cinco imágenes cargadas | PASS | PASS |
| Seis captions | PASS | PASS |
| Tabla 3×4 | PASS | PASS |
| Diagramas enlazan a media | PASS | PASS |
| Tres manzanitas | PASS | PASS |
| Overflow de página/artículo | `false` | `false` |
| Canonical, robots y OG | PASS | PASS |

Estado final: `published; cache purged; live render verified; rollback guard prepared`.

La lección de QA queda explícita: proteger la safe area del tema es necesario, pero no suficiente. Todo
diagrama textual debe revisarse al `100%` de su raster original y luego dentro del runtime, verificando que
ningún conector cruce copy/listas, que todos los ordinales y labels estén completos, que tarjetas/divisores no
colisionen y que la puntuación display no produzca ligaduras visuales accidentales.
