# Nano Banana 2.1 — CLI local, evidencia 2026-10-06

Pedido del operador: cambiar Nano Banana a 2.1 en nuestra CLI y revisar cobertura.
Antes: `ai:image` sólo OpenAI; Google sólo helper interno de generación básica.
Ahora: `pnpm ai:nano`, default exacto `gemini-nano-banana-2.1`, Google directo `global`,
credenciales por `createGoogleAuth`, tres endpoints y contrato separado del runtime/Globe.

## Verificación

| Prueba | Resultado |
|---|---|
| Vitest de contrato + CLI | 29/29 PASS; límites, inputs falsificados, no overwrite, sesiones/firma, errores sin cuerpo, gasto, SSE y tokens |
| Regresión selección de provider de producto | 5/5 PASS; total de corrida focalizada 34/34 |
| TypeScript repo (`pnpm typecheck`) | PASS |
| ESLint de cuatro archivos de código/tests | PASS |
| CLI help + dry-run 4K / 8:1 / high / both | PASS; sin red/gasto |
| `countTokens` real | PASS, 8 tokens para prompt simple |
| `generateContent` real, 1K / 1:1 / minimal | PASS: `modelVersion=gemini-nano-banana-2.1`, PNG 1024×1024, 8,84 s, 22 tokens de entrada + 1120 imagen |
| `streamGenerateContent` real, sesión + referencia + búsqueda both, 2K / 4:1 / medium | PASS: mismo `modelVersion`, PNG 4128×1024, 22,65 s, 1306 tokens de entrada + 1680 imagen; 7 grounding chunks y atribución |

Salidas y sesión privadas en `.captures/ai-nano-2026-10-06/` (ignoradas). Inspección visual de la
segunda imagen: convirtió el círculo azul en Saturno con anillos sobre fondo blanco, sin texto/marca/personas.
Los bytes se inspeccionan con Sharp y se registran dimensiones reales: **4:1 solicitado devolvió 4128×1024**;
la CLI conserva la salida, no promete tamaño/aspecto matemáticamente exactos ni recorta para ocultar la diferencia.
Componente visual nominal de ambos canaries: US$0,084; entrada y búsquedas adicionales,
factura total no reconciliada. No se guardan pensamientos privados; firmas opacas sí, por continuidad.

## Cobertura y pendientes

Contrato/local: texto a imagen, edición/fusión, 14 referencias, contexto MP4/PDF, los 14 ratios, 1K–4K,
minimal/medium/high, system instructions, búsqueda off/web/images/both, sesiones, salida PNG/JPEG/WebP
(conversión local si se pide), streaming, tokens, dry-run y coste visual nominal.

No implementados: Batch API asíncrona (ni descuento), Interactions remoto / previous_interaction_id,
máscara PNG nativa y garantía de delta 0. Sin prueba live propia: 4K/high, todos los ratios, 14 referencias,
MP4/PDF, web/images por separado y calidad de consistencia de personajes reales. No se extrapola desde
los canaries. Nano Banana Pro y el helper del producto tienen alcance independiente.

El gate global `qa:gates --changed --agent codex --integration --security --docs` incluyó 804 archivos
del checkout compartido y salió 1 por ocho workspaces de licitación `workshop_only` ajenos al cambio.
No se repararon ni se aceptaron como entrega. QA de este cambio se limita a sus archivos.
Gate QA scoped: salida 0, once archivos propios; observaciones de rollout cubiertas por los canaries y
de seguridad por pruebas de abuso/privacidad. Skills espejo PASS. Closure documental scoped registra
manual, ADR, guía, skill, contexto, handoff y changelog. La herramienta canónica archivó una entrada
histórica del changelog para mantener 60 activas; las notas de contexto se compactaron sin perder sus fuentes.

## Decisión y operación

[ADR embebido](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md#architecture-decision-2026-10-06--nano-banana-21-en-cli-local),
[manual](../../manual-de-uso/ai-tooling/nano-banana-2-1-cli.md),
[selección de modelos](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md#10-carriles-google-directos-y-candidatos-no-conectados).

Estado: implementación local y dos canaries verificados; cobertura parcial explícita.
Commit local autorizado por el operador; sin push, deploy, env/IAM nuevos ni migración del producto/Globe.
