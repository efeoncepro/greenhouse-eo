# Invariantes operativos para agentes — Payroll receipts + Legal docs/Finiquito (TASK-758…863)

---

## Invariantes operativos para agentes — Payroll receipts + Legal docs/Finiquito (TASK-758…863)

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim.** Contrato: `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (758/782), `GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md` (863 legal), `GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` (863 finiquito). Skill: `greenhouse-payroll-auditor`. Dedup = Slice 4.

### Payroll — Receipt presentation contract (TASK-758, v4 desde 2026-05-04)

Toda surface que renderice recibos individuales de Payroll **debe** consumir el helper canónico `buildReceiptPresentation` desde `src/lib/payroll/receipt-presenter.ts`. Single source of truth para la clasificación de régimen + struct declarativo de presentación + tokens visuales (badges régimen). Cierra el bug raíz `isChile = entry.payRegime === 'chile'` que afectaba a 3 de los 4 regímenes.

**API canónica**:

- `resolveReceiptRegime(entry) → 'chile_dependent' | 'honorarios' | 'international_deel' | 'international_internal'` — detector con cascade `contractTypeSnapshot` → `payrollVia === 'deel'` → `siiRetentionAmount > 0` → `payRegime === 'international'` → default `chile_dependent`.
- `buildReceiptPresentation(entry, breakdown?) → ReceiptPresentation` — struct declarativo con `employeeFields[4]`, `haberesRows`, `attendanceRows`, `deductionSection`, `adjustmentsBanner`, `infoBlock`, `manualOverrideBlock`, `fixedDeductionsSection`, `hero`. Surfaces consumen verbatim — cero lógica de régimen en componentes.
- `groupEntriesByRegime(entries) → Record<Regime, T[]>` — exportado para reuso TASK-782 (PeriodReportDocument + Excel).
- `RECEIPT_REGIME_BADGES` + `RECEIPT_REGIME_DISPLAY_ORDER` — tokens compartidos cross-task (preview MUI, PDF, period report, Excel).

**Comportamiento canónico**:

| Régimen | Bloque deducción | InfoBlock | Hero |
| --- | --- | --- | --- |
| `chile_dependent` | `Descuentos legales` (AFP split + salud obl/vol + cesantía + IUSC + APV + gratificación legal) | — | `Líquido a pagar` |
| `honorarios` | `Retención honorarios` (Tasa SII + Retención) | `Boleta de honorarios Chile · Art. 74 N°2 LIR · Tasa SII <year>` | `Líquido a pagar` |
| `international_deel` | (ninguno) | `Pago administrado por Deel` + `Contrato Deel: <id>` opcional | `Monto bruto registrado` + footnote |
| `international_internal` | (ninguno) | `Régimen internacional` | `Líquido a pagar` |
| **`excluded`** (terminal) | (omitido) | `Excluido de esta nómina — <reason>` (variant `error`) | `Sin pago este período · $0` (degraded) |

**⚠️ Reglas duras**:

- **NUNCA** ramificar render por `entry.payRegime === 'chile'` solo. Toda detección pasa por `resolveReceiptRegime`.
- **NUNCA** `font-family: monospace` en surfaces user-facing del recibo. IDs técnicos (deelContractId): `font-variant-numeric: tabular-nums` + `letter-spacing: 0.02em` sobre Geist Sans.
- **NUNCA** `font-feature-settings: 'tnum'`. Usar `font-variant-numeric: tabular-nums` (canónica V1).
- **NUNCA** `borderRadius` off-scale (3, 5, 7, 12). Usar tokens `customBorderRadius.{xs:2, sm:4, md:6, lg:8, xl:10}`.
- **NUNCA** color como única señal de estado. InfoBlock siempre lleva título + body explicativo.
- **NUNCA** lime `#6ec207` para texto sobre blanco (falla 4.5:1). Variante contrast-safe `#2E7D32` cuando emerja necesidad.
- Cualquier nuevo `ContractType` agregado en `src/types/hr-contracts.ts` requiere extender el switch de `buildReceiptPresentation` antes de mergear (compile-time `never`-check defiende esto).
- Cualquier cambio visual del PDF requiere bump `RECEIPT_TEMPLATE_VERSION` en `generate-payroll-pdf.tsx`. Lazy regen automático al próximo acceso.
- Mockup canónico vinculante: `docs/mockups/task-758-receipt-render-4-regimes.html`. Cualquier desviación visual requiere update + re-aprobación del mockup ANTES de mergear.

**Cuándo usar `getEntryAdjustmentBreakdown` + `buildReceiptPresentation`**: siempre que se renderice un recibo individual del colaborador (preview MUI, PDF, futuras superficies). El breakdown es opcional pero canónicamente recomendado para reflejar adjustments (factor reducido, manual override, exclusión).

**Spec**: `src/lib/payroll/receipt-presenter.ts` + `src/lib/payroll/receipt-presenter.test.ts` (46 tests). Doc funcional: `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` §25.b.

### Payroll — Period report + Excel disaggregation (TASK-782, desde 2026-05-04)

