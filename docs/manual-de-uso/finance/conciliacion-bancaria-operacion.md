# Conciliacion bancaria operativa

> **Tipo de documento:** Manual de uso
> **Version:** 1.2
> **Creado:** 2026-06-15 por Codex
> **Ultima actualizacion:** 2026-09-10 por Claude (TASK-1858 Slice 3: rutina mensual de cierre bancario y decisión sobre facturas Nubox)
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
3. Elige la pestaña según lo que tengas:
   - **Archivo del banco** (recomendado): adjunta el export tal cual lo entrega el banco. Greenhouse detecta el
     layout solo; si prefieres, elige el origen en el selector. Para los estados de cuenta en PDF (tarjeta
     Santander, Cuenta Vista Banco de Chile) abre el PDF, selecciona todo el texto y pégalo.
   - **Pegar CSV**: pega el contenido y elige el formato (`santander`, `bci`, `bancochile`, `scotiabank`).
   - **Ingreso manual**: fila por fila.
4. Confirma. Verás cuántas filas entraron y cuántas se omitieron por estar repetidas.

Orígenes soportados en la pestaña **Archivo del banco**:

| Origen | Cómo obtenerlo | Qué trae |
|---|---|---|
| Santander — cartola cuenta corriente (XLSX) | Office Banking → Cuentas → Cartolas históricas o Cartola provisoria → Exportar Excel. Sirve para CLP y USD. | Movimientos del período, N° documento, saldo inicial y final |
| Santander — últimos movimientos tarjeta (XLSX) | Office Banking → Tarjetas → Últimos movimientos → Exportar Excel | Cargos no facturados desde el último cierre de ciclo |
| Santander — estado de cuenta tarjeta (texto del PDF) | PDF mensual (clave: RUT sin DV) → seleccionar todo → pegar | Cargos y pagos del ciclo, cupo utilizado |
| Global66 — movimientos de cuenta (XLS) | empresas.global66.com → Cuenta CLP/MXN → Movimientos → Descargar | Todos los movimientos del rango; el fee de tipo de cambio viene como fila aparte |
| Banco de Chile — estado de cuenta Cuenta Vista (texto del PDF) | Correo mensual «Cartola Cuenta Vista Mensual» (clave: 4 últimos dígitos del RUT del titular sin DV) → seleccionar todo → pegar | Movimientos con saldo running, saldo inicial y final |

Reglas:

- El monto siempre va con signo de caja: abono positivo, cargo negativo. En tarjetas de crédito un cargo es
  negativo y un pago a la tarjeta (`MONTO CANCELADO`) es positivo.
- Dos movimientos idénticos el mismo día se conservan los dos (son dos movimientos reales). Reimportar el mismo
  archivo no duplica nada.
- Límite operativo: 500 filas por import y 5 MB por archivo.
- El período de una tarjeta de crédito es el ciclo de facturación (ej. 06/08–07/09), no el mes calendario.

### Importar desde la terminal (agentes y recuperaciones)

Cuando hay varias cuentas o meses seguidos, el camino canónico es la CLI, que usa los mismos commands que el
portal:

```bash
pnpm finance:import-statement --account santander-clp --year 2026 --month 8 \
  --file data/bank/Santander-CLP-Agosto-CartolaHistCtaCte-000092044661-0030-20260910.xlsx \
  --create-period --auto-match
```

- `--dry-run` muestra las filas parseadas y los saldos del origen sin escribir nada. Úsalo siempre la primera vez.
- `--from/--to` recorta un export largo (Global66 entrega todo el histórico) al mes del período.
- `--file …pdf` extrae el texto con `pdftotext` (Poppler); `--pdf-password` recibe la clave del PDF.
- `--create-period` crea el período si no existe; el saldo inicial sale de la OTB o del cierre anterior.
- Los archivos viven en `data/bank/` (ignorado por git): no los subas al repositorio.

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

## Conciliar con un plan (filas que el auto-match no resuelve)

