> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-06-24 por Claude (TASK-1226)
> **Ultima actualizacion:** 2026-06-24 por Claude (TASK-1226)
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

## Que no hace (todavia)

- No publica nada al sitio publico ni a HubSpot.
- No calcula el score de 7 dimensiones ni arma el reporte (es el siguiente bloque del motor).
- No mezcla datos de clientes: V1 es interno/pre-tenant.

> Detalle tecnico: invariantes y contrato en [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md) (§Delta 2026-06-24). Codigo: `src/lib/growth/ai-visibility/**`. Operacion: [manual de smoke](../../manual-de-uso/growth/ai-visibility-grader-smoke.md).
