# Capa — Experiencia (Conversational Experience · Nexa Moments · Nexa Answers)

La **experiencia** es cómo la inteligencia de Nexa se vive en pantalla: la superficie
conversacional, la unidad de producto (el Nexa Moment) y la respuesta que se arma (Nexa Answers).
Esta capa es la **vista Nexa Intelligence** de esos contratos — no los re-deriva; apunta a su SSOT.

- [`conversational-experience.md`](conversational-experience.md) — el shell + coreografía + contratos SSOT (surfaceContext) de la lente conversacional.
- [`nexa-moments.md`](nexa-moments.md) — la unidad de producto: `context + evidence + permission + intent + next step`.
- [`suggested-prompts.md`](suggested-prompts.md) — los starters del chat flotante: Tier 1 (por ruta) / 1.5 (nombre real) / 2 (data-aware, flag-gated).
- [`nexa-answers.md`](nexa-answers.md) — la respuesta que se arma (canvas, síntesis citada, render plan, lente runtime).

Contratos canónicos (fuera de esta carpeta — esta capa los referencia):
- Experiencia conversacional: [`../../ui-platform/CONVERSATIONAL_EXPERIENCE.md`](../../ui-platform/CONVERSATIONAL_EXPERIENCE.md) + el playbook de dominio.
- Nexa Moment Fabric: [`../../GREENHOUSE_NEXA_MOMENT_FABRIC_ARCHITECTURE_V1.md`](../../GREENHOUSE_NEXA_MOMENT_FABRIC_ARCHITECTURE_V1.md) + la decisión core [`../../GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md`](../../GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md).
- Skill operativa: `greenhouse-nexa-conversational`.
