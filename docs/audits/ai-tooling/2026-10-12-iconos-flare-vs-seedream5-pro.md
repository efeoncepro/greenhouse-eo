# Cuatro iconos: Flare max frente a Seedream 5 Pro standard

Fecha: 2026-10-12. Prueba interna solicitada por el operador para comparar acabado, después de Nexa cine.
Se mantiene Seedream 5 **Pro**, por continuidad de la comparación anterior; no se sustituye por Flash/Lite.
Iconos genéricos, no una propuesta para reemplazar iconografía canónica de Efeonce/AXIS.

## Condiciones

- Cuatro parejas independientes: lupa, gráfico con tres barras ascendentes, carpeta con un documento y
  escudo con check. Una solicitud por icono/motor, ocho solicitudes, sin retry automático.
- Mismo prompt íntegro por pareja, sin imágenes de referencia ni semilla común. Prompts individuales en
  inglés, inferiores a la recomendación de 600 palabras de Seedream. El brief pide el mismo encuadre y
  luz; igualdad de instrucciones no significa que los motores devuelvan idéntica cámara o silueta.
- Ambos a 2048×2048, PNG. Flare `gpt-image-2.5-flare`, `quality: max`, OpenAI API directa.
  Pro `dola-seedream-5-0-pro-260628`, modo `standard`, watermark false, BytePlus API directa.
- Porcelana blanca mate de superficie redondeada, vidrio cian translúcido y titanio cepillado; vista
  ortográfica tres cuartos, luz de estudio suave y fondo gris claro neutro. Sin texto, logos ni ornamentos.
- Fondo opaco común para juzgar material antes de matting. **PNG no implica transparencia**; el contrato
  de esta prueba no es PNG con alfa reutilizable en cualquier fondo. No se hace recorte de fondo ni vectorización.
- Originales intactos; la hoja comparativa sólo reduce cada original al mismo tamaño y añade rótulos.
  Sin retocar, recolorear, corregir formas ni regenerar sólo un brazo para mejorar la comparación.
- No se modifica UI, biblioteca, canon de marca ni default de modelos. Sin publicación ni deploy; documentación y recetas versionadas por pedido del operador.

## Evidencia

Ocho solicitudes completadas en su primer intento. Readback de bytes: **ocho PNG nativos 2048×2048**, tres
canales y sin alfa nativo; la decodificación confirma cero píxeles transparentes. Se inspeccionaron los ocho
originales y la hoja; los recortes nativos en `detail/` permiten revisar vidrio/metal sin reducción.

| Par | Flare max | Seedream 5 Pro standard |
|---|---|---|
| Lupa | Lente y reflejos más definidos; porcelana mate con grano fino; mango más largo | Ángulo más inclinado, lente más oscuro; aro y metal legibles |
| Tres barras | Tres barras ascendentes, biseles y reflejos más nítidos; base mate | Tres barras ascendentes; vidrio más suave y menos saturado; base brillante y soportes más altos |
| Carpeta | Documento único legible a través del frente; porcelana mate, vidrio y bisagra separados | Documento único y bisagra; frente con otra silueta de carpeta, porcelana más brillante |
| Escudo | Un check y marco continuo; cara mate y microtextura más definidos | Un check y marco continuo; cara brillante y reflexión grande de softbox |

**Juicio acotado:** Flare conserva mejor la porcelana mate y la distinción entre materiales en esta serie,
con más detalle fino y contraste en los biseles. Pro produce cuatro iconos reconocibles y utilizables como
variantes, pero deriva a porcelana vidriada en tres de cuatro (base del gráfico, carpeta, escudo). No hay un
fallo semántico grave de conteo; cambiar material mate por brillante sí incumple parte del brief. Es una
alternativa económica con revisión del acabado, no evidencia para sustituir automáticamente Flare ni la
biblioteca canónica. Escala, cámara y suavidad varían pese a compartir instrucciones; no se normalizan en post.

| Estimación y tiempos de estas solicitudes | Flare | Pro directo |
|---|---:|---:|
| Costo total de cuatro, entrada incluida | US$1,720140 | US$0,324000 |
| Por icono | US$0,429995–0,430080 | US$0,081000 |
| Media observada de cuatro solicitudes | 49,25 s | 105,54 s |

