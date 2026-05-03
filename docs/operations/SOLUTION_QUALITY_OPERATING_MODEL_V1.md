# Solution Quality Operating Model V1

## Objetivo

Convertir la preferencia operacional de Greenhouse en contrato permanente: los agentes no deben entregar parches fragiles cuando el problema requiere una solucion segura, robusta, resiliente y escalable.

## Regla base

Antes de implementar, cada agente debe preguntarse:

> Estoy corrigiendo la causa raiz y reforzando el contrato canonico, o solo estoy haciendo que este caso puntual deje de fallar?

La opcion esperada por defecto es causa raiz + contrato canonico. Un workaround solo es aceptable si esta explicitamente acotado, documentado, reversible y ligado a una task/issue de cierre.

## Definiciones operativas

- `Seguro`: preserva autorizacion, tenant isolation, secretos, auditabilidad, privacidad, consistencia transaccional y errores sanitizados.
- `Robusto`: corrige causa raiz, reutiliza primitives canonicas, agrega regression guard cuando aplica y no depende de supuestos invisibles.
- `Resiliente`: degrada honestamente, soporta retries/idempotencia donde corresponde, deja observabilidad y no convierte fallos transientes en corrupcion o doble escritura.
- `Escalable`: evita duplicar logica por modulo/caso, crea contratos reutilizables, respeta ownership por dominio y permite crecer sin refactors inmediatos.

## Anti-patrones

Evitar por defecto:

- Fixes por endpoint, drawer o test aislado cuando existe una primitive compartida rota.
- Hardcodes de IDs, nombres, monedas, roles, fechas, rutas o tenants salvo contrato versionado.
- Fallbacks silenciosos que ocultan corrupcion, drift o falta de permisos.
- Reintentos de callbacks transaccionales ya ejecutados o acciones no idempotentes.
- Duplicar readers/helpers/components para evitar entender el canonico.
- Saltarse docs, reliability signals, audit trail o tests porque el diff es pequeno.
- Crear env vars, secretos o access paths paralelos sin documentar contrato y entornos.
- Workarounds operativos permanentes sin fecha de retiro, owner y verificacion.

## Protocolo minimo antes de escribir

Para todo cambio no trivial:

1. Identificar si el problema es sintoma local o causa compartida.
2. Buscar primitive canonica existente antes de crear una nueva.
3. Revisar task/spec, arquitectura, runtime real y handoff vigente.
4. Decidir si el fix vive en codigo, data, infraestructura, docs o una combinacion.
5. Definir blast radius y rollback.
6. Elegir la solucion mas simple que cierre causa raiz sin sobre-diseniar.

Para cambios sensibles (`finance`, `payroll`, `auth`, `billing`, `cloud`, `data`, `production`, migraciones, sync, observabilidad), este protocolo es obligatorio aunque el diff parezca chico.

## Cuando un workaround si es valido

Un workaround temporal puede aceptarse solo si cumple todo:

- El incidente requiere mitigacion inmediata.
- La solucion canonica necesita mas discovery o aprobacion.
- El workaround es reversible y tiene bajo blast radius.
- Queda documentado en `Handoff.md` y, si corresponde, en `ISSUE-###` o `TASK-###`.
- Incluye owner, fecha/condicion de retiro y verificacion.

Formato recomendado:

```md
Temporary workaround:
- Motivo:
- Riesgo que mitiga:
- Por que no es la solucion canonica:
- Owner:
- Retiro esperado:
- Verificacion:
```

## Evidencia esperada

Al cerrar una task, issue o mini-task, el agente debe dejar claro:

- Causa raiz o hipotesis validada.
- Primitive canonica reutilizada o creada.
- Por que no es un parche local.
- Validaciones ejecutadas.
- Riesgos residuales.
- Follow-up si algo queda fuera de alcance.

## Relacion con otros modelos

- `AGENTS.md` y `CLAUDE.md` contienen la regla corta obligatoria.
- `docs/tasks/TASK_PROCESS.md` aplica este modelo a execution planning.
- `docs/operations/CODEX_EXECUTION_PROMPT_V1.md` lo comprime para sesiones Codex.
- `docs/operations/ISSUE_OPERATING_MODEL_V1.md` lo aplica a incidentes.
- `docs/operations/MINI_TASK_OPERATING_MODEL_V1.md` lo usa para promover mini-tasks cuando dejan de ser locales.
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` evita duplicar este contrato en cada doc.
