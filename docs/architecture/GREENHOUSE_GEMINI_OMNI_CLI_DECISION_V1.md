# Gemini Omni en la CLI local de video (1.2 por defecto, 1.1 opcional)

- **Status:** Accepted (2026-09-24; Delta 2026-11-05: Omni 1.2 por defecto; implementación local, sin release)
- **Owner:** AI tooling / producción de video
- **Scope:** `pnpm ai:omni`, `scripts/ai/gemini-omni.ts`, `src/lib/ai/gemini-omni-cli.ts`
- **Reversibility:** two-way
- **Confidence:** 1.1: high para los seis modos probados a 360p/16:9. 1.2: contrato tomado de la documentación oficial + modelo GA verificado en vivo + canary `text` 360p/3 s completado; las demás tareas sin canary propio
- **Validated as of:** 2026-09-24 (1.1, respuestas reales y MP4 inspeccionados); 2026-11-05 (1.2, documentación + GET del modelo publicado + canary `text` con MP4 inspeccionado)

## Context

El operador pidió generación y edición de Gemini Omni 1.1 desde **nuestra CLI**, no una ruta del producto Globe. El modelo Cloud `gemini-omni-1.1-flash-preview` y el modelo Developer API `gemini-omni-1.1-flash` tienen identidades y autenticación distintas. La CLI existente de Fal no es el transporte elegido para modelos Google nativos.

## Decision

La superficie local `pnpm ai:omni` usa ADC de GCP y la Interactions API Cloud `v1beta1` en `locations/global`. Expone `text`, `image`, `frames`, `reference`, `edit` y `extend`, además de consulta/espera por ID opaco. Los archivos locales se suben a un bucket privado GCS; la salida se conserva privada y se descarga a MP4 local cuando se solicita. La CLI exige confirmación explícita para gastar, estima el componente de video de salida y aplica un límite nominal por solicitud. Persiste estado local mínimo para retomar operaciones asíncronas.

Esta decisión **no** cambia el contrato, la flota, la promoción ni la disponibilidad comercial de Globe. La evidencia de esta CLI no promueve una ruta de Globe ni cierra `TASK-1781`.

## Alternatives Considered

- Integrar en Globe: rechazado para este alcance por instrucción explícita del operador y porque ese producto tiene su propio ciclo de rutas, derechos y promoción.
- Usar Fal para Omni: se mantiene el acceso directo a Google para esta CLI y su identidad Cloud exacta.
- Reutilizar `generateContent` o el modelo anterior: no corresponde al transporte ni a la identidad de Omni 1.1 en Cloud.

## Consequences

La generación y edición quedan disponibles para operadores locales con permisos GCP y acceso al bucket. Las seis operaciones completaron canaries reales a 360p/16:9; 9:16, 1080p y 4K siguen sin prueba live en esta integración. La estimación no representa la factura completa. Los inputs y outputs retenidos en GCS requieren política de ciclo de vida antes de uso sostenido. La edición es por video de entrada; continuidad por `previous_interaction_id`, máscaras y preservación exacta de píxeles no están implementadas.

## Delta 2026-11-05 — Gemini Omni 1.2 Flash

Google publicó **Gemini Omni 1.2 Flash** (`gemini-omni-1.2-flash`) como GA en Cloud el 2026-11-05. Cambios en la CLI:

- **Modelo por defecto:** `gemini-omni-1.2-flash`. `gemini-omni-1.1-flash-preview` se conserva con `--model 1.1` para reproducir clips anteriores. El registro de modelos vive en `src/lib/ai/gemini-omni-cli.ts` (`OMNI_MODELS`) y fija los límites por modelo y tarea: 1.2 genera 3–15 s (frames y extend 3–10 s); 1.1, 3–10 s.
- **Nueva tarea `upscale`** (sólo 1.2): reescala 360p→720p/1080p y 720p→1080p/4K con `--source-resolution`; la CLI rechaza transiciones inexistentes antes de gastar y estima con los tokens por transición publicados.
- **Turnos (`--previous`):** `edit` y `upscale` pueden continuar sobre el video del turno anterior con `previous_interaction_id` y el contenido envuelto en `user_input`, según el ejemplo oficial de upscale. Sin canary propio: contrato documentado, no verificado.
- **Límites de entrada por modelo:** referencias 1.2 hasta 6 imágenes y 1 video de referencia para salidas de más de 10 s; edit/extend 1.2 hasta 2 imágenes de referencia; extend 1.2 acepta fuente de cualquier largo.
- **Costo:** USD 12/1M tokens de video para 1.2 (derivado del USD 0,07/s a 720p publicado; la tabla Cloud no se pudo leer) frente a USD 17,50 de 1.1. Los tokens por segundo no cambiaron.
- **Identidad de respuesta:** un modelo inesperado en la respuesta ahora se **marca y avisa** en vez de lanzar error. Lanzar después de un submit pagado ocultaba el interaction ID necesario para recuperar el clip; la identidad sigue fijada en el request.

**Evidencia:** `GET .../publishers/google/models/gemini-omni-1.2-flash` respondió `launchStage: "GA"` el 2026-11-05; 17 pruebas del contrato en verde y `--estimate` ejercitado. Canary `text` 360p/16:9/3 s completado (interacción `ChAyMDUyOTYwMjdiNmM4YmU4EAgaAjJhKgRtYWlu`): MP4 H.264 640×360 a 24 fps con audio AAC y 5.793 tokens de video, que coinciden con la estimación de la CLI (≈ USD 0,070). Las otras seis tareas, incluidas `upscale` y `--previous`, siguen sin canary. Detalle y recetas: [manual](../manual-de-uso/ai-tooling/gemini-omni-1-1-cli.md).

**Revisit:** cuando Google publique retiro de `gemini-omni-1.1-flash-preview` en Cloud (la Developer API enruta 1.1 → 1.2 desde el 2026-12-03), cuando un canary confirme o refute `--previous`, o cuando la tabla de precios Cloud difiera del valor derivado.

## Runtime Contract

- Código y validaciones: `src/lib/ai/gemini-omni-cli.ts` y `scripts/ai/gemini-omni.ts`.
- Operación, opciones, costos y evidencia live: [`gemini-omni-1-1-cli.md`](../manual-de-uso/ai-tooling/gemini-omni-1-1-cli.md).
- Selección entre motores: [`GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`](GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md).
- Autenticación local: [`gcloud-auth-playwright.md`](../manual-de-uso/operations/gcloud-auth-playwright.md).

## Revisit When

Reabrir si Google modifica la identidad, las tareas o el contrato de Interactions; si la CLI pasa a servicio o producto; si se incorpora continuidad stateful, lote o políticas de retención automatizadas; o si se pretende declarar disponibilidad en Globe.
