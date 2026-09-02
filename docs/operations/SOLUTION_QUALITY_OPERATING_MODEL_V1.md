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
- Guardas de regresion que afirman la FORMA TEXTUAL del codigo (el string de un `ORDER BY`, un conteo de ocurrencias en un YAML, una linea de `deploy.sh`) en vez de ejercitar el comportamiento. Fallan en las dos direcciones y las dos en silencio: verdes con el defecto puesto, o rojas con la mejora puesta. Detalle y forma canonica en `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` seccion 7.

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

## Confirmar un hallazgo grave antes de reportarlo

Un hallazgo grave (`develop esta detras de main`, `esta ruta no esta cubierta`, `este flag nunca se
prendio`) se confirma con un **metodo distinto** antes de escribirlo en cualquier parte. La primera
medicion puede venir corrompida sin emitir error, y el sintoma es indistinguible de un hallazgo real.

Trampa medida el 2026-08-29 en este workspace: el shell es **zsh**, donde `$var` seguido de `:` y una
ruta se lee como un **modificador de historia** y se come parte del path **sin fallar**.

```bash
ref=origin/main
echo "$ref:src/lib/growth/seo/work-queue/materialize.ts"   # -> origin/maink-queue/materialize.ts
```

Produjo un `grep -c` en cero que casi se reporta como `develop esta detras de main`. Lo desmintio
comparar por **hash de blob**: `git rev-parse "origin/main:<path>"` y `git rev-parse
"origin/develop:<path>"` dieron identicos.

Detalle verificado, para no sobre-generalizar la regla:

- Dispara solo con la variable **sin llaves**. `"${ref}:src/..."` salio intacto en la misma prueba.
- Dispara solo cuando la ruta empieza con una letra que zsh lee como modificador. Medidas una por
  una: `a c e h l q r s t u` corrompen; el resto de las minusculas pasan intactas. Por eso
  `$ref:src/...` y `$ref:services/...` se rompen y `$ref:docs/...` o `$ref:migrations/...` no. El
  caso `a` es el mas enganioso: reescribe el ref como ruta absoluta del cwd.
- Formas seguras: ruta literal entre **comillas simples**, `${var}` con llaves, o comparar por hash
  en vez de por contenido.

Familia conocida: en zsh tampoco se puede nombrar `status` a una variable de shell (es read-only y
colisiona con `$?`), y asignarla mata procesos en background sin traza clara. Las dos comparten el
modo de falla: **la herramienta obedece a medias y reporta exito.**

Regla: **NUNCA** reportes un hallazgo grave sostenido por una sola medicion cuando el metodo pudo
haber fallado en silencio. Confirmalo por otra via y, al reportarlo, di con que lo mediste.

## Relacion con otros modelos

- `AGENTS.md` y `CLAUDE.md` contienen la regla corta obligatoria.
- `docs/tasks/TASK_PROCESS.md` aplica este modelo a execution planning.
- `docs/operations/CODEX_EXECUTION_PROMPT_V1.md` lo comprime para sesiones Codex.
- `docs/operations/ISSUE_OPERATING_MODEL_V1.md` lo aplica a incidentes.
- `docs/operations/MINI_TASK_OPERATING_MODEL_V1.md` lo usa para promover mini-tasks cuando dejan de ser locales.
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` evita duplicar este contrato en cada doc.
