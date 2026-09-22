# SEO + AEO · v04 · Cuatro formatos

**PILOTOS: 16 exports, cuatro conceptos ×4:5/1:1/9:16/16:9.** Pendientes de aprobación de pieza. Sin publicación ni traslado a Finales. v03 queda conservada.

## Entrega y edición

- 4:5:1080×1350; 1:1:1080×1080; 9:16:1080×1920; 16:9:1920×1080.
- `out/contacto-{45,11,916,169}.png`: cuatro contactos. `out/preview-390`: revisión a390px.
- `MATRIZ-ENTREGA.json`: estado, ratios, rutas, hashes, referencias y QA por pieza.
- `piezas.json`: textos literales, Bricolage/Poppins, tamaños, espaciados, colores AXIS, CTA, cursor y reservas. Editar aquí, no en texto vectorizado del SVG.
- `componer-cta.mjs`, `firmar.mjs`, `validar.mjs`: extensión del compositor canónico, firma SVG oficial y QA. `recomponer.cjs` en OneDrive verifica dependencias y reproduce en una carpeta nueva.
- `brief/`: ocho fichas, prompts completos de `construirPrompt` y referencia de edición. Se utilizó el motor integrado image_gen, una edición por asset. Los ocho nuevos plates derivan de los verticales corregidos v03, conservando identidad/vestuario, orientación de pantallas y manos. Los otros ocho conservan el plate v03.
- `brief-origen`, `piezas-origen-v03.json`, `origen-prompts-y-conceptos`: continuidad de conceptos y fuentes anteriores. Las nuevas dimensiones nativas son1122×1402 (4:5, redondeo del motor) y1254×1254 (1:1); el export normaliza a la matriz, sin convertir un ratio en otro mediante recorte.

## Decisiones y comprobaciones

«¿Sales tú?» conserva contorno naranja; «¿Te reconoces?» y «Que te elijan», relleno naranja con tinta navy; «Sé la referencia», texto blanco. No se impone verde. CTA «Pide el diagnóstico» y descriptor «SEO + AEO», un cursor local asociado a la acción. Guttery opcional omitida para proteger densidad. Bricolage idea y Poppins estructura/acción siguen el canon.

Contraste específico de composición: **16/16 PASS** (`out/accesibilidad-cta.json`), CTA/descriptor≥4,5:1, contornos y controles≥3:1, valores sin redondear para decidir. Firma oficial,20%lado corto, mínimos5,52:1–19,39:1 (`out/qa-firma.txt`). Los ocho anteriores mantienen exactamente sus exports v03. Revisión visual de los ocho nuevos: titulares y cursor completos, lectura de escenas, manos, tablet dirigida a Nexa, separación de personaje/firma y consumo390px. Esto no es prueba CRO ni aprobación del operador.

### Alcance del arnés fotográfico

`foto:validar --zona-texto` se ejecutó sobre los ocho plates nuevos y **no queda globalmente verde**; se conserva salida íntegra en `out/qa-reservas-fotograficas.json`. Evalúa bandas y márgenes genéricos, además de la zona utilizada. La especificación de reservas §3 dice que esa geometría es punto de partida, no retícula aprobada. Estas composiciones usan una región superior centrada y selección sobre CTA, sin cita lateral ni objeto fotográfico enmarcado: campo profundo al margen no aplica y los costados de la foto no representan la posición del cursor. El área exacta de texto, perímetro y cursor sí se midió sobre sus bounds reales, sin scrim. En «Sé la referencia» la banda inferior completa contiene transición de mesa/escena y falla el arnés; el lecho físico bajo la firma pasa5,52:1/7,35:1. No registrar estos plates como plantillas universales de reservas ni promover la tabla global1:1 a validada. Mantener este límite visible en cualquier reutilización: mover texto/cursor/firma obliga a medir otra vez.

## Reproducir

Desde la copia OneDrive:

```sh
node recomponer.cjs --out /ruta/nueva --repo /Users/jreye/Documents/greenhouse-eo
```

No regenera fotografía ni sobrescribe pilotos. Conserva dependencias/hashes, fuentes desde repo y snapshot del compositor. Los PNG se archivan en OneDrive y no se fuerzan al Git (ignorados por política del repo). El commit conserva docs, skills, editables, prompts, scripts, matriz y evidencia textual. Las especificaciones de cada placement y aprobación/pauta se revisan al preparar la publicación.
