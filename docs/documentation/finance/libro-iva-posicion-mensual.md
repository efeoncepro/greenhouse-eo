> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-04-21 por Codex
> **Ultima actualizacion:** 2026-06-20 por Claude (TASK-1197 — card F29 consolidado encima del de IVA)
> **Documentacion tecnica:** [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)

# Libro IVA Mensual — Debito, Credito y Saldo Fiscal

## Posicion F29 del mes (card consolidado, TASK-1197)

En el dashboard de Finanzas, **encima** del card de IVA, ahora hay un card **"Posición F29 del mes"** que resume de un vistazo las **3 líneas mensuales del F29** por entidad legal:

- **IVA** — el saldo neto (débito menos crédito) del período. Es la misma cifra del card de IVA de más abajo.
- **Retenciones** — la retención de honorarios practicada (boletas recibidas).
- **PPM** — el Pago Provisional Mensual (base de ventas netas por la tasa vigente).

Cada línea trae un sello: **"Oficial"** (cifra validada, hoy solo el IVA) o **"En validación"** (cifra en revisión contable, aún no es el F29 oficial — hoy retenciones y PPM). Si una línea todavía no tiene datos del período, muestra **"Sin datos del período"** en vez de un falso $0. El card **no recalcula nada**: solo muestra lo que ya calcularon los motores de IVA, retenciones y PPM. No se edita ni se envía el F29 al SII desde aquí.

Al pie del card hay una fila destacada **"Total F29 a pagar"** = IVA + Retenciones + PPM (TASK-1207). Si las 3 líneas están oficiales, el total es **"Oficial"**; si alguna está en validación, el total se marca **"Provisional (en validación)"** para que no lo confundas con el definitivo. Arriba a la derecha hay un **selector de período**: por default ves el **mes en curso** (etiquetado *"proyección"*, para estimar cuánto pagarás), y puedes cambiar al **mes cerrado** que estás declarando (etiquetado *"a declarar"*). Ejemplo: mayo 2026 → IVA $1.080.405 + Retenciones $134.653 + PPM $7.250 = **Total $1.222.308**.

> Detalle técnico: card `F29ConsolidatedPositionCard` que consume `GET /api/finance/f29/monthly-position` (TASK-1195) — un solo contrato gobernado que compone los 3 readers canónicos.

## Que resuelve

Greenhouse ahora puede responder de forma canonica, por tenant y por mes:

- cuanto **debito fiscal** genero por ventas
- cuanto **credito fiscal** recuperable acumulo por compras
- cuanto **IVA no recuperable** quedo separado del credito
- cual fue el **saldo fiscal** resultante del periodo

Antes, esta lectura dependia de cruces manuales entre ventas, compras y planillas externas.

## Como lo calcula el sistema

El ledger mensual no inventa reglas nuevas. Reutiliza los contratos tributarios ya persistidos en Finance:

- **Ventas / income**: usan el snapshot tributario del documento para calcular debito fiscal
- **Compras / expenses**: usan el snapshot tributario y los buckets de recuperabilidad para separar:
  - credito fiscal recuperable
  - IVA no recuperable

La posicion mensual se materializa por `space_id` y por periodo (`year`, `month`).

## Que ve Finance

La surface minima del dashboard muestra:

- **Debito fiscal**
- **Credito fiscal**
- **IVA no recuperable**
- **Saldo fiscal del periodo**
- detalle reciente del ledger
- exportacion CSV

La regla de lectura es simple:

- si el debito supera al credito, hay **IVA por pagar**
- si el credito supera al debito, hay **credito a favor**
- si ambos coinciden, el saldo queda equilibrado

## Que queda fuera del credito

El ledger no trata todo IVA de compras como credito.

- El **IVA recuperable** si suma al credito fiscal.
- El **IVA no recuperable** no suma credito y queda separado.

Eso evita mezclar impuestos capitalizados con la posicion tributaria real del mes.

## Recompute y backfill

El sistema soporta:

- recomputar un periodo puntual
- recalcular todos los periodos disponibles
- rehidratar el ledger si cambian ventas o compras ya sincronizadas

La materialización pesada corre en `ops-worker`, no en UI.

## Refresh reactivo y replay

La posición mensual no depende solo de un botón manual. Cuando Finance publica cambios relevantes en `income` o `expense`, la projection reactiva `vat_monthly_position` vuelve a materializar el período afectado.

Reglas operativas:

- el lane reactivo debe ser seguro para replay e idempotente
- el carril canónico para recomputar períodos sigue siendo `ops-worker`
- la route interna admin-safe queda como fallback/controlado, no como reemplazo del worker

Desde TASK-639, el materializer quedó endurecido para que los placeholders textuales usados en metadata y `period_id` entren tipados explícitamente y no vuelvan a caer por ambigüedad SQL al reprocesar períodos.

## Importante para Finance

- El libro IVA mensual es una lectura operativa interna y auditable.
- No reemplaza la declaracion legal ante SII.
- `vat_common_use_amount` hoy entra a traves de la recoverability persistida en compras; una prorrata tributaria mas fina queda como follow-up.
