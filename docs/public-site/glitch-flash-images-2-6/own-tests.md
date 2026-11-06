# Pruebas propias — Nexa / Images 2.6

2026-11-05. Ficción cinematográfica autorizada por el operador para enriquecer el Glitch Flash. No es una nueva identidad, una receta aprobada ni un cambio del motor por defecto.

## Método y resultados

Dos escenas desde recetas aprobadas NX7d/LG1, con identidad y objetos resueltos por catálogo. Prompts compilados completos; ninguna concatenación manual de bloques de estilo. Las referencias van en su orden original: rostro frontal v2, determinación, cuerpo, traje, macro del isotipo, lentes y Sparks. Ocho referencias en A y siete en B.

| Salida | Modelo | Calidad / complejidad | Duración CLI | Tokens entrada / salida |
| --- | --- | --- | --- | --- |
| GF26-A | gpt-image-2.6-sunburst | high / high | 57,525 s | 14.347 / 1.413 |
| GF26-B | gpt-image-2.6-sunburst | high / high | 55,204 s | 13.065 / 1.413 |
| GF26-B-edit1 | gpt-image-2.6-sunburst | high / low | 30,844 s | 1.859 / 1.413 |
| GF26-B-edit2 | gpt-image-2.6-sunburst | high / low | 28,705 s | 1.868 / 1.413 |

Todas son PNG nativos **2048×1152**. Tiempos de pared de la ejecución CLI, incluidos arranque, resolución de credencial, subida, proveedor y escritura; no es latencia aislada del modelo. Los originales se ejecutaron concurrentemente. Los tamaños de las entradas y la tarea cambian entre originales y ediciones: no se atribuyen las diferencias de tiempo únicamente a complexity. No es un benchmark ni comparación entre modelos.

Lineage: **B → edit1 → edit2**. B es independiente de A. Cada edición recibió el PNG previo y un markup PNG transparente del mismo tamaño. El primer cambio pide sólo borde naranja mate; el segundo, sólo paisaje interior de selva y cascada. No se usó máscara, `ai:inpaint`, recomposición de zonas protegidas, relight, grade ni retoque. Los PNG del artículo mantienen sus bytes; la portada es un derivado editorial separado.

El modelo devolvió ambos cambios pedidos con continuidad visual convincente en rostro, ojos, lentes, mano, traje, Spark y marca. No se certifica conservación exacta de identidad ni geometría: el rostro de B ya salió más ancho y el borde mantiene un acabado plástico/biselado, sin certificar cerámica mate.

## Revisión cine e identidad

- A: sombra cine **71,09 %**, reservas **3/4**, lecho blanco **3,44:1**. Proporción facial **0,80**, dentro del canon 0,81 ±0,02. El núcleo se convirtió en un dispositivo y el paso fuerte no es verificable. No usar la pieza como cumplimiento pleno del brief ni firmar con blanco sin medir la caja real; la imagen cruda del artículo no recibe firma ni corrección para esconderlo.
- B: sombra cine **73,47 %**, reservas **4/4**, lecho **6,21:1**. Proporción facial **0,78**, flag de rostro más ancho. El encuadre se cerró respecto del pedido y el borde salió luminoso pese a pedir material no emisor.
- Edit1: sombra **73,05 %**, reservas **4/4**, lecho **6,29:1**, rostro **0,78**. Borde naranja, montaña conservada, chaflán y pinza reconocibles.
- Edit2: sombra **72,19 %**, rostro **0,79** (el medidor aún señala ancho fuera de tolerancia con su precisión interna). Selva/cascada, borde naranja y perspectiva conservados visualmente.
- Los emblemas mantienen nave hacia la derecha, tres ventanas, órbita y punto en la revisión visual. Manos plausibles sin dedos extra evidentes. Los gates no son pruebas biométricas ni aprobación artística.
- Revisor independiente: **CORREGIR para alta canónica; APROBABLE para mostrar como evidencia cruda con límites**. Reportes completos y ampliaciones en `pruebas-propias/qa/`.

## Diferencia fuera del rectángulo

Comparación sin alineamiento ni retoque entre PNG crudos. Rectángulo de referencia igual al markup: x970, y463, ancho350, alto238. Incluye aire alrededor del marco; no es segmentación exacta de su material.

| Comparación | Diferencia RGB absoluta media fuera, sobre 255 | Píxeles fuera con diferencia >8 en algún canal |
| --- | --- | --- |
| B → edit1 | 3,235 | 8,59 % |
| edit1 → edit2 | 3,120 | 6,59 % |
| B → edit2 | 5,453 | 18,10 % |

El umbral 8 es diagnóstico elegido para esta revisión. **No equivale a porcentaje de identidad perdida, error perceptual ni deterioro visible.** Demuestra que el archivo fuera del rectángulo no quedó pixel-idéntico. El resultado justifica revisar el conjunto después de cada corrección, incluso cuando la continuidad parece buena a tamaño de lectura.

Evidencia: `pixel-comparison.json`, `qa/face-original-edit1-edit2.png`, `qa/frame-original-edit1-edit2.png` y `qa/mark-original-edit1-edit2.png`.

## Procedencia y entrega

Cada request conserva modelo, parámetros, prompt y SHA-256, referencias ordenadas y hashes. Cada receipt conserva consumo, tiempo, output y hash. El CLI fue la vía explícitamente pedida; no se usó un generador de identidad de modelo desconocida.

Cuatro outputs de imagen suman **5.652 tokens de salida**. A USD30/M equivalen a **USD0,16956 sólo de salida**, cálculo, no factura total. Las entradas suman aparte; no se infiere el costo final ni el beneficio económico de estas cuatro muestras.

Media Library: A252393, B252394, edit1252395, edit2252396; portada252389. Los bytes crudos propios se verificaron al importar y se contrastan por HTTP en `wp-media-http-readback.json`. WordPress mantuvo un original SVG oficial saneado con bytes distintos; ese recurso no forma parte de las cuatro pruebas propias.

El post **252401 fue publicado el 2026-11-05** tras «Ok publica» del operador, con lectura anónima, SEO, sitemap y QA visual verificados. El artículo muestra las pruebas, sus condiciones y límites; no promueve estas salidas al banco fotográfico aprobado ni afirma que Julio operó personalmente la CLI.
