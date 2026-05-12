# Finiquitos Chile

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.3
> **Creado:** 2026-05-04 por Codex
> **Ultima actualizacion:** 2026-05-11 por Claude (TASK-863 V1.5 — comprehensive audit post-emisión + firma reusable)
> **Documentacion tecnica:** [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md) · [GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md](../../architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md) · [GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md](../../architecture/GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md)

## Delta TASK-863 V1.1-V1.5 (2026-05-11) — Hardening enterprise post-primer emisión real

Después del primer caso real (Valentina Hoyos, ofboarding `EO-OFF-2026-45EC8688`), 5 iteraciones (V1.1 a V1.5) cerraron 12 hallazgos visuales + 5 bloqueantes legales detectados por audit comprehensive.

### V1.1 — Auto-regeneración del PDF al emitir

Cuando el operador transita el documento a "Listo para firma" (`issued`) o registra ratificación (`signed_or_ratified`), el PDF persistido se **regenera automáticamente** con el nuevo estado:

- En `issued` → PDF sin watermark "PROYECTO", listo para llevar al notario.
- En `signed_or_ratified` → PDF con bloque de ministro de fe poblado (nombre, RUT, notaría, fecha).

No requiere acción manual del operador (no necesita "Reemitir"). El `pdf_asset_id` del documento apunta automáticamente al nuevo asset; el viejo queda en audit trail.

### V1.2-V1.3 — Polish visual enterprise

- Watermark canónico per estado del documento (matriz declarativa).
- Tipografía Geist + Poppins (ligaduras "fi" funcionan, antes "frma"/"defnitivo"/"ratifcada").
- User-id técnico (`user-efeonce-admin-julio-reyes`) removido del texto legal de cláusulas → "registrada con sello digital".
- Footer auditoría en banda única (sin overlap visual), metadata técnica + brand Greenhouse balanceados.
- Cláusula CUARTO (pensión alimentos) usa `wrap={false}` → no se divide entre páginas.
- 3 columnas de firma con líneas de ancho real.

### V1.4 — Firma del representante legal como recurso canónico reusable

Las firmas digitalizadas viven en `src/assets/signatures/{taxId_normalizado}.png` (ej. `77357182-1.png` para Efeonce SpA). Resueltas via helper canónico `@/lib/legal-signatures`. **Reusable** por cualquier flow legal futuro:

- Finiquitos (hoy)
- Contratos de trabajo (futuro)
- Adenda contractuales (futuro)
- Cartas formales de la empresa (futuro)
- Certificados de servicio (futuro)

Si el archivo no existe → línea queda vacía para firma manual (graceful fallback). Path-safe (rechaza traversal, paths absolutos, extensiones invalid).

> **Spec dedicada:** [GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md](../../architecture/GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md).

### V1.5 — 5 bloqueantes legales/UI cerrados post-audit comprehensive

Audit enterprise por 3 skills (`greenhouse-payroll-auditor` + UX writing es-CL formal-legal + `modern-ui`) detectó 5 bloqueantes que separaban "se puede emitir" de "se puede llevar al notario sin riesgo legal":

| Bloqueante | Cambio |
|---|---|
| **B-1 Cláusula PRIMERO** | Separa fecha de firma del trabajador (`resignationNoticeSignedAt`) de fecha de ratificación notarial (`resignationNoticeRatifiedAt`). Antes las mezclaba → vicio legalmente defendible. |
| **B-2 Cláusula SEGUNDO** | Verbo performativo `isRatified`-conditional. Pre-ratificación: "declara que recibirá, al momento de la ratificación...". Post-ratificación: "declara haber recibido en este acto...". Evita vicio de consentimiento en documentos draft. |
| **B-3 Cláusula CUARTO** | Cita el **artículo operativo**: "artículo 13 de la Ley N° 14.908 sobre Abandono de Familia y Pago de Pensiones Alimenticias, en su texto modificado por la Ley N° 21.389 de 2021." Antes solo citaba la modificatoria. |
| **B-4 Simetría firmas** | Las 3 columnas (empleador + trabajador + ministro de fe) ahora tienen el mismo espacio reservado arriba de la línea. Firmas/líneas caen al mismo Y absoluto → balance enterprise. |
| **B-5 Jerarquía title vs KPI** | Title "Finiquito de contrato de trabajo" 20pt domina; KPI $monto 14pt sutil. Antes competían visualmente (marketing pattern). Notarios leen primero el ACTO, después el monto. |

