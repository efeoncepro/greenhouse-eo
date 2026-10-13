# Nano Banana 2.1 — CLI local, evidencia 2026-10-06

Pedido del operador: cambiar Nano Banana a 2.1 en nuestra CLI y revisar cobertura.
Antes: `ai:image` sólo OpenAI; Google sólo helper interno de generación básica.
Ahora: `pnpm ai:nano`, default exacto `gemini-nano-banana-2.1`, Google directo `global`,
credenciales por `createGoogleAuth`, tres endpoints y contrato separado del runtime/Globe.
OpenAI conserva `pnpm ai:image` y su default `gpt-image-2`; la familia 2.5 sigue como selección explícita.

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
| `generateContent` real, Nexa cine, 4K / 16:9 / high / ocho referencias | Dos PNG nativos 5504×3072, mismo `modelVersion`; V2 PASS técnico de cine/reservas, APROBABLE por cine-reviewer |

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
máscara PNG nativa y garantía de delta 0. La [prueba Nexa](2026-10-06-nexa-cine-nano-banana-2-1-vs-sunburst.md)
verifica 4K/high y ocho referencias; no verifica todos los ratios, 14 referencias, MP4/PDF, web/images
por separado ni consistencia de personajes a lo largo de una serie. Nano Banana Pro y el helper del
producto tienen alcance independiente.

Nexa V2: identidad y emblema revisados a escala real; reservas 4/4 PASS, lecho blanco 5,32:1 y
67,11 % de sombra. Estos gates acreditan condiciones técnicas, no una puntuación de calidad artística.
La comparación con NX7d Sunburst favorece Sunburst para este caso por naturalidad de pose/luz/escena;
Nano destaca en resolución y espacio para composición. No es A/B controlado: cambiaron prompt,
expresión y referencias. Las latencias y componentes visuales nominales del informe no constituyen
un benchmark entre proveedores ni una factura reconciliada.

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

Estado: implementación local, dos canaries y dos generaciones Nexa 4K/high verificadas; cobertura parcial explícita.
Selección Nexa V2 en estado `proof-only`; APROBABLE técnico, sin aprobación de canon visual ni publicación.
Commit local autorizado por el operador; sin push, deploy, env/IAM nuevos ni migración del producto/Globe.
