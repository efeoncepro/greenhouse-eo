# Casos reales de tipografía de campaña

Esta referencia evita que diseñadores y agentes aprendan desde mockups ambiguos. Un caso entra aquí sólo si
existe un archivo final accesible, una fuente de procedencia, parámetros tipográficos recuperables y un estado de
aprobación explícito. Esto permite auditarlo, pero no lo convierte en buen uso. “Render completado”, “aprobado”,
“programado”, “publicado” y “normativamente sólido” son estados distintos.

## Caso auditado · Efeonce Fiestas Patrias 2026

**Concepto:** Hay cosas que no necesitan rediseño.
**Estado creativo:** versiones 4:5 v09 y 9:16 v10 aprobadas por el operador.
**Estado de canal observado:** programadas en Metricool como `PENDING`; no se afirma publicación ni desempeño.
**Canon del caso:** [metodología integral](../../../../docs/operations/social/2026-09-13-fiestas-patrias-production-method.md).
**Evidencia de identidad:** [manifiesto de artefactos](../../../../docs/operations/social/fiestas-patrias-2026-artifact-manifest.json).

Los masters y portadas viven en la biblioteca de Marketing de OneDrive bajo
`Alineación/5. Contenidos/Seasonalities/Fiestas Patrias Chile/2026/Hay cosas que no necesitan rediseño/`.
El manifiesto identifica los binarios sin convertir OneDrive, una captura local o una URL temporal en source of
truth del método.

### Qué observar en las portadas

| Tramo | Familia / peso | Función |
| --- | --- | --- |
| Hay cosas que | Poppins 500 | Entrada con menor masa y ritmo estable |
| no necesitan | Bricolage 750 | Tesis que sostiene el bloque |
| rediseño | Bricolage 800 | Foco semántico; única zona de máximo peso |
| Logo Efeonce | Asset oficial | Firma subordinada, nunca texto reconstruido |
| Guttery | Omitida | No existe una función narrativa adicional |

La portada 4:5 y la 9:16 conservan la lógica, no las coordenadas. Cada ratio recompone encuadre, tamaños,
baselines y zona de firma. Ese es un acierto. El límite está en la jerarquía interna de Bricolage: 750 y 800
están separados por sólo 50 puntos y se perciben como masas cercanas. El foco existe principalmente por el cambio
de familia, la escala y el corte, no por una diferencia rica de peso.

La comparación didáctica de AXIS mantiene Poppins 500 + Bricolage 580 para tesis + Bricolage 760 para foco sobre
el plate limpio y cambia únicamente el ritmo vertical. La versión con huecos amplios queda marcada como
**DON’T**: separa la frase en tres bloques aunque exista una diferencia de 180 puntos. La versión **DO** acerca
ópticamente las cajas de tinta y recupera una sola unidad verbal. Usa tracking `-0.020em` en “no necesitan” y
`-0.025em` en “rediseño”, con leading `0.96`/`0.92`: una versión previa aplicaba `-0.060em`/`0.84` y quedaba
demasiado comprimida para funcionar como **DO**. El contraste de peso, el tracking y el interlineado son
decisiones relacionadas, pero una no corrige automáticamente a la otra. Ninguna reconstrucción sustituye el
arte aprobado.

### Qué aprender del Reel

El master final dura nueve segundos. Aquí el contraste está mejor resuelto porque se reparte en el tiempo:

1. `0.15–2.05 s`: Bricolage 500 instala “Hay cosas…” sin agotar el impacto.
2. `2.35–5.60 s`: Poppins 500 conecta; Bricolage 800 concentra “rediseño”.
3. `5.95–9.00 s`: Poppins 500 abre el saludo; Bricolage 750 cierra; el logo entra después.

Una familia por momento no es una prohibición absoluta de coexistencia. Es un control de atención: cada entrada
debe tener tiempo de lectura y una función. El movimiento del fondo, la selección y el cursor no justifican animar
todas las voces simultáneamente.

### Qué no universalizar

- Los tamaños en píxeles, baselines, masks, crops y coordenadas pertenecen a este caso.
- `500/750/800` no es un preset universal; es una respuesta a este copy y esta imagen.
- Aprobado no significa ejemplar: registra por separado aciertos, límites y una corrección propuesta.
- Un fondo oscuro no garantiza contraste en todos sus puntos ni durante todo el video.
- Una aprobación creativa no prueba publicación, resultados de audiencia ni derechos para otro territorio.
- La omisión de Guttery es una decisión positiva: agregar una familia sin función reduce claridad.

## Cómo usar un caso real en una guía pública

1. Verifica el estado actual contra la fuente canónica y los binarios, no contra memoria o una captura antigua.
2. Usa sólo masters aprobados y un alcance explícito para la guía; no copies pruebas, descartes o piezas de cliente.
3. Conserva alt text, transcript o descripción temporal fuera de la imagen/video.
4. No uses autoplay. Proporciona controles y un resultado estable para `prefers-reduced-motion`.
5. Distingue el archivo real de cualquier despiece didáctico. Una reconstrucción puede explicar capas y timings,
   pero no se presenta como el master ni como evidencia de calidad cuadro a cuadro.
6. Separa estado del archivo de calidad normativa. Un caso aprobado puede documentar un error o una oportunidad.
7. Explica por qué cada peso aparece y cuándo se retira. Un catálogo de pesos sin una decisión semántica no enseña uso.

## Producción normativa complementaria

AXIS incluye un fondo editorial producido con ImageGen exclusivamente para esta guía. No contiene copy ni marca:
las cuatro piezas 4:5, 9:16, 16:9 y brochure aplican tipografía, logo, safe zones y movimiento mediante HTML/CSS
determinista. Se rotulan como “producidas para la guía”, no como campaña real. La procedencia y el prompt viven en
`docs/creative-applications/advertising-social/ASSET_PROVENANCE.md` del repositorio AXIS.

El brochure conserva una comparación deliberada: **DON’T** usa el logo negativo sobre papel y piel claros, donde
la firma se pierde; **DO** mueve el wordmark positivo oficial al panel blanco estable (`#023c70` sobre blanco,
`11.15:1`). Un logo no se aprueba por el contraste promedio de la imagen. Verifica el fondo local más desfavorable
y cambia de variante o de campo; no agregues sombra, contorno ni pastilla para ocultar una selección incorrecta.

El video nuevo no era necesario: el Reel final de Fiestas Patrias cubre el caso audiovisual y las animaciones
didácticas pueden demostrar secuencia, lectura y reducción de movimiento sin una nueva generación. No llamar a Fal
sólo para completar una lista de proveedores.

## Si no existe una referencia publicable

Produce un caso original para la guía con marca, copy y derechos propios; rotúlalo “producido para la guía”, no
“campaña publicada”. Registra ImageGen/Fal u otro proveedor, modelo/ruta, inputs, intervención humana, revisión y
release state. El video requiere un master reproducible y QA temporal; una respuesta de job completado no basta.
No uses material de cliente, rostros, voces, música o marcas de terceros sin su evidencia específica. Si Fal no
está habilitado por una ruta gobernada, conserva el ejemplo como storyboard o motion local y declara la limitación.