### Verdict final

✅ Documento V1.5 está listo para uso productivo con clientes reales. Recomendación pre-emisión: 1 sesión con abogado laboralista chileno (~1h) para validar las 3 interpretaciones legales (B-1/B-2/B-3) — citas exactas + verbos performativos + separación de hitos legales.

## Delta TASK-863 (2026-05-11) — UI completa para pre-requisitos

Los 2 pre-requisitos del finiquito de renuncia (`resignation_letter_uploaded` + `maintenance_obligation_declared`) ahora viven canonicamente en la UI de `HrOffboardingView`. Antes eran solo endpoints HTTP — el operador HR debia llamarlos via DevTools. Cierra el contrato "UI runtime cubre los happy paths del modulo".

Surfaces nuevas en la columna **Finiquito laboral** de la tabla de casos (`/hr/offboarding`):

- 2 chips de estado por caso `resignation`: carta de renuncia (verde/rojo) + pension alimentos (verde Alt A / ambar Alt B con monto / rojo si pendiente).
- 2 botones que abren dialogs modales:
  - **Subir carta de renuncia** — `GreenhouseFileUploader` (PDF/JPG/PNG/WEBP max 10 MB) → POST `/api/hr/offboarding/cases/[caseId]/resignation-letter` con `{ assetId }`.
  - **Declarar pension alimentos** — RadioGroup Alt A/B + validation cliente Alt B (amount > 0 + beneficiary required) + evidence asset opcional → POST `/api/hr/offboarding/cases/[caseId]/maintenance-obligation` con shape canonico.
- Boton **Calcular** gated client-side: `disabled` con `Tooltip` explicativo cuando algun pre-requisito falta. Backend sigue rechazando con 409 readiness blocked (defense in depth).

Asset catalog extendido (TASK-863 Slice 0):

- Nuevos contexts: `resignation_letter_ratified_draft` (uploader-visible) + `resignation_letter_ratified` (attached state). Retention class `final_settlement_document`. Bucket prefix `resignation-letters`. `canUploadForContext`: HR route_group + EFEONCE_ADMIN (no member-only).
- Reuso de `evidence_draft` para evidencia opcional RNDA en maintenance obligation.

NO se tocaron endpoints backend (TASK-862 Slice C ya los canonizaba). NO se agregaron outbox events (los 2 endpoints ya escriben `resignation_letter_linked` + `maintenance_obligation_declared` en `work_relationship_offboarding_case_events`).

## Delta TASK-862 (2026-05-11) — V1 closing

V1 del finiquito de renuncia voluntaria se cerro como documento legalmente ratificable ante ministro de fe:

