# Finiquitos Chile

> **Tipo de documento:** Manual de uso
> **Version:** 1.3
> **Creado:** 2026-05-04 por Codex
> **Ultima actualizacion:** 2026-05-11 por Claude (TASK-863 V1.5 — comprehensive audit + firma representante legal reusable)
> **Modulo:** HR / Payroll
> **Ruta en portal:** `/hr/offboarding`
> **Documentacion relacionada:** [Finiquitos Chile](../../documentation/hr/finiquitos.md), [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md), [GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md](../../architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md), [GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md](../../architecture/GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md)

## Cómo subir la firma del representante legal del empleador

La firma digital del representante legal del empleador se pre-imprime en el bloque "Representante empleador" del PDF de finiquito (y de cualquier documento legal futuro: contratos, addenda, cartas).

### Paso a paso

1. Solicita al representante legal una imagen de su firma manuscrita.
2. Digitalízala como **PNG con fondo transparente** (~1718 × 734 px recomendado, trazo oscuro).
3. Renombra el archivo siguiendo la convención:

   ```
   {RUT_sin_puntos_ni_espacios}.png
   ```

   Ejemplo Efeonce SpA (RUT 77.357.182-1): `77357182-1.png`.

4. Copia el archivo a la carpeta canónica del repo:

   ```
   src/assets/signatures/77357182-1.png
   ```

5. Commit + push. La próxima vez que se emita o reemita un documento legal del empleador, la firma se embebe automáticamente sobre la línea "Representante empleador".

### Importante

- **NO subas la firma del trabajador ni del ministro de fe**. Las firmas de personas naturales (trabajador) y ministros de fe son siempre **físicas presenciales** (art. 177 del Código del Trabajo exige ratificación ante ministro de fe).
- Solo se permite **una firma por organización** (por RUT). Si el representante legal cambia, reemplaza el archivo manteniendo el mismo filename canónico.
- Si el archivo no existe en `src/assets/signatures/`, la línea queda vacía para firma manual post-impresión (no falla el render).

### Soporte multi-organización (caso Globe)

Cuando un cliente Globe contrata representación de su entidad legal en Greenhouse, sube su firma con su propio RUT siguiendo la misma convención. El render del PDF resolverá automáticamente la firma correspondiente per documento según el `taxId` del `employer` declarado en el snapshot.

> **Spec técnica completa:** [GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md](../../architecture/GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md).
> **V2 forward-path:** migrar storage a asset privado canónico con UI admin para upload + rotation + revocación. Por ahora V1.4 usa filesystem hardcoded para no requerir DDL.

## Delta TASK-863 (2026-05-11) — UI completa para pre-requisitos

Los 2 pre-requisitos del finiquito de renuncia ahora tienen UI dedicada en la fila del caso — ya **no** necesitas usar DevTools ni scripts auxiliares.

En la columna **Finiquito laboral**, cada caso `resignation` muestra:

- **2 chips de estado** en tiempo real:
  - Carta de renuncia: chip verde `Carta subida` cuando esta vinculada, chip rojo `Carta faltante` cuando no.
  - Pension de alimentos: chip verde `Pension: No afecto` (Alt A), chip ambar `Pension: Afecto $X.XXX` (Alt B con monto), o chip rojo `Pension pendiente`.
- **2 botones** que abren dialogs modales:
  - **Subir carta de renuncia** / **Reemplazar carta** — abre un dialog con uploader de PDF/JPG/PNG/WEBP (max 10 MB). Al guardar, el asset queda vinculado al caso y el chip pasa a verde.
  - **Declarar pension alimentos** / **Editar pension alimentos** — abre un dialog con radio Alt A/B. Alt B exige monto > 0 + beneficiario obligatorios; evidencia (certificado RNDA u otro respaldo) es opcional.
- **Boton "Calcular" gated**: queda deshabilitado con tooltip `Sube la carta de renuncia y declara la pension de alimentos antes de calcular.` mientras falte algun pre-requisito. Defense in depth: el backend tambien bloquea con `readiness blocked` si llamas el endpoint directo.

Idempotencia preservada (TASK-862 Slice C): subir una carta distinta o reeditar la pension sobreescribe y queda registrado en audit log.

## Delta TASK-862 (2026-05-11) — flujo nuevo end-to-end

Antes de calcular el finiquito ahora **debes** completar 2 pre-requisitos. Sin ellos, el calculo se bloquea con un mensaje claro:

