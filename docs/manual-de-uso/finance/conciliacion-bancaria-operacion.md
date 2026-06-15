# Conciliacion bancaria operativa

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Ultima actualizacion:** 2026-06-15 por Codex
> **Modulo:** Finance
> **Rutas en portal:** `/finance/reconciliation`, `/finance/reconciliation/[periodId]`
> **Documentacion relacionada:** [Operacion Finance end-to-end](../../documentation/finance/operacion-finance-end-to-end.md), [Conciliacion bancaria](../../documentation/finance/conciliacion-bancaria.md), [Sugerencias asistidas de conciliacion](sugerencias-asistidas-conciliacion.md), [Caja, cobros, pagos y liquidaciones](caja-cobros-pagos-y-liquidaciones.md)

## Para que sirve

Conciliar es demostrar que los movimientos del banco estan explicados por objetos canonicos de Greenhouse: cobros, pagos, settlement legs, transferencias internas, fees, factoring u otros anchors aprobados.

Conciliacion no reemplaza el registro de documentos ni caja. Es la evidencia posterior de banco.

## Permisos funcionales

Segun el flujo, el backend exige capacidades como:

- `finance.reconciliation.declare_snapshot` para crear periodos;
- `finance.reconciliation.import` para importar cartolas;
- `finance.reconciliation.match` para matchear, deshacer match, excluir o auto-matchear;
- `finance.reconciliation.close` para cerrar periodos.

Si el boton no aparece o la API responde permiso insuficiente, no intentes SQL directo: revisa rol/capability.

## Estados principales

### Periodo

| Estado | Significado |
|---|---|
| `open` | Periodo creado, se puede importar y trabajar |
| `in_progress` | Periodo con trabajo de conciliacion activo |
| `reconciled` | Todas las filas estan resueltas y la diferencia es cero |
| `closed` | Periodo cerrado; no debe mutarse |

### Fila bancaria

| Estado | Significado |
|---|---|
| `unmatched` | Movimiento sin anchor canonico |
| `suggested` | Hay sugerencia, requiere revision humana |
| `manual_matched` | Operador confirmo match manual |
| `matched` | Match automatico o aceptado segun contrato |
| `excluded` | Se excluyo con razon operativa |

## Crear un periodo de conciliacion

1. Abre `/finance/reconciliation`.
2. Usa **Crear periodo**.
3. Selecciona instrumento/cuenta.
4. Selecciona año y mes.
5. Ingresa saldo inicial si el flujo lo solicita.
6. Agrega notas si hay contexto especial.
7. Confirma.

El sistema crea un `reconciliation_period` con ID estable basado en cuenta, año y mes. Si necesitas crear una cuenta simple desde este flujo, el drawer legacy permite hacerlo, pero para instrumentos gobernados usa `/admin/payment-instruments`.

## Importar cartola o extracto

1. Abre el detalle del periodo.
2. Usa **Importar cartola**.
3. Elige formato bancario si usas CSV.
4. Pega o carga contenido CSV, o usa modo manual.
5. Revisa preview y errores.
6. Confirma.

Formatos soportados por UI/API:

- `bci`;
- `banco_estado`;
- `santander`;
- `scotiabank`;
- `generic`.

El endpoint valida fecha, descripcion y monto. El limite operativo del import es 500 filas por request. Las filas quedan en `bank_statement_rows` con fingerprint/import batch para evitar duplicidad.

## Revisar candidatos

En el detalle del periodo, cada fila bancaria puede buscar candidatos. La API `/candidates` filtra por tipo:

- `income`;
- `expense`;
- `all`.

Tambien usa ventana de dias y busqueda por texto. Por defecto, el rango operativo esta orientado a movimientos cercanos al extracto, no a cazar historicos arbitrarios.

Antes de confirmar un match, revisa:

- monto;
- moneda;
- fecha de banco vs fecha efectiva;
- counterparty;
- referencia externa;
- instrumento;
- si el movimiento corresponde al payment o a un settlement leg.

## Confirmar match manual

1. Abre la fila bancaria.
2. Revisa candidatos.
3. Selecciona tipo de anchor: income/expense o payment/settlement leg cuando aplique.
4. Confirma solo si la evidencia calza.

El backend:

- verifica que el periodo sea mutable;
- resuelve el target canonico;
- bloquea targets ya reconciliados en otro lado;
- actualiza el row bancario;
- enlaza el payment o settlement leg;
- marca la fila como `manual_matched`.

## Deshacer match

Usa `unmatch` cuando confirmaste un anchor incorrecto. Esto libera la fila bancaria y baja el estado reconciliado del objeto enlazado segun corresponda. No borra el pago ni el documento.

## Excluir fila

