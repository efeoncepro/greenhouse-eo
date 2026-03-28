# TASK-077 — Payroll Receipt Generation & Delivery

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `in-progress` |
| Priority | `P1` |
| Impact | `Muy alto` |
| Effort | `Alto` |
| Status real | `En progreso` |
| Rank | 3 de 4 (ejecutar después de TASK-078 y TASK-076; TASK-079 queda como follow-up si se decide mostrar preview reverse en esta superficie) |
| Domain | HR Payroll |

## Summary

Automatizar la generación de recibos de nómina (liquidaciones para Chile, payment statements para internacionales) al exportar un período, almacenarlos en GCS, hacerlos accesibles desde la ficha del colaborador y desde "Mi Nómina", y notificar por email via Resend con el PDF adjunto.

## Why This Task Exists

Hoy el sistema puede generar un recibo on-demand via `generatePayrollReceiptPdf(entryId)`, pero:

- No se genera automáticamente al exportar — HR debe descargar uno a uno
- No se almacena — se regenera cada vez (lento, sin historial)
- El formato no replica la liquidación legal chilena (falta branding, secciones formales)
- No hay versión adaptada para internacionales
- El colaborador no puede ver su propio recibo
- No se notifica al colaborador que su nómina fue procesada

La expectativa operativa es: exporto el período → se generan todos los recibos → cada persona recibe un email con su PDF → lo puede consultar después en su ficha.

## Execution Order

Esta task es la **tercera** (y última) de una cadena de 3:

```
TASK-078 → TASK-076 → TASK-077 (esta)
```

**Por qué va al final:**
- El PDF Chile necesita todos los campos legales de TASK-076 (gratificación, colación, movilización, AFP desglose, isapre desglose, costos empleador, RUT) — sin ellos la liquidación sale incompleta
- TASK-076 a su vez necesita TASK-078 (indicadores Previred synced) para calcular esos campos correctamente
- El PDF Internacional no depende de 076/078 pero se implementa junto por consistencia
- TASK-079 queda como habilitador opcional si se decide mostrar preview reverse o sueldo líquido objetivo desde esta misma superficie

**Lo que ya estará listo cuando esta task empiece:**
- Motor forward con indicadores Previred reales (TASK-078)
- Todos los campos legales en `payroll_entries`: gratificación, colación, movilización, AFP cotización/comisión, isapre obligatoria/voluntaria, costos empleador (TASK-076)
- RUT y datos bancarios en members (TASK-076)
- `payroll_entries` con datos completos y correctos para generar PDFs fidedignos

## Goal

Que al exportar un período de nómina:
1. Se genere automáticamente un PDF por cada `payroll_entry`
2. El PDF se almacene en GCS con historial de versiones
3. Cada colaborador reciba un email via Resend con el PDF adjunto
4. El recibo sea accesible desde People > Person > Nómina y desde Mi Nómina
5. El formato Chile replique una liquidación legal con branding Efeonce
6. El formato Internacional sea un payment statement profesional

## Architecture Alignment

