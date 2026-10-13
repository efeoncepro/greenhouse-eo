# Nexa cine: Seedream 5 Pro directo frente a Sunburst max

Fecha: 2026-10-12. Una salida recibida por motor, solicitada por el operador; prueba interna. Sin publicación,
promoción Globe ni aprobación automática como nueva ancla de identidad.

## Resultado y uso recomendado

**En esta pareja Sunburst sigue mejor la acción y geografía:** palma a la derecha del cuadro, investigación
en hombro izquierdo y tres corrientes legibles hacia los Sparks distantes. Seedream conserva rostro
reconocible, traje, lentes, cinco Sparks y atmósfera; su piel se ve más suave, pero invierte palma y hombro,
reparte los distantes a ambos lados y no resuelve inequívocamente una corriente por cada Spark distante.

Seedream Pro directo es útil para explorar variantes de retrato, vestuario y atmósfera con revisión de
identidad/accesorios/disposición. Sunburst es preferible para esta imagen principal cuando las relaciones
espaciales y la narración mandan. Un par no prueba superioridad universal, porcentaje de calidad ni velocidad
promedio. No se probaron texto, edición localizada, series de identidad ni capas en esta comparación.

| Evidencia | Sunburst | Seedream 5 Pro directo |
|---|---|---|
| Modelo real | `gpt-image-2.5-sunburst` | `dola-seedream-5-0-pro-260628` |
| Calidad seleccionada | `max` | `optimize_prompt_options.mode: standard`, más calidad que fast |
| PNG nativo, sin upscale | 3840×2160 · 8,29 MP | 2864×1611 · 4,61 MP |
| Tiempo hasta guardar salida | 97,43 s | 227,05 s, segundo intento |
| Revisión al 100 % | Rostro reconocible, más líneas finas que el ancla | Rostro reconocible y piel más suave; mano legible |
| Emblema del traje | Nave derecha, tres ventanas, órbita y esfera | Los mismos elementos conservados |
| Sparks | Dos cercanos y tres distantes; contacto de hombro | Dos cercanos y tres distantes; contacto de hombro |
| Cine: área en sombra | PASS · 70 % | PASS · 69 % |
| Reservas globales | 2/4; lecho 3,57:1 | 2/4; lecho 2,02:1 |
| Firma fotográfica final contra peor píxel | PASS · 17,37:1 | PASS · 8,69:1 |
| Costo estimado de la solicitud recibida | US$0,507969, con entrada | US$0,0999, con ocho referencias |

Seedream cuesta aproximadamente **80 % menos por esta salida recibida**. Compara máximos solicitados a
distintas resoluciones, no igualdad de píxeles. El primer intento Pro agotó 180 s sin respuesta/request ID;
su eventual cobro está **sin confirmar**, no es US$0. Si se cobrara al mismo estimado añadiría US$0,0999.
No se revisó settlement/factura. El costo total de sesión incluye esa incertidumbre.

## Condiciones y límites

- Misma ficha `AB-NEXA-ORQUESTA`, derivada de NX7d; prompt de 16.426 caracteres compilado por
  `construirPrompt` del comando canónico `foto:prompt`, sin concatenar bloques a mano. Sin semilla común.
- Mismas ocho referencias y orden: frontal v2, convicción, cuerpo frontal, traje sin rostro, emblema,
  lentes, reportes e investigación. Los tres PNGs de identidad se transportaron como JPEG98 4:4:4 con
  dimensiones intactas; el resto conserva bytes/transparencia. Ambos recibieron exactamente esos archivos.
  `transport/provenance.json` contiene hashes de origen/transporte; las anclas originales no se tocaron.
- Pro standard, watermark false, 2864×1611, área próxima al máximo documentado de 4.624.220 píxeles,
  tier 2K. Pro no ofrece 4K en este contrato. Sunburst max 3840×2160. APIs directas, sin fallback ni conector.
- Seedream recomienda hasta 600 palabras inglesas; el prompt canónico supera esa recomendación.
  Prueba del brief portable real, no prompts optimizados por separado para cada motor.
- Preflight: grillas aprobadas `personas/julio-nexa-firmadas.jpg` y `curado/set-curado-12.jpg` del lenguaje
  2026-09-19; NX7d `2026-10-01_traje-bionico-nexa/plates/NX7d-nexa-despliega-squad.png` y NX5b
  `2026-09-26_deck-nexa/plates/NX5b-nexa-bionica-isotipo.png`; referencias inspeccionadas al 100 %.
- `foto:doctor` PASS sin generación. Revisor cine pre/post aplicado con `.claude/agents/cine-reviewer.md`:
  CORREGIR para el layout completo, utilizables para comparación interna. Sin aprobación del operador ni
  promoción al casebook. Medir proporción facial no demuestra identidad geométricamente validada.

## Composición y consumo

Plates intactos. Firma mediante el compositor fotográfico canónico de
[`EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md` §5](../../operations/brand-photography/EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md):
SVG oficial, 20 % del lado corto, centrado al 93,5 % del alto. Sin scrim, grade ni recorte; ambas pasan 4,5:1.
El ensayo anterior con el compositor de voces `foto:componer` situó el logo más arriba: 6,28:1 / 4,04:1;
se conserva en `out/qa.json`. **Entrega: `final/` y `final/signature-qa.json`**. La caja de firma final no
convierte reservas 2/4 en 4/4 ni autoriza agregar texto.

Sunburst: 11.153 tokens imagen entrada, 3.697 texto, 13.342 salida. Tarifas Standard por millón US$8/5/30:
0,089224 + 0,018485 + 0,400260 = US$0,507969. Cálculo desde uso recibido, sin atribuir caché ni factura.
Pro: ocho entradas, una salida, 18.023 tokens salida/total. El precio de cuenta es por imagen/área y
referencias, **no por esos tokens**: US$0,081 + 7×US$0,0027 = US$0,0999.

Se amplió sólo la espera HTTP de imágenes BytePlus a 600 s. Sin retry automático: el segundo POST fue
deliberado, registrado como otro intento. Payload temporal de referencias eliminado; sin claves ni URLs
firmadas en recibos. Lint, 12 pruebas de cliente/capas y typecheck pasan.

## Archivos y fuentes

- [Entrega y manifiesto](../../../ai-generations/2026-10-12_nexa-sunburst-seedream5pro/LEEME.md).
- [Seedance 2.5: comparación API 720p/1080p](../creative-studio/BYTEPLUS_DIRECT_PRICING_COMPARISON_2026-10-12.md).
- [Tarifas OpenAI](https://platform.openai.com/pricing), verificadas 2026-10-12.
- [Seedream Pro: standard y área máxima](https://docs.byteplus.com/pt/docs/modelark/seedream-5-0-pro).
- [API: recomendación de prompt](https://docs.byteplus.com/es/docs/ModelArk/image-generation-api).
- BytePlus: catálogo de cuenta y [conexión directa verificada](../creative-studio/BYTEPLUS_DIRECT_CONNECTION_2026-10-12.md).
