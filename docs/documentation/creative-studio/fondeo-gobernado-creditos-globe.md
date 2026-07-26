# Fondeo gobernado de créditos de Globe — cómo se le pone presupuesto al mes

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-26 por Claude (TASK-1566)
> **Ultima actualizacion:** 2026-07-26 por Claude
> **Documentacion tecnica:** [ADR-015](../../architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md)

## Qué es

Globe genera imagen, video y audio gastando **créditos**. Cada mes ese gasto tiene un presupuesto, y
este documento explica cómo se **agrega presupuesto**: el **fondeo gobernado**. Funciona en dos
pasos — alguien **propone** un plan, y una **persona** (con su sesión real de Greenhouse) lo
**confirma**. Sin confirmación humana no se mueve nada.

Antes de esto, agregar presupuesto exigía un procedimiento de emergencia («break-glass»: prestarle
temporalmente poderes de administrador a una cuenta técnica). Se usó tres veces para lo mismo, y ese
desvío es exactamente lo que este carril elimina. El primer fondeo real por el carril corrió el
2026-07-26.

## Las dos capas: caja y regla

El presupuesto tiene dos capas, y confundirlas es el error más común:

- **El ledger** es la caja: cuántos créditos se cargaron, reservaron y gastaron.
- **La política** es la regla: el **tope mensual** y los **grants activos** que dicen cuánto de esa
  caja se puede usar este mes.

Cargar la caja sin subir la regla **no habilita nada**: puedes tener 500 en el ledger y que toda
generación se niegue porque el tope del mes ya se alcanzó. Por eso el fondeo puede llevar dos cosas
en un solo acto: créditos nuevos (grant) **y** un tope mensual nuevo.

## El plan legible — la pieza central

Al proponer, el sistema no devuelve un «ok»: devuelve un **plan con el delta completo** — tope antes
y después, disponible antes y después, cuánto va gastado, y si hoy la generación se está negando,
**por qué**. El confirmador ve las consecuencias **antes** de aprobar.

Ejemplo real (el primer fondeo): tope 400 → 800, disponible 344 → 444, gastado 166. Y el caso que
demuestra por qué el plan importa: un fondeo **sin** subir el tope mostraba que agregar créditos
**no aumentaba** lo disponible — plata que no se podía gastar, visible antes de confirmar.

## Quién puede hacer qué

| Acto | Quién |
|---|---|
| Proponer un plan | Una persona o un agente (es de solo lectura: registra la intención, no muta nada) |
| **Confirmar** | **Solo una persona**, con su sesión real de Greenhouse. Un agente o proceso de servicio es rechazado por la base de datos misma |
| Un segundo confirmador | Es **política por workspace** (apagada en el workspace interno, donde el aprobador es el dueño del presupuesto), no una regla fija |

Cada fase queda registrada con **quién** la hizo y **con qué derecho**, en una tabla que no se puede
editar ni borrar (append-only). Ésa es la evidencia para cualquier revisión posterior.

## Protecciones que trae el carril

- **La propuesta vence en 15 minutos**: se confirma sobre el estado que se vio, no sobre uno viejo.
- **Todo o nada**: créditos, tope y registro ocurren en una sola transacción. No puede quedar un
  fondeo a medias.
- **Sin repeticiones**: una vez registrada la decisión sobre una propuesta, ningún reintento — con
  la clave que sea — puede generar un segundo fondeo.
- **La firma nunca sale del servidor**: ningún cliente, script ni persona maneja el secreto de
  aprobación. Eso es lo que vuelve innecesario el break-glass.

> Detalle técnico: comandos `globe.credits.month.fund.propose` / `.confirm` (surface
> `sister-platform`), dominio en `efeonce-globe/packages/domain/src/credit-funding.ts`, rutas en
> `src/app/api/admin/globe/credit-funding/*`, evidencia en
> `greenhouse_core.globe_credit_funding_intents`. Decisión completa: ADR-015. Runbook:
> [manual de uso](../../manual-de-uso/creative-studio/fondear-creditos-globe.md).
