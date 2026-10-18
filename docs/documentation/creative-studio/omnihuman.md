# OmniHuman: para qué sirve y cuándo usarlo

OmniHuman 2.0 convierte una imagen de un personaje y un audio terminado en un video de ese personaje
interpretando el audio. Un prompt opcional orienta gestos, expresión, escena y cámara. Es candidato para
producción de presentadores y personajes; la calidad útil se determina mirando el resultado completo.

**Estado Efeonce al 2026-10-15:** aparece en nuestra consola BytePlus, pero está `Disabled`.
La API está documentada y aún no está conectada a nuestra CLI, Studio, MCP ni Globe. Ser partner y ver
`Enable model` no prueba que una solicitud de inferencia esté habilitada o cubierta por un descuento.

## Aplicaciones para el equipo

| Necesidad | Aporte potencial | Trabajo que sigue siendo necesario |
|---|---|---|
| Cápsulas de capacitación, onboarding o explicaciones | Presentador consistente a partir de un retrato y una locución aprobados | Guion, ejemplos, gráficos, subtítulos y revisión pedagógica |
| Versiones de un mensaje por mercado o campaña | Reinterpretar la misma identidad con audios aprobados diferentes | Adaptación de texto y voz, consentimiento y QA por versión |
| Reels de marca con portavoz o personaje | Producir una actuación breve sin volver a filmar cada variante | Dirección, composición de marca, montaje y aprobación |
| Glitch u otros formatos editoriales con conductor | Probar un segmento presentado con audio previamente producido | Validación editorial, ritmo, derechos y autorización de publicación |
| Personajes que cantan o interpretan música | Explorar una actuación guiada por audio musical | Derechos musicales y validación de sincronía/gestos |

Estas son aplicaciones propuestas, no prestaciones ya validadas o una oferta publicada. Una demostración de
varios personajes no prueba control independiente por persona: el contrato 2.0 documenta un solo `audio_url`
y no define aquí una asignación de audios/máscaras por personaje.

## Flujo de producción

1. Aprobar guion, identidad visual y permisos de imagen/voz. En fotografía propia Efeonce, mantener el canon
   de `design-studio`; OmniHuman recibe una imagen aprobada, no sustituye su dirección fotográfica.
2. Producir y aprobar la locución con `audio-studio`. Seed Speech o ElevenLabs son etapas aparte; OmniHuman
   no documenta generación de voz, traducción ni clonación dentro de esta llamada.
3. Preparar imagen/audio accesibles temporalmente al proveedor, estimar todos los intentos y ejecutar sólo
   cuando exista acceso y autorización de generación. Empezar por un canario breve antes de producir largo.
4. Recuperar y guardar el video privadamente; evaluar boca/dientes, identidad, manos, mirada, encuadre,
   continuidad, cortes, silencios y final de la pieza. Revisar todo el metraje, también las variantes.
5. Montar gráficos, producto, firma, subtítulos y mezcla final. Aprobación creativa y permiso de publicación
   son estados distintos y requieren su propia evidencia.

No es suficiente para prometer interacción de una persona con una interfaz, producto o escena compleja:
esas tomas requieren planificación y validación específica del motor por operación.

## Duración, costo y expectativas

La [API oficial 2.0](https://docs.byteplus.com/en/docs/byteplus-vision/omnihuman-2-0-video-generation)
admite audio de 4–300 segundos. Nuestra ficha de consola mostraba 120 segundos; los cinco minutos quedan
como capacidad documentada de API, pendiente de probar en la cuenta. El fabricante anuncia 720p nativo;
no prometer un master nativo 1080p/4K ni cinco minutos sin errores a partir de ese anuncio.

La tarifa visible era US$0,07/s antes de impuestos: un intento de 30 s estima US$2,10 y uno de 300 s US$21.
No incluyen voz, edición, infraestructura, repeticiones o margen. No se confirmó descuento partner ni factura;
el costo útil se calcula por pieza aprobada, contabilizando los intentos rechazados.

Contrato, autenticación, límites, errores y recuperación: [manual API](../../manual-de-uso/creative-studio/omnihuman-2-api.md).
Fuentes, términos y discrepancias: [auditoría](../../audits/creative-studio/OMNIHUMAN_2_API_RESEARCH_2026-10-15.md).
Frontera técnica: [contrato externo](../../architecture/creative-studio/BYTEPLUS_OMNIHUMAN_2_API_CONTRACT_V1.md).
