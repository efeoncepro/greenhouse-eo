# Fondeo gobernado de créditos de Globe — cómo se le pone presupuesto al mes

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.3
> **Creado:** 2026-07-26 por Claude (TASK-1566)
> **Ultima actualizacion:** 2026-08-01 por Codex (TASK-1630)
> **Documentacion tecnica:** [ADR-015](../../architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md)

## Qué es

Globe genera imagen, video y audio gastando **créditos**. Cada mes ese gasto tiene un presupuesto, y
este documento explica cómo se **agrega presupuesto**: el **fondeo gobernado**. Funciona en dos
pasos — un usuario autenticado **propone** un plan y un usuario autorizado lo **confirma**. Ese
usuario puede ser una persona o un agente delegado; sin confirmación atribuida y autorizada no se
mueve nada.

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
| **Confirmar** | Una persona autorizada o un agente autenticado con autoridad one-shot o delegación explícita del workspace, scopes, entitlements y límites vigentes |
| Un segundo confirmador | Es **política por workspace** (apagada en el workspace interno, donde el aprobador es el dueño del presupuesto), no una regla fija |

Cada fase queda registrada con **quién** la hizo y **con qué derecho**, en una tabla que no se puede
editar ni borrar (append-only), incluido el modo de autenticación (`human` o `agent`). Un principal
de servicio o workload genérico no puede confirmar: carece de una delegación atribuible a usuario.

## Protecciones que trae el carril

- **La propuesta vence en 15 minutos**: se confirma sobre el estado que se vio, no sobre uno viejo.
- **Todo o nada**: créditos, tope y registro ocurren en una sola transacción. No puede quedar un
  fondeo a medias.
- **Sin repeticiones**: una vez registrada la decisión sobre una propuesta, ningún reintento — con
  la clave que sea — puede generar un segundo fondeo.
- **La firma nunca sale del servidor**: ningún cliente, script ni persona maneja el secreto de
  aprobación. Eso es lo que vuelve innecesario el break-glass.
- **Delegación agente acotada**: cada workspace decide si la habilita, el máximo por grant y el
  máximo mensual. La política nace apagada y la base de datos rechaza cualquier exceso.

## Contrato aprobado y estado operativo

TASK-1630 distingue dos formas de autoridad agente:

- **Instrucción one-shot del CEO:** autoriza una operación exacta por workspace, período, target, cap,
  fingerprint y vencimiento. Permite que el mismo agente autenticado proponga y confirme cuando el segundo
  confirmador está OFF; no se reutiliza para otro payload.
- **Delegación persistente:** sirve para operación rutinaria y queda versionada, revocable y limitada por
  workspace, período, monto por operación/acumulado, cap, vigencia y cantidad de ejecuciones.

TASK-1629 desplegó y verificó live la autoridad one-shot, los readers `status/list/get/reconcile`, la selección
automática del ciclo y la fachada `ensure`. Hay dos adaptadores sobre la misma state machine y el mismo ledger:

- `browser`: la sesión humana de Greenhouse emite y ejecuta inmediatamente una operación exacta desde
  `/admin/globe/credits`, sin fabricar OAuth ni pedir un segundo operador;
- `oauth`: API/CLI/agente ejecutan con un cliente OAuth activo y evidencia renovable del bearer.

Ambos ligan usuario, workspace, client, modo de autenticación, fingerprint y límites. Desde el 2026-08-01 el
carril está operativo para el workspace interno: las migraciones están aplicadas, el cliente OAuth está activo,
Greenhouse `develop` y Globe `main` están desplegados, y UI + API/CLI + Producer pasaron smoke autenticado.

El ciclo mensual ya no exige que el operador conozca un `poolId`. `ensure` deriva el mes UTC y, dentro de la
misma transacción del grant, crea o reutiliza `internal-month:AAAA-MM`. Un pool determinístico pausado, cerrado o
incompatible falla cerrado; no se fabrica un reemplazo para evadir el kill switch. Esta excepción es sólo del
carril interno acotado y no debilita el maker-checker de la administración genérica de pools.

La prueba live fijó objetivo 800, grant máximo 1000 y cap máximo 1500. La operación
`23db5b0e-89dd-4661-9b8d-c12f9be4ad7a` terminó `completed`: capacidad efectiva `0 → 800`, pool
`internal-month:2026-08`, un grant, una allocation y readback coincidente en Greenhouse, CLI PKCE y Producer.
No habilita clientes externos ni fondeo comercial; ambos continúan gated.

> Detalle técnico: comandos `globe.credits.month.fund.propose` / `.confirm` (surface
> `sister-platform`), dominio en `efeonce-globe/packages/domain/src/credit-funding.ts`, rutas en
> `src/app/api/admin/globe/credit-funding/*`, evidencia en
> `greenhouse_core.globe_credit_funding_intents`. Programa de convergencia: TASK-1630. Decisión completa: ADR-015. Runbook:
> [manual de uso](../../manual-de-uso/creative-studio/fondear-creditos-globe.md).