Pro cuesta aproximadamente **81 % menos en esta prueba**, a la misma resolución pedida. Son estimaciones,
no settlement; no hay un timeout adicional como en Nexa. Los tiempos de cuatro no son un benchmark de SLA.
Flare: 14.272 tokens de salida por imagen y 374/384/375/367 tokens de texto de entrada; a Standard US$30 y
US$5 por millón respectivamente. Sin imágenes de entrada ni caché atribuida. Pro: área >2,61 MP, US$0,081
por salida según la cuenta; no se factura por los tokens que registra el recibo de uso.

[Entrega, originales y receta](../../../ai-generations/2026-10-12_iconos-flare-seedream5pro/LEEME.md).
`manifest.json` registra hashes de prompt/original, formato, dimensiones, alfa decodificado, modelo,
parámetros, latencia, uso y estimación. Recibos BytePlus sin claves ni URLs firmadas.
La validación de outputs y la composición de la hoja terminaron con exit 0; no se repiten tests de runtime
por una corrida creativa sin cambios de código fuente.

## Fuentes y continuidad

- [Nexa: Seedream Pro y Sunburst](2026-10-12-nexa-seedream5-pro-vs-sunburst.md).
- [Ruta BytePlus directa y tarifas de cuenta](../../manual-de-uso/creative-studio/byteplus-directo.md).
- [Contrato de GPT Image](../../architecture/creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md).
- [API de imagen BytePlus](https://docs.byteplus.com/en/docs/ModelArk/image-generation-api).
- [Tarifas OpenAI](https://platform.openai.com/pricing).

## Segunda prueba: clay 3D

El operador pidió repetir los cuatro conceptos con textura clay 3D. Se generaron ocho salidas nuevas,
independientes de las anteriores, sin editar las formas del estudio vidrio/metal. Mismos modelos, calidad
max/standard, tamaño 2048² y prompt compartido por pareja; sin referencias ni semilla común. El brief
excluye vidrio, metal y porcelana: todo es plastilina mate blanca cálida y cian pastel, con volumen suave y
discretas marcas de modelado. Lupa con centro vacío, tres barras, una hoja y un check.

[Entrega clay y receta](../../../ai-generations/2026-10-12_iconos-clay-flare-seedream5pro/LEEME.md).
Readback: ocho PNG nativos 2048² opacos, ocho solicitudes completadas sin retry; originales y hoja revisados,
recortes de textura al 100 % en `detail/`. No se hace matting, retoque o adopción de glifos canónicos.

| Observación de clay | Flare max | Seedream Pro standard |
|---|---|---|
| Material | Mate en los cuatro; grano fino y uniforme | Mate en los cuatro; trazas de alisado/modelado más visibles |
| Volumen | Más inflado y regular; barras anchas, check grueso | Más irregular y artesanal; barras esbeltas, check más delgado |
| Conceptos | Centro abierto, tres barras, hoja y check legibles | Conserva los mismos elementos; añade una pequeña placa en la pestaña de carpeta |
| Paleta y cámara | Crema cálida y cian más azul; composiciones más frontales | Blanco y cian más verdoso; vista más oblicua en lupa/escudo |
| Total estimado de cuatro | US$1,720970 | US$0,324000 |
| Media observada de cuatro solicitudes | 49,51 s | 96,93 s |

**Juicio:** aquí Pro cumple el mate en toda la serie y su textura manual es convincente; la brecha de acabado
observada en vidrio/porcelana no se repite del mismo modo. Flare ofrece mayor regularidad de formas y una
apariencia más inflada. Para clay genérico Pro es una opción económica viable; si el brief exige forma o
color exactos, hay que revisar ambos, incluida la placa añadida a la carpeta Pro. Es preferencia acotada a
esta tanda, no puntuación universal ni prueba de consistencia con iconografía canónica.

Flare recibió 410/405/426/425 tokens de texto y emitió 14.272 tokens de imagen por solicitud. Cálculo Standard
US$5/30 por millón, sin referencias ni caché atribuida: US$1,720970. Pro mantiene tarifa de cuenta
US$0,081 por salida >2,61 MP. Totales son estimaciones, no factura; no hubo timeout adicional.
Hashes, recibos, prompts y readback están en el manifiesto de esta carpeta nueva; no se sustituyó el anterior.