- **Engine emite 9 componentes** (antes 4): se agregan `monthly_gratification_due` (modo anual_proporcional, tope art. 50 CT 4,75 IMM/12), `used_or_advanced_vacation_adjustment` (vacaciones tomadas por adelantado) y `payroll_overlap_adjustment` (linea informativa). El feriado se separa en `pending_vacation_carryover` (anios anteriores) + `proportional_vacation_current_period` (anio en curso).
- **PDF legal completo**: clausulas narrativas PRIMERO-QUINTO + Ley Bustos (art. 162 inc. 5 CT) + banner Ley 21.389 pension de alimentos (Alt A no afecto / Alt B afecto) + reserva de derechos block + 3 firmas (empleador / trabajador + huella / ministro de fe) + watermark "PROYECTO" interno (CLEAN cuando se imprime para el notario) + logo del empleador + monto en letras + Greenhouse en footer utility.
- **Pre-requisitos enforced** por buildDocumentReadiness: carta de renuncia ratificada subida como asset (blocker) + declaracion Ley 21.389 (blocker) + domicilio del trabajador resuelto desde TASK-784 (warning).
- **HrOffboardingView sign-or-ratify dialog real**: captura datos canonicos del ministro de fe (notario / inspector / sindicato / Registro Civil) + reserva de derechos del trabajador con transcripcion manuscrita. Reemplaza el placeholder `external_process_placeholder`.
- **Tipografia migrada** a Geist + Poppins (DESIGN.md canon; DM Sans deprecated).
- **Activacion en produccion**: V1 esta activa sin flag de gating. La revision por abogado laboralista chileno es recomendada (no bloqueante); el operador HR decide cuando solicitarla.

## Que es el settlement final

El finiquito en Greenhouse es un aggregate de Payroll separado de la nomina mensual. Representa el calculo auditable de haberes y descuentos finales de una relacion laboral que ya tiene un caso de offboarding aprobado.

No se calcula desde `contractEndDate`, `member.active` ni una desactivacion administrativa. La fuente de verdad es el `OffboardingCase` con:

- causal `resignation`
- `effective_date`
- `last_working_day`
- snapshot contractual
- lane `internal_payroll`

La pantalla `/hr/offboarding` debe mantener visibles los casos `executed` no cancelados para recuperacion auditada. Si un caso fue ejecutado antes de tener settlement, Greenhouse permite calcularlo desde sus fechas canonicas y deja evidencia en el aggregate de finiquito. Ese camino es recuperacion, no el flujo feliz.

## Alcance V1

V1 soporta solo renuncia de trabajador dependiente Chile con:

- contrato `indefinido` o `plazo_fijo`
- `pay_regime = chile`
- `payroll_via = internal`

Quedan fuera del engine V1:

- honorarios
- contractors
- EOR/Deel
- internacional
- despido, mutuo acuerdo, termino por plazo fijo u otras causales
- indemnizaciones por anos de servicio, aviso previo o recargos

## Que calcula

El settlement separa componentes:

- `pending_salary`: remuneracion pendiente si el periodo mensual no cubre el ultimo dia trabajado.
- `pending_fixed_allowances`: haberes fijos proporcionales.
- `proportional_vacation`: feriado pendiente o proporcional desde saldo conciliado de vacaciones.
- `statutory_deductions`: descuentos legales asociados a remuneraciones finales.
- `other_agreed_deductions`: descuentos manuales solo con `source_ref`.

Cada linea guarda formula, base, fuente y tratamiento tributario/previsional.

Desde TASK-783 cada componente trae una policy explicita:

- `proportional_vacation`: indemnizacion legal, no renta, no imponible. No dispara AFP, salud, AFC ni IUSC.
- `pending_salary` y remuneraciones pendientes: remuneracion tributable/imponible. Solo ellas pueden generar descuentos legales del trabajador.
- `statutory_deductions`: se calcula sobre delta de remuneracion pendiente, no sobre todo el finiquito.
- `authorized_deduction`: exige evidencia estructurada antes de permitir neto negativo.

Si aparece un componente sin policy, el calculo falla cerrado.

## Readiness

Antes de aprobar, Greenhouse revisa:

- caso de offboarding aprobado o agendado
- regimen soportado
- compensacion vigente al corte
- saldo de vacaciones auditable
- overlap con nomina mensual
- evidencia de cotizaciones previsionales
- tratamiento tributario/previsional por componente
- necesidad de revision legal cuando hay ajustes manuales

Los blockers impiden calcular o aprobar. Los warnings quedan como evidencia para revision humana.

Desde TASK-867, `/hr/offboarding` ya no deriva estos pasos en JSX. La vista consume `OffboardingWorkQueue`, que traduce el estado canonico del caso, ultimo calculo y ultimo documento en `proximo paso`, `accion principal`, prerequisitos y progreso. Esa proyeccion es read-only: no reemplaza los endpoints de calcular, aprobar, emitir, reemitir o ratificar.