`PeriodReportDocument` (PDF reporte mensual) y `generate-payroll-excel.ts` (export operador-facing) **deben** consumir `groupEntriesByRegime` exportado por TASK-758. Single source of truth de clasificación de régimen across receipts (recibo individual) y reporte/export operador-facing.

**⚠️ Reglas duras**:

- **NUNCA** sumar `chileTotalDeductions` cross-régimen como subtotal único. El motor asigna `chileTotalDeductions = siiRetentionAmount` para honorarios — sumar todo bajo "Total descuentos Chile" mezcla retención SII con cotizaciones previsionales reales y rompe reconciliación contra Previred + F29.
- **Subtotales mutuamente excluyentes** son obligatorios:
  - `Total descuentos previsionales` (solo `chile_dependent`) → reconcilia con Previred.
  - `Total retención SII honorarios` (solo `honorarios`) → reconcilia con F29 retenciones honorarios.
- **Régimen column con 4 valores** (`CL-DEP`/`HON`/`DEEL`/`INT`) reusando tokens `RECEIPT_REGIME_BADGES` exportados desde `receipt-presenter.ts`. NUNCA `CL`/`INT` solo.
- **Orden canónico** vía `RECEIPT_REGIME_DISPLAY_ORDER`: chile_dependent → honorarios → international_deel → international_internal. Stable, no depende de orden alfabético.
- **Grupos vacíos se omiten completos** (divider + filas + subtotal). Excel: omitir la sheet entera si ambas secciones internas están vacías.
- **Celdas N/A llenan con `—`** (clase `dim` text-faint), NUNCA `$0`. Distinción semántica: `$0` = aplica pero monto cero; `—` = no aplica al régimen.
- **Estado `excluded`** (entries con `grossTotal === 0 && netTotal === 0`) se renderiza visible en el PDF con chip `(excluido)` inline + Base/OTD/RpA dim `—`. No se omite.
- Cualquier nueva surface operador-facing que muestre agregaciones mensuales por régimen DEBE consumir `groupEntriesByRegime` + tokens canónicos en lugar de duplicar el filter.

**Layout canónico**:

- PDF: 10 columnas `Nombre / Régimen / Mon. / Base / OTD / RpA / Bruto / Desc. previs. / Retención SII / Neto`. Summary strip ampliado a 8 KPIs con counters per-régimen. Meta row `UF / Aprobado / Tabla tributaria`.
- Excel: sheets canónicas `Resumen` (subtotales separados) + `Chile` (2 secciones internas) + `Internacional` (2 secciones internas) + `Detalle` (audit raw, preservado) + `Asistencia & Bonos` (preservado).

**Spec canónica**: `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` §25.c. Mockup vinculante: `docs/mockups/task-782-period-report-excel-honorarios-disaggregation.html`. Tests: `src/lib/payroll/generate-payroll-pdf.test.ts` + `generate-payroll-excel.test.ts` (12 tests anti-regression).

### Legal Signatures Platform invariants (TASK-863 V1.4, desde 2026-05-11)

Toda surface que renderice un documento legal firmado por el **representante legal del empleador** (finiquitos hoy; contratos, addenda, cartas formales mañana) **debe** consumir el helper canónico `@/lib/legal-signatures` para resolver la firma digitalizada. NUNCA reimplementar el resolver inline en otro flow.

**Convención de filename**: `src/assets/signatures/{taxId_normalizado}.png`. `taxId_normalizado` = `taxId` con puntos + espacios removidos (guion preservado). Efeonce SpA RUT 77.357.182-1 → `77357182-1.png`.

**API canónica** (`src/lib/legal-signatures/index.ts`):

```typescript
import {
  buildSignatureFilenameForTaxId,
  resolveLegalRepresentativeSignaturePath,
  getLegalRepresentativeSignatureAbsolutePath,
  LEGAL_SIGNATURE_BASE_DIR
} from '@/lib/legal-signatures'
```

**Path-safe protection** (4 checks defensivos):

1. Empty/null → `null` (graceful fallback)
2. `..` (path traversal) → `null`
3. Path absoluto (`/`) → `null`
4. Extensión NO en `{png, jpg, jpeg}` → `null`
5. `existsSync` falla → `null`

Si cualquier check falla, el consumer renderea la **línea de firma vacía** para firma manual presencial.

**⚠️ Reglas duras**:

- **NUNCA** reimplementar el resolver inline. Consumir `@/lib/legal-signatures`.
- **NUNCA** componer paths absolutos hardcoded. Siempre via `buildSignatureFilenameForTaxId(taxId)` + `resolveLegalRepresentativeSignaturePath`.
- **NUNCA** confiar en path strings provenientes de usuario sin pasarlos por el resolver.
- **NUNCA** usar este helper para firmas de personas naturales (trabajadores). Las firmas de trabajadores son SIEMPRE físicas presenciales (art. 177 CT).
- **SIEMPRE** dejar graceful fallback en el render si el path resuelve a `null`.
- **SIEMPRE** preservar PNG transparente con aspect ratio ~2.2-2.4:1 (recomendado 1718×734).