1. **Subir la carta de renuncia ratificada** del trabajador como asset al caso de offboarding (`POST /api/hr/offboarding/cases/[caseId]/resignation-letter`). El sistema valida que el asset exista en `greenhouse_core.assets` antes de linkearlo. Idempotente: subir un assetId distinto sobreescribe (queda registrado en audit log).
2. **Declarar la pension de alimentos (Ley 21.389)**: para cada renuncia, declara explicitamente si el trabajador **NO** esta afecto a retencion (Alternativa A) o **SI** esta afecto (Alternativa B con monto + beneficiario obligatorios, evidencia opcional). Endpoint `POST /api/hr/offboarding/cases/[caseId]/maintenance-obligation`.

Despues del calculo + emision, llevas el PDF al notario (limpio, sin watermark "PROYECTO"). El notario lo firma + estampa. El trabajador imprime su huella y, opcionalmente, escribe su reserva de derechos. Vuelves al portal y haces clic en **"Registrar ratificación"** — se abre un dialog donde capturas:

- Tipo de ministro de fe: notario / inspector del trabajo / presidente de sindicato / oficial del Registro Civil.
- Nombre completo + RUT.
- Notaria u oficina (opcional).
- Fecha de ratificacion.
- Si el trabajador consigno reserva de derechos (toggle + transcripcion del texto manuscrito).

Greenhouse marca `documentStatus='signed_or_ratified'` y el PDF regenera SIN watermark con los datos del ministro de fe embebidos como sistema de registro.

## Para que sirve

El motor de finiquitos calcula y guarda el cierre final de una renuncia Chile dependiente, separado de la nomina mensual.

## Antes de empezar

- Necesitas acceso a `equipo.offboarding`.
- Necesitas capability `hr.final_settlement`.
- Para documento formal necesitas capability `hr.final_settlement_document`.
- El caso de offboarding debe estar `approved` o `scheduled`.
- El colaborador debe ser Chile dependiente con payroll interno.
- Debe existir compensacion vigente y saldo de vacaciones conciliado.
- Debe existir evidencia operativa de cotizaciones previsionales o quedara warning.

## Paso a paso operativo

1. Abre el caso en `HR > Offboarding`.
2. Confirma causal `resignation`, fecha efectiva y ultimo dia trabajado.
3. **Sube la carta de renuncia ratificada**: click en `Subir carta de renuncia` en la columna Finiquito laboral. Adjunta el PDF/escaneo y confirma.
4. **Declara la pension de alimentos**: click en `Declarar pension alimentos`. Selecciona Alt A (no afecto) o Alt B (afecto + monto + beneficiario obligatorios). Adjunta certificado RNDA opcional.
5. Verifica que ambos chips de pre-requisitos esten en verde antes de continuar.
6. Ejecuta el calculo de final settlement.
7. Revisa el breakdown de haberes, vacaciones, descuentos y neto.
8. Revisa readiness: blockers detienen el flujo; warnings requieren criterio HR/legal.
9. Si esta correcto, aprueba el settlement.
10. En el carril `Finiquito`, renderiza el documento.
11. Abre el PDF y valida que cada monto relevante tenga respaldo suficiente. En `Feriado proporcional`, confirma que aparezcan dias habiles a indemnizar, dias corridos compensados, base diaria y formula del monto.
12. Envia el documento a revision.
13. Aprueba el documento.
14. Emite el documento y descarga el PDF privado.
15. Cuando exista evidencia externa, registra firma/ratificacion. Si la persona firma con reserva de derechos, marca la reserva y deja nota.

Si un caso ya aparece como `Ejecutado` pero no tiene finiquito, no desaparece de `/hr/offboarding`: usa `Calcular` en el carril `Finiquito` para recuperar el settlement desde las fechas canonicas del caso. Esta recuperacion existe para corregir cierres incompletos; el flujo normal debe aprobar settlement y emitir documento antes de ejecutar la salida.

## Reemision de documento

Si el PDF ya fue generado con una plantilla o contenido incorrecto, no se corrige el asset anterior. Usa `Reemitir` desde el carril `Finiquito`, escribe una razon operacional clara y confirma la accion.

Greenhouse marca el documento activo como `superseded`, conserva el PDF anterior como evidencia historica y genera una nueva version con snapshot, hash y asset privado nuevos. La razon queda en los eventos del documento para auditoria.

No se puede reemitir un documento que ya esta `signed_or_ratified`. En ese caso se debe tratar como remediacion legal/operativa separada, porque ya existe evidencia externa asociada.

## Revision del calculo

Antes de aprobar, confirma tres puntos:

