> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-06-23 por Claude (TASK-1201)
> **Ultima actualizacion:** 2026-06-23 por Claude (TASK-1201)
> **Documentacion tecnica:** [GREENHOUSE_FINANCE_AI_SIGNAL_SOURCE_OF_TRUTH_DECISION_V1.md](../../architecture/GREENHOUSE_FINANCE_AI_SIGNAL_SOURCE_OF_TRUTH_DECISION_V1.md)

# Señales AI de Finance — Fuente de Verdad

## Qué es

Finance tiene un motor que detecta anomalías en las métricas financieras de cada cliente
(margen neto, margen bruto, revenue, costos) y, cuando encuentra algo relevante, genera una
**señal AI** que luego puede enriquecerse con una explicación generada por IA. Estas señales
son las que alimentan los insights de Nexa y del dashboard de Finance.

Este documento explica de dónde sale el dato, cómo se sabe si es confiable, y por qué a veces
la plataforma dice "sin datos todavía" en vez de inventar un insight.

## Por qué importa

Antes (hasta junio 2026) el motor podía registrar que "corrió con éxito" aunque no hubiera
generado ninguna señal real. Eso es engañoso: hace creer que hay una capa de inteligencia
financiera lista cuando en realidad está vacía. La regla de oro es **no afirmar un insight
financiero si no hay una señal durable detrás**.

## Los estados que vas a ver

| Estado | Qué significa | Qué hacer |
|---|---|---|
| **Listo (ready)** | Hay insights frescos y confiables del período. | Usar normalmente. |
| **Sin novedades (empty-positive)** | El motor corrió, miró los datos del período y no encontró anomalías. Es salud, no una falla. | Nada; el período está sano. |
| **Pendiente (empty-pending)** | El motor todavía no corrió, o los datos económicos del período aún no están listos. | Esperar el cierre del período / próxima corrida. |
| **Degradado (stale-degraded)** | Algo del pipeline quedó atrasado o a medias. | Revisar el manual de diagnóstico. |

> **Importante:** "Sin novedades" (salud) y "Pendiente" (datos no listos) **no son lo mismo**.
> La plataforma los distingue mirando si realmente hubo datos económicos que evaluar.

## Nexa y Finance: qué está bloqueado por ahora

Las acciones e insights de **Nexa sobre finanzas** quedan **bloqueados** hasta que se cumplan
dos condiciones: (a) el estado del período sea "Listo", y (b) la cobertura de costos del P&L
sea confiable (eso lo cierra una tarea aparte, TASK-1200). Mientras tanto, Nexa no inventa
insights financieros: degrada honestamente.

> Detalle técnico: el contrato server-side único es `readFinanceAiLlmSummary` y el guard de
> consumo es `isFinanceAiInsightConsumable` en `src/lib/finance/ai/llm-enrichment-reader.ts`.
> La provenance del paso de detección vive en `greenhouse_serving.finance_ai_materialization_runs`
> (append-only). Señal de salud: `finance.ai.signals.stale_materialization`.
