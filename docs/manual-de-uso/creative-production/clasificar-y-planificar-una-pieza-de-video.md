# Clasificar y planificar una pieza de video antes de producirla

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-10-03 por Claude
> **Ultima actualizacion:** 2026-10-03 por Claude
> **Modulo:** Creative Production / Video
> **Documentacion relacionada:** [funcional](../../documentation/creative-production/clasificacion-y-orquestacion-de-video.md) ·
> [taxonomía](../../architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md) ·
> [anexo de producto e interfaces](../../architecture/GREENHOUSE_AI_VIDEO_PRODUCT_AND_INTERFACE_V1.md) ·
> [ADR-025](../../architecture/creative-studio/EFEONCE_VIDEO_PRODUCTION_PIPELINE_ARCHITECTURE_V1.md) ·
> [método de producción](video-production.md) · [guía de selección](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md)

## Para qué sirve

Para decidir, antes de gastar, qué camino lleva una pieza de video, qué modelo conviene en cada toma, qué parte se
hace con herramientas propias y cuánto debería costar; y para dejarla planificada con sus aprobaciones. Lo usa quien
dirige la pieza (operador o agente) junto con la skill `motion-design-studio`.

## Antes de empezar

- Brief de la pieza (y de la campaña, si es una CMP) con canal, formatos y duración.
- Acceso a la vista navegable: https://claude.ai/artifact/SALEjhTyiehiRyXRvoFQzY (calculadora de dificultad y
  presupuesto, armador de formatos).
- Saldos de los proveedores: `pnpm ai:fal --balance` (fal) y `higgsfield account status` (créditos de la app).
- Si aparece una persona real del equipo o una voz real: consentimiento vigente para ese uso.

## Paso a paso

1. **Llena la ficha de clasificación** (taxonomía §2): tipo de pieza, tipo y subtipo de video, look, contrato de
   fidelidad, origen del material, operaciones por fase, cast, referencias con su rol, texto, audio, formato y derechos.
2. **Marca lo exacto.** Todo texto, logo, legal, URL o interfaz legible va como operación de posproducción
   (`finish.overlay`, inserto de UI). Nunca se pide al modelo.
3. **Elige el camino de cada operación** (taxonomía §3.13): si hay herramienta propia, se usa; si no, el puente de
   proveedor que figura ahí.
4. **Puntúa la dificultad de cada toma** en la calculadora (siete ejes). Si una toma queda «extrema», pártela. Si un eje
   queda en 3, planifica un piloto barato de esa parte.
5. **Si la pieza muestra personas usando un producto digital**, arma la secuencia con la gramática de planos del anexo
   (P1–P10) o con el armador de formatos de la vista. La interfaz legible va en su propio plano.
6. **Construye y aprueba las referencias en preproducción**: stills de entrada, hoja de identidad del cast, inserto de
   UI, animatic. **No se genera video con una referencia sin aprobar.**
7. **Elige el motor de cada toma** con la guía §4.3 (estado y canario por motor) y respeta las restricciones duras:
   personas reales nunca a motores con filtro de personas; 4:5 se genera en 3:4 y se recorta; si la pieza no admite
   voz, genera sin audio.
8. **Estima el presupuesto** con la fórmula de la taxonomía §4.2 o la calculadora: pilotos + intentos esperables ×
   tarifa a la resolución de entrega + entradas cobradas, con la reserva vigente (+43 %). Corre `--estimate` o
   `--dry-run` de cada herramienta.
9. **Pide la autorización del monto** en el chat antes de cualquier paso pagado.
10. **Produce siguiendo el método** y registra cada aprobación (creativa, gasto, derechos, técnica, escucha) con nombre
    y fecha. Cuando exista el runner (TASK-1989), estos pasos se hacen con `pnpm video:plan|run|approve|budget|status`.

## Qué significan los estados y señales

| Señal | Significado |
|---|---|
| Canario de garantía | la operación tiene una prueba real con garantía medida; se puede prometer dentro de esa garantía |
| Verificado | el endpoint entregó lo que promete (resolución, duración); sin garantía medida: candidato con revisión al 100 % |
| Contrato | conectado pero nunca corrido: no se promete hasta correr un canario |
| Puente | herramienta de proveedor usada mientras no tengamos la nuestra |
| Banda de dificultad baja / media / alta / extrema | 1–2, 2–3, 3–5 intentos esperables; extrema = partir la toma |
| Reserva +43 % | diferencia medida entre lo estimado y lo facturado en SKY V11; baja cuando haya reconciliación propia |

## Qué no hacer

- No generes texto, logo ni interfaz legible dentro del video.
- No pegues una interfaz o un producto sobre una toma generada sin un pase de integración: se ve falso.
- No generes video sin las referencias aprobadas.
- No reenvíes un pedido por timeout: retómalo con su `request_id` o su job.
- No presentes a una persona generada como un cliente real en un testimonio.
- No uses una captura con datos reales de clientes; usa un tenant de ejemplo.

## Problemas comunes

- **Las tomas no convergen después de varios intentos:** revisa el contrato de fidelidad y el still de entrada (caso
  Glitch: el still no coincidía con el primer cuadro pedido).
- **El presupuesto se va por encima:** revisa la banda de dificultad; probablemente una toma debía partirse o hacía
  falta un piloto barato antes.
- **El texto de la pantalla del dispositivo no se lee:** es lo esperado; la lectura va en un inserto de UI a pantalla
  completa.
- **El modelo agrega voz que no pediste:** genera con audio apagado y quita del prompt lo que induce a hablar.

## Referencias técnicas

- Taxonomía: `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md`
- Anexo: `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCT_AND_INTERFACE_V1.md`
- ADR-025: `docs/architecture/creative-studio/EFEONCE_VIDEO_PRODUCTION_PIPELINE_ARCHITECTURE_V1.md`
- Guía de selección: `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md` (§4.3, §7.4)
- Programa: `docs/epics/to-do/EPIC-051-ai-video-production-cli-capabilities.md` (TASK-1979 a TASK-1989)