**Forward-compat V2**: migrar storage a asset privado canónico (`greenhouse_core.assets` con `retention_class='legal_signature'` + FK desde `organizations.legal_representative_signature_asset_id`). Misma signature pública del helper → backwards-compatible.

**Spec canónica**: `docs/architecture/GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md`. Tests: `src/lib/legal-signatures/index.test.ts` (11 tests anti-regresión).

### Finiquito V1.5 — Cláusulas legales state-conditional + auto-regeneración PDF (TASK-863, desde 2026-05-11)

Comprehensive audit enterprise por skills `greenhouse-payroll-auditor` + UX writing es-CL formal-legal + `modern-ui` cerró 5 bloqueantes legales/UI del PDF de finiquito de renuncia voluntaria post primer caso real (Valentina Hoyos):

**B-1 Cláusula PRIMERO separa hitos legales distintos** — `FiniquitoClauseParams` expone `resignationNoticeSignedAt` (firma trabajador, obligatorio) + `resignationNoticeRatifiedAt` (ratificación notarial art. 177 CT, null hasta ratificación). Copy state-conditional pre/post ratificación. Antes mezclarlas era vicio defendible en demanda chilena.

**B-2 Cláusula SEGUNDO verbo performativo state-conditional** — `FiniquitoClauseSegundoParams` expone `isRatified: boolean`. Pre-ratificación → "declara que recibirá, al momento de la ratificación..." (futuro). Post-ratificación → "declara haber recibido en este acto..." (perfecto consumado). Antes "declara recibir en este acto" sobre doc no ratificado era vicio de consentimiento.

**B-3 Cláusula CUARTO cita artículo operativo Ley 14.908** — Texto canónico: "artículo 13 de la Ley N° 14.908 sobre Abandono de Familia y Pago de Pensiones Alimenticias, en su texto modificado por la Ley N° 21.389 de 2021". Antes citaba solo la modificatoria sin operativo → jurídicamente débil.

**B-4 Simetría visual 3 columnas firma** — `signatureColumn` con `paddingTop: 36` reserva espacio simétrico arriba de la línea en las 3 columnas (empleador + trabajador + ministro de fe). `signatureImageEmployer` absoluta en `top: 0`. Las 3 líneas caen al mismo Y absoluto → balance enterprise.

**B-5 Title legal DOMINA visualmente vs KPI monto** — Title 20pt Poppins Bold + KPI 14pt Poppins SemiBold (ratio 1.43x). Antes 18pt vs 16pt era marketing pattern, no legal pattern. Notarios/abogados leen primero el ACTO, después el monto.

**Auto-regeneración canónica del PDF al transicionar** (TASK-863 V1.1): el helper privado `regenerateDocumentPdfForStatus` reemplaza `pdf_asset_id` del MISMO documento cuando transita a `issued` o `signed_or_ratified` (sin bump versión, sin reissue). Wire en `issueFinalSettlementDocumentForCase` + `markFinalSettlementDocumentSignedOrRatifiedForCase`. Idempotente: si falla render, transition ya commiteo y operador puede usar reissue.

**Matriz canónica de watermark per `documentStatus`**:

| documentStatus | Watermark |
|---|---|
| rendered / in_review / approved | "PROYECTO" warning |
| **issued / signed_or_ratified** | **CLEAN** |
| blocked | "BLOQUEADO" error |
| rejected | "RECHAZADO" error |
| voided | "ANULADO" error |
| superseded | "REEMPLAZADO" neutral |

`renderFinalSettlementDocumentPdf(snapshot, options?: { documentStatus?: string | null })` acepta documentStatus explícito. Backward-compat: callsites sin documentStatus caen al patrón inferido por `ratification + readiness`.

**⚠️ Reglas duras**:

- **NUNCA** mezclar fecha de firma del trabajador con fecha de ratificación notarial en la cláusula PRIMERO. Son 2 hitos legales distintos.
- **NUNCA** renderizar el verbo "declara recibir en este acto" cuando `documentStatus != 'signed_or_ratified'`. Usa `isRatified` para state-condicional.
- **NUNCA** citar Ley 21.389 sin el artículo operativo Ley 14.908. Citar solo la modificatoria es jurídicamente débil.
- **NUNCA** renderear la firma del empleador rompiendo simetría con las otras 2 columnas (trabajador + ministro). `paddingTop: 36` en `signatureColumn` reserva espacio simétrico.
- **NUNCA** componer KPI monto con peso visual superior al title del acto jurídico. El acto legal domina.
- **NUNCA** dejar el `pdf_asset_id` apuntando a un asset con watermark cuando `documentStatus IN ('issued', 'signed_or_ratified')`. El auto-regen lo refresca; si falla, reissue recovery.

**Spec canónica**: `docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` (Delta 2026-05-11 V1.1 + V1.4 + V1.5). Doc funcional + manual de uso: `docs/documentation/hr/finiquitos.md` + `docs/manual-de-uso/hr/finiquitos.md` (v1.3).