- `Feriado proporcional` debe aparecer como no renta/no imponible y no debe cargar AFP, salud, AFC ni IUSC por si solo.
- El PDF debe mostrar el desglose del feriado proporcional desde el snapshot versionado: dias habiles, dias corridos compensados, base diaria, formula y respaldo DT/saldo de vacaciones.
- Si el mes de salida ya esta calculado/aprobado/exportado, el ledger de overlap debe explicar que descuentos mensuales ya quedaron cubiertos.
- Un neto negativo solo es aprobable si existe una `authorized_deduction` con evidencia estructurada; de lo contrario el sistema bloquea.

## Lanes no laborales

No todos los casos de offboarding son finiquitos:

- `Finiquito laboral`: Chile dependiente con payroll interno. Permite calcular, aprobar y generar documento.
- `Cierre contractual`: honorarios. No muestra `Calcular finiquito`; revisa pago pendiente/boleta/retencion SII por los flujos de payroll mensual que correspondan.
- `Cierre proveedor`: Deel/EOR/contractor externo. Greenhouse registra el cierre operativo; el proveedor es owner del payroll legal.
- `Revision legal requerida`: clasificacion ambigua. No fuerces calculo automatico.

En `/hr/offboarding`, la cola operacional muestra `Proximo paso` y una accion principal por caso. Si faltan carta de renuncia o declaracion de pension de alimentos, primero completa esos prerequisitos desde el drawer del caso. Cuando ambos esten listos, la accion cambia a `Calcular finiquito`.

## Estados

| Estado | Significado |
| --- | --- |
| `draft` | Settlement aun no calculado o bloqueado. |
| `calculated` | Calculo persistido y auditable. |
| `reviewed` | Reservado para revision operacional posterior. |
| `approved` | Aprobado para documentacion/pago futuro. |
| `issued` | Reservado para documento formal emitido. |
| `cancelled` | Cancelado; permite recalcular una nueva version. |

## Estados del documento

| Estado | Significado |
| --- | --- |
| `rendered` | PDF generado desde settlement aprobado y snapshot inmutable. |
| `in_review` | Documento enviado a revision HR. |
| `approved` | Aprobacion documental lista para emision. |
| `issued` | Documento emitido; queda pendiente de firma/ratificacion externa. |
| `signed_or_ratified` | Evidencia o referencia externa registrada. |
| `rejected` | Rechazado por trabajador/a. |
| `voided` | Anulado con razon auditable. |
| `superseded` | Reemplazado por una nueva version. |

## Que no hacer

- No uses nomina mensual como sustituto del finiquito.
- No calcules finiquito si solo existe `contractEndDate`.
- No apruebes si hay blockers de regimen, compensacion o vacaciones.
- No uses descuentos manuales sin `source_ref`.
- No trates honorarios, Deel/EOR o internacionales como Chile dependiente.
- No apruebes un liquido negativo sin evidencia de deduccion autorizada.
- No emitas documento si falta RUT verificado del trabajador o identidad legal de la entidad empleadora.
- No marques `signed_or_ratified` sin evidencia o referencia externa.
- No uses el PDF como prueba de pago: el flujo documental no crea ni ejecuta pagos.
- No ejecutes un caso `Payroll interno` sin cálculo aprobado y documento emitido; Greenhouse bloquea esa transición para evitar cierres laborales incompletos.

## Problemas comunes

### El calculo queda bloqueado por vacaciones

Revisa el saldo de vacaciones del colaborador. Si no existe balance auditable, primero hay que reconciliar leave.

### El sistema dice que el regimen no esta soportado

V1 solo cubre renuncia de trabajador dependiente Chile con payroll interno. Otros regimenes requieren lane externa o una task futura.

### Necesito recalcular un settlement aprobado

Cancela el settlement con razon auditable y vuelve a calcular. No se sobrescribe el historico aprobado.

### Necesito regenerar solo el PDF/documento

Usa `Reemitir` con una razon de al menos 10 caracteres. Esto no recalcula el settlement aprobado: solo reemplaza funcionalmente el documento activo por una nueva version auditable.

### El documento no se puede renderizar por identidad legal

Revisa `Datos legales` del trabajador. El PDF formal exige RUT/documento verificado desde el perfil legal canonico; no usa `organizations.tax_id` para personas naturales.

## Referencias tecnicas

- `greenhouse_payroll.final_settlements`
- `greenhouse_payroll.final_settlement_events`
- `greenhouse_payroll.final_settlement_documents`
- `greenhouse_payroll.final_settlement_document_events`
- `src/lib/payroll/final-settlement/**`
- `/api/hr/offboarding/cases/[caseId]/final-settlement`
- `/api/hr/offboarding/cases/[caseId]/final-settlement/document`
- `/api/hr/offboarding/cases/[caseId]/final-settlement/document/reissue`
