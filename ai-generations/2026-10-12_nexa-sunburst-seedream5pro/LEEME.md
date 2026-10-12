# Nexa cine: Sunburst max y Seedream 5 Pro standard

Prueba interna 2026-10-12. [Evaluación, costos y límites](../../docs/audits/ai-tooling/2026-10-12-nexa-seedream5-pro-vs-sunburst.md).
Sin aprobación como nueva ancla, publicación ni promoción Globe.

| Entrega nativa | Modelo/calidad | Resolución | Estimado de esta respuesta |
|---|---|---|---|
| [Sunburst](final/sunburst-max.png) | OpenAI `gpt-image-2.5-sunburst` max | 3840×2160 | US$0,507969 con referencias |
| [Seedream](final/seedream5-pro-standard.png) | BytePlus `dola-seedream-5-0-pro-260628` standard | 2864×1611 | US$0,0999 con referencias |

El primer intento de Pro agotó 180 s sin respuesta. Cobro desconocido, no cero; posible US$0,0999 adicional
si se liquidara con el mismo estimado. El segundo completó en 227,05 s con espera de 600 s. Sin retry automático.
Sunburst tardó 97,43 s. Son tiempos individuales, no promedios.

`plates/` conserva las salidas intactas. `final/` sólo agrega el SVG oficial de firma centrado, 20 % del lado
corto, centro al 93,5 % del alto, mediante el compositor fotográfico canónico:

```bash
node ai-generations/2026-09-19_lenguaje-fotografico-efeonce/scripts/componer.mjs <plate> <final>
```

`final/signature-qa.json`: contraste 17,37 / 8,69 contra el peor píxel, ambos PASS. `out/` conserva el ensayo
previo del compositor de voces (firma más arriba); no es la entrega. Sin scrim, grade, crop ni upscale.
Ambos plates pasan cine, pero sus reservas globales son 2/4; no cumplen todo el layout pedido para texto.

Ficha compartida: `fichas/AB-NEXA-ORQUESTA.json`, derivada de NX7d. `prompts/AB-NEXA-ORQUESTA.txt` salió
del compilador canónico `construirPrompt`; no se concatenaron bloques manualmente. Mismas ocho referencias
en el mismo orden para ambos motores. `references.json` lista originales; `transport/references.json` los
archivos enviados; `transport/provenance.json` documenta la conversión de tres referencias a JPEG98 sin
reescalar y los hashes. El payload temporal de transporte fue eliminado.

`manifest.json` registra modelo, parámetros, uso, costo, hashes de prompt/plates/finales e incertidumbre del
intento fallido. `sunburst.log`, `sunburst-run.json`, `seedream.log`, `seedream-run.json`,
`seedream-attempt1.*` y `byteplus/receipt.json` conservan evidencia sin secretos ni URLs firmadas.
Los logs `*-cine-gate.log` y `*-reserve-gate.log` contienen las mediciones. Revisión cine pre/post y visual
al 100 % realizada. La comparación favorece Sunburst para acción/geografía; Pro aporta piel más suave y
menor costo. Un par a tamaños diferentes no es un ranking universal ni prueba texto/capas/series.