## Overlap con nomina mensual

El settlement consulta un `PayrollOverlapLedger` para saber si el mes de salida ya tiene payroll mensual calculado/aprobado/exportado. Si la nomina mensual ya materializo Isapre, AFP, AFC o IUSC, el finiquito no duplica esos descuentos.

Ejemplo: renuncia el 30/04 con abril exportado y solo feriado proporcional pendiente. El resultado esperado es feriado proporcional como haber no imponible/no renta y descuentos previsionales adicionales en `$0`, salvo que exista remuneracion imponible pendiente no cubierta o una deduccion autorizada con evidencia.

## Versionamiento

Un settlement aprobado no se modifica silenciosamente. Si hay que recalcular, V1 exige cancelar y reemitir una version nueva.

El documento formal tambien es versionado. Si el PDF activo fue generado con una plantilla equivocada o requiere regeneracion sin cambiar el calculo aprobado, la salida canonica es `Reemitir`: Greenhouse exige una razon auditable, marca el documento activo como `superseded`, conserva su asset privado anterior y genera una nueva version con snapshot/hash/content hash propios. No se reemiten documentos `signed_or_ratified`, porque ya existe evidencia externa asociada.

## Documento formal

Desde TASK-762, el settlement aprobado habilita el documento formal de finiquito:

- El documento vive en `greenhouse_payroll.final_settlement_documents`.
- El PDF queda como asset privado en `greenhouse_core.assets`.
- El documento guarda `snapshot_json`, `snapshot_hash` y `content_hash`; no se recalcula desde datos vivos despues de renderizar.
- La aprobacion del documento usa `workflow_approval_snapshots` y es distinta de la aprobacion del calculo.
- La emision deja el documento pendiente de firma/ratificacion externa. Greenhouse registra evidencia, reserva de derechos, rechazo, anulacion o reemision, pero no reemplaza al proceso externo.
- Desde TASK-783, el PDF debe mostrar marca Greenhouse, entidad legal/RUT, trabajador/RUT, estado textual, tabla `Concepto / Tratamiento / Respaldo / Monto`, totales separados y snapshot/template. La emision formal falla cerrado si falta RUT verificado del trabajador o identidad legal de la entidad empleadora.
- Desde 2026-05-05, la columna `Respaldo` tambien proyecta el detalle auditable del calculo cuando el componente trae base suficiente en el snapshot. Para `proportional_vacation`, el PDF muestra dias habiles a indemnizar, dias corridos compensados, base diaria, formula de multiplicacion y referencia a saldo de vacaciones + regla DT de feriado proporcional. El renderer no recalcula montos: solo presenta la base persistida por el engine de Payroll.

## Cierre contractual y proveedor

Honorarios y proveedores no pasan por el engine laboral de finiquito. En `/hr/offboarding` deben verse como `Cierre contractual` o `Cierre proveedor`; no corresponde `Calcular finiquito`. Si hay pagos pendientes de honorarios, se resuelven por el payroll mensual/boleta y retencion SII de honorarios, no por feriado proporcional ni cotizaciones de trabajador dependiente.

El cutoff de elegibilidad payroll futura aplica a todos los lanes: un caso ejecutado con `last_working_day` anterior al inicio del periodo queda fuera del roster mensual siguiente aunque `members.active` siga verdadero para self-service o documentos.

## Fronteras

El flujo de finiquito no crea payment orders, no marca pagos como ejecutados y no ejecuta offboarding/acceso. La emision documental tampoco cambia por si sola el estado del settlement calculado.

Para evitar cierres incompletos, una ejecucion futura de offboarding `internal_payroll` exige settlement aprobado y documento emitido o ratificado. Si falta cualquiera de esos hitos, la transicion a `executed` falla cerrada y la persona sigue en la cola operativa.
