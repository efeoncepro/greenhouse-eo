# Gemini Omni 1.1 en la CLI local de video

- **Status:** Accepted (2026-09-24; implementación local, sin release)
- **Owner:** AI tooling / producción de video
- **Scope:** `pnpm ai:omni`, `scripts/ai/gemini-omni.ts`, `src/lib/ai/gemini-omni-cli.ts`
- **Reversibility:** two-way
- **Confidence:** high para los seis modos probados a 360p/16:9; limitada para otras resoluciones y ratios
- **Validated as of:** 2026-09-24, con respuestas reales de Cloud Interactions y MP4 inspeccionados

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

## Runtime Contract

- Código y validaciones: `src/lib/ai/gemini-omni-cli.ts` y `scripts/ai/gemini-omni.ts`.
- Operación, opciones, costos y evidencia live: [`gemini-omni-1-1-cli.md`](../manual-de-uso/ai-tooling/gemini-omni-1-1-cli.md).
- Selección entre motores: [`GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`](GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md).
- Autenticación local: [`gcloud-auth-playwright.md`](../manual-de-uso/operations/gcloud-auth-playwright.md).

## Revisit When

Reabrir si Google modifica la identidad, las tareas o el contrato de Interactions; si la CLI pasa a servicio o producto; si se incorpora continuidad stateful, lote o políticas de retención automatizadas; o si se pretende declarar disponibilidad en Globe.