- Fuente canónica Payroll: `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- Email transaccional: sistema Resend ya integrado en Greenhouse
- Media storage: `src/lib/storage/greenhouse-media.ts` (GCS)
- PDF engine: `@react-pdf/renderer` v4.3.2 (ya instalado)
- Generador actual: `src/lib/payroll/generate-payroll-pdf.tsx`
- Patrones Invoice: `full-version/src/views/apps/invoice/` (PreviewCard, PreviewActions)
- Email catalog: `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`

## Current Repo State

### Lo que ya existe

| Pieza | Archivo | Estado |
|-------|---------|--------|
| `@react-pdf/renderer` | `package.json` | Instalado v4.3.2 |
| `generatePayrollReceiptPdf(entryId)` | `src/lib/payroll/generate-payroll-pdf.tsx` | Funciona, formato básico |
| `generatePayrollPeriodPdf(periodId)` | mismo archivo | Reporte de período |
| `GET /api/hr/payroll/entries/[entryId]/receipt` | API route | Genera on-demand |
| `PayrollReceiptCard.tsx` | `src/views/greenhouse/payroll/` | Vista MUI inline |
| `PayrollReceiptDialog.tsx` | mismo directorio | Modal con botón descargar |
| `generatePayrollExcel()` | `src/lib/payroll/generate-payroll-excel.ts` | Export Excel |
| Resend email system | `src/lib/email/` | Integrado con React Email |
| GCS media storage | `src/lib/storage/greenhouse-media.ts` | Upload/download autenticado |
| Vuexy Invoice patterns | `full-version/src/views/apps/invoice/` | PreviewCard, PreviewActions, SendDrawer |

### Lo que NO existe

- Generación batch automática al exportar
- Storage de PDFs en GCS
- Tabla de registro de recibos
- Formato liquidación legal chilena con branding
- Formato payment statement internacional
- Email de notificación con PDF adjunto
- Acceso del colaborador a sus propios recibos

## Scope

### Slice 1 — Storage model + receipt registry

**Tabla `greenhouse_payroll.payroll_receipts`:**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `receipt_id` | TEXT PK | `receipt_{entryId}_r{revision}` |
| `entry_id` | TEXT FK | `payroll_entries.entry_id` |
| `period_id` | TEXT FK | `payroll_periods.period_id` |
| `member_id` | TEXT | Colaborador |
| `pay_regime` | TEXT | `chile` o `international` |
| `revision` | INT DEFAULT 1 | Incrementa si se re-exporta |
| `storage_path` | TEXT | Path en GCS |
| `storage_bucket` | TEXT | Bucket name |
| `file_size_bytes` | INT | Tamaño del PDF |
| `generated_at` | TIMESTAMPTZ | |
| `generated_by` | TEXT | Usuario que exportó |
| `email_sent` | BOOLEAN DEFAULT FALSE | |
| `email_sent_at` | TIMESTAMPTZ | |
| `email_recipient` | TEXT | Email del colaborador |

**GCS path convention:** `payroll-receipts/{year}-{month}/{memberId}-r{revision}.pdf`

### Slice 2 — Liquidación Chile (PDF redesign)

Rediseñar `ReceiptDocument` en `generate-payroll-pdf.tsx` para régimen Chile:

**Layout del PDF:**
```
┌─────────────────────────────────────────────────┐
│ [Logo Efeonce]    LIQUIDACIÓN DE REMUNERACIONES │
│                   Período: MARZO 2026           │
│ EFEONCE GROUP SPA                               │
│ RUT: 77.357.182-1                               │
├─────────────────────────────────────────────────┤
│ Nombre: VALENTINA SOFIA HOYOS SANCHEZ           │
│ RUT: 20.557.199-K                               │
│ Cargo: PR Analyst & Corporate Comms             │
│ Contrato: Indefinido  │  F. Ingreso: 01/09/2025│
├──────────────────────┬──────────────────────────┤
│ HABERES IMPONIBLES   │ DESCUENTOS               │
│ Renta Mensual $539k  │ AFP (cotización)  -$67k  │
│ Gratificación $134k  │ Comisión AFP      -$3k   │
│ Bono OTD      $xxx   │ Isapre           -$161k  │
│ Bono RpA      $xxx   │ Seg. Cesantía    -$4k    │
│ Total         $673k  │ Impuesto         -$0     │
│                      │ Total            -$236k  │
├──────────────────────┴──────────────────────────┤
│ HABERES NO IMPONIBLES                           │
│ Colación      $83k                              │
│ Movilización  $75k                              │
│ Total         $158k                             │
├─────────────────────────────────────────────────┤
│ TOTAL HABERES                        $832,121   │
│ TOTAL DESCUENTOS                    -$236,465   │
│ LÍQUIDO A PAGAR                      $595,656   │
├─────────────────────────────────────────────────┤
│ ASISTENCIA                                      │
│ Días trabajados: 22 │ Licencias: 0 │ Ausencias:0│
├─────────────────────────────────────────────────┤
│ ANTECEDENTES ADICIONALES                        │
│ AFP: Uno │ Isapre: Colmena │ UF: $38,726       │
├─────────────────────────────────────────────────┤
│ Efeonce Greenhouse™                             │
│ Generado: 2026-03-28 14:30                      │
└─────────────────────────────────────────────────┘
```

**Branding:**
- Logo Efeonce SVG embebido (convertir a base64 para @react-pdf)
- Paleta Greenhouse: primary #7367F0, header dark, texto DM Sans
- Footer con marca Greenhouse
- Diseño limpio, profesional, no réplica 1:1 del formato Uwigo sino versión Greenhouse del mismo contenido legal

**Dependencia:** TASK-076 para gratificación legal, colación, movilización, AFP desglose, isapre desglose. Sin esos campos el PDF Chile estará incompleto. Puede implementarse en paralelo con datos parciales y completarse post-076.

### Slice 3 — Payment Statement Internacional (PDF nuevo)

Nuevo template para `payRegime === 'international'`:

```
┌─────────────────────────────────────────────────┐
│ [Logo Efeonce]           PAYMENT STATEMENT      │
│                          March 2026             │
│ Efeonce Group SPA                               │
├─────────────────────────────────────────────────┤
│ Name: Andres Carlosama                          │
│ Role: Designer                                  │
│ Currency: USD                                   │
├─────────────────────────────────────────────────┤
│ EARNINGS                                        │
│ Base Salary                         $675.00     │
│ Remote Allowance                     $50.00     │
│ OTD Bonus (70.4% — 2% payout)        $0.21     │
│ RpA Bonus (1.6 — 100% payout)       $75.00     │
│                                                 │
│ GROSS TOTAL                         $800.21     │
│ NET PAYMENT                         $800.21     │
├─────────────────────────────────────────────────┤
│ WORKING DAYS                                    │
│ Days worked: 22/22  │  Leave: 0  │  Absent: 0  │
├─────────────────────────────────────────────────┤
│ Efeonce Greenhouse™                             │
│ Generated: 2026-03-28 14:30                     │
└─────────────────────────────────────────────────┘
```

- En inglés (colaboradores internacionales)
- Sin secciones de descuentos previsionales
- Muestra payout % de bonos variables
- Mismo branding Efeonce/Greenhouse

### Slice 4 — Generación batch al exportar

**Trigger:** Cuando `payroll_period.status` cambia a `exported`:

1. Leer todos los `payroll_entries` del período
2. Para cada entry, generar PDF (Chile o Internacional según `payRegime`)
3. Upload a GCS via `greenhouse-media.ts`
4. Registrar en `payroll_receipts`
5. Emitir evento outbox `payroll.receipts_generated`

**Implementación:**
- Nuevo servicio: `src/lib/payroll/generate-receipts-batch.ts`
- Se ejecuta como parte del flow de exportación, no como cron separado
- Si el período se re-exporta: incrementar `revision`, generar nuevos PDFs, no borrar los anteriores

**Guardrails:**
- Si la generación de un PDF falla, no bloquear la exportación — marcar como `failed` en el registro
- Timeout por PDF: 10 segundos max
- Log de generación con tiempos para monitoreo

### Slice 5 — Email via Resend con PDF adjunto

**Trigger:** Después de que el batch de PDFs se complete (`payroll.receipts_generated`):

1. Para cada receipt generado exitosamente:
   - Leer email del colaborador desde `members.primary_email`
   - Descargar PDF desde GCS (o usar buffer en memoria si batch reciente)
   - Enviar email via Resend con PDF como attachment

**Template de email (React Email):**
```
Asunto: Tu recibo de nómina — {Mes} {Año}