Cuando una fila no tiene contraparte en Greenhouse (transferencia entre cuentas propias, cuota de crédito,
impuesto, cargo de tarjeta a un proveedor sin factura, desembolso de un crédito, nómina internacional vía
Global66, honorarios pagados brutos, un cobro sin ingreso registrado), el objeto canónico se crea con un plan
declarativo:

```bash
pnpm finance:reconcile-rows --plan scripts/finance/reconciliation-plans/2026-08-09.json          # reporte
pnpm finance:reconcile-rows --plan scripts/finance/reconciliation-plans/2026-08-09.json --apply  # escribe
```

Cada entrada del plan identifica la fila (período, fecha, monto, glosa) y declara qué es:
`internal_transfer`, `pay_expense` (paga una factura ya registrada), `honorarios_gross_paid` (honorarios
pagados brutos sin retener: neto sobre la nómina + remanente anclado al entry), `income_receipt` (cobro; crea el
ingreso si no existe, ej. comisiones), `loan_installment`, `tax`, `bank_fee`, `card_expense`,
`factoring_inflow`, `international_payroll`, `fx_conversion`, `loan_disbursement`, `link_existing_payment`,
`link_existing_leg` (la contraparte ya existe) o `skip` con la razón. El CLI crea el objeto con el mismo
command que usa el portal y deja la fila como `manual_matched`.

- Reejecutar el plan es seguro: sólo trabaja sobre filas sin calce.
- Si un monto bancario no coincide con lo que registró Payroll, no lo fuerces: `skip` con razón y escala.
- Después de aplicar, rematerializa saldos y compara con el saldo final de la cartola:
  `pnpm finance:rematerialize-balances --account <cuenta>`.

## Recibos de Deel pagados con tarjeta personal del accionista

Cuando Deel se paga con la tarjeta personal (*1879) y no con un instrumento de la empresa, el registro va a la
cuenta corriente accionista: `pnpm finance:record-deel-receipts --plan scripts/finance/reconciliation-plans/deel-<periodo>.json --apply`.
Cada recibo paga el expense de nómina del entry (en USD, método `shareholder_personal_card`) y deja las fees de
Deel como gasto aparte anclado a la herramienta. Los recibos salen del zip «Payment Statement REC-…» de Deel.

## Honorarios pagados antes de que llegara la boleta

Si la transferencia ya salió del banco y el payable del contractor quedó en `pending_readiness` por
`invoice_asset_missing`, no se crea nada nuevo: `pnpm finance:contractor-settle --payable <cpay-…> --attach <boleta.pdf> --folio N --issued AAAA-MM-DD --ready`,
esperar unos minutos a que el ops-worker cree la obligación, y luego
`--pay --source-account <cuenta> --paid-at <fecha del banco> --approver <otro usuario>` (maker-checker). La fila
bancaria se vincula después con `link_existing_payment` en el plan.

## Recuperar un mes sin cartola (re-anclaje)

Si pasaron meses sin conciliar, no reconstruyas: declara una OTB con el saldo real del banco al inicio del primer
mes que sí vas a conciliar y sigue desde ahí.

```bash
pnpm finance:declare-otbs --file scripts/finance/otb-declarations/2026-08-reanchor.json --declared-by <userId>
pnpm finance:rematerialize-balances --account santander-clp
```

- El saldo de la OTB es el **saldo inicial** de la cartola del mes (saldo al inicio del día genesis). Para
  tarjetas de crédito usa el cupo utilizado al cierre de ciclo y el día del cierre como genesis.
- Todo lo anterior al genesis queda superseded automáticamente; los documentos (facturas, nómina) no se borran.
- Registra la evidencia (`evidenceRefs`) apuntando al archivo de `data/bank/` que respalda el saldo.

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

## Rutina mensual de cierre bancario (checklist)

Se corre en los primeros dias habiles del mes siguiente, cuenta por cuenta. El orden importa: primero se importa
todo, despues se calza, al final se declara el cierre. Nada se fuerza: lo que no calza se escala.

**1. Reunir las fuentes** (todo a `data/bank/`, que git ignora; nunca al repositorio):