Usa `exclude` solo cuando el movimiento no debe participar del cierre del periodo o corresponde a una excepcion gobernada. Debe existir razon operativa. No uses exclusion para esconder diferencias que si requieren documento, payment o settlement.

## Auto-match

El auto-match calcula candidatos por score. Puede:

- confirmar matches de alta confianza segun reglas;
- dejar sugerencias que requieren revision;
- mantener filas unmatched si no hay evidencia suficiente.

El auto-match period-scoped vive bajo `/api/finance/reconciliation/[id]/auto-match`. Tambien existe un auto-match continuo por rango, pero debe respetar cuenta/instrumento para evitar cruces entre cuentas.

## Sugerencias asistidas por AI

Las sugerencias AI ayudan a priorizar revision. No alteran saldos, no pagan, no crean documentos y no cierran periodos por si solas.

El operador debe:

1. Generar o revisar sugerencias.
2. Leer evidencia y rationale.
3. Aceptar solo si el match es correcto.
4. Rechazar si hay duda o si falta soporte.

La tabla runtime es `greenhouse_finance.reconciliation_ai_suggestions`. Si el ambiente no tiene sugerencias, Nexa debe decir que la capacidad existe pero no inventar resultados.

## Marcar periodo como reconciliado

Solo procede si:

- la cartola fue importada;
- existen filas bancarias;
- no quedan filas `unmatched` ni `suggested`;
- la diferencia entre banco y sistema es cero;
- no hay drift critico pendiente.

El backend rechaza `reconciled` si estas condiciones no se cumplen.

## Cerrar periodo

Solo se puede cerrar un periodo que ya esta `reconciled`. Cerrar emite evento de periodo cerrado y protege el periodo contra mutaciones ordinarias.

No cierres un periodo para "silenciar" diferencias. Si hay diferencia, se resuelve antes con match, settlement, ajuste gobernado o exclusion justificada.

## Archivar periodos de prueba

Si un periodo fue creado para prueba, usa la accion de archivado si la UI la ofrece. Debe haber razon suficiente y no debe usarse sobre periodos cerrados productivos. Archivar no equivale a borrar historia financiera.

## Que hace automatico Greenhouse

- Calcula candidatos de match.
- Controla duplicidad de import.
- Mantiene estados de filas.
- Enlaza rows bancarios con pagos o settlement legs.
- Publica eventos cuando un periodo pasa a `reconciled` o `closed`.
- Expone contexto bridge con snapshot, evidencia, drift y siguiente accion.
- Bloquea cierre antes de reconciliar.

## Que decide el operador

- Que extracto corresponde al periodo.
- Si un candidato explica realmente el movimiento.
- Si una sugerencia AI es aceptable.
- Si una fila debe excluirse y por que.
- Si un periodo esta listo para reconciliar y cerrar.

## Problemas comunes

### "No puedo marcar reconciliado"

Revisa si quedan filas `unmatched` o `suggested`, si la cartola fue importada, si hay diferencia distinta de cero o si el periodo esta cerrado.

### "El candidato correcto no aparece"

Puede estar fuera de ventana, sin instrumento, ya reconciliado, en otro tipo de anchor o registrado como settlement leg. Revisa caja y Banco antes de forzar.

### "El banco muestra fee separado"

No matchees todo contra el documento base. Usa o registra settlement leg de fee.

### "El processor aparece en el texto del banco"

Processor no es necesariamente cuenta. Revisa source account/funding instrument y settlement legs.

### "Hay un movimiento historico duplicado"

No lo borres. Usa patrones de supersede/dismiss canonicos si existen para phantoms historicos, con razon y audit.

## Que no hacer

- No crear income/expense solo para cuadrar una fila bancaria sin entenderla.
- No marcar como reconciliado con rows pendientes.
- No aceptar sugerencias AI sin revisar evidencia.
- No cerrar periodos con diferencia distinta de cero.
- No usar exclusion para ocultar errores de registro.
- No editar `bank_statement_rows` directo.

## Referencias tecnicas utiles

- `src/app/api/finance/reconciliation/route.ts`
- `src/app/api/finance/reconciliation/[id]/route.ts`
- `src/app/api/finance/reconciliation/[id]/statements/route.ts`
- `src/app/api/finance/reconciliation/[id]/candidates/route.ts`
- `src/app/api/finance/reconciliation/[id]/match/route.ts`
- `src/app/api/finance/reconciliation/[id]/unmatch/route.ts`
- `src/app/api/finance/reconciliation/[id]/exclude/route.ts`
- `src/app/api/finance/reconciliation/[id]/auto-match/route.ts`
- `src/views/greenhouse/finance/ReconciliationView.tsx`
- `src/views/greenhouse/finance/ReconciliationDetailView.tsx`
- `src/views/greenhouse/finance/drawers/ImportStatementDrawer.tsx`
- `src/lib/finance/postgres-reconciliation.ts`