Hola {nombre},

Tu nómina de {Mes} {Año} ha sido procesada.
Adjunto encontrarás tu recibo de remuneraciones.

Resumen:
  Bruto: {grossTotal}
  Descuentos: {totalDeductions}
  Líquido: {netTotal}

Puedes consultar el detalle completo en tu portal Greenhouse:
[Ver mi nómina →]

Efeonce Greenhouse™
```

**Para internacionales:**
```
Subject: Your payment statement — {Month} {Year}

Hi {name},

Your payment for {Month} {Year} has been processed.
Please find your payment statement attached.

Summary:
  Gross: {grossTotal}
  Net payment: {netTotal}

View details in your Greenhouse portal:
[View my payroll →]

Efeonce Greenhouse™
```

**Registro:** Actualizar `payroll_receipts.email_sent = TRUE`, `email_sent_at`, `email_recipient`

**Guardrails:**
- No enviar email si el colaborador no tiene email
- Rate limiting: Resend tiene límites por segundo, implementar throttle si hay muchos entries
- No reenviar automáticamente si ya se envió para la misma revision

### Slice 6 — Acceso del colaborador (Mi Nómina + People)

**Mi Nómina (`/my/payroll`):**
- Lista de recibos del colaborador autenticado
- Ordenado por período (más reciente primero)
- Cada fila: período, bruto, neto, estado, botón descargar PDF
- Filtrar solo receipts del `memberId` asociado al usuario logueado

**People > Person > tab Nómina:**
- HR/admin ya ve `recentPayroll` — agregar botón "Descargar recibo" por cada entry que tenga receipt
- Usar pattern de Vuexy Invoice `PreviewActions` (Download, Print)

**API:**
- `GET /api/my/payroll/receipts` — lista de recibos del usuario autenticado
- `GET /api/my/payroll/receipts/[receiptId]/download` — descarga PDF (proxy GCS autenticado)
- `GET /api/hr/payroll/entries/[entryId]/receipt/download` — descarga por HR (ya existe parcialmente, adaptar a GCS)

### Slice 7 — Eventos y outbox

**Eventos nuevos:**

| Evento | Aggregate | Payload |
|--------|-----------|---------|
| `payroll.receipts_generated` | `payroll_period` | `{ periodId, year, month, receiptCount, failedCount }` |
| `payroll.receipt_emailed` | `payroll_entry` | `{ entryId, memberId, receiptId, email }` |

**Consumer:** `notification_dispatch` puede escuchar `payroll.receipts_generated` para notificar a HR que el batch terminó.

## Out of Scope

- Firma digital / firma electrónica avanzada
- Libro de remuneraciones electrónico (LRE)
- Integración con Previred
- Reenvío manual de emails desde UI (follow-up)
- Vista preview del PDF en el navegador (follow-up — hoy descarga directa)
- Centralización multi-empresa (múltiples RUT emisores)

## Dependencies & Impact

### Depende de
- **TASK-078** (Previsional Foundation & Forward Cutover) — provee indicadores Previred synced y motor forward con datos correctos
- **TASK-076** (Payroll Chile Liquidación Parity) — **blocker** — provee los campos legales que el PDF Chile necesita (gratificación, colación, movilización, AFP desglose cotización/comisión, isapre desglose obligatoria/voluntaria, costos empleador, RUT)
- Sistema de email Resend ya integrado (v6.9.4 con soporte de attachments)
- GCS media storage ya operativo (`src/lib/storage/greenhouse-media.ts`)
- `@react-pdf/renderer` ya instalado (v4.3.2)
- `generate-payroll-pdf.tsx` como base del generador

### Impacta a
- `/hr/payroll/periods/[periodId]` — agrega acción "Generar recibos" y status del batch
- `/my/payroll` — nueva vista de recibos del colaborador
- `/people/[memberId]` — tab Nómina muestra botón descargar recibo
- Email catalog — nuevos templates transaccionales
- Event catalog — nuevos eventos de receipts
- `TASK-079` — follow-up opcional si esta superficie expone preview reverse

### Archivos owned
- `src/lib/payroll/generate-payroll-pdf.tsx` — rediseño de templates
- `src/lib/payroll/generate-receipts-batch.ts` — nuevo batch generator
- `src/lib/payroll/receipt-store.ts` — nuevo store para payroll_receipts
- `src/app/api/my/payroll/receipts/` — nuevas rutas
- Email templates para recibo
- Migration para tabla `payroll_receipts`

## Acceptance Criteria

- [ ] Al exportar un período, se generan automáticamente PDFs para todos los entries
- [ ] PDFs se almacenan en GCS con path predecible y revision tracking
- [ ] PDF Chile replica estructura de liquidación legal con branding Efeonce + logo
- [ ] PDF Chile incluye: haberes imponibles (con gratificación), no imponibles, descuentos desglosados, antecedentes adicionales, líquido
- [ ] PDF Internacional es un payment statement en inglés con earnings + net payment
- [ ] Cada colaborador recibe email via Resend con PDF adjunto
- [ ] Email Chile en español, email Internacional en inglés
- [ ] Colaborador puede descargar sus recibos desde Mi Nómina
- [ ] HR puede descargar recibo desde People > Person > Nómina
- [ ] Si el período se re-exporta, se generan nuevos PDFs con revision incrementada
- [ ] Fallo de un PDF individual no bloquea el batch
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Verification

- Exportar un período con mix CLP + USD
- Verificar que se generaron N PDFs en GCS
- Descargar PDF Chile y contrastar contra liquidación real (Valentina)
- Descargar PDF Internacional y verificar formato
- Verificar que emails llegaron (Resend dashboard)
- Acceder como colaborador a Mi Nómina y descargar su recibo
- Re-exportar período y verificar nueva revision sin borrar la anterior
