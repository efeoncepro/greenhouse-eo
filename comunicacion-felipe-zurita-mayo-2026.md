# Comunicación a Felipe Zurita — Boleta honorarios mayo 2026

> **Operativo**: People Ops / HR (NO automatizado).
> **Calculado**: Greenhouse runtime (TASK-893 V1 + TASK-895 V1.1a SHIPPED 2026-05-16).
> **Fuente**: `/hr/payroll/projected?year=2026&month=5` con flags ON producción.
> **Verificado**: smoke staging factor=0.619 grossTotal=$402,381 (idéntico a producción).

---

## Datos de cálculo canónicos

| Concepto | Valor |
| --- | --- |
| Período trabajado | 13 al 31 de mayo 2026 |
| Días hábiles del mes (mayo 2026) | 21 |
| Días hábiles efectivamente trabajados | 13 |
| Factor de prorrateo | 13 / 21 = 0.6190476 |
| Régimen | Honorarios CL |
| Contrato base | $650,000 CLP/mes |
| **Bruto proporcional** | **$402,381 CLP** (650,000 × 0.6190476) |
| Tasa retención SII (Art 74 N°2 LIR, honorarios 2026) | 15.25% |
| **Retención SII** | **$61,363 CLP** |
| **Líquido a pagar Felipe** | **$341,018 CLP** |

---

## Mensaje canónico (Slack / Email)

Asunto: **Tu boleta de honorarios — mayo 2026 (período proporcional)**

---

Hola Felipe,

Bienvenido al equipo Efeonce. Como ingresaste mid-month (13 de mayo), tu nómina de mayo 2026 se paga proporcional a los días hábiles efectivamente trabajados — no por el mes completo.

**Datos para emitir tu boleta de honorarios en SII**:

- **Período trabajado**: 13 al 31 de mayo 2026
- **Monto bruto a facturar**: **$402,381 CLP** (no $650,000)
- **Concepto sugerido**: "Servicios prestados período 13 al 31 de mayo 2026"
- **Retención SII**: $61,363 CLP (el SII la calcula automáticamente al ingresar el bruto)
- **Líquido que recibirás**: $341,018 CLP

**Por qué este monto y no el contrato completo**:

El SII cruza electrónicamente cada mes tu boleta DTE 41 con la retención que Efeonce declara en F29. Si emites por $650,000 cuando Efeonce declara retención sobre $402,381, el SII detecta inconsistencia y emite notificación automática a ambas partes.

**Próximos meses**:

A partir de junio 2026, tu boleta será por el contrato completo de $650,000 (asumiendo trabajo full-month sin cambios).

**Cómo emitir**:

1. Entra a sii.cl → Servicios online → Boletas de honorarios electrónicas
2. Emisor: tu RUT
3. Receptor: Efeonce SpA (RUT 77.357.182-1)
4. Monto bruto: **$402,381**
5. Concepto: "Servicios prestados período 13 al 31 de mayo 2026"
6. El SII calcula automáticamente la retención del 15.25% = $61,363

Cualquier pregunta, escribimos. Cuando emitas, mándanos el comprobante PDF para verificar antes del cierre del período.

Saludos,
People Ops Efeonce

---

## Verificaciones HR pre-aprobar período mayo (canonical TASK-893)

Cuando hagas el cierre del período mayo 2026 en `/hr/payroll`:

1. **Confirmar bruto en `payroll_entries.gross_total`** para Felipe = **$402,381** (no $650,000).
2. **Confirmar `siiRetentionAmount`** = **$61,363** (15.25% × 402,381).
3. **Antes de exportar a F29** (declaración mensual SII retenciones), verificar que Felipe haya emitido la boleta por exactamente $402,381.

> **Nota Previred**: Felipe NO va por Previred. Previred (AFP + Salud + Cesantía + SIS + Mutual + Gratificación) es exclusivo para trabajadores **dependentes CL** bajo Código del Trabajo (`contract_type IN ('indefinido','plazo_fijo')`). Felipe es honorarios → emite boleta DTE 41 + Efeonce declara la retención del 15.25% en F29 mensual. Sin cotizaciones previsionales.

Si Felipe emite por $650,000 (full-month) por error:
- Pedir anulación de boleta vía sii.cl
- Pedir re-emisión por $402,381
- NO ajustar `siiRetentionAmount` manualmente en `payroll_entries` para cuadrar — el SII detectaría drift permanente

Doc canónico operativo: `docs/manual-de-uso/hr/boletas-honorarios-mid-month.md`.

---

## Trazabilidad técnica

- Compensation version: `e603fade-b262-43d3-896f-09f04dd6ddd7_v1`
- `effective_from`: 2026-05-13
- `effective_to`: null (open-ended)
- contract_type: `honorarios`
- pay_regime: `chile`
- payroll_via: `internal`
- Resolver TASK-893: `PayrollParticipationWindow.policy='prorate_from_start'`, `prorationFactor=0.6190476190476191`, `reasonCodes=['entry_mid_period']`
- Production deployment: SHA `596b61be0d3e91e918b9ad56493a77d4fa5bcc12` (2026-05-16 15:50 UTC)
- Flags activas Vercel Production:
  - `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true`
  - `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true`
  - `LEAVE_PARTICIPATION_AWARE_ENABLED=true`
