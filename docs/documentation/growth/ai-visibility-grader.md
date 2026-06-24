> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.3
> **Creado:** 2026-06-24 por Claude (TASK-1226)
> **Ultima actualizacion:** 2026-06-24 por Claude (TASK-1233, Gemini 3 activo)
> **Documentacion tecnica:** [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)

# AI Visibility Grader — Motor de Providers (Growth)

## Que hace

Mide como los "answer engines" de IA (ChatGPT/OpenAI, Claude/Anthropic, Perplexity, Gemini) representan a una marca cuando alguien les pregunta por un servicio. El objetivo es ver si la marca **aparece o no** cuando un comprador busca proveedores, que dicen de ella y a quien citan.

Esta capa es la **fundacion del motor**: corre los prompts contra los providers, guarda la evidencia cruda y deja senales de salud. Todavia **no** calcula el puntaje final ni arma el reporte publico (eso es un paso posterior).

## Conceptos

- **Run (corrida):** una ejecucion del grader para una marca, en un modo (`light` barato / `full` completo / `internal_audit` interno).
- **Observacion:** el resultado de una pregunta a un provider. Guarda un extracto de la respuesta, las citas (sitios que el motor referencio), tokens usados, latencia y estado.
- **Evidencia ≠ verdad:** lo que dice un provider es un dato observado, no un hecho de negocio. El puntaje y el reporte se derivan despues, con reglas versionadas.

## Estados de una corrida

| Estado | Significa |
|---|---|
| `pending` / `running` | en preparacion / ejecutando |
| `succeeded` | todas las observaciones salieron bien |
| `partial` | algunas salieron bien y otras se saltaron o fallaron (honesto: no se infla a "exito") |
| `failed` | ninguna observacion exitosa |
| `skipped` | no se ejecuto nada (grader apagado o sin proveedores configurados) |

## Estados de una observacion

- `succeeded`: el provider respondio.
- `skipped`: el provider esta apagado o sin credenciales (esperado mientras el grader este OFF).
- `failed` / `rate_limited`: hubo un error o limite de uso.

## Por que no consume secretos por defecto

El grader nace **apagado** (flags `GROWTH_AI_VISIBILITY_*_ENABLED` en OFF). Sin encender el flag global + el del proveedor, cada llamada se **salta limpio** (no llama a ningun proveedor, no gasta dinero). Para desarrollo local usa un "fake provider" deterministico que simula respuestas sin red.

## Como se opera hoy

Hay un primitive server-side único (`executeGraderRun`) y todos lo consumen igual:

- **Endpoint interno:** `GET/POST /api/admin/growth/ai-visibility/runs` (+ `/<runId>` para el detalle), solo para usuarios internos con la capability correspondiente. Lista corridas y dispara una nueva.
- **CLI de smoke:** `pnpm growth:ai-visibility:smoke` (ver el [manual](../../manual-de-uso/growth/ai-visibility-grader-smoke.md)).
- **A futuro:** la UI pública, el admin, Nexa/MCP, el report builder y el handoff a HubSpot consumirán el MISMO primitive — ninguno llamará a los proveedores por su cuenta.

## Estado del rollout (2026-06-24)

- **staging:** encendido para OpenAI + Anthropic + **Gemini** (corre proveedores reales; verificado). Gemini usa la última generación disponible (**Gemini 3**, `gemini-3-flash-preview` vía Vertex) porque el grader debe medir con el modelo que la gente usa hoy; el modelo es ajustable por env sin redeploy.
- **producción:** apagado — el encendido es un proceso aparte (migración + release controlado) que se hará después.
- **Perplexity:** apagado hasta tener credenciales (no tiene cliente con grounding aún).

## Del dato al puntaje (findings y score — TASK-1227)

Las observaciones crudas no son producto. El motor las convierte en:

- **Findings normalizados:** una lectura comparable por observación (¿la marca aparece? ¿por su dominio o por un homónimo? ¿qué competidores? ¿qué citas?). Es **determinista-first**: usa señales estructuradas (dominios de citas) y deja en "desconocido" lo que no puede afirmar; las señales de prosa (sentimiento, deriva de mensaje) las llena un paso de IA opcional (apagado por defecto).
- **Score (7 dimensiones):** AI Visibility, Entity Clarity, Category Ownership, Competitive Share of Voice, Citation Quality, Message Alignment y Revenue Intent Coverage. El puntaje es **determinista, versionado y reproducible** — ningún modelo de IA lo asigna; se calcula con reglas desde los findings. Una dimensión sin evidencia queda en "null" (no se inventa 0 ni 100).
- **Compuertas de seguridad:** si no hay evidencia mínima → `insufficient_data` (nunca un puntaje falso). Si hay lenguaje riesgoso/difamatorio o sentimiento negativo poco confiable → `review_required` (revisión humana). La auto-publicación está apagada por diseño en esta etapa.

Ejemplo real (smoke): Efeonce obtuvo score ~26 con **AI Visibility = 0** — refleja el hallazgo del spike: invisible en descubrimiento por IA.

## Que no hace (todavia)

- No publica nada al sitio publico ni a HubSpot.
- No arma el reporte visual final ni lo auto-publica (es el siguiente bloque: report builder + admin review).
- No mezcla datos de clientes: V1 es interno/pre-tenant.

> Detalle tecnico: invariantes y contrato en [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md) (§Delta 2026-06-24). Codigo: `src/lib/growth/ai-visibility/**`. Operacion: [manual de smoke](../../manual-de-uso/growth/ai-visibility-grader-smoke.md).
