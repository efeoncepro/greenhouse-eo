# Experiencia — Nexa Moments

> **Vista Nexa Intelligence.** Contratos canónicos (SSOT): [`../../GREENHOUSE_NEXA_MOMENT_FABRIC_ARCHITECTURE_V1.md`](../../GREENHOUSE_NEXA_MOMENT_FABRIC_ARCHITECTURE_V1.md) + [`../../GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md`](../../GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md).

## Qué es

La dirección de producto vigente es **Nexa como capability agéntica en el core de Greenhouse** —
no un chat local ni un widget aislado. La **unidad de producto** es el **Nexa Moment**:

```text
Nexa Moment = context + evidence + permission + intent + next step
```

Es decir: en cualquier superficie, Nexa entiende el **contexto** donde estás, trae **evidencia**
real, respeta el **permiso** (qué puede ver/hacer este sujeto), captura la **intención** y propone
el **siguiente paso** concreto y seguro.

## Por qué importa para la inteligencia

El Nexa Moment es el marco que une todas las capas de Nexa Intelligence en una sola experiencia:

- **context** → el `userContext`/`platformReality` del system prompt (capa system-prompt) + el `surfaceContext` de la experiencia.
- **evidence** → la capa knowledge (retrieval + citas) + el chrome de evidencia.
- **permission** → el ruteo + las políticas (datos en vivo solo con tool; sensibles con validación humana).
- **intent** → el routing por intención (capa behavior).
- **next step** → el contrato de voz cierra con una próxima acción cuando el usuario opera.

## Relación con la experiencia conversacional

El Nexa Moment es el **concepto de producto**; la [experiencia conversacional](conversational-experience.md)
(`NexaAnswersCanvas` + coreografía) es **cómo se materializa** un Moment en pantalla. La fábrica de
Moments (Moment Fabric) es la arquitectura que los compone across surfaces.

## Reglas duras (del contrato)

- **NUNCA** modelar Nexa como chat local/widget aislado: es capability agéntica del core.
- **NUNCA** un Moment sin las 5 piezas (context/evidence/permission/intent/next step) — un Moment
  sin evidencia o sin permiso no es un Moment.
- **SIEMPRE** respetar el permiso del sujeto (no exponer datos/acciones fuera de su acceso).

## Código / procedencia

`NexaMomentComposition` (sibling del Composition Shell — coexisten), Moment Fabric. Decisión
aceptada 2026-06-13. Detalle completo en los contratos canónicos enlazados arriba.