| Cuenta (`account_id`) | Fuente mensual | Formato del adapter | Clave del archivo |
|---|---|---|---|
| Santander CLP (`santander-clp`) | Cartola historica cuenta corriente (N° correlativo del mes) | XLSX del portal Santander Empresas (`santander_cartola_xlsx`) | — |
| Santander USD (`santander-usd-usd`) | Cartola historica cuenta corriente USD | XLSX del mismo portal (`santander_cartola_xlsx`) | — |
| Santander Corp TC (`santander-corp-clp`) | Estado de cuenta del ciclo (correo) + «Ultimos movimientos» del ciclo en curso | PDF (`santander_tc_estado_cuenta_text`) · XLSX (`santander_tc_movimientos_xlsx`) | RUT de la empresa sin DV |
| Global66 CLP (`global66-clp`) y MXN (`global-66-mxn-mxn`) | Extracto historico de movimientos por wallet | XLS exportado desde la app (`global66_xls`); recortar al mes con `--from/--to` | — |
| Banco de Chile Cuenta Vista (`banco-chile-clp`) | «Cartola Cuenta Vista Mensual» (correo del banco) | PDF (`bancochile_cuenta_vista_text`) | 4 ultimos digitos del RUT de la empresa sin DV |
| CCA accionista (`sha-cca-julio-reyes-clp`) | Recibos Deel pagados con la tarjeta personal + transferencias «Transf a Julio Reyes» de Santander CLP | Se registran con `pnpm finance:record-deel-receipts`; los reembolsos entran por el plan (`internal_transfer`) | — |

**2. Importar y calzar**, siempre con `--dry-run` la primera vez:

```bash
pnpm finance:import-statement --account <cuenta> --year <AAAA> --month <M> \
  --file data/bank/<archivo> --create-period --auto-match --dry-run
pnpm finance:import-statement --account <cuenta> --year <AAAA> --month <M> \
  --file data/bank/<archivo> --create-period --auto-match
```

**3. Plan** para lo que el auto-match no resuelve: un archivo por mes en
`scripts/finance/reconciliation-plans/<AAAA-MM>.json`, primero como reporte y despues con `--apply` (ver
«Conciliar con un plan»).

**4. Rematerializar y comparar**: `pnpm finance:rematerialize-balances --account <cuenta>`. El cierre del ultimo
dia debe calzar con el saldo final de la cartola (CLP al peso; USD/MXN con ±0,05). En `/admin/operations` la
senal `finance.account_balances.fx_drift` debe quedar en 0 (desde TASK-1858 vigila tambien USD/MXN).

**5. Declarar el cierre**: marcar el periodo como `reconciled` en el portal. `closed` solo cuando contabilidad
(Nubox) cerro el mes.

**6. Que escalar (no forzar)**: una diferencia mayor que la tolerancia entre ledger y cartola; un movimiento sin
contraparte que no encaja en ningun tipo del plan; un monto de nomina u honorarios que no coincide con lo que
registro Payroll (se escala a Payroll, no se corrige desde Finance); un cargo bancario recurrente nuevo; un
cambio del saldo del CCA sin recibo Deel que lo respalde.

**Decision sobre proveedores con factura Nubox (`EXP-NB-*`) — 2026-09-10, TASK-1858 Slice 3.** Los pagos a
proveedores cuya factura llego por Nubox **no se calzan automaticamente**. El auto-match solo propone
contrapartes que ya tienen movimiento de caja (pagos e ingresos registrados, settlement legs); una factura
`pending` no es un pago, y calzarla directo dejaria la fila conciliada sin `expense_payment`, con el saldo del
banco sin rebajar y la factura todavia pendiente. Siguen por plan con `pay_expense` (fila del banco →
`recordExpensePayment` en la moneda de la factura), que crea el pago y calza la fila en el mismo acto. Si el
volumen crece, la extension canonica es una sugerencia «pagar y calzar» en el drawer del periodo (mismo
command), nunca un auto-match sobre facturas sin pagar.

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
